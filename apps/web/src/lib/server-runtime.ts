import {
  buildWorldCup2026DailyMatches,
  canonicalizeTeamName,
  getPredictionHistoryPersistenceConfig,
  getWorldCup2026LiveGroupStandings,
  resolvePredictionHistoryPersistence,
  synchronizeWorldCup2026Results,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_DISPLAY_TIMEZONE
} from "@world-cup-2026-predictor/api";
import type {
  PredictionHistoryPersistenceResolution,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026LiveGroupStandingsResponse,
  WorldCup2026ResultProviderMetadata,
  WorldCup2026SyncResult
} from "@world-cup-2026-predictor/api";
import type { GetWorldCup2026DailyMatchesInput } from "./api-client";

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

export async function getDashboardLiveSyncResult(): Promise<WorldCup2026SyncResult> {
  return synchronizeWorldCup2026Results({});
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

export function buildDashboardMatchEntryById(
  syncResult: WorldCup2026SyncResult,
  fixtureId: string
): WorldCup2026DailyMatchEntry | null {
  const fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.id === fixtureId);
  if (fixture === undefined) return null;

  const canonicalHome = canonicalizeTeamName(fixture.homeTeam);
  const canonicalAway = canonicalizeTeamName(fixture.awayTeam);

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

  const externalRecord = deduplicated.find((r) => {
    return (
      canonicalizeTeamName(r.homeTeam) === canonicalHome &&
      canonicalizeTeamName(r.awayTeam) === canonicalAway
    );
  });

  if (externalRecord === undefined || externalRecord.kickoffAt === undefined) {
    const noDateResponse = buildWorldCup2026DailyMatches({ syncResult });
    if (noDateResponse.status !== "success") return null;
    const entry = noDateResponse.unscheduledMatches.find((m) => m.fixtureId === fixtureId);
    return entry ?? null;
  }

  const kickoffDate = getColombiaDate(externalRecord.kickoffAt);
  const response = buildWorldCup2026DailyMatches({
    syncResult,
    date: kickoffDate,
    timezone: WORLD_CUP_2026_DISPLAY_TIMEZONE
  });

  if (response.status !== "success") return null;

  const entry = response.matches.find((m) => m.fixtureId === fixtureId);
  if (entry !== undefined) return entry;

  const unscheduled = response.unscheduledMatches.find((m) => m.fixtureId === fixtureId);
  return unscheduled ?? null;
}
