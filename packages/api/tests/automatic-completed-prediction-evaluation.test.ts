import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCompletedPredictionEvaluationRuntimeForTests,
  createAsyncInMemoryEvaluationStore,
  createAsyncInMemorySnapshotStore,
  evaluateCompletedWorldCup2026PredictionSnapshots,
  listWorldCup2026PredictionHistory,
  resolvePredictionHistoryPersistence,
  runScheduledCompletedPredictionEvaluation,
  shutdownPredictionHistoryPersistenceForTests,
  SnapshotStorageError,
  type AsyncPredictionEvaluationStore,
  type PredictionHistoryPersistenceResolution,
  type WorldCup2026ExternalFixtureRecord,
  type WorldCup2026PredictionSnapshot
} from "../src/index.js";

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_K4 = "wc2026-group-k-md2-04-dr-congo-vs-colombia";
const FIXTURE_L4 = "wc2026-group-l-md2-04-croatia-vs-panama";

function makeSnapshot(
  overrides: Partial<WorldCup2026PredictionSnapshot> = {}
): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: "snap-auto-00000001",
    fixtureId: FIXTURE_A1,
    status: "pre_match_locked",
    capturedAt: "2026-06-11T10:00:00.000Z",
    cutoffAt: "2026-06-11T10:00:00.000Z",
    kickoffAt: "2026-06-11T18:00:00.000Z",
    group: "A",
    matchday: 1,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    modelVersion: "wc2026-prediction-live-elo-v1",
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: 1640,
      awayElo: 1510,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 0
    },
    prediction: {
      homeExpectedGoals: 1.7,
      awayExpectedGoals: 0.8,
      homeWinProbability: 0.62,
      drawProbability: 0.23,
      awayWinProbability: 0.15,
      mostLikelyScorelines: [
        { homeGoals: 1, awayGoals: 0, probability: 0.19 },
        { homeGoals: 2, awayGoals: 0, probability: 0.19 }
      ]
    },
    confidence: {
      level: "medium",
      coverageType: "partial",
      reasons: ["Test fixture."],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: false,
        homeMatchesPlayed: 12,
        awayMatchesPlayed: 14,
        historicalMatchesAvailable: 280
      },
      manualXgRecommended: false
    },
    provenance: {
      dataCoverage: "partial_curated_dataset"
    },
    contentHash: "hash-auto-snapshot",
    ...overrides
  };
}

function completedResult(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "fd-mexico-south-africa",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "Group Stage",
    group: "A",
    matchday: 1,
    kickoffAt: "2026-06-11T18:00:00.000Z",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    status: "finished",
    homeScore: 2,
    awayScore: 0,
    updatedAt: "2026-06-11T21:30:00.000Z",
    ...overrides
  };
}

function completedResultWithoutScore(): WorldCup2026ExternalFixtureRecord {
  const result = completedResult();
  delete result.homeScore;
  delete result.awayScore;
  return result;
}

function makePersistence(): PredictionHistoryPersistenceResolution {
  const snapshotStore = createAsyncInMemorySnapshotStore();
  const evaluationStore = createAsyncInMemoryEvaluationStore({
    snapshotExists: async (snapshotId) => (await snapshotStore.getById(snapshotId)) !== null
  });
  return {
    provider: "memory",
    snapshotStore,
    evaluationStore,
    historyStore: {} as PredictionHistoryPersistenceResolution["historyStore"],
    projectionCache: {} as PredictionHistoryPersistenceResolution["projectionCache"],
    metadata: { provider: "memory", persistent: false, configuredProvider: "memory" }
  };
}

async function storeSnapshot(
  persistence: PredictionHistoryPersistenceResolution,
  snapshot: WorldCup2026PredictionSnapshot
): Promise<void> {
  await persistence.snapshotStore.create(snapshot, `idempotency-${snapshot.snapshotId}`);
}

beforeEach(async () => {
  __resetCompletedPredictionEvaluationRuntimeForTests();
  await shutdownPredictionHistoryPersistenceForTests();
});

describe("automatic completed prediction evaluation", () => {
  it("creates an evaluation for a pending snapshot with a completed official result", async () => {
    const persistence = makePersistence();
    await storeSnapshot(persistence, makeSnapshot());

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(report.status).toBe("success");
    expect(report.summary).toMatchObject({
      snapshotsScanned: 1,
      eligible: 1,
      evaluated: 1,
      pendingResult: 0
    });
    const evaluations = await persistence.evaluationStore.list();
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.actual).toMatchObject({ homeGoals: 2, awayGoals: 0 });
  });

  it("keeps a snapshot pending when no completed result is available", async () => {
    const persistence = makePersistence();
    await storeSnapshot(persistence, makeSnapshot());

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(report.summary.pendingResult).toBe(1);
    expect(report.results[0]?.action).toBe("pending_result");
    expect(await persistence.evaluationStore.list()).toHaveLength(0);
  });

  it("is idempotent across repeated runs", async () => {
    const persistence = makePersistence();
    await storeSnapshot(persistence, makeSnapshot());

    const first = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });
    const second = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:05:00.000Z"
    });

    expect(first.summary.evaluated).toBe(1);
    expect(second.summary.alreadyEvaluated).toBe(1);
    expect(await persistence.evaluationStore.list()).toHaveLength(1);
  });

  it("maps reversed Colombia 1-0 Congo DR provider orientation into canonical DR Congo 0-1 Colombia", async () => {
    const persistence = makePersistence();
    await storeSnapshot(
      persistence,
      makeSnapshot({
        snapshotId: "snap-colombia-dr-congo",
        fixtureId: FIXTURE_K4,
        group: "K",
        matchday: 2,
        homeTeam: "DR Congo",
        awayTeam: "Colombia",
        contentHash: "hash-colombia-dr-congo"
      })
    );

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [
        completedResult({
          providerFixtureId: "fd-colombia-dr-congo",
          group: "GROUP_K",
          matchday: 2,
          homeTeam: "Colombia",
          awayTeam: "Congo DR",
          homeScore: 1,
          awayScore: 0
        })
      ],
      evaluatedAt: "2026-06-24T05:00:00.000Z"
    });

    expect(report.summary.evaluated).toBe(1);
    const evaluation = (await persistence.evaluationStore.list())[0];
    expect(evaluation?.actual).toMatchObject({
      homeGoals: 0,
      awayGoals: 1,
      outcome: "away_win"
    });
  });

  it("maps reversed Panama 0-1 Croatia provider orientation into canonical Croatia 1-0 Panama", async () => {
    const persistence = makePersistence();
    await storeSnapshot(
      persistence,
      makeSnapshot({
        snapshotId: "snap-panama-croatia",
        fixtureId: FIXTURE_L4,
        group: "L",
        matchday: 2,
        homeTeam: "Croatia",
        awayTeam: "Panama",
        contentHash: "hash-panama-croatia"
      })
    );

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [
        completedResult({
          providerFixtureId: "fd-panama-croatia",
          group: "GROUP_L",
          matchday: 2,
          homeTeam: "Panama",
          awayTeam: "Croatia",
          homeScore: 0,
          awayScore: 1
        })
      ],
      evaluatedAt: "2026-06-24T05:00:00.000Z"
    });

    expect(report.summary.evaluated).toBe(1);
    const evaluation = (await persistence.evaluationStore.list())[0];
    expect(evaluation?.actual).toMatchObject({
      homeGoals: 1,
      awayGoals: 0,
      outcome: "home_win"
    });
  });

  it("rejects snapshots captured after kickoff", async () => {
    const persistence = makePersistence();
    await storeSnapshot(
      persistence,
      makeSnapshot({
        capturedAt: "2026-06-11T18:00:00.000Z"
      })
    );

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(report.summary.ineligibleSnapshot).toBe(1);
    expect(report.results[0]?.issueCode).toBe("snapshot_after_kickoff");
  });

  it("rejects invalid scores and unresolved fixture identities without mutation", async () => {
    const persistence = makePersistence();
    const snapshot = makeSnapshot();
    const results = [completedResultWithoutScore()];
    await storeSnapshot(persistence, snapshot);
    const snapshotBefore = await persistence.snapshotStore.getById(snapshot.snapshotId);
    const resultBefore = JSON.stringify(results);

    const invalidScore = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: results,
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(invalidScore.summary.invalidResult).toBe(1);
    expect(await persistence.snapshotStore.getById(snapshot.snapshotId)).toEqual(snapshotBefore);
    expect(JSON.stringify(results)).toBe(resultBefore);

    const unresolvedPersistence = makePersistence();
    await storeSnapshot(
      unresolvedPersistence,
      makeSnapshot({ snapshotId: "snap-custom", fixtureId: "custom-fixture" })
    );
    const unresolved = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence: unresolvedPersistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });
    expect(unresolved.summary.unresolvedFixture).toBe(1);
  });

  it("dry run performs no writes", async () => {
    const persistence = makePersistence();
    await storeSnapshot(persistence, makeSnapshot());

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult()],
      dryRun: true,
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(report.summary.eligible).toBe(1);
    expect(report.summary.evaluated).toBe(0);
    expect(report.results[0]?.action).toBe("would_evaluate");
    expect(await persistence.evaluationStore.list()).toHaveLength(0);
  });

  it("requires PostgreSQL for non-dry scheduled mode", async () => {
    const persistence = makePersistence();
    await expect(
      runScheduledCompletedPredictionEvaluation({
        persistence,
        completedResults: [completedResult()],
        dryRun: false
      })
    ).rejects.toThrow("requires PERSISTENCE_PROVIDER=postgres");
  });

  it("reports conflicts and sanitized failures without overwriting existing evaluations", async () => {
    const persistence = makePersistence();
    await storeSnapshot(persistence, makeSnapshot());
    await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult({ homeScore: 2, awayScore: 0 })],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    const conflict = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult({ homeScore: 3, awayScore: 0 })],
      evaluatedAt: "2026-06-11T22:05:00.000Z"
    });
    expect(conflict.summary.conflicts).toBe(1);
    expect(await persistence.evaluationStore.list()).toHaveLength(1);

    const failingStore: AsyncPredictionEvaluationStore = {
      ...persistence.evaluationStore,
      async list(input) {
        return persistence.evaluationStore.list(input);
      },
      async create() {
        throw new SnapshotStorageError("query_failed", "sanitized failure");
      }
    };
    const failingPersistence = {
      ...makePersistence(),
      evaluationStore: failingStore
    };
    await storeSnapshot(failingPersistence, makeSnapshot({ snapshotId: "snap-failure" }));
    const failed = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence: failingPersistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(failed.summary.failures).toBe(1);
    expect(JSON.stringify(failed)).not.toContain("postgresql://");
  });

  it("updates aggregate summary and Prediction History evaluated fields", async () => {
    const persistence = await resolvePredictionHistoryPersistence({
      env: { PERSISTENCE_PROVIDER: "memory" }
    });
    await storeSnapshot(persistence, makeSnapshot({ snapshotId: "snap-history-auto" }));

    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      persistence,
      completedResults: [completedResult()],
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });
    const history = await listWorldCup2026PredictionHistory();

    expect(report.modelRealitySummary.evaluationsCount).toBe(1);
    expect(history.status).toBe("success");
    if (history.status !== "success") return;
    expect(history.summary.evaluatedSnapshots).toBe(1);
    expect(history.items[0]?.evaluation?.actualScore).toEqual({ home: 2, away: 0 });
    expect(history.items[0]?.evaluation?.brierScore).toBeGreaterThan(0);
    expect(history.items[0]?.evaluation?.logLoss).toBeGreaterThan(0);
  });
});
