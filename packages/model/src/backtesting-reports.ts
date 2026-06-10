import {
  buildChampionCalibrationBuckets,
  calculateChampionBrierScore,
  calculateChampionLogLoss,
  isTeamInTopN,
  validateProbabilitySnapshot
} from "./historical-validation.js";
import { extractActualChampion, extractActualRunnerUp } from "./backtesting.js";
import { HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING } from "./historical-elo-snapshots.js";
import type {
  ActualTournamentResult,
  ChampionCalibrationBucket,
  HistoricalBacktestingCalibrationBucketSummary,
  HistoricalBacktestingDatasetCompleteness,
  HistoricalBacktestingReport,
  HistoricalBacktestingReportInput,
  HistoricalBacktestingReportPredictionInput,
  HistoricalBacktestingReportSummary,
  HistoricalBacktestingYearReport,
  HistoricalTournamentFixtureSubset,
  TeamProbabilitySnapshot
} from "./types.js";

export const SYNTHETIC_REPORT_FIXTURE_WARNING =
  "Probability snapshot is a synthetic_report_fixture for validating report plumbing, not a real model prediction.";
export const BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING =
  "Probability snapshot is a baseline_pre_tournament_snapshot generated from seed ratings, not a calibrated model forecast.";

export const DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES = 64;
export const DEFAULT_HISTORICAL_REPORT_CALIBRATION_BUCKET_SIZE = 0.25;

function assertNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function validateReportPrediction(prediction: HistoricalBacktestingReportPredictionInput): void {
  assertNonEmptyText(prediction.tournamentId, "prediction tournament id");
  assertNonEmptyText(prediction.tournamentName, "prediction tournament name");

  if (!Number.isInteger(prediction.tournamentYear)) {
    throw new Error("prediction tournamentYear must be an integer.");
  }

  if (
    prediction.snapshotType !== "synthetic_report_fixture" &&
    prediction.snapshotType !== "baseline_pre_tournament_snapshot" &&
    prediction.snapshotType !== "historical_elo_replay_snapshot_foundation" &&
    prediction.snapshotType !== "model_generated"
  ) {
    throw new Error(
      "prediction snapshotType must be synthetic_report_fixture, baseline_pre_tournament_snapshot, historical_elo_replay_snapshot_foundation, or model_generated."
    );
  }

  validateProbabilitySnapshot(prediction.championProbabilities, "champion probability snapshot");

  if (prediction.runnerUpProbabilities !== undefined) {
    validateProbabilitySnapshot(prediction.runnerUpProbabilities, "runner-up probability snapshot");
  }
}

function sortedSnapshot(snapshot: readonly TeamProbabilitySnapshot[]): TeamProbabilitySnapshot[] {
  return [...snapshot].sort((a, b) => b.probability - a.probability || a.team.trim().localeCompare(b.team.trim()));
}

export function getProbabilityRank(snapshot: readonly TeamProbabilitySnapshot[], team: string): number | null {
  validateProbabilitySnapshot(snapshot, "probability snapshot");
  assertNonEmptyText(team, "team");

  const normalizedTeam = team.trim();
  const index = sortedSnapshot(snapshot).findIndex((entry) => entry.team.trim() === normalizedTeam);

  return index === -1 ? null : index + 1;
}

function getProbability(snapshot: readonly TeamProbabilitySnapshot[], team: string): number {
  const normalizedTeam = team.trim();
  const entry = snapshot.find((candidate) => candidate.team.trim() === normalizedTeam);

  return entry?.probability ?? 0;
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error("cannot average an empty value list.");
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function findPredictionForSubset(
  subset: HistoricalTournamentFixtureSubset,
  predictions: readonly HistoricalBacktestingReportPredictionInput[]
): HistoricalBacktestingReportPredictionInput {
  const prediction = predictions.find((entry) => entry.tournamentId === subset.tournamentId);

  if (prediction === undefined) {
    throw new Error(`Missing probability snapshot for ${subset.tournamentId}.`);
  }

  validateReportPrediction(prediction);

  if (prediction.tournamentYear !== subset.tournamentYear) {
    throw new Error(`Prediction year must match fixture subset year for ${subset.tournamentId}.`);
  }

  return prediction;
}

function buildDatasetCompleteness(
  subset: HistoricalTournamentFixtureSubset,
  expectedMatchesPerTournament: number
): HistoricalBacktestingDatasetCompleteness {
  const datasetCompleteness: HistoricalBacktestingDatasetCompleteness = {
    isComplete: !subset.isPartial && subset.matches.length === expectedMatchesPerTournament,
    matchCount: subset.matches.length,
    expectedMatchCount: expectedMatchesPerTournament,
    coverageNote: subset.coverageNote
  };

  if (subset.sourceNote !== undefined) {
    datasetCompleteness.sourceNote = subset.sourceNote;
  }

  return datasetCompleteness;
}

function buildActualResult(subset: HistoricalTournamentFixtureSubset): ActualTournamentResult {
  return {
    tournamentId: subset.tournamentId,
    tournamentName: subset.tournamentName,
    champion: extractActualChampion(subset),
    runnerUp: extractActualRunnerUp(subset),
    metadata: {
      tournamentYear: String(subset.tournamentYear),
      partialDataset: String(subset.isPartial),
      coverageNote: subset.coverageNote
    }
  };
}

function toCalibrationBucketSummary(bucket: ChampionCalibrationBucket | undefined): HistoricalBacktestingCalibrationBucketSummary | undefined {
  if (bucket === undefined) {
    return undefined;
  }

  return {
    bucketStart: bucket.bucketStart,
    bucketEnd: bucket.bucketEnd,
    predictionCount: bucket.predictionCount,
    averagePredictedProbability: bucket.averagePredictedProbability,
    actualRate: bucket.actualRate
  };
}

function findCalibrationBucket(
  buckets: readonly ChampionCalibrationBucket[],
  championProbability: number
): ChampionCalibrationBucket | undefined {
  return buckets.find((bucket) => championProbability >= bucket.bucketStart && championProbability < bucket.bucketEnd);
}

function buildWarnings(
  prediction: HistoricalBacktestingReportPredictionInput,
  datasetCompleteness: HistoricalBacktestingDatasetCompleteness
): string[] {
  const warnings: string[] = [];

  if (prediction.snapshotType === "synthetic_report_fixture") {
    warnings.push(SYNTHETIC_REPORT_FIXTURE_WARNING);
  }

  if (prediction.snapshotType === "baseline_pre_tournament_snapshot") {
    warnings.push(BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING);
  }

  if (prediction.snapshotType === "historical_elo_replay_snapshot_foundation") {
    warnings.push(HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING);
  }

  if (!datasetCompleteness.isComplete) {
    warnings.push("Historical dataset is not complete for this tournament.");
  }

  if (prediction.snapshotType === "model_generated" && (prediction.modelVersion === undefined || prediction.dataCutoff === undefined)) {
    warnings.push("Model-generated snapshots should include modelVersion and dataCutoff before public reporting.");
  }

  return warnings;
}

export function generateHistoricalBacktestingYearReport(
  subset: HistoricalTournamentFixtureSubset,
  prediction: HistoricalBacktestingReportPredictionInput,
  calibrationBuckets: readonly ChampionCalibrationBucket[] = [],
  expectedMatchesPerTournament = DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES
): HistoricalBacktestingYearReport {
  validateReportPrediction(prediction);

  if (prediction.tournamentId !== subset.tournamentId) {
    throw new Error("prediction and fixture subset tournament ids must match.");
  }

  const actualChampion = extractActualChampion(subset);
  const actualRunnerUp = extractActualRunnerUp(subset);
  const championProbability = getProbability(prediction.championProbabilities, actualChampion);
  const runnerUpProbability =
    prediction.runnerUpProbabilities === undefined ? undefined : getProbability(prediction.runnerUpProbabilities, actualRunnerUp);
  const datasetCompleteness = buildDatasetCompleteness(subset, expectedMatchesPerTournament);
  const calibrationBucketSummary = toCalibrationBucketSummary(findCalibrationBucket(calibrationBuckets, championProbability));
  const report: HistoricalBacktestingYearReport = {
    tournamentId: subset.tournamentId,
    tournamentName: subset.tournamentName,
    tournamentYear: subset.tournamentYear,
    actualChampion,
    actualRunnerUp,
    championProbabilityRank: getProbabilityRank(prediction.championProbabilities, actualChampion),
    championProbability,
    championTop1Hit: isTeamInTopN(prediction.championProbabilities, actualChampion, 1),
    championTop3Hit: isTeamInTopN(prediction.championProbabilities, actualChampion, 3),
    championTop5Hit: isTeamInTopN(prediction.championProbabilities, actualChampion, 5),
    brierScore: calculateChampionBrierScore(prediction.championProbabilities, actualChampion),
    logLoss: calculateChampionLogLoss(prediction.championProbabilities, actualChampion),
    datasetCompleteness,
    probabilitySnapshotType: prediction.snapshotType,
    warnings: buildWarnings(prediction, datasetCompleteness)
  };

  if (calibrationBucketSummary !== undefined) {
    report.calibrationBucketSummary = calibrationBucketSummary;
  }

  if (prediction.modelVersion !== undefined) {
    report.modelVersion = prediction.modelVersion;
  }

  if (prediction.dataCutoff !== undefined) {
    report.dataCutoff = prediction.dataCutoff;
  }

  if (prediction.runnerUpProbabilities !== undefined) {
    report.runnerUpProbabilityRank = getProbabilityRank(prediction.runnerUpProbabilities, actualRunnerUp);
  }

  if (runnerUpProbability !== undefined) {
    report.runnerUpProbability = runnerUpProbability;
  }

  return report;
}

function buildReportSummary(reports: readonly HistoricalBacktestingYearReport[]): HistoricalBacktestingReportSummary {
  return {
    yearsEvaluated: reports.map((report) => report.tournamentYear).sort((a, b) => a - b),
    tournamentCount: reports.length,
    averageBrierScore: average(reports.map((report) => report.brierScore)),
    averageLogLoss: average(reports.map((report) => report.logLoss)),
    top1HitRate: reports.filter((report) => report.championTop1Hit).length / reports.length,
    top3HitRate: reports.filter((report) => report.championTop3Hit).length / reports.length,
    top5HitRate: reports.filter((report) => report.championTop5Hit).length / reports.length,
    warnings: [...new Set(reports.flatMap((report) => report.warnings))]
  };
}

export function generateHistoricalBacktestingReport(input: HistoricalBacktestingReportInput): HistoricalBacktestingReport {
  if (input.fixtureSubsets.length === 0) {
    throw new Error("historical backtesting report requires at least one fixture subset.");
  }

  if (input.predictions.length === 0) {
    throw new Error("historical backtesting report requires at least one probability snapshot.");
  }

  const expectedMatchesPerTournament = input.expectedMatchesPerTournament ?? DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES;
  const calibrationBucketSize = input.calibrationBucketSize ?? DEFAULT_HISTORICAL_REPORT_CALIBRATION_BUCKET_SIZE;
  const predictions = input.fixtureSubsets.map((subset) => findPredictionForSubset(subset, input.predictions));
  const actualResults = input.fixtureSubsets.map((subset) => buildActualResult(subset));
  const calibrationBuckets = buildChampionCalibrationBuckets(predictions, actualResults, calibrationBucketSize);
  const reports = input.fixtureSubsets
    .map((subset, index) =>
      generateHistoricalBacktestingYearReport(subset, predictions[index]!, calibrationBuckets, expectedMatchesPerTournament)
    )
    .sort((a, b) => a.tournamentYear - b.tournamentYear);

  return {
    reports,
    summary: buildReportSummary(reports)
  };
}
