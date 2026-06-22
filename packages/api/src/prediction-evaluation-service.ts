import {
  HISTORICAL_VALIDATION_EPSILON,
  PROBABILITY_SUM_TOLERANCE
} from "../../model/src/index.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import { computeContentHash } from "./snapshot-service.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import type { PredictionEvaluationStore } from "./prediction-evaluation-store.js";
import type { AsyncPredictionEvaluationStore } from "./async-evaluation-store.js";
import type {
  PredictionConfidenceLevel,
  PredictionCoverageType,
  PredictionOutcome,
  PredictionEvaluationStatus,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ModelRealityConfidenceSummary,
  WorldCup2026ModelRealityCoverageSummary,
  WorldCup2026ModelRealityFallbackSummary,
  WorldCup2026ModelRealitySummary,
  WorldCup2026PredictionCalibrationBucket,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionEvaluationIssue,
  WorldCup2026PredictionSnapshot,
  WorldCup2026PredictionSnapshotScoreline
} from "./schemas.js";

export const WORLD_CUP_2026_EVALUATION_METRIC_VERSION = "wc2026-model-vs-reality-v1";

const CALIBRATION_BUCKETS = [
  { bucketStart: 0, bucketEnd: 0.2 },
  { bucketStart: 0.2, bucketEnd: 0.4 },
  { bucketStart: 0.4, bucketEnd: 0.6 },
  { bucketStart: 0.6, bucketEnd: 0.8 },
  { bucketStart: 0.8, bucketEnd: 1 }
] as const;
const CONFIDENCE_LEVELS: readonly PredictionConfidenceLevel[] = [
  "high",
  "medium",
  "low",
  "very_low"
] as const;
const COVERAGE_TYPES: readonly PredictionCoverageType[] = [
  "full",
  "partial",
  "fallback",
  "fallback_only"
] as const;

interface ResolvedCompletedResult {
  fixtureId: string;
  record: WorldCup2026ExternalFixtureRecord;
}

export interface EvaluateWorldCup2026PredictionSnapshotInput {
  snapshot: WorldCup2026PredictionSnapshot;
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  evaluationStore: PredictionEvaluationStore;
  resultSource?: string;
  cacheUsed?: boolean;
  localFallbackUsed?: boolean;
  evaluatedAt?: string;
}

export interface EvaluateWorldCup2026PredictionSnapshotAsyncInput {
  snapshot: WorldCup2026PredictionSnapshot;
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  evaluationStore: AsyncPredictionEvaluationStore;
  resultSource?: string;
  cacheUsed?: boolean;
  localFallbackUsed?: boolean;
  evaluatedAt?: string;
}

export interface EvaluateWorldCup2026PredictionSnapshotResult {
  status: PredictionEvaluationStatus;
  evaluation?: WorldCup2026PredictionEvaluation;
  issues: readonly WorldCup2026PredictionEvaluationIssue[];
}

interface BuiltWorldCup2026PredictionEvaluation {
  evaluation: WorldCup2026PredictionEvaluation;
  identityKey: string;
}

function makeIssue(
  code: WorldCup2026PredictionEvaluationIssue["code"],
  message: string,
  context: Partial<WorldCup2026PredictionEvaluationIssue> = {}
): WorldCup2026PredictionEvaluationIssue {
  return {
    code,
    message,
    ...context
  };
}

function normalizeOutcomeTeamName(team: string): string {
  return normalizeTeamSearchText(canonicalizeTeamName(team));
}

function resolveFixtureId(
  record: WorldCup2026ExternalFixtureRecord
): { fixtureId?: string; reverseFixtureId?: string } {
  const home = normalizeOutcomeTeamName(record.homeTeam);
  const away = normalizeOutcomeTeamName(record.awayTeam);
  const directById = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
    (fixture) => fixture.id === record.providerFixtureId
  );

  if (directById !== undefined) {
    const directHome = normalizeOutcomeTeamName(directById.homeTeam);
    const directAway = normalizeOutcomeTeamName(directById.awayTeam);

    if (directHome === home && directAway === away) {
      return { fixtureId: directById.id };
    }

    if (directHome === away && directAway === home) {
      return { reverseFixtureId: directById.id };
    }

    return {};
  }

  const directByTeams = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
    (fixture) =>
      normalizeOutcomeTeamName(fixture.homeTeam) === home &&
      normalizeOutcomeTeamName(fixture.awayTeam) === away
  );
  if (directByTeams !== undefined) {
    return { fixtureId: directByTeams.id };
  }

  const reverseByTeams = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
    (fixture) =>
      normalizeOutcomeTeamName(fixture.homeTeam) === away &&
      normalizeOutcomeTeamName(fixture.awayTeam) === home
  );
  if (reverseByTeams !== undefined) {
    return { reverseFixtureId: reverseByTeams.id };
  }

  return {};
}

function validateOutcomeProbabilities(
  snapshot: WorldCup2026PredictionSnapshot
): WorldCup2026PredictionEvaluationIssue | undefined {
  const values = [
    snapshot.prediction.homeWinProbability,
    snapshot.prediction.drawProbability,
    snapshot.prediction.awayWinProbability
  ];

  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    return makeIssue(
      "invalid_snapshot_probabilities",
      "Snapshot probabilities must be finite numbers between 0 and 1.",
      { snapshotId: snapshot.snapshotId, fixtureId: snapshot.fixtureId }
    );
  }

  const total =
    snapshot.prediction.homeWinProbability +
    snapshot.prediction.drawProbability +
    snapshot.prediction.awayWinProbability;

  if (Math.abs(total - 1) > PROBABILITY_SUM_TOLERANCE) {
    return makeIssue(
      "invalid_snapshot_probabilities",
      "Snapshot probabilities must sum to 1 within the project tolerance.",
      { snapshotId: snapshot.snapshotId, fixtureId: snapshot.fixtureId }
    );
  }

  return undefined;
}

export function derivePredictionOutcome(probabilities: {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
}): PredictionOutcome {
  const ordered = [
    { outcome: "home_win" as const, probability: probabilities.homeWinProbability, tieBreak: 0 },
    { outcome: "draw" as const, probability: probabilities.drawProbability, tieBreak: 1 },
    { outcome: "away_win" as const, probability: probabilities.awayWinProbability, tieBreak: 2 }
  ];

  return ordered
    .sort(
      (a, b) => b.probability - a.probability || a.tieBreak - b.tieBreak
    )[0]!.outcome;
}

export function deriveActualOutcome(
  homeGoals: number,
  awayGoals: number
): PredictionOutcome {
  if (homeGoals > awayGoals) {
    return "home_win";
  }
  if (homeGoals < awayGoals) {
    return "away_win";
  }
  return "draw";
}

export function selectTopPredictedScoreline(
  scorelines: readonly WorldCup2026PredictionSnapshotScoreline[]
): WorldCup2026PredictionSnapshotScoreline | undefined {
  return [...scorelines].sort(
    (a, b) =>
      b.probability - a.probability ||
      a.homeGoals + a.awayGoals - (b.homeGoals + b.awayGoals) ||
      a.homeGoals - b.homeGoals ||
      a.awayGoals - b.awayGoals
  )[0];
}

function getOutcomeProbability(
  predicted: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
  },
  outcome: PredictionOutcome
): number {
  switch (outcome) {
    case "home_win":
      return predicted.homeWinProbability;
    case "draw":
      return predicted.drawProbability;
    case "away_win":
      return predicted.awayWinProbability;
  }
}

export function calculateThreeWayBrierScore(probabilities: {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
}, actualOutcome: PredictionOutcome): number {
  const actualHome = actualOutcome === "home_win" ? 1 : 0;
  const actualDraw = actualOutcome === "draw" ? 1 : 0;
  const actualAway = actualOutcome === "away_win" ? 1 : 0;

  return (
    (probabilities.homeWinProbability - actualHome) ** 2 +
    (probabilities.drawProbability - actualDraw) ** 2 +
    (probabilities.awayWinProbability - actualAway) ** 2
  );
}

export function calculateOutcomeLogLoss(probability: number): number {
  const clamped = Math.min(
    Math.max(probability, HISTORICAL_VALIDATION_EPSILON),
    1 - HISTORICAL_VALIDATION_EPSILON
  );
  return -Math.log(clamped);
}

function buildEvaluationIdentityKey(fields: {
  snapshotId: string;
  fixtureId: string;
  providerFixtureId?: string;
  homeGoals: number;
  awayGoals: number;
  resultStatus: string;
  metricVersion: string;
}): string {
  return computeContentHash(fields);
}

export function buildWorldCup2026PredictionEvaluationId(identityKey: string): string {
  return `eval-${identityKey.slice(0, 16)}`;
}

function resolveCompletedResultForSnapshot(
  snapshot: WorldCup2026PredictionSnapshot,
  completedResults: readonly WorldCup2026ExternalFixtureRecord[]
): {
  resolved?: ResolvedCompletedResult;
  issues: readonly WorldCup2026PredictionEvaluationIssue[];
} {
  const exactMatches: ResolvedCompletedResult[] = [];
  const reverseMatches: WorldCup2026ExternalFixtureRecord[] = [];
  const fixtureMismatches: WorldCup2026ExternalFixtureRecord[] = [];
  const unresolvable: WorldCup2026ExternalFixtureRecord[] = [];

  for (const record of completedResults) {
    const resolved = resolveFixtureId(record);

    if (resolved.fixtureId === snapshot.fixtureId) {
      exactMatches.push({ fixtureId: resolved.fixtureId, record });
      continue;
    }

    if (resolved.reverseFixtureId === snapshot.fixtureId) {
      reverseMatches.push(record);
      continue;
    }

    if (record.providerFixtureId === snapshot.fixtureId) {
      fixtureMismatches.push(record);
      continue;
    }

    if (
      resolved.fixtureId === undefined &&
      resolved.reverseFixtureId === undefined &&
      (normalizeOutcomeTeamName(record.homeTeam) ===
        normalizeOutcomeTeamName(snapshot.homeTeam) ||
        normalizeOutcomeTeamName(record.awayTeam) ===
          normalizeOutcomeTeamName(snapshot.awayTeam))
    ) {
      unresolvable.push(record);
    }
  }

  if (exactMatches.length > 1) {
    return {
      issues: [
        makeIssue(
          "duplicate_completed_result",
          `Multiple completed results matched snapshot fixture "${snapshot.fixtureId}".`,
          {
            snapshotId: snapshot.snapshotId,
            fixtureId: snapshot.fixtureId
          }
        )
      ]
    };
  }

  if (exactMatches.length === 1) {
    return exactMatches[0] === undefined
      ? { issues: [] }
      : { resolved: exactMatches[0], issues: [] };
  }

  if (reverseMatches.length > 0) {
    return {
      issues: [
        makeIssue(
          "team_order_mismatch",
          "Completed result matched the same teams but not the official home/away order.",
          {
            snapshotId: snapshot.snapshotId,
            fixtureId: snapshot.fixtureId,
            ...(reverseMatches[0]?.providerFixtureId === undefined
              ? {}
              : { providerFixtureId: reverseMatches[0].providerFixtureId })
          }
        )
      ]
    };
  }

  if (fixtureMismatches.length > 0) {
    return {
      issues: [
        makeIssue(
          "fixture_mismatch",
          "Completed result fixture identity matched but team names did not match the stored snapshot.",
          {
            snapshotId: snapshot.snapshotId,
            fixtureId: snapshot.fixtureId,
            ...(fixtureMismatches[0]?.providerFixtureId === undefined
              ? {}
              : { providerFixtureId: fixtureMismatches[0].providerFixtureId })
          }
        )
      ]
    };
  }

  if (unresolvable.length > 0) {
    return {
      issues: [
        makeIssue(
          "invalid_fixture_identity",
          "Completed result could not be resolved to an official World Cup 2026 fixture identity.",
          {
            snapshotId: snapshot.snapshotId,
            fixtureId: snapshot.fixtureId,
            ...(unresolvable[0]?.providerFixtureId === undefined
              ? {}
              : { providerFixtureId: unresolvable[0].providerFixtureId })
          }
        )
      ]
    };
  }

  return {
    issues: [
      makeIssue(
        "missing_completed_result",
        `No completed result was found for snapshot fixture "${snapshot.fixtureId}".`,
        {
          snapshotId: snapshot.snapshotId,
          fixtureId: snapshot.fixtureId
        }
      )
    ]
  };
}

function averageOrNull(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rateOrNull(items: readonly boolean[]): number | null {
  if (items.length === 0) {
    return null;
  }

  return items.filter(Boolean).length / items.length;
}

function summarizeConfidenceLevel(
  evaluations: readonly WorldCup2026PredictionEvaluation[],
  confidenceLevel: PredictionConfidenceLevel
): WorldCup2026ModelRealityConfidenceSummary {
  const filtered = evaluations.filter(
    (entry) => entry.confidence.level === confidenceLevel
  );

  return {
    confidenceLevel,
    evaluationsCount: filtered.length,
    outcomeAccuracy: rateOrNull(filtered.map((entry) => entry.metrics.outcomeCorrect)),
    meanBrierScore: averageOrNull(filtered.map((entry) => entry.metrics.brierScore)),
    meanLogLoss: averageOrNull(filtered.map((entry) => entry.metrics.logLoss))
  };
}

function summarizeCoverageType(
  evaluations: readonly WorldCup2026PredictionEvaluation[],
  coverageType: PredictionCoverageType
): WorldCup2026ModelRealityCoverageSummary {
  const filtered = evaluations.filter(
    (entry) => entry.confidence.coverageType === coverageType
  );

  return {
    coverageType,
    evaluationsCount: filtered.length,
    outcomeAccuracy: rateOrNull(filtered.map((entry) => entry.metrics.outcomeCorrect)),
    meanBrierScore: averageOrNull(filtered.map((entry) => entry.metrics.brierScore))
  };
}

function summarizeFallbackUsage(
  evaluations: readonly WorldCup2026PredictionEvaluation[],
  fallbackUsed: boolean
): WorldCup2026ModelRealityFallbackSummary {
  const filtered = evaluations.filter(
    (entry) => entry.confidence.fallbackUsed === fallbackUsed
  );

  return {
    evaluationsCount: filtered.length,
    outcomeAccuracy: rateOrNull(filtered.map((entry) => entry.metrics.outcomeCorrect)),
    meanBrierScore: averageOrNull(filtered.map((entry) => entry.metrics.brierScore))
  };
}

export function buildWorldCup2026PredictionCalibrationBuckets(
  evaluations: readonly WorldCup2026PredictionEvaluation[]
): readonly WorldCup2026PredictionCalibrationBucket[] {
  return CALIBRATION_BUCKETS.map(({ bucketStart, bucketEnd }, index) => {
    const bucketed = evaluations.filter((entry) => {
      const probability = entry.metrics.predictedOutcomeProbability;
      if (index === CALIBRATION_BUCKETS.length - 1) {
        return probability >= bucketStart && probability <= bucketEnd;
      }
      return probability >= bucketStart && probability < bucketEnd;
    });

    const meanPredictedProbability = averageOrNull(
      bucketed.map((entry) => entry.metrics.predictedOutcomeProbability)
    );
    const observedFrequency = rateOrNull(
      bucketed.map((entry) => entry.metrics.outcomeCorrect)
    );

    return {
      bucketStart,
      bucketEnd,
      predictionsCount: bucketed.length,
      meanPredictedProbability,
      observedFrequency,
      absoluteCalibrationGap:
        meanPredictedProbability !== null && observedFrequency !== null
          ? Math.abs(meanPredictedProbability - observedFrequency)
          : null
    };
  });
}

export function summarizeWorldCup2026ModelReality(
  evaluations: readonly WorldCup2026PredictionEvaluation[]
): WorldCup2026ModelRealitySummary {
  return {
    evaluationsCount: evaluations.length,
    outcomeAccuracy: rateOrNull(
      evaluations.map((entry) => entry.metrics.outcomeCorrect)
    ),
    drawAccuracy: rateOrNull(evaluations.map((entry) => entry.metrics.drawCorrect)),
    exactScoreAccuracy: rateOrNull(
      evaluations.map((entry) => entry.metrics.exactScoreCorrect)
    ),
    meanHomeGoalAbsoluteError: averageOrNull(
      evaluations.map((entry) => entry.metrics.homeGoalAbsoluteError)
    ),
    meanAwayGoalAbsoluteError: averageOrNull(
      evaluations.map((entry) => entry.metrics.awayGoalAbsoluteError)
    ),
    meanTotalGoalAbsoluteError: averageOrNull(
      evaluations.map((entry) => entry.metrics.totalGoalAbsoluteError)
    ),
    meanGoalDifferenceAbsoluteError: averageOrNull(
      evaluations.map((entry) => entry.metrics.goalDifferenceAbsoluteError)
    ),
    meanBrierScore: averageOrNull(
      evaluations.map((entry) => entry.metrics.brierScore)
    ),
    meanLogLoss: averageOrNull(evaluations.map((entry) => entry.metrics.logLoss)),
    byConfidenceLevel: CONFIDENCE_LEVELS.map((level) =>
      summarizeConfidenceLevel(evaluations, level)
    ),
    byCoverageType: COVERAGE_TYPES.map((coverageType) =>
      summarizeCoverageType(evaluations, coverageType)
    ),
    withFallback: summarizeFallbackUsage(evaluations, true),
    withoutFallback: summarizeFallbackUsage(evaluations, false),
    calibrationBuckets: buildWorldCup2026PredictionCalibrationBuckets(evaluations)
  };
}

function buildEvaluationFromSnapshot(
  input:
    | EvaluateWorldCup2026PredictionSnapshotInput
    | EvaluateWorldCup2026PredictionSnapshotAsyncInput
): EvaluateWorldCup2026PredictionSnapshotResult & {
  built?: BuiltWorldCup2026PredictionEvaluation;
} {
  const snapshot = input.snapshot;

  if (
    snapshot.status !== "pre_match_locked" &&
    snapshot.status !== "foundation_unverified"
  ) {
    return {
      status: "not_eligible",
      issues: [
        makeIssue(
          "unsupported_snapshot_state",
          `Snapshot status "${snapshot.status}" is not eligible for model-vs-reality evaluation.`,
          { snapshotId: snapshot.snapshotId, fixtureId: snapshot.fixtureId }
        )
      ]
    };
  }

  const officialFixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
    (fixture) => fixture.id === snapshot.fixtureId
  );

  if (officialFixture === undefined) {
    return {
      status: "not_eligible",
      issues: [
        makeIssue(
          "invalid_fixture_identity",
          `Snapshot fixture "${snapshot.fixtureId}" is not an official World Cup 2026 fixture.`,
          { snapshotId: snapshot.snapshotId, fixtureId: snapshot.fixtureId }
        )
      ]
    };
  }

  const probabilityIssue = validateOutcomeProbabilities(snapshot);
  if (probabilityIssue !== undefined) {
    return { status: "not_eligible", issues: [probabilityIssue] };
  }

  const completed = resolveCompletedResultForSnapshot(snapshot, input.completedResults);
  if (completed.resolved === undefined) {
    return { status: "not_eligible", issues: completed.issues };
  }

  const { record } = completed.resolved;

  if (record.status !== "finished") {
    return {
      status: "not_eligible",
      issues: [
        makeIssue(
          "live_or_scheduled_status",
          `Completed result for fixture "${snapshot.fixtureId}" is still "${record.status}".`,
          {
            snapshotId: snapshot.snapshotId,
            fixtureId: snapshot.fixtureId,
            providerFixtureId: record.providerFixtureId
          }
        )
      ]
    };
  }

  if (
    !Number.isInteger(record.homeScore) ||
    record.homeScore === undefined ||
    record.homeScore < 0 ||
    !Number.isInteger(record.awayScore) ||
    record.awayScore === undefined ||
    record.awayScore < 0
  ) {
    return {
      status: "not_eligible",
      issues: [
        makeIssue(
          "incomplete_score",
          `Completed result for fixture "${snapshot.fixtureId}" is missing valid final scores.`,
          {
            snapshotId: snapshot.snapshotId,
            fixtureId: snapshot.fixtureId,
            providerFixtureId: record.providerFixtureId
          }
        )
      ]
    };
  }

  const predictedScoreline = selectTopPredictedScoreline(
    snapshot.prediction.mostLikelyScorelines
  );

  if (predictedScoreline === undefined) {
    return {
      status: "not_eligible",
      issues: [
        makeIssue(
          "invalid_snapshot_probabilities",
          "Snapshot must include at least one most-likely scoreline.",
          { snapshotId: snapshot.snapshotId, fixtureId: snapshot.fixtureId }
        )
      ]
    };
  }

  const predictedOutcome = derivePredictionOutcome(snapshot.prediction);
  const actualOutcome = deriveActualOutcome(record.homeScore, record.awayScore);
  const predictedOutcomeProbability = getOutcomeProbability(
    snapshot.prediction,
    predictedOutcome
  );
  const actualOutcomeProbability = getOutcomeProbability(
    snapshot.prediction,
    actualOutcome
  );
  const identityKey = buildEvaluationIdentityKey({
    snapshotId: snapshot.snapshotId,
    fixtureId: snapshot.fixtureId,
    ...(record.providerFixtureId === undefined
      ? {}
      : { providerFixtureId: record.providerFixtureId }),
    homeGoals: record.homeScore,
    awayGoals: record.awayScore,
    resultStatus: record.status,
    metricVersion: WORLD_CUP_2026_EVALUATION_METRIC_VERSION
  });

  const evaluation: WorldCup2026PredictionEvaluation = {
    evaluationId: buildWorldCup2026PredictionEvaluationId(identityKey),
    snapshotId: snapshot.snapshotId,
    fixtureId: snapshot.fixtureId,
    ...(record.providerFixtureId === undefined
      ? {}
      : { providerFixtureId: record.providerFixtureId }),
    evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
    modelVersion: snapshot.modelVersion,
    metricVersion: WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
    predicted: {
      homeExpectedGoals: snapshot.prediction.homeExpectedGoals,
      awayExpectedGoals: snapshot.prediction.awayExpectedGoals,
      homeWinProbability: snapshot.prediction.homeWinProbability,
      drawProbability: snapshot.prediction.drawProbability,
      awayWinProbability: snapshot.prediction.awayWinProbability,
      mostLikelyScorelines: snapshot.prediction.mostLikelyScorelines,
      predictedOutcome,
      predictedScoreline: {
        homeGoals: predictedScoreline.homeGoals,
        awayGoals: predictedScoreline.awayGoals
      }
    },
    actual: {
      homeGoals: record.homeScore,
      awayGoals: record.awayScore,
      outcome: actualOutcome
    },
    metrics: {
      outcomeCorrect: predictedOutcome === actualOutcome,
      drawCorrect: predictedOutcome === "draw" && actualOutcome === "draw",
      exactScoreCorrect:
        predictedScoreline.homeGoals === record.homeScore &&
        predictedScoreline.awayGoals === record.awayScore,
      homeGoalAbsoluteError: Math.abs(
        predictedScoreline.homeGoals - record.homeScore
      ),
      awayGoalAbsoluteError: Math.abs(
        predictedScoreline.awayGoals - record.awayScore
      ),
      totalGoalAbsoluteError: Math.abs(
        predictedScoreline.homeGoals +
          predictedScoreline.awayGoals -
          (record.homeScore + record.awayScore)
      ),
      goalDifferenceAbsoluteError: Math.abs(
        (predictedScoreline.homeGoals - predictedScoreline.awayGoals) -
          (record.homeScore - record.awayScore)
      ),
      brierScore: calculateThreeWayBrierScore(snapshot.prediction, actualOutcome),
      logLoss: calculateOutcomeLogLoss(actualOutcomeProbability),
      predictedOutcomeProbability,
      actualOutcomeProbability
    },
    confidence: {
      level: snapshot.confidence.level,
      coverageType: snapshot.confidence.coverageType,
      fallbackUsed:
        snapshot.inputs.homeUsesFallback || snapshot.inputs.awayUsesFallback
    },
    provenance: {
      snapshotContentHash: snapshot.contentHash,
      ...(input.resultSource === undefined ? {} : { resultSource: input.resultSource }),
      ...(input.cacheUsed === undefined ? {} : { cacheUsed: input.cacheUsed }),
      ...(input.localFallbackUsed === undefined
        ? {}
        : { localFallbackUsed: input.localFallbackUsed }),
      ...(record.updatedAt === undefined ? {} : { completedAt: record.updatedAt })
    }
  };

  return {
    evaluation,
    issues: [],
    status: "evaluated",
    built: {
      evaluation,
      identityKey
    }
  };
}

export function evaluateWorldCup2026PredictionSnapshot(
  input: EvaluateWorldCup2026PredictionSnapshotInput
): EvaluateWorldCup2026PredictionSnapshotResult {
  const built = buildEvaluationFromSnapshot(input);

  if (built.built === undefined || built.evaluation === undefined) {
    return built;
  }

  const storeResult = input.evaluationStore.create(
    built.built.evaluation,
    built.built.identityKey
  );

  return {
    status: storeResult.duplicate ? "duplicate" : "evaluated",
    evaluation: storeResult.evaluation,
    issues: built.issues
  };
}

export async function evaluateWorldCup2026PredictionSnapshotAsync(
  input: EvaluateWorldCup2026PredictionSnapshotAsyncInput
): Promise<EvaluateWorldCup2026PredictionSnapshotResult> {
  const built = buildEvaluationFromSnapshot(input);

  if (built.built === undefined || built.evaluation === undefined) {
    return built;
  }

  const storeResult = await input.evaluationStore.create(
    built.built.evaluation,
    built.built.identityKey
  );

  return {
    status: storeResult.duplicate ? "duplicate" : "evaluated",
    evaluation: storeResult.evaluation,
    issues: built.issues
  };
}
