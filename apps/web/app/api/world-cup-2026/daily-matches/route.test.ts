import { describe, expect, test } from "vitest";
import {
  LIVE_SYNC_LKG_CACHE_KEY,
  computeLiveSyncCacheExpiresAt,
  createInMemoryLiveSyncCacheStore
} from "@world-cup-2026-predictor/api";
import type { WorldCup2026SyncResult } from "@world-cup-2026-predictor/api";

import { GET } from "./route";
import { buildDailyMatchesRouteResponse } from "../../../../src/lib/daily-matches-route";
import { getDashboardLiveSyncResult, resetSyncResultCache } from "../../../../src/lib/server-runtime";

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-10T12:00:00.000Z",
    lastSuccessfulSync: "2026-06-10T12:00:00.000Z",
    fixtures: [
      {
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
        updatedAt: "2026-06-10T12:00:00Z"
      }
    ],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

describe("daily matches API route", () => {
  test("defaults omitted timezone to Colombia display time", async () => {
    const response = await GET(new Request("http://localhost/api/world-cup-2026/daily-matches?date=2026-06-23"));
    const body = await response.json() as { status: string; timezone?: string };

    expect(body.status).toBe("success");
    expect(body.timezone).toBe("America/Bogota");
  });

  test("preserves explicit UTC timezone override", async () => {
    const response = await GET(new Request("http://localhost/api/world-cup-2026/daily-matches?date=2026-06-24&timezone=UTC"));
    const body = await response.json() as { status: string; timezone?: string };

    expect(body.status).toBe("success");
    expect(body.timezone).toBe("UTC");
  });

  test("uses durable last known good sync result on a cold degraded provider response", async () => {
    resetSyncResultCache();
    const durableStore = createInMemoryLiveSyncCacheStore();
    const validSync = syncResult();
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

    const response = await buildDailyMatchesRouteResponse(
      new Request("http://localhost/api/world-cup-2026/daily-matches?date=2026-06-11"),
      () => getDashboardLiveSyncResult({
        syncFn: async () => degradedSync,
        liveSyncCacheStore: durableStore,
        now: "2026-06-10T12:05:00.000Z"
      })
    );
    const body = await response.json() as {
      status: string;
      matches?: unknown[];
      providerMetadata?: { cacheUsed?: boolean };
      warnings?: string[];
    };

    expect(body.status).toBe("success");
    expect(body.matches).toHaveLength(1);
    expect(body.providerMetadata?.cacheUsed).toBe(true);
    expect(body.warnings).toContain("Showing last successful live data while the provider refreshes.");
  });
});
