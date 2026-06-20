import { generateScoreMatrix } from "./poisson.js";
import { aggregateOutcomeProbabilities } from "./probability.js";
import { HISTORICAL_VALIDATION_EPSILON } from "./historical-validation.js";
import {
  ELO_TO_XG_BASE_GOALS,
  ELO_TO_XG_MIN_GOALS,
  ELO_TO_XG_MAX_GOALS,
  ELO_TO_XG_ADJUSTMENT_PER_100,
  ELO_TO_XG_MAX_ELO_ADJUSTMENT
} from "./elo-to-xg.js";
import type { EloResult } from "./types.js";

// --- Constants ---

export const V2_CANDIDATE_VERSION = "elo-to-xg-v2-steeper-linear-candidate-v1";
export const V2_CANDIDATE_POISSON_MAX_GOALS = 7;

// V1 reference constants (unchanged in production)
export const V2_CANDIDATE_V1_ADJUSTMENT_PER_100 = ELO_TO_XG_ADJUSTMENT_PER_100;
export const V2_CANDIDATE_V1_MAX_ELO_ADJUSTMENT = ELO_TO_XG_MAX_ELO_ADJUSTMENT;
export const V2_CANDIDATE_V1_BASE_GOALS = ELO_TO_XG_BASE_GOALS;

// --- Types ---

export interface V2SteepLinearParams {
  adjustmentPer100: number;
  maxAdjustment: number;
  label: string;
}

export interface V2CandidateSplitMetrics {
  split: string;
  records_evaluated: number;
  mean_brier_score: number | null;
  mean_log_loss: number | null;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  outcome_accuracy: number | null;
  avg_predicted_home_xg: number | null;
  avg_predicted_away_xg: number | null;
}

export interface V2SplitDelta {
  split: string;
  records_evaluated: number;
  brier_score_delta: number | null;
  log_loss_delta: number | null;
  home_goal_mae_delta: number | null;
  away_goal_mae_delta: number | null;
  total_goal_mae_delta: number | null;
  outcome_accuracy_delta: number | null;
}

export type V2AcceptanceGateVerdict = "eligible_for_review" | "rejected" | "inconclusive";

export interface V2AcceptanceGate {
  verdict: V2AcceptanceGateVerdict;
  reason: string;
  holdout_brier_improves: boolean | null;
  holdout_log_loss_improves: boolean | null;
  goal_mae_materially_worsened: boolean | null;
}

export interface V2CandidateEvaluation {
  params: V2SteepLinearParams;
  splits: {
    training: V2CandidateSplitMetrics;
    validation: V2CandidateSplitMetrics;
    holdout: V2CandidateSplitMetrics;
    combined_non_2026: V2CandidateSplitMetrics;
  };
  deltas: {
    training: V2SplitDelta;
    validation: V2SplitDelta;
    holdout: V2SplitDelta;
    combined_non_2026: V2SplitDelta;
  };
  acceptance_gate: V2AcceptanceGate;
}

export interface V2BaselineReference {
  source_artifact: string;
  holdout_brier_score: number;
  holdout_log_loss: number;
  holdout_home_goal_mae: number;
  holdout_away_goal_mae: number;
  holdout_total_goal_mae: number;
  holdout_outcome_accuracy: number;
  training_brier_score: number;
  training_log_loss: number;
  validation_brier_score: number;
  validation_log_loss: number;
  combined_non_2026_brier_score: number;
  combined_non_2026_log_loss: number;
}

export interface V2CandidateReport {
  candidate_version: string;
  v1_reference: V2BaselineReference;
  candidate_set: V2SteepLinearParams[];
  evaluations: V2CandidateEvaluation[];
  summary: {
    total_candidates: number;
    eligible_for_review: number;
    rejected: number;
    inconclusive: number;
  };
  limitations: string[];
}

// --- Deterministic candidate parameter set ---

export const V2_STEEPER_LINEAR_CANDIDATES: V2SteepLinearParams[] = [
  { adjustmentPer100: 0.13, maxAdjustment: 0.55, label: "steeper-0.13" },
  { adjustmentPer100: 0.15, maxAdjustment: 0.65, label: "steeper-0.15" },
  { adjustmentPer100: 0.17, maxAdjustment: 0.75, label: "steeper-0.17" }
];

// --- Core candidate xG function ---

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampGoals(n: number): number {
  return Math.max(ELO_TO_XG_MIN_GOALS, Math.min(ELO_TO_XG_MAX_GOALS, n));
}

/**
 * Isolated steeper-linear xG mapping. Same structural form as V1 but with
 * configurable slope and cap. Does not modify the production formula.
 */
export function v2SteepLinearXg(
  homeElo: number,
  awayElo: number,
  params: V2SteepLinearParams
): { homeXg: number; awayXg: number } {
  const eloDifference = homeElo - awayElo;
  const rawAdj = (eloDifference / 100) * params.adjustmentPer100;
  const clampedAdj = Math.max(-params.maxAdjustment, Math.min(params.maxAdjustment, rawAdj));
  const adj = roundToTwo(clampedAdj);
  return {
    homeXg: clampGoals(ELO_TO_XG_BASE_GOALS + adj),
    awayXg: clampGoals(ELO_TO_XG_BASE_GOALS - adj)
  };
}

// --- Candidate Poisson path ---

interface CandidateOutcomeProbs {
  homeWin: number;
  draw: number;
  awayWin: number;
}

function candidatePoissonProbs(homeElo: number, awayElo: number, params: V2SteepLinearParams): CandidateOutcomeProbs {
  const { homeXg, awayXg } = v2SteepLinearXg(homeElo, awayElo, params);
  const matrix = generateScoreMatrix(
    { expectedHomeGoals: homeXg, expectedAwayGoals: awayXg },
    { maxGoals: V2_CANDIDATE_POISSON_MAX_GOALS, normalizeMatrix: true }
  );
  const agg = aggregateOutcomeProbabilities(matrix);
  return {
    homeWin: agg.homeWinProbability,
    draw: agg.drawProbability,
    awayWin: agg.awayWinProbability
  };
}

function candidateBrierScore(probs: CandidateOutcomeProbs, actual: EloResult): number {
  const yHome = actual === "home_win" ? 1 : 0;
  const yDraw = actual === "draw" ? 1 : 0;
  const yAway = actual === "away_win" ? 1 : 0;
  return (probs.homeWin - yHome) ** 2 + (probs.draw - yDraw) ** 2 + (probs.awayWin - yAway) ** 2;
}

function candidateLogLoss(probs: CandidateOutcomeProbs, actual: EloResult): number {
  const p = actual === "home_win" ? probs.homeWin : actual === "draw" ? probs.draw : probs.awayWin;
  const clamped = Math.max(HISTORICAL_VALIDATION_EPSILON, Math.min(1 - HISTORICAL_VALIDATION_EPSILON, p));
  return -Math.log(clamped);
}

function candidatePredictedOutcome(probs: CandidateOutcomeProbs): EloResult {
  if (probs.homeWin >= probs.draw && probs.homeWin >= probs.awayWin) return "home_win";
  if (probs.draw >= probs.awayWin) return "draw";
  return "away_win";
}

function safeAvg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const v = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Number.isFinite(v) ? v : null;
}

// --- Per-record evaluation ---

interface CandidateRecord {
  homeElo: number;
  awayElo: number;
  homeScore: number;
  awayScore: number;
  result: EloResult;
  split: string;
}

function evalSplit(records: CandidateRecord[], params: V2SteepLinearParams, splitName: string): V2CandidateSplitMetrics {
  if (records.length === 0) {
    return {
      split: splitName,
      records_evaluated: 0,
      mean_brier_score: null,
      mean_log_loss: null,
      mean_home_goal_mae: null,
      mean_away_goal_mae: null,
      mean_total_goal_mae: null,
      outcome_accuracy: null,
      avg_predicted_home_xg: null,
      avg_predicted_away_xg: null
    };
  }

  const briers: number[] = [];
  const losses: number[] = [];
  const homeMaes: number[] = [];
  const awayMaes: number[] = [];
  const totalMaes: number[] = [];
  const correct: boolean[] = [];
  const homeXgs: number[] = [];
  const awayXgs: number[] = [];

  for (const rec of records) {
    const { homeXg, awayXg } = v2SteepLinearXg(rec.homeElo, rec.awayElo, params);
    const probs = candidatePoissonProbs(rec.homeElo, rec.awayElo, params);
    briers.push(candidateBrierScore(probs, rec.result));
    losses.push(candidateLogLoss(probs, rec.result));
    homeMaes.push(Math.abs(homeXg - rec.homeScore));
    awayMaes.push(Math.abs(awayXg - rec.awayScore));
    totalMaes.push(Math.abs(homeXg + awayXg - (rec.homeScore + rec.awayScore)));
    correct.push(candidatePredictedOutcome(probs) === rec.result);
    homeXgs.push(homeXg);
    awayXgs.push(awayXg);
  }

  return {
    split: splitName,
    records_evaluated: records.length,
    mean_brier_score: safeAvg(briers),
    mean_log_loss: safeAvg(losses),
    mean_home_goal_mae: safeAvg(homeMaes),
    mean_away_goal_mae: safeAvg(awayMaes),
    mean_total_goal_mae: safeAvg(totalMaes),
    outcome_accuracy: correct.filter(Boolean).length / correct.length,
    avg_predicted_home_xg: safeAvg(homeXgs),
    avg_predicted_away_xg: safeAvg(awayXgs)
  };
}

function deltaOrNull(cand: number | null, base: number | null): number | null {
  if (cand === null || base === null) return null;
  return cand - base;
}

function computeDeltas(
  cand: V2CandidateSplitMetrics,
  baselineMetrics: {
    mean_brier_score: number | null;
    mean_log_loss: number | null;
    mean_home_goal_mae: number | null;
    mean_away_goal_mae: number | null;
    mean_total_goal_mae: number | null;
    outcome_accuracy: number | null;
  }
): V2SplitDelta {
  return {
    split: cand.split,
    records_evaluated: cand.records_evaluated,
    brier_score_delta: deltaOrNull(cand.mean_brier_score, baselineMetrics.mean_brier_score),
    log_loss_delta: deltaOrNull(cand.mean_log_loss, baselineMetrics.mean_log_loss),
    home_goal_mae_delta: deltaOrNull(cand.mean_home_goal_mae, baselineMetrics.mean_home_goal_mae),
    away_goal_mae_delta: deltaOrNull(cand.mean_away_goal_mae, baselineMetrics.mean_away_goal_mae),
    total_goal_mae_delta: deltaOrNull(cand.mean_total_goal_mae, baselineMetrics.mean_total_goal_mae),
    outcome_accuracy_delta: deltaOrNull(cand.outcome_accuracy, baselineMetrics.outcome_accuracy)
  };
}

// --- Acceptance gate ---

// Material worsening threshold for goal MAE (absolute units)
const MAE_WORSENING_THRESHOLD = 0.05;

function applyAcceptanceGate(
  holdoutDeltas: V2SplitDelta,
  holdoutCand: V2CandidateSplitMetrics
): V2AcceptanceGate {
  const brierImproves =
    holdoutDeltas.brier_score_delta !== null ? holdoutDeltas.brier_score_delta < 0 : null;
  const logLossImproves =
    holdoutDeltas.log_loss_delta !== null ? holdoutDeltas.log_loss_delta < 0 : null;

  // Goal MAE materially worsened if any of home/away/total increases by more than threshold
  let goalMaeWorsened: boolean | null = null;
  if (
    holdoutDeltas.home_goal_mae_delta !== null &&
    holdoutDeltas.away_goal_mae_delta !== null &&
    holdoutDeltas.total_goal_mae_delta !== null
  ) {
    goalMaeWorsened =
      holdoutDeltas.home_goal_mae_delta > MAE_WORSENING_THRESHOLD ||
      holdoutDeltas.away_goal_mae_delta > MAE_WORSENING_THRESHOLD ||
      holdoutDeltas.total_goal_mae_delta > MAE_WORSENING_THRESHOLD;
  }

  if (holdoutCand.records_evaluated === 0 || brierImproves === null || logLossImproves === null) {
    return {
      verdict: "inconclusive",
      reason: "Holdout split is empty or metrics unavailable — cannot evaluate candidate.",
      holdout_brier_improves: brierImproves,
      holdout_log_loss_improves: logLossImproves,
      goal_mae_materially_worsened: goalMaeWorsened
    };
  }

  if (goalMaeWorsened === true) {
    return {
      verdict: "rejected",
      reason: `Goal MAE materially worsened on holdout (threshold: ${MAE_WORSENING_THRESHOLD} goals). Candidate rejected regardless of Brier/LogLoss improvement.`,
      holdout_brier_improves: brierImproves,
      holdout_log_loss_improves: logLossImproves,
      goal_mae_materially_worsened: true
    };
  }

  if (brierImproves || logLossImproves) {
    return {
      verdict: "eligible_for_review",
      reason:
        `Holdout ${brierImproves ? "Brier Score" : ""}${brierImproves && logLossImproves ? " and " : ""}${logLossImproves ? "Log Loss" : ""} improved over V1 baseline without materially worsening goal MAE.`,
      holdout_brier_improves: brierImproves,
      holdout_log_loss_improves: logLossImproves,
      goal_mae_materially_worsened: goalMaeWorsened ?? false
    };
  }

  return {
    verdict: "rejected",
    reason: "Neither holdout Brier Score nor Log Loss improved over V1 baseline.",
    holdout_brier_improves: brierImproves,
    holdout_log_loss_improves: logLossImproves,
    goal_mae_materially_worsened: goalMaeWorsened ?? false
  };
}

// --- Runner input/output ---

export interface RunV2CandidateEvaluationInput {
  records: CandidateRecord[];
  v1Reference: V2BaselineReference;
  candidates?: V2SteepLinearParams[];
}

// Re-export the CandidateRecord type for consumers
export type { CandidateRecord as V2CandidateRecord };

// Baseline metrics keyed by split name
interface BaselineSplitMetrics {
  mean_brier_score: number | null;
  mean_log_loss: number | null;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  outcome_accuracy: number | null;
}

function getBaselineForSplit(split: string, ref: V2BaselineReference): BaselineSplitMetrics {
  switch (split) {
    case "training":
      return {
        mean_brier_score: ref.training_brier_score,
        mean_log_loss: ref.training_log_loss,
        mean_home_goal_mae: null,
        mean_away_goal_mae: null,
        mean_total_goal_mae: null,
        outcome_accuracy: null
      };
    case "validation":
      return {
        mean_brier_score: ref.validation_brier_score,
        mean_log_loss: ref.validation_log_loss,
        mean_home_goal_mae: null,
        mean_away_goal_mae: null,
        mean_total_goal_mae: null,
        outcome_accuracy: null
      };
    case "holdout":
      return {
        mean_brier_score: ref.holdout_brier_score,
        mean_log_loss: ref.holdout_log_loss,
        mean_home_goal_mae: ref.holdout_home_goal_mae,
        mean_away_goal_mae: ref.holdout_away_goal_mae,
        mean_total_goal_mae: ref.holdout_total_goal_mae,
        outcome_accuracy: ref.holdout_outcome_accuracy
      };
    case "combined_non_2026":
      return {
        mean_brier_score: ref.combined_non_2026_brier_score,
        mean_log_loss: ref.combined_non_2026_log_loss,
        mean_home_goal_mae: null,
        mean_away_goal_mae: null,
        mean_total_goal_mae: null,
        outcome_accuracy: null
      };
    default:
      return {
        mean_brier_score: null,
        mean_log_loss: null,
        mean_home_goal_mae: null,
        mean_away_goal_mae: null,
        mean_total_goal_mae: null,
        outcome_accuracy: null
      };
  }
}

export function runV2CandidateEvaluation(input: RunV2CandidateEvaluationInput): V2CandidateReport {
  const candidates = input.candidates ?? V2_STEEPER_LINEAR_CANDIDATES;
  const ref = input.v1Reference;

  const trainingRecords = input.records.filter((r) => r.split === "training");
  const validationRecords = input.records.filter((r) => r.split === "validation");
  const holdoutRecords = input.records.filter((r) => r.split === "holdout");
  const nonWc2026Records = input.records.filter((r) => r.split !== "wc2026_holdout");

  const evaluations: V2CandidateEvaluation[] = candidates.map((params) => {
    const trainMetrics = evalSplit(trainingRecords, params, "training");
    const valMetrics = evalSplit(validationRecords, params, "validation");
    const holdoutMetrics = evalSplit(holdoutRecords, params, "holdout");
    const combinedMetrics = evalSplit(nonWc2026Records, params, "combined_non_2026");

    const trainDeltas = computeDeltas(trainMetrics, getBaselineForSplit("training", ref));
    const valDeltas = computeDeltas(valMetrics, getBaselineForSplit("validation", ref));
    const holdoutDeltas = computeDeltas(holdoutMetrics, getBaselineForSplit("holdout", ref));
    const combinedDeltas = computeDeltas(combinedMetrics, getBaselineForSplit("combined_non_2026", ref));

    const acceptanceGate = applyAcceptanceGate(holdoutDeltas, holdoutMetrics);

    return {
      params,
      splits: {
        training: trainMetrics,
        validation: valMetrics,
        holdout: holdoutMetrics,
        combined_non_2026: combinedMetrics
      },
      deltas: {
        training: trainDeltas,
        validation: valDeltas,
        holdout: holdoutDeltas,
        combined_non_2026: combinedDeltas
      },
      acceptance_gate: acceptanceGate
    };
  });

  const verdicts = evaluations.map((e) => e.acceptance_gate.verdict);
  return {
    candidate_version: V2_CANDIDATE_VERSION,
    v1_reference: ref,
    candidate_set: candidates,
    evaluations,
    summary: {
      total_candidates: candidates.length,
      eligible_for_review: verdicts.filter((v) => v === "eligible_for_review").length,
      rejected: verdicts.filter((v) => v === "rejected").length,
      inconclusive: verdicts.filter((v) => v === "inconclusive").length
    },
    limitations: [
      "Candidate evaluation uses the same calibration dataset as V1 baseline. No new data was introduced.",
      "Holdout split contains WC2022 + international 2022+ matches only. Sample size may limit statistical power.",
      "No statistical significance testing is performed. Metrics are descriptive.",
      "The acceptance gate uses fixed thresholds (MAE worsening > 0.05 goals). These are heuristic, not theoretically derived.",
      "WC2026 holdout is always excluded from candidate evaluation.",
      "The candidate does not modify the production formula. It is isolated in this module only."
    ]
  };
}
