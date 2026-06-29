import {
  buildWorldCup2026DailyMatches,
  buildOfficialWorldCup2026KnockoutProjection,
  canonicalizeTeamName,
  getPredictionHistoryPersistenceConfig,
  getModelInfo,
  getWorldCup2026LiveGroupStandings,
  resolvePredictionHistoryPersistence,
  runLiveEvidenceGate,
  summarizeWorldCup2026ModelReality,
  synchronizeWorldCup2026Results,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES,
  WORLD_CUP_2026_DISPLAY_TIMEZONE
} from "@world-cup-2026-predictor/api";
import type {
  LiveEvidenceGateReport,
  ModelInfoResponse,
  PredictionHistoryPersistenceMetadata,
  PredictionHistoryPersistenceResolution,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026ExternalFixtureRecord,
  OfficialKnockoutProjectionResult,
  WorldCup2026LiveGroupStandingsResponse,
  WorldCup2026ModelRealitySummary,
  WorldCup2026ResultProviderMetadata,
  WorldCup2026SyncResult
} from "@world-cup-2026-predictor/api";
import type { GetWorldCup2026DailyMatchesInput } from "./api-client";
import type { ModelEvidenceStateKind } from "./model-evidence-center";
import { getMatchDetailId } from "./matches-experience";
import { deriveEvidenceStateKind } from "./model-evidence-center";

export interface ProductionRuntimeDiagnostics {
  persistenceProviderConfigured: boolean;
  databaseConnected: boolean;
  resultsProviderConfigured: boolean;
  externalProviderActive: boolean;
  activeProvider: string;
  localFallbackUsed: boolean;
  cacheUsed: boolean;
  fixtureCount: number;
  fixturesWithKickoff: number;
  lastSuccessfulSync?: string;
  warnings: string[];
}

export interface ProductionRuntimeDiagnosticsInput {
  env?: Record<string, string | undefined>;
  resolvePersistence?: () => Promise<PredictionHistoryPersistenceResolution>;
}

function countFixturesWithKickoff(fixtures: readonly WorldCup2026ExternalFixtureRecord[]): number {
  return fixtures.filter((fixture) => fixture.kickoffAt !== undefined && fixture.kickoffAt.trim().length > 0).length;
}

export function buildDashboardResultProviderMetadata(syncResult: WorldCup2026SyncResult): WorldCup2026ResultProviderMetadata {
  const providerName =
    syncResult.activeProvider === "local_static_results_provider"
      ? "local static provider"
      : syncResult.activeProvider;

  return {
    providerName,
    resultSource: syncResult.localFallbackUsed ? "local_static" : "external_api",
    externalProviderEnabled: syncResult.externalProviderEnabled,
    localOverridesEnabled: syncResult.localFallbackUsed,
    resultsCount: syncResult.completedResults.length,
    ...(syncResult.lastSuccessfulSync !== undefined ? { dataUpdatedAt: syncResult.lastSuccessfulSync } : {}),
    warnings: syncResult.warnings
  };
}

export function buildDashboardStandingsFromSync(syncResult: WorldCup2026SyncResult): WorldCup2026LiveGroupStandingsResponse {
  return getWorldCup2026LiveGroupStandings({
    completedResults: syncResult.completedResults,
    liveMatches: syncResult.liveMatches,
    standings: syncResult.standings,
    activeProvider: syncResult.activeProvider,
    cacheUsed: syncResult.cacheUsed,
    localFallbackUsed: syncResult.localFallbackUsed,
    externalProviderEnabled: syncResult.externalProviderEnabled,
    ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {}),
    providerMetadata: buildDashboardResultProviderMetadata(syncResult)
  });
}

export function buildDashboardDailyMatchesFromSync(
  syncResult: WorldCup2026SyncResult,
  input?: GetWorldCup2026DailyMatchesInput
): WorldCup2026DailyMatchesSuccessResponse {
  const response = buildWorldCup2026DailyMatches({
    ...input,
    syncResult
  });

  if (response.status !== "success") {
    throw new Error("Dashboard daily matches request must remain valid.");
  }

  return response;
}

// Process-level last-known-good cache. Persists across requests within the same
// Node.js process instance (same Vercel function warm-up). When the external provider
// degrades (rate-limit, transient error, local static fallback), the most recent valid
// sync result is served instead of an empty fixture set. Updated only when the external
// provider responds successfully (localFallbackUsed === false).
let lastKnownGoodSyncResult: WorldCup2026SyncResult | null = null;

const STALE_RESULT_WARNING =
  "Results data may be stale. The external provider returned a degraded response; the last valid provider response was used.";

export function resetSyncResultCache(): void {
  lastKnownGoodSyncResult = null;
}

export async function getDashboardLiveSyncResult(
  syncFn: () => Promise<WorldCup2026SyncResult> = () => synchronizeWorldCup2026Results({})
): Promise<WorldCup2026SyncResult> {
  const freshResult = await syncFn();

  if (!freshResult.localFallbackUsed) {
    lastKnownGoodSyncResult = freshResult;
    return freshResult;
  }

  if (lastKnownGoodSyncResult !== null) {
    return {
      ...lastKnownGoodSyncResult,
      cacheUsed: true,
      warnings: [
        ...lastKnownGoodSyncResult.warnings.filter((w) => w !== STALE_RESULT_WARNING),
        STALE_RESULT_WARNING
      ]
    };
  }

  return freshResult;
}

export async function getOfficialWorldCup2026KnockoutProjection(): Promise<OfficialKnockoutProjectionResult> {
  const syncResult = await getDashboardLiveSyncResult();
  return buildOfficialWorldCup2026KnockoutProjection({ syncResult });
}

export async function getProductionRuntimeDiagnostics(
  syncResult: WorldCup2026SyncResult,
  input: ProductionRuntimeDiagnosticsInput = {}
): Promise<ProductionRuntimeDiagnostics> {
  const env = input.env ?? process.env;
  const warnings = [...syncResult.warnings];
  let persistenceProviderConfigured = false;
  let databaseConnected = false;

  try {
    const persistenceConfig = getPredictionHistoryPersistenceConfig(env);
    persistenceProviderConfigured = persistenceConfig.provider === "postgres";

    if (persistenceConfig.provider === "postgres") {
      const resolvePersistence = input.resolvePersistence ?? (() => resolvePredictionHistoryPersistence({ env }));
      const persistence = await resolvePersistence();
      await persistence.historyStore.list({
        evaluationState: "all",
        page: 1,
        pageSize: 10,
        sort: "captured_desc"
      });
      databaseConnected = persistence.metadata.persistent;
    }
  } catch {
    warnings.push("Prediction history database is configured but unavailable.");
  }

  const resultsProviderConfigured =
    env["RESULTS_PROVIDER"] === "football_data_org" &&
    (env["FOOTBALL_DATA_API_TOKEN"] ?? "").trim().length > 0;
  const externalProviderActive =
    syncResult.externalProviderEnabled &&
    !syncResult.localFallbackUsed &&
    syncResult.activeProvider !== "local_static_results_provider";

  return {
    persistenceProviderConfigured,
    databaseConnected,
    resultsProviderConfigured,
    externalProviderActive,
    activeProvider: syncResult.activeProvider,
    localFallbackUsed: syncResult.localFallbackUsed,
    cacheUsed: syncResult.cacheUsed,
    fixtureCount: syncResult.fixtures.length,
    fixturesWithKickoff: countFixturesWithKickoff(syncResult.fixtures),
    ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {}),
    warnings
  };
}

function getColombiaDate(isoTimestamp: string): string {
  const dt = new Date(isoTimestamp);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORLD_CUP_2026_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(dt);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

interface CanonicalMatchFixture {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  group?: string;
  matchday?: number;
}

function canonicalPair(homeTeam: string, awayTeam: string): string {
  return `${canonicalizeTeamName(homeTeam)}|${canonicalizeTeamName(awayTeam)}`;
}

function reverseCanonicalPair(homeTeam: string, awayTeam: string): string {
  return `${canonicalizeTeamName(awayTeam)}|${canonicalizeTeamName(homeTeam)}`;
}

const CANONICAL_MATCH_FIXTURES: readonly CanonicalMatchFixture[] = [
  ...WORLD_CUP_2026_GROUP_STAGE_FIXTURES.map((fixture) => ({
    fixtureId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    group: fixture.group,
    matchday: fixture.matchday
  })),
  ...WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    matchday: fixture.officialMatchNumber
  }))
];

// Stable alias map: provider-issued numeric fixture IDs → canonical fixture IDs.
// Used to resolve detail routes like /matches/537417 even when the provider is offline.
const PROVIDER_FIXTURE_ALIASES = new Map<string, string>([
  ["537417", "wc2026-match-73-south-africa-vs-canada"]
]);

function resolveCanonicalMatchFixture(
  requestedId: string,
  requestedRecord: WorldCup2026ExternalFixtureRecord | undefined
): CanonicalMatchFixture | null {
  const byId = CANONICAL_MATCH_FIXTURES.find((fixture) => fixture.fixtureId === requestedId);
  if (byId !== undefined) return byId;

  const aliasedId = PROVIDER_FIXTURE_ALIASES.get(requestedId);
  if (aliasedId !== undefined) {
    const byAlias = CANONICAL_MATCH_FIXTURES.find((fixture) => fixture.fixtureId === aliasedId);
    if (byAlias !== undefined) return byAlias;
  }

  if (requestedRecord === undefined) return null;

  const directPair = canonicalPair(requestedRecord.homeTeam, requestedRecord.awayTeam);
  const reversedPair = reverseCanonicalPair(requestedRecord.homeTeam, requestedRecord.awayTeam);
  return (
    CANONICAL_MATCH_FIXTURES.find((fixture) => canonicalPair(fixture.homeTeam, fixture.awayTeam) === directPair) ??
    CANONICAL_MATCH_FIXTURES.find((fixture) => canonicalPair(fixture.homeTeam, fixture.awayTeam) === reversedPair) ??
    null
  );
}

function recordMatchesCanonicalFixture(
  record: WorldCup2026ExternalFixtureRecord,
  fixture: CanonicalMatchFixture
): boolean {
  if (record.providerFixtureId === fixture.fixtureId) return true;
  const recordPair = canonicalPair(record.homeTeam, record.awayTeam);
  return (
    recordPair === canonicalPair(fixture.homeTeam, fixture.awayTeam) ||
    recordPair === reverseCanonicalPair(fixture.homeTeam, fixture.awayTeam)
  );
}

function findDailyMatchEntryByIdentity(
  entries: readonly WorldCup2026DailyMatchEntry[],
  requestedId: string,
  stableFixtureId: string
): WorldCup2026DailyMatchEntry | undefined {
  return entries.find((entry) => {
    if (entry.fixtureId === requestedId || entry.fixtureId === stableFixtureId) return true;
    if (entry.providerFixtureId === requestedId || entry.providerFixtureId === stableFixtureId) return true;
    return getMatchDetailId(entry) === stableFixtureId;
  });
}

function isEntryReversedFromCanonical(
  entry: WorldCup2026DailyMatchEntry,
  fixture: CanonicalMatchFixture
): boolean {
  return (
    canonicalizeTeamName(entry.homeTeam) === canonicalizeTeamName(fixture.awayTeam) &&
    canonicalizeTeamName(entry.awayTeam) === canonicalizeTeamName(fixture.homeTeam)
  );
}

function canonicalizeDailyMatchEntry(
  entry: WorldCup2026DailyMatchEntry,
  fixture: CanonicalMatchFixture | null
): WorldCup2026DailyMatchEntry {
  if (fixture === null) return entry;

  const reversed = isEntryReversedFromCanonical(entry, fixture);
  const prediction = entry.predictionHistory.snapshot.prediction;

  return {
    ...entry,
    fixtureId: fixture.fixtureId,
    ...(fixture.group === undefined ? {} : { group: fixture.group }),
    ...(fixture.matchday === undefined ? {} : { matchday: fixture.matchday }),
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    ...(reversed && entry.awayScore !== undefined ? { homeScore: entry.awayScore } : entry.homeScore !== undefined ? { homeScore: entry.homeScore } : {}),
    ...(reversed && entry.homeScore !== undefined ? { awayScore: entry.homeScore } : entry.awayScore !== undefined ? { awayScore: entry.awayScore } : {}),
    predictionHistory: {
      ...entry.predictionHistory,
      snapshot:
        reversed && prediction !== undefined
          ? {
              ...entry.predictionHistory.snapshot,
              prediction: {
                ...prediction,
                homeExpectedGoals: prediction.awayExpectedGoals,
                awayExpectedGoals: prediction.homeExpectedGoals,
                homeWinProbability: prediction.awayWinProbability,
                awayWinProbability: prediction.homeWinProbability,
                ...(prediction.projectedScoreline === undefined
                  ? {}
                  : {
                      projectedScoreline: {
                        homeGoals: prediction.projectedScoreline.awayGoals,
                        awayGoals: prediction.projectedScoreline.homeGoals
                      }
                    })
              }
            }
          : entry.predictionHistory.snapshot
    }
  };
}

function mapExternalStatusToDailyState(
  status: WorldCup2026ExternalFixtureRecord["status"]
): WorldCup2026DailyMatchEntry["state"] {
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

function buildCanonicalFallbackMatchEntry(
  fixture: CanonicalMatchFixture,
  record: WorldCup2026ExternalFixtureRecord | undefined
): WorldCup2026DailyMatchEntry {
  const recordIsReversed =
    record !== undefined &&
    canonicalizeTeamName(record.homeTeam) === canonicalizeTeamName(fixture.awayTeam) &&
    canonicalizeTeamName(record.awayTeam) === canonicalizeTeamName(fixture.homeTeam);

  return {
    fixtureId: fixture.fixtureId,
    ...(record?.providerFixtureId === undefined ? {} : { providerFixtureId: record.providerFixtureId }),
    ...(fixture.group === undefined ? {} : { group: fixture.group }),
    ...(fixture.matchday === undefined ? {} : { matchday: fixture.matchday }),
    ...(record?.kickoffAt === undefined ? {} : { kickoffAt: record.kickoffAt }),
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    normalizedStatus: record?.status ?? "scheduled",
    state: record === undefined ? "upcoming" : mapExternalStatusToDailyState(record.status),
    ...(recordIsReversed && record?.awayScore !== undefined ? { homeScore: record.awayScore } : record?.homeScore !== undefined ? { homeScore: record.homeScore } : {}),
    ...(recordIsReversed && record?.homeScore !== undefined ? { awayScore: record.homeScore } : record?.awayScore !== undefined ? { awayScore: record.awayScore } : {}),
    ...(record?.venue === undefined ? {} : { venue: record.venue }),
    predictionSnapshot: { available: false },
    predictionHistory: {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    }
  };
}

export function buildDashboardMatchEntryById(
  syncResult: WorldCup2026SyncResult,
  fixtureId: string
): WorldCup2026DailyMatchEntry | null {
  const allExternalRecords: WorldCup2026ExternalFixtureRecord[] = [
    ...syncResult.fixtures,
    ...syncResult.liveMatches,
    ...syncResult.completedResults
  ];

  const seen = new Set<string>();
  const deduplicated: WorldCup2026ExternalFixtureRecord[] = [];
  for (const record of allExternalRecords) {
    const key = record.providerFixtureId;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    }
  }

  const requestedRecord = deduplicated.find((record) => record.providerFixtureId === fixtureId);
  const canonicalFixture = resolveCanonicalMatchFixture(fixtureId, requestedRecord);

  if (canonicalFixture === null && requestedRecord === undefined) return null;

  const externalRecord = requestedRecord ?? (
    canonicalFixture === null
      ? undefined
      : deduplicated.find((record) => recordMatchesCanonicalFixture(record, canonicalFixture))
  );

  const stableFixtureId = canonicalFixture?.fixtureId ?? fixtureId;

  if (externalRecord === undefined || externalRecord.kickoffAt === undefined) {
    const noDateResponse = buildWorldCup2026DailyMatches({ syncResult });
    if (noDateResponse.status !== "success") return null;
    const entry = findDailyMatchEntryByIdentity(noDateResponse.unscheduledMatches, fixtureId, stableFixtureId);
    if (entry !== undefined) return canonicalizeDailyMatchEntry(entry, canonicalFixture);
    return canonicalFixture === null ? null : buildCanonicalFallbackMatchEntry(canonicalFixture, externalRecord);
  }

  const kickoffDate = getColombiaDate(externalRecord.kickoffAt);
  const response = buildWorldCup2026DailyMatches({
    syncResult,
    date: kickoffDate,
    timezone: WORLD_CUP_2026_DISPLAY_TIMEZONE
  });

  if (response.status !== "success") return null;

  const entry = findDailyMatchEntryByIdentity(response.matches, fixtureId, stableFixtureId);
  if (entry !== undefined) return canonicalizeDailyMatchEntry(entry, canonicalFixture);

  const unscheduled = findDailyMatchEntryByIdentity(response.unscheduledMatches, fixtureId, stableFixtureId);
  if (unscheduled !== undefined) return canonicalizeDailyMatchEntry(unscheduled, canonicalFixture);

  return canonicalFixture === null ? null : buildCanonicalFallbackMatchEntry(canonicalFixture, externalRecord);
}

// ---------------------------------------------------------------------------
// Model Evidence Center data composition
// Resolves persistence once, loads snapshots + evaluations, runs pure analysis.
// No writes, no provider sync, no tournament computation.
// ---------------------------------------------------------------------------

export interface ModelEvidenceCenterData {
  modelInfo: ModelInfoResponse;
  realitySummary: WorldCup2026ModelRealitySummary | null;
  gateReport: LiveEvidenceGateReport | null;
  persistenceMetadata: PredictionHistoryPersistenceMetadata | null;
  snapshotCount: number;
  evaluationCount: number;
  stateKind: ModelEvidenceStateKind;
  warnings: string[];
  generatedAt: string;
}

export async function getModelEvidenceCenterData(): Promise<ModelEvidenceCenterData> {
  const modelInfo = getModelInfo();
  const generatedAt = new Date().toISOString();
  const warnings: string[] = [];

  const persistenceConfigured = (() => {
    try {
      const cfg = getPredictionHistoryPersistenceConfig();
      return cfg.provider === "postgres";
    } catch {
      return false;
    }
  })();

  let persistence: PredictionHistoryPersistenceResolution | null = null;
  let persistenceError = false;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch {
    persistenceError = true;
    warnings.push("Prediction history persistence is configured but could not be accessed.");
  }

  if (persistenceError || persistence === null) {
    const stateKind = deriveEvidenceStateKind(persistenceConfigured, persistenceError, 0, 0, null);
    return {
      modelInfo,
      realitySummary: null,
      gateReport: null,
      persistenceMetadata: null,
      snapshotCount: 0,
      evaluationCount: 0,
      stateKind,
      warnings,
      generatedAt
    };
  }

  let snapshots: Awaited<ReturnType<typeof persistence.snapshotStore.list>> = [];
  let evaluations: Awaited<ReturnType<typeof persistence.evaluationStore.list>> = [];

  try {
    [snapshots, evaluations] = await Promise.all([
      persistence.snapshotStore.list({ limit: 2000 }),
      persistence.evaluationStore.list({ limit: 2000 })
    ]);
  } catch {
    warnings.push("Evidence data could not be loaded from persistence.");
    const stateKind = deriveEvidenceStateKind(persistenceConfigured, true, 0, 0, null);
    return {
      modelInfo,
      realitySummary: null,
      gateReport: null,
      persistenceMetadata: persistence.metadata,
      snapshotCount: 0,
      evaluationCount: 0,
      stateKind,
      warnings,
      generatedAt
    };
  }

  const realitySummary = summarizeWorldCup2026ModelReality(evaluations);

  let gateReport: LiveEvidenceGateReport | null = null;
  try {
    gateReport = runLiveEvidenceGate({
      snapshots,
      evaluations,
      generatedAt,
      persistenceMetadata: persistence.metadata
    });
  } catch {
    warnings.push("Evidence gate analysis could not be completed.");
  }

  const stateKind = deriveEvidenceStateKind(
    persistenceConfigured || persistence.metadata.persistent,
    false,
    snapshots.length,
    evaluations.length,
    gateReport?.decision ?? null
  );

  return {
    modelInfo,
    realitySummary,
    gateReport,
    persistenceMetadata: persistence.metadata,
    snapshotCount: snapshots.length,
    evaluationCount: evaluations.length,
    stateKind,
    warnings,
    generatedAt
  };
}
