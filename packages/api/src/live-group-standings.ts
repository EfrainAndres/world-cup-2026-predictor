import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026ExternalStandingRecord,
  WorldCup2026Fixture,
  WorldCup2026FixtureResult,
  WorldCup2026GroupStandings,
  WorldCup2026LiveGroupStandingsResponse,
  WorldCup2026LiveStandingsIssue,
  WorldCup2026LiveStandingsSyncMetadata,
  WorldCup2026ResultProviderMetadata,
  WorldCup2026StandingsMode
} from "./schemas.js";
import { buildApiMetadata } from "./schemas.js";
import {
  buildWorldCup2026GroupStandings,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA,
  WORLD_CUP_2026_TEAM_NAMES
} from "./world-cup-2026-teams.js";
import { createLocalStaticResultsProvider } from "./results-provider-foundation.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";

export interface GetWorldCup2026LiveGroupStandingsInput {
  completedResults?: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches?: readonly WorldCup2026ExternalFixtureRecord[];
  standings?: readonly WorldCup2026ExternalStandingRecord[];
  cutoffAt?: string;
  activeProvider?: string;
  cacheUsed?: boolean;
  localFallbackUsed?: boolean;
  externalProviderEnabled?: boolean;
  lastSuccessfulSync?: string;
  generatedAt?: string;
  providerMetadata?: WorldCup2026ResultProviderMetadata;
}

const LIVE_STATUSES: ReadonlySet<WorldCup2026ExternalMatchStatus> = new Set(["live", "halftime"]);
const FINISHED_STATUSES: ReadonlySet<WorldCup2026ExternalMatchStatus> = new Set(["finished"]);
const PROVISIONAL_STATUSES: ReadonlySet<WorldCup2026ExternalMatchStatus> = new Set(["finished", "live", "halftime"]);
const VALID_GROUPS: ReadonlySet<string> = new Set(WORLD_CUP_2026_FIXTURE_GROUPS.map((group) => group.group));
const VALID_TEAM_KEYS: ReadonlySet<string> = new Set(WORLD_CUP_2026_TEAM_NAMES.map((team) => normalizeTeamSearchText(team)));

type FixtureScoreOrientation = "canonical" | "reversed";

interface FixtureResolution {
  fixture: WorldCup2026Fixture;
  scoreOrientation: FixtureScoreOrientation;
}

function buildFixtureIndex(fixtures: readonly WorldCup2026Fixture[]): {
  byId: Map<string, WorldCup2026Fixture>;
  byTeams: Map<string, WorldCup2026Fixture>;
} {
  return {
    byId: new Map(fixtures.map((f) => [f.id, f])),
    byTeams: new Map(fixtures.map((f) => [`${f.homeTeam}|${f.awayTeam}`, f]))
  };
}

function resolveInternalFixture(
  record: WorldCup2026ExternalFixtureRecord,
  index: ReturnType<typeof buildFixtureIndex>
): FixtureResolution | undefined {
  const fixtureById = index.byId.get(record.providerFixtureId);
  if (fixtureById !== undefined) {
    return {
      fixture: fixtureById,
      scoreOrientation: "canonical"
    };
  }

  const homeTeam = canonicalizeTeamName(record.homeTeam);
  const awayTeam = canonicalizeTeamName(record.awayTeam);
  const directFixture = index.byTeams.get(`${homeTeam}|${awayTeam}`);
  if (directFixture !== undefined) {
    return {
      fixture: directFixture,
      scoreOrientation: "canonical"
    };
  }

  const reversedFixture = index.byTeams.get(`${awayTeam}|${homeTeam}`);
  if (reversedFixture !== undefined) {
    return {
      fixture: reversedFixture,
      scoreOrientation: "reversed"
    };
  }

  return undefined;
}

function normalizeProviderGroupLabel(group: string | undefined): string | undefined {
  if (group === undefined) return undefined;
  const normalized = group.trim().toUpperCase().replace(/^GROUP_/, "");
  return normalized.length === 0 ? undefined : normalized;
}

function recordTimestamp(record: WorldCup2026ExternalFixtureRecord): string | undefined {
  return record.updatedAt ?? record.kickoffAt;
}

function isAfterCutoff(record: WorldCup2026ExternalFixtureRecord, cutoffAt: string | undefined): boolean {
  if (cutoffAt === undefined) return false;
  const timestamp = recordTimestamp(record);
  if (timestamp === undefined) return false;
  const recordMs = Date.parse(timestamp);
  const cutoffMs = Date.parse(cutoffAt);
  if (!Number.isFinite(recordMs) || !Number.isFinite(cutoffMs)) return false;
  return recordMs > cutoffMs;
}

function isValidScore(score: number | undefined): boolean {
  return score !== undefined && Number.isInteger(score) && score >= 0;
}

function pushIssue(
  issues: WorldCup2026LiveStandingsIssue[],
  issue: WorldCup2026LiveStandingsIssue
): void {
  const duplicate = issues.some(
    (existing) =>
      existing.code === issue.code &&
      existing.providerFixtureId === issue.providerFixtureId &&
      existing.fixtureId === issue.fixtureId &&
      existing.group === issue.group &&
      existing.team === issue.team &&
      existing.message === issue.message
  );
  if (duplicate) return;
  issues.push(issue);
}

function validateRecordForStandings(
  record: WorldCup2026ExternalFixtureRecord,
  fixture: WorldCup2026Fixture | undefined,
  issues: WorldCup2026LiveStandingsIssue[],
  cutoffAt: string | undefined
): boolean {
  if (isAfterCutoff(record, cutoffAt)) {
    pushIssue(issues, {
      code: "future_record_excluded",
      providerFixtureId: record.providerFixtureId,
      ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
      message: `Fixture '${record.providerFixtureId}' was excluded because its provider timestamp is after the standings cutoff.`
    });
    return false;
  }

  const normalizedGroup = normalizeProviderGroupLabel(record.group);
  if (normalizedGroup === undefined) {
    pushIssue(issues, {
      code: "missing_group_label",
      providerFixtureId: record.providerFixtureId,
      ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
      message: `Fixture '${record.providerFixtureId}' is missing a provider group label.`
    });
  } else if (!VALID_GROUPS.has(normalizedGroup)) {
    pushIssue(issues, {
      code: "invalid_group_label",
      providerFixtureId: record.providerFixtureId,
      group: normalizedGroup,
      message: `Fixture '${record.providerFixtureId}' has invalid group label '${normalizedGroup}'.`
    });
    return false;
  } else if (fixture !== undefined && fixture.group !== normalizedGroup) {
    pushIssue(issues, {
      code: "provider_group_mismatch",
      providerFixtureId: record.providerFixtureId,
      fixtureId: fixture.id,
      group: normalizedGroup,
      message: `Fixture '${record.providerFixtureId}' provider group '${normalizedGroup}' does not match canonical group '${fixture.group}'.`
    });
    return false;
  }

  const homeTeam = canonicalizeTeamName(record.homeTeam);
  const awayTeam = canonicalizeTeamName(record.awayTeam);
  if (!VALID_TEAM_KEYS.has(normalizeTeamSearchText(homeTeam))) {
    pushIssue(issues, {
      code: "unresolved_canonical_team",
      providerFixtureId: record.providerFixtureId,
      team: record.homeTeam,
      message: `Home team '${record.homeTeam}' could not be resolved to the canonical World Cup 2026 team list.`
    });
    return false;
  }

  if (!VALID_TEAM_KEYS.has(normalizeTeamSearchText(awayTeam))) {
    pushIssue(issues, {
      code: "unresolved_canonical_team",
      providerFixtureId: record.providerFixtureId,
      team: record.awayTeam,
      message: `Away team '${record.awayTeam}' could not be resolved to the canonical World Cup 2026 team list.`
    });
    return false;
  }

  if (fixture === undefined) {
    pushIssue(issues, {
      code: "provider_fixture_unresolved",
      providerFixtureId: record.providerFixtureId,
      message: `Fixture '${record.providerFixtureId}' could not be resolved to a canonical World Cup 2026 group-stage fixture.`
    });
    return false;
  }

  if (record.status === "finished" && (!isValidScore(record.homeScore) || !isValidScore(record.awayScore))) {
    pushIssue(issues, {
      code: "invalid_finished_score",
      providerFixtureId: record.providerFixtureId,
      fixtureId: fixture.id,
      message: `Finished fixture '${record.providerFixtureId}' was excluded because it lacks valid final scores.`
    });
    return false;
  }

  return true;
}

function adaptRecordsToFixtureResults(
  records: readonly WorldCup2026ExternalFixtureRecord[],
  allowedStatuses: ReadonlySet<WorldCup2026ExternalMatchStatus>,
  fixtures: readonly WorldCup2026Fixture[],
  seenInternalIds: Set<string> = new Set(),
  issues: WorldCup2026LiveStandingsIssue[] = [],
  cutoffAt?: string
): WorldCup2026FixtureResult[] {
  const index = buildFixtureIndex(fixtures);
  const results: WorldCup2026FixtureResult[] = [];

  for (const record of records) {
    if (!allowedStatuses.has(record.status)) continue;

    const resolution = resolveInternalFixture(record, index);
    const fixture = resolution?.fixture;
    if (!validateRecordForStandings(record, fixture, issues, cutoffAt)) continue;
    if (resolution === undefined) continue;
    if (record.homeScore === undefined || record.awayScore === undefined) continue;

    if (seenInternalIds.has(resolution.fixture.id)) {
      pushIssue(issues, {
        code: "duplicate_fixture",
        providerFixtureId: record.providerFixtureId,
        fixtureId: resolution.fixture.id,
        message: `Duplicate fixture '${resolution.fixture.id}' was skipped while composing standings.`
      });
      continue;
    }

    const homeScore = resolution.scoreOrientation === "canonical" ? record.homeScore : record.awayScore;
    const awayScore = resolution.scoreOrientation === "canonical" ? record.awayScore : record.homeScore;

    seenInternalIds.add(resolution.fixture.id);
    results.push({
      fixtureId: resolution.fixture.id,
      status: "completed",
      homeScore,
      awayScore,
      resultSource: "external_api",
      ...(record.updatedAt !== undefined ? { updatedAt: record.updatedAt } : {})
    });
  }

  return results;
}

function buildProvisionalGroups(
  completedResults: readonly WorldCup2026FixtureResult[],
  liveRecords: readonly WorldCup2026ExternalFixtureRecord[],
  fixtures: readonly WorldCup2026Fixture[],
  issues: WorldCup2026LiveStandingsIssue[],
  cutoffAt?: string
): readonly WorldCup2026GroupStandings[] {
  const seenInternalIds = new Set<string>(completedResults.map((result) => result.fixtureId));
  const liveResults = adaptRecordsToFixtureResults(liveRecords, LIVE_STATUSES, fixtures, seenInternalIds, issues, cutoffAt);
  return buildWorldCup2026GroupStandings({ results: [...completedResults, ...liveResults] });
}

function analyzeProviderStandings(
  providerStandings: readonly WorldCup2026ExternalStandingRecord[],
  officialGroups: readonly WorldCup2026GroupStandings[]
): WorldCup2026LiveStandingsIssue[] {
  if (providerStandings.length === 0) return [];

  const issues: WorldCup2026LiveStandingsIssue[] = [];
  const hasUngroupedRows = providerStandings.some((entry) => normalizeProviderGroupLabel(entry.group) === undefined);
  if (hasUngroupedRows) {
    issues.push({
      code: "provider_standings_not_grouped",
      message: "Provider standings include ungrouped rows and were not used as grouped standings truth."
    });
  }

  const officialByTeam = new Map<string, { played: number; points: number }>();
  for (const group of officialGroups) {
    for (const entry of group.standings) {
      officialByTeam.set(normalizeTeamSearchText(entry.team), {
        played: entry.played,
        points: entry.points
      });
    }
  }

  for (const providerEntry of providerStandings) {
    if (normalizeProviderGroupLabel(providerEntry.group) !== undefined) continue;
    const canonicalTeam = canonicalizeTeamName(providerEntry.team);
    const official = officialByTeam.get(normalizeTeamSearchText(canonicalTeam));
    if (official === undefined) continue;
    if (official.played !== providerEntry.played || official.points !== providerEntry.points) {
      issues.push({
        code: "provider_global_standings_mismatch",
        team: providerEntry.team,
        message: `Provider global standings for '${providerEntry.team}' differ from fixture-derived standings and were used only as cross-check evidence.`
      });
    }
  }

  return issues;
}

function buildSyncMetadata(
  mode: WorldCup2026StandingsMode,
  activeLiveMatchCount: number,
  completedMatchCount: number,
  generatedAt: string,
  opts: {
    activeProvider: string;
    cacheUsed: boolean;
    localFallbackUsed: boolean;
    externalProviderEnabled: boolean;
    lastSuccessfulSync?: string;
    extraWarnings?: readonly string[];
  }
): WorldCup2026LiveStandingsSyncMetadata {
  const warnings: string[] = [];
  if (opts.localFallbackUsed) {
    warnings.push("External provider data is unavailable. Local static standings are used as fallback.");
  }
  if (opts.cacheUsed) {
    warnings.push("Standings data was served from the in-memory cache. The external provider may be temporarily unavailable.");
  }
  if (opts.extraWarnings) {
    warnings.push(...opts.extraWarnings);
  }

  return {
    mode,
    activeProvider: opts.activeProvider,
    cacheUsed: opts.cacheUsed,
    localFallbackUsed: opts.localFallbackUsed,
    externalProviderEnabled: opts.externalProviderEnabled,
    ...(opts.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: opts.lastSuccessfulSync } : {}),
    generatedAt,
    activeLiveMatchCount,
    completedMatchCount,
    warnings
  };
}

export function getWorldCup2026LiveGroupStandings(
  input?: GetWorldCup2026LiveGroupStandingsInput
): WorldCup2026LiveGroupStandingsResponse {
  const generatedAt = input?.generatedAt ?? new Date().toISOString();

  let completedRecords: readonly WorldCup2026ExternalFixtureRecord[];
  let liveRecords: readonly WorldCup2026ExternalFixtureRecord[];
  let providerStandings: readonly WorldCup2026ExternalStandingRecord[];
  let activeProvider: string;
  let cacheUsed: boolean;
  let localFallbackUsed: boolean;
  let externalProviderEnabled: boolean;
  let lastSuccessfulSync: string | undefined;
  let resultProvider: WorldCup2026ResultProviderMetadata;

  if (input?.completedResults !== undefined) {
    completedRecords = input.completedResults;
    liveRecords = input.liveMatches ?? [];
    providerStandings = input.standings ?? [];
    activeProvider = input.activeProvider ?? "external_provider";
    cacheUsed = input.cacheUsed ?? false;
    localFallbackUsed = input.localFallbackUsed ?? false;
    externalProviderEnabled = input.externalProviderEnabled ?? true;
    lastSuccessfulSync = input.lastSuccessfulSync;
    resultProvider = input.providerMetadata ?? WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA;
  } else {
    const localProvider = createLocalStaticResultsProvider();
    const completedResult = localProvider.getCompletedResults();
    const liveResult = localProvider.getLiveMatches();
    completedRecords = completedResult.status === "success" ? completedResult.records : [];
    liveRecords = liveResult.status === "success" ? liveResult.records : [];
    providerStandings = [];
    activeProvider = WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER.getMetadata().providerName;
    cacheUsed = false;
    localFallbackUsed = true;
    externalProviderEnabled = false;
    lastSuccessfulSync = completedResult.status === "success" ? completedResult.syncedAt : undefined;
    resultProvider = WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA;
  }

  const fixtures = WORLD_CUP_2026_GROUP_STAGE_FIXTURES;
  const standingsIssues: WorldCup2026LiveStandingsIssue[] = [];
  const activeLiveMatchCount = liveRecords.filter(
    (r) => LIVE_STATUSES.has(r.status)
  ).length;
  const providerFinishedRecordCount = completedRecords.filter((r) => FINISHED_STATUSES.has(r.status)).length;

  const officialResults = adaptRecordsToFixtureResults(
    completedRecords,
    FINISHED_STATUSES,
    fixtures,
    new Set(),
    standingsIssues,
    input?.cutoffAt
  );
  const completedMatchCount = officialResults.length;
  const officialGroups = buildWorldCup2026GroupStandings({ results: officialResults });

  const provisionalGroups = activeLiveMatchCount > 0
    ? buildProvisionalGroups(officialResults, liveRecords, fixtures, standingsIssues, input?.cutoffAt)
    : null;
  standingsIssues.push(...analyzeProviderStandings(providerStandings, officialGroups));

  const projectedGroups = null;

  const syncMetadata = buildSyncMetadata(
    "official",
    activeLiveMatchCount,
    completedMatchCount,
    generatedAt,
    {
      activeProvider,
      cacheUsed,
      localFallbackUsed,
      externalProviderEnabled,
      ...(lastSuccessfulSync !== undefined ? { lastSuccessfulSync } : {}),
      ...(providerFinishedRecordCount !== completedMatchCount
        ? {
            extraWarnings: [
              `Official standings accepted ${completedMatchCount} of ${providerFinishedRecordCount} finished provider record${providerFinishedRecordCount === 1 ? "" : "s"} after validation.`
            ]
          }
        : {})
    }
  );

  const warnings: string[] = [
    "Official standings use completed matches only. Scheduled fixtures are excluded.",
    "Tie-breaking is limited to points, goal difference, goals for, and team name until full FIFA rules are modeled.",
    "Live provisional standings are available only when active live or halftime matches exist.",
    "Projected standings are not yet available in this phase.",
    ...syncMetadata.warnings,
    ...standingsIssues.map((issue) => issue.message)
  ];

  if (provisionalGroups !== null) {
    warnings.push(`${activeLiveMatchCount} live or halftime match${activeLiveMatchCount === 1 ? "" : "es"} included in provisional standings.`);
    warnings.push("Provisional standings include current live scores and are not official.");
  }

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_live_group_standings",
    groupCount: officialGroups.length,
    teamCount: WORLD_CUP_2026_TEAM_NAMES.length,
    officialGroups,
    provisionalGroups,
    projectedGroups,
    activeLiveMatchCount,
    completedMatchCount,
    syncMetadata,
    standingsIssues,
    resultProvider,
    warnings,
    metadata: buildApiMetadata([
      "Live group standings expose official, provisional, and projected modes.",
      "Official mode uses completed matches only. Provisional mode adds current live scores. Projected mode is not yet implemented.",
      "Result precedence: finished external → live external → local static completed → no contribution.",
      "Duplicate fixtures are deduplicated by internal fixture ID. No Elo or prediction logic is changed."
    ])
  };
}
