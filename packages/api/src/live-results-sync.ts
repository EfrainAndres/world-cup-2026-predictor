import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026ExternalStandingRecord,
  WorldCup2026ResultsProviderError,
  WorldCup2026SyncProviderMode,
  WorldCup2026SyncResult
} from "./schemas.js";
import {
  createCachedResultsProvider,
  createLocalStaticResultsProvider,
  resolveWorldCup2026ResultsProviderFoundation,
  type WorldCup2026FootballResultsProvider
} from "./results-provider-foundation.js";

const FOOTBALL_DATA_ORG_PROVIDER_ID = "football_data_org_results_provider";
const FOOTBALL_DATA_ORG_BASE_URL = "https://api.football-data.org";

export interface FootballDataOrgProviderConfig {
  token: string;
  competitionCode?: string;
  season?: string;
  fetch?: typeof globalThis.fetch;
}

export interface SynchronizeWorldCup2026ResultsInput {
  token?: string;
  competitionCode?: string;
  season?: string;
  providerMode?: string;
  fetch?: typeof globalThis.fetch;
  cachedProvider?: WorldCup2026FootballResultsProvider;
}

interface FootballDataOrgTeamRef {
  id: number | null;
  name: string | null;
  shortName?: string | null;
}

interface FootballDataOrgScore {
  fullTime: { home: number | null; away: number | null };
  halfTime?: { home: number | null; away: number | null };
}

interface FootballDataOrgMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string | null;
  group: string | null;
  lastUpdated: string;
  homeTeam: FootballDataOrgTeamRef;
  awayTeam: FootballDataOrgTeamRef;
  score: FootballDataOrgScore;
  venue?: string | null;
}

interface FootballDataOrgMatchesResponse {
  count: number;
  matches: FootballDataOrgMatch[];
}

interface FootballDataOrgStandingEntry {
  position: number;
  team: { id: number; name: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface FootballDataOrgStandingGroup {
  stage: string;
  type: string;
  group: string | null;
  table: FootballDataOrgStandingEntry[];
}

interface FootballDataOrgStandingsResponse {
  standings: FootballDataOrgStandingGroup[];
}

interface PreloadedProviderData {
  fixtures: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches: readonly WorldCup2026ExternalFixtureRecord[];
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  standings: readonly WorldCup2026ExternalStandingRecord[];
  syncedAt: string;
  fixtureWarnings?: readonly string[];
  standingsWarnings?: readonly string[];
}

function mapFootballDataOrgStatus(status: string): WorldCup2026ExternalMatchStatus {
  switch (status.toUpperCase()) {
    case "FINISHED":
      return "finished";
    case "IN_PLAY":
      return "live";
    case "PAUSED":
      return "halftime";
    case "SCHEDULED":
    case "TIMED":
      return "scheduled";
    case "POSTPONED":
      return "postponed";
    case "SUSPENDED":
    case "CANCELLED":
      return "cancelled";
    default:
      return "unknown";
  }
}

function normalizeGroupLabel(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toUpperCase().replace(/^GROUP_/, "");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeFootballDataOrgMatches(
  matches: FootballDataOrgMatch[],
  season: string,
  syncedAt: string
): WorldCup2026ExternalFixtureRecord[] {
  return matches.map((match) => {
    const status = mapFootballDataOrgStatus(match.status);
    const group = normalizeGroupLabel(match.group);
    const homeScore = match.score.fullTime.home !== null ? match.score.fullTime.home : undefined;
    const awayScore = match.score.fullTime.away !== null ? match.score.fullTime.away : undefined;

    const record: WorldCup2026ExternalFixtureRecord = {
      providerFixtureId: String(match.id),
      competition: "FIFA World Cup",
      season,
      ...(match.stage !== null ? { stage: match.stage } : {}),
      ...(group !== undefined ? { group } : {}),
      ...(match.matchday !== null ? { matchday: match.matchday } : {}),
      ...(match.utcDate ? { kickoffAt: match.utcDate } : {}),
      homeTeam: match.homeTeam.name ?? "",
      awayTeam: match.awayTeam.name ?? "",
      status,
      ...(homeScore !== undefined ? { homeScore } : {}),
      ...(awayScore !== undefined ? { awayScore } : {}),
      ...(match.venue ? { venue: match.venue } : {}),
      updatedAt: match.lastUpdated ?? syncedAt
    };

    return record;
  });
}

function normalizeFootballDataOrgStandings(
  groups: FootballDataOrgStandingGroup[],
  syncedAt: string
): WorldCup2026ExternalStandingRecord[] {
  return groups
    .filter((g) => g.type === "TOTAL")
    .flatMap((g) => {
      const group = normalizeGroupLabel(g.group);
      return g.table.map((entry) => ({
        ...(group !== undefined ? { group } : {}),
        team: entry.team.name,
        position: entry.position,
        played: entry.playedGames,
        wins: entry.won,
        draws: entry.draw,
        losses: entry.lost,
        goalsFor: entry.goalsFor,
        goalsAgainst: entry.goalsAgainst,
        goalDifference: entry.goalDifference,
        points: entry.points,
        updatedAt: syncedAt
      }));
    });
}

function getFootballDataOrgStandingsWarnings(
  groups: readonly FootballDataOrgStandingGroup[]
): readonly string[] {
  const totalGroups = groups.filter((g) => g.type === "TOTAL");
  const hasUngroupedTotal = totalGroups.some((g) => g.group === null);

  if (!hasUngroupedTotal) {
    return [];
  }

  return [
    "football-data.org standings endpoint returned an ungrouped global TOTAL table. " +
      "Grouped standings are derived from normalized match records instead."
  ];
}

function createPreloadedProvider(
  providerId: string,
  data: PreloadedProviderData
): WorldCup2026FootballResultsProvider {
  const fixtureWarnings: readonly string[] = data.fixtureWarnings ?? [];
  const standingsWarnings: readonly string[] = data.standingsWarnings ?? [];
  const success = <T>(records: readonly T[], warnings: readonly string[] = []) => ({
    status: "success" as const,
    providerId,
    records,
    servedFromCache: false,
    syncedAt: data.syncedAt,
    warnings
  });

  return {
    id: providerId,
    // Warnings for omitted fixtures are surfaced on the fixture listing only.
    getFixtures: () => success(data.fixtures, fixtureWarnings),
    getLiveMatches: () => success(data.liveMatches),
    getCompletedResults: () => success(data.completedResults),
    getStandings: () => success(data.standings, standingsWarnings)
  };
}

function createFootballDataOrgErrorProvider(
  message: string
): WorldCup2026FootballResultsProvider {
  type ProviderOperation = "fixtures" | "live_matches" | "completed_results" | "standings";
  const failure = (operation: ProviderOperation) => ({
    status: "error" as const,
    providerId: FOOTBALL_DATA_ORG_PROVIDER_ID,
    servedFromCache: false as const,
    warnings: ["football-data.org provider failed to retrieve data."] as readonly string[],
    error: {
      code: "provider_unavailable" as const,
      providerId: FOOTBALL_DATA_ORG_PROVIDER_ID,
      operation,
      message
    } satisfies WorldCup2026ResultsProviderError
  });

  return {
    id: FOOTBALL_DATA_ORG_PROVIDER_ID,
    getFixtures: () => failure("fixtures"),
    getLiveMatches: () => failure("live_matches"),
    getCompletedResults: () => failure("completed_results"),
    getStandings: () => failure("standings")
  };
}

export async function createFootballDataOrgResultsProvider(
  config: FootballDataOrgProviderConfig
): Promise<WorldCup2026FootballResultsProvider> {
  const competitionCode = config.competitionCode ?? "WC";
  const season = config.season ?? "2026";
  const fetchFn = config.fetch ?? globalThis.fetch;

  const matchesUrl = `${FOOTBALL_DATA_ORG_BASE_URL}/v4/competitions/${competitionCode}/matches?season=${season}`;
  const standingsUrl = `${FOOTBALL_DATA_ORG_BASE_URL}/v4/competitions/${competitionCode}/standings?season=${season}`;
  const headers = { "X-Auth-Token": config.token };

  try {
    const [matchesResponse, standingsResponse] = await Promise.all([
      fetchFn(matchesUrl, { headers }),
      fetchFn(standingsUrl, { headers })
    ]);

    if (!matchesResponse.ok) {
      return createFootballDataOrgErrorProvider(
        `HTTP ${matchesResponse.status}: matches endpoint returned an error response.`
      );
    }

    if (!standingsResponse.ok) {
      return createFootballDataOrgErrorProvider(
        `HTTP ${standingsResponse.status}: standings endpoint returned an error response.`
      );
    }

    let matchesData: FootballDataOrgMatchesResponse;
    let standingsData: FootballDataOrgStandingsResponse;

    try {
      matchesData = (await matchesResponse.json()) as FootballDataOrgMatchesResponse;
      standingsData = (await standingsResponse.json()) as FootballDataOrgStandingsResponse;
    } catch {
      return createFootballDataOrgErrorProvider("Failed to parse football-data.org API response as JSON.");
    }

    if (!Array.isArray(matchesData?.matches)) {
      return createFootballDataOrgErrorProvider(
        "football-data.org matches response is missing the expected matches array."
      );
    }

    if (!Array.isArray(standingsData?.standings)) {
      return createFootballDataOrgErrorProvider(
        "football-data.org standings response is missing the expected standings array."
      );
    }

    const syncedAt = new Date().toISOString();

    // Filter out knockout fixtures whose participants are not yet known.
    // Matches with a null or blank team name cannot be normalized and would
    // cause normalizeExternalFixtureRecords to reject the entire bundle.
    // We omit only the unresolved fixtures and surface a sanitized warning.
    const resolvedMatches = matchesData.matches.filter(
      (m) => m.homeTeam.name !== null && m.homeTeam.name.trim().length > 0 &&
             m.awayTeam.name !== null && m.awayTeam.name.trim().length > 0
    );
    const unresolvedCount = matchesData.matches.length - resolvedMatches.length;

    const allFixtures = normalizeFootballDataOrgMatches(resolvedMatches, season, syncedAt);

    const dataWarnings: readonly string[] =
      unresolvedCount > 0
        ? [
            `${unresolvedCount} fixture(s) with unresolved participants were omitted from provider results` +
              " and will be included when their participants are confirmed."
          ]
        : [];

    const liveStatuses: WorldCup2026ExternalMatchStatus[] = ["live", "halftime"];
    const liveMatches = allFixtures.filter((f) => liveStatuses.includes(f.status));
    const completedResults = allFixtures.filter((f) => f.status === "finished");
    const standings = normalizeFootballDataOrgStandings(standingsData.standings, syncedAt);
    const standingsWarnings = getFootballDataOrgStandingsWarnings(standingsData.standings);

    return createPreloadedProvider(FOOTBALL_DATA_ORG_PROVIDER_ID, {
      fixtures: allFixtures,
      liveMatches,
      completedResults,
      ...(dataWarnings.length > 0 ? { fixtureWarnings: dataWarnings } : {}),
      ...(standingsWarnings.length > 0 ? { standingsWarnings } : {}),
      standings,
      syncedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error.";
    return createFootballDataOrgErrorProvider(`Network request failed: ${message}`);
  }
}

function buildLocalSyncResult(
  providerMode: WorldCup2026SyncProviderMode,
  syncedAt: string,
  extraWarnings: readonly string[] = [],
  error?: WorldCup2026ResultsProviderError
): WorldCup2026SyncResult {
  const localProvider = createLocalStaticResultsProvider();
  const fixtures = localProvider.getFixtures();
  const liveMatches = localProvider.getLiveMatches();
  const completedResults = localProvider.getCompletedResults();
  const standings = localProvider.getStandings();

  if (
    fixtures.status !== "success" ||
    liveMatches.status !== "success" ||
    completedResults.status !== "success" ||
    standings.status !== "success"
  ) {
    throw new Error("Local static provider must always succeed.");
  }

  const warnings = [
    ...extraWarnings,
    ...fixtures.warnings
  ];

  return {
    status: error !== undefined ? "error" : "success",
    providerMode,
    activeProvider: "local_static_results_provider",
    cacheUsed: false,
    localFallbackUsed: true,
    externalProviderEnabled: providerMode === "football_data_org",
    syncedAt,
    ...(fixtures.syncedAt !== undefined ? { lastSuccessfulSync: fixtures.syncedAt } : {}),
    fixtures: fixtures.records,
    liveMatches: liveMatches.records,
    completedResults: completedResults.records,
    standings: standings.records,
    normalizationIssues: [],
    warnings,
    ...(error !== undefined ? { error } : {})
  };
}

export async function synchronizeWorldCup2026Results(
  input?: SynchronizeWorldCup2026ResultsInput
): Promise<WorldCup2026SyncResult> {
  const resolvedProviderMode =
    input?.providerMode ?? (typeof process !== "undefined" ? process.env["RESULTS_PROVIDER"] : undefined) ?? "local";
  const syncedAt = new Date().toISOString();

  if (resolvedProviderMode !== "football_data_org") {
    return buildLocalSyncResult(
      "local_static",
      syncedAt,
      ["RESULTS_PROVIDER is not set to 'football_data_org'. No external synchronization is performed."]
    );
  }

  const token =
    input?.token ??
    (typeof process !== "undefined" ? process.env["FOOTBALL_DATA_API_TOKEN"] : undefined) ??
    "";

  if (!token) {
    return buildLocalSyncResult(
      "football_data_org",
      syncedAt,
      [
        "FOOTBALL_DATA_API_TOKEN is not set. Falling back to local static data.",
        "Set FOOTBALL_DATA_API_TOKEN in your environment to enable live synchronization."
      ],
      {
        code: "provider_disabled",
        providerId: FOOTBALL_DATA_ORG_PROVIDER_ID,
        operation: "bundle",
        message: "FOOTBALL_DATA_API_TOKEN is not configured. Live synchronization is disabled."
      }
    );
  }

  const competitionCode =
    input?.competitionCode ??
    (typeof process !== "undefined" ? process.env["FOOTBALL_DATA_COMPETITION_CODE"] : undefined) ??
    "WC";
  const season =
    input?.season ??
    (typeof process !== "undefined" ? process.env["FOOTBALL_DATA_SEASON"] : undefined) ??
    "2026";

  const externalProvider = await createFootballDataOrgResultsProvider({
    token,
    competitionCode,
    season,
    ...(input?.fetch !== undefined ? { fetch: input.fetch } : {})
  });

  const cachedProvider =
    input?.cachedProvider ?? createCachedResultsProvider(externalProvider);
  const localProvider = createLocalStaticResultsProvider();

  const foundationResult = resolveWorldCup2026ResultsProviderFoundation({
    externalProvider,
    cachedProvider,
    localProvider
  });

  const allWarnings: string[] = [
    ...(foundationResult.provider.localFallbackUsed
      ? ["External provider failed. Local static data was used as fallback."]
      : []),
    ...foundationResult.warnings,
    ...foundationResult.provider.warnings
  ];

  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: foundationResult.provider.activeProvider,
    cacheUsed: foundationResult.provider.cacheUsed,
    localFallbackUsed: foundationResult.provider.localFallbackUsed,
    externalProviderEnabled: true,
    syncedAt,
    ...(foundationResult.provider.lastSuccessfulSync !== undefined
      ? { lastSuccessfulSync: foundationResult.provider.lastSuccessfulSync }
      : {}),
    fixtures: foundationResult.fixtures,
    liveMatches: foundationResult.liveMatches,
    completedResults: foundationResult.completedResults,
    standings: foundationResult.standings,
    normalizationIssues: foundationResult.provider.normalizationIssues,
    warnings: allWarnings,
    ...(foundationResult.provider.error !== undefined ? { error: foundationResult.provider.error } : {})
  };
}
