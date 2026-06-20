import { buildApiMetadata } from "./schemas.js";
import {
  DEFAULT_DAILY_MATCHES_TIMEZONE,
  buildDailyMatchEntry,
  buildFixtureIndex,
  isValidFinishedScore,
  isValidTimeZone,
  mapDailyState,
  resolveFixture
} from "./daily-matches.js";
import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import { getWorldCup2026LiveGroupStandings } from "./live-group-standings.js";
import { defaultSnapshotStore, type PredictionSnapshotStore } from "./snapshot-store.js";
import {
  defaultPredictionEvaluationStore,
  type PredictionEvaluationStore
} from "./prediction-evaluation-store.js";
import {
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  buildWorldCup2026BestThirdPlaceRanking
} from "./world-cup-2026-teams.js";
import type {
  ApiValidationIssue,
  WorldCup2026DailyMatchEntry,
  GetWorldCup2026GroupDetailInput,
  WorldCup2026DailyMatchIssue,
  WorldCup2026GroupDetailMatch,
  WorldCup2026GroupDetailResponse,
  WorldCup2026GroupDetailSuccessResponse,
  WorldCup2026GroupStandings,
  WorldCup2026SyncResult
} from "./schemas.js";

const VALID_GROUPS = new Set(WORLD_CUP_2026_FIXTURE_GROUPS.map((group) => group.group));
const GROUP_INPUT_REGEX = /^Group\s+/i;

export interface BuildWorldCup2026GroupDetailInput extends GetWorldCup2026GroupDetailInput {
  syncResult: WorldCup2026SyncResult;
  generatedAt?: string;
  snapshotStore?: PredictionSnapshotStore;
  evaluationStore?: PredictionEvaluationStore;
}

function normalizeGroupInput(group: string): string {
  return group.trim().replace(GROUP_INPUT_REGEX, "").toUpperCase();
}

function validateInput(
  input: GetWorldCup2026GroupDetailInput | undefined
): { issues: ApiValidationIssue[]; group?: string; timezone: string } {
  const issues: ApiValidationIssue[] = [];
  const timezone = input?.timezone ?? DEFAULT_DAILY_MATCHES_TIMEZONE;
  const normalizedGroup = input?.group === undefined ? undefined : normalizeGroupInput(input.group);

  if (normalizedGroup === undefined || normalizedGroup.length === 0 || !VALID_GROUPS.has(normalizedGroup)) {
    issues.push({
      field: "group",
      message: "group must be one of A through L."
    });
  }

  if (!isValidTimeZone(timezone)) {
    issues.push({
      field: "timezone",
      message: "timezone must be a valid IANA timezone."
    });
  }

  return {
    issues,
    timezone,
    ...(normalizedGroup === undefined ? {} : { group: normalizedGroup })
  };
}

function toGroupDetailMatch(entry: WorldCup2026DailyMatchEntry, warnings: readonly string[] = []): WorldCup2026GroupDetailMatch {
  return {
    fixtureId: entry.fixtureId,
    ...(entry.providerFixtureId === undefined ? {} : { providerFixtureId: entry.providerFixtureId }),
    ...(entry.group === undefined ? {} : { group: entry.group }),
    ...(entry.matchday === undefined ? {} : { matchday: entry.matchday }),
    ...(entry.kickoffAt === undefined ? {} : { kickoffAt: entry.kickoffAt }),
    ...(entry.localizedKickoff === undefined ? {} : { localizedKickoff: entry.localizedKickoff }),
    homeTeam: entry.homeTeam,
    awayTeam: entry.awayTeam,
    state: entry.state,
    normalizedStatus: entry.normalizedStatus,
    ...(entry.homeScore === undefined ? {} : { homeScore: entry.homeScore }),
    ...(entry.awayScore === undefined ? {} : { awayScore: entry.awayScore }),
    ...(entry.venue === undefined ? {} : { venue: entry.venue }),
    predictionHistory: entry.predictionHistory,
    warnings
  };
}

function buildProviderMetadata(syncResult: WorldCup2026SyncResult): WorldCup2026GroupDetailSuccessResponse["providerMetadata"] {
  return {
    configuredProvider: syncResult.providerMode,
    activeProvider: syncResult.activeProvider,
    cacheUsed: syncResult.cacheUsed,
    localFallbackUsed: syncResult.localFallbackUsed,
    stale: syncResult.cacheUsed,
    ...(syncResult.lastSuccessfulSync === undefined ? {} : { lastSuccessfulSync: syncResult.lastSuccessfulSync })
  };
}

function compareGroupDetailMatches(a: WorldCup2026GroupDetailMatch, b: WorldCup2026GroupDetailMatch): number {
  const aKickoff = a.kickoffAt ?? "";
  const bKickoff = b.kickoffAt ?? "";
  const kickoffCompare = aKickoff.localeCompare(bKickoff);
  if (kickoffCompare !== 0) return kickoffCompare;
  return a.fixtureId.localeCompare(b.fixtureId);
}

function buildQualificationSummary(
  officialGroup: WorldCup2026GroupStandings,
  allOfficialGroups: readonly WorldCup2026GroupStandings[],
  provisionalAvailable: boolean,
  localFallbackUsed: boolean
): WorldCup2026GroupDetailSuccessResponse["qualification"] {
  const firstPlace = officialGroup.standings[0]?.team;
  const secondPlace = officialGroup.standings[1]?.team;
  const thirdPlace = officialGroup.standings[2]?.team;

  let thirdPlaceCurrentlyQualifying: boolean | undefined;
  if (thirdPlace !== undefined) {
    const fullRanking = buildWorldCup2026BestThirdPlaceRanking(allOfficialGroups);
    const entry = fullRanking.find((candidate) => candidate.group === officialGroup.group && candidate.team === thirdPlace);
    thirdPlaceCurrentlyQualifying = entry !== undefined ? entry.qualificationRank <= 8 : undefined;
  }

  let status: "official" | "provisional" | "foundation_only" = "official";
  if (localFallbackUsed || officialGroup.pendingFixtureCount > 0) {
    status = "foundation_only";
  } else if (provisionalAvailable) {
    status = "provisional";
  }

  return {
    ...(firstPlace === undefined ? {} : { firstPlace }),
    ...(secondPlace === undefined ? {} : { secondPlace }),
    ...(thirdPlace === undefined ? {} : { thirdPlace }),
    ...(thirdPlaceCurrentlyQualifying === undefined ? {} : { thirdPlaceCurrentlyQualifying }),
    status
  };
}

function buildStandingsTeams(officialGroup: WorldCup2026GroupStandings): WorldCup2026GroupDetailSuccessResponse["teams"] {
  return officialGroup.standings.map((entry, index) => ({
    team: entry.team,
    position: index + 1
  }));
}

export function buildWorldCup2026GroupDetail(
  input: BuildWorldCup2026GroupDetailInput
): WorldCup2026GroupDetailResponse {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const { issues: validationIssues, group, timezone } = validateInput(input);

  if (validationIssues.length > 0 || group === undefined) {
    return {
      status: "validation_error",
      issues: validationIssues,
      metadata: buildApiMetadata(["Group detail request failed validation before synchronized data was composed."])
    };
  }

  const liveStandings = getWorldCup2026LiveGroupStandings({
    completedResults: input.syncResult.completedResults,
    liveMatches: input.syncResult.liveMatches,
    activeProvider: input.syncResult.activeProvider,
    cacheUsed: input.syncResult.cacheUsed,
    localFallbackUsed: input.syncResult.localFallbackUsed,
    externalProviderEnabled: input.syncResult.externalProviderEnabled,
    ...(input.syncResult.lastSuccessfulSync === undefined
      ? {}
      : { lastSuccessfulSync: input.syncResult.lastSuccessfulSync }),
    generatedAt
  });

  const officialGroup = liveStandings.officialGroups.find((entry) => entry.group === group);
  const provisionalGroup = liveStandings.provisionalGroups?.find((entry) => entry.group === group) ?? null;

  if (officialGroup === undefined) {
    return {
      status: "validation_error",
      issues: [{ field: "group", message: `group '${group}' could not be resolved.` }],
      metadata: buildApiMetadata(["Group detail request could not resolve the requested group from current standings data."])
    };
  }

  const fixtureIndex = buildFixtureIndex();
  const snapshotStore = input.snapshotStore ?? defaultSnapshotStore;
  const evaluationStore = input.evaluationStore ?? defaultPredictionEvaluationStore;
  const groupTeams = new Set(WORLD_CUP_2026_FIXTURE_GROUPS.find((entry) => entry.group === group)?.teams ?? []);
  const seenKeys = new Set<string>();
  const completed: WorldCup2026GroupDetailMatch[] = [];
  const live: WorldCup2026GroupDetailMatch[] = [];
  const upcoming: WorldCup2026GroupDetailMatch[] = [];
  const postponed: WorldCup2026GroupDetailMatch[] = [];
  const cancelled: WorldCup2026GroupDetailMatch[] = [];
  const unscheduled: WorldCup2026GroupDetailMatch[] = [];
  const warnings: string[] = [...input.syncResult.warnings];
  const typedIssues: WorldCup2026DailyMatchIssue[] = [];

  for (const record of input.syncResult.fixtures) {
    const fixture = resolveFixture(record, fixtureIndex);
    const resolvedGroup = fixture?.group ?? record.group;
    const belongsToGroup = resolvedGroup === group
      || (fixture === undefined && groupTeams.has(record.homeTeam) && groupTeams.has(record.awayTeam));

    if (!belongsToGroup) {
      continue;
    }

    const dedupeKey = fixture?.id ?? record.providerFixtureId;
    if (seenKeys.has(dedupeKey)) {
      typedIssues.push({
        code: "duplicate_fixture",
        ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
        providerFixtureId: record.providerFixtureId,
        message: `Duplicate fixture record '${dedupeKey}' was skipped for group ${group}.`
      });
      warnings.push(`Duplicate fixture record '${dedupeKey}' was skipped for group ${group}.`);
      continue;
    }
    seenKeys.add(dedupeKey);

    if (record.status === "finished" && !isValidFinishedScore(record)) {
      typedIssues.push({
        code: "invalid_finished_score",
        ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
        providerFixtureId: record.providerFixtureId,
        message: `Finished fixture '${record.providerFixtureId}' is missing valid non-negative integer scores.`
      });
      warnings.push(`Finished fixture '${record.providerFixtureId}' is missing valid non-negative integer scores and was skipped.`);
      continue;
    }

    const entry = toGroupDetailMatch(
      buildDailyMatchEntry(record, fixture, timezone, snapshotStore, evaluationStore),
      fixture === undefined
        ? [`Fixture '${record.providerFixtureId}' could not be resolved to an internal group-stage fixture and was included using provider fields.`]
        : []
    );

    if (entry.warnings.length > 0) {
      warnings.push(...entry.warnings);
    }

    switch (mapDailyState(record.status)) {
      case "final":
        completed.push(entry);
        break;
      case "live":
      case "halftime":
        live.push(entry);
        break;
      case "upcoming":
        if (record.kickoffAt === undefined) {
          unscheduled.push(entry);
        } else {
          upcoming.push(entry);
        }
        break;
      case "postponed":
        postponed.push(entry);
        break;
      case "cancelled":
        cancelled.push(entry);
        break;
      case "unknown":
        warnings.push(`Fixture '${entry.fixtureId}' has unknown normalized status '${record.status}' and was excluded from grouped match collections.`);
        break;
    }
  }

  completed.sort(compareGroupDetailMatches);
  live.sort(compareGroupDetailMatches);
  upcoming.sort(compareGroupDetailMatches);
  postponed.sort(compareGroupDetailMatches);
  cancelled.sort(compareGroupDetailMatches);
  unscheduled.sort(compareGroupDetailMatches);

  if (input.syncResult.cacheUsed) {
    warnings.push("Group detail data was served from cache and may be stale.");
  }
  if (input.syncResult.localFallbackUsed) {
    warnings.push("Group detail data is using the local static fallback provider.");
  }

  if (typedIssues.length > 0) {
    warnings.push(`${typedIssues.length} fixture issue${typedIssues.length === 1 ? "" : "s"} were skipped while composing group detail data.`);
  }

  return {
    status: "success",
    group,
    timezone,
    generatedAt,
    teams: buildStandingsTeams(officialGroup),
    standings: {
      official: officialGroup.standings,
      ...(provisionalGroup === null ? {} : { liveProvisional: provisionalGroup.standings }),
      liveAvailable: provisionalGroup !== null
    },
    matches: {
      completed,
      live,
      upcoming,
      postponed,
      cancelled,
      unscheduled
    },
    qualification: buildQualificationSummary(
      officialGroup,
      liveStandings.officialGroups,
      provisionalGroup !== null,
      input.syncResult.localFallbackUsed
    ),
    providerMetadata: buildProviderMetadata(input.syncResult),
    warnings,
    metadata: buildApiMetadata([
      "Group detail composes existing live standings, synchronized fixtures, and read-only prediction history summaries for a single World Cup 2026 group.",
      "Official qualification context derives from official standings only; provisional standings are exposed separately when live matches exist.",
      "No predictions, snapshots, or evaluations are created or mutated while building group detail data."
    ])
  };
}

export async function getWorldCup2026GroupDetail(
  input: GetWorldCup2026GroupDetailInput
): Promise<WorldCup2026GroupDetailResponse> {
  const syncResult = await synchronizeWorldCup2026Results({});
  return buildWorldCup2026GroupDetail({
    ...input,
    syncResult
  });
}
