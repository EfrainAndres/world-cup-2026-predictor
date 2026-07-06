import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  LiveSyncCacheStore,
  PredictionHistoryPersistenceResolution,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026SyncResult
} from "@world-cup-2026-predictor/api";
import {
  LIVE_SYNC_LKG_CACHE_KEY,
  computeLiveSyncCacheExpiresAt,
  createInMemoryLiveSyncCacheStore,
  createNoopLiveSyncCacheStore
} from "@world-cup-2026-predictor/api";
import {
  buildDashboardMatchEntryById,
  buildDashboardDailyMatchesFromSync,
  buildDashboardStandingsFromSync,
  getDashboardLiveSyncResult,
  getProductionRuntimeDiagnostics,
  predictDashboardMatchFromLiveEloWithProductionStatsBomb,
  resetSyncResultCache
} from "./server-runtime";
import { selectHomeMatches } from "./home-dashboard";

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

function roundOf32Fixture(overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "537417",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "LAST_32",
    matchday: 73,
    kickoffAt: "2026-06-28T20:00:00Z",
    homeTeam: "South Africa",
    awayTeam: "Canada",
    status: "finished",
    homeScore: 0,
    awayScore: 1,
    updatedAt: "2026-06-28T22:00:00Z",
    ...overrides
  };
}

function fakePersistence(): PredictionHistoryPersistenceResolution {
  return {
    provider: "postgres",
    snapshotStore: {} as PredictionHistoryPersistenceResolution["snapshotStore"],
    evaluationStore: {} as PredictionHistoryPersistenceResolution["evaluationStore"],
    projectionCache: {} as PredictionHistoryPersistenceResolution["projectionCache"],
    liveSyncCache: createNoopLiveSyncCacheStore(),
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

  test("match detail lookup resolves canonical group fixture IDs", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult(),
      "wc2026-group-a-md1-01-mexico-vs-south-africa"
    );

    expect(entry).not.toBeNull();
    expect(entry?.fixtureId).toBe("wc2026-group-a-md1-01-mexico-vs-south-africa");
    expect(entry?.homeTeam).toBe("Mexico");
    expect(entry?.awayTeam).toBe("South Africa");
  });

  test("match detail lookup resolves numeric provider fixture IDs for official knockout records", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult({ fixtures: [roundOf32Fixture()] }),
      "537417"
    );

    expect(entry).not.toBeNull();
    expect(entry?.fixtureId).toBe("wc2026-match-73-south-africa-vs-canada");
    expect(entry?.providerFixtureId).toBe("537417");
    expect(entry?.homeTeam).toBe("South Africa");
    expect(entry?.awayTeam).toBe("Canada");
    expect(entry?.homeScore).toBe(0);
    expect(entry?.awayScore).toBe(1);
  });

  test("match detail lookup resolves canonical official knockout fixture IDs", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult({ fixtures: [roundOf32Fixture()] }),
      "wc2026-match-73-south-africa-vs-canada"
    );

    expect(entry).not.toBeNull();
    expect(entry?.fixtureId).toBe("wc2026-match-73-south-africa-vs-canada");
    expect(entry?.providerFixtureId).toBe("537417");
    expect(entry?.homeTeam).toBe("South Africa");
    expect(entry?.awayTeam).toBe("Canada");
  });

  test("match detail lookup preserves canonical orientation for reversed provider records", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult({
        fixtures: [
          roundOf32Fixture({
            homeTeam: "Canada",
            awayTeam: "South Africa",
            homeScore: 1,
            awayScore: 0
          })
        ]
      }),
      "537417"
    );

    expect(entry?.homeTeam).toBe("South Africa");
    expect(entry?.awayTeam).toBe("Canada");
    expect(entry?.homeScore).toBe(0);
    expect(entry?.awayScore).toBe(1);
  });

  test("match detail lookup preserves canonical orientation for reversed penalty metadata", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult({
        fixtures: [
          roundOf32Fixture({
            homeTeam: "Canada",
            awayTeam: "South Africa",
            homeScore: 1,
            awayScore: 1,
            regularTimeHomeScore: 1,
            regularTimeAwayScore: 1,
            extraTimeHomeScore: 1,
            extraTimeAwayScore: 1,
            penaltyHomeScore: 4,
            penaltyAwayScore: 5,
            winner: "South Africa",
            decisionMethod: "penalties"
          })
        ]
      }),
      "537417"
    );

    expect(entry?.homeTeam).toBe("South Africa");
    expect(entry?.awayTeam).toBe("Canada");
    expect(entry?.homeScore).toBe(1);
    expect(entry?.awayScore).toBe(1);
    expect(entry?.regularTimeHomeScore).toBe(1);
    expect(entry?.regularTimeAwayScore).toBe(1);
    expect(entry?.extraTimeHomeScore).toBe(1);
    expect(entry?.extraTimeAwayScore).toBe(1);
    expect(entry?.penaltyHomeScore).toBe(5);
    expect(entry?.penaltyAwayScore).toBe(4);
    expect(entry?.winner).toBe("South Africa");
    expect(entry?.decisionMethod).toBe("penalties");
  });

  test("match detail lookup uses canonical fallback when provider records are unavailable", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult({
        providerMode: "local_static",
        activeProvider: "local_static_results_provider",
        localFallbackUsed: true,
        externalProviderEnabled: false,
        fixtures: [],
        completedResults: [],
        liveMatches: []
      }),
      "wc2026-match-73-south-africa-vs-canada"
    );

    expect(entry).not.toBeNull();
    expect(entry?.fixtureId).toBe("wc2026-match-73-south-africa-vs-canada");
    expect(entry?.homeTeam).toBe("South Africa");
    expect(entry?.awayTeam).toBe("Canada");
    expect(entry?.state).toBe("upcoming");
  });

  test("match detail lookup resolves aliased provider IDs when provider records are unavailable", () => {
    const entry = buildDashboardMatchEntryById(
      syncResult({
        providerMode: "local_static",
        activeProvider: "local_static_results_provider",
        localFallbackUsed: true,
        externalProviderEnabled: false,
        fixtures: [],
        completedResults: [],
        liveMatches: []
      }),
      "537417"
    );

    expect(entry).not.toBeNull();
    expect(entry?.fixtureId).toBe("wc2026-match-73-south-africa-vs-canada");
    expect(entry?.homeTeam).toBe("South Africa");
    expect(entry?.awayTeam).toBe("Canada");
    expect(entry?.state).toBe("upcoming");
  });

  test("match detail lookup returns null only for genuinely unknown IDs", () => {
    const entry = buildDashboardMatchEntryById(syncResult(), "unknown-fixture-id");

    expect(entry).toBeNull();
  });

  test("match detail lookup is deterministic across repeated requests", () => {
    const data = syncResult({ fixtures: [roundOf32Fixture()] });

    const first = buildDashboardMatchEntryById(data, "537417");
    const second = buildDashboardMatchEntryById(data, "537417");

    expect(second).toEqual(first);
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

  test("production StatsBomb prediction helper is baseline-safe by default", () => {
    const previousMode = process.env["STATSBOMB_PREDICTION_SIGNAL_MODE"];
    const previousEnabled = process.env["STATSBOMB_PREDICTION_SIGNAL_ENABLED"];
    delete process.env["STATSBOMB_PREDICTION_SIGNAL_MODE"];
    delete process.env["STATSBOMB_PREDICTION_SIGNAL_ENABLED"];

    try {
      const result = predictDashboardMatchFromLiveEloWithProductionStatsBomb({
        homeTeam: "France",
        awayTeam: "Brazil",
        preset: "balanced"
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      expect(result.statsBombSignal).toMatchObject({
        enabled: false,
        applied: false,
        reason: "disabled",
        rolloutMode: "off",
        authoritative: "baseline"
      });
    } finally {
      if (previousMode === undefined) delete process.env["STATSBOMB_PREDICTION_SIGNAL_MODE"];
      else process.env["STATSBOMB_PREDICTION_SIGNAL_MODE"] = previousMode;

      if (previousEnabled === undefined) delete process.env["STATSBOMB_PREDICTION_SIGNAL_ENABLED"];
      else process.env["STATSBOMB_PREDICTION_SIGNAL_ENABLED"] = previousEnabled;
    }
  });
});

describe("getDashboardLiveSyncResult — last-known-good cache", () => {
  beforeEach(() => {
    resetSyncResultCache();
  });

  test("returns fresh external data and stores it as the last known good result", async () => {
    const freshSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });

    const result = await getDashboardLiveSyncResult(async () => freshSync);

    expect(result.localFallbackUsed).toBe(false);
    expect(result.fixtures).toHaveLength(2);
    expect(result.cacheUsed).toBe(false);
  });

  test("persists durable last known good when provider response is usable", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const freshSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });

    const result = await getDashboardLiveSyncResult({
      syncFn: async () => freshSync,
      liveSyncCacheStore: durableStore
    });
    const stored = await durableStore.get({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      now: "2026-06-10T12:05:00.000Z"
    });

    expect(result.cacheUsed).toBe(false);
    expect(stored?.payload.fixtures).toHaveLength(2);
  });

  test("does not persist durable last known good when provider response is empty", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });

    await getDashboardLiveSyncResult({
      syncFn: async () => emptyExternalSync,
      liveSyncCacheStore: durableStore
    });
    const stored = await durableStore.get({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      now: "2026-06-10T12:05:00.000Z"
    });

    expect(stored).toBeNull();
  });

  test("serves last known good result when the external provider degrades", async () => {
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const degradedSync = syncResult({
      providerMode: "local_static",
      activeProvider: "local_static_results_provider",
      localFallbackUsed: true,
      externalProviderEnabled: false,
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    await getDashboardLiveSyncResult(async () => validSync);
    const result = await getDashboardLiveSyncResult(async () => degradedSync);

    expect(result.localFallbackUsed).toBe(false);
    expect(result.cacheUsed).toBe(true);
    expect(result.fixtures).toHaveLength(2);
    expect(result.warnings.some((w) => w.includes("stale"))).toBe(true);
  });

  test("cold runtime serves durable last known good when process cache is empty", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const degradedSync = syncResult({
      providerMode: "local_static",
      activeProvider: "local_static_results_provider",
      localFallbackUsed: true,
      externalProviderEnabled: false,
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["External provider failed. Local static data was used as fallback."]
    });
    await durableStore.set({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      payload: validSync,
      provider: validSync.activeProvider,
      syncedAt: validSync.syncedAt,
      expiresAt: computeLiveSyncCacheExpiresAt(validSync.syncedAt)
    });

    const result = await getDashboardLiveSyncResult({
      syncFn: async () => degradedSync,
      liveSyncCacheStore: durableStore,
      now: "2026-06-10T12:05:00.000Z"
    });

    expect(result.localFallbackUsed).toBe(false);
    expect(result.cacheUsed).toBe(true);
    expect(result.fixtures).toHaveLength(2);
    expect(result.warnings).toContain("Showing last successful live data while the provider refreshes.");
    expect(result.warnings).toContain("External provider failed. Local static data was used as fallback.");
  });

  test("process last known good takes precedence over durable last known good", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const processSync = syncResult({ fixtures: [fixture()] });
    const durableSync = syncResult({
      fixtures: [
        fixture({
          providerFixtureId: "durable-fixture",
          homeTeam: "Brazil",
          awayTeam: "Germany",
          kickoffAt: "2026-06-12T19:00:00Z"
        })
      ]
    });
    const degradedSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });
    await durableStore.set({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      payload: durableSync,
      provider: durableSync.activeProvider,
      syncedAt: durableSync.syncedAt,
      expiresAt: computeLiveSyncCacheExpiresAt(durableSync.syncedAt)
    });

    await getDashboardLiveSyncResult({
      syncFn: async () => processSync,
      liveSyncCacheStore: durableStore
    });
    const result = await getDashboardLiveSyncResult({
      syncFn: async () => degradedSync,
      liveSyncCacheStore: durableStore
    });

    expect(result.fixtures).toHaveLength(1);
    expect(result.fixtures[0]?.providerFixtureId).toBe("wc2026-group-a-md1-01-mexico-vs-south-africa");
  });

  test("expired durable last known good is ignored when process cache is empty", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const degradedSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });
    await durableStore.set({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      payload: validSync,
      provider: validSync.activeProvider,
      syncedAt: validSync.syncedAt,
      expiresAt: computeLiveSyncCacheExpiresAt(validSync.syncedAt)
    });

    const result = await getDashboardLiveSyncResult({
      syncFn: async () => degradedSync,
      liveSyncCacheStore: durableStore,
      now: "2026-06-10T12:16:00.000Z"
    });

    expect(result.cacheUsed).toBe(false);
    expect(result.fixtures).toHaveLength(0);
  });

  test("invalid durable payload is ignored safely", async () => {
    const invalidStore: LiveSyncCacheStore = {
      async get() {
        return {
          cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
          payload: { status: "success" } as WorldCup2026SyncResult,
          provider: "football_data_org_results_provider",
          syncedAt: "2026-06-10T12:00:00.000Z",
          expiresAt: "2026-06-10T12:15:00.000Z",
          schemaVersion: "1"
        };
      },
      async set() {
        return undefined;
      },
      async delete() {
        return undefined;
      }
    };
    const degradedSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    const result = await getDashboardLiveSyncResult({
      syncFn: async () => degradedSync,
      liveSyncCacheStore: invalidStore,
      now: "2026-06-10T12:05:00.000Z"
    });

    expect(result.fixtures).toHaveLength(0);
    expect(result.warnings).toContain("Durable live data cache payload was invalid and was ignored.");
  });

  test("provider recovery replaces durable last known good", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const firstValidSync = syncResult({ fixtures: [fixture()] });
    const secondValidSync = syncResult({
      syncedAt: "2026-06-10T12:05:00.000Z",
      lastSuccessfulSync: "2026-06-10T12:05:00.000Z",
      fixtures: [fixture(), roundOf32Fixture()]
    });

    await getDashboardLiveSyncResult({
      syncFn: async () => firstValidSync,
      liveSyncCacheStore: durableStore
    });
    await getDashboardLiveSyncResult({
      syncFn: async () => secondValidSync,
      liveSyncCacheStore: durableStore
    });
    const stored = await durableStore.get({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      now: "2026-06-10T12:06:00.000Z"
    });

    expect(stored?.payload.fixtures).toHaveLength(2);
    expect(stored?.payload.syncedAt).toBe("2026-06-10T12:05:00.000Z");
  });

  test("memory mode without durable cache still returns degraded data safely on cold runtime", async () => {
    const degradedSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    const result = await getDashboardLiveSyncResult({
      syncFn: async () => degradedSync,
      liveSyncCacheStore: null
    });

    expect(result.fixtures).toHaveLength(0);
    expect(result.cacheUsed).toBe(false);
  });

  test("does not replace last known good with an empty external provider success", async () => {
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["football-data.org returned no resolved fixture records for this refresh."]
    });

    await getDashboardLiveSyncResult(async () => validSync);
    const result = await getDashboardLiveSyncResult(async () => emptyExternalSync);

    expect(result.localFallbackUsed).toBe(false);
    expect(result.cacheUsed).toBe(true);
    expect(result.fixtures).toHaveLength(2);
    expect(result.warnings).toContain("Showing last successful live data while the provider refreshes.");
    expect(result.warnings).toContain("football-data.org returned no resolved fixture records for this refresh.");
  });

  test("daily matches keep valid last known good data after a false-empty external refresh", async () => {
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });

    await getDashboardLiveSyncResult(async () => validSync);
    const cachedResult = await getDashboardLiveSyncResult(async () => emptyExternalSync);
    const dailyMatches = buildDashboardDailyMatchesFromSync(cachedResult, {
      date: "2026-06-11",
      timezone: "America/Bogota"
    });

    expect(dailyMatches.matches).toHaveLength(1);
    expect(dailyMatches.providerMetadata.cacheUsed).toBe(true);
    expect(dailyMatches.warnings).toContain("Daily matches data was served from cache and may be stale.");
  });

  test("Home match selection can use durable last known good data on a cold degraded response", async () => {
    const durableStore = createInMemoryLiveSyncCacheStore();
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });
    await durableStore.set({
      cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
      payload: validSync,
      provider: validSync.activeProvider,
      syncedAt: validSync.syncedAt,
      expiresAt: computeLiveSyncCacheExpiresAt(validSync.syncedAt)
    });

    const cachedResult = await getDashboardLiveSyncResult({
      syncFn: async () => emptyExternalSync,
      liveSyncCacheStore: durableStore,
      now: "2026-06-10T12:05:00.000Z"
    });
    const dailyMatches = buildDashboardDailyMatchesFromSync(cachedResult, {
      date: "2026-06-11",
      timezone: "America/Bogota"
    });

    expect(selectHomeMatches(dailyMatches)).toHaveLength(1);
  });

  test("true empty selected dates remain empty even when last known good is served", async () => {
    const validSync = syncResult({ fixtures: [fixture()] });
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });

    await getDashboardLiveSyncResult(async () => validSync);
    const cachedResult = await getDashboardLiveSyncResult(async () => emptyExternalSync);
    const dailyMatches = buildDashboardDailyMatchesFromSync(cachedResult, {
      date: "2026-06-12",
      timezone: "America/Bogota"
    });

    expect(dailyMatches.matches).toHaveLength(0);
    expect(dailyMatches.counts.total).toBe(0);
    expect(dailyMatches.providerMetadata.cacheUsed).toBe(true);
  });

  test("serves degraded result as-is when no prior valid result is cached", async () => {
    const degradedSync = syncResult({
      providerMode: "local_static",
      activeProvider: "local_static_results_provider",
      localFallbackUsed: true,
      externalProviderEnabled: false,
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    const result = await getDashboardLiveSyncResult(async () => degradedSync);

    expect(result.localFallbackUsed).toBe(true);
    expect(result.fixtures).toHaveLength(0);
  });

  test("does not seed last known good from an empty external provider success", async () => {
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });
    const degradedSync = syncResult({
      providerMode: "local_static",
      activeProvider: "local_static_results_provider",
      localFallbackUsed: true,
      externalProviderEnabled: false,
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    const firstResult = await getDashboardLiveSyncResult(async () => emptyExternalSync);
    const secondResult = await getDashboardLiveSyncResult(async () => degradedSync);

    expect(firstResult.fixtures).toHaveLength(0);
    expect(firstResult.cacheUsed).toBe(false);
    expect(secondResult.localFallbackUsed).toBe(true);
    expect(secondResult.cacheUsed).toBe(false);
    expect(secondResult.fixtures).toHaveLength(0);
  });

  test("updates last known good when a valid result arrives after a degraded response", async () => {
    const firstValidSync = syncResult({ fixtures: [fixture()] });
    const degradedSync = syncResult({
      providerMode: "local_static",
      activeProvider: "local_static_results_provider",
      localFallbackUsed: true,
      externalProviderEnabled: false,
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });
    const secondValidSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });

    await getDashboardLiveSyncResult(async () => firstValidSync);
    await getDashboardLiveSyncResult(async () => degradedSync);
    const result = await getDashboardLiveSyncResult(async () => secondValidSync);

    expect(result.localFallbackUsed).toBe(false);
    expect(result.fixtures).toHaveLength(2);
    expect(result.cacheUsed).toBe(false);
  });

  test("recovers from a false-empty provider refresh when fresh fixture data returns", async () => {
    const firstValidSync = syncResult({ fixtures: [fixture()] });
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: [],
      warnings: ["Provider refresh returned an empty match bundle."]
    });
    const secondValidSync = syncResult({
      fixtures: [
        fixture(),
        roundOf32Fixture({
          kickoffAt: "2026-06-29T01:00:00Z"
        })
      ],
      syncedAt: "2026-06-11T12:00:00Z",
      lastSuccessfulSync: "2026-06-11T12:00:00Z"
    });

    await getDashboardLiveSyncResult(async () => firstValidSync);
    const cachedResult = await getDashboardLiveSyncResult(async () => emptyExternalSync);
    const recoveredResult = await getDashboardLiveSyncResult(async () => secondValidSync);

    expect(cachedResult.cacheUsed).toBe(true);
    expect(recoveredResult.cacheUsed).toBe(false);
    expect(recoveredResult.fixtures).toHaveLength(2);
    expect(recoveredResult.lastSuccessfulSync).toBe("2026-06-11T12:00:00Z");
  });

  test("daily date filtering uses Colombia timezone consistently with cached data", async () => {
    const validSync = syncResult({
      fixtures: [
        roundOf32Fixture({
          kickoffAt: "2026-06-29T01:00:00Z"
        })
      ]
    });
    const emptyExternalSync = syncResult({
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    await getDashboardLiveSyncResult(async () => validSync);
    const cachedResult = await getDashboardLiveSyncResult(async () => emptyExternalSync);
    const colombiaDateMatches = buildDashboardDailyMatchesFromSync(cachedResult, {
      date: "2026-06-28",
      timezone: "America/Bogota"
    });
    const utcDateMatches = buildDashboardDailyMatchesFromSync(cachedResult, {
      date: "2026-06-29",
      timezone: "UTC"
    });

    expect(colombiaDateMatches.matches).toHaveLength(1);
    expect(utcDateMatches.matches).toHaveLength(1);
    expect(colombiaDateMatches.matches[0]?.fixtureId).toBe(utcDateMatches.matches[0]?.fixtureId);
  });

  test("rapid sequential degraded requests all receive the same last known good result", async () => {
    const validSync = syncResult({ fixtures: [fixture(), roundOf32Fixture()] });
    const degradedSync = syncResult({
      providerMode: "local_static",
      activeProvider: "local_static_results_provider",
      localFallbackUsed: true,
      externalProviderEnabled: false,
      fixtures: [],
      completedResults: [],
      liveMatches: []
    });

    await getDashboardLiveSyncResult(async () => validSync);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => getDashboardLiveSyncResult(async () => degradedSync))
    );

    for (const result of results) {
      expect(result.cacheUsed).toBe(true);
      expect(result.fixtures).toHaveLength(2);
    }
  });
});
