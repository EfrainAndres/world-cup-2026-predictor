import { describe, expect, it } from "vitest";
import {
  ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT,
  ATTACK_DEFENSE_NEUTRAL_STRENGTH,
  ATTACK_DEFENSE_RECENCY_HALF_LIFE_DAYS,
  ATTACK_DEFENSE_REFERENCE_ELO,
  ATTACK_DEFENSE_STRENGTH_MAX,
  ATTACK_DEFENSE_STRENGTH_MIN,
  classifyProfileCoverage,
  computeAttackStrength,
  computeDefenseStrength,
  computeEloMultiplier,
  computeRecencyWeight,
  computeSampleShrinkage,
  computeSosAdjustment,
} from "../src/attack-defense-strength.js";

describe("classifyProfileCoverage", () => {
  it("returns fallback for 0 matches", () => {
    expect(classifyProfileCoverage(0)).toBe("fallback");
  });

  it("returns sparse for 1–3 matches", () => {
    expect(classifyProfileCoverage(1)).toBe("sparse");
    expect(classifyProfileCoverage(2)).toBe("sparse");
    expect(classifyProfileCoverage(3)).toBe("sparse");
  });

  it("returns partial for 4–9 matches", () => {
    expect(classifyProfileCoverage(4)).toBe("partial");
    expect(classifyProfileCoverage(9)).toBe("partial");
  });

  it("returns full for 10+ matches", () => {
    expect(classifyProfileCoverage(10)).toBe("full");
    expect(classifyProfileCoverage(50)).toBe("full");
  });
});

describe("computeSampleShrinkage", () => {
  it("returns 0 for 0 matches", () => {
    expect(computeSampleShrinkage(0)).toBe(0);
  });

  it("returns 1 for full coverage match count", () => {
    expect(computeSampleShrinkage(ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT)).toBe(1);
  });

  it("returns 1 for more than full coverage", () => {
    expect(computeSampleShrinkage(20)).toBe(1);
  });

  it("returns 0.5 for half coverage", () => {
    expect(computeSampleShrinkage(5, 10)).toBeCloseTo(0.5);
  });

  it("is monotonically increasing with sample size", () => {
    const values = [1, 2, 4, 6, 8, 10].map((n) => computeSampleShrinkage(n));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!);
    }
  });
});

describe("computeRecencyWeight", () => {
  it("returns 1.0 for uniform strategy regardless of dates", () => {
    expect(computeRecencyWeight("2020-01-01", "2024-01-01", "uniform")).toBe(1.0);
    expect(computeRecencyWeight("2000-01-01", "2024-01-01", "uniform")).toBe(1.0);
  });

  it("linear decay returns 1.0 for same date", () => {
    expect(computeRecencyWeight("2024-01-01", "2024-01-01", "linear_decay")).toBeCloseTo(1.0);
  });

  it("linear decay returns 0 beyond window", () => {
    expect(computeRecencyWeight("2020-01-01", "2023-01-01", "linear_decay")).toBeCloseTo(0, 1);
  });

  it("exponential half-life returns ~0.5 at half-life days", () => {
    const halfLifeDays = ATTACK_DEFENSE_RECENCY_HALF_LIFE_DAYS;
    const cutoff = "2025-01-01";
    const matchDate = new Date(Date.parse(cutoff) - halfLifeDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const weight = computeRecencyWeight(matchDate, cutoff, "exponential_half_life");
    expect(weight).toBeCloseTo(0.5, 2);
  });

  it("exponential half-life returns 1.0 for same date", () => {
    expect(computeRecencyWeight("2024-01-01", "2024-01-01", "exponential_half_life")).toBeCloseTo(1.0);
  });

  it("older matches get lower weight than newer matches for decay strategies", () => {
    const cutoff = "2024-01-01";
    const recent = "2023-06-01";
    const older = "2021-01-01";

    for (const strategy of ["linear_decay", "exponential_half_life"] as const) {
      expect(computeRecencyWeight(recent, cutoff, strategy))
        .toBeGreaterThan(computeRecencyWeight(older, cutoff, strategy));
    }
  });
});

describe("computeSosAdjustment", () => {
  it("returns 1.0 when avgOpponentElo is null", () => {
    expect(computeSosAdjustment(null, "attack")).toBe(1.0);
    expect(computeSosAdjustment(null, "defense")).toBe(1.0);
  });

  it("returns 1.0 for exactly reference Elo", () => {
    expect(computeSosAdjustment(ATTACK_DEFENSE_REFERENCE_ELO, "attack")).toBeCloseTo(1.0);
  });

  it("attack: strong opponents → higher adjustment (> 1)", () => {
    const adj = computeSosAdjustment(ATTACK_DEFENSE_REFERENCE_ELO + 300, "attack");
    expect(adj).toBeGreaterThan(1.0);
  });

  it("attack: weak opponents → lower adjustment (< 1)", () => {
    const adj = computeSosAdjustment(ATTACK_DEFENSE_REFERENCE_ELO - 300, "attack");
    expect(adj).toBeLessThan(1.0);
  });

  it("defense: strong opponents → lower adjustment (< 1, conceding is harder)", () => {
    const adj = computeSosAdjustment(ATTACK_DEFENSE_REFERENCE_ELO + 300, "defense");
    expect(adj).toBeLessThan(1.0);
  });

  it("is bounded and does not produce NaN or negative values", () => {
    for (const elo of [500, 1000, 1500, 2000, 2500]) {
      const a = computeSosAdjustment(elo, "attack");
      const d = computeSosAdjustment(elo, "defense");
      expect(Number.isFinite(a)).toBe(true);
      expect(Number.isFinite(d)).toBe(true);
      expect(a).toBeGreaterThan(0);
      expect(d).toBeGreaterThan(0);
    }
  });
});

describe("computeAttackStrength", () => {
  it("returns neutral strength when scoring equals competition average", () => {
    const strength = computeAttackStrength(1.3, 1.3, 1.0);
    expect(strength).toBeCloseTo(ATTACK_DEFENSE_NEUTRAL_STRENGTH, 3);
  });

  it("returns higher value for above-average scorer (full shrinkage)", () => {
    expect(computeAttackStrength(2.0, 1.3, 1.0)).toBeGreaterThan(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  });

  it("returns lower value for below-average scorer (full shrinkage)", () => {
    expect(computeAttackStrength(0.5, 1.3, 1.0)).toBeLessThan(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  });

  it("shrinks toward neutral for sparse sample (shrinkage=0.3)", () => {
    const sparse = computeAttackStrength(2.5, 1.3, 0.3);
    const full = computeAttackStrength(2.5, 1.3, 1.0);
    expect(sparse).toBeLessThan(full);
    expect(sparse).toBeGreaterThan(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  });

  it("returns exactly neutral for zero shrinkage", () => {
    const strength = computeAttackStrength(5.0, 1.3, 0);
    expect(strength).toBeCloseTo(ATTACK_DEFENSE_NEUTRAL_STRENGTH, 5);
  });

  it("is bounded within [STRENGTH_MIN, STRENGTH_MAX]", () => {
    const extreme = computeAttackStrength(100, 1.3, 1.0);
    expect(extreme).toBeLessThanOrEqual(ATTACK_DEFENSE_STRENGTH_MAX);
    const zero = computeAttackStrength(0, 1.3, 1.0);
    expect(zero).toBeGreaterThanOrEqual(ATTACK_DEFENSE_STRENGTH_MIN);
  });

  it("never returns NaN or Infinity", () => {
    for (const gpg of [0, 0.5, 1.0, 2.0, 5.0]) {
      const s = computeAttackStrength(gpg, 1.25, 0.7);
      expect(Number.isFinite(s)).toBe(true);
    }
  });
});

describe("computeDefenseStrength", () => {
  it("returns neutral strength when conceding equals competition average", () => {
    const strength = computeDefenseStrength(1.3, 1.3, 1.0);
    expect(strength).toBeCloseTo(ATTACK_DEFENSE_NEUTRAL_STRENGTH, 3);
  });

  it("above-average conceder (weak defense) → strength > 1", () => {
    expect(computeDefenseStrength(2.0, 1.3, 1.0)).toBeGreaterThan(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  });

  it("below-average conceder (strong defense) → strength < 1", () => {
    expect(computeDefenseStrength(0.5, 1.3, 1.0)).toBeLessThan(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  });

  it("is bounded and finite", () => {
    for (const gpg of [0, 0.5, 1.0, 2.0, 5.0]) {
      const s = computeDefenseStrength(gpg, 1.25, 0.7);
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(ATTACK_DEFENSE_STRENGTH_MIN);
      expect(s).toBeLessThanOrEqual(ATTACK_DEFENSE_STRENGTH_MAX);
    }
  });
});

describe("computeEloMultiplier", () => {
  it("returns 1.0 for zero Elo difference", () => {
    const mult = computeEloMultiplier(0, 1.25, 0.15, 0.65);
    expect(mult).toBeCloseTo(1.0, 4);
  });

  it("positive Elo diff → multiplier > 1 (home stronger)", () => {
    expect(computeEloMultiplier(200, 1.25, 0.15, 0.65)).toBeGreaterThan(1.0);
  });

  it("negative Elo diff → multiplier < 1 (away stronger)", () => {
    expect(computeEloMultiplier(-200, 1.25, 0.15, 0.65)).toBeLessThan(1.0);
  });

  it("is bounded and finite for extreme Elo differences", () => {
    for (const diff of [-1000, -500, 0, 500, 1000]) {
      const m = computeEloMultiplier(diff, 1.25, 0.15, 0.65);
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThan(0);
    }
  });
});
