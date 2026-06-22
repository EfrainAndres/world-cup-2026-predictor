import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import postgres from "postgres";
import { runMigrations } from "../src/migration-runner.js";
import { createPostgresPredictionSnapshotStore } from "../src/postgres-snapshot-store.js";
import { createPostgresPredictionEvaluationStore } from "../src/postgres-evaluation-store.js";
import { SnapshotStorageError } from "../src/async-snapshot-store.js";
import { EVALUATION_SCHEMA_VERSION } from "../src/async-evaluation-store.js";
import type { AsyncPredictionEvaluationStore } from "../src/async-evaluation-store.js";
import type { WorldCup2026PredictionEvaluation } from "../src/schemas.js";
import { WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "../src/snapshot-service.js";
import { WORLD_CUP_2026_EVALUATION_METRIC_VERSION } from "../src/prediction-evaluation-service.js";
import { runEvaluationStoreContractTests } from "./prediction-evaluation-store.test.js";
import type { WorldCup2026PredictionSnapshot } from "../src/schemas.js";

// ---------------------------------------------------------------------------
// Opt-in gate
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

if (TEST_DATABASE_URL === undefined || TEST_DATABASE_URL === "") {
  describe("postgres prediction evaluation store (skipped)", () => {
    it.skip("set TEST_DATABASE_URL to run PostgreSQL integration tests", () => {
      // intentionally empty
    });
  });
} else {
  // Never fall back to DATABASE_URL — opt-in must be explicit.
  const sql = postgres(TEST_DATABASE_URL, { max: 5 });

  beforeAll(async () => {
    await runMigrations(sql);
  });

  beforeEach(async () => {
    // Evaluations depend on snapshots via FK; truncate evaluations first.
    await sql`TRUNCATE TABLE prediction_evaluations RESTART IDENTITY CASCADE`;
    await sql`TRUNCATE TABLE prediction_snapshots RESTART IDENTITY CASCADE`;
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
  const SNAP_ID_A1 = "snap-pg-aaaaaaaaaaaaaaa1";
  const SNAP_ID_A1_MISSING = "snap-pg-does-not-exist-0000";

  function makeTestSnapshot(snapId = SNAP_ID_A1): WorldCup2026PredictionSnapshot {
    return {
      snapshotId: snapId,
      fixtureId: FIXTURE_A1,
      status: "pre_match_locked",
      capturedAt: "2026-06-22T09:00:00.000Z",
      cutoffAt: "2026-06-22T09:00:00.000Z",
      group: "A",
      matchday: 1,
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
      modelConfiguration: {
        predictionMode: "live_elo",
        eloPreset: "balanced",
        maxGoals: 7,
        tournamentResultsAdjustmentEnabled: false
      },
      inputs: {
        homeElo: 1650,
        awayElo: 1520,
        homeUsesFallback: false,
        awayUsesFallback: false,
        tournamentMatchesIncluded: 0
      },
      prediction: {
        homeExpectedGoals: 1.5,
        awayExpectedGoals: 1.1,
        homeWinProbability: 0.48,
        drawProbability: 0.26,
        awayWinProbability: 0.26,
        mostLikelyScorelines: [
          { homeGoals: 1, awayGoals: 0, probability: 0.15 },
          { homeGoals: 1, awayGoals: 1, probability: 0.12 }
        ]
      },
      confidence: {
        level: "medium",
        coverageType: "partial",
        reasons: [],
        dataPoints: {
          homeUsesFallback: false,
          awayUsesFallback: false,
          homeMatchesPlayed: 5,
          awayMatchesPlayed: 5,
          historicalMatchesAvailable: 3
        },
        manualXgRecommended: false
      },
      provenance: { dataCoverage: "partial" },
      contentHash: `hash-${snapId}`
    };
  }

  async function insertSnapshot(snapId = SNAP_ID_A1): Promise<void> {
    const snapStore = createPostgresPredictionSnapshotStore(sql);
    const snap = makeTestSnapshot(snapId);
    await snapStore.create(snap, `idem-snap-${snapId}`);
  }

  function makeEvaluation(
    overrides: Partial<WorldCup2026PredictionEvaluation> = {}
  ): WorldCup2026PredictionEvaluation {
    return {
      evaluationId: "eval-pg-abcdef1234567890",
      snapshotId: SNAP_ID_A1,
      fixtureId: FIXTURE_A1,
      evaluatedAt: "2026-06-22T10:00:00.000Z",
      modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
      metricVersion: WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
      predicted: {
        homeExpectedGoals: 1.5,
        awayExpectedGoals: 1.1,
        homeWinProbability: 0.48,
        drawProbability: 0.26,
        awayWinProbability: 0.26,
        mostLikelyScorelines: [
          { homeGoals: 1, awayGoals: 0, probability: 0.15 },
          { homeGoals: 1, awayGoals: 1, probability: 0.12 }
        ],
        predictedOutcome: "home_win",
        predictedScoreline: { homeGoals: 1, awayGoals: 0 }
      },
      actual: {
        homeGoals: 2,
        awayGoals: 1,
        outcome: "home_win"
      },
      metrics: {
        outcomeCorrect: true,
        drawCorrect: false,
        exactScoreCorrect: false,
        homeGoalAbsoluteError: 1,
        awayGoalAbsoluteError: 1,
        totalGoalAbsoluteError: 0,
        goalDifferenceAbsoluteError: 0,
        brierScore: 0.18,
        logLoss: 0.73,
        predictedOutcomeProbability: 0.48,
        actualOutcomeProbability: 0.48
      },
      confidence: {
        level: "medium",
        coverageType: "partial",
        fallbackUsed: false
      },
      provenance: {
        snapshotContentHash: "abc123contenthash"
      },
      ...overrides
    };
  }

  // -------------------------------------------------------------------------
  // Shared contract suite against PostgreSQL adapter
  // -------------------------------------------------------------------------

  const knownSnapshots = new Set<string>();

  runEvaluationStoreContractTests("postgres prediction evaluation adapter", async () => {
    const store = createPostgresPredictionEvaluationStore(sql) as AsyncPredictionEvaluationStore & {
      reset?(): void;
      registerSnapshotId?: (id: string) => void;
    };

    // The contract tests call reset() before each test.
    (store as unknown as Record<string, unknown>)["reset"] = async () => {
      await sql`TRUNCATE TABLE prediction_evaluations RESTART IDENTITY CASCADE`;
      await sql`TRUNCATE TABLE prediction_snapshots RESTART IDENTITY CASCADE`;
      knownSnapshots.clear();
    };

    (store as unknown as Record<string, unknown>)["registerSnapshotId"] = async (id: string) => {
      if (!knownSnapshots.has(id)) {
        knownSnapshots.add(id);
        await insertSnapshot(id);
      }
    };

    return store;
  });

  // -------------------------------------------------------------------------
  // Migration validation tests
  // -------------------------------------------------------------------------

  describe("migration 0002 — table structure", () => {
    it("prediction_evaluations table exists", async () => {
      const rows = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name   = 'prediction_evaluations'
        ) AS exists
      `;
      expect(rows[0]?.exists).toBe(true);
    });

    it("primary key on evaluation_id exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'prediction_evaluations'
          AND constraint_type = 'PRIMARY KEY'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("unique constraint on (snapshot_id, result_identity, metric_version) exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'prediction_evaluations'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'prediction_evaluations_identity_unique'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("foreign key to prediction_snapshots exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'prediction_evaluations'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name = 'prediction_evaluations_snapshot_fkey'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("snapshot_id index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'prediction_evaluations'
          AND indexname = 'prediction_evaluations_snapshot_id_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("fixture_id index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'prediction_evaluations'
          AND indexname = 'prediction_evaluations_fixture_id_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("evaluated_at index exists", async () => {
      const rows = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'prediction_evaluations'
          AND indexname = 'prediction_evaluations_evaluated_at_idx'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });

    it("actual_outcome check constraint exists", async () => {
      const rows = await sql<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'prediction_evaluations'
          AND constraint_type = 'CHECK'
          AND constraint_name = 'prediction_evaluations_actual_outcome_check'
      `;
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // FK enforcement
  // -------------------------------------------------------------------------

  describe("FK enforcement", () => {
    it("throws foreign_key_violation when snapshot does not exist", async () => {
      const store = createPostgresPredictionEvaluationStore(sql);
      const ev = makeEvaluation({ snapshotId: SNAP_ID_A1_MISSING });
      await expect(store.create(ev, "idem-fk-missing-0001")).rejects.toMatchObject({
        code: "foreign_key_violation"
      });
    });

    it("successfully inserts when snapshot exists", async () => {
      await insertSnapshot();
      const store = createPostgresPredictionEvaluationStore(sql);
      const result = await store.create(makeEvaluation(), "idem-fk-present-0001");
      expect(result.result).toBe("created");
    });
  });

  // -------------------------------------------------------------------------
  // Error sanitization
  // -------------------------------------------------------------------------

  describe("error sanitization", () => {
    it("query_failed error does not leak connection string", async () => {
      // Terminate connection pool to induce a query failure.
      const badSql = postgres("postgresql://invalid:invalid@localhost:9999/nonexistent", {
        max: 1,
        connect_timeout: 1
      });
      const store = createPostgresPredictionEvaluationStore(badSql);
      let caughtError: unknown;
      try {
        await store.list();
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

  // -------------------------------------------------------------------------
  // EVALUATION_SCHEMA_VERSION matches stored rows
  // -------------------------------------------------------------------------

  describe("schema version persistence", () => {
    it("evaluation_schema_version column stores EVALUATION_SCHEMA_VERSION", async () => {
      await insertSnapshot();
      const store = createPostgresPredictionEvaluationStore(sql);
      const ev = makeEvaluation();
      await store.create(ev, "idem-sv-check-0001");
      const rows = await sql<{ evaluation_schema_version: string }[]>`
        SELECT evaluation_schema_version FROM prediction_evaluations
        WHERE evaluation_id = ${ev.evaluationId}
        LIMIT 1
      `;
      expect(rows[0]?.evaluation_schema_version).toBe(EVALUATION_SCHEMA_VERSION);
    });
  });
}
