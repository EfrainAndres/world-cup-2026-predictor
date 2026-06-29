import { describe, it, expect } from "vitest";
import type { TeamPerformanceProfile } from "../src/providers/statsbomb/index.js";
import {
  STATSBOMB_SIGNAL_VERSION,
  STATSBOMB_COVERAGE_BASE_WEIGHTS,
  STATSBOMB_FRESHNESS_MULTIPLIERS,
  STATSBOMB_TARGET_MATCH_COUNT,
  STATSBOMB_DEFAULT_MAX_WEIGHT,
  STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90,
  STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90,
  STATSBOMB_MIN_APPLIED_WEIGHT,
  STATSBOMB_XG_MAX_BOUND,
  calculateStatsBombPredictionAdjustment,
} from "../src/statsbomb-prediction-signal.js";
import {
  createInMemoryTeamPerformanceProfileSource,
  createNullTeamPerformanceProfileSource,
  createArtifactTeamPerformanceProfileSource,
} from "../src/statsbomb-artifact-profile-source.js";
import { buildStatsBombPredictionComparison } from "../src/statsbomb-prediction-signal-comparison.js";

function makeProfile(
  overrides: Partial<TeamPerformanceProfile> & { teamId: string; canonicalName: string }
): TeamPerformanceProfile {
  return {
    provider: "statsbomb_open_data",
    cutoffAt: "2025-01-01T00:00:00.000Z",
    latestMatchAt: "2024-06-30T00:00:00.000Z",
    matchCount: 15,
    minutesPlayed: 1350,
    shotCountFor: 120,
    shotCountAgainst: 80,
    xgSampleCountFor: 100,
    xgSampleCountAgainst: 70,
    totalXgFor: 18.0,
    totalXgAgainst: 12.0,
    xgForPer90: 1.20,
    xgAgainstPer90: 0.80,
    goalsFor: 20,
    goalsAgainst: 10,
    goalsForPer90: 1.33,
    goalsAgainstPer90: 0.67,
    shotQualityFor: 0.15,
    shotQualityAgainst: 0.15,
    uniqueOpponentCount: 10,
    coverage: "full",
    freshness: "fresh",
    sources: [],
    warnings: [],
    ...overrides,
  };
}

const DEFAULT_PRIORS = {
  globalPriorXgForPer90: STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90,
  globalPriorXgAgainstPer90: STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90,
};

describe("StatsBomb signal constants", () => {
  it("signal version is statsbomb-signal-v1", () => {
    expect(STATSBOMB_SIGNAL_VERSION).toBe("statsbomb-signal-v1");
  });

  it("coverage base weights are as specified", () => {
    expect(STATSBOMB_COVERAGE_BASE_WEIGHTS.full).toBe(0.30);
    expect(STATSBOMB_COVERAGE_BASE_WEIGHTS.partial).toBe(0.20);
    expect(STATSBOMB_COVERAGE_BASE_WEIGHTS.sparse).toBe(0.10);
    expect(STATSBOMB_COVERAGE_BASE_WEIGHTS.fallback).toBe(0.00);
  });

  it("freshness multipliers are as specified", () => {
    expect(STATSBOMB_FRESHNESS_MULTIPLIERS.fresh).toBe(1.00);
    expect(STATSBOMB_FRESHNESS_MULTIPLIERS.aging).toBe(0.75);
    expect(STATSBOMB_FRESHNESS_MULTIPLIERS.stale).toBe(0.25);
    expect(STATSBOMB_FRESHNESS_MULTIPLIERS.unknown).toBe(0.00);
  });

  it("numeric constants match spec", () => {
    expect(STATSBOMB_TARGET_MATCH_COUNT).toBe(15);
    expect(STATSBOMB_DEFAULT_MAX_WEIGHT).toBe(0.30);
    expect(STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90).toBe(1.05);
    expect(STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90).toBe(1.05);
    expect(STATSBOMB_MIN_APPLIED_WEIGHT).toBe(0.001);
    expect(STATSBOMB_XG_MAX_BOUND).toBe(4.0);
  });
});

describe("calculateStatsBombPredictionAdjustment — unapplied cases", () => {
  it("returns both_profiles_missing when both profiles are null", () => {
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: null,
      awayProfile: null,
      baselineHomeXg: 1.2,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("both_profiles_missing");
    expect(result.adjustedHomeXg).toBe(1.2);
    expect(result.adjustedAwayXg).toBe(1.0);
  });

  it("returns home_profile_missing when home profile is null", () => {
    const away = makeProfile({ teamId: "france", canonicalName: "France" });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: null,
      awayProfile: away,
      baselineHomeXg: 1.1,
      baselineAwayXg: 1.3,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("home_profile_missing");
  });

  it("returns away_profile_missing when away profile is null", () => {
    const home = makeProfile({ teamId: "brazil", canonicalName: "Brazil" });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: null,
      baselineHomeXg: 1.5,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("away_profile_missing");
  });

  it("returns both_profiles_missing when both profiles have fallback coverage", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", coverage: "fallback", matchCount: 0 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", coverage: "fallback", matchCount: 0 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("both_profiles_missing");
  });

  it("returns stale_profile when home freshness is unknown", () => {
    const home = makeProfile({ teamId: "x", canonicalName: "X", freshness: "unknown" });
    const away = makeProfile({ teamId: "y", canonicalName: "Y" });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("stale_profile");
  });

  it("returns invalid_profile on non-finite baseline xG", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A" });
    const away = makeProfile({ teamId: "b", canonicalName: "B" });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: NaN,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("invalid_profile");
  });

  it("returns insufficient_coverage when pair weight is below minimum", () => {
    // Use maxWeight below STATSBOMB_MIN_APPLIED_WEIGHT to force insufficient_coverage path
    const home = makeProfile({ teamId: "a", canonicalName: "A", coverage: "sparse", freshness: "stale", matchCount: 1 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", coverage: "sparse", freshness: "stale", matchCount: 1 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
      maxWeight: 0.0005,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("insufficient_coverage");
    // Signals are computed even when not applied in this case
    expect(result.homeAttackSignal).not.toBeNull();
  });
});

describe("calculateStatsBombPredictionAdjustment — applied cases", () => {
  it("applies adjustment for full/fresh profiles", () => {
    // homePerf = (1.50 + 0.60)/2 = 1.05, awayPerf = (1.40 + 0.70)/2 = 1.05
    // With baseline 1.6/0.7, adjustments will be non-zero
    const home = makeProfile({ teamId: "france", canonicalName: "France", xgForPer90: 1.50, xgAgainstPer90: 0.70 });
    const away = makeProfile({ teamId: "brazil", canonicalName: "Brazil", xgForPer90: 1.40, xgAgainstPer90: 0.60 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.6,
      baselineAwayXg: 0.7,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(true);
    expect(result.reason).toBe("applied");
    expect(result.adjustedHomeXg).not.toBe(result.baselineHomeXg);
    expect(result.adjustedAwayXg).not.toBe(result.baselineAwayXg);
    // pairWeight = min(homeWeight, awayWeight) = 0.30 for full/fresh/15 matches
    expect(result.homeWeight).toBeCloseTo(0.30, 5);
    expect(result.awayWeight).toBeCloseTo(0.30, 5);
  });

  it("blend formula: adjustedXg = baseline*(1-w) + performance*w", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", xgForPer90: 1.60, xgAgainstPer90: 0.60, matchCount: 15 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", xgForPer90: 1.00, xgAgainstPer90: 1.00, matchCount: 15 });
    const baseline = { homeXg: 1.0, awayXg: 1.0 };
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: baseline.homeXg,
      baselineAwayXg: baseline.awayXg,
      ...DEFAULT_PRIORS,
    });
    // homeAttack = 1.60, homeDefense (awayXgAgainst) = 1.00 → homePerf = 1.30
    // awayAttack = 1.00, awayDefense (homeXgAgainst) = 0.60 → awayPerf = 0.80
    // pairWeight = 0.30
    const expectedHomeXg = baseline.homeXg * 0.70 + 1.30 * 0.30;
    const expectedAwayXg = baseline.awayXg * 0.70 + 0.80 * 0.30;
    expect(result.adjustedHomeXg).toBeCloseTo(expectedHomeXg, 5);
    expect(result.adjustedAwayXg).toBeCloseTo(expectedAwayXg, 5);
  });

  it("respects maxWeight cap", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", matchCount: 15 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", matchCount: 15 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
      maxWeight: 0.10,
    });
    expect(result.homeWeight).toBeCloseTo(0.10, 5);
    expect(result.awayWeight).toBeCloseTo(0.10, 5);
  });

  it("respects absolute max weight ceiling of 0.30", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", matchCount: 15 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", matchCount: 15 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
      maxWeight: 0.99,
    });
    // Capped at STATSBOMB_DEFAULT_MAX_WEIGHT = 0.30
    expect(result.homeWeight).toBeCloseTo(0.30, 5);
  });

  it("applies global prior when xgForPer90 is null", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", xgForPer90: null, xgAgainstPer90: 0.90, matchCount: 15 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", xgForPer90: 1.10, xgAgainstPer90: 1.00, matchCount: 15 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(true);
    expect(result.homeAttackSignal).toBe(STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90);
    expect(result.warnings.some((w) => w.includes("Home team xG-for-per-90 is null"))).toBe(true);
  });

  it("uses pair weight (min) for symmetric application", () => {
    // partial/fresh for home (weight 0.20), full/fresh for away (weight 0.30)
    // Use distinctive xG values so performance != baseline
    const home = makeProfile({ teamId: "a", canonicalName: "A", coverage: "partial", matchCount: 15, xgForPer90: 1.80, xgAgainstPer90: 0.50 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", coverage: "full", matchCount: 15, xgForPer90: 0.80, xgAgainstPer90: 1.40 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    expect(result.applied).toBe(true);
    // homeWeight = 0.20 (partial/fresh/15), awayWeight = 0.30 (full/fresh/15)
    // pairWeight = min(0.20, 0.30) = 0.20
    expect(result.homeWeight).toBeCloseTo(0.20, 5);
    expect(result.awayWeight).toBeCloseTo(0.30, 5);
    // homeAttack = 1.80, homeDefense = away.xgAgainst = 1.40 → homePerf = 1.60
    // pairWeight = 0.20 → adjustedHome = 1.0*0.80 + 1.60*0.20 = 1.12
    const expectedHomeXg = 1.0 * 0.80 + 1.60 * 0.20;
    expect(result.adjustedHomeXg).toBeCloseTo(expectedHomeXg, 5);
  });

  it("adjusted xG is bounded to [0, 4.0]", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", xgForPer90: 4.0, xgAgainstPer90: 4.0, matchCount: 15 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", xgForPer90: 4.0, xgAgainstPer90: 4.0, matchCount: 15 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 3.9,
      baselineAwayXg: 3.9,
      ...DEFAULT_PRIORS,
    });
    expect(result.adjustedHomeXg).toBeLessThanOrEqual(STATSBOMB_XG_MAX_BOUND);
    expect(result.adjustedAwayXg).toBeLessThanOrEqual(STATSBOMB_XG_MAX_BOUND);
    expect(result.adjustedHomeXg).toBeGreaterThanOrEqual(0);
  });

  it("applies stale freshness multiplier and emits warning", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", freshness: "stale", matchCount: 15 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", freshness: "stale", matchCount: 15 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    // stale: base weight 0.30 * 0.25 * 1.0 = 0.075 → pairWeight = 0.075 >= 0.001 → should apply
    expect(result.applied).toBe(true);
    expect(result.homeWeight).toBeCloseTo(0.075, 4);
    expect(result.warnings.some((w) => w.includes("stale"))).toBe(true);
  });

  it("sample shrinkage reduces weight below target match count", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", coverage: "full", freshness: "fresh", matchCount: 5 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", coverage: "full", freshness: "fresh", matchCount: 5 });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    // sampleWeight = 5/15 ≈ 0.333; homeWeight = 0.30 * 1.0 * 0.333 ≈ 0.10
    expect(result.homeWeight).toBeCloseTo(0.30 * (5 / 15), 4);
  });
});

describe("baseline preservation invariant", () => {
  it("when signal not applied, adjusted xG equals baseline xG exactly", () => {
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: null,
      awayProfile: null,
      baselineHomeXg: 1.234,
      baselineAwayXg: 0.876,
      ...DEFAULT_PRIORS,
    });
    expect(result.adjustedHomeXg).toBe(1.234);
    expect(result.adjustedAwayXg).toBe(0.876);
  });

  it("stale_profile case preserves baseline exactly", () => {
    const home = makeProfile({ teamId: "x", canonicalName: "X", freshness: "unknown" });
    const away = makeProfile({ teamId: "y", canonicalName: "Y" });
    const result = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.5,
      baselineAwayXg: 1.1,
      ...DEFAULT_PRIORS,
    });
    expect(result.adjustedHomeXg).toBe(1.5);
    expect(result.adjustedAwayXg).toBe(1.1);
  });
});

describe("createInMemoryTeamPerformanceProfileSource", () => {
  it("returns null for unknown team ID", () => {
    const source = createInMemoryTeamPerformanceProfileSource([]);
    expect(source.getProfile("unknown")).toBeNull();
  });

  it("returns profile for known team ID", () => {
    const profile = makeProfile({ teamId: "france", canonicalName: "France" });
    const source = createInMemoryTeamPerformanceProfileSource([profile]);
    expect(source.getProfile("france")).toBe(profile);
  });

  it("lists available team IDs", () => {
    const a = makeProfile({ teamId: "france", canonicalName: "France" });
    const b = makeProfile({ teamId: "brazil", canonicalName: "Brazil" });
    const source = createInMemoryTeamPerformanceProfileSource([a, b]);
    const ids = source.getAvailableTeamIds();
    expect(ids).toContain("france");
    expect(ids).toContain("brazil");
    expect(ids.length).toBe(2);
  });
});

describe("createNullTeamPerformanceProfileSource", () => {
  it("always returns null", () => {
    const source = createNullTeamPerformanceProfileSource();
    expect(source.getProfile("france")).toBeNull();
    expect(source.getProfile("anything")).toBeNull();
  });

  it("returns empty array for available team IDs", () => {
    const source = createNullTeamPerformanceProfileSource();
    expect(source.getAvailableTeamIds()).toEqual([]);
  });
});

describe("createArtifactTeamPerformanceProfileSource", () => {
  it("returns null for nonexistent artifact file", () => {
    const source = createArtifactTeamPerformanceProfileSource("/nonexistent/path/profiles.json");
    expect(source.getProfile("france")).toBeNull();
    expect(source.getAvailableTeamIds()).toEqual([]);
  });
});

describe("buildStatsBombPredictionComparison", () => {
  it("builds comparison with zero delta when not applied", () => {
    const adjustment = calculateStatsBombPredictionAdjustment({
      homeProfile: null,
      awayProfile: null,
      baselineHomeXg: 1.2,
      baselineAwayXg: 0.9,
      ...DEFAULT_PRIORS,
    });
    const comparison = buildStatsBombPredictionComparison(adjustment);
    expect(comparison.applied).toBe(false);
    expect(comparison.delta.homeXg).toBe(0);
    expect(comparison.delta.awayXg).toBe(0);
    expect(comparison.baseline.homeXg).toBe(1.2);
    expect(comparison.baseline.awayXg).toBe(0.9);
  });

  it("builds comparison with non-zero delta when applied", () => {
    const home = makeProfile({ teamId: "a", canonicalName: "A", xgForPer90: 1.80, xgAgainstPer90: 0.60 });
    const away = makeProfile({ teamId: "b", canonicalName: "B", xgForPer90: 1.00, xgAgainstPer90: 1.00 });
    const adjustment = calculateStatsBombPredictionAdjustment({
      homeProfile: home,
      awayProfile: away,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    const comparison = buildStatsBombPredictionComparison(adjustment);
    expect(comparison.applied).toBe(true);
    expect(comparison.delta.homeXg).toBeCloseTo(adjustment.adjustedHomeXg - adjustment.baselineHomeXg, 8);
    expect(comparison.delta.awayXg).toBeCloseTo(adjustment.adjustedAwayXg - adjustment.baselineAwayXg, 8);
    expect(comparison.pairWeight).toBe(Math.min(adjustment.homeWeight, adjustment.awayWeight));
  });

  it("reason and warnings pass through to comparison", () => {
    const adjustment = calculateStatsBombPredictionAdjustment({
      homeProfile: null,
      awayProfile: null,
      baselineHomeXg: 1.0,
      baselineAwayXg: 1.0,
      ...DEFAULT_PRIORS,
    });
    const comparison = buildStatsBombPredictionComparison(adjustment);
    expect(comparison.reason).toBe("both_profiles_missing");
    expect(comparison.warnings).toEqual([]);
  });
});
