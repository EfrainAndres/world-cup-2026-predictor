/**
 * Phase 12.18A1 — Automated Pre-Match Snapshot Capture integration tests.
 *
 * The PostgreSQL-backed tests are opt-in and only run when TEST_DATABASE_URL is
 * set. They never fall back to DATABASE_URL and never connect when the test URL
 * is absent. The memory-backed and config tests always run.
 *
 * To run the PostgreSQL tests:
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5433/test_db \
 *     pnpm --filter @world-cup-2026-predictor/api test -- \
 *     tests/prematch-snapshot-capture-integration.test.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  __resetPreMatchSnapshotCaptureRuntimeForTests,
  captureWorldCup2026PreMatchSnapshots,
  createPostgresAdvisoryCaptureLock,
  PreMatchSnapshotCaptureConfigError,
  runScheduledPreMatchSnapshotCapture
} from "../src/prematch-snapshot-capture.js";
import {
  createAsyncInMemorySnapshotStore,
  type AsyncPredictionSnapshotStore
} from "../src/async-snapshot-store.js";
import { createPostgresPredictionSnapshotStore } from "../src/postgres-snapshot-store.js";
import { runMigrations } from "../src/migration-runner.js";
import { predictMatchFromLiveElo } from "../src/routes.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "../src/world-cup-2026-teams.js";
import type { PredictionHistoryPersistenceResolution } from "../src/persistence-runtime.js";
import type { WorldCup2026ExternalFixtureRecord } from "../src/schemas.js";

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const KICKOFF = "2026-06-18T20:00:00.000Z";
const INSIDE_WINDOW = "2026-06-18T12:00:00.000Z";

function recordFor(id: string): WorldCup2026ExternalFixtureRecord {
  const fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.id === id)!;
  return {
    providerFixtureId: id,
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    status: "scheduled",
    kickoffAt: KICKOFF
  };
}

function makeResolution(
  snapshotStore: AsyncPredictionSnapshotStore,
  provider: "memory" | "postgres"
): PredictionHistoryPersistenceResolution {
  return {
    provider,
    snapshotStore,
    metadata: { provider, persistent: provider === "postgres", configuredProvider: provider }
  } as unknown as PredictionHistoryPersistenceResolution;
}

beforeEach(() => {
  __resetPreMatchSnapshotCaptureRuntimeForTests();
});

describe("memory adapter capture", () => {
  it("repeated runs create no duplicate snapshot", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const persistence = makeResolution(store, "memory");
    const input = {
      now: INSIDE_WINDOW,
      persistence,
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [recordFor(FIXTURE_A1)]
    };
    await captureWorldCup2026PreMatchSnapshots(input);
    await captureWorldCup2026PreMatchSnapshots(input);
    await captureWorldCup2026PreMatchSnapshots(input);
    expect((await store.list())).toHaveLength(1);
  });
});

describe("scheduled mode does not fall back to memory", () => {
  it("rejects a non-dry-run scheduled capture configured for memory", async () => {
    await expect(
      runScheduledPreMatchSnapshotCapture({
        now: INSIDE_WINDOW,
        env: { PERSISTENCE_PROVIDER: "memory" },
        predictor: predictMatchFromLiveElo,
        fixtureRecords: [recordFor(FIXTURE_A1)]
      })
    ).rejects.toBeInstanceOf(PreMatchSnapshotCaptureConfigError);
  });
});

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const SKIP = !TEST_DATABASE_URL;

function assertTestDatabaseUrl(url: string): void {
  const lower = url.toLowerCase();
  const looksProduction =
    lower.includes("production") ||
    lower.includes("prod") ||
    lower.includes("sslmode=verify-full") ||
    (lower.includes("neon.tech") && !lower.includes("test") && !lower.includes("dev"));
  if (looksProduction) {
    throw new Error("TEST_DATABASE_URL appears to reference a production database. Refusing to run.");
  }
}

describe.skipIf(SKIP)("postgres capture — integration (requires TEST_DATABASE_URL)", () => {
  type PostgresModule = typeof import("postgres");
  let postgresFactory: (url: string, opts?: unknown) => ReturnType<PostgresModule>;
  let sql: ReturnType<PostgresModule>;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) return;
    assertTestDatabaseUrl(TEST_DATABASE_URL);
    const mod = await import("postgres");
    postgresFactory = mod.default as unknown as (url: string, opts?: unknown) => ReturnType<PostgresModule>;
    sql = postgresFactory(TEST_DATABASE_URL, { max: 2, prepare: false });
    await runMigrations(sql as unknown as Parameters<typeof runMigrations>[0]);
  });

  afterAll(async () => {
    if (sql !== undefined) await (sql as unknown as { end(): Promise<void> }).end();
  });

  beforeEach(async () => {
    await (sql as unknown as { unsafe(q: string): Promise<void> }).unsafe(
      "TRUNCATE TABLE prediction_snapshots RESTART IDENTITY CASCADE"
    );
  });

  it("captures and persists a pre-match snapshot through PostgreSQL", async () => {
    const store = createPostgresPredictionSnapshotStore(
      sql as unknown as Parameters<typeof createPostgresPredictionSnapshotStore>[0]
    );
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store, "postgres"),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [recordFor(FIXTURE_A1)]
    });
    expect(report.captured).toBe(1);
    const stored = await store.list();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.status).toBe("pre_match_locked");
    expect(Date.parse(stored[0]!.capturedAt)).toBeLessThan(Date.parse(stored[0]!.kickoffAt!));
  });

  it("repeated runs create no duplicate and two clients observe the same snapshot", async () => {
    const storeA = createPostgresPredictionSnapshotStore(
      sql as unknown as Parameters<typeof createPostgresPredictionSnapshotStore>[0]
    );
    const input = {
      now: INSIDE_WINDOW,
      persistence: makeResolution(storeA, "postgres"),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [recordFor(FIXTURE_A1)]
    };
    await captureWorldCup2026PreMatchSnapshots(input);
    await captureWorldCup2026PreMatchSnapshots(input);

    const storeB = createPostgresPredictionSnapshotStore(
      sql as unknown as Parameters<typeof createPostgresPredictionSnapshotStore>[0]
    );
    const fromA = await storeA.list();
    const fromB = await storeB.list();
    expect(fromA).toHaveLength(1);
    expect(fromB).toHaveLength(1);
    expect(fromB[0]?.snapshotId).toBe(fromA[0]?.snapshotId);
  });

  it("advisory lock prevents concurrent capture", async () => {
    const sqlHolder = postgresFactory(TEST_DATABASE_URL!, { max: 1, prepare: false });
    const sqlContender = postgresFactory(TEST_DATABASE_URL!, { max: 1, prepare: false });
    try {
      const holder = createPostgresAdvisoryCaptureLock(sqlHolder as unknown as Parameters<typeof createPostgresAdvisoryCaptureLock>[0]);
      const contender = createPostgresAdvisoryCaptureLock(sqlContender as unknown as Parameters<typeof createPostgresAdvisoryCaptureLock>[0]);

      expect(await holder.acquire()).toBe(true);
      expect(await contender.acquire()).toBe(false);
      await holder.release();
      expect(await contender.acquire()).toBe(true);
      await contender.release();
    } finally {
      await (sqlHolder as unknown as { end(): Promise<void> }).end();
      await (sqlContender as unknown as { end(): Promise<void> }).end();
    }
  });
});
