import type { TeamPerformanceProfile } from "./providers/statsbomb/index.js";
import type { StatsBombAdjustmentReason } from "./schemas.js";
import type { TeamPerformanceCoverage, TeamPerformanceFreshness } from "./providers/statsbomb/statsbomb-types.js";

export interface TeamPerformanceProfileSource {
  getProfile(teamId: string): TeamPerformanceProfile | null;
  getAvailableTeamIds(): string[];
}

export const STATSBOMB_SIGNAL_VERSION = "statsbomb-signal-v1" as const;

export const STATSBOMB_COVERAGE_BASE_WEIGHTS: Record<TeamPerformanceCoverage, number> = {
  full: 0.30,
  partial: 0.20,
  sparse: 0.10,
  fallback: 0.00,
};

export const STATSBOMB_FRESHNESS_MULTIPLIERS: Record<TeamPerformanceFreshness, number> = {
  fresh: 1.00,
  aging: 0.75,
  stale: 0.25,
  unknown: 0.00,
};

export const STATSBOMB_TARGET_MATCH_COUNT = 15;
export const STATSBOMB_DEFAULT_MAX_WEIGHT = 0.30;
export const STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90 = 1.05;
export const STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90 = 1.05;
export const STATSBOMB_MIN_APPLIED_WEIGHT = 0.001;
export const STATSBOMB_XG_MAX_BOUND = 4.0;

export interface StatsBombAdjustmentInput {
  homeProfile: TeamPerformanceProfile | null;
  awayProfile: TeamPerformanceProfile | null;
  baselineHomeXg: number;
  baselineAwayXg: number;
  globalPriorXgForPer90: number;
  globalPriorXgAgainstPer90: number;
  maxWeight?: number;
}

export interface StatsBombPredictionAdjustment {
  applied: boolean;
  reason: StatsBombAdjustmentReason;
  baselineHomeXg: number;
  baselineAwayXg: number;
  adjustedHomeXg: number;
  adjustedAwayXg: number;
  homeAttackSignal: number | null;
  homeDefenseSignal: number | null;
  awayAttackSignal: number | null;
  awayDefenseSignal: number | null;
  homeWeight: number;
  awayWeight: number;
  homeCoverage: TeamPerformanceCoverage | null;
  awayCoverage: TeamPerformanceCoverage | null;
  homeFreshness: TeamPerformanceFreshness | null;
  awayFreshness: TeamPerformanceFreshness | null;
  warnings: string[];
}

function calculateCoverageWeight(profile: TeamPerformanceProfile, maxWeight: number): number {
  const baseWeight = STATSBOMB_COVERAGE_BASE_WEIGHTS[profile.coverage];
  const freshnessMultiplier = STATSBOMB_FRESHNESS_MULTIPLIERS[profile.freshness];
  const sampleWeight = Math.min(1, profile.matchCount / STATSBOMB_TARGET_MATCH_COUNT);
  const raw = baseWeight * freshnessMultiplier * sampleWeight;
  return Math.max(0, Math.min(maxWeight, raw));
}

function unapplied(
  reason: StatsBombAdjustmentReason,
  baselineHomeXg: number,
  baselineAwayXg: number,
  homeProfile: TeamPerformanceProfile | null,
  awayProfile: TeamPerformanceProfile | null,
  warnings: string[]
): StatsBombPredictionAdjustment {
  return {
    applied: false,
    reason,
    baselineHomeXg,
    baselineAwayXg,
    adjustedHomeXg: baselineHomeXg,
    adjustedAwayXg: baselineAwayXg,
    homeAttackSignal: null,
    homeDefenseSignal: null,
    awayAttackSignal: null,
    awayDefenseSignal: null,
    homeWeight: 0,
    awayWeight: 0,
    homeCoverage: homeProfile?.coverage ?? null,
    awayCoverage: awayProfile?.coverage ?? null,
    homeFreshness: homeProfile?.freshness ?? null,
    awayFreshness: awayProfile?.freshness ?? null,
    warnings,
  };
}

export function calculateStatsBombPredictionAdjustment(
  input: StatsBombAdjustmentInput
): StatsBombPredictionAdjustment {
  const { homeProfile, awayProfile, baselineHomeXg, baselineAwayXg } = input;
  const warnings: string[] = [];

  // Validate baseline inputs
  if (!Number.isFinite(baselineHomeXg) || !Number.isFinite(baselineAwayXg)) {
    return unapplied("invalid_profile", baselineHomeXg, baselineAwayXg, homeProfile, awayProfile,
      ["Baseline xG values are invalid (NaN or Infinity)."]);
  }

  // Require both profiles with usable coverage
  const homeIsFallback = homeProfile === null || homeProfile.coverage === "fallback";
  const awayIsFallback = awayProfile === null || awayProfile.coverage === "fallback";

  if (homeIsFallback && awayIsFallback) {
    return unapplied("both_profiles_missing", baselineHomeXg, baselineAwayXg, homeProfile, awayProfile, warnings);
  }
  if (homeIsFallback) {
    return unapplied("home_profile_missing", baselineHomeXg, baselineAwayXg, homeProfile, awayProfile, warnings);
  }
  if (awayIsFallback) {
    return unapplied("away_profile_missing", baselineHomeXg, baselineAwayXg, homeProfile, awayProfile, warnings);
  }

  // Both profiles are non-null and non-fallback at this point
  const home = homeProfile;
  const away = awayProfile;

  // Reject unknown freshness (no data age info)
  if (home.freshness === "unknown" || away.freshness === "unknown") {
    return unapplied("stale_profile", baselineHomeXg, baselineAwayXg, homeProfile, awayProfile,
      ["One or both team profiles have unknown freshness; signal not applied."]);
  }

  // Performance xG signals (use global prior when per-90 is null)
  const homeAttackSignal = home.xgForPer90 ?? input.globalPriorXgForPer90;
  const homeDefenseSignal = away.xgAgainstPer90 ?? input.globalPriorXgAgainstPer90;
  const awayAttackSignal = away.xgForPer90 ?? input.globalPriorXgForPer90;
  const awayDefenseSignal = home.xgAgainstPer90 ?? input.globalPriorXgAgainstPer90;

  const homePerformanceXg = (homeAttackSignal + homeDefenseSignal) / 2;
  const awayPerformanceXg = (awayAttackSignal + awayDefenseSignal) / 2;

  // Calculate weights
  const effectiveMaxWeight = Math.min(
    input.maxWeight ?? STATSBOMB_DEFAULT_MAX_WEIGHT,
    STATSBOMB_DEFAULT_MAX_WEIGHT
  );
  const homeWeight = calculateCoverageWeight(home, effectiveMaxWeight);
  const awayWeight = calculateCoverageWeight(away, effectiveMaxWeight);
  const pairWeight = Math.min(homeWeight, awayWeight);

  if (pairWeight < STATSBOMB_MIN_APPLIED_WEIGHT) {
    return {
      applied: false,
      reason: "insufficient_coverage",
      baselineHomeXg,
      baselineAwayXg,
      adjustedHomeXg: baselineHomeXg,
      adjustedAwayXg: baselineAwayXg,
      homeAttackSignal,
      homeDefenseSignal,
      awayAttackSignal,
      awayDefenseSignal,
      homeWeight,
      awayWeight,
      homeCoverage: home.coverage,
      awayCoverage: away.coverage,
      homeFreshness: home.freshness,
      awayFreshness: away.freshness,
      warnings: ["Combined coverage weight is below minimum threshold; signal not applied."],
    };
  }

  // Blend xG values
  const rawHomeXg = baselineHomeXg * (1 - pairWeight) + homePerformanceXg * pairWeight;
  const rawAwayXg = baselineAwayXg * (1 - pairWeight) + awayPerformanceXg * pairWeight;

  // Safety bounds
  const adjustedHomeXg = Math.max(0, Math.min(STATSBOMB_XG_MAX_BOUND, rawHomeXg));
  const adjustedAwayXg = Math.max(0, Math.min(STATSBOMB_XG_MAX_BOUND, rawAwayXg));

  // NaN/Infinity guard
  if (!Number.isFinite(adjustedHomeXg) || !Number.isFinite(adjustedAwayXg)) {
    return unapplied("invalid_profile", baselineHomeXg, baselineAwayXg, homeProfile, awayProfile,
      ["Adjusted xG computation produced invalid values; falling back to baseline."]);
  }

  if (home.freshness === "stale") {
    warnings.push(`Home team profile is stale (freshness: stale); weight reduced by freshness multiplier.`);
  }
  if (away.freshness === "stale") {
    warnings.push(`Away team profile is stale (freshness: stale); weight reduced by freshness multiplier.`);
  }
  if (home.xgForPer90 === null) {
    warnings.push("Home team xG-for-per-90 is null; global prior used as attack signal.");
  }
  if (away.xgForPer90 === null) {
    warnings.push("Away team xG-for-per-90 is null; global prior used as attack signal.");
  }

  return {
    applied: true,
    reason: "applied",
    baselineHomeXg,
    baselineAwayXg,
    adjustedHomeXg,
    adjustedAwayXg,
    homeAttackSignal,
    homeDefenseSignal,
    awayAttackSignal,
    awayDefenseSignal,
    homeWeight,
    awayWeight,
    homeCoverage: home.coverage,
    awayCoverage: away.coverage,
    homeFreshness: home.freshness,
    awayFreshness: away.freshness,
    warnings,
  };
}
