import type { EloToExpectedGoalsInput, EloToExpectedGoalsResult, EloXgPreset, EloXgPresetConfig } from "./types.js";

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
export const ELO_TO_XG_PRESET_WARNING =
  "A non-default prediction preset is active. xG sensitivity to Elo differences is adjusted from the baseline.";

export const ELO_XG_PRESETS: Record<EloXgPreset, EloXgPresetConfig> = {
  conservative: {
    name: "conservative",
    description: "Smaller xG gap — closer outcomes, suits low-scoring expectations.",
    adjustmentPer100: 0.07,
    maxAdjustment: 0.30
  },
  balanced: {
    name: "balanced",
    description: "Default xG mapping. Matches the baseline pipeline behavior.",
    adjustmentPer100: ELO_TO_XG_ADJUSTMENT_PER_100,
    maxAdjustment: ELO_TO_XG_MAX_ELO_ADJUSTMENT
  },
  aggressive: {
    name: "aggressive",
    description: "Larger xG gap — stronger teams are favored more heavily.",
    adjustmentPer100: 0.14,
    maxAdjustment: 0.65
  }
};

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

  const presetName: EloXgPreset = input.preset ?? "balanced";
  const resolvedPreset = ELO_XG_PRESETS[presetName];

  if (presetName !== "balanced") {
    warnings.push(ELO_TO_XG_PRESET_WARNING);
  }

  const eloDifference = roundToTwoDecimals(input.homeEloRating - input.awayEloRating);
  const rawEloAdj = (eloDifference / 100) * resolvedPreset.adjustmentPer100;
  const eloAdjustment = roundToTwoDecimals(clamp(rawEloAdj, -resolvedPreset.maxAdjustment, resolvedPreset.maxAdjustment));

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
    preset: presetName,
    presetDescription: resolvedPreset.description,
    warnings
  };
}
