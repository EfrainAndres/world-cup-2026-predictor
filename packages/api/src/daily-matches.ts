import { buildApiMetadata } from "./schemas.js";
import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import { defaultSnapshotStore, type PredictionSnapshotStore } from "./snapshot-store.js";
import {
  defaultPredictionEvaluationStore,
  type PredictionEvaluationStore
} from "./prediction-evaluation-store.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import type {
  ApiValidationIssue,
  GetWorldCup2026DailyMatchesInput,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchHistoryEvaluationSummary,
  WorldCup2026DailyMatchIssue,
  WorldCup2026DailyMatchPredictionHistorySummary,
  WorldCup2026DailyMatchSnapshotSummary,
  WorldCup2026DailyMatchState,
  WorldCup2026DailyMatchesCounts,
  WorldCup2026DailyMatchesProviderMetadata,
  WorldCup2026DailyMatchesResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026Fixture,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot,
  PredictionSnapshotStatus,
  WorldCup2026SyncResult
} from "./schemas.js";

const DEFAULT_DAILY_MATCHES_TIMEZONE = "UTC";
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface BuildWorldCup2026DailyMatchesInput extends GetWorldCup2026DailyMatchesInput {
  syncResult: WorldCup2026SyncResult;
  generatedAt?: string;
  snapshotStore?: PredictionSnapshotStore;
  evaluationStore?: PredictionEvaluationStore;
}

function validateDateString(date: string): boolean {
  if (!DATE_FORMAT_REGEX.test(date)) return false;
  const [yearText, monthText, dayText] = date.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function isValidTimeZone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date("2026-06-11T00:00:00Z"));
    return true;
  } catch {
    return false;
  }
}

function getLocalDateParts(isoDate: string, timezone: string): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(new Date(isoDate));
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return { year, month, day };
}

function getLocalizedDateString(isoDate: string, timezone: string): string {
  const parts = getLocalDateParts(isoDate, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getLocalizedKickoff(isoDate: string, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short"
  });
  const parts = formatter.formatToParts(new Date(isoDate));
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? timezone;
  return `${year}-${month}-${day} ${hour}:${minute} ${zone}`;
}

function buildFixtureIndex(): {
  byId: Map<string, WorldCup2026Fixture>;
  byTeams: Map<string, WorldCup2026Fixture>;
} {
  return {
    byId: new Map(WORLD_CUP_2026_GROUP_STAGE_FIXTURES.map((fixture) => [fixture.id, fixture])),
    byTeams: new Map(
      WORLD_CUP_2026_GROUP_STAGE_FIXTURES.map((fixture) => [
        `${fixture.homeTeam}|${fixture.awayTeam}`,
        fixture
      ])
    )
  };
}

function resolveFixture(
  record: WorldCup2026ExternalFixtureRecord,
  index: ReturnType<typeof buildFixtureIndex>
): WorldCup2026Fixture | undefined {
  return index.byId.get(record.providerFixtureId) ?? index.byTeams.get(`${record.homeTeam}|${record.awayTeam}`);
}

function mapDailyState(status: WorldCup2026ExternalMatchStatus): WorldCup2026DailyMatchState {
  switch (status) {
    case "scheduled":
      return "upcoming";
    case "live":
      return "live";
    case "halftime":
      return "halftime";
    case "finished":
      return "final";
    case "postponed":
      return "postponed";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}

function isValidFinishedScore(record: WorldCup2026ExternalFixtureRecord): boolean {
  return (
    Number.isInteger(record.homeScore) &&
    Number.isInteger(record.awayScore) &&
    (record.homeScore ?? -1) >= 0 &&
    (record.awayScore ?? -1) >= 0
  );
}

function snapshotPriority(status: PredictionSnapshotStatus): number {
  return status === "pre_match_locked" ? 0 : 1;
}

function compareSnapshots(a: WorldCup2026PredictionSnapshot, b: WorldCup2026PredictionSnapshot): number {
  const statusCompare = snapshotPriority(a.status) - snapshotPriority(b.status);
  if (statusCompare !== 0) return statusCompare;

  const timeCompare = b.capturedAt.localeCompare(a.capturedAt);
  if (timeCompare !== 0) return timeCompare;
  return b.snapshotId.localeCompare(a.snapshotId);
}

function compareScorelineCandidates(
  a: WorldCup2026PredictionSnapshot["prediction"]["mostLikelyScorelines"][number],
  b: WorldCup2026PredictionSnapshot["prediction"]["mostLikelyScorelines"][number]
): number {
  const probabilityCompare = b.probability - a.probability;
  if (probabilityCompare !== 0) return probabilityCompare;

  const totalGoalsCompare = a.homeGoals + a.awayGoals - (b.homeGoals + b.awayGoals);
  if (totalGoalsCompare !== 0) return totalGoalsCompare;
  if (a.homeGoals !== b.homeGoals) return a.homeGoals - b.homeGoals;
  return a.awayGoals - b.awayGoals;
}

function selectProjectedScoreline(snapshot: WorldCup2026PredictionSnapshot):
  | { homeGoals: number; awayGoals: number }
  | undefined {
  const selected = [...snapshot.prediction.mostLikelyScorelines].sort(compareScorelineCandidates)[0];
  return selected === undefined
    ? undefined
    : {
        homeGoals: selected.homeGoals,
        awayGoals: selected.awayGoals
      };
}

function isEligibleSnapshotForMatchHistory(
  snapshot: WorldCup2026PredictionSnapshot,
  kickoffAt: string | undefined
): boolean {
  if (kickoffAt === undefined) {
    return false;
  }

  if (snapshot.status !== "pre_match_locked" && snapshot.status !== "foundation_unverified") {
    return false;
  }

  return snapshot.capturedAt < kickoffAt;
}

function resolveSelectedSnapshot(
  fixtureId: string,
  kickoffAt: string | undefined,
  snapshotStore: PredictionSnapshotStore
): WorldCup2026PredictionSnapshot | undefined {
  const valid = snapshotStore
    .getByFixtureId(fixtureId)
    .filter((snapshot) => isEligibleSnapshotForMatchHistory(snapshot, kickoffAt))
    .sort(compareSnapshots);

  return valid[0];
}

function buildSnapshotSummary(
  selected: WorldCup2026PredictionSnapshot | undefined
): WorldCup2026DailyMatchSnapshotSummary {
  if (selected === undefined) {
    return { available: false };
  }

  return {
    available: true,
    status: selected.status,
    snapshotId: selected.snapshotId,
    capturedAt: selected.capturedAt,
    modelVersion: selected.modelVersion
  };
}

function compareEvaluations(
  a: WorldCup2026PredictionEvaluation,
  b: WorldCup2026PredictionEvaluation
): number {
  const evaluatedAtCompare = b.evaluatedAt.localeCompare(a.evaluatedAt);
  if (evaluatedAtCompare !== 0) return evaluatedAtCompare;
  return b.evaluationId.localeCompare(a.evaluationId);
}

function resolveEvaluationSummary(
  snapshot: WorldCup2026PredictionSnapshot | undefined,
  fixtureId: string,
  record: WorldCup2026ExternalFixtureRecord,
  evaluationStore: PredictionEvaluationStore
): {
  summary: WorldCup2026DailyMatchHistoryEvaluationSummary;
  warnings: string[];
} {
  if (
    snapshot === undefined ||
    record.status !== "finished" ||
    !isValidFinishedScore(record)
  ) {
    return {
      summary: { available: false },
      warnings: []
    };
  }

  const candidates = evaluationStore
    .getByFixtureId(fixtureId)
    .filter((evaluation) => evaluation.snapshotId === snapshot.snapshotId)
    .sort(compareEvaluations);

  const matching = candidates.filter((evaluation) => {
    if (evaluation.fixtureId !== fixtureId) {
      return false;
    }

    if (
      evaluation.providerFixtureId !== undefined &&
      evaluation.providerFixtureId !== record.providerFixtureId
    ) {
      return false;
    }

    return (
      evaluation.actual.homeGoals === record.homeScore &&
      evaluation.actual.awayGoals === record.awayScore
    );
  });

  const selected = matching[0];
  if (selected === undefined) {
    return {
      summary: { available: false },
      warnings:
        candidates.length === 0
          ? []
          : [
              `Stored evaluation history for fixture '${fixtureId}' did not match the selected snapshot or final result and was not attached.`
            ]
    };
  }

  return {
    summary: {
      available: true,
      evaluationId: selected.evaluationId,
      evaluatedAt: selected.evaluatedAt,
      metrics: {
        outcomeCorrect: selected.metrics.outcomeCorrect,
        exactScoreCorrect: selected.metrics.exactScoreCorrect,
        brierScore: selected.metrics.brierScore,
        logLoss: selected.metrics.logLoss,
        totalGoalAbsoluteError: selected.metrics.totalGoalAbsoluteError
      }
    },
    warnings: []
  };
}

function resolvePredictionHistory(
  fixtureId: string,
  kickoffAt: string | undefined,
  record: WorldCup2026ExternalFixtureRecord,
  snapshotStore: PredictionSnapshotStore,
  evaluationStore: PredictionEvaluationStore
): {
  snapshotSummary: WorldCup2026DailyMatchSnapshotSummary;
  history: WorldCup2026DailyMatchPredictionHistorySummary;
} {
  const selectedSnapshot = resolveSelectedSnapshot(fixtureId, kickoffAt, snapshotStore);
  const snapshotSummary = buildSnapshotSummary(selectedSnapshot);
  const evaluation = resolveEvaluationSummary(
    selectedSnapshot,
    fixtureId,
    record,
    evaluationStore
  );

  if (selectedSnapshot === undefined) {
    return {
      snapshotSummary,
      history: {
        snapshot: { available: false },
        evaluation: evaluation.summary,
        warnings: evaluation.warnings
      }
    };
  }

  const projectedScoreline = selectProjectedScoreline(selectedSnapshot);

  return {
    snapshotSummary,
    history: {
      snapshot: {
        available: true,
        status: selectedSnapshot.status,
        snapshotId: selectedSnapshot.snapshotId,
        capturedAt: selectedSnapshot.capturedAt,
        modelVersion: selectedSnapshot.modelVersion,
        prediction: {
          homeExpectedGoals: selectedSnapshot.prediction.homeExpectedGoals,
          awayExpectedGoals: selectedSnapshot.prediction.awayExpectedGoals,
          homeWinProbability: selectedSnapshot.prediction.homeWinProbability,
          drawProbability: selectedSnapshot.prediction.drawProbability,
          awayWinProbability: selectedSnapshot.prediction.awayWinProbability,
          ...(projectedScoreline === undefined ? {} : { projectedScoreline }),
          confidenceLevel: selectedSnapshot.confidence.level,
          coverageType: selectedSnapshot.confidence.coverageType
        }
      },
      evaluation: evaluation.summary,
      warnings: evaluation.warnings
    }
  };
}

function buildDailyMatchEntry(
  record: WorldCup2026ExternalFixtureRecord,
  fixture: WorldCup2026Fixture | undefined,
  timezone: string,
  snapshotStore: PredictionSnapshotStore,
  evaluationStore: PredictionEvaluationStore
): WorldCup2026DailyMatchEntry {
  const fixtureId = fixture?.id ?? record.providerFixtureId;
  const history = resolvePredictionHistory(
    fixtureId,
    record.kickoffAt,
    record,
    snapshotStore,
    evaluationStore
  );

  return {
    fixtureId,
    providerFixtureId: record.providerFixtureId,
    ...(fixture?.group !== undefined ? { group: fixture.group } : record.group !== undefined ? { group: record.group } : {}),
    ...(fixture?.matchday !== undefined
      ? { matchday: fixture.matchday }
      : record.matchday !== undefined
        ? { matchday: record.matchday }
        : {}),
    ...(record.kickoffAt !== undefined ? { kickoffAt: record.kickoffAt, localizedKickoff: getLocalizedKickoff(record.kickoffAt, timezone) } : {}),
    homeTeam: fixture?.homeTeam ?? record.homeTeam,
    awayTeam: fixture?.awayTeam ?? record.awayTeam,
    normalizedStatus: record.status,
    state: mapDailyState(record.status),
    ...(record.homeScore !== undefined ? { homeScore: record.homeScore } : {}),
    ...(record.awayScore !== undefined ? { awayScore: record.awayScore } : {}),
    ...(record.venue !== undefined ? { venue: record.venue } : {}),
    predictionSnapshot: history.snapshotSummary,
    predictionHistory: history.history
  };
}

function compareDailyEntries(a: WorldCup2026DailyMatchEntry, b: WorldCup2026DailyMatchEntry): number {
  const aKickoff = a.kickoffAt ?? "";
  const bKickoff = b.kickoffAt ?? "";
  const kickoffCompare = aKickoff.localeCompare(bKickoff);
  if (kickoffCompare !== 0) return kickoffCompare;
  return a.fixtureId.localeCompare(b.fixtureId);
}

function buildCounts(
  matches: readonly WorldCup2026DailyMatchEntry[],
  unscheduledMatches: readonly WorldCup2026DailyMatchEntry[]
): WorldCup2026DailyMatchesCounts {
  const counts: WorldCup2026DailyMatchesCounts = {
    total: matches.length,
    upcoming: 0,
    live: 0,
    halftime: 0,
    final: 0,
    postponed: 0,
    cancelled: 0,
    unknown: 0,
    unavailableKickoff: unscheduledMatches.length
  };

  for (const match of matches) {
    counts[match.state] += 1;
  }

  return counts;
}

function buildProviderMetadata(syncResult: WorldCup2026SyncResult): WorldCup2026DailyMatchesProviderMetadata {
  return {
    configuredProvider: syncResult.providerMode,
    activeProvider: syncResult.activeProvider,
    externalRequestAttempted: syncResult.externalProviderEnabled,
    cacheUsed: syncResult.cacheUsed,
    localFallbackUsed: syncResult.localFallbackUsed,
    ...(syncResult.lastSuccessfulSync === undefined
      ? {}
      : { lastSuccessfulSync: syncResult.lastSuccessfulSync }),
    stale: syncResult.cacheUsed
  };
}

function deriveRequestedDate(date: string | undefined, generatedAt: string, timezone: string): string {
  return date ?? getLocalizedDateString(generatedAt, timezone);
}

function validateInput(
  input: GetWorldCup2026DailyMatchesInput | undefined,
  generatedAt: string
): { issues: ApiValidationIssue[]; timezone: string; requestedDate: string | undefined } {
  const issues: ApiValidationIssue[] = [];
  const timezone = input?.timezone ?? DEFAULT_DAILY_MATCHES_TIMEZONE;

  if (!isValidTimeZone(timezone)) {
    issues.push({
      field: "timezone",
      message: "timezone must be a valid IANA timezone."
    });
  }

  if (input?.date !== undefined && !validateDateString(input.date)) {
    issues.push({
      field: "date",
      message: "date must use YYYY-MM-DD."
    });
  }

  return {
    issues,
    timezone,
    requestedDate: issues.length === 0 ? deriveRequestedDate(input?.date, generatedAt, timezone) : undefined
  };
}

export function buildWorldCup2026DailyMatches(
  input: BuildWorldCup2026DailyMatchesInput
): WorldCup2026DailyMatchesResponse {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const { issues: validationIssues, timezone, requestedDate } = validateInput(input, generatedAt);

  if (validationIssues.length > 0 || requestedDate === undefined) {
    return {
      status: "validation_error",
      issues: validationIssues,
      metadata: buildApiMetadata(["Daily matches request failed validation before synchronized data was filtered."])
    };
  }

  const fixtureIndex = buildFixtureIndex();
  const snapshotStore = input.snapshotStore ?? defaultSnapshotStore;
  const evaluationStore = input.evaluationStore ?? defaultPredictionEvaluationStore;
  const seenKeys = new Set<string>();
  const issues: WorldCup2026DailyMatchIssue[] = [];
  const matches: WorldCup2026DailyMatchEntry[] = [];
  const unscheduledMatches: WorldCup2026DailyMatchEntry[] = [];

  for (const record of input.syncResult.fixtures) {
    const fixture = resolveFixture(record, fixtureIndex);
    const dedupeKey = fixture?.id ?? record.providerFixtureId;

    if (seenKeys.has(dedupeKey)) {
      issues.push({
        code: "duplicate_fixture",
        ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
        providerFixtureId: record.providerFixtureId,
        message: `Duplicate fixture record '${dedupeKey}' was skipped.`
      });
      continue;
    }
    seenKeys.add(dedupeKey);

    if (record.status === "finished" && !isValidFinishedScore(record)) {
      issues.push({
        code: "invalid_finished_score",
        ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
        providerFixtureId: record.providerFixtureId,
        message: `Finished fixture '${record.providerFixtureId}' is missing valid non-negative integer scores.`
      });
      continue;
    }

    const entry = buildDailyMatchEntry(record, fixture, timezone, snapshotStore, evaluationStore);

    if (record.kickoffAt === undefined) {
      issues.push({
        code: "missing_kickoff",
        fixtureId: entry.fixtureId,
        providerFixtureId: record.providerFixtureId,
        message: `Fixture '${entry.fixtureId}' has no kickoff metadata and cannot be assigned to a calendar day.`
      });
      unscheduledMatches.push(entry);
      continue;
    }

    if (getLocalizedDateString(record.kickoffAt, timezone) !== requestedDate) {
      continue;
    }

    matches.push(entry);
  }

  matches.sort(compareDailyEntries);
  unscheduledMatches.sort(compareDailyEntries);
  const providerMetadata = buildProviderMetadata(input.syncResult);
  const warnings: string[] = [
    ...input.syncResult.warnings,
    ...matches.flatMap((match) => match.predictionHistory.warnings),
    ...unscheduledMatches.flatMap((match) => match.predictionHistory.warnings)
  ];

  if (unscheduledMatches.length > 0) {
    warnings.push(
      `${unscheduledMatches.length} fixture${unscheduledMatches.length === 1 ? "" : "s"} lack kickoff metadata and were returned separately as unscheduled matches.`
    );
  }

  if (providerMetadata.stale) {
    warnings.push("Daily matches data was served from cache and may be stale.");
  }

  if (providerMetadata.localFallbackUsed) {
    warnings.push("Daily matches data is using the local static fallback provider.");
  }

  return {
    status: "success",
    requestedDate,
    timezone,
    generatedAt,
    matches,
    unscheduledMatches,
    counts: buildCounts(matches, unscheduledMatches),
    providerMetadata,
    issues,
    warnings,
      metadata: buildApiMetadata([
      "Daily matches groups synchronized World Cup 2026 fixtures by localized calendar date using normalized provider data.",
      "Status mapping uses provider-normalized fixture status as the source of truth.",
      "No snapshots or evaluations are created automatically; history association is read-only."
    ])
  };
}

export async function getWorldCup2026DailyMatches(
  input?: GetWorldCup2026DailyMatchesInput
): Promise<WorldCup2026DailyMatchesResponse> {
  const syncResult = await synchronizeWorldCup2026Results({});
  return buildWorldCup2026DailyMatches({
    ...input,
    syncResult
  });
}
