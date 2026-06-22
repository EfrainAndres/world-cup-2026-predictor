import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import postgres from "postgres";
import { runMigrations } from "../src/migration-runner.js";
import { createPostgresGroupProjectionCacheStore } from "../src/postgres-projection-cache.js";
import { SnapshotStorageError } from "../src/async-snapshot-store.js";
import { PROJECTION_CACHE_SCHEMA_VERSION } from "../src/async-projection-cache.js";
import type { WorldCup2026GroupProjection } from "../src/schemas.js";
import { runProjectionCacheStoreContractTests } from "./projection-cache-store.test.js";

// ---------------------------------------------------------------------------
// Opt-in gate
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

if (TEST_DATABASE_URL === undefined || TEST_DATABASE_URL === "") {
  describe("postgres projection cache store (skipped)", () => {
    it.skip("set TEST_DATABASE_URL to run PostgreSQL integration tests", () => {
      // intentionally empty
    });
  });
} else {
  // Never fall back to DATABASE_URL.
  const sql = postgres(TEST_DATABASE_URL, { max: 5 });

  beforeAll(async () => {
    await runMigrations(sql);
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projection_cache RESTART IDENTITY CASCADE`;
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const GROUP_A = "A";
  const TZ_NYC = "America/New_York";
  const BASE_GENERATED_AT = "2026-06-22T10:00:00.000Z";
  const BASE_EXPIRES_AT = "2026-06-22T10:15:00.000Z";
  const NOW_BEFORE_EXPIRY = "2026-06-22T10:01:00.000Z";
  const NOW_AFTER_EXPIRY = "2026-06-22T10:16:00.000Z";

  function makeProjection(overrides: Partial<WorldCup2026GroupProjection> = {}): WorldCup2026GroupProjection {
    return {
      available: true,
      status: "complete",
      standings: [],
      fixtures: [],
      warnings: [],
      ...overrides
    };
  }

  // -------------------------------------------------------------------------
  // Shared contract suite against PostgreSQL adapter
  // -------------------------------------------------------------------------

  runProjectionCacheStoreContractTests("postgres projection cache adapter", async () => {
    const store = createPostgresGroupProjectionCacheStore(sql) as ReturnType<typeof createPostgresGroupProjectionCacheStore> & {
      reset?(): void;
    };

    (store as unknown as Record<string, unknown>)["reset"] = async () => {
      await sql`TRUNCATE TABLE projection_cache RESTART IDENTITY CASCADE`;
    };

    return store;
  });

  // -------------------------------------------------------------------------
  // Migration validation tests
  // -------------------------------------------------------------------------

  describe("migration 0003 — table structure", () => {
    it("projection_cache table exists", async () => {
      const rows = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name   = 'projection_cache'
        ) AS exists
      `;
      expect(rows[0]?.exists).toBe(true);
    });

    it("primary key on cache_key exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'projection_cache'
          AND constraint_type = 'PRIMARY KEY'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("unique constraint on (group_code, timezone) exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'projection_cache'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'projection_cache_natural_key_unique'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("expires_at index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'projection_cache'
          AND indexname = 'projection_cache_expires_at_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("updated_at index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'projection_cache'
          AND indexname = 'projection_cache_updated_at_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("input_fingerprint index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'projection_cache'
          AND indexname = 'projection_cache_fingerprint_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("group_code check constraint exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'projection_cache'
          AND constraint_type = 'CHECK'
          AND constraint_name = 'projection_cache_group_code_check'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("expiry_after_generated check constraint exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'projection_cache'
          AND constraint_type = 'CHECK'
          AND constraint_name = 'projection_cache_expiry_after_generated'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Schema version persistence
  // -------------------------------------------------------------------------

  describe("schema version persistence", () => {
    it("projection_cache_schema_version stores PROJECTION_CACHE_SCHEMA_VERSION", async () => {
      const store = createPostgresGroupProjectionCacheStore(sql);
      await store.set({
        group: GROUP_A,
        timezone: TZ_NYC,
        projection: makeProjection(),
        inputFingerprint: "fp-sv-test",
        modelVersion: "mv-test",
        formulaVersion: "fv-test",
        generatedAt: BASE_GENERATED_AT,
        expiresAt: BASE_EXPIRES_AT
      });
      const rows = await sql<{ projection_cache_schema_version: string }[]>`
        SELECT projection_cache_schema_version FROM projection_cache
        WHERE group_code = 'A' AND timezone = ${TZ_NYC}
        LIMIT 1
      `;
      expect(rows[0]?.projection_cache_schema_version).toBe(PROJECTION_CACHE_SCHEMA_VERSION);
    });
  });

  // -------------------------------------------------------------------------
  // Upsert semantics
  // -------------------------------------------------------------------------

  describe("upsert semantics", () => {
    it("second set for same group+timezone updates the existing row", async () => {
      const store = createPostgresGroupProjectionCacheStore(sql);
      await store.set({
        group: GROUP_A,
        timezone: TZ_NYC,
        projection: makeProjection({ status: "partial" }),
        inputFingerprint: "fp1",
        modelVersion: "mv1",
        formulaVersion: "fv1",
        generatedAt: BASE_GENERATED_AT,
        expiresAt: BASE_EXPIRES_AT
      });
      await store.set({
        group: GROUP_A,
        timezone: TZ_NYC,
        projection: makeProjection({ status: "complete" }),
        inputFingerprint: "fp2",
        modelVersion: "mv2",
        formulaVersion: "fv2",
        generatedAt: BASE_GENERATED_AT,
        expiresAt: BASE_EXPIRES_AT
      });
      const count = await sql<{ count: string }[]>`
        SELECT COUNT(*) AS count FROM projection_cache WHERE group_code = 'A' AND timezone = ${TZ_NYC}
      `;
      expect(Number(count[0]?.count)).toBe(1);
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result?.status).toBe("complete");
    });
  });

  // -------------------------------------------------------------------------
  // Expired row handling
  // -------------------------------------------------------------------------

  describe("expired row handling", () => {
    it("get returns null for an expired entry", async () => {
      const store = createPostgresGroupProjectionCacheStore(sql);
      await store.set({
        group: GROUP_A,
        timezone: TZ_NYC,
        projection: makeProjection(),
        inputFingerprint: "fp-exp",
        modelVersion: "mv",
        formulaVersion: "fv",
        generatedAt: BASE_GENERATED_AT,
        expiresAt: BASE_EXPIRES_AT
      });
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_AFTER_EXPIRY });
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Error sanitization
  // -------------------------------------------------------------------------

  describe("error sanitization", () => {
    it("query_failed error does not leak connection string", async () => {
      const badSql = postgres("postgresql://invalid:invalid@localhost:9999/nonexistent", {
        max: 1,
        connect_timeout: 1
      });
      const store = createPostgresGroupProjectionCacheStore(badSql);
      let caughtError: unknown;
      try {
        await store.get({ group: GROUP_A, timezone: TZ_NYC });
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
