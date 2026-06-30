import {
  ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER,
  ATTACK_DEFENSE_NEUTRAL_VENUE_MULTIPLIER,
  ATTACK_DEFENSE_XG_MAX,
  ATTACK_DEFENSE_XG_MIN,
  computeEloMultiplier,
} from "./attack-defense-strength.js";
import {
  ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
  ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT,
  eloToExpectedGoals,
} from "./elo-to-xg.js";
import type {
  AttackDefenseGoalModelInput,
  AttackDefenseProfileCoverage,
  TeamAttackDefenseProfile,
} from "./types.js";

export type RecalibratedGoalModelCandidate =
  | "elo_only_v2_baseline"
  | "attack_defense_log_linear_current"
  | "attack_defense_log_linear_damped"
  | "attack_defense_residual_over_elo"
  | "attack_defense_regularized"
  | "attack_defense_calibrated_blend";

export const ATTACK_DEFENSE_COMPONENT_WEIGHT_MIN = 0;
export const ATTACK_DEFENSE_COMPONENT_WEIGHT_MAX = 1;
export const ATTACK_DEFENSE_RESIDUAL_XG_CAP = 0.3;
export const ATTACK_DEFENSE_PROFILE_CONTRIBUTION_MIN = 0;
export const ATTACK_DEFENSE_PROFILE_CONTRIBUTION_MAX = 1;
export const ATTACK_DEFENSE_BLEND_WEIGHT_MIN = 0;
export const ATTACK_DEFENSE_BLEND_WEIGHT_MAX = 1;
export const ATTACK_DEFENSE_MAX_CLAMP_RATE = 0.05;
export const ATTACK_DEFENSE_MAX_BLOWOUT_RATE_DELTA = 0.1;

export interface ProfileContributionWeightInput {
  coverage: AttackDefenseProfileCoverage;
  attackSampleSize: number;
  defenseSampleSize: number;
  recencyWeight: number;
}

export interface AttackDefenseRecalibrationConfig {
  candidate: RecalibratedGoalModelCandidate;
  attackWeight: number;
  defenseWeight: number;
  eloWeight: number;
  venueWeight: number;
  attackDefenseBlendWeight: number;
  residualCap: number;
  coverageDampingEnabled: boolean;
}

export interface GoalModelComponentDiagnostic {
  competitionBaseHomeGoals: number;
  competitionBaseAwayGoals: number;
  rawHomeAttackStrength: number;
  rawAwayAttackStrength: number;
  rawHomeDefenseStrength: number;
  rawAwayDefenseStrength: number;
  shrunkHomeAttackStrength: number;
  shrunkAwayAttackStrength: number;
  shrunkHomeDefenseStrength: number;
  shrunkAwayDefenseStrength: number;
  homeSosAdjustment: number;
  awaySosAdjustment: number;
  homeEloMultiplier: number;
  awayEloMultiplier: number;
  homeVenueMultiplier: number;
  attackContributionLog: number;
  defenseContributionLog: number;
  eloContributionLog: number;
  venueContributionLog: number;
  unclampedHomeXg: number;
  unclampedAwayXg: number;
  finalHomeXg: number;
  finalAwayXg: number;
  homeClampedAtMinimum: boolean;
  homeClampedAtMaximum: boolean;
  awayClampedAtMinimum: boolean;
  awayClampedAtMaximum: boolean;
}

export interface RecalibratedGoalModelOutput {
  homeXg: number;
  awayXg: number;
  candidate: RecalibratedGoalModelCandidate;
  config: AttackDefenseRecalibrationConfig;
  diagnostic: GoalModelComponentDiagnostic;
  warnings: readonly string[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function safeLog(value: number): number {
  return Math.log(Math.max(value, 1e-10));
}

function rawAttackStrength(profile: TeamAttackDefenseProfile, input: AttackDefenseGoalModelInput): number {
  if (profile.goalsForPerMatch === null || input.competition.averageTotalGoals <= 0) return 1;
  return profile.goalsForPerMatch / (input.competition.averageTotalGoals / 2);
}

function rawDefenseStrength(profile: TeamAttackDefenseProfile, input: AttackDefenseGoalModelInput): number {
  if (profile.goalsAgainstPerMatch === null || input.competition.averageTotalGoals <= 0) return 1;
  return profile.goalsAgainstPerMatch / (input.competition.averageTotalGoals / 2);
}

export function computeProfileContributionWeight(input: ProfileContributionWeightInput): number {
  const coverageBase: Record<AttackDefenseProfileCoverage, number> = {
    fallback: 0,
    sparse: 0.25,
    partial: 0.55,
    full: 0.85,
  };
  const base = coverageBase[input.coverage];
  if (base === 0) return 0;

  const avgSample = Math.max(0, (input.attackSampleSize + input.defenseSampleSize) / 2);
  const sampleFactor = clamp(avgSample / 10, 0, 1);
  const recencyFactor = clamp(input.recencyWeight, 0, 1);
  const weight = base * (0.75 + sampleFactor * 0.25) * (0.75 + recencyFactor * 0.25);
  return clamp(weight, ATTACK_DEFENSE_PROFILE_CONTRIBUTION_MIN, ATTACK_DEFENSE_PROFILE_CONTRIBUTION_MAX);
}

export function validateAttackDefenseRecalibrationConfig(config: AttackDefenseRecalibrationConfig): string[] {
  const issues: string[] = [];
  const bounded = [
    ["attackWeight", config.attackWeight],
    ["defenseWeight", config.defenseWeight],
    ["eloWeight", config.eloWeight],
    ["venueWeight", config.venueWeight],
  ] as const;

  for (const [name, value] of bounded) {
    if (
      !Number.isFinite(value) ||
      value < ATTACK_DEFENSE_COMPONENT_WEIGHT_MIN ||
      value > ATTACK_DEFENSE_COMPONENT_WEIGHT_MAX
    ) {
      issues.push(`${name} must be within [0, 1].`);
    }
  }

  if (
    !Number.isFinite(config.attackDefenseBlendWeight) ||
    config.attackDefenseBlendWeight < ATTACK_DEFENSE_BLEND_WEIGHT_MIN ||
    config.attackDefenseBlendWeight > ATTACK_DEFENSE_BLEND_WEIGHT_MAX
  ) {
    issues.push("attackDefenseBlendWeight must be within [0, 1].");
  }

  if (!Number.isFinite(config.residualCap) || config.residualCap < 0 || config.residualCap > ATTACK_DEFENSE_RESIDUAL_XG_CAP) {
    issues.push(`residualCap must be within [0, ${ATTACK_DEFENSE_RESIDUAL_XG_CAP}].`);
  }

  return issues;
}

export function computeGoalModelComponentDiagnostic(
  input: AttackDefenseGoalModelInput,
  config: AttackDefenseRecalibrationConfig
): GoalModelComponentDiagnostic {
  const venueMultiplier = input.neutralVenue
    ? ATTACK_DEFENSE_NEUTRAL_VENUE_MULTIPLIER
    : ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER;
  const eloDiff = input.homeElo - input.awayElo;
  const homeEloMultiplier = computeEloMultiplier(
    eloDiff,
    input.competition.averageHomeGoals,
    ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
    ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
  );
  const awayEloMultiplier = computeEloMultiplier(
    -eloDiff,
    input.competition.averageAwayGoals,
    ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
    ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
  );

  const homeProfileWeight = config.coverageDampingEnabled
    ? computeProfileContributionWeight(input.homeProfile)
    : 1;
  const awayProfileWeight = config.coverageDampingEnabled
    ? computeProfileContributionWeight(input.awayProfile)
    : 1;

  const attackContributionLog =
    config.attackWeight * homeProfileWeight * safeLog(input.homeProfile.attackStrength);
  const defenseContributionLog =
    config.defenseWeight * awayProfileWeight * safeLog(input.awayProfile.defenseStrength);
  const eloContributionLog = config.eloWeight * safeLog(homeEloMultiplier);
  const venueContributionLog = config.venueWeight * safeLog(venueMultiplier);

  const awayAttackContributionLog =
    config.attackWeight * awayProfileWeight * safeLog(input.awayProfile.attackStrength);
  const homeDefenseContributionLog =
    config.defenseWeight * homeProfileWeight * safeLog(input.homeProfile.defenseStrength);

  const unclampedHomeXg = Math.exp(
    safeLog(input.competition.averageHomeGoals) +
      attackContributionLog +
      defenseContributionLog +
      eloContributionLog +
      venueContributionLog
  );
  const unclampedAwayXg = Math.exp(
    safeLog(input.competition.averageAwayGoals) +
      awayAttackContributionLog +
      homeDefenseContributionLog +
      config.eloWeight * safeLog(awayEloMultiplier)
  );
  const finalHomeXg = clamp(unclampedHomeXg, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  const finalAwayXg = clamp(unclampedAwayXg, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);

  return {
    competitionBaseHomeGoals: input.competition.averageHomeGoals,
    competitionBaseAwayGoals: input.competition.averageAwayGoals,
    rawHomeAttackStrength: rawAttackStrength(input.homeProfile, input),
    rawAwayAttackStrength: rawAttackStrength(input.awayProfile, input),
    rawHomeDefenseStrength: rawDefenseStrength(input.homeProfile, input),
    rawAwayDefenseStrength: rawDefenseStrength(input.awayProfile, input),
    shrunkHomeAttackStrength: input.homeProfile.attackStrength,
    shrunkAwayAttackStrength: input.awayProfile.attackStrength,
    shrunkHomeDefenseStrength: input.homeProfile.defenseStrength,
    shrunkAwayDefenseStrength: input.awayProfile.defenseStrength,
    homeSosAdjustment: input.homeProfile.strengthOfScheduleAdjustment,
    awaySosAdjustment: input.awayProfile.strengthOfScheduleAdjustment,
    homeEloMultiplier,
    awayEloMultiplier,
    homeVenueMultiplier: venueMultiplier,
    attackContributionLog,
    defenseContributionLog,
    eloContributionLog,
    venueContributionLog,
    unclampedHomeXg,
    unclampedAwayXg,
    finalHomeXg,
    finalAwayXg,
    homeClampedAtMinimum: unclampedHomeXg < ATTACK_DEFENSE_XG_MIN,
    homeClampedAtMaximum: unclampedHomeXg > ATTACK_DEFENSE_XG_MAX,
    awayClampedAtMinimum: unclampedAwayXg < ATTACK_DEFENSE_XG_MIN,
    awayClampedAtMaximum: unclampedAwayXg > ATTACK_DEFENSE_XG_MAX,
  };
}

function computeCurrentLogLinear(
  input: AttackDefenseGoalModelInput,
  config: AttackDefenseRecalibrationConfig
): RecalibratedGoalModelOutput {
  const currentConfig = { ...config, attackWeight: 1, defenseWeight: 1, eloWeight: 1, venueWeight: 1, coverageDampingEnabled: false };
  const diagnostic = computeGoalModelComponentDiagnostic(input, currentConfig);
  return {
    homeXg: diagnostic.finalHomeXg,
    awayXg: diagnostic.finalAwayXg,
    candidate: "attack_defense_log_linear_current",
    config: currentConfig,
    diagnostic,
    warnings: [],
  };
}

function computeResidualOverElo(
  input: AttackDefenseGoalModelInput,
  config: AttackDefenseRecalibrationConfig
): RecalibratedGoalModelOutput {
  const baseline = eloToExpectedGoals({
    homeEloRating: input.homeElo,
    awayEloRating: input.awayElo,
    preset: "balanced",
  });
  const homeWeight = config.coverageDampingEnabled ? computeProfileContributionWeight(input.homeProfile) : 1;
  const awayWeight = config.coverageDampingEnabled ? computeProfileContributionWeight(input.awayProfile) : 1;
  const homeResidual = clamp(
    (input.homeProfile.attackStrength - 1) * homeWeight * config.residualCap +
      (input.awayProfile.defenseStrength - 1) * awayWeight * config.residualCap,
    -config.residualCap,
    config.residualCap
  );
  const awayResidual = clamp(
    (input.awayProfile.attackStrength - 1) * awayWeight * config.residualCap +
      (input.homeProfile.defenseStrength - 1) * homeWeight * config.residualCap,
    -config.residualCap,
    config.residualCap
  );
  const homeXg = clamp(baseline.homeExpectedGoals + homeResidual, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  const awayXg = clamp(baseline.awayExpectedGoals + awayResidual, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  const diagnostic = computeGoalModelComponentDiagnostic(input, config);
  return {
    homeXg,
    awayXg,
    candidate: "attack_defense_residual_over_elo",
    config,
    diagnostic: {
      ...diagnostic,
      unclampedHomeXg: baseline.homeExpectedGoals + homeResidual,
      unclampedAwayXg: baseline.awayExpectedGoals + awayResidual,
      finalHomeXg: homeXg,
      finalAwayXg: awayXg,
      homeClampedAtMinimum: baseline.homeExpectedGoals + homeResidual < ATTACK_DEFENSE_XG_MIN,
      homeClampedAtMaximum: baseline.homeExpectedGoals + homeResidual > ATTACK_DEFENSE_XG_MAX,
      awayClampedAtMinimum: baseline.awayExpectedGoals + awayResidual < ATTACK_DEFENSE_XG_MIN,
      awayClampedAtMaximum: baseline.awayExpectedGoals + awayResidual > ATTACK_DEFENSE_XG_MAX,
    },
    warnings: [],
  };
}

function computeBlend(
  input: AttackDefenseGoalModelInput,
  config: AttackDefenseRecalibrationConfig,
  candidate: RecalibratedGoalModelCandidate
): RecalibratedGoalModelOutput {
  const baseline = eloToExpectedGoals({
    homeEloRating: input.homeElo,
    awayEloRating: input.awayElo,
    preset: "balanced",
  });
  const diagnostic = computeGoalModelComponentDiagnostic(input, config);
  const adWeight = config.attackDefenseBlendWeight;
  const eloWeight = 1 - adWeight;
  const homeUnclamped = eloWeight * baseline.homeExpectedGoals + adWeight * diagnostic.finalHomeXg;
  const awayUnclamped = eloWeight * baseline.awayExpectedGoals + adWeight * diagnostic.finalAwayXg;
  const homeXg = clamp(homeUnclamped, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  const awayXg = clamp(awayUnclamped, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  return {
    homeXg,
    awayXg,
    candidate,
    config,
    diagnostic: {
      ...diagnostic,
      unclampedHomeXg: homeUnclamped,
      unclampedAwayXg: awayUnclamped,
      finalHomeXg: homeXg,
      finalAwayXg: awayXg,
      homeClampedAtMinimum: homeUnclamped < ATTACK_DEFENSE_XG_MIN,
      homeClampedAtMaximum: homeUnclamped > ATTACK_DEFENSE_XG_MAX,
      awayClampedAtMinimum: awayUnclamped < ATTACK_DEFENSE_XG_MIN,
      awayClampedAtMaximum: awayUnclamped > ATTACK_DEFENSE_XG_MAX,
    },
    warnings: [],
  };
}

export function computeRecalibratedAttackDefenseGoalModel(
  input: AttackDefenseGoalModelInput,
  config: AttackDefenseRecalibrationConfig
): RecalibratedGoalModelOutput {
  const issues = validateAttackDefenseRecalibrationConfig(config);
  if (issues.length > 0) {
    throw new Error(`Invalid attack/defense recalibration config: ${issues.join(" ")}`);
  }

  if (config.candidate === "elo_only_v2_baseline") {
    const baseline = eloToExpectedGoals({
      homeEloRating: input.homeElo,
      awayEloRating: input.awayElo,
      preset: "balanced",
    });
    const diagnostic = computeGoalModelComponentDiagnostic(input, {
      ...config,
      attackWeight: 0,
      defenseWeight: 0,
      eloWeight: 0,
      venueWeight: 0,
      coverageDampingEnabled: false,
    });
    return {
      homeXg: baseline.homeExpectedGoals,
      awayXg: baseline.awayExpectedGoals,
      candidate: config.candidate,
      config,
      diagnostic: {
        ...diagnostic,
        unclampedHomeXg: baseline.homeExpectedGoals,
        unclampedAwayXg: baseline.awayExpectedGoals,
        finalHomeXg: baseline.homeExpectedGoals,
        finalAwayXg: baseline.awayExpectedGoals,
      },
      warnings: baseline.warnings,
    };
  }

  if (config.candidate === "attack_defense_log_linear_current") {
    return computeCurrentLogLinear(input, config);
  }

  if (config.candidate === "attack_defense_residual_over_elo") {
    return computeResidualOverElo(input, config);
  }

  if (config.candidate === "attack_defense_calibrated_blend") {
    return computeBlend(input, config, config.candidate);
  }

  if (config.candidate === "attack_defense_regularized") {
    return computeBlend(input, { ...config, attackDefenseBlendWeight: 1 }, config.candidate);
  }

  const diagnostic = computeGoalModelComponentDiagnostic(input, config);
  return {
    homeXg: diagnostic.finalHomeXg,
    awayXg: diagnostic.finalAwayXg,
    candidate: "attack_defense_log_linear_damped",
    config,
    diagnostic,
    warnings: [],
  };
}
