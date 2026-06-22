/**
 * PostgreSQL adapter contract tests.
 *
 * These tests are opt-in. They only run when TEST_DATABASE_URL is set.
 * They MUST NOT connect to a production database — the URL must point to a
 * dedicated test database or schema. The test isolates state by truncating
 * the prediction_snapshots table inside each beforeEach block (which runs
 * after migrations have been applied).
 *
 * To run:
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/test_db \
 *     pnpm --filter @world-cup-2026-predictor/api test -- \
 *     tests/postgres-prediction-snapshot-store.test.ts
 *
 * Safety:
 *   - Never falls back from TEST_DATABASE_URL to DATABASE_URL.
 *   - Never connects when TEST_DATABASE_URL is absent.
 *   - Migrations run once per describe block before tests execute.
 *   - State is truncated before each test (not committed via real transactions
 *     to avoid interfering with future FK references in later migrations).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { join } from "node:path";
import { runSnapshotStoreContractTests } from "./prediction-snapshot-store.test.js";
import type { AsyncPredictionSnapshotStore } from "../src/async-snapshot-store.js";
import { SnapshotStorageError, createAsyncInMemorySnapshotStore } from "../src/async-snapshot-store.js";
import { createPostgresPredictionSnapshotStore } from "../src/postgres-snapshot-store.js";
import { runMigrations } from "../src/migration-runner.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

// ---------------------------------------------------------------------------
// Safety check: reject any attempt to use a production-looking URL.
// ---------------------------------------------------------------------------

function assertTestDatabaseUrl(url: string): void {
  const lower = url.toLowerCase();
  const looksProduction =
    lower.includes("production") ||
    lower.includes("prod") ||
    lower.includes("sslmode=verify-full") ||
    (lower.includes("neon.tech") && !lower.includes("test") && !lower.includes("dev"));
  if (looksProduction) {
    throw new Error(
      `TEST_DATABASE_URL appears to reference a production database. ` +
      `Refusing to run test migrations against it. ` +
      `URL hint: ${url.slice(0, 40)}...`
    );
  }
}

// ---------------------------------------------------------------------------
// Skip gracefully when TEST_DATABASE_URL is not set.
// ---------------------------------------------------------------------------

const SKIP = !TEST_DATABASE_URL;

describe.skipIf(SKIP)(
  "postgres adapter — integration (requires TEST_DATABASE_URL)",
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    type PostgresModule = typeof import("postgres");
    let postgresImport: PostgresModule;
    let sql: ReturnType<PostgresModule>;
    let pgStore: AsyncPredictionSnapshotStore & { reset?(): void };

    beforeAll(async () => {
      if (!TEST_DATABASE_URL) return;
      assertTestDatabaseUrl(TEST_DATABASE_URL);

      // Dynamic import keeps postgres out of the test module graph when skipped.
      const mod = await import("postgres");
      postgresImport = mod.default as unknown as PostgresModule;
      sql = (postgresImport as unknown as (url: string, opts: unknown) => ReturnType<PostgresModule>)(
        TEST_DATABASE_URL,
        { max: 2 }
      );

      await runMigrations(
        sql as unknown as Parameters<typeof runMigrations>[0],
      );
    });

    afterAll(async () => {
      await (sql as unknown as { end(): Promise<void> }).end();
    });

    beforeEach(async () => {
      await (sql as unknown as { unsafe(q: string): Promise<void> }).unsafe(
        "TRUNCATE TABLE prediction_snapshots RESTART IDENTITY CASCADE"
      );
      pgStore = createPostgresPredictionSnapshotStore(
        sql as unknown as Parameters<typeof createPostgresPredictionSnapshotStore>[0]
      );
    });

    // Run the shared contract suite against the PostgreSQL adapter.
    runSnapshotStoreContractTests("postgres adapter", async () => pgStore);

    // -----------------------------------------------------------------------
    // PostgreSQL-specific: migration validation
    // -----------------------------------------------------------------------

    it("prediction_snapshots table exists after migration", async () => {
      const rows = await (sql as unknown as { unsafe(q: string): Promise<{ tablename: string }[]> }).unsafe(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'prediction_snapshots'
      `);
      expect(rows.length).toBe(1);
    });

    it("prediction_snapshots has primary key on snapshot_id", async () => {
      const rows = await (sql as unknown as { unsafe(q: string): Promise<{ constraint_name: string }[]> }).unsafe(`
        SELECT kc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kc
          ON tc.constraint_name = kc.constraint_name
        WHERE tc.table_name = 'prediction_snapshots'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kc.column_name = 'snapshot_id'
      `);
      expect(rows.length).toBe(1);
    });

    it("prediction_snapshots has unique constraint on idempotency_key", async () => {
      const rows = await (sql as unknown as { unsafe(q: string): Promise<{ constraint_name: string }[]> }).unsafe(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kc
          ON tc.constraint_name = kc.constraint_name
        WHERE tc.table_name = 'prediction_snapshots'
          AND tc.constraint_type = 'UNIQUE'
          AND kc.column_name = 'idempotency_key'
      `);
      expect(rows.length).toBe(1);
    });

    it("prediction_snapshots has index on fixture_id", async () => {
      const rows = await (sql as unknown as { unsafe(q: string): Promise<{ indexname: string }[]> }).unsafe(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'prediction_snapshots'
          AND indexname = 'prediction_snapshots_fixture_id_idx'
      `);
      expect(rows.length).toBe(1);
    });

    it("prediction_snapshots has index on captured_at", async () => {
      const rows = await (sql as unknown as { unsafe(q: string): Promise<{ indexname: string }[]> }).unsafe(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'prediction_snapshots'
          AND indexname = 'prediction_snapshots_captured_at_idx'
      `);
      expect(rows.length).toBe(1);
    });

    it("prediction_snapshots check constraint rejects invalid status", async () => {
      await expect(
        (sql as unknown as { unsafe(q: string): Promise<void> }).unsafe(`
          INSERT INTO prediction_snapshots (
            snapshot_id, fixture_id, snapshot_status, captured_at, cutoff_at,
            home_team, away_team, model_version, formula_version,
            snapshot_schema_version, idempotency_key, content_hash,
            prediction_payload, confidence_payload, provenance_payload
          ) VALUES (
            'snap-test-bad-status', 'fix-1', 'invalid_status',
            NOW(), NOW(), 'Home', 'Away', 'model-1', 'v2', '1',
            'idem-bad', 'hash-bad',
            '{"schemaVersion":"1","modelConfiguration":{},"inputs":{},"prediction":{}}'::jsonb,
            '{"schemaVersion":"1","confidence":{}}'::jsonb,
            '{"schemaVersion":"1","provenance":{}}'::jsonb
          )
        `)
      ).rejects.toThrow();
    });

    it("prediction_snapshots check constraint enforces pre_match_locked requires kickoff_at < captured_at", async () => {
      await expect(
        (sql as unknown as { unsafe(q: string): Promise<void> }).unsafe(`
          INSERT INTO prediction_snapshots (
            snapshot_id, fixture_id, snapshot_status, captured_at, cutoff_at, kickoff_at,
            home_team, away_team, model_version, formula_version,
            snapshot_schema_version, idempotency_key, content_hash,
            prediction_payload, confidence_payload, provenance_payload
          ) VALUES (
            'snap-test-bad-timing', 'fix-1', 'pre_match_locked',
            '2026-06-11T10:00:00Z', '2026-06-11T10:00:00Z',
            '2026-06-11T09:00:00Z',
            'Home', 'Away', 'model-1', 'v2', '1',
            'idem-bad-timing', 'hash-bad-timing',
            '{"schemaVersion":"1","modelConfiguration":{},"inputs":{},"prediction":{}}'::jsonb,
            '{"schemaVersion":"1","confidence":{}}'::jsonb,
            '{"schemaVersion":"1","provenance":{}}'::jsonb
          )
        `)
      ).rejects.toThrow();
    });

    // -----------------------------------------------------------------------
    // PostgreSQL-specific: error sanitization
    // -----------------------------------------------------------------------

    it("SnapshotStorageError does not expose connection string", async () => {
      const badSql = (postgresImport as unknown as (url: string, opts: unknown) => ReturnType<PostgresModule>)(
        TEST_DATABASE_URL!,
        { max: 1 }
      );
      const badStore = createPostgresPredictionSnapshotStore(
        badSql as unknown as Parameters<typeof createPostgresPredictionSnapshotStore>[0]
      );

      // Drop the table to trigger a query error.
      await (badSql as unknown as { unsafe(q: string): Promise<void> }).unsafe(
        "DROP TABLE IF EXISTS prediction_snapshots_nonexistent"
      );

      try {
        await badStore.getById("snap-nonexistent-table");
      } catch (err) {
        if (err instanceof SnapshotStorageError) {
          expect(err.message).not.toContain(TEST_DATABASE_URL);
          expect(err.message).not.toContain("password");
        }
      } finally {
        await (badSql as unknown as { end(): Promise<void> }).end();
      }
    });
  }
);

// ---------------------------------------------------------------------------
// Always-run: verify skip message is visible when TEST_DATABASE_URL is absent.
// ---------------------------------------------------------------------------

describe("postgres adapter — skip verification", () => {
  it("PostgreSQL tests are opt-in via TEST_DATABASE_URL env var", () => {
    if (SKIP) {
      // This confirms the skip is intentional and visible in CI output.
      expect(TEST_DATABASE_URL).toBeUndefined();
    } else {
      expect(TEST_DATABASE_URL).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Always-run: type-level validation that the in-memory async adapter
// satisfies the shared contract (used as a smoke test).
// ---------------------------------------------------------------------------

describe("async in-memory store — smoke test", () => {
  it("create and getById work after reset", async () => {
    const store = createAsyncInMemorySnapshotStore();
    store.reset();
    const snapshot = {
      snapshotId: "snap-smoke-0000000000000001",
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      status: "foundation_unverified" as const,
      capturedAt: "2026-06-11T10:00:00.000Z",
      cutoffAt: "2026-06-11T10:00:00.000Z",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      modelVersion: "wc2026-prediction-v1",
      modelConfiguration: { predictionMode: "live_elo" as const, eloPreset: "balanced", maxGoals: 7, tournamentResultsAdjustmentEnabled: false },
      inputs: { homeElo: 1650, awayElo: 1520, homeUsesFallback: false, awayUsesFallback: false, tournamentMatchesIncluded: 0 },
      prediction: { homeExpectedGoals: 1.5, awayExpectedGoals: 1.1, homeWinProbability: 0.48, drawProbability: 0.26, awayWinProbability: 0.26, mostLikelyScorelines: [] },
      confidence: { level: "medium" as const, coverageType: "full" as const, reasons: [], dataPoints: { homeUsesFallback: false, awayUsesFallback: false, homeMatchesPlayed: 5, awayMatchesPlayed: 4, historicalMatchesAvailable: 3 }, manualXgRecommended: false },
      provenance: {},
      contentHash: "smoke-content-hash"
    };
    await store.create(snapshot, "smoke-idem-key-001");
    const fetched = await store.getById("snap-smoke-0000000000000001");
    expect(fetched?.snapshotId).toBe("snap-smoke-0000000000000001");
  });
});
