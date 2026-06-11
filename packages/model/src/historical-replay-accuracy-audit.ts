import {
  COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS,
  COMPLETE_HISTORICAL_REPLAY_FOUNDATION_WARNING
} from "./complete-historical-replay-validation.js";
import type {
  CompleteHistoricalReplayValidationResult,
  CompleteHistoricalReplayValidationStatus,
  CompleteHistoricalReplayValidationWarning,
  CompleteHistoricalReplayYearValidation
} from "./complete-historical-replay-validation.js";
import type { HistoricalMonteCarloReplayYearResult, HistoricalTournamentReplayYearResult } from "./types.js";

export const HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION = "historical-replay-accuracy-audit-v1";
export const HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING =
  "Historical replay accuracy audit summarizes foundation validation evidence only and must not be treated as a real predictive accuracy claim.";

export type HistoricalReplayAccuracyAuditStatus = "pass" | "warning" | "fail";
export type HistoricalReplayAccuracyApiReadiness = "ready" | "ready_with_warnings" | "not_ready";
export type HistoricalReplayAccuracyMetricName = "brierScore" | "logLoss" | "top1Hit" | "top3Hit" | "top5Hit";
export type HistoricalReplayAccuracyAuditComponent =
  | "metrics"
  | "dataset"
  | "bracket_reconstruction"
  | "elo_snapshot_replay"
  | "monte_carlo_replay"
  | "replay_validation";

export type HistoricalReplayAccuracyAuditWarningCode =
  | "foundation_only_audit"
  | "metric_missing"
  | "dataset_not_ready"
  | "bracket_not_ready"
  | "elo_snapshot_not_ready"
  | "monte_carlo_not_ready"
  | "replay_validation_not_ready"
  | "foundation_warning_detected";

export interface HistoricalReplayAccuracyAuditWarning {
  code: HistoricalReplayAccuracyAuditWarningCode;
  severity: "info" | "warning" | "error";
  message: string;
  tournamentYear?: number;
  component?: HistoricalReplayAccuracyAuditComponent;
}

export interface HistoricalReplayMetricAvailability {
  metric: HistoricalReplayAccuracyMetricName;
  available: boolean;
  source: "replay_backtesting_report" | "monte_carlo_replay" | "missing";
}

export interface HistoricalReplayYearMetricAvailability {
  brierScore: HistoricalReplayMetricAvailability;
  logLoss: HistoricalReplayMetricAvailability;
  top1Hit: HistoricalReplayMetricAvailability;
  top3Hit: HistoricalReplayMetricAvailability;
  top5Hit: HistoricalReplayMetricAvailability;
  allRequiredMetricsAvailable: boolean;
}

export interface HistoricalReplayYearComponentAudit {
  available: boolean;
  status: HistoricalReplayAccuracyAuditStatus;
  details: Record<string, string | number | boolean>;
}

export interface HistoricalReplayAccuracyYearAudit {
  tournamentYear: number;
  status: HistoricalReplayAccuracyAuditStatus;
  apiReadiness: HistoricalReplayAccuracyApiReadiness;
  metricAvailability: HistoricalReplayYearMetricAvailability;
  datasetCompleteness: HistoricalReplayYearComponentAudit;
  bracketReconstruction: HistoricalReplayYearComponentAudit;
  eloSnapshotReplay: HistoricalReplayYearComponentAudit;
  monteCarloReplay: HistoricalReplayYearComponentAudit;
  replayValidation: HistoricalReplayYearComponentAudit;
  foundationOnlyWarningDetected: boolean;
  knownGaps: readonly string[];
  warnings: readonly HistoricalReplayAccuracyAuditWarning[];
}

export interface HistoricalReplayAccuracyAggregateAudit {
  status: HistoricalReplayAccuracyAuditStatus;
  apiReadiness: HistoricalReplayAccuracyApiReadiness;
  expectedYears: number[];
  yearsAudited: number[];
  yearsMissing: number[];
  allExpectedYearsAudited: boolean;
  allRequiredMetricsAvailable: boolean;
  datasetCompletenessAvailable: boolean;
  bracketReconstructionAvailable: boolean;
  eloSnapshotReplayAvailable: boolean;
  monteCarloReplayAvailable: boolean;
  replayValidationAvailable: boolean;
  foundationOnlyWarningDetected: boolean;
  warningCount: number;
  errorCount: number;
  knownGaps: readonly string[];
  warnings: readonly HistoricalReplayAccuracyAuditWarning[];
}

export interface HistoricalReplayAccuracyAuditMetadata {
  auditVersion: string;
  notes: readonly string[];
}

export interface HistoricalReplayAccuracyAuditInput {
  completeValidation: CompleteHistoricalReplayValidationResult;
  replayBacktestingReports: readonly HistoricalTournamentReplayYearResult[];
  monteCarloReplayResults?: readonly HistoricalMonteCarloReplayYearResult[];
  expectedYears?: readonly number[];
}

export interface HistoricalReplayAccuracyAuditResult {
  years: readonly HistoricalReplayAccuracyYearAudit[];
  aggregate: HistoricalReplayAccuracyAggregateAudit;
  metadata: HistoricalReplayAccuracyAuditMetadata;
}

const FOUNDATION_WARNING_CODES = new Set<string>([
  "foundation_only_validation",
  "elo_snapshot_foundation_only",
  "monte_carlo_foundation_only",
  "historical_elo_foundation_snapshot",
  "baseline_snapshot"
]);

const FOUNDATION_GAPS = [
  "Full pre-tournament international match history is not guaranteed for historical Elo snapshots.",
  "Elo-to-expected-goals mapping is not calibrated.",
  "Historical bracket reconstruction still uses simplified group tie-breakers.",
  "Replay outputs are validation evidence, not public predictive accuracy."
] as const;

function auditWarning(
  code: HistoricalReplayAccuracyAuditWarningCode,
  severity: HistoricalReplayAccuracyAuditWarning["severity"],
  message: string,
  tournamentYear?: number,
  component?: HistoricalReplayAccuracyAuditComponent
): HistoricalReplayAccuracyAuditWarning {
  const warning: HistoricalReplayAccuracyAuditWarning = {
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

function uniqueWarnings(warnings: readonly HistoricalReplayAccuracyAuditWarning[]): HistoricalReplayAccuracyAuditWarning[] {
  const seen = new Set<string>();
  const unique: HistoricalReplayAccuracyAuditWarning[] = [];

  for (const warning of warnings) {
    const key = `${warning.code}|${warning.severity}|${warning.message}|${warning.tournamentYear ?? ""}|${warning.component ?? ""}`;

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(warning);
  }

  return unique;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function metricAvailability(
  metric: HistoricalReplayAccuracyMetricName,
  replayReport: HistoricalTournamentReplayYearResult | undefined,
  monteCarloReplay: HistoricalMonteCarloReplayYearResult | undefined
): HistoricalReplayMetricAvailability {
  const replayMetricAvailable =
    metric === "brierScore"
      ? isFiniteNumber(replayReport?.brierScore)
      : metric === "logLoss"
        ? isFiniteNumber(replayReport?.logLoss)
        : metric === "top1Hit"
          ? isBoolean(replayReport?.championTop1Hit)
          : metric === "top3Hit"
            ? isBoolean(replayReport?.championTop3Hit)
            : isBoolean(replayReport?.championTop5Hit);

  if (replayMetricAvailable) {
    return {
      metric,
      available: true,
      source: "replay_backtesting_report"
    };
  }

  const monteCarloMetricAvailable =
    metric === "brierScore"
      ? isFiniteNumber(monteCarloReplay?.brierScore)
      : metric === "logLoss"
        ? isFiniteNumber(monteCarloReplay?.logLoss)
        : metric === "top1Hit"
          ? isBoolean(monteCarloReplay?.championTop1Hit)
          : metric === "top3Hit"
            ? isBoolean(monteCarloReplay?.championTop3Hit)
            : isBoolean(monteCarloReplay?.championTop5Hit);

  if (monteCarloMetricAvailable) {
    return {
      metric,
      available: true,
      source: "monte_carlo_replay"
    };
  }

  return {
    metric,
    available: false,
    source: "missing"
  };
}

function buildMetricAvailability(
  replayReport: HistoricalTournamentReplayYearResult | undefined,
  monteCarloReplay: HistoricalMonteCarloReplayYearResult | undefined
): HistoricalReplayYearMetricAvailability {
  const metrics = {
    brierScore: metricAvailability("brierScore", replayReport, monteCarloReplay),
    logLoss: metricAvailability("logLoss", replayReport, monteCarloReplay),
    top1Hit: metricAvailability("top1Hit", replayReport, monteCarloReplay),
    top3Hit: metricAvailability("top3Hit", replayReport, monteCarloReplay),
    top5Hit: metricAvailability("top5Hit", replayReport, monteCarloReplay)
  };

  return {
    ...metrics,
    allRequiredMetricsAvailable: Object.values(metrics).every((metric) => metric.available)
  };
}

function componentAudit(
  available: boolean,
  status: CompleteHistoricalReplayValidationStatus,
  details: Record<string, string | number | boolean>
): HistoricalReplayYearComponentAudit {
  return {
    available,
    status,
    details
  };
}

function hasFoundationWarning(warnings: readonly CompleteHistoricalReplayValidationWarning[], replayWarnings: readonly { code?: string; message?: string }[]): boolean {
  return (
    warnings.some((warning) => FOUNDATION_WARNING_CODES.has(warning.code) || warning.message.toLocaleLowerCase().includes("foundation")) ||
    replayWarnings.some((warning) => FOUNDATION_WARNING_CODES.has(warning.code ?? "") || warning.message?.toLocaleLowerCase().includes("foundation") === true)
  );
}

function buildMetricWarnings(
  year: number,
  metricAvailabilitySummary: HistoricalReplayYearMetricAvailability
): HistoricalReplayAccuracyAuditWarning[] {
  return Object.values(metricAvailabilitySummary)
    .filter((metric): metric is HistoricalReplayMetricAvailability => typeof metric === "object" && "metric" in metric)
    .flatMap((metric) => {
      if (metric.available) return [];

      return [
        auditWarning(
          "metric_missing",
          "error",
          `${metric.metric} is not available for historical replay audit year ${year}.`,
          year,
          "metrics"
        )
      ];
    });
}

function buildComponentWarnings(
  year: number,
  validationYear: CompleteHistoricalReplayYearValidation
): HistoricalReplayAccuracyAuditWarning[] {
  const warnings: HistoricalReplayAccuracyAuditWarning[] = [];

  if (validationYear.dataset.status === "fail") {
    warnings.push(auditWarning("dataset_not_ready", "error", `Dataset completeness is not ready for ${year}.`, year, "dataset"));
  }

  if (validationYear.bracketReconstruction.status === "fail") {
    warnings.push(
      auditWarning("bracket_not_ready", "error", `Bracket reconstruction is not ready for ${year}.`, year, "bracket_reconstruction")
    );
  }

  if (validationYear.eloSnapshotReplay.status === "fail") {
    warnings.push(auditWarning("elo_snapshot_not_ready", "error", `Elo snapshot replay is not ready for ${year}.`, year, "elo_snapshot_replay"));
  }

  if (validationYear.monteCarloReplay.status === "fail") {
    warnings.push(
      auditWarning("monte_carlo_not_ready", "error", `Monte Carlo replay is not ready for ${year}.`, year, "monte_carlo_replay")
    );
  }

  if (validationYear.replayBacktestingReport.status === "fail") {
    warnings.push(
      auditWarning("replay_validation_not_ready", "error", `Replay validation report is not ready for ${year}.`, year, "replay_validation")
    );
  }

  return warnings;
}

function statusFromWarnings(warnings: readonly HistoricalReplayAccuracyAuditWarning[]): HistoricalReplayAccuracyAuditStatus {
  if (warnings.some((warning) => warning.severity === "error")) {
    return "fail";
  }

  if (warnings.length > 0) {
    return "warning";
  }

  return "pass";
}

function readinessFromStatus(status: HistoricalReplayAccuracyAuditStatus): HistoricalReplayAccuracyApiReadiness {
  if (status === "fail") return "not_ready";
  if (status === "warning") return "ready_with_warnings";

  return "ready";
}

function findValidationYear(
  year: number,
  validationYears: readonly CompleteHistoricalReplayYearValidation[]
): CompleteHistoricalReplayYearValidation | undefined {
  return validationYears.find((entry) => entry.tournamentYear === year);
}

function findReplayReport(
  year: number,
  reports: readonly HistoricalTournamentReplayYearResult[]
): HistoricalTournamentReplayYearResult | undefined {
  return reports.find((entry) => entry.tournamentYear === year);
}

function findMonteCarloReplay(
  year: number,
  reports: readonly HistoricalMonteCarloReplayYearResult[]
): HistoricalMonteCarloReplayYearResult | undefined {
  return reports.find((entry) => entry.tournamentYear === year);
}

function auditYear(
  year: number,
  input: HistoricalReplayAccuracyAuditInput
): HistoricalReplayAccuracyYearAudit {
  const validationYear = findValidationYear(year, input.completeValidation.years);

  if (validationYear === undefined) {
    const warnings = [
      auditWarning("replay_validation_not_ready", "error", `Complete replay validation is missing for ${year}.`, year, "replay_validation")
    ];

    return {
      tournamentYear: year,
      status: "fail",
      apiReadiness: "not_ready",
      metricAvailability: buildMetricAvailability(undefined, undefined),
      datasetCompleteness: componentAudit(false, "fail", {}),
      bracketReconstruction: componentAudit(false, "fail", {}),
      eloSnapshotReplay: componentAudit(false, "fail", {}),
      monteCarloReplay: componentAudit(false, "fail", {}),
      replayValidation: componentAudit(false, "fail", {}),
      foundationOnlyWarningDetected: false,
      knownGaps: [],
      warnings
    };
  }

  const replayReport = findReplayReport(year, input.replayBacktestingReports);
  const monteCarloReplay = findMonteCarloReplay(year, input.monteCarloReplayResults ?? []);
  const metricSummary = buildMetricAvailability(replayReport, monteCarloReplay);
  const foundationOnlyWarningDetected = hasFoundationWarning(validationYear.warnings, [
    ...(replayReport?.warnings ?? []),
    ...(monteCarloReplay?.warnings ?? [])
  ]);
  const warnings = uniqueWarnings([
    auditWarning("foundation_only_audit", "info", HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING, year),
    ...buildMetricWarnings(year, metricSummary),
    ...buildComponentWarnings(year, validationYear),
    ...(foundationOnlyWarningDetected
      ? [
          auditWarning(
            "foundation_warning_detected",
            "warning",
            "Foundation-only warnings are present; audit output is not a real predictive accuracy claim.",
            year
          )
        ]
      : [])
  ]);
  const status = statusFromWarnings(warnings);

  return {
    tournamentYear: year,
    status,
    apiReadiness: readinessFromStatus(status),
    metricAvailability: metricSummary,
    datasetCompleteness: componentAudit(validationYear.dataset.available, validationYear.dataset.status, validationYear.dataset.details),
    bracketReconstruction: componentAudit(
      validationYear.bracketReconstruction.available,
      validationYear.bracketReconstruction.status,
      validationYear.bracketReconstruction.details
    ),
    eloSnapshotReplay: componentAudit(validationYear.eloSnapshotReplay.available, validationYear.eloSnapshotReplay.status, validationYear.eloSnapshotReplay.details),
    monteCarloReplay: componentAudit(validationYear.monteCarloReplay.available, validationYear.monteCarloReplay.status, validationYear.monteCarloReplay.details),
    replayValidation: componentAudit(
      validationYear.replayBacktestingReport.available,
      validationYear.replayBacktestingReport.status,
      validationYear.replayBacktestingReport.details
    ),
    foundationOnlyWarningDetected,
    knownGaps: foundationOnlyWarningDetected ? [...FOUNDATION_GAPS] : [],
    warnings
  };
}

function summarizeAggregate(
  years: readonly HistoricalReplayAccuracyYearAudit[],
  expectedYears: readonly number[]
): HistoricalReplayAccuracyAggregateAudit {
  const yearsAudited = years.map((year) => year.tournamentYear).sort((a, b) => a - b);
  const yearsMissing = expectedYears.filter((year) => !yearsAudited.includes(year));
  const warnings = uniqueWarnings([
    auditWarning("foundation_only_audit", "info", HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING),
    ...years.flatMap((year) => year.warnings)
  ]);
  const errorCount = warnings.filter((warning) => warning.severity === "error").length;
  const warningCount = warnings.filter((warning) => warning.severity === "warning").length;
  const status: HistoricalReplayAccuracyAuditStatus =
    yearsMissing.length > 0 || years.some((year) => year.status === "fail")
      ? "fail"
      : years.some((year) => year.status === "warning")
        ? "warning"
        : "pass";

  return {
    status,
    apiReadiness: readinessFromStatus(status),
    expectedYears: [...expectedYears],
    yearsAudited,
    yearsMissing,
    allExpectedYearsAudited: yearsMissing.length === 0 && yearsAudited.length === expectedYears.length,
    allRequiredMetricsAvailable: years.every((year) => year.metricAvailability.allRequiredMetricsAvailable),
    datasetCompletenessAvailable: years.every((year) => year.datasetCompleteness.available && year.datasetCompleteness.status !== "fail"),
    bracketReconstructionAvailable: years.every((year) => year.bracketReconstruction.available && year.bracketReconstruction.status !== "fail"),
    eloSnapshotReplayAvailable: years.every((year) => year.eloSnapshotReplay.available && year.eloSnapshotReplay.status !== "fail"),
    monteCarloReplayAvailable: years.every((year) => year.monteCarloReplay.available && year.monteCarloReplay.status !== "fail"),
    replayValidationAvailable: years.every((year) => year.replayValidation.available && year.replayValidation.status !== "fail"),
    foundationOnlyWarningDetected: years.some((year) => year.foundationOnlyWarningDetected),
    warningCount,
    errorCount,
    knownGaps: uniqueStrings(years.flatMap((year) => year.knownGaps)),
    warnings
  };
}

export function auditHistoricalReplayAccuracy(input: HistoricalReplayAccuracyAuditInput): HistoricalReplayAccuracyAuditResult {
  const expectedYears = validateExpectedYears(input.expectedYears ?? COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS);
  const years = expectedYears.map((year) => auditYear(year, input));

  return {
    years,
    aggregate: summarizeAggregate(years, expectedYears),
    metadata: {
      auditVersion: HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION,
      notes: [
        COMPLETE_HISTORICAL_REPLAY_FOUNDATION_WARNING,
        HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING,
        "API readiness is based on validation availability and warnings, not on final model accuracy."
      ]
    }
  };
}
