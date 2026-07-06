import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import postgres from "postgres";
import { runMigrations } from "../src/migration-runner.js";
import { createPostgresLiveSyncCacheStore } from "../src/postgres-live-sync-cache.js";
import { SnapshotStorageError } from "../src/async-snapshot-store.js";
import { LIVE_SYNC_CACHE_SCHEMA_VERSION, LIVE_SYNC_LKG_CACHE_KEY } from "../src/live-sync-cache.js";
import { runLiveSyncCacheStoreContractTests } from "./live-sync-cache.test.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

if (TEST_DATABASE_URL === undefined || TEST_DATABASE_URL === "") {
  describe("postgres live sync cache store (skipped)", () => {
    it.skip("set TEST_DATABASE_URL to run PostgreSQL integration tests", () => {
      // intentionally empty
    });
  });
} else {
  const sql = postgres(TEST_DATABASE_URL, { max: 5 });

  beforeAll(async () => {
    await runMigrations(sql);
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE live_sync_cache RESTART IDENTITY CASCADE`;
  });

  runLiveSyncCacheStoreContractTests("postgres live sync cache adapter", async () => {
    const store = createPostgresLiveSyncCacheStore(sql) as ReturnType<typeof createPostgresLiveSyncCacheStore> & {
      reset?(): Promise<void>;
    };

    store.reset = async () => {
      await sql`TRUNCATE TABLE live_sync_cache RESTART IDENTITY CASCADE`;
    };

    return store;
  });

  describe("migration 0004 — live_sync_cache table structure", () => {
    it("live_sync_cache table exists", async () => {
      const rows = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'live_sync_cache'
        ) AS exists
      `;
      expect(rows[0]?.exists).toBe(true);
    });

    it("primary key on cache_key exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'live_sync_cache'
          AND constraint_type = 'PRIMARY KEY'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("expires_at index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'live_sync_cache'
          AND indexname = 'live_sync_cache_expires_at_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("updated_at index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'live_sync_cache'
          AND indexname = 'live_sync_cache_updated_at_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("schema_version stores LIVE_SYNC_CACHE_SCHEMA_VERSION", async () => {
      const store = createPostgresLiveSyncCacheStore(sql);
      await store.set({
        cacheKey: LIVE_SYNC_LKG_CACHE_KEY,
        provider: "football_data_org_results_provider",
        syncedAt: "2026-06-11T12:00:00.000Z",
        expiresAt: "2026-06-11T12:15:00.000Z",
        payload: {
          status: "success",
          providerMode: "football_data_org",
          activeProvider: "football_data_org_results_provider",
          cacheUsed: false,
          localFallbackUsed: false,
          externalProviderEnabled: true,
          syncedAt: "2026-06-11T12:00:00.000Z",
          fixtures: [
            {
              providerFixtureId: "fixture-1",
              competition: "FIFA World Cup",
              season: "2026",
              kickoffAt: "2026-06-11T19:00:00Z",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "scheduled"
            }
          ],
          liveMatches: [],
          completedResults: [],
          standings: [],
          normalizationIssues: [],
          warnings: []
        }
      });
      const rows = await sql<{ schema_version: string }[]>`
        SELECT schema_version FROM live_sync_cache
        WHERE cache_key = ${LIVE_SYNC_LKG_CACHE_KEY}
        LIMIT 1
      `;
      expect(rows[0]?.schema_version).toBe(LIVE_SYNC_CACHE_SCHEMA_VERSION);
    });
  });

  describe("error sanitization", () => {
    it("query_failed error does not leak connection string", async () => {
      const badSql = postgres("postgresql://invalid:invalid@localhost:9999/nonexistent", {
        max: 1,
        connect_timeout: 1
      });
      const store = createPostgresLiveSyncCacheStore(badSql);
      let caughtError: unknown;
      try {
        await store.get({ cacheKey: LIVE_SYNC_LKG_CACHE_KEY });
      } catch (err) {
        caughtError = err;
      } finally {
        await badSql.end({ timeout: 1 }).catch(() => {
          // intentionally ignored
        });
      }

      expect(caughtError).toBeInstanceOf(SnapshotStorageError);
      const errMsg = String((caughtError as SnapshotStorageError).message);
      expect(errMsg).not.toContain("invalid");
      expect(errMsg).not.toContain("9999");
      expect(errMsg).not.toContain("password");
    });
  });
}
