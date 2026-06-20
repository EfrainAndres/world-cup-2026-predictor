import { describe, expect, it } from "vitest";
import {
  buildWorldCup2026GroupDetail,
  buildWorldCup2026GroupStandings,
  createInMemoryPredictionEvaluationStore,
  createInMemorySnapshotStore
} from "../src/index.js";
import type {
  PredictionConfidenceAssessment,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot,
  WorldCup2026SyncResult
} from "../src/index.js";

function record(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> & {
    providerFixtureId: string;
    homeTeam: string;
    awayTeam: string;
    status: WorldCup2026ExternalFixtureRecord["status"];
  }
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: overrides.providerFixtureId,
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    status: overrides.status,
    ...(overrides.group === undefined ? {} : { group: overrides.group }),
    ...(overrides.matchday === undefined ? {} : { matchday: overrides.matchday }),
    ...(overrides.kickoffAt === undefined ? {} : { kickoffAt: overrides.kickoffAt }),
    ...(overrides.homeScore === undefined ? {} : { homeScore: overrides.homeScore }),
    ...(overrides.awayScore === undefined ? {} : { awayScore: overrides.awayScore }),
    ...(overrides.updatedAt === undefined ? {} : { updatedAt: overrides.updatedAt }),
    ...(overrides.venue === undefined ? {} : { venue: overrides.venue })
  };
}

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-14T12:00:00Z",
    lastSuccessfulSync: "2026-06-14T12:00:00Z",
    fixtures: [],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

const BASE_CONFIDENCE: PredictionConfidenceAssessment = {
  level: "medium",
  coverageType: "partial",
  reasons: [],
  dataPoints: {
    homeUsesFallback: false,
    awayUsesFallback: false,
    homeMatchesPlayed: 10,
    awayMatchesPlayed: 10,
    historicalMatchesAvailable: 100,
    latestMatchDate: "2026-06-10",
    currentTournamentMatchesIncluded: 0,
    attackDefenseAvailable: false
  },
  manualXgRecommended: false
};

function snapshot(overrides: Partial<WorldCup2026PredictionSnapshot>): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: overrides.snapshotId ?? "snap-1",
    fixtureId: overrides.fixtureId ?? "wc2026-group-a-md1-01-mexico-vs-south-africa",
    status: overrides.status ?? "pre_match_locked",
    capturedAt: overrides.capturedAt ?? "2026-06-11T16:00:00Z",
    cutoffAt: overrides.cutoffAt ?? "2026-06-11T16:00:00Z",
    kickoffAt: overrides.kickoffAt ?? "2026-06-11T18:00:00Z",
    group: overrides.group ?? "A",
    matchday: overrides.matchday ?? 1,
    homeTeam: overrides.homeTeam ?? "Mexico",
    awayTeam: overrides.awayTeam ?? "South Africa",
    modelVersion: overrides.modelVersion ?? "wc2026-model-v1",
    modelConfiguration: overrides.modelConfiguration ?? {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: overrides.inputs ?? {
      homeElo: 1600,
      awayElo: 1450,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 0
    },
    prediction: overrides.prediction ?? {
      homeExpectedGoals: 1.5,
      awayExpectedGoals: 0.9,
      homeWinProbability: 0.55,
      drawProbability: 0.25,
      awayWinProbability: 0.2,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.12 }]
    },
    confidence: overrides.confidence ?? BASE_CONFIDENCE,
    provenance: overrides.provenance ?? {},
    contentHash: overrides.contentHash ?? "hash"
  };
}

function evaluation(overrides: Partial<WorldCup2026PredictionEvaluation>): WorldCup2026PredictionEvaluation {
  return {
    evaluationId: overrides.evaluationId ?? "eval-1",
    snapshotId: overrides.snapshotId ?? "snap-1",
    fixtureId: overrides.fixtureId ?? "wc2026-group-a-md1-01-mexico-vs-south-africa",
    providerFixtureId: overrides.providerFixtureId ?? "wc2026-group-a-md1-01-mexico-vs-south-africa",
    evaluatedAt: overrides.evaluatedAt ?? "2026-06-11T20:00:00Z",
    modelVersion: overrides.modelVersion ?? "wc2026-model-v1",
    metricVersion: overrides.metricVersion ?? "world_cup_2026_eval_v1",
    predicted: overrides.predicted ?? {
      homeExpectedGoals: 1.5,
      awayExpectedGoals: 0.9,
      homeWinProbability: 0.55,
      drawProbability: 0.25,
      awayWinProbability: 0.2,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.12 }],
      predictedOutcome: "home_win",
      predictedScoreline: { homeGoals: 1, awayGoals: 0 }
    },
    actual: overrides.actual ?? {
      homeGoals: 2,
      awayGoals: 0,
      outcome: "home_win"
    },
    metrics: overrides.metrics ?? {
      outcomeCorrect: true,
      drawCorrect: false,
      exactScoreCorrect: false,
      homeGoalAbsoluteError: 1,
      awayGoalAbsoluteError: 0,
      totalGoalAbsoluteError: 1,
      goalDifferenceAbsoluteError: 1,
      brierScore: 0.342,
      logLoss: 0.578,
      predictedOutcomeProbability: 0.55,
      actualOutcomeProbability: 0.55
    },
    confidence: overrides.confidence ?? {
      level: "medium",
      coverageType: "partial",
      fallbackUsed: false
    },
    provenance: overrides.provenance ?? {
      snapshotContentHash: "hash"
    }
  };
}

describe("buildWorldCup2026GroupDetail", () => {
  it("validates group and timezone input", () => {
    const invalidGroup = buildWorldCup2026GroupDetail({
      group: "Z",
      timezone: "UTC",
      syncResult: syncResult()
    });
    expect(invalidGroup.status).toBe("validation_error");

    const invalidTimezone = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "Mars/Olympus",
      syncResult: syncResult()
    });
    expect(invalidTimezone.status).toBe("validation_error");
  });

  it("returns official standings, teams, and qualification for a valid group request", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          }),
          record({
            providerFixtureId: "wc2026-group-a-md1-02-south-korea-vs-czechia",
            group: "A",
            matchday: 1,
            homeTeam: "South Korea",
            awayTeam: "Czechia",
            status: "finished",
            kickoffAt: "2026-06-11T21:00:00Z",
            homeScore: 2,
            awayScore: 1
          })
        ],
        completedResults: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          }),
          record({
            providerFixtureId: "wc2026-group-a-md1-02-south-korea-vs-czechia",
            group: "A",
            matchday: 1,
            homeTeam: "South Korea",
            awayTeam: "Czechia",
            status: "finished",
            kickoffAt: "2026-06-11T21:00:00Z",
            homeScore: 2,
            awayScore: 1
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.group).toBe("A");
    expect(result.teams).toHaveLength(4);
    expect(result.standings.official).toHaveLength(4);
    expect(result.standings.liveAvailable).toBe(false);
    expect(result.qualification.firstPlace).toBe("Mexico");
    expect(result.qualification.secondPlace).toBe("South Korea");
    expect(result.qualification.thirdPlace).toBe("Czechia");
  });

  it("includes provisional standings only when live or halftime matches exist", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "live",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 1,
            awayScore: 0
          })
        ],
        liveMatches: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "halftime",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 1,
            awayScore: 0
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.standings.liveAvailable).toBe(true);
    expect(result.standings.liveProvisional?.find((entry) => entry.team === "Mexico")?.points).toBe(3);
  });

  it("categorizes group fixtures deterministically and isolates other groups", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-02-south-korea-vs-czechia",
            group: "A",
            matchday: 1,
            homeTeam: "South Korea",
            awayTeam: "Czechia",
            status: "live",
            kickoffAt: "2026-06-11T21:00:00Z",
            homeScore: 1,
            awayScore: 0
          }),
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          }),
          record({
            providerFixtureId: "wc2026-group-a-md2-03-mexico-vs-south-korea",
            group: "A",
            matchday: 2,
            homeTeam: "Mexico",
            awayTeam: "South Korea",
            status: "scheduled",
            kickoffAt: "2026-06-14T18:00:00Z"
          }),
          record({
            providerFixtureId: "wc2026-group-a-md2-04-south-africa-vs-czechia",
            group: "A",
            matchday: 2,
            homeTeam: "South Africa",
            awayTeam: "Czechia",
            status: "scheduled"
          }),
          record({
            providerFixtureId: "wc2026-group-a-md3-05-mexico-vs-czechia",
            group: "A",
            matchday: 3,
            homeTeam: "Mexico",
            awayTeam: "Czechia",
            status: "postponed",
            kickoffAt: "2026-06-18T18:00:00Z"
          }),
          record({
            providerFixtureId: "wc2026-group-a-md3-06-south-africa-vs-south-korea",
            group: "A",
            matchday: 3,
            homeTeam: "South Africa",
            awayTeam: "South Korea",
            status: "cancelled",
            kickoffAt: "2026-06-18T21:00:00Z"
          }),
          record({
            providerFixtureId: "duplicate-fixture",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 3,
            awayScore: 0
          }),
          record({
            providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
            group: "B",
            matchday: 1,
            homeTeam: "Canada",
            awayTeam: "Bosnia-Herzegovina",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 1,
            awayScore: 1
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches.completed).toHaveLength(1);
    expect(result.matches.live).toHaveLength(1);
    expect(result.matches.upcoming).toHaveLength(1);
    expect(result.matches.unscheduled).toHaveLength(1);
    expect(result.matches.postponed).toHaveLength(1);
    expect(result.matches.cancelled).toHaveLength(1);
    expect(result.matches.completed[0]?.fixtureId).toBe("wc2026-group-a-md1-01-mexico-vs-south-africa");
    expect(result.matches.upcoming[0]?.fixtureId).toBe("wc2026-group-a-md2-03-mexico-vs-south-korea");
    expect(result.warnings.some((warning) => warning.toLowerCase().includes("duplicate fixture"))).toBe(true);
    expect(
      result.matches.completed.every((match) => match.group === "A") &&
        result.matches.live.every((match) => match.group === "A")
    ).toBe(true);
  });

  it("reuses prediction-history summaries without mutating snapshot or evaluation stores", () => {
    const snapshotStore = createInMemorySnapshotStore();
    const evaluationStore = createInMemoryPredictionEvaluationStore();
    snapshotStore.create(snapshot({ snapshotId: "snap-a" }), "snap-a");
    evaluationStore.create(evaluation({ evaluationId: "eval-a", snapshotId: "snap-a" }), "eval-a");
    const snapshotsBefore = snapshotStore.list();
    const evaluationsBefore = evaluationStore.list();

    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      snapshotStore,
      evaluationStore,
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          })
        ],
        completedResults: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches.completed[0]?.predictionHistory.snapshot.available).toBe(true);
    expect(result.matches.completed[0]?.predictionHistory.evaluation.available).toBe(true);
    expect(snapshotStore.list()).toEqual(snapshotsBefore);
    expect(evaluationStore.list()).toEqual(evaluationsBefore);
  });

  it("exposes provider fallback metadata and stale warnings without leaking secrets", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      syncResult: syncResult({
        providerMode: "local_static",
        activeProvider: "local_static_results_provider",
        cacheUsed: true,
        localFallbackUsed: true,
        externalProviderEnabled: false,
        warnings: ["stale cache"],
        fixtures: []
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.providerMetadata).toEqual({
      configuredProvider: "local_static",
      activeProvider: "local_static_results_provider",
      cacheUsed: true,
      localFallbackUsed: true,
      stale: true,
      lastSuccessfulSync: "2026-06-14T12:00:00Z"
    });
    expect(JSON.stringify(result)).not.toContain("token");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("does not mutate standings foundations while composing group detail", () => {
    const standingsBefore = buildWorldCup2026GroupStandings();

    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          })
        ],
        completedResults: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            kickoffAt: "2026-06-11T18:00:00Z",
            homeScore: 2,
            awayScore: 0
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    expect(buildWorldCup2026GroupStandings()).toEqual(standingsBefore);
  });
});
