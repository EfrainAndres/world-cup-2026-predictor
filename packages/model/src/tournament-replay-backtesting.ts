import {
  DEFAULT_HISTORICAL_REPORT_CALIBRATION_BUCKET_SIZE,
  DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES,
  BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING,
  generateHistoricalBacktestingYearReport
} from "./backtesting-reports.js";
import { extractActualChampion, extractActualRunnerUp } from "./backtesting.js";
import { buildChampionCalibrationBuckets } from "./historical-validation.js";
import type {
  ActualTournamentResult,
  ChampionCalibrationBucket,
  HistoricalBacktestingSnapshotType,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentReplayAggregateSummary,
  HistoricalTournamentReplayBacktestResult,
  HistoricalTournamentReplayInput,
  HistoricalTournamentReplayLookAheadStatus,
  HistoricalTournamentReplayMetadata,
  HistoricalTournamentReplaySnapshotInput,
  HistoricalTournamentReplaySnapshotTypeSummary,
  HistoricalTournamentReplayWarning,
  HistoricalTournamentReplayYearInput,
  HistoricalTournamentReplayYearResult,
  HistoricalTournamentReplayWarningCode
} from "./types.js";

export const HISTORICAL_TOURNAMENT_REPLAY_YEARS = [2010, 2014, 2018, 2022] as const;
export const MISSING_LOOKAHEAD_GUARDRAILS_WARNING =
  "Replay snapshot does not include look-ahead guardrail metadata; treat replay results as unaudited.";
export const MODEL_SNAPSHOT_METADATA_MISSING_WARNING =
  "Model-generated replay snapshots should include modelVersion and dataCutoff before public reporting.";

function assertNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function validateReplaySnapshot(snapshot: HistoricalTournamentReplaySnapshotInput): void {
  assertNonEmptyText(snapshot.tournamentId, "snapshot tournament id");
  assertNonEmptyText(snapshot.tournamentName, "snapshot tournament name");

  if (!Number.isInteger(snapshot.tournamentYear)) {
    throw new Error("snapshot tournamentYear must be an integer.");
  }

  if (snapshot.snapshotType === "synthetic_report_fixture") {
    throw new Error("historical tournament replay requires pre-tournament snapshots; synthetic_report_fixture is not allowed.");
  }

  if (snapshot.snapshotType !== "baseline_pre_tournament_snapshot" && snapshot.snapshotType !== "model_generated") {
    throw new Error("replay snapshotType must be baseline_pre_tournament_snapshot or model_generated.");
  }

  if (snapshot.actualTournamentResultsIncluded === true) {
    throw new Error(`Replay snapshot for ${snapshot.tournamentId} must not include actual tournament results.`);
  }
}

function validateReplayYearInput(input: HistoricalTournamentReplayYearInput): void {
  validateReplaySnapshot(input.snapshot);

  if (input.fixtureSubset.tournamentId !== input.snapshot.tournamentId) {
    throw new Error("fixture subset and replay snapshot tournament ids must match.");
  }

  if (input.fixtureSubset.tournamentYear !== input.snapshot.tournamentYear) {
    throw new Error(`Replay snapshot year must match fixture subset year for ${input.fixtureSubset.tournamentId}.`);
  }
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

function buildLookAheadStatus(snapshot: HistoricalTournamentReplaySnapshotInput): HistoricalTournamentReplayLookAheadStatus {
  const guardrails = snapshot.snapshotMetadata?.lookAheadGuardrails ?? [];
  const failedGuardrails = guardrails.filter((guardrail) => !guardrail.passed);

  return {
    passed: guardrails.length > 0 && failedGuardrails.length === 0,
    guardrails,
    errorCount: failedGuardrails.filter((guardrail) => guardrail.severity === "error").length,
    warningCount: failedGuardrails.filter((guardrail) => guardrail.severity === "warning").length
  };
}

function replayWarning(
  code: HistoricalTournamentReplayWarningCode,
  severity: HistoricalTournamentReplayWarning["severity"],
  message: string,
  tournamentYear: number
): HistoricalTournamentReplayWarning {
  return {
    code,
    severity,
    message,
    tournamentYear
  };
}

function buildReplayWarnings(
  snapshot: HistoricalTournamentReplaySnapshotInput,
  subset: HistoricalTournamentFixtureSubset,
  lookAheadStatus: HistoricalTournamentReplayLookAheadStatus
): HistoricalTournamentReplayWarning[] {
  const warnings: HistoricalTournamentReplayWarning[] = [];

  if (snapshot.snapshotType === "baseline_pre_tournament_snapshot") {
    warnings.push(replayWarning("baseline_snapshot", "warning", BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING, subset.tournamentYear));
  }

  if (!subset.isPartial && subset.matches.length !== DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES) {
    warnings.push(
      replayWarning("dataset_incomplete", "warning", "Historical dataset match count does not match the expected complete tournament size.", subset.tournamentYear)
    );
  }

  if (subset.isPartial) {
    warnings.push(replayWarning("dataset_incomplete", "warning", "Historical dataset is marked partial for this tournament.", subset.tournamentYear));
  }

  if (lookAheadStatus.guardrails.length === 0) {
    warnings.push(replayWarning("missing_lookahead_guardrails", "warning", MISSING_LOOKAHEAD_GUARDRAILS_WARNING, subset.tournamentYear));
  }

  for (const guardrail of lookAheadStatus.guardrails.filter((entry) => !entry.passed)) {
    const code = guardrail.severity === "error" ? "lookahead_guardrail_error" : "lookahead_guardrail_warning";
    warnings.push(replayWarning(code, guardrail.severity, guardrail.message, subset.tournamentYear));
  }

  if (snapshot.snapshotType === "model_generated" && (snapshot.modelVersion === undefined || snapshot.dataCutoff === undefined)) {
    warnings.push(replayWarning("model_snapshot_metadata_missing", "warning", MODEL_SNAPSHOT_METADATA_MISSING_WARNING, subset.tournamentYear));
  }

  return warnings;
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error("cannot average an empty value list.");
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueWarnings(warnings: readonly HistoricalTournamentReplayWarning[]): HistoricalTournamentReplayWarning[] {
  const seenWarnings = new Set<string>();
  const unique: HistoricalTournamentReplayWarning[] = [];

  for (const warning of warnings) {
    const key = `${warning.code}|${warning.severity}|${warning.message}`;

    if (seenWarnings.has(key)) continue;

    seenWarnings.add(key);
    unique.push({
      code: warning.code,
      severity: warning.severity,
      message: warning.message
    });
  }

  return unique;
}

function buildSnapshotTypeSummary(results: readonly HistoricalTournamentReplayYearResult[]): HistoricalTournamentReplaySnapshotTypeSummary[] {
  const counts = new Map<HistoricalBacktestingSnapshotType, number>();

  for (const result of results) {
    counts.set(result.snapshotType, (counts.get(result.snapshotType) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([snapshotType, count]) => ({ snapshotType, count }))
    .sort((a, b) => a.snapshotType.localeCompare(b.snapshotType));
}

function buildAggregateSummary(results: readonly HistoricalTournamentReplayYearResult[]): HistoricalTournamentReplayAggregateSummary {
  if (results.length === 0) {
    throw new Error("historical tournament replay summary requires at least one result.");
  }

  return {
    yearsEvaluated: results.map((result) => result.tournamentYear).sort((a, b) => a - b),
    tournamentCount: results.length,
    averageBrierScore: average(results.map((result) => result.brierScore)),
    averageLogLoss: average(results.map((result) => result.logLoss)),
    top1HitRate: results.filter((result) => result.championTop1Hit).length / results.length,
    top3HitRate: results.filter((result) => result.championTop3Hit).length / results.length,
    top5HitRate: results.filter((result) => result.championTop5Hit).length / results.length,
    warnings: uniqueWarnings(results.flatMap((result) => result.warnings)),
    snapshotTypeSummary: buildSnapshotTypeSummary(results)
  };
}

function findSnapshotForSubset(
  subset: HistoricalTournamentFixtureSubset,
  snapshots: readonly HistoricalTournamentReplaySnapshotInput[]
): HistoricalTournamentReplaySnapshotInput {
  const snapshot = snapshots.find((entry) => entry.tournamentId === subset.tournamentId);

  if (snapshot === undefined) {
    throw new Error(`Missing replay snapshot for ${subset.tournamentId}.`);
  }

  return snapshot;
}

function buildCalibrationBuckets(
  fixtureSubsets: readonly HistoricalTournamentFixtureSubset[],
  snapshots: readonly HistoricalTournamentReplaySnapshotInput[],
  calibrationBucketSize: number
): ChampionCalibrationBucket[] {
  const actualResults = fixtureSubsets.map((subset) => buildActualResult(subset));

  return buildChampionCalibrationBuckets(snapshots, actualResults, calibrationBucketSize);
}

export function evaluateHistoricalTournamentReplayYear(input: HistoricalTournamentReplayYearInput): HistoricalTournamentReplayYearResult {
  validateReplayYearInput(input);

  const expectedMatchesPerTournament = input.expectedMatchesPerTournament ?? DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES;
  const calibrationBuckets =
    input.calibrationBuckets ??
    buildChampionCalibrationBuckets([input.snapshot], [buildActualResult(input.fixtureSubset)], DEFAULT_HISTORICAL_REPORT_CALIBRATION_BUCKET_SIZE);
  const report = generateHistoricalBacktestingYearReport(
    input.fixtureSubset,
    input.snapshot,
    calibrationBuckets,
    expectedMatchesPerTournament
  );
  const lookAheadGuardrailStatus = buildLookAheadStatus(input.snapshot);
  const replayResult: HistoricalTournamentReplayYearResult = {
    tournamentId: report.tournamentId,
    tournamentName: report.tournamentName,
    tournamentYear: report.tournamentYear,
    actualChampion: report.actualChampion,
    actualRunnerUp: report.actualRunnerUp,
    snapshotType: report.probabilitySnapshotType,
    championProbability: report.championProbability,
    championRank: report.championProbabilityRank,
    championTop1Hit: report.championTop1Hit,
    championTop3Hit: report.championTop3Hit,
    championTop5Hit: report.championTop5Hit,
    brierScore: report.brierScore,
    logLoss: report.logLoss,
    datasetCompleteness: report.datasetCompleteness,
    lookAheadGuardrailStatus,
    warnings: buildReplayWarnings(input.snapshot, input.fixtureSubset, lookAheadGuardrailStatus)
  };

  if (report.runnerUpProbability !== undefined) {
    replayResult.runnerUpProbability = report.runnerUpProbability;
  }

  if (report.runnerUpProbabilityRank !== undefined) {
    replayResult.runnerUpRank = report.runnerUpProbabilityRank;
  }

  if (report.calibrationBucketSummary !== undefined) {
    replayResult.calibrationBucketSummary = report.calibrationBucketSummary;
  }

  if (report.modelVersion !== undefined) {
    replayResult.modelVersion = report.modelVersion;
  }

  if (report.dataCutoff !== undefined) {
    replayResult.dataCutoff = report.dataCutoff;
  }

  return replayResult;
}

function buildMetadata(input: HistoricalTournamentReplayInput, calibrationBucketSize: number, expectedMatchesPerTournament: number): HistoricalTournamentReplayMetadata {
  return {
    fixtureSubsetCount: input.fixtureSubsets.length,
    snapshotCount: input.snapshots.length,
    expectedMatchesPerTournament,
    calibrationBucketSize,
    notes: [
      "Replay output compares frozen pre-tournament probabilities against actual historical tournament outcomes.",
      "baseline_pre_tournament_snapshot results are baseline replay results, not final model accuracy.",
      "Replay output must not be described as public predictive accuracy until calibrated pre-tournament model snapshots exist."
    ]
  };
}

export function runHistoricalTournamentReplayBacktest(input: HistoricalTournamentReplayInput): HistoricalTournamentReplayBacktestResult {
  if (input.fixtureSubsets.length === 0) {
    throw new Error("historical tournament replay requires at least one fixture subset.");
  }

  if (input.snapshots.length === 0) {
    throw new Error("historical tournament replay requires at least one replay snapshot.");
  }

  const expectedMatchesPerTournament = input.expectedMatchesPerTournament ?? DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES;
  const calibrationBucketSize = input.calibrationBucketSize ?? DEFAULT_HISTORICAL_REPORT_CALIBRATION_BUCKET_SIZE;

  for (const snapshot of input.snapshots) {
    validateReplaySnapshot(snapshot);
  }

  const snapshots = input.fixtureSubsets.map((subset) => findSnapshotForSubset(subset, input.snapshots));
  const calibrationBuckets = buildCalibrationBuckets(input.fixtureSubsets, snapshots, calibrationBucketSize);
  const results = input.fixtureSubsets
    .map((fixtureSubset, index) =>
      evaluateHistoricalTournamentReplayYear({
        fixtureSubset,
        snapshot: snapshots[index]!,
        calibrationBuckets,
        expectedMatchesPerTournament
      })
    )
    .sort((a, b) => a.tournamentYear - b.tournamentYear);

  return {
    results,
    summary: buildAggregateSummary(results),
    metadata: buildMetadata(input, calibrationBucketSize, expectedMatchesPerTournament)
  };
}
