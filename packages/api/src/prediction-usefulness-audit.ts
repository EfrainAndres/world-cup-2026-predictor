// ---------------------------------------------------------------------------
// Phase 12.18A — Prediction Usefulness Audit (pure, deterministic, read-only)
//
// This module measures whether the stored World Cup 2026 predictions are
// practically useful for match-by-match forecasting. It NEVER reruns the
// prediction model: every prediction value (xG, 1X2 probabilities, scorelines,
// Elo inputs) is read from the immutable stored snapshot. Outcome/Brier/Log-Loss
// derivations reuse the same pure helpers as the Model-vs-Reality tracker, so
// the audit stays consistent with stored evaluations.
//
// No I/O, no Date.now(), no Math.random(): `generatedAt` is injected so the
// output is fully reproducible. All rates/means return `null` (never NaN) when
// they cannot be computed.
// ---------------------------------------------------------------------------

import {
  calculateOutcomeLogLoss,
  calculateThreeWayBrierScore,
  deriveActualOutcome,
  derivePredictionOutcome,
  selectTopPredictedScoreline
} from "./prediction-evaluation-service.js";
import type {
  PredictionOutcome,
  WorldCup2026Fixture,
  WorldCup2026FixtureResult,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot,
  WorldCup2026PredictionSnapshotScoreline
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Named thresholds (documented; never hidden in prose).
// ---------------------------------------------------------------------------

export const PREDICTION_USEFULNESS_AUDIT_THRESHOLDS = {
  /** Minimum eligible predictions before any model judgement is meaningful. */
  minSampleForEvidence: 8,
  /** Minimum eligible/completed coverage before the dataset is trustworthy. */
  minCoverageRate: 0.5,
  /** 1X2 outcome accuracy at or above this is considered "acceptable". */
  acceptableOutcomeAccuracy: 0.5,
  /** Exact modal-scoreline accuracy below this is considered "poor". */
  poorExactScorelineAccuracy: 0.15,
  /** Top-3/Top-5 exact coverage exceeding Top-1 by this much signals a
   *  scoreline-selection (presentation of the modal score) problem. */
  materialTopNGap: 0.15,
  /** Share of fixtures with |xG difference| below this counts as "compressed". */
  xgCompressionDifference: 0.25,
  /** Fraction of fixtures under `xgCompressionDifference` that signals
   *  systematic xG compression. */
  xgCompressionShare: 0.5,
  /** Elo gap (absolute) treated as a "strong favorite" for draw/xG checks. */
  strongFavoriteEloGap: 200,
  /** A strong favorite whose xG advantage is below this is under-separated. */
  strongFavoriteMinXgAdvantage: 0.4,
  /** Goal difference (absolute) that defines a blowout. */
  blowoutGoalDifference: 3,
  /** Predicted xG difference below this on an actual blowout = underestimated. */
  underestimatedBlowoutXgDifference: 1.0,
  /** 1-1 modal overprediction delta (modal rate − actual rate) worth flagging. */
  oneOneOverpredictionDelta: 0.1,
  /** Draw-probability over-prediction (mean predicted − actual) worth flagging. */
  drawOverpredictionDelta: 0.05,
  /** Maximum number of worked examples embedded per example list. */
  maxExamples: 10
} as const;

/** FavoriteStrength classification thresholds, by absolute Elo difference. */
export const FAVORITE_STRENGTH_THRESHOLDS = {
  balanced: 0,
  slightFavorite: 50,
  moderateFavorite: 100,
  strongFavorite: 150,
  heavyFavorite: 300
} as const;

/** Reporting buckets for the favorite-separation and xG-by-Elo audits. */
const ELO_DIFFERENCE_BUCKETS: readonly { label: string; min: number; max: number }[] = [
  { label: "0-49", min: 0, max: 50 },
  { label: "50-99", min: 50, max: 100 },
  { label: "100-149", min: 100, max: 150 },
  { label: "150-199", min: 150, max: 200 },
  { label: "200-299", min: 200, max: 300 },
  { label: "300+", min: 300, max: Number.POSITIVE_INFINITY }
];

/** Predicted draw-probability calibration buckets. */
const DRAW_PROBABILITY_BUCKETS: readonly { label: string; min: number; max: number }[] = [
  { label: "0.00-0.19", min: 0, max: 0.2 },
  { label: "0.20-0.29", min: 0.2, max: 0.3 },
  { label: "0.30-0.39", min: 0.3, max: 0.4 },
  { label: "0.40-0.49", min: 0.4, max: 0.5 },
  { label: "0.50+", min: 0.5, max: Number.POSITIVE_INFINITY }
];

/** Scorelines always reported in the frequency audit, in canonical order. */
const REQUIRED_SCORELINES: readonly { home: number; away: number }[] = [
  { home: 0, away: 0 },
  { home: 1, away: 0 },
  { home: 0, away: 1 },
  { home: 1, away: 1 },
  { home: 2, away: 0 },
  { home: 0, away: 2 },
  { home: 2, away: 1 },
  { home: 1, away: 2 },
  { home: 2, away: 2 },
  { home: 3, away: 0 },
  { home: 0, away: 3 }
];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FavoriteStrength =
  | "balanced"
  | "slight_favorite"
  | "moderate_favorite"
  | "strong_favorite"
  | "heavy_favorite";

export type PredictionUsefulnessExclusionReason =
  | "no_snapshot"
  | "no_completed_result"
  | "post_kickoff_snapshot"
  | "malformed_data"
  | "mismatched_teams"
  | "unsupported_schema_version";

export type PredictionUsefulnessRecommendation =
  | "keep_current_model"
  | "presentation_change_only"
  | "recalibrate_scoreline_selection"
  | "recalibrate_elo_to_xg"
  | "data_quality_blocked"
  | "insufficient_evidence";

export interface AuditCompletedFixture {
  fixtureId: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

export interface PredictionUsefulnessAuditInput {
  /** Injected timestamp for deterministic output (ISO string). */
  generatedAt: string;
  /** Completed fixtures (canonical teams + final score). */
  completedFixtures: readonly AuditCompletedFixture[];
  /** Candidate immutable pre-match snapshots. */
  snapshots: readonly WorldCup2026PredictionSnapshot[];
  /** Optional stored evaluations; reused when present for a selected snapshot. */
  evaluations?: readonly WorldCup2026PredictionEvaluation[];
  /** Optional allow-list of supported model versions; snapshots outside it are
   *  excluded as `unsupported_schema_version`. Omit to disable the check. */
  supportedModelVersions?: readonly string[];
}

export interface PredictionUsefulnessAuditRecord {
  fixtureId: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string | null;

  capturedAt: string;
  preset: string;
  formulaVersion: string;
  modelVersion: string;

  homeElo: number | null;
  awayElo: number | null;
  eloDifference: number | null;

  expectedGoals: { home: number; away: number };
  outcomeProbabilities: { homeWin: number; draw: number; awayWin: number };

  topScorelines: Array<{ home: number; away: number; probability: number }>;
  modalScoreline: { home: number; away: number; probability: number } | null;

  actualScore: { home: number; away: number };

  predictedOutcome: PredictionOutcome;
  actualOutcome: PredictionOutcome;

  outcomeCorrect: boolean;
  exactScorelineCorrect: boolean;
  goalDifferenceError: number;
  totalGoalsError: number;
}

export interface ScorelineFrequencyAudit {
  scoreline: string;
  home: number;
  away: number;
  modalCount: number;
  modalRate: number | null;
  actualCount: number;
  actualRate: number | null;
  exactHitCount: number;
  overpredictionDelta: number | null;
}

export interface DrawCalibrationBucket {
  bucket: string;
  predictions: number;
  meanPredictedDrawProbability: number | null;
  observedDrawRate: number | null;
  calibrationGap: number | null;
}

export interface DrawBiasAudit {
  averagePredictedDrawProbability: number | null;
  actualDrawRate: number | null;
  drawHighestProbabilityCount: number;
  modalDrawButWinHighestCount: number;
  modalDrawAgainstStrongFavoriteCount: number;
  calibrationBuckets: DrawCalibrationBucket[];
}

export interface FavoriteBucketAudit {
  bucket: string;
  matchCount: number;
  averageFavoriteWinProbability: number | null;
  actualFavoriteWinRate: number | null;
  averagePredictedXgDifference: number | null;
  averageActualGoalDifference: number | null;
  modal11Rate: number | null;
  drawPredictionRate: number | null;
  exactScoreAccuracy: number | null;
  outcomeAccuracy: number | null;
}

export interface XgEloBucketAudit {
  bucket: string;
  matchCount: number;
  averageAbsoluteXgDifference: number | null;
}

export interface XgCompressionAudit {
  averageHomeXg: number | null;
  averageAwayXg: number | null;
  minXg: number | null;
  maxXg: number | null;
  averageAbsoluteXgDifference: number | null;
  medianAbsoluteXgDifference: number | null;
  shareBelow010: number | null;
  shareBelow025: number | null;
  shareBelow050: number | null;
  shareBelow075: number | null;
  xgDifferenceByEloBucket: XgEloBucketAudit[];
  eloXgCorrelation: number | null;
  strongFavoriteLowXgCount: number;
}

export interface ModalVsAggregateCase {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  modalScoreline: { home: number; away: number; probability: number };
  outcomeProbabilities: { homeWin: number; draw: number; awayWin: number };
  eloDifference: number | null;
  expectedGoals: { home: number; away: number };
  actualScore: { home: number; away: number };
  aggregateOutcome: PredictionOutcome;
}

export interface TopNUsefulnessAudit {
  exactInTop1: number;
  exactInTop1Rate: number | null;
  exactInTop3: number;
  exactInTop3Rate: number | null;
  exactInTop5: number;
  exactInTop5Rate: number | null;
  outcomeInModal: number;
  outcomeInModalRate: number | null;
  outcomeInTop3: number;
  outcomeInTop3Rate: number | null;
  outcomeInTop5: number;
  outcomeInTop5Rate: number | null;
}

export interface UpsetBlowoutExample {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  eloDifference: number | null;
  expectedGoals: { home: number; away: number };
  actualScore: { home: number; away: number };
  kind: "upset" | "blowout" | "strong_favorite_miss" | "underestimated_blowout";
}

export interface UpsetAndBlowoutAudit {
  upsetCount: number;
  blowoutCount: number;
  strongFavoriteMissCount: number;
  underestimatedBlowoutCount: number;
  exampleCount: number;
  exampleTruncated: boolean;
  examples: UpsetBlowoutExample[];
}

export interface PredictionUsefulnessFinding {
  code: string;
  severity: "info" | "warning" | "critical";
  summary: string;
}

export interface PredictionUsefulnessAuditReport {
  generatedAt: string;
  dataset: {
    completedFixtures: number;
    eligiblePredictions: number;
    excludedFixtures: number;
    coverageRate: number | null;
    exclusionReasons: Record<PredictionUsefulnessExclusionReason, number>;
  };
  usefulness: {
    outcomeAccuracy: number | null;
    exactScorelineAccuracy: number | null;
    homeWinPrecision: number | null;
    drawPrecision: number | null;
    awayWinPrecision: number | null;
    top3ExactScoreCoverage: number | null;
    top5ExactScoreCoverage: number | null;
    averageBrierScore: number | null;
    averageLogLoss: number | null;
    averageHomeGoalError: number | null;
    averageAwayGoalError: number | null;
    averageGoalDifferenceError: number | null;
    averageTotalGoalsError: number | null;
  };
  oneOneScoreline: {
    modalRate: number | null;
    actualRate: number | null;
    overpredictionDelta: number | null;
  };
  scorelineFrequency: ScorelineFrequencyAudit[];
  drawBias: DrawBiasAudit;
  favoriteSeparation: FavoriteBucketAudit[];
  favoriteStrengthCounts: Record<FavoriteStrength, number>;
  xgCompression: XgCompressionAudit;
  modalVsAggregate: ModalVsAggregateCase[];
  topN: TopNUsefulnessAudit;
  upsetAndBlowout: UpsetAndBlowoutAudit;
  findings: PredictionUsefulnessFinding[];
  recommendation: PredictionUsefulnessRecommendation;
  recommendationBasis: {
    rationale: string;
    thresholds: typeof PREDICTION_USEFULNESS_AUDIT_THRESHOLDS;
  };
  records: PredictionUsefulnessAuditRecord[];
}

// ---------------------------------------------------------------------------
// Pure numeric helpers (no NaN / Infinity escapes)
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
  if (sorted.length % 2 === 1) {
    return round6(sorted[mid]!);
  }
  return round6((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function pearsonCorrelation(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i]!;
    sumY += ys[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX <= 0 || varY <= 0) return null;
  return round6(cov / Math.sqrt(varX * varY));
}

function scorelineKey(home: number, away: number): string {
  return `${home}-${away}`;
}

function outcomeFromGoals(home: number, away: number): PredictionOutcome {
  return deriveActualOutcome(home, away);
}

function classifyFavoriteStrengthInternal(absEloDifference: number): FavoriteStrength {
  const t = FAVORITE_STRENGTH_THRESHOLDS;
  if (absEloDifference >= t.heavyFavorite) return "heavy_favorite";
  if (absEloDifference >= t.strongFavorite) return "strong_favorite";
  if (absEloDifference >= t.moderateFavorite) return "moderate_favorite";
  if (absEloDifference >= t.slightFavorite) return "slight_favorite";
  return "balanced";
}

/** Public, documented classification of favorite strength by |Elo difference|. */
export function classifyFavoriteStrength(absEloDifference: number): FavoriteStrength {
  if (!isFiniteNumber(absEloDifference) || absEloDifference < 0) return "balanced";
  return classifyFavoriteStrengthInternal(absEloDifference);
}

// ---------------------------------------------------------------------------
// Dataset construction helper (pure): join fixtures + completed results.
// ---------------------------------------------------------------------------

export function buildAuditCompletedFixtures(
  fixtures: readonly WorldCup2026Fixture[],
  results: readonly WorldCup2026FixtureResult[]
): AuditCompletedFixture[] {
  const fixtureById = new Map<string, WorldCup2026Fixture>();
  for (const fixture of fixtures) {
    fixtureById.set(fixture.id, fixture);
  }

  const completed: AuditCompletedFixture[] = [];
  for (const result of results) {
    if (result.status !== "completed") continue;
    if (!isFiniteNumber(result.homeScore) || !isFiniteNumber(result.awayScore)) continue;
    const fixture = fixtureById.get(result.fixtureId);
    if (fixture === undefined) continue;
    completed.push({
      fixtureId: fixture.id,
      group: fixture.group,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeGoals: result.homeScore,
      awayGoals: result.awayScore
    });
  }

  // Deterministic ordering by fixtureId.
  completed.sort((a, b) => (a.fixtureId < b.fixtureId ? -1 : a.fixtureId > b.fixtureId ? 1 : 0));
  return completed;
}

// ---------------------------------------------------------------------------
// Snapshot selection policy
// ---------------------------------------------------------------------------

interface SnapshotValidationContext {
  fixture: AuditCompletedFixture;
  supportedModelVersions?: readonly string[];
}

function snapshotTeamsMatch(snapshot: WorldCup2026PredictionSnapshot, fixture: AuditCompletedFixture): boolean {
  return snapshot.homeTeam === fixture.homeTeam && snapshot.awayTeam === fixture.awayTeam;
}

function snapshotHasSupportedVersion(
  snapshot: WorldCup2026PredictionSnapshot,
  supported?: readonly string[]
): boolean {
  if (supported === undefined) return true;
  return supported.includes(snapshot.modelVersion);
}

function snapshotProbabilitiesValid(snapshot: WorldCup2026PredictionSnapshot): boolean {
  const p = snapshot.prediction;
  if (
    !isFiniteNumber(p.homeWinProbability) ||
    !isFiniteNumber(p.drawProbability) ||
    !isFiniteNumber(p.awayWinProbability) ||
    !isFiniteNumber(p.homeExpectedGoals) ||
    !isFiniteNumber(p.awayExpectedGoals)
  ) {
    return false;
  }
  const sum = p.homeWinProbability + p.drawProbability + p.awayWinProbability;
  if (!isFiniteNumber(sum) || Math.abs(sum - 1) > 0.02) return false;
  if (!Array.isArray(p.mostLikelyScorelines) || p.mostLikelyScorelines.length === 0) return false;
  for (const s of p.mostLikelyScorelines) {
    if (!isFiniteNumber(s.homeGoals) || !isFiniteNumber(s.awayGoals) || !isFiniteNumber(s.probability)) {
      return false;
    }
  }
  return true;
}

function snapshotIsPreMatch(snapshot: WorldCup2026PredictionSnapshot): boolean {
  if (snapshot.kickoffAt === undefined) return true; // cannot prove post-kickoff
  const captured = Date.parse(snapshot.capturedAt);
  const kickoff = Date.parse(snapshot.kickoffAt);
  if (!Number.isFinite(captured) || !Number.isFinite(kickoff)) return true;
  return captured < kickoff;
}

export interface SnapshotSelectionResult {
  selected?: WorldCup2026PredictionSnapshot;
  exclusionReason?: PredictionUsefulnessExclusionReason;
}

/**
 * Select exactly one prediction snapshot per fixture using the documented
 * policy: a valid, supported, pre-match snapshot whose teams match the official
 * fixture, choosing the latest `capturedAt`, with `snapshotId` (descending) as
 * the final deterministic tie-breaker. Returns the first failing gate's reason
 * when no snapshot qualifies.
 */
export function selectAuditSnapshotForFixture(
  candidates: readonly WorldCup2026PredictionSnapshot[],
  context: SnapshotValidationContext
): SnapshotSelectionResult {
  if (candidates.length === 0) {
    return { exclusionReason: "no_snapshot" };
  }

  const teamMatched = candidates.filter((s) => snapshotTeamsMatch(s, context.fixture));
  if (teamMatched.length === 0) {
    return { exclusionReason: "mismatched_teams" };
  }

  const versionOk = teamMatched.filter((s) => snapshotHasSupportedVersion(s, context.supportedModelVersions));
  if (versionOk.length === 0) {
    return { exclusionReason: "unsupported_schema_version" };
  }

  const wellFormed = versionOk.filter(snapshotProbabilitiesValid);
  if (wellFormed.length === 0) {
    return { exclusionReason: "malformed_data" };
  }

  const preMatch = wellFormed.filter(snapshotIsPreMatch);
  if (preMatch.length === 0) {
    return { exclusionReason: "post_kickoff_snapshot" };
  }

  const selected = [...preMatch].sort((a, b) => {
    const ca = Date.parse(a.capturedAt);
    const cb = Date.parse(b.capturedAt);
    if (Number.isFinite(ca) && Number.isFinite(cb) && ca !== cb) return cb - ca; // latest first
    if (a.capturedAt !== b.capturedAt) return a.capturedAt < b.capturedAt ? 1 : -1;
    // Final tie-breaker: snapshotId descending (deterministic).
    return a.snapshotId < b.snapshotId ? 1 : a.snapshotId > b.snapshotId ? -1 : 0;
  })[0]!;

  return { selected };
}

// ---------------------------------------------------------------------------
// Per-record construction
// ---------------------------------------------------------------------------

function toRecordScoreline(s: WorldCup2026PredictionSnapshotScoreline): {
  home: number;
  away: number;
  probability: number;
} {
  return { home: s.homeGoals, away: s.awayGoals, probability: s.probability };
}

function sortedTopScorelines(
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

function probabilityOfOutcome(
  probabilities: { homeWin: number; draw: number; awayWin: number },
  outcome: PredictionOutcome
): number {
  switch (outcome) {
    case "home_win":
      return probabilities.homeWin;
    case "draw":
      return probabilities.draw;
    case "away_win":
      return probabilities.awayWin;
  }
}

interface InternalRecord {
  record: PredictionUsefulnessAuditRecord;
  snapshot: WorldCup2026PredictionSnapshot;
  evaluation?: WorldCup2026PredictionEvaluation;
  topScorelines: WorldCup2026PredictionSnapshotScoreline[];
  modal: WorldCup2026PredictionSnapshotScoreline;
  brierScore: number;
  logLoss: number;
  homeGoalError: number;
  awayGoalError: number;
}

function buildRecord(
  snapshot: WorldCup2026PredictionSnapshot,
  fixture: AuditCompletedFixture,
  evaluation: WorldCup2026PredictionEvaluation | undefined
): InternalRecord {
  const prediction = snapshot.prediction;
  const sortedScorelines = sortedTopScorelines(prediction.mostLikelyScorelines);
  const modal = selectTopPredictedScoreline(prediction.mostLikelyScorelines) ?? sortedScorelines[0]!;

  const outcomeProbabilities = {
    homeWin: prediction.homeWinProbability,
    draw: prediction.drawProbability,
    awayWin: prediction.awayWinProbability
  };

  const predictedOutcome =
    evaluation?.predicted.predictedOutcome ??
    derivePredictionOutcome({
      homeWinProbability: prediction.homeWinProbability,
      drawProbability: prediction.drawProbability,
      awayWinProbability: prediction.awayWinProbability
    });

  const actualOutcome = evaluation?.actual.outcome ?? outcomeFromGoals(fixture.homeGoals, fixture.awayGoals);

  const homeElo = isFiniteNumber(snapshot.inputs.homeElo) ? snapshot.inputs.homeElo : null;
  const awayElo = isFiniteNumber(snapshot.inputs.awayElo) ? snapshot.inputs.awayElo : null;
  const eloDifference = homeElo !== null && awayElo !== null ? homeElo - awayElo : null;

  const predictedGoalDifference = modal.homeGoals - modal.awayGoals;
  const actualGoalDifference = fixture.homeGoals - fixture.awayGoals;
  const goalDifferenceError =
    evaluation?.metrics.goalDifferenceAbsoluteError ?? Math.abs(predictedGoalDifference - actualGoalDifference);
  const totalGoalsError =
    evaluation?.metrics.totalGoalAbsoluteError ??
    Math.abs(modal.homeGoals + modal.awayGoals - (fixture.homeGoals + fixture.awayGoals));
  const homeGoalError = evaluation?.metrics.homeGoalAbsoluteError ?? Math.abs(modal.homeGoals - fixture.homeGoals);
  const awayGoalError = evaluation?.metrics.awayGoalAbsoluteError ?? Math.abs(modal.awayGoals - fixture.awayGoals);

  const brierScore =
    evaluation?.metrics.brierScore ??
    calculateThreeWayBrierScore(
      {
        homeWinProbability: prediction.homeWinProbability,
        drawProbability: prediction.drawProbability,
        awayWinProbability: prediction.awayWinProbability
      },
      actualOutcome
    );
  const logLoss =
    evaluation?.metrics.logLoss ?? calculateOutcomeLogLoss(probabilityOfOutcome(outcomeProbabilities, actualOutcome));

  const outcomeCorrect = evaluation?.metrics.outcomeCorrect ?? predictedOutcome === actualOutcome;
  const exactScorelineCorrect =
    evaluation?.metrics.exactScoreCorrect ??
    (modal.homeGoals === fixture.homeGoals && modal.awayGoals === fixture.awayGoals);

  const record: PredictionUsefulnessAuditRecord = {
    fixtureId: snapshot.fixtureId,
    group: snapshot.group ?? fixture.group,
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam,
    kickoffAt: snapshot.kickoffAt ?? null,
    capturedAt: snapshot.capturedAt,
    preset: snapshot.modelConfiguration.eloPreset,
    formulaVersion: evaluation?.metricVersion ?? snapshot.modelVersion,
    modelVersion: snapshot.modelVersion,
    homeElo,
    awayElo,
    eloDifference,
    expectedGoals: { home: prediction.homeExpectedGoals, away: prediction.awayExpectedGoals },
    outcomeProbabilities,
    topScorelines: sortedScorelines.slice(0, 5).map(toRecordScoreline),
    modalScoreline: toRecordScoreline(modal),
    actualScore: { home: fixture.homeGoals, away: fixture.awayGoals },
    predictedOutcome,
    actualOutcome,
    outcomeCorrect,
    exactScorelineCorrect,
    goalDifferenceError,
    totalGoalsError
  };

  return {
    record,
    snapshot,
    ...(evaluation !== undefined ? { evaluation } : {}),
    topScorelines: sortedScorelines,
    modal,
    brierScore,
    logLoss,
    homeGoalError,
    awayGoalError
  };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function emptyExclusionReasons(): Record<PredictionUsefulnessExclusionReason, number> {
  return {
    no_snapshot: 0,
    no_completed_result: 0,
    post_kickoff_snapshot: 0,
    malformed_data: 0,
    mismatched_teams: 0,
    unsupported_schema_version: 0
  };
}

function emptyFavoriteStrengthCounts(): Record<FavoriteStrength, number> {
  return {
    balanced: 0,
    slight_favorite: 0,
    moderate_favorite: 0,
    strong_favorite: 0,
    heavy_favorite: 0
  };
}

function buildScorelineFrequency(records: readonly InternalRecord[]): {
  audit: ScorelineFrequencyAudit[];
  oneOne: { modalRate: number | null; actualRate: number | null; overpredictionDelta: number | null };
} {
  const total = records.length;
  const modalCounts = new Map<string, number>();
  const actualCounts = new Map<string, number>();
  const exactHits = new Map<string, number>();

  for (const r of records) {
    const modalK = scorelineKey(r.modal.homeGoals, r.modal.awayGoals);
    const actualK = scorelineKey(r.record.actualScore.home, r.record.actualScore.away);
    modalCounts.set(modalK, (modalCounts.get(modalK) ?? 0) + 1);
    actualCounts.set(actualK, (actualCounts.get(actualK) ?? 0) + 1);
    if (modalK === actualK) {
      exactHits.set(modalK, (exactHits.get(modalK) ?? 0) + 1);
    }
  }

  const keys: { home: number; away: number }[] = [...REQUIRED_SCORELINES];
  const seen = new Set(keys.map((k) => scorelineKey(k.home, k.away)));
  for (const k of [...modalCounts.keys(), ...actualCounts.keys()]) {
    if (!seen.has(k)) {
      seen.add(k);
      const [h, a] = k.split("-");
      keys.push({ home: Number(h), away: Number(a) });
    }
  }

  const audit: ScorelineFrequencyAudit[] = keys.map(({ home, away }) => {
    const key = scorelineKey(home, away);
    const modalCount = modalCounts.get(key) ?? 0;
    const actualCount = actualCounts.get(key) ?? 0;
    const modalRate = safeRate(modalCount, total);
    const actualRate = safeRate(actualCount, total);
    const overpredictionDelta = modalRate !== null && actualRate !== null ? round6(modalRate - actualRate) : null;
    return {
      scoreline: key,
      home,
      away,
      modalCount,
      modalRate,
      actualCount,
      actualRate,
      exactHitCount: exactHits.get(key) ?? 0,
      overpredictionDelta
    };
  });

  const oneOneKey = scorelineKey(1, 1);
  const modal11Rate = safeRate(modalCounts.get(oneOneKey) ?? 0, total);
  const actual11Rate = safeRate(actualCounts.get(oneOneKey) ?? 0, total);
  const oneOne = {
    modalRate: modal11Rate,
    actualRate: actual11Rate,
    overpredictionDelta:
      modal11Rate !== null && actual11Rate !== null ? round6(modal11Rate - actual11Rate) : null
  };

  return { audit, oneOne };
}

function buildDrawBias(records: readonly InternalRecord[]): DrawBiasAudit {
  const drawProbs: number[] = [];
  let actualDraws = 0;
  let drawHighest = 0;
  let modalDrawButWinHighest = 0;
  let modalDrawStrongFavorite = 0;
  const strongGap = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.strongFavoriteEloGap;

  for (const r of records) {
    drawProbs.push(r.record.outcomeProbabilities.draw);
    if (r.record.actualOutcome === "draw") actualDraws++;
    if (r.record.predictedOutcome === "draw") drawHighest++;
    const modalIsDraw = r.modal.homeGoals === r.modal.awayGoals;
    if (modalIsDraw && r.record.predictedOutcome !== "draw") modalDrawButWinHighest++;
    if (
      modalIsDraw &&
      r.record.eloDifference !== null &&
      Math.abs(r.record.eloDifference) >= strongGap
    ) {
      modalDrawStrongFavorite++;
    }
  }

  const calibrationBuckets: DrawCalibrationBucket[] = DRAW_PROBABILITY_BUCKETS.map((bucket) => {
    const inBucket = records.filter((r) => {
      const p = r.record.outcomeProbabilities.draw;
      return p >= bucket.min && p < bucket.max;
    });
    const meanPredicted = safeMean(inBucket.map((r) => r.record.outcomeProbabilities.draw));
    const observed = safeRate(inBucket.filter((r) => r.record.actualOutcome === "draw").length, inBucket.length);
    const gap = meanPredicted !== null && observed !== null ? round6(Math.abs(meanPredicted - observed)) : null;
    return {
      bucket: bucket.label,
      predictions: inBucket.length,
      meanPredictedDrawProbability: meanPredicted,
      observedDrawRate: observed,
      calibrationGap: gap
    };
  });

  return {
    averagePredictedDrawProbability: safeMean(drawProbs),
    actualDrawRate: safeRate(actualDraws, records.length),
    drawHighestProbabilityCount: drawHighest,
    modalDrawButWinHighestCount: modalDrawButWinHighest,
    modalDrawAgainstStrongFavoriteCount: modalDrawStrongFavorite,
    calibrationBuckets
  };
}

function favoriteWinProbability(r: InternalRecord): number | null {
  if (r.record.eloDifference === null) return null;
  if (r.record.eloDifference >= 0) return r.record.outcomeProbabilities.homeWin;
  return r.record.outcomeProbabilities.awayWin;
}

function favoriteActuallyWon(r: InternalRecord): boolean | null {
  if (r.record.eloDifference === null) return null;
  if (r.record.eloDifference >= 0) return r.record.actualOutcome === "home_win";
  return r.record.actualOutcome === "away_win";
}

function favoriteXgAdvantage(r: InternalRecord): number | null {
  if (r.record.eloDifference === null) return null;
  const diff = r.record.expectedGoals.home - r.record.expectedGoals.away;
  return r.record.eloDifference >= 0 ? diff : -diff;
}

function favoriteActualGoalDifference(r: InternalRecord): number | null {
  if (r.record.eloDifference === null) return null;
  const diff = r.record.actualScore.home - r.record.actualScore.away;
  return r.record.eloDifference >= 0 ? diff : -diff;
}

function buildFavoriteSeparation(records: readonly InternalRecord[]): {
  buckets: FavoriteBucketAudit[];
  strengthCounts: Record<FavoriteStrength, number>;
} {
  const buckets: FavoriteBucketAudit[] = ELO_DIFFERENCE_BUCKETS.map((bucket) => {
    const inBucket = records.filter((r) => {
      if (r.record.eloDifference === null) return false;
      const abs = Math.abs(r.record.eloDifference);
      return abs >= bucket.min && abs < bucket.max;
    });
    const favWinProbs = inBucket.map(favoriteWinProbability).filter(isFiniteNumber);
    const favWon = inBucket.map(favoriteActuallyWon).filter((v): v is boolean => v !== null);
    const xgDiffs = inBucket.map(favoriteXgAdvantage).filter(isFiniteNumber);
    const actualGds = inBucket.map(favoriteActualGoalDifference).filter(isFiniteNumber);
    return {
      bucket: bucket.label,
      matchCount: inBucket.length,
      averageFavoriteWinProbability: safeMean(favWinProbs),
      actualFavoriteWinRate: safeRate(favWon.filter((v) => v).length, favWon.length),
      averagePredictedXgDifference: safeMean(xgDiffs),
      averageActualGoalDifference: safeMean(actualGds),
      modal11Rate: safeRate(
        inBucket.filter((r) => r.modal.homeGoals === 1 && r.modal.awayGoals === 1).length,
        inBucket.length
      ),
      drawPredictionRate: safeRate(
        inBucket.filter((r) => r.record.predictedOutcome === "draw").length,
        inBucket.length
      ),
      exactScoreAccuracy: safeRate(
        inBucket.filter((r) => r.record.exactScorelineCorrect).length,
        inBucket.length
      ),
      outcomeAccuracy: safeRate(inBucket.filter((r) => r.record.outcomeCorrect).length, inBucket.length)
    };
  });

  const strengthCounts = emptyFavoriteStrengthCounts();
  for (const r of records) {
    if (r.record.eloDifference === null) continue;
    strengthCounts[classifyFavoriteStrengthInternal(Math.abs(r.record.eloDifference))]++;
  }

  return { buckets, strengthCounts };
}

function buildXgCompression(records: readonly InternalRecord[]): XgCompressionAudit {
  const homeXgs = records.map((r) => r.record.expectedGoals.home);
  const awayXgs = records.map((r) => r.record.expectedGoals.away);
  const absXgDiffs = records.map((r) => Math.abs(r.record.expectedGoals.home - r.record.expectedGoals.away));
  const allXg = [...homeXgs, ...awayXgs];
  const total = records.length;

  const shareBelow = (threshold: number): number | null =>
    safeRate(absXgDiffs.filter((d) => d < threshold).length, total);

  const xgDifferenceByEloBucket: XgEloBucketAudit[] = ELO_DIFFERENCE_BUCKETS.map((bucket) => {
    const inBucket = records.filter((r) => {
      if (r.record.eloDifference === null) return false;
      const abs = Math.abs(r.record.eloDifference);
      return abs >= bucket.min && abs < bucket.max;
    });
    return {
      bucket: bucket.label,
      matchCount: inBucket.length,
      averageAbsoluteXgDifference: safeMean(
        inBucket.map((r) => Math.abs(r.record.expectedGoals.home - r.record.expectedGoals.away))
      )
    };
  });

  const correlationRecords = records.filter((r) => r.record.eloDifference !== null);
  const eloXgCorrelation = pearsonCorrelation(
    correlationRecords.map((r) => r.record.eloDifference as number),
    correlationRecords.map((r) => r.record.expectedGoals.home - r.record.expectedGoals.away)
  );

  const strongGap = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.strongFavoriteEloGap;
  const minXgAdv = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.strongFavoriteMinXgAdvantage;
  const strongFavoriteLowXgCount = records.filter((r) => {
    if (r.record.eloDifference === null) return false;
    if (Math.abs(r.record.eloDifference) < strongGap) return false;
    return Math.abs(r.record.expectedGoals.home - r.record.expectedGoals.away) < minXgAdv;
  }).length;

  return {
    averageHomeXg: safeMean(homeXgs),
    averageAwayXg: safeMean(awayXgs),
    minXg: allXg.length > 0 ? round6(Math.min(...allXg)) : null,
    maxXg: allXg.length > 0 ? round6(Math.max(...allXg)) : null,
    averageAbsoluteXgDifference: safeMean(absXgDiffs),
    medianAbsoluteXgDifference: safeMedian(absXgDiffs),
    shareBelow010: shareBelow(0.1),
    shareBelow025: shareBelow(0.25),
    shareBelow050: shareBelow(0.5),
    shareBelow075: shareBelow(0.75),
    xgDifferenceByEloBucket,
    eloXgCorrelation,
    strongFavoriteLowXgCount
  };
}

function buildModalVsAggregate(records: readonly InternalRecord[]): ModalVsAggregateCase[] {
  const cases: ModalVsAggregateCase[] = [];
  for (const r of records) {
    const modalIsDraw = r.modal.homeGoals === r.modal.awayGoals;
    if (!modalIsDraw) continue;
    if (r.record.predictedOutcome === "draw") continue; // aggregate also draw → not a conflict
    cases.push({
      fixtureId: r.record.fixtureId,
      homeTeam: r.record.homeTeam,
      awayTeam: r.record.awayTeam,
      modalScoreline: toRecordScoreline(r.modal),
      outcomeProbabilities: r.record.outcomeProbabilities,
      eloDifference: r.record.eloDifference,
      expectedGoals: r.record.expectedGoals,
      actualScore: r.record.actualScore,
      aggregateOutcome: r.record.predictedOutcome
    });
  }
  return cases;
}

function outcomeOfScoreline(s: WorldCup2026PredictionSnapshotScoreline): PredictionOutcome {
  return outcomeFromGoals(s.homeGoals, s.awayGoals);
}

function buildTopN(records: readonly InternalRecord[]): TopNUsefulnessAudit {
  const total = records.length;
  let exactTop1 = 0;
  let exactTop3 = 0;
  let exactTop5 = 0;
  let outcomeModal = 0;
  let outcomeTop3 = 0;
  let outcomeTop5 = 0;

  for (const r of records) {
    const actualHome = r.record.actualScore.home;
    const actualAway = r.record.actualScore.away;
    const top = r.topScorelines;
    const matchesExact = (s: WorldCup2026PredictionSnapshotScoreline): boolean =>
      s.homeGoals === actualHome && s.awayGoals === actualAway;

    if (top[0] !== undefined && matchesExact(top[0])) exactTop1++;
    if (top.slice(0, 3).some(matchesExact)) exactTop3++;
    if (top.slice(0, 5).some(matchesExact)) exactTop5++;

    const actualOutcome = r.record.actualOutcome;
    if (outcomeOfScoreline(r.modal) === actualOutcome) outcomeModal++;
    if (top.slice(0, 3).some((s) => outcomeOfScoreline(s) === actualOutcome)) outcomeTop3++;
    if (top.slice(0, 5).some((s) => outcomeOfScoreline(s) === actualOutcome)) outcomeTop5++;
  }

  return {
    exactInTop1: exactTop1,
    exactInTop1Rate: safeRate(exactTop1, total),
    exactInTop3: exactTop3,
    exactInTop3Rate: safeRate(exactTop3, total),
    exactInTop5: exactTop5,
    exactInTop5Rate: safeRate(exactTop5, total),
    outcomeInModal: outcomeModal,
    outcomeInModalRate: safeRate(outcomeModal, total),
    outcomeInTop3: outcomeTop3,
    outcomeInTop3Rate: safeRate(outcomeTop3, total),
    outcomeInTop5: outcomeTop5,
    outcomeInTop5Rate: safeRate(outcomeTop5, total)
  };
}

function buildUpsetAndBlowout(records: readonly InternalRecord[]): UpsetAndBlowoutAudit {
  const blowoutThreshold = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.blowoutGoalDifference;
  const strongGap = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.strongFavoriteEloGap;
  const underXg = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.underestimatedBlowoutXgDifference;
  const maxExamples = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS.maxExamples;

  let upsetCount = 0;
  let blowoutCount = 0;
  let strongFavoriteMissCount = 0;
  let underestimatedBlowoutCount = 0;
  const examples: UpsetBlowoutExample[] = [];

  const pushExample = (r: InternalRecord, kind: UpsetBlowoutExample["kind"]): void => {
    if (examples.length >= maxExamples) return;
    examples.push({
      fixtureId: r.record.fixtureId,
      homeTeam: r.record.homeTeam,
      awayTeam: r.record.awayTeam,
      eloDifference: r.record.eloDifference,
      expectedGoals: r.record.expectedGoals,
      actualScore: r.record.actualScore,
      kind
    });
  };

  for (const r of records) {
    const gd = Math.abs(r.record.actualScore.home - r.record.actualScore.away);
    const isBlowout = gd >= blowoutThreshold;
    if (isBlowout) {
      blowoutCount++;
      pushExample(r, "blowout");
    }

    if (r.record.eloDifference !== null && r.record.actualOutcome !== "draw") {
      const favoriteIsHome = r.record.eloDifference >= 0;
      const homeWon = r.record.actualOutcome === "home_win";
      const favoriteWon = favoriteIsHome ? homeWon : !homeWon;
      // Upset only when there is a genuine Elo favorite (non-zero gap).
      if (r.record.eloDifference !== 0 && !favoriteWon) {
        upsetCount++;
        pushExample(r, "upset");
      }
      if (Math.abs(r.record.eloDifference) >= strongGap && !favoriteWon) {
        strongFavoriteMissCount++;
        pushExample(r, "strong_favorite_miss");
      }
    }

    const predictedXgDiff = Math.abs(r.record.expectedGoals.home - r.record.expectedGoals.away);
    if (isBlowout && predictedXgDiff < underXg) {
      underestimatedBlowoutCount++;
      pushExample(r, "underestimated_blowout");
    }
  }

  return {
    upsetCount,
    blowoutCount,
    strongFavoriteMissCount,
    underestimatedBlowoutCount,
    exampleCount: examples.length,
    exampleTruncated:
      examples.length >= maxExamples &&
      upsetCount + blowoutCount + strongFavoriteMissCount + underestimatedBlowoutCount > maxExamples,
    examples
  };
}

// ---------------------------------------------------------------------------
// Findings + recommendation
// ---------------------------------------------------------------------------

interface RecommendationInputs {
  eligible: number;
  coverageRate: number | null;
  outcomeAccuracy: number | null;
  exactScorelineAccuracy: number | null;
  top3Exact: number | null;
  top5Exact: number | null;
  xgCompressionShare: number | null;
  strongFavoriteLowXgCount: number;
  favoriteBuckets: readonly FavoriteBucketAudit[];
}

function deriveRecommendation(inputs: RecommendationInputs): {
  recommendation: PredictionUsefulnessRecommendation;
  rationale: string;
} {
  const t = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS;

  if (inputs.eligible < t.minSampleForEvidence) {
    return {
      recommendation: "insufficient_evidence",
      rationale: `Only ${inputs.eligible} eligible prediction(s); below minSampleForEvidence=${t.minSampleForEvidence}.`
    };
  }

  if (inputs.coverageRate !== null && inputs.coverageRate < t.minCoverageRate) {
    return {
      recommendation: "data_quality_blocked",
      rationale: `Coverage ${inputs.coverageRate} is below minCoverageRate=${t.minCoverageRate}.`
    };
  }

  // Favorite buckets with material match counts that under-separate the favorite.
  const highEloBuckets = inputs.favoriteBuckets.filter(
    (b) => (b.bucket === "200-299" || b.bucket === "300+") && b.matchCount > 0
  );
  const favoriteUnderSeparated =
    highEloBuckets.length > 0 &&
    highEloBuckets.every(
      (b) =>
        b.averagePredictedXgDifference !== null &&
        b.averagePredictedXgDifference < t.strongFavoriteMinXgAdvantage
    );
  const xgCompressed = inputs.xgCompressionShare !== null && inputs.xgCompressionShare >= t.xgCompressionShare;

  if (xgCompressed && (favoriteUnderSeparated || inputs.strongFavoriteLowXgCount > 0)) {
    return {
      recommendation: "recalibrate_elo_to_xg",
      rationale: `xG compression share ${inputs.xgCompressionShare} >= ${t.xgCompressionShare} with under-separated strong favorites.`
    };
  }

  const top1 = inputs.exactScorelineAccuracy;
  const bestTopN = Math.max(inputs.top3Exact ?? 0, inputs.top5Exact ?? 0);
  if (top1 !== null && bestTopN - top1 >= t.materialTopNGap) {
    return {
      recommendation: "recalibrate_scoreline_selection",
      rationale: `Top-3/Top-5 exact coverage exceeds Top-1 (${top1}) by >= materialTopNGap=${t.materialTopNGap}.`
    };
  }

  if (
    inputs.outcomeAccuracy !== null &&
    inputs.outcomeAccuracy >= t.acceptableOutcomeAccuracy &&
    inputs.exactScorelineAccuracy !== null &&
    inputs.exactScorelineAccuracy < t.poorExactScorelineAccuracy
  ) {
    return {
      recommendation: "presentation_change_only",
      rationale: `1X2 outcome accuracy ${inputs.outcomeAccuracy} >= ${t.acceptableOutcomeAccuracy} but exact modal accuracy ${inputs.exactScorelineAccuracy} < ${t.poorExactScorelineAccuracy}.`
    };
  }

  return {
    recommendation: "keep_current_model",
    rationale: "No threshold breached: outcome and scoreline usefulness are within accepted bounds."
  };
}

function buildFindings(
  report: Omit<PredictionUsefulnessAuditReport, "findings" | "recommendation" | "recommendationBasis">
): PredictionUsefulnessFinding[] {
  const t = PREDICTION_USEFULNESS_AUDIT_THRESHOLDS;
  const findings: PredictionUsefulnessFinding[] = [];

  if (report.dataset.eligiblePredictions < t.minSampleForEvidence) {
    findings.push({
      code: "low_sample",
      severity: "critical",
      summary: `Eligible predictions (${report.dataset.eligiblePredictions}) below minSampleForEvidence=${t.minSampleForEvidence}; metrics are not statistically meaningful.`
    });
  }

  if (report.dataset.coverageRate !== null && report.dataset.coverageRate < t.minCoverageRate) {
    findings.push({
      code: "low_coverage",
      severity: "warning",
      summary: `Prediction coverage ${report.dataset.coverageRate} below minCoverageRate=${t.minCoverageRate}.`
    });
  }

  if (
    report.oneOneScoreline.overpredictionDelta !== null &&
    report.oneOneScoreline.overpredictionDelta > t.oneOneOverpredictionDelta
  ) {
    findings.push({
      code: "one_one_overprediction",
      severity: "warning",
      summary: `1-1 modal rate exceeds actual 1-1 rate by ${report.oneOneScoreline.overpredictionDelta} (> ${t.oneOneOverpredictionDelta}).`
    });
  }

  if (
    report.drawBias.averagePredictedDrawProbability !== null &&
    report.drawBias.actualDrawRate !== null &&
    report.drawBias.averagePredictedDrawProbability - report.drawBias.actualDrawRate > t.drawOverpredictionDelta
  ) {
    findings.push({
      code: "draw_bias",
      severity: "warning",
      summary: `Mean predicted draw probability (${report.drawBias.averagePredictedDrawProbability}) exceeds actual draw rate (${report.drawBias.actualDrawRate}).`
    });
  }

  if (report.xgCompression.shareBelow025 !== null && report.xgCompression.shareBelow025 >= t.xgCompressionShare) {
    findings.push({
      code: "xg_compression",
      severity: "warning",
      summary: `${report.xgCompression.shareBelow025} of fixtures have |xG difference| below ${t.xgCompressionDifference}.`
    });
  }

  if (report.modalVsAggregate.length > 0) {
    findings.push({
      code: "modal_vs_aggregate_divergence",
      severity: "info",
      summary: `${report.modalVsAggregate.length} fixture(s) where the modal exact score is a draw but the aggregate 1X2 favors a win.`
    });
  }

  if (
    report.usefulness.exactScorelineAccuracy !== null &&
    report.topN.exactInTop3Rate !== null &&
    report.topN.exactInTop3Rate - report.usefulness.exactScorelineAccuracy >= t.materialTopNGap
  ) {
    findings.push({
      code: "topn_better_than_modal",
      severity: "info",
      summary: `Top-3 exact coverage (${report.topN.exactInTop3Rate}) materially exceeds modal exact accuracy (${report.usefulness.exactScorelineAccuracy}).`
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runWorldCup2026PredictionUsefulnessAudit(
  input: PredictionUsefulnessAuditInput
): PredictionUsefulnessAuditReport {
  const { generatedAt, completedFixtures, snapshots } = input;

  const snapshotsByFixture = new Map<string, WorldCup2026PredictionSnapshot[]>();
  for (const snapshot of snapshots) {
    const list = snapshotsByFixture.get(snapshot.fixtureId);
    if (list === undefined) {
      snapshotsByFixture.set(snapshot.fixtureId, [snapshot]);
    } else {
      list.push(snapshot);
    }
  }

  const evaluationBySnapshotId = new Map<string, WorldCup2026PredictionEvaluation>();
  for (const evaluation of input.evaluations ?? []) {
    // Prefer the latest evaluation per snapshot (by evaluatedAt, then id desc).
    const existing = evaluationBySnapshotId.get(evaluation.snapshotId);
    if (
      existing === undefined ||
      evaluation.evaluatedAt > existing.evaluatedAt ||
      (evaluation.evaluatedAt === existing.evaluatedAt && evaluation.evaluationId > existing.evaluationId)
    ) {
      evaluationBySnapshotId.set(evaluation.snapshotId, evaluation);
    }
  }

  const completedFixtureIds = new Set(completedFixtures.map((f) => f.fixtureId));
  const exclusionReasons = emptyExclusionReasons();
  const internalRecords: InternalRecord[] = [];

  // Snapshots that reference a fixture with no completed result.
  const fixturesWithSnapshotButNoResult = new Set<string>();
  for (const fixtureId of snapshotsByFixture.keys()) {
    if (!completedFixtureIds.has(fixtureId)) {
      fixturesWithSnapshotButNoResult.add(fixtureId);
    }
  }
  exclusionReasons.no_completed_result = fixturesWithSnapshotButNoResult.size;

  // Deterministic iteration over completed fixtures (already sortable by id).
  const orderedFixtures = [...completedFixtures].sort((a, b) =>
    a.fixtureId < b.fixtureId ? -1 : a.fixtureId > b.fixtureId ? 1 : 0
  );

  for (const fixture of orderedFixtures) {
    const candidates = snapshotsByFixture.get(fixture.fixtureId) ?? [];
    const selection = selectAuditSnapshotForFixture(candidates, {
      fixture,
      ...(input.supportedModelVersions !== undefined
        ? { supportedModelVersions: input.supportedModelVersions }
        : {})
    });

    if (selection.selected === undefined) {
      const reason = selection.exclusionReason ?? "malformed_data";
      exclusionReasons[reason]++;
      continue;
    }

    const evaluation = evaluationBySnapshotId.get(selection.selected.snapshotId);
    internalRecords.push(buildRecord(selection.selected, fixture, evaluation));
  }

  // Stable record ordering by fixtureId for reproducible artifacts.
  internalRecords.sort((a, b) =>
    a.record.fixtureId < b.record.fixtureId ? -1 : a.record.fixtureId > b.record.fixtureId ? 1 : 0
  );

  const eligible = internalRecords.length;
  const completedCount = completedFixtures.length;
  const excludedFixtures =
    exclusionReasons.no_snapshot +
    exclusionReasons.post_kickoff_snapshot +
    exclusionReasons.malformed_data +
    exclusionReasons.mismatched_teams +
    exclusionReasons.unsupported_schema_version;
  const coverageRate = safeRate(eligible, completedCount);

  // Core usefulness metrics.
  const outcomeAccuracy = safeRate(internalRecords.filter((r) => r.record.outcomeCorrect).length, eligible);
  const exactScorelineAccuracy = safeRate(
    internalRecords.filter((r) => r.record.exactScorelineCorrect).length,
    eligible
  );

  const precisionFor = (outcome: PredictionOutcome): number | null => {
    const predicted = internalRecords.filter((r) => r.record.predictedOutcome === outcome);
    return safeRate(predicted.filter((r) => r.record.actualOutcome === outcome).length, predicted.length);
  };

  const { audit: scorelineFrequency, oneOne } = buildScorelineFrequency(internalRecords);
  const drawBias = buildDrawBias(internalRecords);
  const { buckets: favoriteSeparation, strengthCounts } = buildFavoriteSeparation(internalRecords);
  const xgCompression = buildXgCompression(internalRecords);
  const modalVsAggregate = buildModalVsAggregate(internalRecords);
  const topN = buildTopN(internalRecords);
  const upsetAndBlowout = buildUpsetAndBlowout(internalRecords);

  const usefulness = {
    outcomeAccuracy,
    exactScorelineAccuracy,
    homeWinPrecision: precisionFor("home_win"),
    drawPrecision: precisionFor("draw"),
    awayWinPrecision: precisionFor("away_win"),
    top3ExactScoreCoverage: topN.exactInTop3Rate,
    top5ExactScoreCoverage: topN.exactInTop5Rate,
    averageBrierScore: safeMean(internalRecords.map((r) => r.brierScore)),
    averageLogLoss: safeMean(internalRecords.map((r) => r.logLoss)),
    averageHomeGoalError: safeMean(internalRecords.map((r) => r.homeGoalError)),
    averageAwayGoalError: safeMean(internalRecords.map((r) => r.awayGoalError)),
    averageGoalDifferenceError: safeMean(internalRecords.map((r) => r.record.goalDifferenceError)),
    averageTotalGoalsError: safeMean(internalRecords.map((r) => r.record.totalGoalsError))
  };

  const partialReport = {
    generatedAt,
    dataset: {
      completedFixtures: completedCount,
      eligiblePredictions: eligible,
      excludedFixtures,
      coverageRate,
      exclusionReasons
    },
    usefulness,
    oneOneScoreline: oneOne,
    scorelineFrequency,
    drawBias,
    favoriteSeparation,
    favoriteStrengthCounts: strengthCounts,
    xgCompression,
    modalVsAggregate,
    topN,
    upsetAndBlowout,
    records: internalRecords.map((r) => r.record)
  };

  const findings = buildFindings(partialReport);
  const { recommendation, rationale } = deriveRecommendation({
    eligible,
    coverageRate,
    outcomeAccuracy,
    exactScorelineAccuracy,
    top3Exact: topN.exactInTop3Rate,
    top5Exact: topN.exactInTop5Rate,
    xgCompressionShare: xgCompression.shareBelow025,
    strongFavoriteLowXgCount: xgCompression.strongFavoriteLowXgCount,
    favoriteBuckets: favoriteSeparation
  });

  return {
    ...partialReport,
    findings,
    recommendation,
    recommendationBasis: {
      rationale,
      thresholds: PREDICTION_USEFULNESS_AUDIT_THRESHOLDS
    }
  };
}
