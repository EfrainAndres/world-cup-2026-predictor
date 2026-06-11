import { DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES } from "./backtesting-reports.js";
import { HISTORICAL_TOURNAMENT_REPLAY_YEARS } from "./tournament-replay-backtesting.js";
import type {
  GeneratedHistoricalEloSnapshot,
  HistoricalMonteCarloReplayYearResult,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentReplayYearResult
} from "./types.js";
import type { ReconstructedHistoricalBracket } from "./historical-brackets.js";

export const COMPLETE_HISTORICAL_REPLAY_VALIDATION_VERSION = "complete-historical-replay-validation-v1";
export const COMPLETE_HISTORICAL_REPLAY_FOUNDATION_WARNING =
  "Complete historical replay validation is an audit foundation and must not be described as final predictive accuracy.";
export const COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS = HISTORICAL_TOURNAMENT_REPLAY_YEARS;

export type CompleteHistoricalReplayValidationStatus = "pass" | "warning" | "fail";
export type CompleteHistoricalReplayValidationComponent =
  | "dataset"
  | "bracket_reconstruction"
  | "elo_snapshot_replay"
  | "monte_carlo_replay"
  | "replay_backtesting_report";

export type CompleteHistoricalReplayValidationWarningCode =
  | "foundation_only_validation"
  | "dataset_missing"
  | "dataset_incomplete"
  | "bracket_missing"
  | "bracket_invalid"
  | "elo_snapshot_missing"
  | "elo_snapshot_foundation_only"
  | "elo_snapshot_lookahead_guardrail_failed"
  | "monte_carlo_replay_missing"
  | "monte_carlo_foundation_only"
  | "replay_backtesting_report_missing"
  | "replay_backtesting_report_incomplete";

export interface CompleteHistoricalReplayValidationWarning {
  code: CompleteHistoricalReplayValidationWarningCode;
  severity: "info" | "warning" | "error";
  message: string;
  tournamentYear?: number;
  component?: CompleteHistoricalReplayValidationComponent;
}

export interface CompleteHistoricalReplayComponentStatus {
  component: CompleteHistoricalReplayValidationComponent;
  available: boolean;
  status: CompleteHistoricalReplayValidationStatus;
  details: Record<string, string | number | boolean>;
  warnings: readonly CompleteHistoricalReplayValidationWarning[];
}

export interface CompleteHistoricalReplayYearValidation {
  tournamentYear: number;
  status: CompleteHistoricalReplayValidationStatus;
  dataset: CompleteHistoricalReplayComponentStatus;
  bracketReconstruction: CompleteHistoricalReplayComponentStatus;
  eloSnapshotReplay: CompleteHistoricalReplayComponentStatus;
  monteCarloReplay: CompleteHistoricalReplayComponentStatus;
  replayBacktestingReport: CompleteHistoricalReplayComponentStatus;
  warnings: readonly CompleteHistoricalReplayValidationWarning[];
}

export interface CompleteHistoricalReplayAggregateValidation {
  status: CompleteHistoricalReplayValidationStatus;
  expectedYears: number[];
  yearsEvaluated: number[];
  yearsMissing: number[];
  allExpectedYearsEvaluated: boolean;
  datasetCompletenessAvailable: boolean;
  bracketReconstructionAvailable: boolean;
  eloSnapshotReplayAvailable: boolean;
  monteCarloReplayAvailable: boolean;
  replayBacktestingReportAvailable: boolean;
  warningCount: number;
  errorCount: number;
  warnings: readonly CompleteHistoricalReplayValidationWarning[];
}

export interface CompleteHistoricalReplayValidationMetadata {
  validationVersion: string;
  expectedMatchesPerTournament: number;
  notes: readonly string[];
}

export interface CompleteHistoricalReplayValidationInput {
  fixtureSubsets: readonly HistoricalTournamentFixtureSubset[];
  brackets: readonly ReconstructedHistoricalBracket[];
  eloSnapshots: readonly GeneratedHistoricalEloSnapshot[];
  monteCarloReplayResults: readonly HistoricalMonteCarloReplayYearResult[];
  replayBacktestingReports: readonly HistoricalTournamentReplayYearResult[];
  expectedYears?: readonly number[];
  expectedMatchesPerTournament?: number;
}

export interface CompleteHistoricalReplayValidationResult {
  years: readonly CompleteHistoricalReplayYearValidation[];
  aggregate: CompleteHistoricalReplayAggregateValidation;
  metadata: CompleteHistoricalReplayValidationMetadata;
}

function validationWarning(
  code: CompleteHistoricalReplayValidationWarningCode,
  severity: CompleteHistoricalReplayValidationWarning["severity"],
  message: string,
  tournamentYear?: number,
  component?: CompleteHistoricalReplayValidationComponent
): CompleteHistoricalReplayValidationWarning {
  const warning: CompleteHistoricalReplayValidationWarning = {
    code,
    severity,
    message
  };

  if (tournamentYear !== undefined) {
    warning.tournamentYear = tournamentYear;
  }

  if (component !== undefined) {
    warning.component = component;
  }

  return warning;
}

function statusFromWarnings(warnings: readonly CompleteHistoricalReplayValidationWarning[]): CompleteHistoricalReplayValidationStatus {
  if (warnings.some((warning) => warning.severity === "error")) {
    return "fail";
  }

  if (warnings.length > 0) {
    return "warning";
  }

  return "pass";
}

function componentStatus(
  component: CompleteHistoricalReplayValidationComponent,
  available: boolean,
  details: Record<string, string | number | boolean>,
  warnings: readonly CompleteHistoricalReplayValidationWarning[]
): CompleteHistoricalReplayComponentStatus {
  return {
    component,
    available,
    status: available ? statusFromWarnings(warnings) : "fail",
    details,
    warnings
  };
}

function uniqueWarnings(
  warnings: readonly CompleteHistoricalReplayValidationWarning[]
): CompleteHistoricalReplayValidationWarning[] {
  const seen = new Set<string>();
  const unique: CompleteHistoricalReplayValidationWarning[] = [];

  for (const warning of warnings) {
    const key = `${warning.code}|${warning.severity}|${warning.message}|${warning.tournamentYear ?? ""}|${warning.component ?? ""}`;

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(warning);
  }

  return unique;
}

function validateExpectedYears(expectedYears: readonly number[]): number[] {
  if (expectedYears.length === 0) {
    throw new Error("expectedYears must include at least one tournament year.");
  }

  const seenYears = new Set<number>();

  for (const year of expectedYears) {
    if (!Number.isInteger(year)) {
      throw new Error("expectedYears must contain only integers.");
    }

    if (seenYears.has(year)) {
      throw new Error(`duplicate expected year: ${year}`);
    }

    seenYears.add(year);
  }

  return [...expectedYears].sort((a, b) => a - b);
}

function findByYear<T>(entries: readonly T[], year: number, getYear: (entry: T) => number): T | undefined {
  return entries.find((entry) => getYear(entry) === year);
}

function validateDatasetStatus(
  year: number,
  fixtureSubset: HistoricalTournamentFixtureSubset | undefined,
  expectedMatchesPerTournament: number
): CompleteHistoricalReplayComponentStatus {
  if (fixtureSubset === undefined) {
    return componentStatus(
      "dataset",
      false,
      { expectedMatchCount: expectedMatchesPerTournament },
      [validationWarning("dataset_missing", "error", `Missing historical fixture subset for ${year}.`, year, "dataset")]
    );
  }

  const warnings: CompleteHistoricalReplayValidationWarning[] = [];
  const isComplete = !fixtureSubset.isPartial && fixtureSubset.matches.length === expectedMatchesPerTournament;

  if (!isComplete) {
    warnings.push(
      validationWarning(
        "dataset_incomplete",
        "error",
        `Historical fixture subset for ${year} is incomplete.`,
        year,
        "dataset"
      )
    );
  }

  return componentStatus(
    "dataset",
    true,
    {
      tournamentId: fixtureSubset.tournamentId,
      matchCount: fixtureSubset.matches.length,
      expectedMatchCount: expectedMatchesPerTournament,
      isPartial: fixtureSubset.isPartial,
      isComplete
    },
    warnings
  );
}

function validateBracketStatus(
  year: number,
  bracket: ReconstructedHistoricalBracket | undefined
): CompleteHistoricalReplayComponentStatus {
  if (bracket === undefined) {
    return componentStatus(
      "bracket_reconstruction",
      false,
      {},
      [
        validationWarning(
          "bracket_missing",
          "error",
          `Missing reconstructed historical bracket for ${year}.`,
          year,
          "bracket_reconstruction"
        )
      ]
    );
  }

  const warnings: CompleteHistoricalReplayValidationWarning[] = [];

  if (!bracket.validation.valid) {
    warnings.push(
      validationWarning(
        "bracket_invalid",
        "error",
        `Reconstructed historical bracket for ${year} is invalid.`,
        year,
        "bracket_reconstruction"
      )
    );
  }

  if (bracket.warnings.length > 0) {
    warnings.push(
      validationWarning(
        "foundation_only_validation",
        "warning",
        "Historical bracket reconstruction still uses simplified tie-breakers and result-level fixtures.",
        year,
        "bracket_reconstruction"
      )
    );
  }

  return componentStatus(
    "bracket_reconstruction",
    true,
    {
      tournamentFormat: bracket.tournamentFormat,
      groupCount: bracket.metadata.groupCount,
      teamsCount: bracket.metadata.teamsCount,
      champion: bracket.champion,
      runnerUp: bracket.runnerUp,
      thirdPlace: bracket.thirdPlace ?? "unknown"
    },
    warnings
  );
}

function validateEloSnapshotStatus(
  year: number,
  snapshot: GeneratedHistoricalEloSnapshot | undefined
): CompleteHistoricalReplayComponentStatus {
  if (snapshot === undefined) {
    return componentStatus(
      "elo_snapshot_replay",
      false,
      {},
      [
        validationWarning(
          "elo_snapshot_missing",
          "error",
          `Missing historical Elo snapshot replay output for ${year}.`,
          year,
          "elo_snapshot_replay"
        )
      ]
    );
  }

  const warnings: CompleteHistoricalReplayValidationWarning[] = [];
  const failedGuardrails = snapshot.snapshotMetadata.lookAheadGuardrails.filter((guardrail) => !guardrail.passed);

  if (snapshot.snapshotMetadata.dataCoverage !== "complete_international_history") {
    warnings.push(
      validationWarning(
        "elo_snapshot_foundation_only",
        "warning",
        "Historical Elo snapshot uses foundation data coverage, not complete international match history.",
        year,
        "elo_snapshot_replay"
      )
    );
  }

  if (failedGuardrails.length > 0) {
    warnings.push(
      validationWarning(
        "elo_snapshot_lookahead_guardrail_failed",
        failedGuardrails.some((guardrail) => guardrail.severity === "error") ? "error" : "warning",
        `Historical Elo snapshot for ${year} has failed look-ahead guardrails.`,
        year,
        "elo_snapshot_replay"
      )
    );
  }

  return componentStatus(
    "elo_snapshot_replay",
    true,
    {
      snapshotType: snapshot.snapshotType,
      dataCoverage: snapshot.snapshotMetadata.dataCoverage,
      targetTeamCount: snapshot.snapshotMetadata.targetTeamCount,
      matchesUsed: snapshot.snapshotMetadata.matchesUsed,
      matchesIgnoredAfterCutoff: snapshot.snapshotMetadata.matchesIgnoredAfterCutoff,
      guardrailCount: snapshot.snapshotMetadata.lookAheadGuardrails.length,
      failedGuardrailCount: failedGuardrails.length
    },
    warnings
  );
}

function validateMonteCarloStatus(
  year: number,
  monteCarloReplay: HistoricalMonteCarloReplayYearResult | undefined
): CompleteHistoricalReplayComponentStatus {
  if (monteCarloReplay === undefined) {
    return componentStatus(
      "monte_carlo_replay",
      false,
      {},
      [
        validationWarning(
          "monte_carlo_replay_missing",
          "error",
          `Missing historical Monte Carlo replay output for ${year}.`,
          year,
          "monte_carlo_replay"
        )
      ]
    );
  }

  const warnings: CompleteHistoricalReplayValidationWarning[] = [
    validationWarning(
      "monte_carlo_foundation_only",
      "warning",
      "Historical Monte Carlo replay uses uncalibrated foundation simulation assumptions.",
      year,
      "monte_carlo_replay"
    )
  ];

  return componentStatus(
    "monte_carlo_replay",
    true,
    {
      simulationCount: monteCarloReplay.simulationCount,
      snapshotType: monteCarloReplay.snapshotType,
      championProbability: monteCarloReplay.championProbability,
      championRank: monteCarloReplay.championRank ?? "not_ranked",
      brierScore: monteCarloReplay.brierScore,
      logLoss: monteCarloReplay.logLoss,
      warningCount: monteCarloReplay.warnings.length
    },
    warnings
  );
}

function validateReplayBacktestingReportStatus(
  year: number,
  replayBacktestingReport: HistoricalTournamentReplayYearResult | undefined
): CompleteHistoricalReplayComponentStatus {
  if (replayBacktestingReport === undefined) {
    return componentStatus(
      "replay_backtesting_report",
      false,
      {},
      [
        validationWarning(
          "replay_backtesting_report_missing",
          "error",
          `Missing replay backtesting report for ${year}.`,
          year,
          "replay_backtesting_report"
        )
      ]
    );
  }

  const warnings: CompleteHistoricalReplayValidationWarning[] = [];

  if (!replayBacktestingReport.datasetCompleteness.isComplete) {
    warnings.push(
      validationWarning(
        "replay_backtesting_report_incomplete",
        "error",
        `Replay backtesting report for ${year} is based on incomplete dataset coverage.`,
        year,
        "replay_backtesting_report"
      )
    );
  }

  if (replayBacktestingReport.warnings.length > 0) {
    warnings.push(
      validationWarning(
        "foundation_only_validation",
        "warning",
        "Replay backtesting report includes foundation-only warnings and is not a public accuracy claim.",
        year,
        "replay_backtesting_report"
      )
    );
  }

  return componentStatus(
    "replay_backtesting_report",
    true,
    {
      snapshotType: replayBacktestingReport.snapshotType,
      datasetComplete: replayBacktestingReport.datasetCompleteness.isComplete,
      championProbability: replayBacktestingReport.championProbability,
      championRank: replayBacktestingReport.championRank ?? "not_ranked",
      brierScore: replayBacktestingReport.brierScore,
      logLoss: replayBacktestingReport.logLoss,
      lookAheadGuardrailsPassed: replayBacktestingReport.lookAheadGuardrailStatus.passed
    },
    warnings
  );
}

function combineYearStatus(statuses: readonly CompleteHistoricalReplayComponentStatus[]): CompleteHistoricalReplayValidationStatus {
  if (statuses.some((status) => status.status === "fail")) {
    return "fail";
  }

  if (statuses.some((status) => status.status === "warning")) {
    return "warning";
  }

  return "pass";
}

function validateYear(
  year: number,
  input: CompleteHistoricalReplayValidationInput,
  expectedMatchesPerTournament: number
): CompleteHistoricalReplayYearValidation {
  const fixtureSubset = findByYear(input.fixtureSubsets, year, (entry) => entry.tournamentYear);
  const bracket = findByYear(input.brackets, year, (entry) => entry.tournamentYear);
  const eloSnapshot = findByYear(input.eloSnapshots, year, (entry) => entry.tournamentYear);
  const monteCarloReplay = findByYear(input.monteCarloReplayResults, year, (entry) => entry.tournamentYear);
  const replayBacktestingReport = findByYear(input.replayBacktestingReports, year, (entry) => entry.tournamentYear);
  const dataset = validateDatasetStatus(year, fixtureSubset, expectedMatchesPerTournament);
  const bracketReconstruction = validateBracketStatus(year, bracket);
  const eloSnapshotReplay = validateEloSnapshotStatus(year, eloSnapshot);
  const monteCarloStatus = validateMonteCarloStatus(year, monteCarloReplay);
  const replayBacktestingStatus = validateReplayBacktestingReportStatus(year, replayBacktestingReport);
  const componentStatuses = [dataset, bracketReconstruction, eloSnapshotReplay, monteCarloStatus, replayBacktestingStatus];
  const warnings = uniqueWarnings([
    validationWarning(
      "foundation_only_validation",
      "info",
      COMPLETE_HISTORICAL_REPLAY_FOUNDATION_WARNING,
      year
    ),
    ...componentStatuses.flatMap((status) => status.warnings)
  ]);

  return {
    tournamentYear: year,
    status: combineYearStatus(componentStatuses),
    dataset,
    bracketReconstruction,
    eloSnapshotReplay,
    monteCarloReplay: monteCarloStatus,
    replayBacktestingReport: replayBacktestingStatus,
    warnings
  };
}

function summarizeAggregate(
  years: readonly CompleteHistoricalReplayYearValidation[],
  expectedYears: readonly number[]
): CompleteHistoricalReplayAggregateValidation {
  const yearsEvaluated = years.map((year) => year.tournamentYear).sort((a, b) => a - b);
  const yearsMissing = expectedYears.filter((year) => !yearsEvaluated.includes(year));
  const warnings = uniqueWarnings([
    validationWarning("foundation_only_validation", "info", COMPLETE_HISTORICAL_REPLAY_FOUNDATION_WARNING),
    ...years.flatMap((year) => year.warnings)
  ]);
  const errorCount = warnings.filter((warning) => warning.severity === "error").length;
  const warningCount = warnings.filter((warning) => warning.severity === "warning").length;

  return {
    status: years.some((year) => year.status === "fail") || yearsMissing.length > 0 ? "fail" : years.some((year) => year.status === "warning") ? "warning" : "pass",
    expectedYears: [...expectedYears],
    yearsEvaluated,
    yearsMissing,
    allExpectedYearsEvaluated: yearsMissing.length === 0 && yearsEvaluated.length === expectedYears.length,
    datasetCompletenessAvailable: years.every((year) => year.dataset.available && year.dataset.status !== "fail"),
    bracketReconstructionAvailable: years.every((year) => year.bracketReconstruction.available && year.bracketReconstruction.status !== "fail"),
    eloSnapshotReplayAvailable: years.every((year) => year.eloSnapshotReplay.available && year.eloSnapshotReplay.status !== "fail"),
    monteCarloReplayAvailable: years.every((year) => year.monteCarloReplay.available && year.monteCarloReplay.status !== "fail"),
    replayBacktestingReportAvailable: years.every((year) => year.replayBacktestingReport.available && year.replayBacktestingReport.status !== "fail"),
    warningCount,
    errorCount,
    warnings
  };
}

export function validateCompleteHistoricalReplay(
  input: CompleteHistoricalReplayValidationInput
): CompleteHistoricalReplayValidationResult {
  const expectedYears = validateExpectedYears(input.expectedYears ?? COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS);
  const expectedMatchesPerTournament = input.expectedMatchesPerTournament ?? DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES;

  if (!Number.isInteger(expectedMatchesPerTournament) || expectedMatchesPerTournament <= 0) {
    throw new Error("expectedMatchesPerTournament must be a positive integer.");
  }

  const years = expectedYears.map((year) => validateYear(year, input, expectedMatchesPerTournament));

  return {
    years,
    aggregate: summarizeAggregate(years, expectedYears),
    metadata: {
      validationVersion: COMPLETE_HISTORICAL_REPLAY_VALIDATION_VERSION,
      expectedMatchesPerTournament,
      notes: [
        "Complete historical replay validation audits the presence and status of historical dataset, bracket, Elo snapshot, Monte Carlo replay, and replay backtesting outputs.",
        "The result is a validation foundation only; it does not create a public predictive accuracy claim.",
        "Foundation warnings are expected until full international match history, calibrated Elo-to-goals mapping, and stronger replay validation are available."
      ]
    }
  };
}
