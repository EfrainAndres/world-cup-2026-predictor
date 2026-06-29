export type BacktestDecision =
  | "promote_signal_candidate"
  | "retain_experimental"
  | "recalibrate_signal_weights"
  | "disable_signal_candidate"
  | "real_data_evaluation_blocked"
  | "insufficient_evidence";

export const DECISION_MIN_ELIGIBLE_FIXTURES = 20;
export const DECISION_MIN_SIGNAL_APPLICATIONS = 10;
export const DECISION_BRIER_REGRESSION_THRESHOLD = 0.005;
export const DECISION_LOG_LOSS_REGRESSION_THRESHOLD = 0.015;
export const DECISION_TOTAL_GOAL_MAE_REGRESSION_THRESHOLD = 0.05;
export const DECISION_FAVORITE_CALIBRATION_GAP_THRESHOLD = 0.05;

export interface BacktestDecisionInput {
  hasRealProfiles: boolean;
  fixtureCount: number;
  signalApplicationCount: number;
  baselineMetrics: {
    brierScore: number | null;
    logLoss: number | null;
    totalGoalMae: number | null;
  };
  enrichedMetrics: {
    brierScore: number | null;
    logLoss: number | null;
    totalGoalMae: number | null;
  };
  hasLookaheadFailure: boolean;
  hasInvalidProfiles: boolean;
}

export interface BacktestDecisionResult {
  decision: BacktestDecision;
  reasons: string[];
}

export function makeStatsBombBacktestDecision(
  input: BacktestDecisionInput
): BacktestDecisionResult {
  const reasons: string[] = [];

  if (!input.hasRealProfiles) {
    return {
      decision: "real_data_evaluation_blocked",
      reasons: ["StatsBomb profiles artifact is empty or unavailable; cannot evaluate."],
    };
  }

  if (input.hasLookaheadFailure) {
    reasons.push("Look-ahead failure detected: profile cutoff violated for one or more fixtures.");
    return { decision: "disable_signal_candidate", reasons };
  }

  if (input.hasInvalidProfiles) {
    reasons.push("Invalid profiles detected: one or more team profiles contain corrupt or inconsistent data.");
    return { decision: "disable_signal_candidate", reasons };
  }

  if (
    input.fixtureCount < DECISION_MIN_ELIGIBLE_FIXTURES ||
    input.signalApplicationCount < DECISION_MIN_SIGNAL_APPLICATIONS
  ) {
    reasons.push(
      `Insufficient fixtures (${input.fixtureCount} < ${DECISION_MIN_ELIGIBLE_FIXTURES}) ` +
      `or insufficient signal applications (${input.signalApplicationCount} < ${DECISION_MIN_SIGNAL_APPLICATIONS}).`
    );
    return { decision: "insufficient_evidence", reasons };
  }

  const { baselineMetrics: bm, enrichedMetrics: em } = input;
  let hasRegression = false;

  const brierDelta =
    bm.brierScore !== null && em.brierScore !== null ? em.brierScore - bm.brierScore : null;
  const logLossDelta =
    bm.logLoss !== null && em.logLoss !== null ? em.logLoss - bm.logLoss : null;
  const maeDelta =
    bm.totalGoalMae !== null && em.totalGoalMae !== null ? em.totalGoalMae - bm.totalGoalMae : null;

  if (brierDelta !== null && brierDelta > DECISION_BRIER_REGRESSION_THRESHOLD) {
    reasons.push(
      `Brier Score regressed by ${brierDelta.toFixed(4)} ` +
      `(threshold: ${DECISION_BRIER_REGRESSION_THRESHOLD}).`
    );
    hasRegression = true;
  }

  if (logLossDelta !== null && logLossDelta > DECISION_LOG_LOSS_REGRESSION_THRESHOLD) {
    reasons.push(
      `Log Loss regressed by ${logLossDelta.toFixed(4)} ` +
      `(threshold: ${DECISION_LOG_LOSS_REGRESSION_THRESHOLD}).`
    );
    hasRegression = true;
  }

  if (maeDelta !== null && maeDelta > DECISION_TOTAL_GOAL_MAE_REGRESSION_THRESHOLD) {
    reasons.push(
      `Total Goal MAE regressed by ${maeDelta.toFixed(4)} ` +
      `(threshold: ${DECISION_TOTAL_GOAL_MAE_REGRESSION_THRESHOLD}).`
    );
    hasRegression = true;
  }

  if (hasRegression) {
    return { decision: "recalibrate_signal_weights", reasons };
  }

  const brierImproved = brierDelta !== null && brierDelta < 0;
  const logLossImproved = logLossDelta !== null && logLossDelta < 0;

  if (brierImproved && logLossImproved) {
    reasons.push(
      `Both Brier Score (Δ${brierDelta!.toFixed(4)}) and Log Loss (Δ${logLossDelta!.toFixed(4)}) improved.`,
      "No material regression detected across monitored metrics.",
      `Signal applied to ${input.signalApplicationCount} of ${input.fixtureCount} eligible fixtures.`
    );
    return { decision: "promote_signal_candidate", reasons };
  }

  reasons.push(
    "No material regression detected, but insufficient metric improvement to recommend promotion.",
    `Brier delta: ${brierDelta !== null ? brierDelta.toFixed(4) : "n/a"}, ` +
    `LogLoss delta: ${logLossDelta !== null ? logLossDelta.toFixed(4) : "n/a"}.`
  );
  return { decision: "retain_experimental", reasons };
}
