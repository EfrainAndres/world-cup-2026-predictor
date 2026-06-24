import {
  buildWorldCup2026DailyMatches,
  getPredictionHistoryPersistenceConfig,
  getWorldCup2026LiveGroupStandings,
  resolvePredictionHistoryPersistence,
  synchronizeWorldCup2026Results
} from "@world-cup-2026-predictor/api";
import type {
  PredictionHistoryPersistenceResolution,
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
