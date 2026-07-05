import { buildWorldCup2026GroupStandings, WORLD_CUP_2026_GROUP_STAGE_FIXTURES, WORLD_CUP_2026_LOCAL_STATIC_RESULTS } from "./world-cup-2026-teams.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026ExternalStandingRecord,
  WorldCup2026Fixture,
  WorldCup2026FixtureResult,
  WorldCup2026GroupStandings,
  WorldCup2026ResultsProviderError,
  WorldCup2026ResultsProviderFoundationResponse,
  WorldCup2026ResultProviderMetadata
} from "./schemas.js";

type ProviderOperation = "fixtures" | "live_matches" | "completed_results" | "standings";

export interface WorldCup2026ResultsProviderSuccess<T> {
  status: "success";
  providerId: string;
  records: readonly T[];
  servedFromCache: boolean;
  syncedAt?: string | undefined;
  warnings: readonly string[];
  error?: WorldCup2026ResultsProviderError;
}

export interface WorldCup2026ResultsProviderFailure {
  status: "error";
  providerId: string;
  servedFromCache: false;
  warnings: readonly string[];
  error: WorldCup2026ResultsProviderError;
}

export type WorldCup2026ResultsProviderResult<T> =
  | WorldCup2026ResultsProviderSuccess<T>
  | WorldCup2026ResultsProviderFailure;

export interface WorldCup2026FootballResultsProvider {
  id: string;
  getFixtures: () => WorldCup2026ResultsProviderResult<WorldCup2026ExternalFixtureRecord>;
  getLiveMatches: () => WorldCup2026ResultsProviderResult<WorldCup2026ExternalFixtureRecord>;
  getCompletedResults: () => WorldCup2026ResultsProviderResult<WorldCup2026ExternalFixtureRecord>;
  getStandings: () => WorldCup2026ResultsProviderResult<WorldCup2026ExternalStandingRecord>;
}

interface NormalizationSuccess<T> {
  status: "success";
  records: readonly T[];
  issues: readonly WorldCup2026ResultsProviderError[];
}

interface NormalizationFailure {
  status: "error";
  error: WorldCup2026ResultsProviderError;
}

type NormalizationResult<T> = NormalizationSuccess<T> | NormalizationFailure;

interface ProviderBundle {
  fixtures: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches: readonly WorldCup2026ExternalFixtureRecord[];
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  standings: readonly WorldCup2026ExternalStandingRecord[];
  normalizationIssues: readonly WorldCup2026ResultsProviderError[];
  lastSuccessfulSync?: string;
}

interface ProviderBundleSuccess {
  status: "success";
  providerId: string;
  bundle: ProviderBundle;
  cacheUsed: boolean;
  warnings: readonly string[];
  error?: WorldCup2026ResultsProviderError;
}

interface ProviderBundleFailure {
  status: "error";
  providerId: string;
  warnings: readonly string[];
  error: WorldCup2026ResultsProviderError;
}

type ProviderBundleResult = ProviderBundleSuccess | ProviderBundleFailure;

const LOCAL_RESULTS_PROVIDER_ID = "local_static_results_provider";
const EXTERNAL_STUB_PROVIDER_ID = "external_api_results_provider";
const CACHED_EXTERNAL_PROVIDER_ID = "cached_external_results_provider";

function createProviderError(
  providerId: string,
  operation: WorldCup2026ResultsProviderError["operation"],
  code: WorldCup2026ResultsProviderError["code"],
  message: string,
  details?: readonly string[]
): WorldCup2026ResultsProviderError {
  return {
    code,
    providerId,
    operation,
    message,
    ...(details === undefined ? {} : { details })
  };
}

function buildLocalFixtureStatusMap(results: readonly WorldCup2026FixtureResult[]): Map<string, WorldCup2026FixtureResult> {
  return new Map(results.map((result) => [result.fixtureId, result]));
}

function toExternalStatus(value: string): { status: WorldCup2026ExternalMatchStatus; issue?: WorldCup2026ResultsProviderError } {
  const normalized = normalizeTeamSearchText(value);
  switch (normalized) {
    case "scheduled":
      return { status: "scheduled" };
    case "completed":
    case "finished":
      return { status: "finished" };
    case "live":
    case "in play":
    case "in_play":
      return { status: "live" };
    case "halftime":
    case "half time":
    case "half_time":
      return { status: "halftime" };
    case "postponed":
      return { status: "postponed" };
    case "cancelled":
    case "canceled":
      return { status: "cancelled" };
    default:
      return {
        status: "unknown",
        issue: createProviderError(
          "normalizer",
          "bundle",
          "unsupported_match_status",
          `Unsupported match status '${value}' was normalized to 'unknown'.`
        )
      };
  }
}

function validateScore(score: number | undefined): boolean {
  return score !== undefined && Number.isInteger(score) && score >= 0;
}

function copyOptionalResultDetails(record: WorldCup2026ExternalFixtureRecord): Partial<WorldCup2026ExternalFixtureRecord> {
  return {
    ...(record.regularTimeHomeScore === undefined ? {} : { regularTimeHomeScore: record.regularTimeHomeScore }),
    ...(record.regularTimeAwayScore === undefined ? {} : { regularTimeAwayScore: record.regularTimeAwayScore }),
    ...(record.extraTimeHomeScore === undefined ? {} : { extraTimeHomeScore: record.extraTimeHomeScore }),
    ...(record.extraTimeAwayScore === undefined ? {} : { extraTimeAwayScore: record.extraTimeAwayScore }),
    ...(record.penaltyHomeScore === undefined ? {} : { penaltyHomeScore: record.penaltyHomeScore }),
    ...(record.penaltyAwayScore === undefined ? {} : { penaltyAwayScore: record.penaltyAwayScore }),
    ...(record.winner === undefined ? {} : { winner: canonicalizeTeamName(record.winner) }),
    ...(record.decisionMethod === undefined ? {} : { decisionMethod: record.decisionMethod })
  };
}

function validateOptionalResultDetails(
  providerId: string,
  record: WorldCup2026ExternalFixtureRecord
): WorldCup2026ResultsProviderError | undefined {
  for (const field of [
    "regularTimeHomeScore",
    "regularTimeAwayScore",
    "extraTimeHomeScore",
    "extraTimeAwayScore",
    "penaltyHomeScore",
    "penaltyAwayScore"
  ] as const) {
    if (record[field] !== undefined && !validateScore(record[field])) {
      return createProviderError(
        providerId,
        "bundle",
        "invalid_provider_response",
        `Fixture '${record.providerFixtureId}' has an invalid ${field} value.`
      );
    }
  }

  if (record.decisionMethod === "penalties") {
    const hasPenaltyScore = record.penaltyHomeScore !== undefined && record.penaltyAwayScore !== undefined;
    if (hasPenaltyScore && record.penaltyHomeScore === record.penaltyAwayScore) {
      return createProviderError(
        providerId,
        "bundle",
        "invalid_provider_response",
        `Fixture '${record.providerFixtureId}' has a tied penalty shootout score.`
      );
    }
  }

  return undefined;
}

export function normalizeExternalFixtureRecords(
  providerId: string,
  records: readonly WorldCup2026ExternalFixtureRecord[]
): NormalizationResult<WorldCup2026ExternalFixtureRecord> {
  const seenFixtureIds = new Set<string>();
  const normalizedRecords: WorldCup2026ExternalFixtureRecord[] = [];
  const issues: WorldCup2026ResultsProviderError[] = [];

  for (const record of records) {
    if (seenFixtureIds.has(record.providerFixtureId)) {
      return {
        status: "error",
        error: createProviderError(
          providerId,
          "bundle",
          "duplicate_fixture_id",
          `Duplicate provider fixture ID '${record.providerFixtureId}' was rejected.`
        )
      };
    }

    seenFixtureIds.add(record.providerFixtureId);

    const normalizedStatus = toExternalStatus(record.status);
    if (normalizedStatus.issue !== undefined) {
      issues.push({ ...normalizedStatus.issue, providerId });
    }

    const homeTeam = canonicalizeTeamName(record.homeTeam);
    const awayTeam = canonicalizeTeamName(record.awayTeam);
    if (homeTeam.trim().length === 0 || awayTeam.trim().length === 0) {
      return {
        status: "error",
        error: createProviderError(
          providerId,
          "bundle",
          "normalization_failure",
          "Provider records must include non-empty home and away teams."
        )
      };
    }

    if (normalizedStatus.status === "finished") {
      if (!validateScore(record.homeScore) || !validateScore(record.awayScore)) {
        return {
          status: "error",
          error: createProviderError(
            providerId,
            "bundle",
            "invalid_provider_response",
            `Finished fixture '${record.providerFixtureId}' must include non-negative integer scores.`
          )
        };
      }
    }

    if (record.homeScore !== undefined && !validateScore(record.homeScore)) {
      return {
        status: "error",
        error: createProviderError(
          providerId,
          "bundle",
          "invalid_provider_response",
          `Fixture '${record.providerFixtureId}' has an invalid homeScore value.`
        )
      };
    }

    if (record.awayScore !== undefined && !validateScore(record.awayScore)) {
      return {
        status: "error",
        error: createProviderError(
          providerId,
          "bundle",
          "invalid_provider_response",
          `Fixture '${record.providerFixtureId}' has an invalid awayScore value.`
        )
      };
    }

    const detailIssue = validateOptionalResultDetails(providerId, record);
    if (detailIssue !== undefined) {
      return {
        status: "error",
        error: detailIssue
      };
    }

    normalizedRecords.push({
      providerFixtureId: record.providerFixtureId,
      competition: record.competition,
      season: record.season,
      ...(record.stage === undefined ? {} : { stage: record.stage }),
      ...(record.group === undefined ? {} : { group: record.group }),
      ...(record.matchday === undefined ? {} : { matchday: record.matchday }),
      ...(record.kickoffAt === undefined ? {} : { kickoffAt: record.kickoffAt }),
      homeTeam,
      awayTeam,
      status: normalizedStatus.status,
      ...(record.homeScore === undefined ? {} : { homeScore: record.homeScore }),
      ...(record.awayScore === undefined ? {} : { awayScore: record.awayScore }),
      ...copyOptionalResultDetails(record),
      ...(record.venue === undefined ? {} : { venue: record.venue }),
      ...(record.updatedAt === undefined ? {} : { updatedAt: record.updatedAt })
    });
  }

  return {
    status: "success",
    records: normalizedRecords,
    issues
  };
}

export function toFixtureResultsFromExternalRecords(
  records: readonly WorldCup2026ExternalFixtureRecord[]
): WorldCup2026FixtureResult[] {
  return records.map((record) => ({
    fixtureId: record.providerFixtureId,
    status: record.status === "finished" ? "completed" : "scheduled",
    ...(record.homeScore === undefined ? {} : { homeScore: record.homeScore }),
    ...(record.awayScore === undefined ? {} : { awayScore: record.awayScore }),
    resultSource: "external_api" as const,
    ...(record.updatedAt === undefined ? {} : { updatedAt: record.updatedAt })
  }));
}

export function toExternalStandings(
  standings: readonly WorldCup2026GroupStandings[],
  updatedAt?: string
): WorldCup2026ExternalStandingRecord[] {
  return standings.flatMap((group) =>
    group.standings.map((entry, index) => ({
      group: group.group,
      team: entry.team,
      position: index + 1,
      played: entry.played,
      wins: entry.wins,
      draws: entry.draws,
      losses: entry.losses,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      points: entry.points,
      ...(updatedAt === undefined ? {} : { updatedAt })
    }))
  );
}

function deriveLocalFixtureRecords(
  fixtures: readonly WorldCup2026Fixture[],
  results: readonly WorldCup2026FixtureResult[]
): WorldCup2026ExternalFixtureRecord[] {
  const resultLookup = buildLocalFixtureStatusMap(results);

  return fixtures.map((fixture) => {
    const result = resultLookup.get(fixture.id);
    const isCompleted = result?.status === "completed" && validateScore(result.homeScore) && validateScore(result.awayScore);

    return {
      providerFixtureId: fixture.id,
      competition: "FIFA World Cup",
      season: "2026",
      stage: "Group Stage",
      group: fixture.group,
      matchday: fixture.matchday,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      status: isCompleted ? "finished" : "scheduled",
      ...(isCompleted ? { homeScore: result?.homeScore, awayScore: result?.awayScore } : {}),
      ...(result?.updatedAt === undefined ? {} : { updatedAt: result.updatedAt })
    };
  });
}

export function createLocalStaticResultsProvider(): WorldCup2026FootballResultsProvider {
  const fixtures = deriveLocalFixtureRecords(WORLD_CUP_2026_GROUP_STAGE_FIXTURES, WORLD_CUP_2026_LOCAL_STATIC_RESULTS);
  const completedResults = fixtures.filter((fixture) => fixture.status === "finished");
  const standings = toExternalStandings(buildWorldCup2026GroupStandings(), "2026-06-14");

  const success = <T>(records: readonly T[], syncedAt = "2026-06-14"): WorldCup2026ResultsProviderSuccess<T> => ({
    status: "success",
    providerId: LOCAL_RESULTS_PROVIDER_ID,
    records,
    servedFromCache: false,
    syncedAt,
    warnings: [
      "Local static provider is the deterministic default until external synchronization is implemented.",
      "No network calls are made by the local static provider."
    ]
  });

  return {
    id: LOCAL_RESULTS_PROVIDER_ID,
    getFixtures: () => success(fixtures),
    getLiveMatches: () => success([]),
    getCompletedResults: () => success(completedResults),
    getStandings: () => success(standings)
  };
}

export function createExternalApiResultsProvider(): WorldCup2026FootballResultsProvider {
  const disabled = <T>(operation: ProviderOperation): WorldCup2026ResultsProviderFailure => ({
    status: "error",
    providerId: EXTERNAL_STUB_PROVIDER_ID,
    servedFromCache: false,
    warnings: ["External API provider is a stub in Phase 12.4. No network request is performed."],
    error: createProviderError(
      EXTERNAL_STUB_PROVIDER_ID,
      operation,
      "provider_disabled",
      "External API provider is disabled because no provider integration or credentials are configured."
    )
  });

  return {
    id: EXTERNAL_STUB_PROVIDER_ID,
    getFixtures: () => disabled("fixtures"),
    getLiveMatches: () => disabled("live_matches"),
    getCompletedResults: () => disabled("completed_results"),
    getStandings: () => disabled("standings")
  };
}

export function createCachedResultsProvider(
  wrappedProvider: WorldCup2026FootballResultsProvider
): WorldCup2026FootballResultsProvider {
  const cache = new Map<ProviderOperation, { records: readonly unknown[]; syncedAt?: string | undefined }>();

  function fromWrapped<T>(operation: ProviderOperation, result: WorldCup2026ResultsProviderResult<T>): WorldCup2026ResultsProviderResult<T> {
    if (result.status === "success") {
      cache.set(operation, result.syncedAt === undefined ? { records: result.records } : { records: result.records, syncedAt: result.syncedAt });
      return result;
    }

    const cached = cache.get(operation);
    if (cached !== undefined) {
      return {
        status: "success",
        providerId: CACHED_EXTERNAL_PROVIDER_ID,
        records: cached.records as readonly T[],
        servedFromCache: true,
        ...(cached.syncedAt === undefined ? {} : { syncedAt: cached.syncedAt }),
        warnings: [
          `Cached provider served ${operation} after ${wrappedProvider.id} failed.`,
          ...result.warnings
        ],
        error: result.error
      };
    }

    return {
      status: "error",
      providerId: CACHED_EXTERNAL_PROVIDER_ID,
      servedFromCache: false,
      warnings: [...result.warnings],
      error: createProviderError(
        CACHED_EXTERNAL_PROVIDER_ID,
        operation,
        "stale_cache_unavailable",
        `No cached ${operation} data is available after ${wrappedProvider.id} failed.`,
        [`Upstream error code: ${result.error.code}`]
      )
    };
  }

  return {
    id: CACHED_EXTERNAL_PROVIDER_ID,
    getFixtures: () => fromWrapped("fixtures", wrappedProvider.getFixtures()),
    getLiveMatches: () => fromWrapped("live_matches", wrappedProvider.getLiveMatches()),
    getCompletedResults: () => fromWrapped("completed_results", wrappedProvider.getCompletedResults()),
    getStandings: () => fromWrapped("standings", wrappedProvider.getStandings())
  };
}

function normalizeProviderResultBundle(provider: WorldCup2026FootballResultsProvider): ProviderBundleResult {
  const fixturesResult = provider.getFixtures();
  if (fixturesResult.status === "error") {
    return { status: "error", providerId: provider.id, warnings: fixturesResult.warnings, error: fixturesResult.error };
  }

  const liveMatchesResult = provider.getLiveMatches();
  if (liveMatchesResult.status === "error") {
    return { status: "error", providerId: provider.id, warnings: liveMatchesResult.warnings, error: liveMatchesResult.error };
  }

  const completedResultsResult = provider.getCompletedResults();
  if (completedResultsResult.status === "error") {
    return { status: "error", providerId: provider.id, warnings: completedResultsResult.warnings, error: completedResultsResult.error };
  }

  const standingsResult = provider.getStandings();
  if (standingsResult.status === "error") {
    return { status: "error", providerId: provider.id, warnings: standingsResult.warnings, error: standingsResult.error };
  }

  const normalizedFixtures = normalizeExternalFixtureRecords(provider.id, fixturesResult.records);
  if (normalizedFixtures.status === "error") {
    return { status: "error", providerId: provider.id, warnings: [], error: normalizedFixtures.error };
  }

  const normalizedLiveMatches = normalizeExternalFixtureRecords(provider.id, liveMatchesResult.records);
  if (normalizedLiveMatches.status === "error") {
    return { status: "error", providerId: provider.id, warnings: [], error: normalizedLiveMatches.error };
  }

  const normalizedCompletedResults = normalizeExternalFixtureRecords(provider.id, completedResultsResult.records);
  if (normalizedCompletedResults.status === "error") {
    return { status: "error", providerId: provider.id, warnings: [], error: normalizedCompletedResults.error };
  }

  const lastSuccessfulSync =
    fixturesResult.syncedAt ??
    liveMatchesResult.syncedAt ??
    completedResultsResult.syncedAt ??
    standingsResult.syncedAt;

  return {
    status: "success",
    providerId:
      completedResultsResult.providerId ??
      fixturesResult.providerId ??
      liveMatchesResult.providerId ??
      standingsResult.providerId,
    bundle: {
      fixtures: normalizedFixtures.records,
      liveMatches: normalizedLiveMatches.records,
      completedResults: normalizedCompletedResults.records,
      standings: standingsResult.records,
      normalizationIssues: [...normalizedFixtures.issues, ...normalizedLiveMatches.issues, ...normalizedCompletedResults.issues],
      ...(lastSuccessfulSync === undefined ? {} : { lastSuccessfulSync })
    },
    cacheUsed:
      fixturesResult.servedFromCache || liveMatchesResult.servedFromCache || completedResultsResult.servedFromCache || standingsResult.servedFromCache,
    warnings: [
      ...fixturesResult.warnings,
      ...liveMatchesResult.warnings,
      ...completedResultsResult.warnings,
      ...standingsResult.warnings
    ],
    ...(fixturesResult.error ?? liveMatchesResult.error ?? completedResultsResult.error ?? standingsResult.error
      ? { error: fixturesResult.error ?? liveMatchesResult.error ?? completedResultsResult.error ?? standingsResult.error }
      : {})
  };
}

export interface ResolveWorldCup2026ResultsProviderInput {
  externalProvider?: WorldCup2026FootballResultsProvider;
  cachedProvider?: WorldCup2026FootballResultsProvider;
  localProvider?: WorldCup2026FootballResultsProvider;
}

export function resolveWorldCup2026ResultsProviderFoundation(
  input: ResolveWorldCup2026ResultsProviderInput = {}
): WorldCup2026ResultsProviderFoundationResponse {
  const externalProvider = input.externalProvider ?? createExternalApiResultsProvider();
  const cachedProvider = input.cachedProvider ?? createCachedResultsProvider(externalProvider);
  const localProvider = input.localProvider ?? createLocalStaticResultsProvider();

  const cachedAttempt = normalizeProviderResultBundle(cachedProvider);

  if (cachedAttempt.status === "success") {
    return {
      status: "success",
      tournamentName: "FIFA World Cup 2026",
      dataScope: "world_cup_2026_results_provider_foundation",
      fixtures: cachedAttempt.bundle.fixtures,
      liveMatches: cachedAttempt.bundle.liveMatches,
      completedResults: cachedAttempt.bundle.completedResults,
      standings: cachedAttempt.bundle.standings,
      provider: {
        currentDefaultProvider: LOCAL_RESULTS_PROVIDER_ID,
        attemptedProvider: externalProvider.id,
        activeProvider: cachedAttempt.providerId,
        cacheUsed: cachedAttempt.cacheUsed,
        localFallbackUsed: false,
        externalProviderEnabled: true,
        ...(cachedAttempt.bundle.lastSuccessfulSync === undefined ? {} : { lastSuccessfulSync: cachedAttempt.bundle.lastSuccessfulSync }),
        warnings: cachedAttempt.warnings,
        normalizationIssues: cachedAttempt.bundle.normalizationIssues,
        ...(cachedAttempt.error === undefined ? {} : { error: cachedAttempt.error })
      },
      warnings: [
        "Results provider foundation is provider-agnostic and deterministic in Phase 12.4.",
        ...(cachedAttempt.cacheUsed
          ? ["External provider failed, so the most recent cached response was used."]
          : ["External provider response is being used without local fallback."])
      ],
      metadata: {
        apiVersion: "api-foundation-v1",
        mode: "pure_handlers",
        serverEnabled: false,
        databaseEnabled: false,
        externalServicesEnabled: false,
        notes: [
          "Results provider foundation normalizes fixtures, completed results, live matches, and standings through a provider-agnostic contract.",
          "No real external sports API integration is enabled in Phase 12.4."
        ]
      }
    };
  }

  const localAttempt = normalizeProviderResultBundle(localProvider);
  if (localAttempt.status === "error") {
    throw new Error(`Local provider must remain valid in Phase 12.4: ${localAttempt.error.message}`);
  }

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_results_provider_foundation",
    fixtures: localAttempt.bundle.fixtures,
    liveMatches: localAttempt.bundle.liveMatches,
    completedResults: localAttempt.bundle.completedResults,
    standings: localAttempt.bundle.standings,
    provider: {
      currentDefaultProvider: LOCAL_RESULTS_PROVIDER_ID,
      attemptedProvider: externalProvider.id,
      activeProvider: localProvider.id,
      cacheUsed: false,
      localFallbackUsed: true,
      externalProviderEnabled: false,
      ...(localAttempt.bundle.lastSuccessfulSync === undefined ? {} : { lastSuccessfulSync: localAttempt.bundle.lastSuccessfulSync }),
      warnings: [
        ...cachedAttempt.warnings,
        "External provider data is unavailable, so the local static fallback was used."
      ],
      normalizationIssues: localAttempt.bundle.normalizationIssues,
      error: cachedAttempt.error
    },
    warnings: [
      "Results provider foundation is provider-agnostic and deterministic in Phase 12.4.",
      "External provider failed and no cached response was available, so local static data was used."
    ],
    metadata: {
      apiVersion: "api-foundation-v1",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: [
        "Results provider foundation normalizes fixtures, completed results, live matches, and standings through a provider-agnostic contract.",
        "Local static data remains the default fallback until external synchronization is implemented."
      ]
    }
  };
}

export function createLocalStaticResultProviderMetadata(): WorldCup2026ResultProviderMetadata {
  return {
    providerName: "local static provider",
    resultSource: "local_static",
    externalProviderEnabled: false,
    localOverridesEnabled: true,
    resultsCount: WORLD_CUP_2026_LOCAL_STATIC_RESULTS.length,
    dataUpdatedAt: "2026-06-14",
    warnings: [
      "World Cup 2026 standings are based on local normalized results until an external provider is added.",
      "No external result provider, live score service, or network call is enabled."
    ]
  };
}
