import type { EloToExpectedGoalsInput, EloToExpectedGoalsResult } from "./types.js";

export const ELO_TO_XG_BASE_GOALS = 1.25;
export const ELO_TO_XG_ADJUSTMENT_PER_100 = 0.1;
export const ELO_TO_XG_MAX_ELO_ADJUSTMENT = 0.45;
export const ELO_TO_XG_MIN_GOALS = 0.2;
export const ELO_TO_XG_MAX_GOALS = 4.0;
export const ELO_TO_XG_ATTACK_DEFENSE_WEIGHT = 0.1;

export const ELO_TO_XG_UNCALIBRATED_WARNING =
  "Expected goals are generated from a simple deterministic Elo difference mapping, not a calibrated goals model.";
export const ELO_TO_XG_ATTACK_DEFENSE_ADJUSTMENT_WARNING =
  "Attack/defense scores were used to adjust expected goals. These adjustments are experimental and not calibrated.";

const ATTACK_DEFENSE_NEUTRAL = 50;
const ATTACK_DEFENSE_RANGE = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeScore(score: number): number {
  return (score - ATTACK_DEFENSE_NEUTRAL) / ATTACK_DEFENSE_RANGE;
}

export function eloToExpectedGoals(input: EloToExpectedGoalsInput): EloToExpectedGoalsResult {
  const warnings: string[] = [ELO_TO_XG_UNCALIBRATED_WARNING];

  const eloDifference = roundToTwoDecimals(input.homeEloRating - input.awayEloRating);
  const rawEloAdj = (eloDifference / 100) * ELO_TO_XG_ADJUSTMENT_PER_100;
  const eloAdjustment = roundToTwoDecimals(clamp(rawEloAdj, -ELO_TO_XG_MAX_ELO_ADJUSTMENT, ELO_TO_XG_MAX_ELO_ADJUSTMENT));

  let attackDefenseAdjustmentHome = 0;
  let attackDefenseAdjustmentAway = 0;

  if (input.applyAttackDefense === true) {
    const homeAttackScore = input.homeAttackScore;
    const awayDefenseScore = input.awayDefenseScore;
    const awayAttackScore = input.awayAttackScore;
    const homeDefenseScore = input.homeDefenseScore;

    if (homeAttackScore !== undefined && awayDefenseScore !== undefined) {
      const rawAdj = (normalizeScore(homeAttackScore) - normalizeScore(awayDefenseScore)) * ELO_TO_XG_ATTACK_DEFENSE_WEIGHT;
      attackDefenseAdjustmentHome = roundToTwoDecimals(clamp(rawAdj, -ELO_TO_XG_ATTACK_DEFENSE_WEIGHT * 2, ELO_TO_XG_ATTACK_DEFENSE_WEIGHT * 2));
    }

    if (awayAttackScore !== undefined && homeDefenseScore !== undefined) {
      const rawAdj = (normalizeScore(awayAttackScore) - normalizeScore(homeDefenseScore)) * ELO_TO_XG_ATTACK_DEFENSE_WEIGHT;
      attackDefenseAdjustmentAway = roundToTwoDecimals(clamp(rawAdj, -ELO_TO_XG_ATTACK_DEFENSE_WEIGHT * 2, ELO_TO_XG_ATTACK_DEFENSE_WEIGHT * 2));
    }

    warnings.push(ELO_TO_XG_ATTACK_DEFENSE_ADJUSTMENT_WARNING);
  }

  const homeExpectedGoals = roundToTwoDecimals(
    clamp(ELO_TO_XG_BASE_GOALS + eloAdjustment + attackDefenseAdjustmentHome, ELO_TO_XG_MIN_GOALS, ELO_TO_XG_MAX_GOALS)
  );

  const awayExpectedGoals = roundToTwoDecimals(
    clamp(ELO_TO_XG_BASE_GOALS - eloAdjustment + attackDefenseAdjustmentAway, ELO_TO_XG_MIN_GOALS, ELO_TO_XG_MAX_GOALS)
  );

  return {
    homeExpectedGoals,
    awayExpectedGoals,
    eloDifference,
    baseGoals: ELO_TO_XG_BASE_GOALS,
    eloAdjustment,
    attackDefenseAdjustmentHome,
    attackDefenseAdjustmentAway,
    warnings
  };
}
