import {
  CURRENT_FORMULA_VERSION,
  CURRENT_MODEL_VERSION,
  LIVE_EVIDENCE_GATE_THRESHOLDS,
  WORLD_CUP_2026_PREDICTION_MODEL_VERSION
} from "@world-cup-2026-predictor/api";
import type {
  LiveEvidenceGateDecision,
  LiveEvidenceGateReport,
  PredictionConfidenceLevel,
  PredictionCoverageType
} from "@world-cup-2026-predictor/api";

// ---------------------------------------------------------------------------
// Evidence state
// ---------------------------------------------------------------------------

export type ModelEvidenceStateKind =
  | "no_persistence_configured"
  | "persistence_error"
  | "no_evidence"
  | "insufficient"
  | "data_quality_blocked"
  | "usable";

export interface ModelEvidenceState {
  kind: ModelEvidenceStateKind;
  label: string;
  description: string;
}

const EVIDENCE_STATE_MAP: Record<ModelEvidenceStateKind, ModelEvidenceState> = {
  no_persistence_configured: {
    kind: "no_persistence_configured",
    label: "In-memory only",
    description:
      "Prediction history is not configured with persistent storage. Evidence does not survive restarts."
  },
  persistence_error: {
    kind: "persistence_error",
    label: "Storage unavailable",
    description: "Prediction history persistence is configured but could not be accessed."
  },
  no_evidence: {
    kind: "no_evidence",
    label: "No evidence yet",
    description:
      "No stored pre-match snapshots or evaluations exist. Evidence accumulates as predictions are captured and matches complete."
  },
  insufficient: {
    kind: "insufficient",
    label: "Insufficient evidence",
    description: `Fewer than ${LIVE_EVIDENCE_GATE_THRESHOLDS.minUniqueEvaluatedFixtures} unique evaluated fixtures — the minimum required before any metric is considered meaningful.`
  },
  data_quality_blocked: {
    kind: "data_quality_blocked",
    label: "Data quality blocked",
    description: "Evidence exists but data quality issues prevent a reliable assessment."
  },
  usable: {
    kind: "usable",
    label: "Evidence available",
    description: "Sufficient evaluated fixtures exist for aggregate metrics."
  }
};

export function getEvidenceState(kind: ModelEvidenceStateKind): ModelEvidenceState {
  return EVIDENCE_STATE_MAP[kind];
}

export function deriveEvidenceStateKind(
  persistenceConfigured: boolean,
  persistenceError: boolean,
  snapshotCount: number,
  evaluationCount: number,
  gateDecision: LiveEvidenceGateDecision | null
): ModelEvidenceStateKind {
  if (persistenceError) return "persistence_error";
  if (!persistenceConfigured) return "no_persistence_configured";
  if (snapshotCount === 0) return "no_evidence";
  if (gateDecision === "insufficient_evidence") return "insufficient";
  if (gateDecision === "data_quality_blocked") return "data_quality_blocked";
  if (evaluationCount === 0) return "no_evidence";
  return "usable";
}

// ---------------------------------------------------------------------------
// Verdict presentation
// ---------------------------------------------------------------------------

export interface VerdictPresentation {
  decision: LiveEvidenceGateDecision;
  title: string;
  explanation: string;
  statusVariant: "neutral" | "info" | "warning" | "success" | "danger";
  nextAction: string;
  preserveModel: boolean;
}

const VERDICT_MAP: Record<LiveEvidenceGateDecision, VerdictPresentation> = {
  insufficient_evidence: {
    decision: "insufficient_evidence",
    title: "Insufficient evidence",
    explanation: `Fewer than ${LIVE_EVIDENCE_GATE_THRESHOLDS.minUniqueEvaluatedFixtures} unique evaluated fixtures. No model judgement is credible yet — evidence collection continues normally.`,
    statusVariant: "neutral",
    nextAction: "Continue capturing pre-match snapshots. Evidence will accumulate as group-stage matches complete.",
    preserveModel: true
  },
  data_quality_blocked: {
    decision: "data_quality_blocked",
    title: "Data quality blocked",
    explanation:
      "Evidence exists but data quality issues (high fallback coverage, low pre-match-locked proportion, or error rate) prevent a reliable verdict.",
    statusVariant: "warning",
    nextAction:
      "Review data quality findings. No model change should proceed until data quality meets threshold.",
    preserveModel: true
  },
  evidence_collection_continue: {
    decision: "evidence_collection_continue",
    title: "Evidence collection in progress",
    explanation: `Between ${LIVE_EVIDENCE_GATE_THRESHOLDS.minUniqueEvaluatedFixtures} and ${LIVE_EVIDENCE_GATE_THRESHOLDS.minForRecalibrationEvidence - 1} evaluated fixtures. Data is clean but sample is too small for reliable recalibration.`,
    statusVariant: "info",
    nextAction:
      "Continue evidence collection. No recalibration is warranted at this sample size.",
    preserveModel: true
  },
  presentation_change_only: {
    decision: "presentation_change_only",
    title: "Presentation change only",
    explanation:
      "1X2 outcome accuracy is acceptable but exact-score modal accuracy is low. The underlying probabilities appear sound; only the single scoreline presentation is weak.",
    statusVariant: "info",
    nextAction: "Consider updating how modal scorelines are presented to users. Model probabilities unchanged.",
    preserveModel: true
  },
  recalibrate_scoreline_selection: {
    decision: "recalibrate_scoreline_selection",
    title: "Scoreline selection review",
    explanation:
      "Exact-score coverage in the top-3/5 scorelines substantially exceeds top-1 coverage. The scoreline selection algorithm warrants review.",
    statusVariant: "warning",
    nextAction: "Review scoreline selection logic in a dedicated named phase. Core Elo-to-xG formula unchanged.",
    preserveModel: false
  },
  recalibrate_elo_to_xg: {
    decision: "recalibrate_elo_to_xg",
    title: "Elo-to-xG recalibration review",
    explanation:
      "Systematic xG compression and favorite under-separation detected. The Elo-to-xG conversion parameters may warrant recalibration.",
    statusVariant: "warning",
    nextAction:
      "Evaluate a new candidate using the existing V1/V2 workflow on a holdout dataset. Do not promote without evidence gate approval.",
    preserveModel: false
  },
  broader_model_review: {
    decision: "broader_model_review",
    title: "Broader model review",
    explanation:
      "Three or more independent evidence dimensions fail with a sufficient sample. A broader model review is warranted.",
    statusVariant: "danger",
    nextAction: "Open a dedicated model review phase. Document all failing dimensions before changing any parameter.",
    preserveModel: false
  }
};

export function getVerdictPresentation(decision: LiveEvidenceGateDecision): VerdictPresentation {
  return VERDICT_MAP[decision];
}

// ---------------------------------------------------------------------------
// Confidence level presentation
// ---------------------------------------------------------------------------

export interface ConfidenceLevelPresentation {
  level: PredictionConfidenceLevel;
  label: string;
  description: string;
  note: string;
}

const CONFIDENCE_LEVEL_MAP: Record<PredictionConfidenceLevel, ConfidenceLevelPresentation> = {
  high: {
    level: "high",
    label: "High",
    description: "Both teams have strong Elo coverage and supporting context metadata.",
    note: "High does not mean certain — it reflects input quality, not prediction accuracy."
  },
  medium: {
    level: "medium",
    label: "Medium",
    description: "Both teams have computed Elo ratings but the dataset is partial or optional context is missing.",
    note: "Normal classification for the current dataset."
  },
  low: {
    level: "low",
    label: "Low",
    description: "One team uses the fallback seed rating (1500) or has weaker direct match coverage.",
    note: "Manual xG review is recommended."
  },
  very_low: {
    level: "very_low",
    label: "Very low",
    description: "Both teams use fallback seed ratings or have very limited direct match coverage.",
    note: "Manual xG review is strongly recommended."
  }
};

export function getConfidenceLevelPresentation(level: PredictionConfidenceLevel): ConfidenceLevelPresentation {
  return CONFIDENCE_LEVEL_MAP[level];
}

// ---------------------------------------------------------------------------
// Coverage type presentation
// ---------------------------------------------------------------------------

export interface CoverageTypePresentation {
  type: PredictionCoverageType;
  label: string;
  description: string;
}

const COVERAGE_TYPE_MAP: Record<PredictionCoverageType, CoverageTypePresentation> = {
  full: {
    type: "full",
    label: "Full",
    description:
      "Both teams have computed Elo ratings, no fallback used, and attack/defense context is available. Not active with the current partial dataset."
  },
  partial: {
    type: "partial",
    label: "Partial",
    description:
      "Both teams have computed Elo ratings but the dataset is marked partial or optional metadata is absent. This is the normal classification in production."
  },
  fallback: {
    type: "fallback",
    label: "Fallback",
    description: "One team uses the fallback seed Elo rating of 1500."
  },
  fallback_only: {
    type: "fallback_only",
    label: "Fallback only",
    description: "Both teams use fallback seed Elo ratings. Prediction reflects baseline probabilities only."
  }
};

export function getCoverageTypePresentation(type: PredictionCoverageType): CoverageTypePresentation {
  return COVERAGE_TYPE_MAP[type];
}

// ---------------------------------------------------------------------------
// Metric formatting
// ---------------------------------------------------------------------------

export function formatEvidencePercent(value: number | null, defaultStr = "—"): string {
  if (value === null || !Number.isFinite(value)) return defaultStr;
  return `${(value * 100).toFixed(1)}%`;
}

export function formatEvidenceDecimal(
  value: number | null,
  places = 4,
  defaultStr = "—"
): string {
  if (value === null || !Number.isFinite(value)) return defaultStr;
  return value.toFixed(places);
}

export function formatEvidenceGoals(value: number | null, defaultStr = "—"): string {
  if (value === null || !Number.isFinite(value)) return defaultStr;
  return value.toFixed(2);
}

export function formatSampleSize(count: number): string {
  return `n=${count}`;
}

export function formatEvidenceCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Evidence threshold progress
// ---------------------------------------------------------------------------

export interface EvidenceProgressViewModel {
  current: number;
  threshold: number;
  percent: number;
  label: string;
  complete: boolean;
}

export function getEvidenceProgress(uniqueEvaluatedFixtures: number): EvidenceProgressViewModel {
  const threshold = LIVE_EVIDENCE_GATE_THRESHOLDS.minUniqueEvaluatedFixtures;
  const clamped = Math.min(uniqueEvaluatedFixtures, threshold);
  const percent = threshold > 0 ? Math.round((clamped / threshold) * 100) : 0;
  return {
    current: uniqueEvaluatedFixtures,
    threshold,
    percent: Math.min(percent, 100),
    label: `${uniqueEvaluatedFixtures} / ${threshold} unique evaluated fixtures (display threshold)`,
    complete: uniqueEvaluatedFixtures >= threshold
  };
}

export function getRecalibrationProgress(uniqueEvaluatedFixtures: number): EvidenceProgressViewModel {
  const threshold = LIVE_EVIDENCE_GATE_THRESHOLDS.minForRecalibrationEvidence;
  const clamped = Math.min(uniqueEvaluatedFixtures, threshold);
  const percent = threshold > 0 ? Math.round((clamped / threshold) * 100) : 0;
  return {
    current: uniqueEvaluatedFixtures,
    threshold,
    percent: Math.min(percent, 100),
    label: `${uniqueEvaluatedFixtures} / ${threshold} unique evaluated fixtures (recalibration review threshold)`,
    complete: uniqueEvaluatedFixtures >= threshold
  };
}

// ---------------------------------------------------------------------------
// Evidence count taxonomy
//
// The evidence system exposes several related-but-distinct counts. Without a
// shared vocabulary these read as inconsistent (e.g. "20 snapshots" next to
// "17 evaluated fixtures" next to "n=20 evaluated fixtures"). This view model
// gives every consumer (/model, Home, /prediction-history) one naming scheme:
//
// - storedSnapshotCount: total immutable prediction snapshots ever captured.
// - evaluationRecordCount: total snapshot-vs-result evaluation rows. One
//   fixture can have more than one evaluated snapshot (duplicates), so this
//   can exceed uniqueEvaluatedFixtureCount.
// - uniqueEvaluatedFixtureCount: distinct fixtures with a canonical evaluated
//   snapshot, per the evidence gate's one-per-fixture selection policy. This
//   is the number gate thresholds and decisions are measured against.
// - evidenceDisplayThreshold / recalibrationReviewThreshold: the two
//   unique-fixture thresholds from LIVE_EVIDENCE_GATE_THRESHOLDS.
// - pendingEvaluationCount: unique fixtures with a stored snapshot but no
//   evaluation yet (null when the gate report is unavailable).
// ---------------------------------------------------------------------------

export interface EvidenceCountTaxonomy {
  storedSnapshotCount: number;
  evaluationRecordCount: number;
  uniqueEvaluatedFixtureCount: number;
  pendingEvaluationCount: number | null;
  evidenceDisplayThreshold: number;
  recalibrationReviewThreshold: number;
}

export interface EvidenceCountTaxonomyInput {
  snapshotCount: number;
  evaluationCount: number;
  gateReport: LiveEvidenceGateReport | null;
}

export function getEvidenceCountTaxonomy(input: EvidenceCountTaxonomyInput): EvidenceCountTaxonomy {
  return {
    storedSnapshotCount: input.snapshotCount,
    evaluationRecordCount: input.evaluationCount,
    uniqueEvaluatedFixtureCount: input.gateReport?.evidenceCounts.uniqueEvaluatedFixtures ?? input.evaluationCount,
    pendingEvaluationCount: input.gateReport?.evidenceCounts.pendingSnapshots ?? null,
    evidenceDisplayThreshold: LIVE_EVIDENCE_GATE_THRESHOLDS.minUniqueEvaluatedFixtures,
    recalibrationReviewThreshold: LIVE_EVIDENCE_GATE_THRESHOLDS.minForRecalibrationEvidence
  };
}

// ---------------------------------------------------------------------------
// Production model configuration view-model
// (Values documented in docs/model-results/ELO_TO_XG_V2_PRODUCTION_INTEGRATION.md
//  and packages/model/src/elo-to-xg.ts. Do not duplicate inline in page components.)
// ---------------------------------------------------------------------------

export interface ProductionEloConfig {
  formulaVersion: string;
  adjustmentPer100: number;
  maxAdjustment: number;
  baseGoals: number;
  minGoals: number;
  maxGoals: number;
  v1AdjustmentPer100: number;
  v1MaxAdjustment: number;
  v1RollbackAvailable: true;
  preset: string;
}

export interface ProductionPoissonConfig {
  matrixMaxGoals: number;
  normalizeMatrix: boolean;
}

export interface ProductionModelConfigViewModel {
  modelVersion: string;
  formulaVersion: string;
  elo: ProductionEloConfig;
  poisson: ProductionPoissonConfig;
  tournamentFormEnabledByDefault: boolean;
  tournamentResultAdjustmentEnabledByDefault: boolean;
  manualXgModeAvailable: boolean;
}

export function getProductionModelConfig(): ProductionModelConfigViewModel {
  return {
    modelVersion: CURRENT_MODEL_VERSION,
    formulaVersion: CURRENT_FORMULA_VERSION,
    elo: {
      formulaVersion: CURRENT_FORMULA_VERSION,
      adjustmentPer100: 0.15,   // V2 balanced — ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100
      maxAdjustment: 0.65,       // V2 balanced — ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
      baseGoals: 1.25,            // ELO_TO_XG_BASE_GOALS
      minGoals: 0.2,              // ELO_TO_XG_MIN_GOALS
      maxGoals: 4.0,              // ELO_TO_XG_MAX_GOALS
      v1AdjustmentPer100: 0.10,  // ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100
      v1MaxAdjustment: 0.45,     // ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT
      v1RollbackAvailable: true,
      preset: "balanced"
    },
    poisson: {
      matrixMaxGoals: 7,          // DEFAULT_POISSON_CONFIG.maxGoals
      normalizeMatrix: true       // DEFAULT_POISSON_CONFIG.normalizeMatrix
    },
    tournamentFormEnabledByDefault: false,
    tournamentResultAdjustmentEnabledByDefault: false,
    manualXgModeAvailable: true
  };
}

// ---------------------------------------------------------------------------
// Model version label
// ---------------------------------------------------------------------------

export function getModelVersionLabel(): string {
  // WORLD_CUP_2026_PREDICTION_MODEL_VERSION = `wc2026-prediction-${LIVE_ELO_PIPELINE_VERSION}`
  return WORLD_CUP_2026_PREDICTION_MODEL_VERSION;
}
