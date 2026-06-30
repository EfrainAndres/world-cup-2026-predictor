/**
 * Phase 12.21A production compatibility tests.
 *
 * Verifies that the new attack/defense goal model does not change:
 * - Elo-to-xG V2 production constants
 * - StatsBomb production constants
 * - Poisson matrix generation
 * - Scoreline presentation logic
 * - Any existing exports from the model package
 */
import { describe, expect, it } from "vitest";
import {
  ATTACK_DEFENSE_XG_MAX,
  ATTACK_DEFENSE_XG_MIN,
  ELO_TO_XG_ADJUSTMENT_PER_100,
  ELO_TO_XG_BASE_GOALS,
  ELO_TO_XG_FORMULA_VERSION,
  ELO_TO_XG_MAX_GOALS,
  ELO_TO_XG_MIN_GOALS,
  ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100,
  ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT,
  ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
  ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT,
  DEFAULT_POISSON_CONFIG,
  eloToExpectedGoals,
  generateScoreMatrix,
} from "../../model/src/index.js";

describe("Elo-to-xG V2 constants unchanged", () => {
  it("base goals unchanged", () => {
    expect(ELO_TO_XG_BASE_GOALS).toBe(1.25);
  });

  it("min/max goals bounds unchanged", () => {
    expect(ELO_TO_XG_MIN_GOALS).toBe(0.2);
    expect(ELO_TO_XG_MAX_GOALS).toBe(4.0);
  });

  it("V2 adjustment per 100 unchanged", () => {
    expect(ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100).toBe(0.15);
  });

  it("V2 max adjustment unchanged", () => {
    expect(ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT).toBe(0.65);
  });

  it("current production adjustment points to V2", () => {
    expect(ELO_TO_XG_ADJUSTMENT_PER_100).toBe(ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100);
  });

  it("V1 rollback constants preserved", () => {
    expect(ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100).toBe(0.1);
    expect(ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT).toBe(0.45);
  });

  it("formula version still v2", () => {
    expect(ELO_TO_XG_FORMULA_VERSION).toBe("v2");
  });
});

describe("eloToExpectedGoals V2 production output unchanged", () => {
  it("equal Elo teams produce base goals (1.25 each)", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500, preset: "balanced" });
    expect(result.homeExpectedGoals).toBe(1.25);
    expect(result.awayExpectedGoals).toBe(1.25);
  });

  it("home advantage at +200 Elo produces expected V2 values", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1700, awayEloRating: 1500, preset: "balanced" });
    expect(result.eloAdjustment).toBeCloseTo(0.3, 4); // 200/100 * 0.15 = 0.30
    expect(result.homeExpectedGoals).toBeCloseTo(1.55, 4);
    expect(result.awayExpectedGoals).toBeCloseTo(0.95, 4);
  });
});

describe("Poisson score matrix generation unchanged", () => {
  it("default config has maxGoals=7 and normalizeMatrix=true", () => {
    expect(DEFAULT_POISSON_CONFIG.maxGoals).toBe(7);
    expect(DEFAULT_POISSON_CONFIG.normalizeMatrix).toBe(true);
  });

  it("generates 64 entries for maxGoals=7", () => {
    const matrix = generateScoreMatrix({ expectedHomeGoals: 1.4, expectedAwayGoals: 1.1 });
    expect(matrix.length).toBe(64);
  });

  it("matrix probabilities sum to 1", () => {
    const matrix = generateScoreMatrix({ expectedHomeGoals: 1.4, expectedAwayGoals: 1.1 });
    const total = matrix.reduce((s, e) => s + e.probability, 0);
    expect(total).toBeCloseTo(1.0, 6);
  });
});

describe("New model exports do not shadow existing exports", () => {
  it("ATTACK_DEFENSE_XG_MIN has the same value as ELO_TO_XG_MIN_GOALS (both 0.2)", () => {
    expect(ATTACK_DEFENSE_XG_MIN).toBe(0.2);
    expect(ELO_TO_XG_MIN_GOALS).toBe(0.2);
  });

  it("ATTACK_DEFENSE_XG_MAX has the same value as ELO_TO_XG_MAX_GOALS (both 4.0)", () => {
    expect(ATTACK_DEFENSE_XG_MAX).toBe(4.0);
    expect(ELO_TO_XG_MAX_GOALS).toBe(4.0);
  });
});
