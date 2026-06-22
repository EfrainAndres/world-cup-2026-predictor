import { describe, expect, it, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { runMigrations } from "../src/migration-runner.js";
import { createPostgresPredictionSnapshotStore } from "../src/postgres-snapshot-store.js";
import { createPostgresPredictionEvaluationStore } from "../src/postgres-evaluation-store.js";
import { createPostgresGroupProjectionCacheStore } from "../src/postgres-projection-cache.js";
import type { WorldCup2026PredictionSnapshot } from "../src/schemas.js";
import type { WorldCup2026PredictionEvaluation } from "../src/schemas.js";
import { WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "../src/snapshot-service.js";
import { WORLD_CUP_2026_EVALUATION_METRIC_VERSION } from "../src/prediction-evaluation-service.js";

// ---------------------------------------------------------------------------
// Opt-in gate
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

if (TEST_DATABASE_URL === undefined || TEST_DATABASE_URL === "") {
  describe("postgres process boundary (skipped)", () => {
    it.skip("set TEST_DATABASE_URL to run PostgreSQL process-boundary tests", () => {
      // intentionally empty
    });
  });
} else {
  // Two independent SQL clients — no shared state.
  const writerSql = postgres(TEST_DATABASE_URL, { max: 2 });
  const readerSql = postgres(TEST_DATABASE_URL, { max: 2 });

  beforeAll(async () => {
    await runMigrations(writerSql);
    await writerSql`TRUNCATE TABLE prediction_evaluations RESTART IDENTITY CASCADE`;
    await writerSql`TRUNCATE TABLE prediction_snapshots RESTART IDENTITY CASCADE`;
    await writerSql`TRUNCATE TABLE projection_cache RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await writerSql.end();
    await readerSql.end();
  });

  const FIXTURE_ID = "wc2026-group-a-md1-01-boundary-test";
  const SNAP_ID = "snap-boundary-aaaaaaaaaaaaaaa1";
  const IDEM_SNAP = "idem-boundary-snap-aaaaaaaaaaaaaaa1";
  const IDEM_EVAL = "idem-boundary-eval-aaaaaaaaaaaaaaa1";

  function makeSnapshot(): WorldCup2026PredictionSnapshot {
    return {
      snapshotId: SNAP_ID,
      fixtureId: FIXTURE_ID,
      status: "pre_match_locked",
      capturedAt: "2026-06-22T09:00:00.000Z",
      cutoffAt: "2026-06-22T09:00:00.000Z",
      kickoffAt: "2026-06-22T18:00:00.000Z",
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
      contentHash: "hash-boundary-process-test-001"
    };
  }

  function makeEvaluation(): WorldCup2026PredictionEvaluation {
    return {
      evaluationId: "eval-boundary-aaaaaaaaaaaaaaa1",
      snapshotId: SNAP_ID,
      fixtureId: FIXTURE_ID,
      evaluatedAt: "2026-06-22T21:00:00.000Z",
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
      actual: { homeGoals: 2, awayGoals: 1, outcome: "home_win" },
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
      confidence: { level: "medium", coverageType: "partial", fallbackUsed: false },
      provenance: { snapshotContentHash: "hash-boundary-process-test-001" }
    };
  }

  describe("process-boundary persistence — snapshot store", () => {
    it("snapshot written by writerSql is readable by independent readerSql", async () => {
      const writer = createPostgresPredictionSnapshotStore(writerSql);
      const reader = createPostgresPredictionSnapshotStore(readerSql);

      const writeResult = await writer.create(makeSnapshot(), IDEM_SNAP);
      expect(writeResult.result).toBe("created");

      const fetched = await reader.getById(SNAP_ID);
      expect(fetched).not.toBeNull();
      expect(fetched?.snapshotId).toBe(SNAP_ID);
      expect(fetched?.fixtureId).toBe(FIXTURE_ID);
      expect(fetched?.homeTeam).toBe("Mexico");
      expect(fetched?.prediction.homeWinProbability).toBeCloseTo(0.48);
      expect(fetched?.confidence.level).toBe("medium");
    });

    it("snapshot appears in list across SQL clients", async () => {
      const reader = createPostgresPredictionSnapshotStore(readerSql);
      const results = await reader.list({ fixtureId: FIXTURE_ID });
      expect(results).toHaveLength(1);
      expect(results[0]?.snapshotId).toBe(SNAP_ID);
    });

    it("idempotency key is visible from reader client", async () => {
      const reader = createPostgresPredictionSnapshotStore(readerSql);
      const fetched = await reader.getByIdempotencyKey(IDEM_SNAP);
      expect(fetched).not.toBeNull();
      expect(fetched?.snapshotId).toBe(SNAP_ID);
    });
  });

  describe("process-boundary persistence — evaluation store", () => {
    it("evaluation written by writerSql is readable by independent readerSql", async () => {
      const writer = createPostgresPredictionEvaluationStore(writerSql);
      const reader = createPostgresPredictionEvaluationStore(readerSql);

      const writeResult = await writer.create(makeEvaluation(), IDEM_EVAL);
      expect(writeResult.result).toBe("created");

      const fetched = await reader.getById("eval-boundary-aaaaaaaaaaaaaaa1");
      expect(fetched).not.toBeNull();
      expect(fetched?.fixtureId).toBe(FIXTURE_ID);
      expect(fetched?.actual.homeGoals).toBe(2);
      expect(fetched?.metrics.outcomeCorrect).toBe(true);
    });

    it("evaluation appears in list filtered by snapshotId across SQL clients", async () => {
      const reader = createPostgresPredictionEvaluationStore(readerSql);
      const results = await reader.list({ snapshotId: SNAP_ID });
      expect(results).toHaveLength(1);
      expect(results[0]?.evaluationId).toBe("eval-boundary-aaaaaaaaaaaaaaa1");
    });
  });

  describe("process-boundary persistence — projection cache", () => {
    const GROUP = "A";
    const TIMEZONE = "America/New_York";
    const GENERATED_AT = "2026-06-22T10:00:00.000Z";
    const EXPIRES_AT = "2026-06-22T11:00:00.000Z";
    const NOW = "2026-06-22T10:30:00.000Z";

    it("cache entry written by writerSql is readable by independent readerSql", async () => {
      const writer = createPostgresGroupProjectionCacheStore(writerSql);
      const reader = createPostgresGroupProjectionCacheStore(readerSql);

      await writer.set({
        group: GROUP,
        timezone: TIMEZONE,
        projection: {
          available: true,
          status: "complete",
          standings: [],
          fixtures: [],
          warnings: []
        },
        inputFingerprint: "boundary-test-fingerprint",
        modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
        formulaVersion: "v2",
        generatedAt: GENERATED_AT,
        expiresAt: EXPIRES_AT
      });

      const fetched = await reader.get({ group: GROUP, timezone: TIMEZONE, now: NOW });
      expect(fetched).not.toBeNull();
      expect(fetched?.status).toBe("complete");
      expect(fetched?.available).toBe(true);
    });
  });
}
