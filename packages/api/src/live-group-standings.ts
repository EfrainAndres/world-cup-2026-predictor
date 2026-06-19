import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026Fixture,
  WorldCup2026FixtureResult,
  WorldCup2026GroupStandings,
  WorldCup2026LiveGroupStandingsResponse,
  WorldCup2026LiveStandingsSyncMetadata,
  WorldCup2026ResultProviderMetadata,
  WorldCup2026StandingsMode
} from "./schemas.js";
import { buildApiMetadata } from "./schemas.js";
import {
  buildWorldCup2026GroupStandings,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA,
  WORLD_CUP_2026_TEAM_NAMES
} from "./world-cup-2026-teams.js";
import { createLocalStaticResultsProvider } from "./results-provider-foundation.js";

export interface GetWorldCup2026LiveGroupStandingsInput {
  completedResults?: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches?: readonly WorldCup2026ExternalFixtureRecord[];
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
): WorldCup2026Fixture | undefined {
  return index.byId.get(record.providerFixtureId) ?? index.byTeams.get(`${record.homeTeam}|${record.awayTeam}`);
}

function adaptRecordsToFixtureResults(
  records: readonly WorldCup2026ExternalFixtureRecord[],
  allowedStatuses: ReadonlySet<WorldCup2026ExternalMatchStatus>,
  fixtures: readonly WorldCup2026Fixture[],
  seenInternalIds: Set<string> = new Set()
): WorldCup2026FixtureResult[] {
  const index = buildFixtureIndex(fixtures);
  const results: WorldCup2026FixtureResult[] = [];

  for (const record of records) {
    if (!allowedStatuses.has(record.status)) continue;
    if (record.homeScore === undefined || record.awayScore === undefined) continue;

    const fixture = resolveInternalFixture(record, index);
    if (fixture === undefined) continue;
    if (seenInternalIds.has(fixture.id)) continue;

    seenInternalIds.add(fixture.id);
    results.push({
      fixtureId: fixture.id,
      status: "completed",
      homeScore: record.homeScore,
      awayScore: record.awayScore,
      resultSource: "external_api",
      ...(record.updatedAt !== undefined ? { updatedAt: record.updatedAt } : {})
    });
  }

  return results;
}

function buildOfficialGroups(
  completedRecords: readonly WorldCup2026ExternalFixtureRecord[],
  fixtures: readonly WorldCup2026Fixture[]
): readonly WorldCup2026GroupStandings[] {
  const officialResults = adaptRecordsToFixtureResults(completedRecords, FINISHED_STATUSES, fixtures);
  return buildWorldCup2026GroupStandings({ results: officialResults });
}

function buildProvisionalGroups(
  completedRecords: readonly WorldCup2026ExternalFixtureRecord[],
  liveRecords: readonly WorldCup2026ExternalFixtureRecord[],
  fixtures: readonly WorldCup2026Fixture[]
): readonly WorldCup2026GroupStandings[] {
  const seenInternalIds = new Set<string>();
  const completedResults = adaptRecordsToFixtureResults(completedRecords, FINISHED_STATUSES, fixtures, seenInternalIds);
  const liveResults = adaptRecordsToFixtureResults(liveRecords, LIVE_STATUSES, fixtures, seenInternalIds);
  return buildWorldCup2026GroupStandings({ results: [...completedResults, ...liveResults] });
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
  let activeProvider: string;
  let cacheUsed: boolean;
  let localFallbackUsed: boolean;
  let externalProviderEnabled: boolean;
  let lastSuccessfulSync: string | undefined;
  let resultProvider: WorldCup2026ResultProviderMetadata;

  if (input?.completedResults !== undefined) {
    completedRecords = input.completedResults;
    liveRecords = input.liveMatches ?? [];
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
    activeProvider = WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER.getMetadata().providerName;
    cacheUsed = false;
    localFallbackUsed = true;
    externalProviderEnabled = false;
    lastSuccessfulSync = completedResult.status === "success" ? completedResult.syncedAt : undefined;
    resultProvider = WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA;
  }

  const fixtures = WORLD_CUP_2026_GROUP_STAGE_FIXTURES;
  const activeLiveMatchCount = liveRecords.filter(
    (r) => LIVE_STATUSES.has(r.status)
  ).length;
  const completedMatchCount = completedRecords.filter(
    (r) => FINISHED_STATUSES.has(r.status)
  ).length;

  const officialGroups = buildOfficialGroups(completedRecords, fixtures);

  const provisionalGroups = activeLiveMatchCount > 0
    ? buildProvisionalGroups(completedRecords, liveRecords, fixtures)
    : null;

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
      ...(lastSuccessfulSync !== undefined ? { lastSuccessfulSync } : {})
    }
  );

  const warnings: string[] = [
    "Official standings use completed matches only. Scheduled fixtures are excluded.",
    "Tie-breaking is limited to points, goal difference, goals for, and team name until full FIFA rules are modeled.",
    "Live provisional standings are available only when active live or halftime matches exist.",
    "Projected standings are not yet available in this phase.",
    ...syncMetadata.warnings
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
