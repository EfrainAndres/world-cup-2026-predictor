import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type {
  PredictionHistoryPersistenceResolution,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026SyncResult
} from "@world-cup-2026-predictor/api";
import {
  buildDashboardDailyMatchesFromSync,
  buildDashboardStandingsFromSync,
  getProductionRuntimeDiagnostics
} from "./server-runtime";

function fixture(overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "GROUP_STAGE",
    group: "A",
    matchday: 1,
    kickoffAt: "2026-06-11T19:00:00Z",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    status: "scheduled",
    updatedAt: "2026-06-10T12:00:00Z",
    ...overrides
  };
}

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-10T12:00:00Z",
    lastSuccessfulSync: "2026-06-10T12:00:00Z",
    fixtures: [fixture()],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

function fakePersistence(): PredictionHistoryPersistenceResolution {
  return {
    provider: "postgres",
    snapshotStore: {} as PredictionHistoryPersistenceResolution["snapshotStore"],
    evaluationStore: {} as PredictionHistoryPersistenceResolution["evaluationStore"],
    projectionCache: {} as PredictionHistoryPersistenceResolution["projectionCache"],
    historyStore: {
      list: vi.fn().mockResolvedValue({
        items: [],
        summary: {
          totalSnapshots: 0,
          evaluatedSnapshots: 0,
          pendingSnapshots: 0,
          outcomeAccuracy: null,
          exactScoreAccuracy: null,
          averageBrierScore: null
        },
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        },
        filters: {
          group: null,
          team: null,
          fixtureId: null,
          status: null,
          evaluationState: "all",
          sort: "captured_desc"
        }
      })
    },
    metadata: {
      provider: "postgres",
      persistent: true,
      configuredProvider: "postgres"
    }
  };
}

describe("server runtime helpers", () => {
  test("reports configured PostgreSQL and football-data.org as active only after runtime checks succeed", async () => {
    const diagnostics = await getProductionRuntimeDiagnostics(syncResult(), {
      env: {
        PERSISTENCE_PROVIDER: "postgres",
        DATABASE_URL: "postgresql://secret-host/db",
        RESULTS_PROVIDER: "football_data_org",
        FOOTBALL_DATA_API_TOKEN: "secret-token"
      },
      resolvePersistence: async () => fakePersistence()
    });

    expect(diagnostics.persistenceProviderConfigured).toBe(true);
    expect(diagnostics.databaseConnected).toBe(true);
    expect(diagnostics.resultsProviderConfigured).toBe(true);
    expect(diagnostics.externalProviderActive).toBe(true);
    expect(diagnostics.fixtureCount).toBe(1);
    expect(diagnostics.fixturesWithKickoff).toBe(1);
  });

  test("preserves safe fallback diagnostics when environment is missing", async () => {
    const diagnostics = await getProductionRuntimeDiagnostics(
      syncResult({
        providerMode: "local_static",
        activeProvider: "local_static_results_provider",
        localFallbackUsed: true,
        externalProviderEnabled: false,
        warnings: ["RESULTS_PROVIDER is not set to 'football_data_org'. No external synchronization is performed."]
      }),
      { env: {} }
    );

    expect(diagnostics.persistenceProviderConfigured).toBe(false);
    expect(diagnostics.databaseConnected).toBe(false);
    expect(diagnostics.resultsProviderConfigured).toBe(false);
    expect(diagnostics.externalProviderActive).toBe(false);
    expect(diagnostics.localFallbackUsed).toBe(true);
  });

  test("daily matches built from shared sync receive real kickoff metadata", () => {
    const dailyMatches = buildDashboardDailyMatchesFromSync(syncResult(), {
      date: "2026-06-11",
      timezone: "UTC"
    });

    expect(dailyMatches.matches).toHaveLength(1);
    expect(dailyMatches.matches[0]?.kickoffAt).toBe("2026-06-11T19:00:00Z");
    expect(dailyMatches.counts.unavailableKickoff).toBe(0);
    expect(dailyMatches.providerMetadata.activeProvider).toBe("football_data_org_results_provider");
  });

  test("standings built from shared sync use external fixture-derived results", () => {
    const standings = buildDashboardStandingsFromSync(
      syncResult({
        fixtures: [fixture({ status: "finished", homeScore: 2, awayScore: 0 })],
        completedResults: [fixture({ status: "finished", homeScore: 2, awayScore: 0 })]
      })
    );

    const groupA = standings.officialGroups.find((group) => group.group === "A");
    const mexico = groupA?.standings.find((entry) => entry.team === "Mexico");

    expect(standings.resultProvider.externalProviderEnabled).toBe(true);
    expect(standings.resultProvider.providerName).toBe("football_data_org_results_provider");
    expect(mexico?.played).toBe(1);
    expect(mexico?.points).toBe(3);
  });

  test("provider and database secrets are not serialized in diagnostics", async () => {
    const diagnostics = await getProductionRuntimeDiagnostics(syncResult(), {
      env: {
        PERSISTENCE_PROVIDER: "postgres",
        DATABASE_URL: "postgresql://wc2026:super-secret-db-password@example.com/db",
        RESULTS_PROVIDER: "football_data_org",
        FOOTBALL_DATA_API_TOKEN: "super-secret-provider-token"
      },
      resolvePersistence: async () => fakePersistence()
    });

    const serialized = JSON.stringify(diagnostics);
    expect(serialized).not.toContain("super-secret-db-password");
    expect(serialized).not.toContain("super-secret-provider-token");
    expect(serialized).not.toContain("example.com");
  });

  test("client-safe API facade does not import server persistence modules", () => {
    const apiClient = readFileSync(new URL("./api-client.ts", import.meta.url), "utf8");
    const matchSimulationForm = readFileSync(new URL("../components/MatchSimulationForm.tsx", import.meta.url), "utf8");

    expect(apiClient).not.toContain("resolvePredictionHistoryPersistence");
    expect(apiClient).not.toContain("postgres");
    expect(matchSimulationForm).not.toContain("server-runtime");
  });
});
