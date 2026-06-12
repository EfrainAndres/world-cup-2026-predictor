import { describe, expect, it } from "vitest";
import {
  ELO_TO_XG_ATTACK_DEFENSE_ADJUSTMENT_WARNING,
  ELO_TO_XG_BASE_GOALS,
  ELO_TO_XG_MAX_GOALS,
  ELO_TO_XG_MIN_GOALS,
  ELO_TO_XG_UNCALIBRATED_WARNING,
  eloToExpectedGoals
} from "../src/elo-to-xg.js";

describe("eloToExpectedGoals", () => {
  it("returns balanced xG for equal Elo ratings", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500 });

    expect(result.homeExpectedGoals).toBe(result.awayExpectedGoals);
    expect(result.homeExpectedGoals).toBe(ELO_TO_XG_BASE_GOALS);
    expect(result.eloDifference).toBe(0);
    expect(result.eloAdjustment).toBe(0);
  });

  it("stronger home team gets higher home xG and lower away xG", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1600, awayEloRating: 1500 });

    expect(result.homeExpectedGoals).toBeGreaterThan(result.awayExpectedGoals);
    expect(result.homeExpectedGoals).toBeGreaterThan(ELO_TO_XG_BASE_GOALS);
    expect(result.awayExpectedGoals).toBeLessThan(ELO_TO_XG_BASE_GOALS);
    expect(result.eloAdjustment).toBeGreaterThan(0);
  });

  it("stronger away team produces lower home xG and higher away xG", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1400, awayEloRating: 1500 });

    expect(result.awayExpectedGoals).toBeGreaterThan(result.homeExpectedGoals);
    expect(result.eloAdjustment).toBeLessThan(0);
  });

  it("xG values are finite and within [MIN_GOALS, MAX_GOALS]", () => {
    const cases = [
      { homeEloRating: 1500, awayEloRating: 1500 },
      { homeEloRating: 2000, awayEloRating: 1000 },
      { homeEloRating: 1000, awayEloRating: 2000 },
      { homeEloRating: 1800, awayEloRating: 1200 }
    ];

    for (const input of cases) {
      const result = eloToExpectedGoals(input);

      expect(isFinite(result.homeExpectedGoals)).toBe(true);
      expect(isFinite(result.awayExpectedGoals)).toBe(true);
      expect(result.homeExpectedGoals).toBeGreaterThanOrEqual(ELO_TO_XG_MIN_GOALS);
      expect(result.homeExpectedGoals).toBeLessThanOrEqual(ELO_TO_XG_MAX_GOALS);
      expect(result.awayExpectedGoals).toBeGreaterThanOrEqual(ELO_TO_XG_MIN_GOALS);
      expect(result.awayExpectedGoals).toBeLessThanOrEqual(ELO_TO_XG_MAX_GOALS);
    }
  });

  it("very large Elo difference is clamped to max adjustment", () => {
    const extreme = eloToExpectedGoals({ homeEloRating: 3000, awayEloRating: 1000 });
    const moderate = eloToExpectedGoals({ homeEloRating: 1950, awayEloRating: 1500 });

    expect(extreme.eloAdjustment).toBe(moderate.eloAdjustment);
    expect(extreme.homeExpectedGoals).toBe(moderate.homeExpectedGoals);
    expect(extreme.awayExpectedGoals).toBe(moderate.awayExpectedGoals);
  });

  it("eloAdjustment is symmetric: |home adv| = |away adv| for mirror inputs", () => {
    const homeAdvantaged = eloToExpectedGoals({ homeEloRating: 1600, awayEloRating: 1400 });
    const awayAdvantaged = eloToExpectedGoals({ homeEloRating: 1400, awayEloRating: 1600 });

    expect(homeAdvantaged.eloAdjustment).toBe(-awayAdvantaged.eloAdjustment);
    expect(homeAdvantaged.homeExpectedGoals).toBe(awayAdvantaged.awayExpectedGoals);
    expect(homeAdvantaged.awayExpectedGoals).toBe(awayAdvantaged.homeExpectedGoals);
  });

  it("always emits the uncalibrated warning", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500 });

    expect(result.warnings).toContain(ELO_TO_XG_UNCALIBRATED_WARNING);
  });

  it("does NOT emit attack/defense warning when applyAttackDefense is false", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500 });

    expect(result.warnings).not.toContain(ELO_TO_XG_ATTACK_DEFENSE_ADJUSTMENT_WARNING);
    expect(result.attackDefenseAdjustmentHome).toBe(0);
    expect(result.attackDefenseAdjustmentAway).toBe(0);
  });

  it("emits attack/defense warning when applyAttackDefense is true", () => {
    const result = eloToExpectedGoals({
      homeEloRating: 1500,
      awayEloRating: 1500,
      homeAttackScore: 70,
      homeDefenseScore: 50,
      awayAttackScore: 50,
      awayDefenseScore: 40,
      applyAttackDefense: true
    });

    expect(result.warnings).toContain(ELO_TO_XG_ATTACK_DEFENSE_ADJUSTMENT_WARNING);
  });

  it("higher home attack / lower away defense increases home xG", () => {
    const base = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500 });
    const boosted = eloToExpectedGoals({
      homeEloRating: 1500,
      awayEloRating: 1500,
      homeAttackScore: 80,
      homeDefenseScore: 50,
      awayAttackScore: 50,
      awayDefenseScore: 30,
      applyAttackDefense: true
    });

    expect(boosted.homeExpectedGoals).toBeGreaterThan(base.homeExpectedGoals);
    expect(boosted.attackDefenseAdjustmentHome).toBeGreaterThan(0);
  });

  it("higher away attack / lower home defense increases away xG", () => {
    const base = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500 });
    const boosted = eloToExpectedGoals({
      homeEloRating: 1500,
      awayEloRating: 1500,
      homeAttackScore: 50,
      homeDefenseScore: 30,
      awayAttackScore: 80,
      awayDefenseScore: 50,
      applyAttackDefense: true
    });

    expect(boosted.awayExpectedGoals).toBeGreaterThan(base.awayExpectedGoals);
    expect(boosted.attackDefenseAdjustmentAway).toBeGreaterThan(0);
  });

  it("neutral attack/defense scores (50/50) produce zero adjustment", () => {
    const result = eloToExpectedGoals({
      homeEloRating: 1500,
      awayEloRating: 1500,
      homeAttackScore: 50,
      homeDefenseScore: 50,
      awayAttackScore: 50,
      awayDefenseScore: 50,
      applyAttackDefense: true
    });

    expect(result.attackDefenseAdjustmentHome).toBe(0);
    expect(result.attackDefenseAdjustmentAway).toBe(0);
    expect(result.homeExpectedGoals).toBe(ELO_TO_XG_BASE_GOALS);
    expect(result.awayExpectedGoals).toBe(ELO_TO_XG_BASE_GOALS);
  });

  it("attack/defense has no effect when applyAttackDefense is not set", () => {
    const withoutFlag = eloToExpectedGoals({
      homeEloRating: 1500,
      awayEloRating: 1500,
      homeAttackScore: 80,
      awayDefenseScore: 20
    });
    const base = eloToExpectedGoals({ homeEloRating: 1500, awayEloRating: 1500 });

    expect(withoutFlag.homeExpectedGoals).toBe(base.homeExpectedGoals);
    expect(withoutFlag.awayExpectedGoals).toBe(base.awayExpectedGoals);
  });

  it("returns deterministic output for identical inputs", () => {
    const input = { homeEloRating: 1750, awayEloRating: 1620 };
    const first = eloToExpectedGoals(input);
    const second = eloToExpectedGoals(input);

    expect(first).toEqual(second);
  });

  it("baseGoals is always the configured base value", () => {
    const result = eloToExpectedGoals({ homeEloRating: 1800, awayEloRating: 1400 });

    expect(result.baseGoals).toBe(ELO_TO_XG_BASE_GOALS);
  });

  it("partial attack/defense (only home attack provided) leaves away adjustment at zero", () => {
    const result = eloToExpectedGoals({
      homeEloRating: 1500,
      awayEloRating: 1500,
      homeAttackScore: 80,
      applyAttackDefense: true
    });

    expect(result.attackDefenseAdjustmentHome).toBe(0);
    expect(result.attackDefenseAdjustmentAway).toBe(0);
  });
});
