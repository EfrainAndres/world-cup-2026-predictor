import { describe, expect, it } from "vitest";
import { buildEvidenceCoverageAudit } from "../src/evidence-coverage-audit.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot
} from "../src/schemas.js";

function snapshot(input: {
  id: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  capturedAt?: string;
  kickoffAt?: string;
  status?: WorldCup2026PredictionSnapshot["status"];
  malformed?: boolean;
}): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: input.id,
    fixtureId: input.fixtureId,
    status: input.status ?? "pre_match_locked",
    capturedAt: input.capturedAt ?? "2026-06-11T10:00:00.000Z",
    cutoffAt: input.kickoffAt ?? "2026-06-11T16:00:00.000Z",
    kickoffAt: input.kickoffAt ?? "2026-06-11T16:00:00.000Z",
    group: "A",
    matchday: 1,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    modelVersion: "test-model",
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 6,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: 1600,
      awayElo: 1500,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 0
    },
    prediction: {
      homeExpectedGoals: 1.4,
      awayExpectedGoals: 1.1,
      homeWinProbability: input.malformed ? 0.9 : 0.5,
      drawProbability: input.malformed ? 0.9 : 0.25,
      awayWinProbability: input.malformed ? 0.9 : 0.25,
      mostLikelyScorelines: input.malformed
        ? []
        : [{ homeGoals: 1, awayGoals: 0, probability: 0.2 }]
    },
    confidence: {
      level: "medium",
      coverageType: "full",
      reasons: [],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: false,
        homeMatchesPlayed: 10,
        awayMatchesPlayed: 10,
        historicalMatchesAvailable: 100
      },
      manualXgRecommended: false
    },
    provenance: {},
    contentHash: `hash-${input.id}`
  };
}

function evaluation(input: {
  id: string;
  snapshotId: string;
  fixtureId: string;
}): WorldCup2026PredictionEvaluation {
  return {
    evaluationId: input.id,
    snapshotId: input.snapshotId,
    fixtureId: input.fixtureId,
    evaluatedAt: "2026-06-11T20:00:00.000Z",
    modelVersion: "test-model",
    metricVersion: "test-metrics",
    predicted: {
      homeExpectedGoals: 1.4,
      awayExpectedGoals: 1.1,
      homeWinProbability: 0.5,
      drawProbability: 0.25,
      awayWinProbability: 0.25,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.2 }],
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
      brierScore: 0.375,
      logLoss: 0.693147,
      predictedOutcomeProbability: 0.5,
      actualOutcomeProbability: 0.5
    },
    confidence: {
      level: "medium",
      coverageType: "full",
      fallbackUsed: false
    },
    provenance: {
      snapshotContentHash: `hash-${input.snapshotId}`
    }
  };
}

function result(input: {
  id: string;
  homeTeam: string;
  awayTeam: string;
}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: input.id,
    competition: "FIFA World Cup",
    season: "2026",
    stage: "GROUP_STAGE",
    matchday: 1,
    kickoffAt: "2026-06-11T16:00:00.000Z",
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    status: "finished",
    homeScore: 2,
    awayScore: 0
  };
}

describe("evidence coverage audit", () => {
  it("reports duplicate snapshots/evaluations and completed fixtures missing evidence", () => {
    const report = buildEvidenceCoverageAudit({
      generatedAt: "2026-07-09T12:00:00.000Z",
      completedResults: [
        result({
          id: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa"
        }),
        result({
          id: "wc2026-group-a-md1-02-south-korea-vs-czechia",
          homeTeam: "South Korea",
          awayTeam: "Czechia"
        }),
        result({
          id: "wc2026-group-a-md2-03-mexico-vs-south-korea",
          homeTeam: "Mexico",
          awayTeam: "South Korea"
        })
      ],
      snapshots: [
        snapshot({
          id: "snapshot-old",
          fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          capturedAt: "2026-06-11T09:00:00.000Z",
          status: "foundation_unverified"
        }),
        snapshot({
          id: "snapshot-primary",
          fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          capturedAt: "2026-06-11T10:00:00.000Z"
        }),
        snapshot({
          id: "snapshot-pending",
          fixtureId: "wc2026-group-a-md1-02-south-korea-vs-czechia",
          homeTeam: "South Korea",
          awayTeam: "Czechia"
        }),
        snapshot({
          id: "snapshot-post-kickoff",
          fixtureId: "wc2026-group-a-md2-03-mexico-vs-south-korea",
          homeTeam: "Mexico",
          awayTeam: "South Korea",
          capturedAt: "2026-06-11T17:00:00.000Z"
        })
      ],
      evaluations: [
        evaluation({
          id: "evaluation-primary",
          snapshotId: "snapshot-primary",
          fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa"
        }),
        evaluation({
          id: "evaluation-old",
          snapshotId: "snapshot-old",
          fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa"
        })
      ]
    });

    expect(report.counts.completedGroupFixtures).toBe(3);
    expect(report.counts.totalSnapshots).toBe(4);
    expect(report.counts.totalEvaluations).toBe(2);
    expect(report.counts.uniqueEvaluatedFixtures).toBe(1);
    expect(report.counts.duplicateSnapshotFixtures).toBe(1);
    expect(report.counts.duplicateEvaluationFixtures).toBe(1);
    expect(report.counts.completedFixturesWithoutAnySnapshot).toBe(0);
    expect(report.counts.completedFixturesWithoutValidPrimarySnapshot).toBe(1);
    expect(report.counts.completedFixturesWithSnapshotButNoEvaluation).toBe(1);
    expect(report.excludedSnapshots.map((entry) => entry.reason)).toContain("not_primary_selection");
    expect(report.excludedSnapshots.map((entry) => entry.reason)).toContain("post_kickoff");
  });
});
