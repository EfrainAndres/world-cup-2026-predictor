import { describe, expect, it } from "vitest";
import {
  computeGoalModelComponentDiagnostic,
  computeProfileContributionWeight,
  computeRecalibratedAttackDefenseGoalModel,
  eloToExpectedGoals,
  validateAttackDefenseRecalibrationConfig,
} from "../src/index.js";
import type {
  AttackDefenseGoalModelInput,
  AttackDefenseRecalibrationConfig,
  CompetitionGoalEnvironment,
  TeamAttackDefenseProfile,
} from "../src/index.js";

const competition: CompetitionGoalEnvironment = {
  competitionId: "test",
  averageHomeGoals: 1.3,
  averageAwayGoals: 1.2,
  averageTotalGoals: 2.5,
  sampleSize: 64,
  cutoffAt: "2022-01-01",
};

function profile(
  teamId: string,
  attackStrength: number,
  defenseStrength: number,
  coverage: TeamAttackDefenseProfile["coverage"] = "full"
): TeamAttackDefenseProfile {
  return {
    teamId,
    competitionId: "test",
    attackStrength,
    defenseStrength,
    attackSampleSize: coverage === "full" ? 10 : coverage === "partial" ? 6 : coverage === "sparse" ? 2 : 0,
    defenseSampleSize: coverage === "full" ? 10 : coverage === "partial" ? 6 : coverage === "sparse" ? 2 : 0,
    goalsForPerMatch: attackStrength * 1.25,
    goalsAgainstPerMatch: defenseStrength * 1.25,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0.05,
    recencyWeight: coverage === "fallback" ? 0 : 1,
    coverage,
    cutoffAt: "2022-01-01",
  };
}

const baseInput: AttackDefenseGoalModelInput = {
  homeTeamId: "Home",
  awayTeamId: "Away",
  competition,
  homeProfile: profile("Home", 1.3, 0.8),
  awayProfile: profile("Away", 0.9, 1.2),
  homeElo: 1600,
  awayElo: 1500,
  neutralVenue: false,
};

const baseConfig: AttackDefenseRecalibrationConfig = {
  candidate: "attack_defense_log_linear_damped",
  attackWeight: 0.5,
  defenseWeight: 0.35,
  eloWeight: 0.25,
  venueWeight: 0.5,
  attackDefenseBlendWeight: 1,
  residualCap: 0.2,
  coverageDampingEnabled: true,
};

describe("computeProfileContributionWeight", () => {
  it("returns zero for fallback and ordered weights for sparse, partial, and full profiles", () => {
    const fallback = computeProfileContributionWeight({ coverage: "fallback", attackSampleSize: 0, defenseSampleSize: 0, recencyWeight: 0 });
    const sparse = computeProfileContributionWeight({ coverage: "sparse", attackSampleSize: 2, defenseSampleSize: 2, recencyWeight: 1 });
    const partial = computeProfileContributionWeight({ coverage: "partial", attackSampleSize: 6, defenseSampleSize: 6, recencyWeight: 1 });
    const full = computeProfileContributionWeight({ coverage: "full", attackSampleSize: 10, defenseSampleSize: 10, recencyWeight: 1 });

    expect(fallback).toBe(0);
    expect(sparse).toBeGreaterThan(fallback);
    expect(partial).toBeGreaterThan(sparse);
    expect(full).toBeGreaterThan(partial);
    for (const value of [fallback, sparse, partial, full]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("computeGoalModelComponentDiagnostic", () => {
  it("reports contribution signs and log contribution correctness", () => {
    const diagnostic = computeGoalModelComponentDiagnostic(baseInput, baseConfig);
    expect(diagnostic.attackContributionLog).toBeGreaterThan(0);
    expect(diagnostic.defenseContributionLog).toBeGreaterThan(0);
    expect(diagnostic.eloContributionLog).toBeGreaterThan(0);
    expect(diagnostic.venueContributionLog).toBeGreaterThan(0);
    expect(diagnostic.finalHomeXg).toBeCloseTo(Math.min(4, Math.max(0.2, diagnostic.unclampedHomeXg)), 8);
    expect(Number.isFinite(diagnostic.finalHomeXg)).toBe(true);
    expect(Number.isFinite(diagnostic.finalAwayXg)).toBe(true);
  });

  it("detects maximum clamp for extreme inputs", () => {
    const diagnostic = computeGoalModelComponentDiagnostic(
      {
        ...baseInput,
        competition: { ...competition, averageHomeGoals: 3.5 },
        homeProfile: profile("Home", 3, 1),
        awayProfile: profile("Away", 1, 3),
      },
      { ...baseConfig, attackWeight: 1, defenseWeight: 1, eloWeight: 1 }
    );
    expect(diagnostic.homeClampedAtMaximum).toBe(true);
    expect(diagnostic.finalHomeXg).toBe(4);
  });
});

describe("computeRecalibratedAttackDefenseGoalModel", () => {
  it("preserves the Elo V2 baseline output exactly", () => {
    const baseline = computeRecalibratedAttackDefenseGoalModel(baseInput, {
      ...baseConfig,
      candidate: "elo_only_v2_baseline",
      attackWeight: 0,
      defenseWeight: 0,
      eloWeight: 0,
      venueWeight: 0,
      attackDefenseBlendWeight: 0,
      residualCap: 0,
      coverageDampingEnabled: false,
    });
    const expected = eloToExpectedGoals({ homeEloRating: baseInput.homeElo, awayEloRating: baseInput.awayElo, preset: "balanced" });
    expect(baseline.homeXg).toBe(expected.homeExpectedGoals);
    expect(baseline.awayXg).toBe(expected.awayExpectedGoals);
  });

  it("damped contribution is smaller than the current log-linear contribution", () => {
    const current = computeRecalibratedAttackDefenseGoalModel(baseInput, { ...baseConfig, candidate: "attack_defense_log_linear_current" });
    const damped = computeRecalibratedAttackDefenseGoalModel(baseInput, baseConfig);
    expect(Math.abs(damped.homeXg - competition.averageHomeGoals)).toBeLessThan(
      Math.abs(current.homeXg - competition.averageHomeGoals)
    );
  });

  it("respects residual caps", () => {
    const output = computeRecalibratedAttackDefenseGoalModel(baseInput, {
      ...baseConfig,
      candidate: "attack_defense_residual_over_elo",
      residualCap: 0.1,
    });
    const baseline = eloToExpectedGoals({ homeEloRating: baseInput.homeElo, awayEloRating: baseInput.awayElo, preset: "balanced" });
    expect(Math.abs(output.homeXg - baseline.homeExpectedGoals)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(output.awayXg - baseline.awayExpectedGoals)).toBeLessThanOrEqual(0.1);
  });

  it("rejects invalid blend and component weights", () => {
    expect(validateAttackDefenseRecalibrationConfig({ ...baseConfig, attackDefenseBlendWeight: 1.2 })).toContain(
      "attackDefenseBlendWeight must be within [0, 1]."
    );
    expect(() =>
      computeRecalibratedAttackDefenseGoalModel(baseInput, { ...baseConfig, attackWeight: -0.1 })
    ).toThrow(/Invalid attack\/defense recalibration config/);
  });

  it("is deterministic, bounded, symmetric for equal teams, and directional for attack/defense", () => {
    const first = computeRecalibratedAttackDefenseGoalModel(baseInput, baseConfig);
    const second = computeRecalibratedAttackDefenseGoalModel(baseInput, baseConfig);
    expect(first).toEqual(second);
    expect(first.homeXg).toBeGreaterThanOrEqual(0.2);
    expect(first.homeXg).toBeLessThanOrEqual(4);

    const symmetricInput: AttackDefenseGoalModelInput = {
      ...baseInput,
      competition: { ...competition, averageHomeGoals: 1.25, averageAwayGoals: 1.25 },
      homeProfile: profile("Home", 1, 1),
      awayProfile: profile("Away", 1, 1),
      homeElo: 1500,
      awayElo: 1500,
      neutralVenue: true,
    };
    const symmetric = computeRecalibratedAttackDefenseGoalModel(symmetricInput, baseConfig);
    expect(symmetric.homeXg).toBeCloseTo(symmetric.awayXg, 8);

    const strongerAttack = computeRecalibratedAttackDefenseGoalModel(
      { ...symmetricInput, homeProfile: profile("Home", 1.5, 1) },
      baseConfig
    );
    expect(strongerAttack.homeXg).toBeGreaterThan(symmetric.homeXg);

    const strongerDefense = computeRecalibratedAttackDefenseGoalModel(
      { ...symmetricInput, awayProfile: profile("Away", 1, 0.7) },
      baseConfig
    );
    expect(strongerDefense.homeXg).toBeLessThan(symmetric.homeXg);

    const strongerOpponentAttack = computeRecalibratedAttackDefenseGoalModel(
      { ...symmetricInput, awayProfile: profile("Away", 1.5, 1) },
      baseConfig
    );
    expect(strongerOpponentAttack.homeXg).toBeCloseTo(symmetric.homeXg, 8);
  });
});
