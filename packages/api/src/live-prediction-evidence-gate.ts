// ---------------------------------------------------------------------------
// Phase 12.18C1 — Live Prediction Evidence & Recalibration Gate
// Pure, deterministic, read-only service.
//
// Loads persisted World Cup 2026 prediction snapshots and completed
// Model-vs-Reality evaluations and derives a conservative gate decision
// about whether production prediction behaviour should remain unchanged,
// wait for more evidence, or proceed to a scoped recalibration phase.
//
// No I/O, no Date.now(), no Math.random(): generatedAt is injected for
// deterministic output. All rates/means return null (never NaN) when they
// cannot be computed. No snapshot or evaluation is ever mutated.
// ---------------------------------------------------------------------------

import { selectTopPredictedScoreline } from "./prediction-evaluation-service.js";
import type { PredictionHistoryPersistenceMetadata } from "./persistence-runtime.js";
import type {
  PredictionConfidenceLevel,
  PredictionCoverageType,
  PredictionOutcome,
  PredictionSnapshotStatus,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot,
  WorldCup2026PredictionSnapshotScoreline
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Named thresholds — all documented; none hidden in prose.
// ---------------------------------------------------------------------------

export const LIVE_EVIDENCE_GATE_THRESHOLDS = {
  /** Minimum unique evaluated fixtures before any metric is considered evidence. */
  minUniqueEvaluatedFixtures: 8,
  /** Minimum unique evaluated fixtures required before any recalibration verdict. */
  minForRecalibrationEvidence: 20,
  /** Minimum unique fixtures for broader_model_review verdict. */
  minForBroaderModelReview: 25,
  /** Maximum data-quality error proportion before blocking the gate. */
  maxDataQualityErrorProportion: 0.3,
  /** Minimum proportion of pre_match_locked snapshots to avoid a data quality warning. */
  minPreMatchLockedProportion: 0.5,
  /** Maximum proportion of fallback-covered snapshots before a data quality concern. */
  maxFallbackCoverageProportion: 0.5,
  /** Minimum distinct groups and matchdays for representation to be considered adequate. */
  minDistinctGroupsForRepresentation: 3,
  /** Minimum sample for draw bias analysis to be reported as meaningful. */
  minDrawBiasSampleSize: 5,
  /** 1-1 modal rate above this proportion is flagged as concentrated. */
  oneOneConcentrationThreshold: 0.4,
  /** Top-scoreline concentration ratio (count / total) above this is flagged. */
  scorelineConcentrationRatioThreshold: 0.5,
  /** Top-two scorelines' combined concentration above this is flagged. */
  topTwoScorelinesDominanceThreshold: 0.7,
  /** Minimum unique modal scorelines considered adequate exact-score diversity. */
  exactScoreDiversityMinimum: 3,
  /** Proportion of fixtures with modal draw scoreline above this is flagged. */
  modalDrawProportionThreshold: 0.4,
  /** Mean predicted draw probability exceeds actual draw rate by this amount. */
  drawOverpredictionDelta: 0.05,
  /** Draw false-positive rate above this is flagged. */
  drawFalsePositiveRateThreshold: 0.5,
  /** Minimum favorite probability to classify as "weak" (not no_clear_favorite). */
  favoriteWeakMinProbability: 0.40,
  /** Minimum favorite probability to classify as "moderate". */
  favoriteModerateMinProbability: 0.55,
  /** Minimum favorite probability to classify as "strong". */
  favoriteStrongMinProbability: 0.70,
  /** |xG difference| below this threshold counts as compressed. */
  xgCompressionDifference: 0.25,
  /** Share of fixtures with compressed xG that triggers a flag. */
  xgCompressionShare: 0.5,
  /** xG advantage below this for a strong-probability favorite is under-separated. */
  strongFavoriteMinXgAdvantage: 0.4,
  /** Predicted goal difference within this of zero is considered "near zero". */
  nearZeroGoalDiffThreshold: 0.3,
  /** Minimum sample per segment for segment comparison to be reliable. */
  minSampleForSegmentComparison: 3,
  /** Maximum examples per worked-example list. */
  maxExamples: 5,
  /** Actual goal difference >= this defines a "high-margin" result. */
  highMarginGoalDifference: 3
} as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LiveEvidenceGateDecision =
  | "insufficient_evidence"
  | "data_quality_blocked"
  | "evidence_collection_continue"
  | "presentation_change_only"
  | "recalibrate_scoreline_selection"
  | "recalibrate_elo_to_xg"
  | "broader_model_review";

export type LiveEvidenceFavoriteStrength =
  | "no_clear_favorite"
  | "weak"
  | "moderate"
  | "strong";

export type LiveEvidenceSelectionExclusionReason =
  | "not_primary_selection"
  | "malformed_data"
  | "post_kickoff"
  | "no_valid_candidate";

export interface LiveEvidenceGateInput {
  /** Injected ISO timestamp for deterministic output. */
  generatedAt: string;
  persistenceMetadata: PredictionHistoryPersistenceMetadata;
  snapshots: readonly WorldCup2026PredictionSnapshot[];
  evaluations: readonly WorldCup2026PredictionEvaluation[];
}

export interface LiveEvidenceCounts {
  totalSnapshots: number;
  evaluatedSnapshots: number;
  pendingSnapshots: number;
  uniqueFixtures: number;
  uniqueEvaluatedFixtures: number;
  fixturesWithMultipleSnapshots: number;
  totalExcludedFromPrimary: number;
}

export interface LiveEvidenceExcludedSnapshot {
  snapshotId: string;
  fixtureId: string;
  reason: LiveEvidenceSelectionExclusionReason;
}

export interface LiveEvidenceSelectionSummary {
  policy: "one_per_fixture_prefer_pre_match_locked_latest_pre_kickoff";
  primaryCandidatesConsidered: number;
  preMatchLockedSelected: number;
  foundationUnverifiedSelected: number;
  excludedFromPrimary: LiveEvidenceExcludedSnapshot[];
  allSnapshotsConsidered: number;
  allSnapshotsValid: number;
}

export interface LiveEvidenceCoreMetrics {
  outcomeAccuracy: number | null;
  exactScorelineAccuracy: number | null;
  averageBrierScore: number | null;
  averageLogLoss: number | null;
  averageHomeGoalError: number | null;
  averageAwayGoalError: number | null;
  averageTotalGoalError: number | null;
  averageGoalDifferenceError: number | null;
  averagePredictedGoals: number | null;
  averageActualGoals: number | null;
  averagePredictedGoalDifference: number | null;
  averageActualGoalDifference: number | null;
}

export interface LiveEvidenceScorelineEntry {
  scoreline: string;
  primaryModalCount: number;
  primaryModalRate: number | null;
  allSnapshotsModalCount: number;
  allSnapshotsModalRate: number | null;
}

export interface LiveEvidenceScorelineConcentration {
  /** Modal scoreline across primary selections. */
  modalScoreline: string | null;
  modalScorelineCount: number;
  modalScorelineRate: number | null;
  topTwoScorelinesRate: number | null;
  oneOneRate: number | null;
  zeroZeroRate: number | null;
  oneZeroRate: number | null;
  zeroOneRate: number | null;
  concentrationRatio: number | null;
  uniqueModalScorelines: number;
  exactScoreDiversity: number;
  modalDrawProportion: number | null;
  topScorelineEntries: LiveEvidenceScorelineEntry[];
  allSnapshotsModalScoreline: string | null;
  allSnapshotsOneOneRate: number | null;
  allSnapshotsConcentrationRatio: number | null;
  compressedModalSelectionFlag: boolean;
}

export interface LiveEvidenceDrawCalibrationBucket {
  bucket: string;
  predictions: number;
  meanPredictedDrawProbability: number | null;
  observedDrawRate: number | null;
  calibrationGap: number | null;
}

export interface LiveEvidenceDrawCalibration {
  averagePredictedDrawProbability: number | null;
  actualDrawRate: number | null;
  predictedDrawCalibrationGap: number | null;
  predictedDrawAsModalOutcomeCount: number;
  predictedDrawAsModalOutcomeRate: number | null;
  actualDrawHitRate: number | null;
  drawFalsePositiveRate: number | null;
  drawFalseNegativeRate: number | null;
  sampleBelowMinimum: boolean;
  calibrationBuckets: LiveEvidenceDrawCalibrationBucket[];
}

export interface LiveEvidenceFavoriteBucket {
  strength: LiveEvidenceFavoriteStrength;
  count: number;
  averageFavoriteProbability: number | null;
  averageProbabilityMargin: number | null;
  actualFavoriteWinRate: number | null;
  averageActualGoalMarginForFavorite: number | null;
  averagePredictedXgDifferenceForFavorite: number | null;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
}

export interface LiveEvidenceFavoriteSeparation {
  fixturesWithClearFavorite: number;
  buckets: LiveEvidenceFavoriteBucket[];
  favoriteStrengthCounts: Record<LiveEvidenceFavoriteStrength, number>;
  underSeparationFlag: boolean;
}

export interface LiveEvidenceXgStrengthBucket {
  bucket: string;
  matchCount: number;
  averageAbsoluteXgDifference: number | null;
}

export interface LiveEvidenceXgCompression {
  averageHomeXg: number | null;
  averageAwayXg: number | null;
  averagePredictedTotalXg: number | null;
  averageAbsoluteXgDifference: number | null;
  medianAbsoluteXgDifference: number | null;
  shareBelow010: number | null;
  shareBelow025: number | null;
  shareBelow050: number | null;
  percentagePredictedGdNearZero: number | null;
  strongFavoriteLowXgCount: number;
  highMarginActualLowPredictedXgCount: number;
  xgDifferenceByStrengthBucket: LiveEvidenceXgStrengthBucket[];
  xgCompressionFlag: boolean;
}

export interface LiveEvidenceSegment {
  dimension: "confidence_level" | "coverage_type" | "fallback_used" | "snapshot_status";
  value: string;
  count: number;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
  averageBrierScore: number | null;
  averageLogLoss: number | null;
  averageGoalMae: number | null;
  reliable: boolean;
}

export interface LiveEvidenceDataQualityAssessment {
  uniqueEvaluatedFixtures: number;
  proportionPreMatchLocked: number | null;
  proportionFallbackCoverage: number | null;
  unresolvedFixtures: number;
  invalidResults: number;
  duplicateLogicalEvaluations: number;
  missingProbabilityOrMetricFields: number;
  providerFallbackUsageCount: number;
  distinctGroupsRepresented: number;
  distinctMatchdaysRepresented: number;
  readinessVote:
    | "insufficient_evidence"
    | "data_quality_blocked"
    | "evidence_collection_continue"
    | "clean_and_sufficient";
  issues: string[];
}

export interface LiveEvidenceFinding {
  code: string;
  severity: "info" | "warning" | "critical";
  summary: string;
}

export interface LiveEvidenceGateReport {
  generatedAt: string;
  persistenceMetadata: {
    provider: string;
    persistent: boolean;
    configuredProvider: string;
  };
  evidenceCounts: LiveEvidenceCounts;
  selectionPolicySummary: LiveEvidenceSelectionSummary;
  coreMetrics: LiveEvidenceCoreMetrics;
  scorelineConcentration: LiveEvidenceScorelineConcentration;
  drawCalibration: LiveEvidenceDrawCalibration;
  favoriteSeparation: LiveEvidenceFavoriteSeparation;
  xgCompression: LiveEvidenceXgCompression;
  confidenceCoverageSegmentation: LiveEvidenceSegment[];
  dataQualityAssessment: LiveEvidenceDataQualityAssessment;
  findings: LiveEvidenceFinding[];
  decision: LiveEvidenceGateDecision;
  decisionReasons: string[];
  blockedReasons: string[];
  nextRecommendedPhase: string;
}

// ---------------------------------------------------------------------------
// Private numeric helpers — no NaN/Infinity escapes.
// ---------------------------------------------------------------------------

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeRate(count: number, total: number): number | null {
  if (total <= 0) return null;
  return round6(count / total);
}

function safeMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return round6(sum / values.length);
}

function safeMedian(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return round6(sorted[mid]!);
  return round6((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function scorelineKey(home: number, away: number): string {
  return `${home}-${away}`;
}

function isDraw(home: number, away: number): boolean {
  return home === away;
}

// ---------------------------------------------------------------------------
// Snapshot validation helpers
// ---------------------------------------------------------------------------

function snapshotProbabilitiesValid(snapshot: WorldCup2026PredictionSnapshot): boolean {
  const p = snapshot.prediction;
  if (
    !isFiniteNumber(p.homeWinProbability) ||
    !isFiniteNumber(p.drawProbability) ||
    !isFiniteNumber(p.awayWinProbability) ||
    !isFiniteNumber(p.homeExpectedGoals) ||
    !isFiniteNumber(p.awayExpectedGoals)
  )
    return false;
  const sum = p.homeWinProbability + p.drawProbability + p.awayWinProbability;
  if (!isFiniteNumber(sum) || Math.abs(sum - 1) > 0.02) return false;
  if (!Array.isArray(p.mostLikelyScorelines) || p.mostLikelyScorelines.length === 0) return false;
  for (const s of p.mostLikelyScorelines) {
    if (!isFiniteNumber(s.homeGoals) || !isFiniteNumber(s.awayGoals) || !isFiniteNumber(s.probability))
      return false;
  }
  return true;
}

function snapshotIsPreMatch(snapshot: WorldCup2026PredictionSnapshot): boolean {
  if (snapshot.kickoffAt === undefined) return true;
  const captured = Date.parse(snapshot.capturedAt);
  const kickoff = Date.parse(snapshot.kickoffAt);
  if (!Number.isFinite(captured) || !Number.isFinite(kickoff)) return true;
  return captured < kickoff;
}

function statusPriority(status: PredictionSnapshotStatus): number {
  // Lower value = higher priority.
  return status === "pre_match_locked" ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Selection policy — one canonical snapshot per fixture.
// Policy: prefer pre_match_locked over foundation_unverified,
//         then latest capturedAt, then snapshotId descending.
// ---------------------------------------------------------------------------

interface FixtureSelectionResult {
  selected: WorldCup2026PredictionSnapshot | null;
  excluded: LiveEvidenceExcludedSnapshot[];
  fixtureId: string;
}

function selectFixtureSnapshot(
  fixtureId: string,
  candidates: readonly WorldCup2026PredictionSnapshot[]
): FixtureSelectionResult {
  const valid = candidates.filter(snapshotProbabilitiesValid);
  const preMatch = valid.filter(snapshotIsPreMatch);

  if (preMatch.length === 0) {
    return {
      selected: null,
      fixtureId,
      excluded: candidates.map((s) => ({
        snapshotId: s.snapshotId,
        fixtureId,
        reason: (valid.some((vs) => vs.snapshotId === s.snapshotId)
          ? "post_kickoff"
          : "malformed_data") as LiveEvidenceSelectionExclusionReason
      }))
    };
  }

  const sorted = [...preMatch].sort((a, b) => {
    const sd = statusPriority(a.status) - statusPriority(b.status);
    if (sd !== 0) return sd;
    const ca = Date.parse(a.capturedAt);
    const cb = Date.parse(b.capturedAt);
    if (Number.isFinite(ca) && Number.isFinite(cb) && ca !== cb) return cb - ca;
    if (a.capturedAt !== b.capturedAt) return a.capturedAt < b.capturedAt ? 1 : -1;
    return a.snapshotId < b.snapshotId ? 1 : a.snapshotId > b.snapshotId ? -1 : 0;
  });

  const selected = sorted[0]!;
  const excluded: LiveEvidenceExcludedSnapshot[] = candidates
    .filter((s) => s.snapshotId !== selected.snapshotId)
    .map((s) => ({
      snapshotId: s.snapshotId,
      fixtureId,
      reason: (preMatch.some((ps) => ps.snapshotId === s.snapshotId)
        ? "not_primary_selection"
        : valid.some((vs) => vs.snapshotId === s.snapshotId)
        ? "post_kickoff"
        : "malformed_data") as LiveEvidenceSelectionExclusionReason
    }));

  return { selected, excluded, fixtureId };
}

// ---------------------------------------------------------------------------
// Internal per-fixture record
// ---------------------------------------------------------------------------

interface InternalRecord {
  fixtureId: string;
  group: string | null;
  matchday: number | null;
  homeTeam: string;
  awayTeam: string;
  snapshotId: string;
  snapshotStatus: PredictionSnapshotStatus;
  capturedAt: string;
  kickoffAt: string | null;
  homeElo: number | null;
  awayElo: number | null;
  confidenceLevel: PredictionConfidenceLevel;
  coverageType: PredictionCoverageType;
  fallbackUsed: boolean;
  expectedGoals: { home: number; away: number };
  outcomeProbabilities: { homeWin: number; draw: number; awayWin: number };
  modalScoreline: { home: number; away: number; probability: number };
  topScorelines: Array<{ home: number; away: number; probability: number }>;
  // Evaluated fields — null when no evaluation for this snapshot.
  hasEvaluation: boolean;
  actualScore: { home: number; away: number } | null;
  actualOutcome: PredictionOutcome | null;
  predictedOutcome: PredictionOutcome | null;
  outcomeCorrect: boolean | null;
  exactScoreCorrect: boolean | null;
  brierScore: number | null;
  logLoss: number | null;
  homeGoalError: number | null;
  awayGoalError: number | null;
  totalGoalError: number | null;
  goalDifferenceError: number | null;
}

function sortedScorelines(
  scorelines: readonly WorldCup2026PredictionSnapshotScoreline[]
): WorldCup2026PredictionSnapshotScoreline[] {
  return [...scorelines].sort(
    (a, b) =>
      b.probability - a.probability ||
      a.homeGoals + a.awayGoals - (b.homeGoals + b.awayGoals) ||
      a.homeGoals - b.homeGoals ||
      a.awayGoals - b.awayGoals
  );
}

function buildRecord(
  snapshot: WorldCup2026PredictionSnapshot,
  evaluation: WorldCup2026PredictionEvaluation | undefined
): InternalRecord {
  const prediction = snapshot.prediction;
  const topSorted = sortedScorelines(prediction.mostLikelyScorelines);
  const modal = selectTopPredictedScoreline(prediction.mostLikelyScorelines) ?? topSorted[0]!;

  const homeElo = isFiniteNumber(snapshot.inputs.homeElo) ? snapshot.inputs.homeElo : null;
  const awayElo = isFiniteNumber(snapshot.inputs.awayElo) ? snapshot.inputs.awayElo : null;

  const outcomeProbabilities = {
    homeWin: prediction.homeWinProbability,
    draw: prediction.drawProbability,
    awayWin: prediction.awayWinProbability
  };

  const hasEvaluation = evaluation !== undefined;

  let actualScore: { home: number; away: number } | null = null;
  let actualOutcome: PredictionOutcome | null = null;
  let predictedOutcome: PredictionOutcome | null = null;
  let outcomeCorrect: boolean | null = null;
  let exactScoreCorrect: boolean | null = null;
  let brierScore: number | null = null;
  let logLoss: number | null = null;
  let homeGoalError: number | null = null;
  let awayGoalError: number | null = null;
  let totalGoalError: number | null = null;
  let goalDifferenceError: number | null = null;

  if (hasEvaluation) {
    actualScore = { home: evaluation!.actual.homeGoals, away: evaluation!.actual.awayGoals };
    actualOutcome = evaluation!.actual.outcome;
    predictedOutcome = evaluation!.predicted.predictedOutcome;
    outcomeCorrect = evaluation!.metrics.outcomeCorrect;
    exactScoreCorrect = evaluation!.metrics.exactScoreCorrect;
    brierScore = evaluation!.metrics.brierScore;
    logLoss = evaluation!.metrics.logLoss;
    homeGoalError = evaluation!.metrics.homeGoalAbsoluteError;
    awayGoalError = evaluation!.metrics.awayGoalAbsoluteError;
    totalGoalError = evaluation!.metrics.totalGoalAbsoluteError;
    goalDifferenceError = evaluation!.metrics.goalDifferenceAbsoluteError;
  }

  return {
    fixtureId: snapshot.fixtureId,
    group: snapshot.group ?? null,
    matchday: snapshot.matchday ?? null,
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam,
    snapshotId: snapshot.snapshotId,
    snapshotStatus: snapshot.status,
    capturedAt: snapshot.capturedAt,
    kickoffAt: snapshot.kickoffAt ?? null,
    homeElo,
    awayElo,
    confidenceLevel: snapshot.confidence.level,
    coverageType: snapshot.confidence.coverageType,
    fallbackUsed: snapshot.inputs.homeUsesFallback || snapshot.inputs.awayUsesFallback,
    expectedGoals: { home: prediction.homeExpectedGoals, away: prediction.awayExpectedGoals },
    outcomeProbabilities,
    modalScoreline: { home: modal.homeGoals, away: modal.awayGoals, probability: modal.probability },
    topScorelines: topSorted.slice(0, 5).map((s) => ({ home: s.homeGoals, away: s.awayGoals, probability: s.probability })),
    hasEvaluation,
    actualScore,
    actualOutcome,
    predictedOutcome,
    outcomeCorrect,
    exactScoreCorrect,
    brierScore,
    logLoss,
    homeGoalError,
    awayGoalError,
    totalGoalError,
    goalDifferenceError
  };
}

// ---------------------------------------------------------------------------
// Core metrics — only evaluated records.
// ---------------------------------------------------------------------------

function buildCoreMetrics(evaluated: readonly InternalRecord[]): LiveEvidenceCoreMetrics {
  if (evaluated.length === 0) {
    return {
      outcomeAccuracy: null,
      exactScorelineAccuracy: null,
      averageBrierScore: null,
      averageLogLoss: null,
      averageHomeGoalError: null,
      averageAwayGoalError: null,
      averageTotalGoalError: null,
      averageGoalDifferenceError: null,
      averagePredictedGoals: null,
      averageActualGoals: null,
      averagePredictedGoalDifference: null,
      averageActualGoalDifference: null
    };
  }

  const n = evaluated.length;
  return {
    outcomeAccuracy: safeRate(evaluated.filter((r) => r.outcomeCorrect === true).length, n),
    exactScorelineAccuracy: safeRate(evaluated.filter((r) => r.exactScoreCorrect === true).length, n),
    averageBrierScore: safeMean(evaluated.map((r) => r.brierScore).filter(isFiniteNumber)),
    averageLogLoss: safeMean(evaluated.map((r) => r.logLoss).filter(isFiniteNumber)),
    averageHomeGoalError: safeMean(evaluated.map((r) => r.homeGoalError).filter(isFiniteNumber)),
    averageAwayGoalError: safeMean(evaluated.map((r) => r.awayGoalError).filter(isFiniteNumber)),
    averageTotalGoalError: safeMean(evaluated.map((r) => r.totalGoalError).filter(isFiniteNumber)),
    averageGoalDifferenceError: safeMean(evaluated.map((r) => r.goalDifferenceError).filter(isFiniteNumber)),
    averagePredictedGoals: safeMean(
      evaluated.map((r) => r.expectedGoals.home + r.expectedGoals.away)
    ),
    averageActualGoals: safeMean(
      evaluated.filter((r) => r.actualScore !== null).map((r) => r.actualScore!.home + r.actualScore!.away)
    ),
    averagePredictedGoalDifference: safeMean(
      evaluated.map((r) => r.expectedGoals.home - r.expectedGoals.away)
    ),
    averageActualGoalDifference: safeMean(
      evaluated.filter((r) => r.actualScore !== null).map((r) => r.actualScore!.home - r.actualScore!.away)
    )
  };
}

// ---------------------------------------------------------------------------
// Scoreline concentration — primary + all-snapshots secondary view.
// ---------------------------------------------------------------------------

interface ScorelineCounts {
  modalCounts: Map<string, number>;
  total: number;
}

function computeScorelineCounts(records: readonly InternalRecord[]): ScorelineCounts {
  const modalCounts = new Map<string, number>();
  for (const r of records) {
    const k = scorelineKey(r.modalScoreline.home, r.modalScoreline.away);
    modalCounts.set(k, (modalCounts.get(k) ?? 0) + 1);
  }
  return { modalCounts, total: records.length };
}

function buildScorelineConcentration(
  primaryAll: readonly InternalRecord[],
  allSnapshotRecords: readonly InternalRecord[]
): LiveEvidenceScorelineConcentration {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const primary = computeScorelineCounts(primaryAll);
  const secondary = computeScorelineCounts(allSnapshotRecords);

  const sorted = [...primary.modalCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top1 = sorted[0];
  const top2 = sorted[1];

  const modalScoreline = top1?.[0] ?? null;
  const modalScorelineCount = top1?.[1] ?? 0;
  const modalScorelineRate = safeRate(modalScorelineCount, primary.total);
  const topTwoCount = (top1?.[1] ?? 0) + (top2?.[1] ?? 0);
  const topTwoScorelinesRate = safeRate(topTwoCount, primary.total);

  const uniqueModalScorelines = primary.modalCounts.size;

  const oneOneCount = primary.modalCounts.get("1-1") ?? 0;
  const zeroZeroCount = primary.modalCounts.get("0-0") ?? 0;
  const oneZeroCount = primary.modalCounts.get("1-0") ?? 0;
  const zeroOneCount = primary.modalCounts.get("0-1") ?? 0;

  const modalDrawCount = [...primary.modalCounts.entries()]
    .filter(([k]) => {
      const [h, a] = k.split("-").map(Number);
      return typeof h === "number" && typeof a === "number" && h === a;
    })
    .reduce((sum, [, cnt]) => sum + cnt, 0);

  const topScorelineEntries: LiveEvidenceScorelineEntry[] = sorted.slice(0, 8).map(([key, primaryCount]) => ({
    scoreline: key,
    primaryModalCount: primaryCount,
    primaryModalRate: safeRate(primaryCount, primary.total),
    allSnapshotsModalCount: secondary.modalCounts.get(key) ?? 0,
    allSnapshotsModalRate: safeRate(secondary.modalCounts.get(key) ?? 0, secondary.total)
  }));

  const secSorted = [...secondary.modalCounts.entries()].sort((a, b) => b[1] - a[1]);
  const secTop1 = secSorted[0];
  const secOneOneCount = secondary.modalCounts.get("1-1") ?? 0;

  const compressedFlag =
    (oneOneCount / Math.max(primary.total, 1)) >= t.oneOneConcentrationThreshold ||
    (modalScorelineRate !== null && modalScorelineRate >= t.scorelineConcentrationRatioThreshold) ||
    (topTwoScorelinesRate !== null && topTwoScorelinesRate >= t.topTwoScorelinesDominanceThreshold) ||
    uniqueModalScorelines < t.exactScoreDiversityMinimum;

  return {
    modalScoreline,
    modalScorelineCount,
    modalScorelineRate,
    topTwoScorelinesRate,
    oneOneRate: safeRate(oneOneCount, primary.total),
    zeroZeroRate: safeRate(zeroZeroCount, primary.total),
    oneZeroRate: safeRate(oneZeroCount, primary.total),
    zeroOneRate: safeRate(zeroOneCount, primary.total),
    concentrationRatio: modalScorelineRate,
    uniqueModalScorelines,
    exactScoreDiversity: uniqueModalScorelines,
    modalDrawProportion: safeRate(modalDrawCount, primary.total),
    topScorelineEntries,
    allSnapshotsModalScoreline: secTop1?.[0] ?? null,
    allSnapshotsOneOneRate: safeRate(secOneOneCount, secondary.total),
    allSnapshotsConcentrationRatio: safeRate(secTop1?.[1] ?? 0, secondary.total),
    compressedModalSelectionFlag: compressedFlag
  };
}

// ---------------------------------------------------------------------------
// Draw calibration — only evaluated records.
// ---------------------------------------------------------------------------

const DRAW_CALIBRATION_BUCKETS: readonly { label: string; min: number; max: number }[] = [
  { label: "0.00-0.19", min: 0, max: 0.2 },
  { label: "0.20-0.29", min: 0.2, max: 0.3 },
  { label: "0.30-0.39", min: 0.3, max: 0.4 },
  { label: "0.40-0.49", min: 0.4, max: 0.5 },
  { label: "0.50+", min: 0.5, max: Number.POSITIVE_INFINITY }
];

function buildDrawCalibration(evaluated: readonly InternalRecord[]): LiveEvidenceDrawCalibration {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const sampleBelowMinimum = evaluated.length < t.minDrawBiasSampleSize;

  const drawProbs = evaluated.map((r) => r.outcomeProbabilities.draw);
  const actualDraws = evaluated.filter((r) => r.actualOutcome === "draw").length;
  const predictedDraws = evaluated.filter((r) => r.predictedOutcome === "draw").length;

  // False positives: predicted draw but actual was not draw.
  const drawFalsePositives = evaluated.filter(
    (r) => r.predictedOutcome === "draw" && r.actualOutcome !== "draw"
  ).length;
  // False negatives: actual was draw but predicted outcome was not draw.
  const drawFalseNegatives = evaluated.filter(
    (r) => r.predictedOutcome !== "draw" && r.actualOutcome === "draw"
  ).length;

  const avgPredictedDrawProb = safeMean(drawProbs);
  const actualDrawRate = safeRate(actualDraws, evaluated.length);
  const gap =
    avgPredictedDrawProb !== null && actualDrawRate !== null
      ? round6(avgPredictedDrawProb - actualDrawRate)
      : null;

  const calibrationBuckets: LiveEvidenceDrawCalibrationBucket[] = DRAW_CALIBRATION_BUCKETS.map((b) => {
    const inBucket = evaluated.filter((r) => {
      const p = r.outcomeProbabilities.draw;
      return p >= b.min && p < b.max;
    });
    const meanPred = safeMean(inBucket.map((r) => r.outcomeProbabilities.draw));
    const obs = safeRate(inBucket.filter((r) => r.actualOutcome === "draw").length, inBucket.length);
    const bucketGap =
      meanPred !== null && obs !== null ? round6(Math.abs(meanPred - obs)) : null;
    return {
      bucket: b.label,
      predictions: inBucket.length,
      meanPredictedDrawProbability: meanPred,
      observedDrawRate: obs,
      calibrationGap: bucketGap
    };
  });

  return {
    averagePredictedDrawProbability: avgPredictedDrawProb,
    actualDrawRate,
    predictedDrawCalibrationGap: gap,
    predictedDrawAsModalOutcomeCount: predictedDraws,
    predictedDrawAsModalOutcomeRate: safeRate(predictedDraws, evaluated.length),
    actualDrawHitRate: safeRate(
      evaluated.filter((r) => r.predictedOutcome === "draw" && r.actualOutcome === "draw").length,
      predictedDraws
    ),
    drawFalsePositiveRate: safeRate(drawFalsePositives, predictedDraws),
    drawFalseNegativeRate: safeRate(drawFalseNegatives, actualDraws),
    sampleBelowMinimum,
    calibrationBuckets
  };
}

// ---------------------------------------------------------------------------
// Favorite separation — only evaluated records.
// ---------------------------------------------------------------------------

function classifyFavoriteStrength(maxProb: number): LiveEvidenceFavoriteStrength {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  if (maxProb >= t.favoriteStrongMinProbability) return "strong";
  if (maxProb >= t.favoriteModerateMinProbability) return "moderate";
  if (maxProb >= t.favoriteWeakMinProbability) return "weak";
  return "no_clear_favorite";
}

export { classifyFavoriteStrength as classifyLiveEvidenceFavoriteStrength };

function deriveFavorite(
  probs: { homeWin: number; draw: number; awayWin: number }
): { outcome: PredictionOutcome; probability: number; margin: number } {
  const outcomes: Array<{ outcome: PredictionOutcome; probability: number }> = [
    { outcome: "home_win", probability: probs.homeWin },
    { outcome: "draw", probability: probs.draw },
    { outcome: "away_win", probability: probs.awayWin }
  ];
  outcomes.sort((a, b) => b.probability - a.probability);
  const first = outcomes[0]!;
  const second = outcomes[1]!;
  return {
    outcome: first.outcome,
    probability: first.probability,
    margin: first.probability - second.probability
  };
}

function favoriteActuallyWon(r: InternalRecord, favoriteOutcome: PredictionOutcome): boolean | null {
  if (r.actualOutcome === null) return null;
  return r.actualOutcome === favoriteOutcome;
}

function buildFavoriteSeparation(evaluated: readonly InternalRecord[]): LiveEvidenceFavoriteSeparation {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const strengthOrder: LiveEvidenceFavoriteStrength[] = ["no_clear_favorite", "weak", "moderate", "strong"];
  const counts: Record<LiveEvidenceFavoriteStrength, number> = {
    no_clear_favorite: 0,
    weak: 0,
    moderate: 0,
    strong: 0
  };

  interface FavoriteInfo {
    record: InternalRecord;
    favoriteOutcome: PredictionOutcome;
    favoriteProbability: number;
    margin: number;
    strength: LiveEvidenceFavoriteStrength;
    actuallyWon: boolean | null;
    xgAdvantageForFavorite: number;
    actualGoalMarginForFavorite: number | null;
  }

  const favoriteInfos: FavoriteInfo[] = evaluated.map((r) => {
    const fav = deriveFavorite(r.outcomeProbabilities);
    const strength = classifyFavoriteStrength(fav.probability);
    counts[strength]++;

    const xgAdv =
      fav.outcome === "home_win"
        ? r.expectedGoals.home - r.expectedGoals.away
        : fav.outcome === "away_win"
        ? r.expectedGoals.away - r.expectedGoals.home
        : Math.abs(r.expectedGoals.home - r.expectedGoals.away);

    const actualGoalMargin =
      r.actualScore !== null && fav.outcome !== "draw"
        ? fav.outcome === "home_win"
          ? r.actualScore.home - r.actualScore.away
          : r.actualScore.away - r.actualScore.home
        : null;

    return {
      record: r,
      favoriteOutcome: fav.outcome,
      favoriteProbability: fav.probability,
      margin: fav.margin,
      strength,
      actuallyWon: favoriteActuallyWon(r, fav.outcome),
      xgAdvantageForFavorite: xgAdv,
      actualGoalMarginForFavorite: actualGoalMargin
    };
  });

  const buckets: LiveEvidenceFavoriteBucket[] = strengthOrder.map((strength) => {
    const inBucket = favoriteInfos.filter((fi) => fi.strength === strength);
    const wonCount = inBucket.filter((fi) => fi.actuallyWon === true).length;
    const wonDenominator = inBucket.filter((fi) => fi.actuallyWon !== null).length;
    const correctOutcome = inBucket.filter((fi) => fi.record.outcomeCorrect === true).length;
    const exactScore = inBucket.filter((fi) => fi.record.exactScoreCorrect === true).length;

    return {
      strength,
      count: inBucket.length,
      averageFavoriteProbability: safeMean(inBucket.map((fi) => fi.favoriteProbability)),
      averageProbabilityMargin: safeMean(inBucket.map((fi) => fi.margin)),
      actualFavoriteWinRate: safeRate(wonCount, wonDenominator),
      averageActualGoalMarginForFavorite: safeMean(
        inBucket.map((fi) => fi.actualGoalMarginForFavorite).filter(isFiniteNumber)
      ),
      averagePredictedXgDifferenceForFavorite: safeMean(
        inBucket.map((fi) => fi.xgAdvantageForFavorite)
      ),
      outcomeAccuracy: safeRate(correctOutcome, inBucket.length),
      exactScoreAccuracy: safeRate(exactScore, inBucket.length)
    };
  });

  const strongBuckets = buckets.filter(
    (b) => (b.strength === "moderate" || b.strength === "strong") && b.count > 0
  );
  const underSeparationFlag =
    strongBuckets.length > 0 &&
    strongBuckets.every(
      (b) =>
        b.averagePredictedXgDifferenceForFavorite !== null &&
        b.averagePredictedXgDifferenceForFavorite < t.strongFavoriteMinXgAdvantage
    );

  const fixturesWithClearFavorite = favoriteInfos.filter((fi) => fi.strength !== "no_clear_favorite").length;

  return { fixturesWithClearFavorite, buckets, favoriteStrengthCounts: counts, underSeparationFlag };
}

// ---------------------------------------------------------------------------
// xG compression — all primary records (including unevaluated).
// ---------------------------------------------------------------------------

const FAVORITE_STRENGTH_LABELS: LiveEvidenceFavoriteStrength[] = [
  "no_clear_favorite",
  "weak",
  "moderate",
  "strong"
];

function buildXgCompression(
  allPrimary: readonly InternalRecord[],
  evaluated: readonly InternalRecord[]
): LiveEvidenceXgCompression {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const total = allPrimary.length;

  const absXgDiffs = allPrimary.map((r) =>
    Math.abs(r.expectedGoals.home - r.expectedGoals.away)
  );
  const homeXgs = allPrimary.map((r) => r.expectedGoals.home);
  const awayXgs = allPrimary.map((r) => r.expectedGoals.away);
  const totalXgs = allPrimary.map((r) => r.expectedGoals.home + r.expectedGoals.away);
  const gdNearZero = allPrimary.filter(
    (r) => Math.abs(r.expectedGoals.home - r.expectedGoals.away) < t.nearZeroGoalDiffThreshold
  ).length;

  const strongFavoriteLowXgCount = allPrimary.filter((r) => {
    const fav = deriveFavorite(r.outcomeProbabilities);
    if (fav.probability < t.favoriteStrongMinProbability) return false;
    const xgAdv =
      fav.outcome === "home_win"
        ? r.expectedGoals.home - r.expectedGoals.away
        : fav.outcome === "away_win"
        ? r.expectedGoals.away - r.expectedGoals.home
        : 0;
    return xgAdv < t.strongFavoriteMinXgAdvantage;
  }).length;

  const highMarginActualLowPredictedXgCount = evaluated.filter((r) => {
    if (r.actualScore === null) return false;
    const actualGd = Math.abs(r.actualScore.home - r.actualScore.away);
    const predictedAbsXg = Math.abs(r.expectedGoals.home - r.expectedGoals.away);
    return actualGd >= t.highMarginGoalDifference && predictedAbsXg < t.strongFavoriteMinXgAdvantage;
  }).length;

  const xgDifferenceByStrengthBucket: LiveEvidenceXgStrengthBucket[] = FAVORITE_STRENGTH_LABELS.map(
    (strength) => {
      const inBucket = allPrimary.filter((r) => {
        const fav = deriveFavorite(r.outcomeProbabilities);
        return classifyFavoriteStrength(fav.probability) === strength;
      });
      return {
        bucket: strength,
        matchCount: inBucket.length,
        averageAbsoluteXgDifference: safeMean(
          inBucket.map((r) => Math.abs(r.expectedGoals.home - r.expectedGoals.away))
        )
      };
    }
  );

  const shareBelow025 =
    total > 0 ? safeRate(absXgDiffs.filter((d) => d < t.xgCompressionDifference).length, total) : null;
  const xgCompressionFlag =
    (shareBelow025 !== null && shareBelow025 >= t.xgCompressionShare) ||
    strongFavoriteLowXgCount > 0;

  return {
    averageHomeXg: safeMean(homeXgs),
    averageAwayXg: safeMean(awayXgs),
    averagePredictedTotalXg: safeMean(totalXgs),
    averageAbsoluteXgDifference: safeMean(absXgDiffs),
    medianAbsoluteXgDifference: safeMedian(absXgDiffs),
    shareBelow010: total > 0 ? safeRate(absXgDiffs.filter((d) => d < 0.1).length, total) : null,
    shareBelow025,
    shareBelow050: total > 0 ? safeRate(absXgDiffs.filter((d) => d < 0.5).length, total) : null,
    percentagePredictedGdNearZero: safeRate(gdNearZero, total),
    strongFavoriteLowXgCount,
    highMarginActualLowPredictedXgCount,
    xgDifferenceByStrengthBucket,
    xgCompressionFlag
  };
}

// ---------------------------------------------------------------------------
// Confidence / coverage segmentation — only evaluated records.
// ---------------------------------------------------------------------------

function buildSegments(evaluated: readonly InternalRecord[]): LiveEvidenceSegment[] {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const segments: LiveEvidenceSegment[] = [];

  function addDimension<T extends string>(
    dimension: LiveEvidenceSegment["dimension"],
    getKey: (r: InternalRecord) => T,
    keys: readonly T[]
  ): void {
    for (const key of keys) {
      const subset = evaluated.filter((r) => getKey(r) === key);
      segments.push({
        dimension,
        value: String(key),
        count: subset.length,
        outcomeAccuracy: safeRate(subset.filter((r) => r.outcomeCorrect === true).length, subset.length),
        exactScoreAccuracy: safeRate(
          subset.filter((r) => r.exactScoreCorrect === true).length,
          subset.length
        ),
        averageBrierScore: safeMean(subset.map((r) => r.brierScore).filter(isFiniteNumber)),
        averageLogLoss: safeMean(subset.map((r) => r.logLoss).filter(isFiniteNumber)),
        averageGoalMae: safeMean(
          subset
            .map((r) =>
              r.homeGoalError !== null && r.awayGoalError !== null
                ? (r.homeGoalError + r.awayGoalError) / 2
                : null
            )
            .filter(isFiniteNumber)
        ),
        reliable: subset.length >= t.minSampleForSegmentComparison
      });
    }
  }

  const confidenceLevels: PredictionConfidenceLevel[] = ["high", "medium", "low", "very_low"];
  addDimension("confidence_level", (r) => r.confidenceLevel, confidenceLevels);

  const coverageTypes: PredictionCoverageType[] = ["full", "partial", "fallback", "fallback_only"];
  addDimension("coverage_type", (r) => r.coverageType, coverageTypes);

  addDimension("fallback_used", (r) => (r.fallbackUsed ? "true" : "false"), ["true", "false"]);

  const statuses: PredictionSnapshotStatus[] = ["pre_match_locked", "foundation_unverified"];
  addDimension("snapshot_status", (r) => r.snapshotStatus, statuses);

  return segments;
}

// ---------------------------------------------------------------------------
// Data quality assessment
// ---------------------------------------------------------------------------

function buildDataQualityAssessment(
  allSnapshots: readonly WorldCup2026PredictionSnapshot[],
  allEvaluations: readonly WorldCup2026PredictionEvaluation[],
  primaryRecords: readonly InternalRecord[],
  evaluatedRecords: readonly InternalRecord[]
): LiveEvidenceDataQualityAssessment {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const uniqueEvaluatedFixtures = evaluatedRecords.length;
  const issues: string[] = [];

  // Proportion pre_match_locked among primary selections.
  const preMatchLockedCount = primaryRecords.filter((r) => r.snapshotStatus === "pre_match_locked").length;
  const proportionPreMatchLocked = safeRate(preMatchLockedCount, primaryRecords.length);
  if (
    proportionPreMatchLocked !== null &&
    proportionPreMatchLocked < t.minPreMatchLockedProportion &&
    primaryRecords.length > 0
  ) {
    issues.push(
      `Only ${round6(proportionPreMatchLocked * 100)}% of primary snapshots are pre_match_locked; below threshold ${t.minPreMatchLockedProportion * 100}%.`
    );
  }

  // Proportion with fallback coverage.
  const fallbackCount = primaryRecords.filter((r) => r.fallbackUsed).length;
  const proportionFallbackCoverage = safeRate(fallbackCount, primaryRecords.length);
  if (
    proportionFallbackCoverage !== null &&
    proportionFallbackCoverage > t.maxFallbackCoverageProportion &&
    primaryRecords.length > 0
  ) {
    issues.push(
      `${round6(proportionFallbackCoverage * 100)}% of primary snapshots used fallback coverage; above threshold ${t.maxFallbackCoverageProportion * 100}%.`
    );
  }

  // Missing probabilities or metric fields among evaluated.
  let missingFields = 0;
  for (const r of evaluatedRecords) {
    if (r.brierScore === null || r.logLoss === null || r.homeGoalError === null) missingFields++;
  }

  // Provider fallback usage count.
  const providerFallbackUsageCount = primaryRecords.filter((r) => r.fallbackUsed).length;

  // Duplicate logical evaluations: multiple evaluations for same snapshotId.
  const evalsBySnapshot = new Map<string, number>();
  for (const e of allEvaluations) {
    evalsBySnapshot.set(e.snapshotId, (evalsBySnapshot.get(e.snapshotId) ?? 0) + 1);
  }
  const duplicateLogicalEvaluations = [...evalsBySnapshot.values()].filter((c) => c > 1).length;
  if (duplicateLogicalEvaluations > 0) {
    issues.push(`${duplicateLogicalEvaluations} snapshot(s) have multiple evaluations.`);
  }

  // Groups and matchdays represented among evaluated fixtures.
  const groupsRepresented = new Set<string>();
  const matchdaysRepresented = new Set<number>();
  for (const r of evaluatedRecords) {
    if (r.group !== null) groupsRepresented.add(r.group);
    if (r.matchday !== null) matchdaysRepresented.add(r.matchday);
  }
  const distinctGroupsRepresented = groupsRepresented.size;
  const distinctMatchdaysRepresented = matchdaysRepresented.size;

  if (distinctGroupsRepresented < t.minDistinctGroupsForRepresentation && uniqueEvaluatedFixtures >= t.minUniqueEvaluatedFixtures) {
    issues.push(
      `Only ${distinctGroupsRepresented} distinct group(s) represented; below ${t.minDistinctGroupsForRepresentation} for reliable coverage.`
    );
  }

  // Unresolved fixtures: snapshots with no valid probability data.
  const unresolvedFixtures = allSnapshots.filter((s) => !snapshotProbabilitiesValid(s)).length;
  const invalidResults = 0; // No explicit result store in this service; tracked via missing evaluations.

  // Readiness vote.
  let readinessVote: LiveEvidenceDataQualityAssessment["readinessVote"];
  const errorCount = (missingFields > 0 ? 1 : 0) + (duplicateLogicalEvaluations > 0 ? 1 : 0);
  const totalSnapshots = allSnapshots.length;
  const errorProportion = totalSnapshots > 0 ? errorCount / totalSnapshots : 0;

  if (uniqueEvaluatedFixtures < t.minUniqueEvaluatedFixtures) {
    readinessVote = "insufficient_evidence";
  } else if (errorProportion > t.maxDataQualityErrorProportion || missingFields > uniqueEvaluatedFixtures * 0.3) {
    readinessVote = "data_quality_blocked";
    issues.push(`Data quality error proportion ${round6(errorProportion)} exceeds threshold ${t.maxDataQualityErrorProportion}.`);
  } else if (uniqueEvaluatedFixtures < t.minForRecalibrationEvidence) {
    readinessVote = "evidence_collection_continue";
  } else {
    readinessVote = "clean_and_sufficient";
  }

  return {
    uniqueEvaluatedFixtures,
    proportionPreMatchLocked,
    proportionFallbackCoverage,
    unresolvedFixtures,
    invalidResults,
    duplicateLogicalEvaluations,
    missingProbabilityOrMetricFields: missingFields,
    providerFallbackUsageCount,
    distinctGroupsRepresented,
    distinctMatchdaysRepresented,
    readinessVote,
    issues
  };
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

function buildFindings(
  dataQuality: LiveEvidenceDataQualityAssessment,
  coreMetrics: LiveEvidenceCoreMetrics,
  scoreline: LiveEvidenceScorelineConcentration,
  drawCal: LiveEvidenceDrawCalibration,
  favoriteSep: LiveEvidenceFavoriteSeparation,
  xgComp: LiveEvidenceXgCompression,
  uniqueEvaluated: number
): LiveEvidenceFinding[] {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const findings: LiveEvidenceFinding[] = [];

  if (uniqueEvaluated < t.minUniqueEvaluatedFixtures) {
    findings.push({
      code: "insufficient_evidence",
      severity: "critical",
      summary: `Only ${uniqueEvaluated} unique evaluated fixture(s); below minUniqueEvaluatedFixtures=${t.minUniqueEvaluatedFixtures}.`
    });
  } else if (uniqueEvaluated < t.minForRecalibrationEvidence) {
    findings.push({
      code: "small_sample",
      severity: "warning",
      summary: `${uniqueEvaluated} unique evaluated fixture(s) is below minForRecalibrationEvidence=${t.minForRecalibrationEvidence}. Metrics are preliminary.`
    });
  }

  for (const issue of dataQuality.issues) {
    findings.push({ code: "data_quality_issue", severity: "warning", summary: issue });
  }

  if (scoreline.compressedModalSelectionFlag) {
    findings.push({
      code: "scoreline_concentration",
      severity: "warning",
      summary: `Modal scoreline concentration flag triggered. 1-1 rate: ${scoreline.oneOneRate ?? "null"}, top-1 concentration: ${scoreline.concentrationRatio ?? "null"}, unique modal scorelines: ${scoreline.uniqueModalScorelines}.`
    });
  }

  if (
    !drawCal.sampleBelowMinimum &&
    drawCal.predictedDrawCalibrationGap !== null &&
    drawCal.predictedDrawCalibrationGap > t.drawOverpredictionDelta
  ) {
    findings.push({
      code: "draw_overprediction",
      severity: "warning",
      summary: `Mean predicted draw probability exceeds actual draw rate by ${drawCal.predictedDrawCalibrationGap} (> ${t.drawOverpredictionDelta}).`
    });
  }

  if (
    !drawCal.sampleBelowMinimum &&
    drawCal.drawFalsePositiveRate !== null &&
    drawCal.drawFalsePositiveRate > t.drawFalsePositiveRateThreshold
  ) {
    findings.push({
      code: "draw_false_positive",
      severity: "warning",
      summary: `Draw false-positive rate ${drawCal.drawFalsePositiveRate} exceeds threshold ${t.drawFalsePositiveRateThreshold}.`
    });
  }

  if (favoriteSep.underSeparationFlag) {
    findings.push({
      code: "favorite_under_separation",
      severity: "warning",
      summary: "Moderate/strong probability favorites show insufficient predicted xG advantage over opponents."
    });
  }

  if (xgComp.xgCompressionFlag) {
    findings.push({
      code: "xg_compression",
      severity: "warning",
      summary: `xG compression flag triggered. shareBelow025: ${xgComp.shareBelow025 ?? "null"}, strongFavoriteLowXgCount: ${xgComp.strongFavoriteLowXgCount}.`
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Decision logic — named, explicit, conservative thresholds.
// ---------------------------------------------------------------------------

interface DecisionInputs {
  uniqueEvaluated: number;
  dataQuality: LiveEvidenceDataQualityAssessment;
  coreMetrics: LiveEvidenceCoreMetrics;
  scoreline: LiveEvidenceScorelineConcentration;
  xgComp: LiveEvidenceXgCompression;
  favoriteSep: LiveEvidenceFavoriteSeparation;
  drawCal: LiveEvidenceDrawCalibration;
}

interface DecisionResult {
  decision: LiveEvidenceGateDecision;
  decisionReasons: string[];
  blockedReasons: string[];
  nextRecommendedPhase: string;
}

function deriveDecision(inputs: DecisionInputs): DecisionResult {
  const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
  const reasons: string[] = [];
  const blocked: string[] = [];

  // 1. insufficient_evidence — hard gate on unique evaluated fixtures.
  if (inputs.uniqueEvaluated < t.minUniqueEvaluatedFixtures) {
    return {
      decision: "insufficient_evidence",
      decisionReasons: [
        `Unique evaluated fixtures (${inputs.uniqueEvaluated}) below minUniqueEvaluatedFixtures=${t.minUniqueEvaluatedFixtures}.`
      ],
      blockedReasons: [],
      nextRecommendedPhase:
        "Continue automatic pre-match snapshot capture and evaluation. Re-run this gate once at least " +
        `${t.minUniqueEvaluatedFixtures} unique fixtures have been evaluated.`
    };
  }

  // 2. data_quality_blocked — data quality problems exceed thresholds.
  if (inputs.dataQuality.readinessVote === "data_quality_blocked") {
    blocked.push(...inputs.dataQuality.issues);
    return {
      decision: "data_quality_blocked",
      decisionReasons: ["Data quality assessment returned data_quality_blocked."],
      blockedReasons: blocked,
      nextRecommendedPhase:
        "Investigate and resolve data quality issues before re-running this gate. " +
        "Check snapshot integrity, evaluation completeness, and provider fallback rates."
    };
  }

  // 3. evidence_collection_continue — clean evidence but sample below recalibration threshold.
  if (inputs.uniqueEvaluated < t.minForRecalibrationEvidence) {
    reasons.push(
      `Unique evaluated fixtures (${inputs.uniqueEvaluated}) below minForRecalibrationEvidence=${t.minForRecalibrationEvidence}.`,
      "Evidence is clean but sample is too small for a reliable recalibration verdict."
    );
    return {
      decision: "evidence_collection_continue",
      decisionReasons: reasons,
      blockedReasons: [],
      nextRecommendedPhase:
        `Continue collecting snapshots and evaluations. Re-run this gate once at least ` +
        `${t.minForRecalibrationEvidence} unique fixtures have been evaluated. ` +
        "Current observed metrics are preliminary and should not drive model changes."
    };
  }

  // Beyond this point we have sufficient evidence for recalibration verdicts.

  // 4. broader_model_review — multiple independent sections fail with sufficient sample.
  if (inputs.uniqueEvaluated >= t.minForBroaderModelReview) {
    const failingDimensions: string[] = [];
    if (inputs.xgComp.xgCompressionFlag) failingDimensions.push("xg_compression");
    if (inputs.favoriteSep.underSeparationFlag) failingDimensions.push("favorite_separation");
    if (inputs.scoreline.compressedModalSelectionFlag) failingDimensions.push("scoreline_concentration");
    if (
      !inputs.drawCal.sampleBelowMinimum &&
      inputs.drawCal.predictedDrawCalibrationGap !== null &&
      inputs.drawCal.predictedDrawCalibrationGap > t.drawOverpredictionDelta
    )
      failingDimensions.push("draw_calibration");
    if (failingDimensions.length >= 3) {
      reasons.push(
        `${failingDimensions.length} independent evidence sections failed: ${failingDimensions.join(", ")}.`
      );
      return {
        decision: "broader_model_review",
        decisionReasons: reasons,
        blockedReasons: [],
        nextRecommendedPhase:
          "Multiple evidence dimensions show systematic issues. Conduct a broader model review " +
          "covering Elo-to-xG calibration, scoreline selection, and draw bias together."
      };
    }
  }

  // 5. recalibrate_elo_to_xg — xG compression and favorite under-separation together.
  if (inputs.xgComp.xgCompressionFlag && inputs.favoriteSep.underSeparationFlag) {
    reasons.push(
      `xG compression flag triggered (shareBelow025=${inputs.xgComp.shareBelow025}, strongFavoriteLowXg=${inputs.xgComp.strongFavoriteLowXgCount}).`,
      "Favorite separation flag triggered for moderate/strong probability favorites."
    );
    return {
      decision: "recalibrate_elo_to_xg",
      decisionReasons: reasons,
      blockedReasons: [],
      nextRecommendedPhase:
        "Proceed to Phase 12.18C (Elo-to-xG recalibration). " +
        "Evaluate updated constants on a holdout set, not the audit sample."
    };
  }

  // 6. recalibrate_scoreline_selection — scoreline concentration excessive but 1X2 not clearly poor.
  if (inputs.scoreline.compressedModalSelectionFlag) {
    const outcomeAccuracy = inputs.coreMetrics.outcomeAccuracy;
    const acceptableOutcomeAccuracy = 0.4;
    if (outcomeAccuracy !== null && outcomeAccuracy >= acceptableOutcomeAccuracy) {
      reasons.push(
        "Modal scoreline concentration flag triggered.",
        `1X2 outcome accuracy (${outcomeAccuracy}) is not clearly poor (>= ${acceptableOutcomeAccuracy}).`
      );
      return {
        decision: "recalibrate_scoreline_selection",
        decisionReasons: reasons,
        blockedReasons: [],
        nextRecommendedPhase:
          "Proceed to Phase 12.18B (scoreline-selection / presentation changes). " +
          "Modal scoreline may misrepresent the underlying probability distribution."
      };
    }
  }

  // 7. presentation_change_only — 1X2 calibration acceptable but modal scoreline misleading.
  const outcomeAccuracy = inputs.coreMetrics.outcomeAccuracy;
  const exactAccuracy = inputs.coreMetrics.exactScorelineAccuracy;
  if (
    outcomeAccuracy !== null &&
    outcomeAccuracy >= 0.5 &&
    exactAccuracy !== null &&
    exactAccuracy < 0.15
  ) {
    reasons.push(
      `1X2 outcome accuracy (${outcomeAccuracy}) is acceptable but exact modal accuracy (${exactAccuracy}) is poor.`,
      "The issue is scoreline presentation, not outcome probability calibration."
    );
    return {
      decision: "presentation_change_only",
      decisionReasons: reasons,
      blockedReasons: [],
      nextRecommendedPhase:
        "Proceed to Phase 12.18B (scoreline presentation changes). " +
        "Consider showing top-3 scorelines rather than a single modal score."
    };
  }

  // 8. Default — continue collecting evidence.
  reasons.push(
    "No threshold breached with the current sample.",
    `Unique evaluated fixtures: ${inputs.uniqueEvaluated}.`
  );
  return {
    decision: "evidence_collection_continue",
    decisionReasons: reasons,
    blockedReasons: [],
    nextRecommendedPhase:
      "Continue collecting pre-match snapshots and evaluations. " +
      "Re-run this gate when the sample size grows for more reliable findings."
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runLiveEvidenceGate(input: LiveEvidenceGateInput): LiveEvidenceGateReport {
  const { generatedAt, persistenceMetadata, snapshots, evaluations } = input;

  // Index evaluations by snapshotId (latest preferred).
  const evaluationBySnapshotId = new Map<string, WorldCup2026PredictionEvaluation>();
  for (const evaluation of evaluations) {
    const existing = evaluationBySnapshotId.get(evaluation.snapshotId);
    if (
      existing === undefined ||
      evaluation.evaluatedAt > existing.evaluatedAt ||
      (evaluation.evaluatedAt === existing.evaluatedAt &&
        evaluation.evaluationId > existing.evaluationId)
    ) {
      evaluationBySnapshotId.set(evaluation.snapshotId, evaluation);
    }
  }

  // Group snapshots by fixtureId.
  const snapshotsByFixture = new Map<string, WorldCup2026PredictionSnapshot[]>();
  for (const snapshot of snapshots) {
    const list = snapshotsByFixture.get(snapshot.fixtureId);
    if (list === undefined) {
      snapshotsByFixture.set(snapshot.fixtureId, [snapshot]);
    } else {
      list.push(snapshot);
    }
  }

  // Apply selection policy per fixture (deterministic order by fixtureId).
  const sortedFixtureIds = [...snapshotsByFixture.keys()].sort();
  const primaryRecords: InternalRecord[] = [];
  const allExcluded: LiveEvidenceExcludedSnapshot[] = [];
  let preMatchLockedSelected = 0;
  let foundationUnverifiedSelected = 0;
  let fixturesWithMultipleSnapshots = 0;

  for (const fixtureId of sortedFixtureIds) {
    const candidates = snapshotsByFixture.get(fixtureId)!;
    if (candidates.length > 1) fixturesWithMultipleSnapshots++;

    const result = selectFixtureSnapshot(fixtureId, candidates);
    allExcluded.push(...result.excluded);

    if (result.selected === null) continue;

    const evaluation = evaluationBySnapshotId.get(result.selected.snapshotId);
    primaryRecords.push(buildRecord(result.selected, evaluation));

    if (result.selected.status === "pre_match_locked") preMatchLockedSelected++;
    else foundationUnverifiedSelected++;
  }

  // All valid pre-match snapshots (secondary view for scoreline concentration).
  const allValidPreMatch = snapshots.filter(
    (s) => snapshotProbabilitiesValid(s) && snapshotIsPreMatch(s)
  );
  const allSnapshotRecords = allValidPreMatch.map((s) => {
    const sorted2 = sortedScorelines(s.prediction.mostLikelyScorelines);
    const modal = selectTopPredictedScoreline(s.prediction.mostLikelyScorelines) ?? sorted2[0]!;
    return buildRecord(s, evaluationBySnapshotId.get(s.snapshotId));
  });

  // Separate evaluated from pending in primary records.
  const evaluatedRecords = primaryRecords.filter((r) => r.hasEvaluation);
  const pendingRecords = primaryRecords.filter((r) => !r.hasEvaluation);

  const uniqueFixtures = primaryRecords.length;
  const uniqueEvaluatedFixtures = evaluatedRecords.length;

  // Evidence counts.
  const evidenceCounts: LiveEvidenceCounts = {
    totalSnapshots: snapshots.length,
    evaluatedSnapshots: evaluatedRecords.length,
    pendingSnapshots: pendingRecords.length,
    uniqueFixtures,
    uniqueEvaluatedFixtures,
    fixturesWithMultipleSnapshots,
    totalExcludedFromPrimary: allExcluded.length
  };

  // Selection summary.
  const selectionSummary: LiveEvidenceSelectionSummary = {
    policy: "one_per_fixture_prefer_pre_match_locked_latest_pre_kickoff",
    primaryCandidatesConsidered: snapshots.length,
    preMatchLockedSelected,
    foundationUnverifiedSelected,
    excludedFromPrimary: allExcluded,
    allSnapshotsConsidered: snapshots.length,
    allSnapshotsValid: allValidPreMatch.length
  };

  // Build all sections.
  const coreMetrics = buildCoreMetrics(evaluatedRecords);
  const scorelineConcentration = buildScorelineConcentration(primaryRecords, allSnapshotRecords);
  const drawCalibration = buildDrawCalibration(evaluatedRecords);
  const favoriteSeparation = buildFavoriteSeparation(evaluatedRecords);
  const xgCompression = buildXgCompression(primaryRecords, evaluatedRecords);
  const confidenceCoverageSegmentation = buildSegments(evaluatedRecords);
  const dataQualityAssessment = buildDataQualityAssessment(
    snapshots,
    evaluations,
    primaryRecords,
    evaluatedRecords
  );

  const findings = buildFindings(
    dataQualityAssessment,
    coreMetrics,
    scorelineConcentration,
    drawCalibration,
    favoriteSeparation,
    xgCompression,
    uniqueEvaluatedFixtures
  );

  const { decision, decisionReasons, blockedReasons, nextRecommendedPhase } = deriveDecision({
    uniqueEvaluated: uniqueEvaluatedFixtures,
    dataQuality: dataQualityAssessment,
    coreMetrics,
    scoreline: scorelineConcentration,
    xgComp: xgCompression,
    favoriteSep: favoriteSeparation,
    drawCal: drawCalibration
  });

  return {
    generatedAt,
    persistenceMetadata: {
      provider: persistenceMetadata.provider,
      persistent: persistenceMetadata.persistent,
      configuredProvider: persistenceMetadata.configuredProvider
    },
    evidenceCounts,
    selectionPolicySummary: selectionSummary,
    coreMetrics,
    scorelineConcentration,
    drawCalibration,
    favoriteSeparation,
    xgCompression,
    confidenceCoverageSegmentation,
    dataQualityAssessment,
    findings,
    decision,
    decisionReasons,
    blockedReasons,
    nextRecommendedPhase
  };
}
