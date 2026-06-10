import type {
  ActualTournamentResult,
  ChampionCalibrationBucket,
  HistoricalTournamentEvaluationResult,
  HistoricalTournamentPredictionInput,
  HistoricalValidationResult,
  KnockoutQualificationEvaluationResult,
  RunnerUpEvaluationResult,
  TeamProbabilitySnapshot,
  ValidationMetricSummary
} from "./types.js";

export const HISTORICAL_VALIDATION_EPSILON = 1e-15;

interface CalibrationBucketAccumulator {
  bucketStart: number;
  bucketEnd: number;
  predictedProbabilitySum: number;
  actualCount: number;
  predictionCount: number;
}

function assertNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

export function validateProbabilitySnapshot(snapshot: readonly TeamProbabilitySnapshot[], label = "probability snapshot"): void {
  if (snapshot.length === 0) {
    throw new Error(`${label} must include at least one team.`);
  }

  const seenTeams = new Set<string>();

  for (const entry of snapshot) {
    const team = entry.team.trim();

    if (team.length === 0) {
      throw new Error(`${label} team is required.`);
    }

    if (seenTeams.has(team)) {
      throw new Error(`${label} contains duplicate team: ${team}`);
    }

    if (!Number.isFinite(entry.probability) || entry.probability < 0 || entry.probability > 1) {
      throw new Error(`${label} probabilities must be between 0 and 1.`);
    }

    seenTeams.add(team);
  }
}

function validateActualTournamentResult(actual: ActualTournamentResult): void {
  assertNonEmptyText(actual.tournamentId, "actual tournament id");
  assertNonEmptyText(actual.tournamentName, "actual tournament name");
  assertNonEmptyText(actual.champion, "actual champion");

  if (actual.runnerUp !== undefined) {
    assertNonEmptyText(actual.runnerUp, "actual runner-up");
  }

  if (actual.knockoutTeams !== undefined) {
    const seenTeams = new Set<string>();

    for (const team of actual.knockoutTeams) {
      assertNonEmptyText(team, "actual knockout team");

      if (seenTeams.has(team.trim())) {
        throw new Error(`actual knockout teams contain duplicate team: ${team.trim()}`);
      }

      seenTeams.add(team.trim());
    }
  }
}

function validatePredictionInput(input: HistoricalTournamentPredictionInput): void {
  assertNonEmptyText(input.tournamentId, "prediction tournament id");
  assertNonEmptyText(input.tournamentName, "prediction tournament name");
  validateProbabilitySnapshot(input.championProbabilities, "champion probability snapshot");

  if (input.runnerUpProbabilities !== undefined) {
    validateProbabilitySnapshot(input.runnerUpProbabilities, "runner-up probability snapshot");
  }

  if (input.knockoutQualificationProbabilities !== undefined) {
    validateProbabilitySnapshot(input.knockoutQualificationProbabilities, "knockout qualification probability snapshot");
  }
}

function validateTopN(topN: number): void {
  if (!Number.isInteger(topN) || topN < 1) {
    throw new Error("topN must be a positive integer.");
  }
}

function normalizeTeamName(team: string): string {
  return team.trim();
}

function sortProbabilitySnapshot(snapshot: readonly TeamProbabilitySnapshot[]): TeamProbabilitySnapshot[] {
  return [...snapshot].sort((a, b) => b.probability - a.probability || normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team)));
}

function getTeamProbability(snapshot: readonly TeamProbabilitySnapshot[], team: string): number {
  const normalizedTeam = normalizeTeamName(team);
  const matchedEntry = snapshot.find((entry) => normalizeTeamName(entry.team) === normalizedTeam);

  return matchedEntry?.probability ?? 0;
}

function clampProbability(probability: number, epsilon: number): number {
  return Math.min(Math.max(probability, epsilon), 1 - epsilon);
}

export function calculateChampionBrierScore(
  championProbabilities: readonly TeamProbabilitySnapshot[],
  actualChampion: string
): number {
  validateProbabilitySnapshot(championProbabilities, "champion probability snapshot");
  assertNonEmptyText(actualChampion, "actual champion");

  const normalizedActualChampion = normalizeTeamName(actualChampion);
  const actualChampionProbabilityExists = championProbabilities.some((entry) => normalizeTeamName(entry.team) === normalizedActualChampion);
  const snapshotScore = championProbabilities.reduce((sum, entry) => {
    const actualOutcome = normalizeTeamName(entry.team) === normalizedActualChampion ? 1 : 0;
    const error = entry.probability - actualOutcome;

    return sum + error * error;
  }, 0);

  return actualChampionProbabilityExists ? snapshotScore : snapshotScore + 1;
}

export function calculateChampionLogLoss(
  championProbabilities: readonly TeamProbabilitySnapshot[],
  actualChampion: string,
  epsilon = HISTORICAL_VALIDATION_EPSILON
): number {
  validateProbabilitySnapshot(championProbabilities, "champion probability snapshot");
  assertNonEmptyText(actualChampion, "actual champion");

  if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 0.5) {
    throw new Error("epsilon must be greater than 0 and less than 0.5.");
  }

  return -Math.log(clampProbability(getTeamProbability(championProbabilities, actualChampion), epsilon));
}

export function isTeamInTopN(snapshot: readonly TeamProbabilitySnapshot[], team: string, topN: number): boolean {
  validateProbabilitySnapshot(snapshot, "probability snapshot");
  assertNonEmptyText(team, "team");
  validateTopN(topN);

  return sortProbabilitySnapshot(snapshot)
    .slice(0, topN)
    .some((entry) => normalizeTeamName(entry.team) === normalizeTeamName(team));
}

export function evaluateRunnerUpPrediction(
  runnerUpProbabilities: readonly TeamProbabilitySnapshot[],
  actualRunnerUp: string
): RunnerUpEvaluationResult {
  validateProbabilitySnapshot(runnerUpProbabilities, "runner-up probability snapshot");
  assertNonEmptyText(actualRunnerUp, "actual runner-up");

  return {
    actualRunnerUp,
    probability: getTeamProbability(runnerUpProbabilities, actualRunnerUp),
    top1Hit: isTeamInTopN(runnerUpProbabilities, actualRunnerUp, 1),
    top3Hit: isTeamInTopN(runnerUpProbabilities, actualRunnerUp, 3)
  };
}

export function evaluateKnockoutQualificationPrediction(
  knockoutQualificationProbabilities: readonly TeamProbabilitySnapshot[],
  actualKnockoutTeams: readonly string[]
): KnockoutQualificationEvaluationResult {
  validateProbabilitySnapshot(knockoutQualificationProbabilities, "knockout qualification probability snapshot");

  if (actualKnockoutTeams.length === 0) {
    throw new Error("actual knockout teams must include at least one team.");
  }

  const seenActualTeams = new Set<string>();

  for (const team of actualKnockoutTeams) {
    assertNonEmptyText(team, "actual knockout team");

    if (seenActualTeams.has(team.trim())) {
      throw new Error(`actual knockout teams contain duplicate team: ${team.trim()}`);
    }

    seenActualTeams.add(team.trim());
  }

  const predictedQualifiers = new Set(
    sortProbabilitySnapshot(knockoutQualificationProbabilities)
      .slice(0, actualKnockoutTeams.length)
      .map((entry) => normalizeTeamName(entry.team))
  );
  const hitCount = actualKnockoutTeams.filter((team) => predictedQualifiers.has(normalizeTeamName(team))).length;

  return {
    evaluatedTeams: actualKnockoutTeams.length,
    hitCount,
    hitRate: hitCount / actualKnockoutTeams.length
  };
}

export function evaluateHistoricalTournamentPrediction(
  input: HistoricalTournamentPredictionInput,
  actual: ActualTournamentResult
): HistoricalTournamentEvaluationResult {
  validatePredictionInput(input);
  validateActualTournamentResult(actual);

  if (input.tournamentId !== actual.tournamentId) {
    throw new Error("prediction and actual tournament ids must match.");
  }

  const evaluation: HistoricalTournamentEvaluationResult = {
    tournamentId: actual.tournamentId,
    tournamentName: actual.tournamentName,
    actualChampion: actual.champion,
    championProbability: getTeamProbability(input.championProbabilities, actual.champion),
    championBrierScore: calculateChampionBrierScore(input.championProbabilities, actual.champion),
    championLogLoss: calculateChampionLogLoss(input.championProbabilities, actual.champion),
    championTop1Hit: isTeamInTopN(input.championProbabilities, actual.champion, 1),
    championTop3Hit: isTeamInTopN(input.championProbabilities, actual.champion, 3)
  };

  if (input.runnerUpProbabilities !== undefined && actual.runnerUp !== undefined) {
    evaluation.runnerUpEvaluation = evaluateRunnerUpPrediction(input.runnerUpProbabilities, actual.runnerUp);
  }

  if (input.knockoutQualificationProbabilities !== undefined && actual.knockoutTeams !== undefined) {
    evaluation.knockoutQualificationEvaluation = evaluateKnockoutQualificationPrediction(
      input.knockoutQualificationProbabilities,
      actual.knockoutTeams
    );
  }

  return evaluation;
}

export function buildChampionCalibrationBuckets(
  predictions: readonly HistoricalTournamentPredictionInput[],
  actualResults: readonly ActualTournamentResult[],
  bucketSize = 0.25
): ChampionCalibrationBucket[] {
  if (!Number.isFinite(bucketSize) || bucketSize <= 0 || bucketSize > 1) {
    throw new Error("bucketSize must be greater than 0 and no more than 1.");
  }

  const actualByTournamentId = new Map(actualResults.map((actual) => [actual.tournamentId, actual]));
  const buckets = new Map<number, CalibrationBucketAccumulator>();

  for (const prediction of predictions) {
    validatePredictionInput(prediction);
    const actual = actualByTournamentId.get(prediction.tournamentId);

    if (actual === undefined) {
      throw new Error(`Missing actual result for tournament: ${prediction.tournamentId}`);
    }

    validateActualTournamentResult(actual);

    for (const entry of prediction.championProbabilities) {
      const bucketIndex = Math.min(Math.floor(entry.probability / bucketSize), Math.ceil(1 / bucketSize) - 1);
      const bucketStart = bucketIndex * bucketSize;
      const bucketEnd = Math.min(bucketStart + bucketSize, 1);
      const existingBucket =
        buckets.get(bucketIndex) ??
        {
          bucketStart,
          bucketEnd,
          predictedProbabilitySum: 0,
          actualCount: 0,
          predictionCount: 0
        };

      existingBucket.predictedProbabilitySum += entry.probability;
      existingBucket.actualCount += normalizeTeamName(entry.team) === normalizeTeamName(actual.champion) ? 1 : 0;
      existingBucket.predictionCount += 1;
      buckets.set(bucketIndex, existingBucket);
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      bucketStart: bucket.bucketStart,
      bucketEnd: bucket.bucketEnd,
      predictionCount: bucket.predictionCount,
      averagePredictedProbability: bucket.predictedProbabilitySum / bucket.predictionCount,
      actualRate: bucket.actualCount / bucket.predictionCount
    }))
    .sort((a, b) => a.bucketStart - b.bucketStart);
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeHistoricalTournamentValidations(
  evaluations: readonly HistoricalTournamentEvaluationResult[],
  championCalibrationBuckets: readonly ChampionCalibrationBucket[] = []
): ValidationMetricSummary {
  if (evaluations.length === 0) {
    throw new Error("historical validation summary requires at least one evaluation.");
  }

  const runnerUpEvaluations = evaluations
    .map((evaluation) => evaluation.runnerUpEvaluation)
    .filter((evaluation): evaluation is RunnerUpEvaluationResult => evaluation !== undefined);
  const knockoutEvaluations = evaluations
    .map((evaluation) => evaluation.knockoutQualificationEvaluation)
    .filter((evaluation): evaluation is KnockoutQualificationEvaluationResult => evaluation !== undefined);
  const runnerUpTop1HitRate = average(runnerUpEvaluations.map((evaluation) => (evaluation.top1Hit ? 1 : 0)));
  const runnerUpTop3HitRate = average(runnerUpEvaluations.map((evaluation) => (evaluation.top3Hit ? 1 : 0)));
  const averageKnockoutQualificationHitRate = average(knockoutEvaluations.map((evaluation) => evaluation.hitRate));
  const summary: ValidationMetricSummary = {
    tournamentCount: evaluations.length,
    averageChampionBrierScore: evaluations.reduce((sum, evaluation) => sum + evaluation.championBrierScore, 0) / evaluations.length,
    averageChampionLogLoss: evaluations.reduce((sum, evaluation) => sum + evaluation.championLogLoss, 0) / evaluations.length,
    championTop1HitRate: evaluations.filter((evaluation) => evaluation.championTop1Hit).length / evaluations.length,
    championTop3HitRate: evaluations.filter((evaluation) => evaluation.championTop3Hit).length / evaluations.length,
    championCalibrationBuckets: [...championCalibrationBuckets]
  };

  if (runnerUpTop1HitRate !== undefined) {
    summary.runnerUpTop1HitRate = runnerUpTop1HitRate;
  }

  if (runnerUpTop3HitRate !== undefined) {
    summary.runnerUpTop3HitRate = runnerUpTop3HitRate;
  }

  if (averageKnockoutQualificationHitRate !== undefined) {
    summary.averageKnockoutQualificationHitRate = averageKnockoutQualificationHitRate;
  }

  return summary;
}

export function validateHistoricalTournaments(
  predictions: readonly HistoricalTournamentPredictionInput[],
  actualResults: readonly ActualTournamentResult[]
): HistoricalValidationResult {
  if (predictions.length === 0) {
    throw new Error("historical validation requires at least one prediction.");
  }

  if (actualResults.length === 0) {
    throw new Error("historical validation requires at least one actual result.");
  }

  const actualByTournamentId = new Map(actualResults.map((actual) => [actual.tournamentId, actual]));
  const results = predictions.map((prediction) => {
    const actual = actualByTournamentId.get(prediction.tournamentId);

    if (actual === undefined) {
      throw new Error(`Missing actual result for tournament: ${prediction.tournamentId}`);
    }

    return evaluateHistoricalTournamentPrediction(prediction, actual);
  });

  return {
    results,
    summary: summarizeHistoricalTournamentValidations(results, buildChampionCalibrationBuckets(predictions, actualResults))
  };
}
