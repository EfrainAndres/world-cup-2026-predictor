import type { EloToExpectedGoalsInput, EloToExpectedGoalsResult, EloToXgFormulaVersion, EloXgPreset, EloXgPresetConfig } from "./types.js";

export const ELO_TO_XG_BASE_GOALS = 1.25;
export const ELO_TO_XG_MIN_GOALS = 0.2;
export const ELO_TO_XG_MAX_GOALS = 4.0;
export const ELO_TO_XG_ATTACK_DEFENSE_WEIGHT = 0.1;

// V1 balanced rollback constants — preserved for regression testing and explicit revert path.
// Do not delete. Phase 12.11D decision artifact references these values.
export const ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100 = 0.1;
export const ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT = 0.45;

// V2 balanced production constants — promoted from Phase 12.11E (candidate steeper-0.15).
// Evidence: holdout Brier −0.0072, Log Loss −0.0097 vs V1 baseline at n=120.
export const ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100 = 0.15;
export const ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT = 0.65;

// Current production defaults — point to V2. Update these if rolling back to V1.
export const ELO_TO_XG_ADJUSTMENT_PER_100 = ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100;
export const ELO_TO_XG_MAX_ELO_ADJUSTMENT = ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT;

export const ELO_TO_XG_FORMULA_VERSION: EloToXgFormulaVersion = "v2";

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
    // V2 calibrated formula. V1 rollback: ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100 / ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT.
    description: "Default xG mapping. V2 calibrated formula (adjustmentPer100=0.15, maxAdjustment=0.65).",
    adjustmentPer100: ELO_TO_XG_ADJUSTMENT_PER_100,
    maxAdjustment: ELO_TO_XG_MAX_ELO_ADJUSTMENT
  },
  // Aggressive adjusted from 0.14/0.65 to 0.17/0.75 to preserve conservative < balanced < aggressive
  // ordering after balanced was promoted to 0.15/0.65 in Phase 12.11E.
  aggressive: {
    name: "aggressive",
    description: "Larger xG gap — stronger teams are favored more heavily.",
    adjustmentPer100: 0.17,
    maxAdjustment: 0.75
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
    formulaVersion: ELO_TO_XG_FORMULA_VERSION,
    adjustmentPer100: resolvedPreset.adjustmentPer100,
    maxAdjustment: resolvedPreset.maxAdjustment,
    v1RollbackAvailable: true,
    warnings
  };
}
