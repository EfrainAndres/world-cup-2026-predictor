import { describe, expect, it, beforeEach } from "vitest";
import type { WorldCup2026SyncResult } from "../src/schemas.js";
import type { LiveSyncCacheStore } from "../src/live-sync-cache.js";
import {
  LIVE_SYNC_CACHE_SCHEMA_VERSION,
  LIVE_SYNC_LKG_CACHE_KEY,
  LIVE_SYNC_LKG_CACHE_TTL_MS,
  computeLiveSyncCacheExpiresAt,
  createInMemoryLiveSyncCacheStore,
  createNoopLiveSyncCacheStore,
  parseLiveSyncCachePayload
} from "../src/live-sync-cache.js";

const SYNCED_AT = "2026-06-11T12:00:00.000Z";
const EXPIRES_AT = "2026-06-11T12:15:00.000Z";
const BEFORE_EXPIRY = "2026-06-11T12:05:00.000Z";
const AFTER_EXPIRY = "2026-06-11T12:16:00.000Z";

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: SYNCED_AT,
    lastSuccessfulSync: SYNCED_AT,
    fixtures: [
      {
        providerFixtureId: "fixture-1",
        competition: "FIFA World Cup",
        season: "2026",
        stage: "GROUP_STAGE",
        group: "A",
        matchday: 1,
        kickoffAt: "2026-06-11T19:00:00Z",
        homeTeam: "Mexico",
        awayTeam: "South Africa",
        status: "scheduled",
        updatedAt: SYNCED_AT
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

function setInput(payload: WorldCup2026SyncResult = syncResult()) {
  return {
    cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
    payload,
    provider: payload.activeProvider,
    syncedAt: payload.syncedAt,
    expiresAt: EXPIRES_AT
  };
}

export function runLiveSyncCacheStoreContractTests(
  storeName: string,
  makeStore: () => Promise<LiveSyncCacheStore & { reset?(): void | Promise<void> }>
): void {
  describe(`${storeName} — LiveSyncCacheStore contract`, () => {
    let store: LiveSyncCacheStore & { reset?(): void | Promise<void> };

    beforeEach(async () => {
      store = await makeStore();
      await store.reset?.();
    });

    it("set then get returns the stored live sync result", async () => {
      await store.set(setInput());
      const result = await store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY });
      expect(result).not.toBeNull();
      expect(result?.schemaVersion).toBe(LIVE_SYNC_CACHE_SCHEMA_VERSION);
      expect(result?.payload.fixtures).toHaveLength(1);
      expect(result?.provider).toBe("football_data_org_results_provider");
    });

    it("get returns null on cache miss", async () => {
      await expect(store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY })).resolves.toBeNull();
    });

    it("get returns null for expired entry", async () => {
      await store.set(setInput());
      await expect(store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: AFTER_EXPIRY })).resolves.toBeNull();
    });

    it("set overwrites an existing entry", async () => {
      await store.set(setInput());
      const updated = syncResult({
        syncedAt: "2026-06-11T12:01:00.000Z",
        fixtures: [
          {
            providerFixtureId: "fixture-2",
            competition: "FIFA World Cup",
            season: "2026",
            kickoffAt: "2026-06-12T19:00:00Z",
            homeTeam: "Brazil",
            awayTeam: "Germany",
            status: "scheduled"
          }
        ]
      });
      await store.set({
        ...setInput(updated),
        expiresAt: "2026-06-11T12:16:00.000Z"
      });
      const result = await store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY });
      expect(result?.payload.fixtures[0]?.providerFixtureId).toBe("fixture-2");
    });

    it("delete removes a stored entry", async () => {
      await store.set(setInput());
      await store.delete({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY });
      await expect(store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY })).resolves.toBeNull();
    });

    it("mutating a returned payload does not affect the stored entry", async () => {
      await store.set(setInput());
      const first = await store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY });
      if (first !== null) {
        (first.payload.fixtures as WorldCup2026SyncResult["fixtures"] & unknown[]).splice(
          0,
          first.payload.fixtures.length
        );
      }
      const second = await store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY });
      expect(second?.payload.fixtures).toHaveLength(1);
    });
  });
}

describe("live sync cache helpers", () => {
  it("computes default LKG expiry 15 minutes after syncedAt", () => {
    expect(computeLiveSyncCacheExpiresAt(SYNCED_AT)).toBe(EXPIRES_AT);
    expect(LIVE_SYNC_LKG_CACHE_TTL_MS).toBe(15 * 60 * 1000);
  });

  it("respects a custom TTL", () => {
    expect(computeLiveSyncCacheExpiresAt(SYNCED_AT, 60_000)).toBe("2026-06-11T12:01:00.000Z");
  });

  it("rejects invalid payloads", () => {
    expect(parseLiveSyncCachePayload({ status: "success" })).toBeNull();
    expect(parseLiveSyncCachePayload(syncResult())?.fixtures).toHaveLength(1);
  });

  it("noop store never stores entries", async () => {
    const store = createNoopLiveSyncCacheStore();
    await store.set(setInput());
    await expect(store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY, now: BEFORE_EXPIRY })).resolves.toBeNull();
  });
});

runLiveSyncCacheStoreContractTests("in-memory live sync cache adapter", async () => {
  return createInMemoryLiveSyncCacheStore();
});
