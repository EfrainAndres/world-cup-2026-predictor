import {
  buildChampionCalibrationBuckets,
  calculateChampionBrierScore,
  calculateChampionLogLoss,
  evaluateHistoricalTournamentPrediction,
  isTeamInTopN,
  summarizeHistoricalTournamentValidations
} from "./historical-validation.js";
import type {
  ActualTournamentResult,
  ChampionCalibrationBucket,
  HistoricalBacktestFixture,
  HistoricalBacktestInput,
  HistoricalBacktestResult,
  HistoricalBacktestSummary,
  HistoricalBacktestYearResult,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentPredictionInput,
  TeamProbabilitySnapshot,
  ValidationMetricSummary
} from "./types.js";

export const PARTIAL_HISTORICAL_BACKTEST_WARNING =
  "Partial historical validation only: current fixtures include semi-finals, third-place matches, and finals for 2018 and 2022.";

const DEFAULT_BACKTEST_TOP_N = 3;
const DEFAULT_CALIBRATION_BUCKET_SIZE = 0.25;

function assertNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function validateTopN(topN: number): void {
  if (!Number.isInteger(topN) || topN < 1) {
    throw new Error("topN must be a positive integer.");
  }
}

function validateFixtureSubset(subset: HistoricalTournamentFixtureSubset): void {
  assertNonEmptyText(subset.tournamentId, "tournament id");
  assertNonEmptyText(subset.tournamentName, "tournament name");

  if (!Number.isInteger(subset.tournamentYear)) {
    throw new Error("tournamentYear must be an integer.");
  }

  if (subset.matches.length === 0) {
    throw new Error("historical fixture subset must include at least one match.");
  }

  assertNonEmptyText(subset.coverageNote, "coverage note");
}

function sortMatchesByStage(matches: readonly HistoricalBacktestFixture[]): HistoricalBacktestFixture[] {
  return [...matches].sort((a, b) => b.stageOrder - a.stageOrder || a.matchDate.localeCompare(b.matchDate) || a.matchId.localeCompare(b.matchId));
}

function getFinalMatch(subset: HistoricalTournamentFixtureSubset): HistoricalBacktestFixture {
  validateFixtureSubset(subset);

  const finalMatch = sortMatchesByStage(subset.matches).find((match) => match.stage === "final");

  if (finalMatch === undefined) {
    throw new Error(`Missing final match for ${subset.tournamentName}.`);
  }

  return finalMatch;
}

export function extractActualChampion(subset: HistoricalTournamentFixtureSubset): string {
  const finalMatch = getFinalMatch(subset);

  if (finalMatch.winner === undefined || finalMatch.winner.trim().length === 0) {
    throw new Error(`Missing champion data for ${subset.tournamentName}.`);
  }

  return finalMatch.winner.trim();
}

export function extractActualRunnerUp(subset: HistoricalTournamentFixtureSubset): string {
  const finalMatch = getFinalMatch(subset);
  const champion = extractActualChampion(subset);
  const teams = [finalMatch.homeTeam, finalMatch.awayTeam];
  const runnerUp = teams.find((team) => team !== champion);

  if (runnerUp === undefined || runnerUp.trim().length === 0) {
    throw new Error(`Missing runner-up data for ${subset.tournamentName}.`);
  }

  return runnerUp;
}

function extractPartialKnockoutTeams(subset: HistoricalTournamentFixtureSubset): string[] {
  return [...new Set(subset.matches.flatMap((match) => [match.homeTeam, match.awayTeam]))].sort((a, b) => a.localeCompare(b));
}

export function buildActualTournamentResultFromFixtureSubset(subset: HistoricalTournamentFixtureSubset): ActualTournamentResult {
  const actual: ActualTournamentResult = {
    tournamentId: subset.tournamentId,
    tournamentName: subset.tournamentName,
    champion: extractActualChampion(subset),
    runnerUp: extractActualRunnerUp(subset),
    knockoutTeams: extractPartialKnockoutTeams(subset),
    metadata: {
      tournamentYear: String(subset.tournamentYear),
      partialDataset: String(subset.isPartial),
      coverageNote: subset.coverageNote
    }
  };

  return actual;
}

function getPredictionForSubset(
  subset: HistoricalTournamentFixtureSubset,
  predictions: readonly HistoricalTournamentPredictionInput[]
): HistoricalTournamentPredictionInput {
  const prediction = predictions.find((entry) => entry.tournamentId === subset.tournamentId);

  if (prediction === undefined) {
    throw new Error(`Missing prediction snapshot for ${subset.tournamentId}.`);
  }

  return prediction;
}

function buildWarnings(subset: HistoricalTournamentFixtureSubset): string[] {
  return subset.isPartial ? [PARTIAL_HISTORICAL_BACKTEST_WARNING, subset.coverageNote] : [];
}

export function evaluateHistoricalBacktestYear(
  subset: HistoricalTournamentFixtureSubset,
  prediction: HistoricalTournamentPredictionInput,
  topN = DEFAULT_BACKTEST_TOP_N
): HistoricalBacktestYearResult {
  validateTopN(topN);
  const actual = buildActualTournamentResultFromFixtureSubset(subset);
  const evaluation = evaluateHistoricalTournamentPrediction(prediction, actual);
  const result: HistoricalBacktestYearResult = {
    tournamentId: subset.tournamentId,
    tournamentName: subset.tournamentName,
    tournamentYear: subset.tournamentYear,
    actual,
    evaluation,
    topN,
    championTopNHit: isTeamInTopN(prediction.championProbabilities, actual.champion, topN),
    isPartial: subset.isPartial,
    warnings: buildWarnings(subset)
  };

  if (prediction.runnerUpProbabilities !== undefined && actual.runnerUp !== undefined) {
    result.runnerUpTopNHit = isTeamInTopN(prediction.runnerUpProbabilities, actual.runnerUp, topN);
  }

  return result;
}

export function calculateBacktestBrierScore(championProbabilities: readonly TeamProbabilitySnapshot[], actualChampion: string): number {
  return calculateChampionBrierScore(championProbabilities, actualChampion);
}

export function calculateBacktestLogLoss(championProbabilities: readonly TeamProbabilitySnapshot[], actualChampion: string): number {
  return calculateChampionLogLoss(championProbabilities, actualChampion);
}

export function generateBacktestCalibrationBuckets(
  predictions: readonly HistoricalTournamentPredictionInput[],
  actualResults: readonly ActualTournamentResult[],
  bucketSize = DEFAULT_CALIBRATION_BUCKET_SIZE
): ChampionCalibrationBucket[] {
  return buildChampionCalibrationBuckets(predictions, actualResults, bucketSize);
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeBacktestResults(
  yearResults: readonly HistoricalBacktestYearResult[],
  validationSummary: ValidationMetricSummary
): HistoricalBacktestSummary {
  const runnerUpTopNHitRate = average(
    yearResults.flatMap((result) => (result.runnerUpTopNHit === undefined ? [] : [result.runnerUpTopNHit ? 1 : 0]))
  );
  const summary: HistoricalBacktestSummary = {
    tournamentCount: yearResults.length,
    years: yearResults.map((result) => result.tournamentYear).sort((a, b) => a - b),
    averageChampionBrierScore: validationSummary.averageChampionBrierScore,
    averageChampionLogLoss: validationSummary.averageChampionLogLoss,
    championTop1HitRate: validationSummary.championTop1HitRate,
    championTop3HitRate: validationSummary.championTop3HitRate,
    championTopNHitRate: yearResults.filter((result) => result.championTopNHit).length / yearResults.length,
    calibrationBuckets: validationSummary.championCalibrationBuckets,
    warnings: [...new Set(yearResults.flatMap((result) => result.warnings))]
  };

  if (validationSummary.runnerUpTop1HitRate !== undefined) {
    summary.runnerUpTop1HitRate = validationSummary.runnerUpTop1HitRate;
  }

  if (validationSummary.runnerUpTop3HitRate !== undefined) {
    summary.runnerUpTop3HitRate = validationSummary.runnerUpTop3HitRate;
  }

  if (runnerUpTopNHitRate !== undefined) {
    summary.runnerUpTopNHitRate = runnerUpTopNHitRate;
  }

  return summary;
}

export function runHistoricalBacktest(input: HistoricalBacktestInput): HistoricalBacktestResult {
  if (input.fixtureSubsets.length === 0) {
    throw new Error("historical backtest requires at least one fixture subset.");
  }

  if (input.predictions.length === 0) {
    throw new Error("historical backtest requires at least one prediction snapshot.");
  }

  const topN = input.topN ?? DEFAULT_BACKTEST_TOP_N;
  const calibrationBucketSize = input.calibrationBucketSize ?? DEFAULT_CALIBRATION_BUCKET_SIZE;
  validateTopN(topN);

  const results = input.fixtureSubsets.map((subset) => evaluateHistoricalBacktestYear(subset, getPredictionForSubset(subset, input.predictions), topN));
  const actualResults = results.map((result) => result.actual);
  const validationResults = results.map((result) => result.evaluation);
  const calibrationBuckets = generateBacktestCalibrationBuckets(input.predictions, actualResults, calibrationBucketSize);
  const validationSummary = summarizeHistoricalTournamentValidations(validationResults, calibrationBuckets);

  return {
    results,
    summary: summarizeBacktestResults(results, validationSummary),
    metadata: {
      fixtureSubsetCount: input.fixtureSubsets.length,
      predictionCount: input.predictions.length,
      isPartialHistoricalValidation: input.fixtureSubsets.some((subset) => subset.isPartial),
      notes: [
        PARTIAL_HISTORICAL_BACKTEST_WARNING,
        "Backtesting output is based on supplied probability snapshots, not trained model predictions.",
        "The current curated fixtures are not complete historical World Cup datasets."
      ]
    }
  };
}
