import type { AttackDefenseGoalModelDecision } from "../../model/src/index.js";
import type {
  GoalModelBacktestResult,
  GoalModelCandidateMetrics,
} from "./attack-defense-goal-model-backtest.js";
import {
  BACKTEST_MIN_PROFILE_COVERAGE_RATE,
  BACKTEST_PROMOTION_MAX_BRIER_REGRESSION,
  BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION,
  BACKTEST_PROMOTION_MAX_LOG_LOSS_REGRESSION,
} from "./attack-defense-goal-model-backtest.js";

// ── Promotion thresholds ──────────────────────────────────────────────────────

export const DECISION_MIN_FIXTURE_COUNT = 32;
export const DECISION_MAX_ACCEPTABLE_GOAL_MAE = 1.5;
export const DECISION_MAX_XG_ALLOWED = 3.5;
export const DECISION_MIN_UNIQUE_XG_PAIRS = 10;
export const DECISION_MIN_UNIQUE_MODAL_SCORELINES = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GoalModelDecisionReport {
  decision: AttackDefenseGoalModelDecision;
  selectedCandidateId: string | null;
  baselineMetrics: GoalModelCandidateMetrics | null;
  bestCandidateMetrics: GoalModelCandidateMetrics | null;
  brierDelta: number | null;
  logLossDelta: number | null;
  totalGoalMaeDelta: number | null;
  reasons: string[];
  blockers: string[];
}

// ── Pure decision function ────────────────────────────────────────────────────

export function evaluateGoalModelDecision(
  backtestResult: GoalModelBacktestResult
): GoalModelDecisionReport {
  const reasons: string[] = [];
  const blockers: string[] = [];

  // Data quality gate
  if (backtestResult.fixtureCount < DECISION_MIN_FIXTURE_COUNT) {
    blockers.push(`Fixture count ${backtestResult.fixtureCount} < minimum ${DECISION_MIN_FIXTURE_COUNT}.`);
    return {
      decision: "data_quality_blocked",
      selectedCandidateId: null,
      baselineMetrics: null,
      bestCandidateMetrics: null,
      brierDelta: null,
      logLossDelta: null,
      totalGoalMaeDelta: null,
      reasons,
      blockers,
    };
  }

  // No look-ahead gate
  if (backtestResult.profileCoverageSummary.totalNoLookAheadViolations > 0) {
    blockers.push(`No-look-ahead violations: ${backtestResult.profileCoverageSummary.totalNoLookAheadViolations}.`);
    return {
      decision: "data_quality_blocked",
      selectedCandidateId: null,
      baselineMetrics: null,
      bestCandidateMetrics: null,
      brierDelta: null,
      logLossDelta: null,
      totalGoalMaeDelta: null,
      reasons,
      blockers,
    };
  }

  // Profile coverage gate
  if (backtestResult.profileCoverageSummary.fallbackRate > (1 - BACKTEST_MIN_PROFILE_COVERAGE_RATE)) {
    blockers.push(
      `Fallback rate ${(backtestResult.profileCoverageSummary.fallbackRate * 100).toFixed(1)}% ` +
      `exceeds maximum ${((1 - BACKTEST_MIN_PROFILE_COVERAGE_RATE) * 100).toFixed(1)}%.`
    );
    return {
      decision: "insufficient_profile_coverage",
      selectedCandidateId: null,
      baselineMetrics: null,
      bestCandidateMetrics: null,
      brierDelta: null,
      logLossDelta: null,
      totalGoalMaeDelta: null,
      reasons,
      blockers,
    };
  }

  const baseline = backtestResult.candidateMetrics.find((m) => m.candidateId === "elo_only_v2_baseline") ?? null;
  const candidates = backtestResult.candidateMetrics.filter((m) => m.candidateId !== "elo_only_v2_baseline");

  if (baseline === null) {
    blockers.push("Baseline candidate 'elo_only_v2_baseline' not found in results.");
    return {
      decision: "data_quality_blocked",
      selectedCandidateId: null,
      baselineMetrics: null,
      bestCandidateMetrics: null,
      brierDelta: null,
      logLossDelta: null,
      totalGoalMaeDelta: null,
      reasons,
      blockers,
    };
  }

  // Find best candidate by Brier Score improvement over baseline
  let best: GoalModelCandidateMetrics | null = null;
  let bestBrierDelta = Infinity;

  for (const candidate of candidates) {
    if (candidate.brierScore === null || baseline.brierScore === null) continue;
    const delta = candidate.brierScore - baseline.brierScore;
    if (delta < bestBrierDelta) {
      bestBrierDelta = delta;
      best = candidate;
    }
  }

  if (best === null) {
    reasons.push("No valid candidate metrics available for comparison.");
    return {
      decision: "retain_elo_v2",
      selectedCandidateId: null,
      baselineMetrics: baseline,
      bestCandidateMetrics: null,
      brierDelta: null,
      logLossDelta: null,
      totalGoalMaeDelta: null,
      reasons,
      blockers,
    };
  }

  const brierDelta = baseline.brierScore !== null && best.brierScore !== null
    ? best.brierScore - baseline.brierScore
    : null;
  const logLossDelta = baseline.logLoss !== null && best.logLoss !== null
    ? best.logLoss - baseline.logLoss
    : null;
  const totalGoalMaeDelta = baseline.totalGoalMae !== null && best.totalGoalMae !== null
    ? best.totalGoalMae - baseline.totalGoalMae
    : null;

  // Check regression thresholds
  if (brierDelta !== null && brierDelta > BACKTEST_PROMOTION_MAX_BRIER_REGRESSION) {
    blockers.push(
      `Brier Score regression ${brierDelta.toFixed(5)} > threshold ${BACKTEST_PROMOTION_MAX_BRIER_REGRESSION}. ` +
      `Candidate ${best.candidateId} underperforms baseline.`
    );
  }

  if (logLossDelta !== null && logLossDelta > BACKTEST_PROMOTION_MAX_LOG_LOSS_REGRESSION) {
    blockers.push(
      `Log Loss regression ${logLossDelta.toFixed(5)} > threshold ${BACKTEST_PROMOTION_MAX_LOG_LOSS_REGRESSION}. ` +
      `Candidate ${best.candidateId} underperforms baseline.`
    );
  }

  if (totalGoalMaeDelta !== null && totalGoalMaeDelta > BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION) {
    blockers.push(
      `Total goal MAE regression ${totalGoalMaeDelta.toFixed(4)} > threshold ${BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION}.`
    );
  }

  // Check goal calibration
  if (best.avgPredictedHomeGoals !== null && best.avgPredictedHomeGoals > DECISION_MAX_XG_ALLOWED) {
    blockers.push(`Average predicted home xG ${best.avgPredictedHomeGoals.toFixed(3)} exceeds maximum ${DECISION_MAX_XG_ALLOWED}.`);
  }

  if (best.totalGoalMae !== null && best.totalGoalMae > DECISION_MAX_ACCEPTABLE_GOAL_MAE) {
    blockers.push(`Total goal MAE ${best.totalGoalMae.toFixed(4)} exceeds maximum ${DECISION_MAX_ACCEPTABLE_GOAL_MAE}.`);
  }

  if (blockers.length > 0) {
    reasons.push(`Candidate ${best.candidateId} blocked from promotion.`);
    const decision: AttackDefenseGoalModelDecision =
      backtestResult.profileCoverageSummary.fallbackRate > 0.3
        ? "insufficient_profile_coverage"
        : "goal_calibration_blocked";

    return {
      decision,
      selectedCandidateId: best.candidateId,
      baselineMetrics: baseline,
      bestCandidateMetrics: best,
      brierDelta,
      logLossDelta,
      totalGoalMaeDelta,
      reasons,
      blockers,
    };
  }

  // Diversity improvement check (diagnostic, not a blocker)
  if (best.uniqueXgPairCount > (baseline.uniqueXgPairCount ?? 0)) {
    reasons.push(
      `Candidate ${best.candidateId} improves xG diversity: ` +
      `${best.uniqueXgPairCount} unique pairs vs ${baseline.uniqueXgPairCount}.`
    );
  }

  if (brierDelta !== null && brierDelta < 0) {
    reasons.push(`Brier Score improves by ${(-brierDelta).toFixed(5)} vs baseline.`);
  }

  if (logLossDelta !== null && logLossDelta < 0) {
    reasons.push(`Log Loss improves by ${(-logLossDelta).toFixed(5)} vs baseline.`);
  }

  return {
    decision: "promote_candidate",
    selectedCandidateId: best.candidateId,
    baselineMetrics: baseline,
    bestCandidateMetrics: best,
    brierDelta,
    logLossDelta,
    totalGoalMaeDelta,
    reasons,
    blockers,
  };
}
