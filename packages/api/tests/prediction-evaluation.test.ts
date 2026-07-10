import { beforeEach, describe, expect, it } from "vitest";
import {
  WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
  buildWorldCup2026PredictionCalibrationBuckets,
  buildWorldCup2026PredictionEvaluationId,
  calculateOutcomeLogLoss,
  calculateThreeWayBrierScore,
  createInMemoryPredictionEvaluationStore,
  createWorldCup2026PredictionEvaluation,
  defaultPredictionEvaluationStore,
  defaultSnapshotStore,
  deriveActualOutcome,
  derivePredictionOutcome,
  evaluateWorldCup2026PredictionSnapshot,
  getWorldCup2026GroupStandingsFoundation,
  getWorldCup2026ModelRealitySummary,
  getWorldCup2026PredictionEvaluation,
  listWorldCup2026PredictionEvaluations,
  predictMatchFromLiveElo,
  selectTopPredictedScoreline,
  summarizeWorldCup2026ModelReality,
  type WorldCup2026ExternalFixtureRecord,
  type WorldCup2026PredictionEvaluation,
  type WorldCup2026PredictionSnapshot
} from "../src/index.js";
import { resolveWorldCup2026EvidenceFixture } from "../src/world-cup-2026-evidence-fixtures.js";

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_B1 = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";
const FIXTURE_C2 = "wc2026-group-c-md1-02-haiti-vs-scotland";

function makeSnapshot(
  overrides: Partial<WorldCup2026PredictionSnapshot> = {}
): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: "snap-eval0000000001",
    fixtureId: FIXTURE_A1,
    status: "pre_match_locked",
    capturedAt: "2026-06-11T10:00:00.000Z",
    cutoffAt: "2026-06-11T10:00:00.000Z",
    kickoffAt: "2026-06-11T18:00:00Z",
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
        { homeGoals: 2, awayGoals: 0, probability: 0.19 },
        { homeGoals: 2, awayGoals: 1, probability: 0.11 }
      ]
    },
    confidence: {
      level: "medium",
      coverageType: "partial",
      reasons: ["The international dataset is partial and curated."],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: false,
        homeMatchesPlayed: 12,
        awayMatchesPlayed: 14,
        historicalMatchesAvailable: 280,
        latestMatchDate: "2026-06-10",
        currentTournamentMatchesIncluded: 0,
        attackDefenseAvailable: false
      },
      manualXgRecommended: false
    },
    provenance: {
      dataCoverage: "partial_curated_dataset"
    },
    contentHash: "hash-snap-a1",
    ...overrides
  };
}

function makeCompletedResult(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: FIXTURE_A1,
    competition: "FIFA World Cup",
    season: "2026",
    stage: "Group Stage",
    group: "A",
    matchday: 1,
    kickoffAt: "2026-06-11T19:00:00Z",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    status: "finished",
    homeScore: 2,
    awayScore: 0,
    updatedAt: "2026-06-11T21:30:00Z",
    ...overrides
  };
}

function makeCompletedKnockoutResult(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "fd-qf-france-morocco",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "QUARTER_FINALS",
    matchday: 97,
    kickoffAt: "2026-07-04T20:00:00.000Z",
    homeTeam: "France",
    awayTeam: "Morocco",
    status: "finished",
    homeScore: 1,
    awayScore: 0,
    updatedAt: "2026-07-04T22:30:00.000Z",
    ...overrides
  };
}

function makeKnockoutSnapshot(overrides: Partial<WorldCup2026PredictionSnapshot> = {}): WorldCup2026PredictionSnapshot {
  const snapshot = makeSnapshot(overrides);
  delete snapshot.group;
  return snapshot;
}

describe("prediction evaluation helpers", () => {
  it("derives actual outcomes for home win, draw, and away win", () => {
    expect(deriveActualOutcome(2, 0)).toBe("home_win");
    expect(deriveActualOutcome(1, 1)).toBe("draw");
    expect(deriveActualOutcome(0, 2)).toBe("away_win");
  });

  it("uses deterministic predicted-outcome tie-break ordering", () => {
    expect(
      derivePredictionOutcome({
        homeWinProbability: 0.4,
        drawProbability: 0.4,
        awayWinProbability: 0.2
      })
    ).toBe("home_win");

    expect(
      derivePredictionOutcome({
        homeWinProbability: 0.2,
        drawProbability: 0.4,
        awayWinProbability: 0.4
      })
    ).toBe("draw");
  });

  it("uses deterministic top-scoreline tie-break ordering", () => {
    const scoreline = selectTopPredictedScoreline([
      { homeGoals: 2, awayGoals: 0, probability: 0.2 },
      { homeGoals: 1, awayGoals: 1, probability: 0.2 },
      { homeGoals: 1, awayGoals: 0, probability: 0.2 }
    ]);

    expect(scoreline).toEqual({
      homeGoals: 1,
      awayGoals: 0,
      probability: 0.2
    });
  });

  it("calculates three-way Brier Score without divide-by-three normalization", () => {
    expect(
      calculateThreeWayBrierScore(
        {
          homeWinProbability: 0.7,
          drawProbability: 0.2,
          awayWinProbability: 0.1
        },
        "home_win"
      )
    ).toBeCloseTo(0.14);
  });

  it("calculates Log Loss with epsilon protection", () => {
    expect(calculateOutcomeLogLoss(0)).toBeGreaterThan(0);
    expect(calculateOutcomeLogLoss(1)).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(calculateOutcomeLogLoss(0))).toBe(true);
  });

  it("builds stable evaluation ids from identity hashes", () => {
    const id = buildWorldCup2026PredictionEvaluationId("abcdef1234567890fedcba");
    expect(id).toBe("eval-abcdef1234567890");
  });
});

describe("prediction evaluation service", () => {
  beforeEach(() => {
    defaultSnapshotStore.reset();
    defaultPredictionEvaluationStore.reset();
  });

  it("evaluates a valid snapshot against a completed result", () => {
    const store = createInMemoryPredictionEvaluationStore();
    const result = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot(),
      completedResults: [makeCompletedResult()],
      evaluationStore: store,
      resultSource: "local_static",
      localFallbackUsed: true,
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(result.status).toBe("evaluated");
    expect(result.issues).toEqual([]);
    expect(result.evaluation?.metricVersion).toBe(
      WORLD_CUP_2026_EVALUATION_METRIC_VERSION
    );
    expect(result.evaluation?.predicted.predictedOutcome).toBe("home_win");
    expect(result.evaluation?.actual.outcome).toBe("home_win");
    expect(result.evaluation?.metrics.outcomeCorrect).toBe(true);
    expect(result.evaluation?.metrics.exactScoreCorrect).toBe(false);
    expect(result.evaluation?.metrics.homeGoalAbsoluteError).toBe(1);
    expect(result.evaluation?.metrics.awayGoalAbsoluteError).toBe(0);
    expect(result.evaluation?.metrics.totalGoalAbsoluteError).toBe(1);
    expect(result.evaluation?.metrics.goalDifferenceAbsoluteError).toBe(1);
    expect(result.evaluation?.provenance.snapshotContentHash).toBe("hash-snap-a1");
    expect(result.evaluation?.provenance.resultSource).toBe("local_static");
  });

  it("supports exact-score hits", () => {
    const store = createInMemoryPredictionEvaluationStore();
    const result = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot({
        prediction: {
          ...makeSnapshot().prediction,
          mostLikelyScorelines: [
            { homeGoals: 2, awayGoals: 0, probability: 0.25 },
            { homeGoals: 1, awayGoals: 0, probability: 0.2 }
          ]
        }
      }),
      completedResults: [makeCompletedResult()],
      evaluationStore: store
    });

    expect(result.status).toBe("evaluated");
    expect(result.evaluation?.metrics.exactScoreCorrect).toBe(true);
    expect(result.evaluation?.metrics.homeGoalAbsoluteError).toBe(0);
    expect(result.evaluation?.metrics.awayGoalAbsoluteError).toBe(0);
  });

  it("correctly marks predicted draw and actual draw", () => {
    const store = createInMemoryPredictionEvaluationStore();
    const snapshot = makeSnapshot({
      snapshotId: "snap-draw-1",
      fixtureId: FIXTURE_B1,
      homeTeam: "Canada",
      awayTeam: "Bosnia-Herzegovina",
      group: "B",
      prediction: {
        homeExpectedGoals: 1.2,
        awayExpectedGoals: 1.1,
        homeWinProbability: 0.3,
        drawProbability: 0.4,
        awayWinProbability: 0.3,
        mostLikelyScorelines: [
          { homeGoals: 1, awayGoals: 1, probability: 0.21 }
        ]
      }
    });
    const result = evaluateWorldCup2026PredictionSnapshot({
      snapshot,
      completedResults: [
        makeCompletedResult({
          providerFixtureId: FIXTURE_B1,
          group: "B",
          homeTeam: "Canada",
          awayTeam: "Bosnia-Herzegovina",
          homeScore: 1,
          awayScore: 1
        })
      ],
      evaluationStore: store
    });

    expect(result.status).toBe("evaluated");
    expect(result.evaluation?.predicted.predictedOutcome).toBe("draw");
    expect(result.evaluation?.actual.outcome).toBe("draw");
    expect(result.evaluation?.metrics.outcomeCorrect).toBe(true);
    expect(result.evaluation?.metrics.drawCorrect).toBe(true);
  });

  it("rejects live and scheduled results", () => {
    const store = createInMemoryPredictionEvaluationStore();

    for (const status of ["live", "scheduled"] as const) {
      const result = evaluateWorldCup2026PredictionSnapshot({
        snapshot: makeSnapshot(),
        completedResults: [makeCompletedResult({ status })],
        evaluationStore: store
      });

      expect(result.status).toBe("not_eligible");
      expect(result.issues[0]?.code).toBe("live_or_scheduled_status");
    }
  });

  it("maps reversed provider team order and rejects fixture mismatches", () => {
    const store = createInMemoryPredictionEvaluationStore();
    const reversed = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot(),
      completedResults: [
        makeCompletedResult({
          homeTeam: "South Africa",
          awayTeam: "Mexico"
        })
      ],
      evaluationStore: store
    });
    const mismatched = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot(),
      completedResults: [
        makeCompletedResult({
          providerFixtureId: FIXTURE_A1,
          homeTeam: "Mexico",
          awayTeam: "Czechia"
        })
      ],
      evaluationStore: store
    });

    expect(reversed.status).toBe("evaluated");
    expect(reversed.evaluation?.actual).toMatchObject({
      homeGoals: 0,
      awayGoals: 2,
      outcome: "away_win"
    });
    expect(mismatched.status).toBe("not_eligible");
    expect(mismatched.issues[0]?.code).toBe("fixture_mismatch");
  });

  it("rejects invalid scores, duplicate completed results, and invalid probability snapshots", () => {
    const store = createInMemoryPredictionEvaluationStore();

    const invalidScore = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot(),
      completedResults: [makeCompletedResult({ homeScore: -1 })],
      evaluationStore: store
    });

    const duplicateResult = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot(),
      completedResults: [makeCompletedResult(), makeCompletedResult()],
      evaluationStore: store
    });

    const invalidProbabilities = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot({
        prediction: {
          ...makeSnapshot().prediction,
          homeWinProbability: 0.9,
          drawProbability: 0.2,
          awayWinProbability: 0.2
        }
      }),
      completedResults: [makeCompletedResult()],
      evaluationStore: store
    });

    expect(invalidScore.status).toBe("not_eligible");
    expect(invalidScore.issues[0]?.code).toBe("incomplete_score");
    expect(duplicateResult.status).toBe("not_eligible");
    expect(duplicateResult.issues[0]?.code).toBe("duplicate_completed_result");
    expect(invalidProbabilities.status).toBe("not_eligible");
    expect(invalidProbabilities.issues[0]?.code).toBe(
      "invalid_snapshot_probabilities"
    );
  });

  it("rejects unsupported snapshot states and invalid fixture identities", () => {
    const store = createInMemoryPredictionEvaluationStore();
    const unsupported = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot({
        status: "archived" as WorldCup2026PredictionSnapshot["status"]
      }),
      completedResults: [makeCompletedResult()],
      evaluationStore: store
    });
    const invalidFixture = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeSnapshot({
        fixtureId: "custom-matchup-fixture",
        homeTeam: "Mexico",
        awayTeam: "South Africa"
      }),
      completedResults: [makeCompletedResult()],
      evaluationStore: store
    });

    expect(unsupported.status).toBe("not_eligible");
    expect(unsupported.issues[0]?.code).toBe("unsupported_snapshot_state");
    expect(invalidFixture.status).toBe("not_eligible");
    expect(invalidFixture.issues[0]?.code).toBe("invalid_fixture_identity");
  });

  it("evaluates a provider-backed knockout snapshot against a completed official result", () => {
    const resolved = resolveWorldCup2026EvidenceFixture(makeCompletedKnockoutResult());
    expect("issueCode" in resolved).toBe(false);
    if ("issueCode" in resolved) return;

    const store = createInMemoryPredictionEvaluationStore();
    const result = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeKnockoutSnapshot({
        snapshotId: "snap-knockout-qf-france-morocco",
        fixtureId: resolved.fixture.id,
        capturedAt: "2026-07-04T12:00:00.000Z",
        cutoffAt: "2026-07-04T20:00:00.000Z",
        kickoffAt: "2026-07-04T20:00:00.000Z",
        matchday: 97,
        homeTeam: "France",
        awayTeam: "Morocco",
        contentHash: "hash-knockout-qf-france-morocco"
      }),
      completedResults: [makeCompletedKnockoutResult()],
      evaluationStore: store,
      resultSource: "football_data_org_results_provider",
      evaluatedAt: "2026-07-04T23:00:00.000Z"
    });

    expect(result.status).toBe("evaluated");
    expect(result.issues).toEqual([]);
    expect(result.evaluation?.fixtureId).toBe(resolved.fixture.id);
    expect(result.evaluation?.actual).toMatchObject({
      homeGoals: 1,
      awayGoals: 0,
      outcome: "home_win"
    });
  });

  it("rejects knockout snapshots captured at or after kickoff", () => {
    const resolved = resolveWorldCup2026EvidenceFixture(makeCompletedKnockoutResult());
    expect("issueCode" in resolved).toBe(false);
    if ("issueCode" in resolved) return;

    const store = createInMemoryPredictionEvaluationStore();
    const result = evaluateWorldCup2026PredictionSnapshot({
      snapshot: makeKnockoutSnapshot({
        snapshotId: "snap-knockout-post-kickoff",
        fixtureId: resolved.fixture.id,
        capturedAt: "2026-07-04T20:00:00.000Z",
        cutoffAt: "2026-07-04T20:00:00.000Z",
        kickoffAt: "2026-07-04T20:00:00.000Z",
        matchday: 97,
        homeTeam: "France",
        awayTeam: "Morocco",
        contentHash: "hash-knockout-post-kickoff"
      }),
      completedResults: [makeCompletedKnockoutResult()],
      evaluationStore: store
    });

    expect(result.status).toBe("not_eligible");
    expect(result.issues[0]?.code).toBe("snapshot_after_kickoff");
  });

  it("creates idempotent immutable evaluations without mutating the original snapshot", () => {
    const store = createInMemoryPredictionEvaluationStore();
    const snapshot = makeSnapshot();
    const original = structuredClone(snapshot);

    const first = evaluateWorldCup2026PredictionSnapshot({
      snapshot,
      completedResults: [makeCompletedResult()],
      evaluationStore: store,
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });
    const second = evaluateWorldCup2026PredictionSnapshot({
      snapshot,
      completedResults: [makeCompletedResult()],
      evaluationStore: store,
      evaluatedAt: "2026-06-11T22:00:00.000Z"
    });

    expect(first.status).toBe("evaluated");
    expect(second.status).toBe("duplicate");
    expect(second.evaluation?.evaluationId).toBe(first.evaluation?.evaluationId);
    expect(snapshot).toEqual(original);

    const stored = store.getById(first.evaluation!.evaluationId)!;
    expect(() => {
      (stored.metrics as { brierScore: number }).brierScore = 99;
    }).toThrow();
  });
});

describe("model-vs-reality summaries and calibration", () => {
  function makeEvaluation(
    overrides: Partial<WorldCup2026PredictionEvaluation> = {}
  ): WorldCup2026PredictionEvaluation {
    return {
      evaluationId: "eval-0000000000000001",
      snapshotId: "snap-0000000000000001",
      fixtureId: FIXTURE_A1,
      providerFixtureId: FIXTURE_A1,
      evaluatedAt: "2026-06-11T22:00:00.000Z",
      modelVersion: "wc2026-prediction-live-elo-v1",
      metricVersion: WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
      predicted: {
        homeExpectedGoals: 1.6,
        awayExpectedGoals: 1,
        homeWinProbability: 0.6,
        drawProbability: 0.25,
        awayWinProbability: 0.15,
        mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.18 }],
        predictedOutcome: "home_win",
        predictedScoreline: { homeGoals: 1, awayGoals: 0 }
      },
      actual: {
        homeGoals: 2,
        awayGoals: 0,
        outcome: "home_win"
      },
      metrics: {
        outcomeCorrect: true,
        drawCorrect: false,
        exactScoreCorrect: false,
        homeGoalAbsoluteError: 1,
        awayGoalAbsoluteError: 0,
        totalGoalAbsoluteError: 1,
        goalDifferenceAbsoluteError: 1,
        brierScore: 0.245,
        logLoss: 0.51,
        predictedOutcomeProbability: 0.6,
        actualOutcomeProbability: 0.6
      },
      confidence: {
        level: "medium",
        coverageType: "partial",
        fallbackUsed: false
      },
      provenance: {
        snapshotContentHash: "hash-1",
        resultSource: "local_static"
      },
      ...overrides
    };
  }

  it("returns null averages for empty summaries and no NaN values", () => {
    const summary = summarizeWorldCup2026ModelReality([]);

    expect(summary.evaluationsCount).toBe(0);
    expect(summary.meanBrierScore).toBeNull();
    expect(summary.meanLogLoss).toBeNull();
    expect(summary.calibrationBuckets).toHaveLength(5);
    expect(
      Object.values(summary.withFallback).every((value) =>
        value === 0 || value === null
      )
    ).toBe(true);
  });

  it("aggregates summary metrics, confidence breakdowns, coverage breakdowns, and fallback splits", () => {
    const evaluations = [
      makeEvaluation(),
      makeEvaluation({
        evaluationId: "eval-2",
        snapshotId: "snap-2",
        fixtureId: FIXTURE_B1,
        metrics: {
          ...makeEvaluation().metrics,
          outcomeCorrect: false,
          drawCorrect: true,
          exactScoreCorrect: true,
          brierScore: 0.6,
          logLoss: 1.4,
          predictedOutcomeProbability: 0.4,
          actualOutcomeProbability: 0.3
        },
        confidence: {
          level: "low",
          coverageType: "fallback",
          fallbackUsed: true
        }
      })
    ];

    const summary = summarizeWorldCup2026ModelReality(evaluations);

    expect(summary.evaluationsCount).toBe(2);
    expect(summary.outcomeAccuracy).toBe(0.5);
    expect(summary.meanBrierScore).toBeCloseTo((0.245 + 0.6) / 2);
    expect(summary.byConfidenceLevel).toHaveLength(4);
    expect(
      summary.byConfidenceLevel.find((entry) => entry.confidenceLevel === "medium")
        ?.evaluationsCount
    ).toBe(1);
    expect(
      summary.byCoverageType.find((entry) => entry.coverageType === "fallback")
        ?.evaluationsCount
    ).toBe(1);
    expect(summary.withFallback.evaluationsCount).toBe(1);
    expect(summary.withoutFallback.evaluationsCount).toBe(1);
  });

  it("builds fixed calibration buckets over predicted-outcome confidence", () => {
    const buckets = buildWorldCup2026PredictionCalibrationBuckets([
      makeEvaluation({
        metrics: {
          ...makeEvaluation().metrics,
          predictedOutcomeProbability: 0.18,
          outcomeCorrect: false
        }
      }),
      makeEvaluation({
        evaluationId: "eval-2",
        snapshotId: "snap-2",
        metrics: {
          ...makeEvaluation().metrics,
          predictedOutcomeProbability: 0.82,
          outcomeCorrect: true
        }
      })
    ]);

    expect(buckets).toHaveLength(5);
    expect(buckets[0]).toMatchObject({
      bucketStart: 0,
      bucketEnd: 0.2,
      predictionsCount: 1,
      meanPredictedProbability: 0.18,
      observedFrequency: 0
    });
    expect(buckets[4]).toMatchObject({
      bucketStart: 0.8,
      bucketEnd: 1,
      predictionsCount: 1,
      meanPredictedProbability: 0.82,
      observedFrequency: 1
    });
  });
});

describe("prediction evaluation handlers", () => {
  beforeEach(() => {
    defaultSnapshotStore.reset();
    defaultPredictionEvaluationStore.reset();
  });

  it("creates, gets, lists, and summarizes evaluations through pure handlers", async () => {
    const snapshotResult = predictMatchFromLiveElo({
      homeTeam: "Mexico",
      awayTeam: "South Africa"
    });
    expect(snapshotResult.status).toBe("success");
    if (snapshotResult.status !== "success") return;

    const snapshot = makeSnapshot({
      snapshotId: "snap-handler-1",
      contentHash: "handler-hash",
      prediction: {
        homeExpectedGoals: snapshotResult.expectedGoals.home,
        awayExpectedGoals: snapshotResult.expectedGoals.away,
        homeWinProbability: snapshotResult.outcomeProbabilities.homeWinProbability,
        drawProbability: snapshotResult.outcomeProbabilities.drawProbability,
        awayWinProbability: snapshotResult.outcomeProbabilities.awayWinProbability,
        mostLikelyScorelines: snapshotResult.mostLikelyScorelines
      },
      confidence: snapshotResult.predictionConfidence
    });
    defaultSnapshotStore.create(snapshot, "handler-idempotency");

    const standingsBefore = getWorldCup2026GroupStandingsFoundation();
    const predictionBefore = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });

    const created = await createWorldCup2026PredictionEvaluation({
      snapshotId: "snap-handler-1",
      evaluatedAt: "2026-06-11T22:10:00.000Z"
    });
    expect(created.status).toBe("evaluated");
    if (created.status === "not_eligible" || created.status === "error") return;

    const duplicate = await createWorldCup2026PredictionEvaluation({
      snapshotId: "snap-handler-1",
      evaluatedAt: "2026-06-11T22:10:00.000Z"
    });
    expect(duplicate.status).toBe("duplicate");
    if (duplicate.status === "not_eligible" || duplicate.status === "error") return;

    const fetched = await getWorldCup2026PredictionEvaluation(
      created.evaluation.evaluationId
    );
    expect(fetched.status).toBe("success");
    if (fetched.status !== "success") return;

    const listed = await listWorldCup2026PredictionEvaluations(FIXTURE_A1);
    if (listed.status !== "success") return;
    expect(listed.totalCount).toBe(1);
    expect(listed.evaluations[0]?.snapshotId).toBe("snap-handler-1");

    const summary = await getWorldCup2026ModelRealitySummary();
    expect(summary.status).toBe("success");
    if (summary.status !== "success") return;
    expect(summary.summary.evaluationsCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("token");

    const standingsAfter = getWorldCup2026GroupStandingsFoundation();
    const predictionAfter = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });

    expect(standingsAfter).toEqual(standingsBefore);
    expect(predictionAfter).toEqual(predictionBefore);
    expect(defaultSnapshotStore.getById("snap-handler-1")).toEqual(snapshot);
  });

  it("returns typed not-eligible issues for missing snapshots", async () => {
    const result = await createWorldCup2026PredictionEvaluation({
      snapshotId: "snap-missing"
    });

    expect(result.status).toBe("not_eligible");
    if (result.status !== "not_eligible") return;
    expect(result.issues[0]?.code).toBe("missing_snapshot");
  });
});
