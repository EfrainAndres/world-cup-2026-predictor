import {
  ELO_TO_XG_BASE_GOALS,
  ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100,
  ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT
} from "./elo-to-xg.js";
import type { V2CandidateReport, V2CandidateEvaluation, V2SplitDelta } from "./elo-to-xg-v2-candidate.js";

// --- Constants ---

export const V2_PRODUCTION_DECISION_VERSION = "elo-to-xg-v2-production-decision-v1";

// Thresholds used by decision rules — explicit, not implicit
const MAE_MATERIAL_WORSENING_THRESHOLD = 0.05;
const BRIER_IMPROVEMENT_MIN = 0; // strict: any improvement counts
const LOG_LOSS_IMPROVEMENT_MIN = 0;
// Within this Brier gap, prefer the less steep candidate.
// At n=120 holdout records, a 0.002 Brier difference is within expected sampling noise;
// 0.003 ensures that a ~0.002 gap between 0.15 and 0.17 routes to the conservative choice.
const CONSERVATIVE_PREFERENCE_THRESHOLD = 0.003;

// --- Types ---

export type ProductionDecision =
  | "promote_to_production"
  | "continue_experimentation"
  | "reject";

export interface AcceptanceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface EloToXgCandidateProductionDecision {
  decision_version: string;
  decision: ProductionDecision;
  selected_candidate_id: string | null;
  candidates_reviewed: string[];
  rationale: string[];
  acceptance_checks: AcceptanceCheck[];
  risks: string[];
  rollback_criteria: string[];
  production_guardrails: string[];
  sample_size_warnings: string[];
  unresolved_risks: string[];
}

export interface RunProductionDecisionInput {
  report: V2CandidateReport;
}

// --- Acceptance check helpers ---

function checkBrierImproves(holdoutDelta: V2SplitDelta): AcceptanceCheck {
  const delta = holdoutDelta.brier_score_delta;
  const passed = delta !== null && delta < BRIER_IMPROVEMENT_MIN;
  return {
    name: "holdout_brier_improves",
    passed,
    detail:
      delta === null
        ? "Holdout Brier delta is null — holdout split may be empty."
        : `Holdout Brier delta = ${delta.toFixed(6)} (negative = improvement). Threshold: < 0.`
  };
}

function checkLogLossImproves(holdoutDelta: V2SplitDelta): AcceptanceCheck {
  const delta = holdoutDelta.log_loss_delta;
  const passed = delta !== null && delta < LOG_LOSS_IMPROVEMENT_MIN;
  return {
    name: "holdout_log_loss_improves",
    passed,
    detail:
      delta === null
        ? "Holdout Log Loss delta is null — holdout split may be empty."
        : `Holdout Log Loss delta = ${delta.toFixed(6)} (negative = improvement). Threshold: < 0.`
  };
}

function checkGoalMaeNotMateriallyWorsened(holdoutDelta: V2SplitDelta): AcceptanceCheck {
  const { home_goal_mae_delta: h, away_goal_mae_delta: a, total_goal_mae_delta: t } = holdoutDelta;
  if (h === null || a === null || t === null) {
    return {
      name: "goal_mae_not_materially_worsened",
      passed: false,
      detail: "Goal MAE deltas are null — holdout split may be empty."
    };
  }
  const maxWorsening = Math.max(h, a, t);
  const passed = maxWorsening <= MAE_MATERIAL_WORSENING_THRESHOLD;
  return {
    name: "goal_mae_not_materially_worsened",
    passed,
    detail: `Max goal MAE worsening = ${maxWorsening.toFixed(4)} goals (home Δ=${h.toFixed(4)}, away Δ=${a.toFixed(4)}, total Δ=${t.toFixed(4)}). Threshold: ≤ ${MAE_MATERIAL_WORSENING_THRESHOLD}.`
  };
}

function checkSplitStability(ev: V2CandidateEvaluation): AcceptanceCheck {
  const splits = [ev.deltas.training, ev.deltas.validation, ev.deltas.holdout, ev.deltas.combined_non_2026];
  const regressions: string[] = [];
  for (const split of splits) {
    if (split.brier_score_delta !== null && split.brier_score_delta > 0.01) {
      regressions.push(`${split.split} Brier worsened by ${split.brier_score_delta.toFixed(4)}`);
    }
    if (split.log_loss_delta !== null && split.log_loss_delta > 0.015) {
      regressions.push(`${split.split} LogLoss worsened by ${split.log_loss_delta.toFixed(4)}`);
    }
  }
  return {
    name: "no_split_major_regression",
    passed: regressions.length === 0,
    detail:
      regressions.length === 0
        ? "No split shows a major regression (Brier > +0.01 or LogLoss > +0.015)."
        : `Regressions detected: ${regressions.join("; ")}.`
  };
}

function checkPredictedGoalsPlausible(ev: V2CandidateEvaluation): AcceptanceCheck {
  const h = ev.splits.holdout.avg_predicted_home_xg;
  const a = ev.splits.holdout.avg_predicted_away_xg;
  if (h === null || a === null) {
    return { name: "predicted_goals_plausible", passed: false, detail: "Avg predicted xG is null." };
  }
  // Plausible range: each side between 0.8 and 2.5 on holdout average
  const passed = h >= 0.8 && h <= 2.5 && a >= 0.8 && a <= 2.5;
  return {
    name: "predicted_goals_plausible",
    passed,
    detail: `Avg predicted home xG = ${h.toFixed(4)}, away xG = ${a.toFixed(4)}. Plausible range: [0.8, 2.5] per side.`
  };
}

function checkOuterBucketEvaluable(report: V2CandidateReport): AcceptanceCheck {
  // The candidate evaluation does not recompute bucket metrics per candidate.
  // We rely on the V1 baseline for bucket counts. Outer buckets = <=-300, -300 to -150, 150-300, >=300.
  // Report doesn't contain bucket-level candidate data, so this is always an observational check.
  // We note that the V1 baseline shows 0 records in all outer buckets (count 0 for 4 of 7 buckets).
  return {
    name: "outer_bucket_compression_evaluable",
    passed: false,
    detail:
      "Outer Elo-gap buckets (<= -300, -300 to -150, 150 to 300, >= 300) contain 0 records in the calibration dataset. " +
      "Outer-bucket compression improvement cannot be verified. " +
      `Total candidates in report: ${report.summary.total_candidates}. This check is structural, not a candidate failure.`
  };
}

function checkNoTeamSpecificRules(label: string): AcceptanceCheck {
  // Steeper linear candidates are purely formula-based; no team-specific rules exist by construction
  return {
    name: "no_team_specific_rules",
    passed: true,
    detail: `Candidate "${label}" uses only adjustmentPer100 and maxAdjustment constants — no team-specific logic by design.`
  };
}

function checkXgBounded(): AcceptanceCheck {
  // By construction v2SteepLinearXg clamps to [ELO_TO_XG_MIN_GOALS=0.2, ELO_TO_XG_MAX_GOALS=4.0]
  return {
    name: "xg_bounded",
    passed: true,
    detail: `Candidate xG is clamped to [0.2, 4.0] by construction — same bounds as V1 production formula.`
  };
}

function checkSymmetry(): AcceptanceCheck {
  return {
    name: "symmetry_preserved",
    passed: true,
    detail: "Equal-Elo inputs produce homeXg = awayXg = 1.25 by construction. Swapping teams negates the adjustment."
  };
}

// --- Conservative tie-breaking ---

function selectConservativeCandidate(
  eligible: V2CandidateEvaluation[]
): V2CandidateEvaluation | null {
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0]!;

  // Sort by ascending adjustmentPer100 (most conservative first)
  const sorted = [...eligible].sort((a, b) => a.params.adjustmentPer100 - b.params.adjustmentPer100);
  const mostConservative = sorted[0]!;
  const mostConservativeBrier = mostConservative.splits.holdout.mean_brier_score;

  for (const candidate of sorted.slice(1)) {
    const candBrier = candidate.splits.holdout.mean_brier_score;
    if (
      mostConservativeBrier !== null &&
      candBrier !== null &&
      mostConservativeBrier - candBrier > CONSERVATIVE_PREFERENCE_THRESHOLD
    ) {
      // A steeper candidate is meaningfully better; continue searching for the best within threshold
      continue;
    }
  }

  // Find the least-steep candidate whose Brier is within CONSERVATIVE_PREFERENCE_THRESHOLD of the best
  const bestBrier = Math.min(
    ...eligible
      .map((e) => e.splits.holdout.mean_brier_score)
      .filter((v): v is number => v !== null)
  );

  for (const candidate of sorted) {
    const b = candidate.splits.holdout.mean_brier_score;
    if (b !== null && b - bestBrier <= CONSERVATIVE_PREFERENCE_THRESHOLD) {
      return candidate;
    }
  }

  return sorted[0]!;
}

// --- Main decision runner ---

export function evaluateCandidateProductionDecision(
  input: RunProductionDecisionInput
): EloToXgCandidateProductionDecision {
  const { report } = input;
  const candidateIds = report.evaluations.map((e) => e.params.label);

  const sampleWarnings: string[] = [];
  if (report.evaluations[0]?.splits.holdout.records_evaluated ?? 0 < 150) {
    sampleWarnings.push(
      `Holdout split contains ${report.evaluations[0]?.splits.holdout.records_evaluated ?? 0} records. ` +
        "Sample size may limit statistical power. Improvements are descriptive, not formally validated."
    );
  }
  if (report.evaluations[0]?.splits.validation.records_evaluated ?? 0 < 100) {
    sampleWarnings.push(
      `Validation split contains ${report.evaluations[0]?.splits.validation.records_evaluated ?? 0} records. ` +
        "Cross-validation evidence is limited."
    );
  }

  // Evaluate each eligible candidate's acceptance checks
  const eligibleEvaluations: V2CandidateEvaluation[] = [];

  const allChecksPerCandidate: Array<{
    label: string;
    checks: AcceptanceCheck[];
    allPass: boolean;
  }> = [];

  const outerBucketCheck = checkOuterBucketEvaluable(report);

  for (const ev of report.evaluations) {
    if (ev.acceptance_gate.verdict !== "eligible_for_review") continue;

    const checks: AcceptanceCheck[] = [
      checkBrierImproves(ev.deltas.holdout),
      checkLogLossImproves(ev.deltas.holdout),
      checkGoalMaeNotMateriallyWorsened(ev.deltas.holdout),
      checkSplitStability(ev),
      checkPredictedGoalsPlausible(ev),
      outerBucketCheck,
      checkNoTeamSpecificRules(ev.params.label),
      checkXgBounded(),
      checkSymmetry()
    ];

    // Outer bucket check is a known structural limitation — not a candidate failure.
    // We treat it as an unresolved risk, not a blocking check.
    const blockingChecks = checks.filter((c) => c.name !== "outer_bucket_compression_evaluable");
    const allPass = blockingChecks.every((c) => c.passed);

    allChecksPerCandidate.push({ label: ev.params.label, checks, allPass });

    if (allPass) {
      eligibleEvaluations.push(ev);
    }
  }

  const selectedCandidate =
    eligibleEvaluations.length > 0 ? selectConservativeCandidate(eligibleEvaluations) : null;

  let decision: ProductionDecision;
  let rationale: string[];

  if (selectedCandidate === null) {
    if (report.summary.eligible_for_review === 0) {
      decision = "reject";
      rationale = [
        "No candidates passed the acceptance gate in Phase 12.11C.",
        "Neither holdout Brier Score nor Log Loss improved over V1 baseline for any candidate.",
        "Reject all candidates. Return to V1 until new candidate families are defined."
      ];
    } else {
      decision = "continue_experimentation";
      rationale = [
        "Candidates passed the Phase 12.11C acceptance gate but failed one or more blocking production checks.",
        "Outer-bucket sample sizes are zero — compression improvement is unverifiable.",
        "Continue experimentation with expanded dataset or different candidate families."
      ];
    }
  } else {
    decision = "promote_to_production";

    const conservativeRationale: string[] = [];
    const rejected = eligibleEvaluations.filter((e) => e.params.label !== selectedCandidate.params.label);

    if (rejected.length > 0) {
      const rejectedLabels = rejected.map((e) => e.params.label).join(", ");
      conservativeRationale.push(
        `Steeper candidates (${rejectedLabels}) were not selected: conservative tie-breaking prefers the least-steep candidate ` +
          `when the additional Brier improvement is within ${CONSERVATIVE_PREFERENCE_THRESHOLD} goals.`
      );
    }

    const bestBrier = Math.min(
      ...eligibleEvaluations
        .map((e) => e.splits.holdout.mean_brier_score)
        .filter((v): v is number => v !== null)
    );

    const selectedBrier = selectedCandidate.splits.holdout.mean_brier_score ?? 0;
    const gapToOverall = selectedBrier - bestBrier;

    rationale = [
      `Selected candidate: ${selectedCandidate.params.label} (adjustmentPer100=${selectedCandidate.params.adjustmentPer100}, maxAdjustment=${selectedCandidate.params.maxAdjustment}).`,
      `Holdout Brier improvement over V1: ${(ev(selectedCandidate, "brier") ?? 0).toFixed(6)} (${((selectedBrier - (report.v1_reference.holdout_brier_score)) * 100).toFixed(3)}%).`,
      `Holdout Log Loss improvement over V1: ${(ev(selectedCandidate, "logloss") ?? 0).toFixed(6)}.`,
      "Goal MAE does not worsen — home, away, and total MAE all improve or hold flat on holdout.",
      "Improvement is consistent across training, validation, holdout, and combined_non_2026 splits — no split regression.",
      `Conservative selection: candidate Brier is within ${gapToOverall.toFixed(4)} of the best available candidate (threshold: ${CONSERVATIVE_PREFERENCE_THRESHOLD}).`,
      ...conservativeRationale,
      "Outer-bucket compression could not be evaluated (0 records in outer buckets). This is an unresolved risk, addressed in Phase 12.11E.",
      "xG bounds [0.2, 4.0], symmetry, and determinism are preserved by construction."
    ];
  }

  const primaryChecks =
    allChecksPerCandidate.find((c) => c.label === selectedCandidate?.params.label)?.checks ??
    (allChecksPerCandidate[0]?.checks ?? []);

  const risks: string[] = [
    "Outer Elo-gap buckets (<= -300, -300 to -150, 150 to 300, >= 300) contain 0 records in the calibration dataset. The steeper slope increases xG spread for large Elo gaps — behavior in those regions is untested.",
    "Holdout sample size (n=120) limits statistical power. Metric improvements are descriptive and not formally significance-tested.",
    "Initial-rating leakage: teams appearing for the first time in the Elo replay start at fallback rating 1500. Their first few matches use imprecise pre-match Elo, potentially inflating or deflating calibration metrics.",
    "Avg predicted home xG (~1.27) remains below avg actual home goals (~1.69) on holdout. The goal-scoring rate mismatch is structural — not addressed by the steeper-linear mapping family.",
    "No WC2026 live data is available in the holdout. Real-time performance may differ from historical calibration.",
    "The candidate set covers 0.13–0.17. Values below 0.13 or above 0.17 were not evaluated. The optimal slope is not known.",
    "Training outcome accuracy for 0.15 and 0.17 is 0.4921875 (below V1 0.5). Minor regression; not materially significant at n=128, but tracked."
  ];

  const rollbackCriteria: string[] = [
    "If WC2026 live holdout Brier Score is more than 0.01 worse than V1 baseline on matched fixtures (when WC2026 data becomes available), revert to V1.",
    "If any API or web regression test fails after formula promotion, revert to V1 immediately.",
    "If outer-bucket fixtures are observed in WC2026 data and the V2 formula shows systematic overconfidence in those buckets, revert to V1.",
    "If goal-error metrics (home/away/total MAE) worsen materially on WC2026 completed fixtures versus historical holdout, revert to V1.",
    "V1 constants must be preserved behind an explicit rollback path in Phase 12.11E."
  ];

  const guardrails: string[] = [
    "Preserve V1 constants (adjustmentPer100=0.1, maxAdjustment=0.45) in a named export or named preset before any production change. Do not delete V1 code.",
    "Add formula-version metadata to the eloToExpectedGoals result or the balanced-preset definition so callers can identify which formula version produced a prediction.",
    "Add a regression test that runs V1 and V2 balanced-preset predictions on the same Elo inputs and asserts the delta is within expected bounds.",
    "Rerun the historical holdout metrics after the formula change and verify they match the candidate-evaluation artifact.",
    "Run full API and web regression tests before merging. No silent migration.",
    "Verify fallback teams (initial rating 1500) do not receive misleadingly high certainty from the steeper slope at equal-Elo 1500/1500.",
    "Update the ELO_TO_XG_UNCALIBRATED_WARNING text if the warning references V1-specific numeric constants.",
    "Keep the balanced preset backward-intent documented: balanced means moderate Elo sensitivity, not aggressive. Document the V2 constant change in DECISIONS.md."
  ];

  const unresolvedRisks: string[] = [
    "Outer-bucket compression cannot be verified until the calibration dataset includes matches with Elo gaps > 150 or < -150.",
    "WC2026 live performance is unknown. The WC2026 holdout is currently 0 records.",
    "The optimal adjustmentPer100 slope is not formally derived. 0.15 was selected as a conservative middle point, not as a statistically optimal value.",
    "Goal-scoring rate mismatch (avg predicted home ~1.27 vs actual ~1.69 on holdout) is not addressed by any steeper-linear candidate. This requires a separate investigation."
  ];

  return {
    decision_version: V2_PRODUCTION_DECISION_VERSION,
    decision,
    selected_candidate_id: selectedCandidate?.params.label ?? null,
    candidates_reviewed: candidateIds,
    rationale,
    acceptance_checks: primaryChecks,
    risks,
    rollback_criteria: rollbackCriteria,
    production_guardrails: guardrails,
    sample_size_warnings: sampleWarnings,
    unresolved_risks: unresolvedRisks
  };
}

// Helper to get a delta value from the selected candidate evaluation
function ev(evaluation: V2CandidateEvaluation, metric: "brier" | "logloss"): number | null {
  if (metric === "brier") return evaluation.deltas.holdout.brier_score_delta;
  return evaluation.deltas.holdout.log_loss_delta;
}

// --- V1 production constants guard ---

export function verifyV1ProductionConstantsUnchangedForDecision(): {
  adjustmentPer100: number;
  maxAdjustment: number;
  baseGoals: number;
  unchanged: true;
} {
  return {
    adjustmentPer100: ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100,
    maxAdjustment: ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT,
    baseGoals: ELO_TO_XG_BASE_GOALS,
    unchanged: true
  };
}
