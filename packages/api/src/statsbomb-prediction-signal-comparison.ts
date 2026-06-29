import type { StatsBombPredictionAdjustment } from "./statsbomb-prediction-signal.js";

export interface StatsBombPredictionComparison {
  baseline: { homeXg: number; awayXg: number };
  adjusted: { homeXg: number; awayXg: number };
  delta: { homeXg: number; awayXg: number };
  applied: boolean;
  reason: string;
  pairWeight: number;
  homeWeight: number;
  awayWeight: number;
  warnings: string[];
}

export function buildStatsBombPredictionComparison(
  adjustment: StatsBombPredictionAdjustment
): StatsBombPredictionComparison {
  const pairWeight = Math.min(adjustment.homeWeight, adjustment.awayWeight);

  return {
    baseline: {
      homeXg: adjustment.baselineHomeXg,
      awayXg: adjustment.baselineAwayXg,
    },
    adjusted: {
      homeXg: adjustment.adjustedHomeXg,
      awayXg: adjustment.adjustedAwayXg,
    },
    delta: {
      homeXg: adjustment.adjustedHomeXg - adjustment.baselineHomeXg,
      awayXg: adjustment.adjustedAwayXg - adjustment.baselineAwayXg,
    },
    applied: adjustment.applied,
    reason: adjustment.reason,
    pairWeight,
    homeWeight: adjustment.homeWeight,
    awayWeight: adjustment.awayWeight,
    warnings: adjustment.warnings,
  };
}
