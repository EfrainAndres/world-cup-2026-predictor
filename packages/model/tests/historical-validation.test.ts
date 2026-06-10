import { describe, expect, it } from "vitest";
import {
  buildChampionCalibrationBuckets,
  calculateChampionBrierScore,
  calculateChampionLogLoss,
  evaluateHistoricalTournamentPrediction,
  evaluateRunnerUpPrediction,
  isTeamInTopN,
  validateHistoricalTournaments,
  validateProbabilitySnapshot
} from "../src/index.js";
import type { ActualTournamentResult, HistoricalTournamentPredictionInput, TeamProbabilitySnapshot } from "../src/index.js";

function probabilities(entries: readonly [string, number][]): TeamProbabilitySnapshot[] {
  return entries.map(([team, probability]) => ({ team, probability }));
}

function prediction(
  tournamentId: string,
  championProbabilities: TeamProbabilitySnapshot[],
  runnerUpProbabilities: TeamProbabilitySnapshot[] = probabilities([
    ["Beta", 0.5],
    ["Alpha", 0.3],
    ["Gamma", 0.2]
  ])
): HistoricalTournamentPredictionInput {
  return {
    tournamentId,
    tournamentName: `Tournament ${tournamentId}`,
    championProbabilities,
    runnerUpProbabilities,
    knockoutQualificationProbabilities: probabilities([
      ["Alpha", 0.9],
      ["Beta", 0.8],
      ["Gamma", 0.7],
      ["Delta", 0.2]
    ])
  };
}

function actual(tournamentId: string, champion = "Alpha", runnerUp = "Beta"): ActualTournamentResult {
  return {
    tournamentId,
    tournamentName: `Tournament ${tournamentId}`,
    champion,
    runnerUp,
    knockoutTeams: ["Alpha", "Beta", "Gamma"]
  };
}

describe("historical tournament validation", () => {
  it("returns 0 Brier score for perfect champion probability", () => {
    expect(calculateChampionBrierScore(probabilities([["Alpha", 1], ["Beta", 0]]), "Alpha")).toBe(0);
  });

  it("penalizes wrong confident champion predictions with Brier score", () => {
    expect(calculateChampionBrierScore(probabilities([["Alpha", 1], ["Beta", 0]]), "Beta")).toBeGreaterThan(1);
  });

  it("returns low log loss for high probability actual champion", () => {
    expect(calculateChampionLogLoss(probabilities([["Alpha", 0.9], ["Beta", 0.1]]), "Alpha")).toBeLessThan(0.2);
  });

  it("returns high log loss for low probability actual champion", () => {
    expect(calculateChampionLogLoss(probabilities([["Alpha", 0.99], ["Beta", 0.01]]), "Beta")).toBeGreaterThan(4);
  });

  it("top-1 hit succeeds when actual champion is highest probability", () => {
    expect(isTeamInTopN(probabilities([["Alpha", 0.7], ["Beta", 0.2], ["Gamma", 0.1]]), "Alpha", 1)).toBe(true);
  });

  it("top-3 hit succeeds when actual champion is within top 3", () => {
    expect(isTeamInTopN(probabilities([["Alpha", 0.5], ["Beta", 0.3], ["Gamma", 0.15], ["Delta", 0.05]]), "Gamma", 3)).toBe(true);
  });

  it("top-N hit fails when actual champion is outside N", () => {
    expect(isTeamInTopN(probabilities([["Alpha", 0.5], ["Beta", 0.3], ["Gamma", 0.15], ["Delta", 0.05]]), "Delta", 3)).toBe(false);
  });

  it("runner-up evaluation works with probability ranking", () => {
    const result = evaluateRunnerUpPrediction(probabilities([["Beta", 0.6], ["Alpha", 0.3], ["Gamma", 0.1]]), "Beta");

    expect(result).toEqual({
      actualRunnerUp: "Beta",
      probability: 0.6,
      top1Hit: true,
      top3Hit: true
    });
  });

  it("evaluates champion, runner-up, and knockout qualification together", () => {
    const result = evaluateHistoricalTournamentPrediction(
      prediction("2022", probabilities([["Alpha", 0.6], ["Beta", 0.25], ["Gamma", 0.15]])),
      actual("2022")
    );

    expect(result.championTop1Hit).toBe(true);
    expect(result.runnerUpEvaluation?.top1Hit).toBe(true);
    expect(result.knockoutQualificationEvaluation?.hitRate).toBe(1);
  });

  it("summarizes multiple validation results correctly", () => {
    const summary = validateHistoricalTournaments(
      [
        prediction("2018", probabilities([["Alpha", 0.7], ["Beta", 0.2], ["Gamma", 0.1]])),
        prediction("2022", probabilities([["Beta", 0.6], ["Alpha", 0.3], ["Gamma", 0.1]]))
      ],
      [actual("2018", "Alpha"), actual("2022", "Alpha")]
    ).summary;

    expect(summary.tournamentCount).toBe(2);
    expect(summary.championTop1HitRate).toBe(0.5);
    expect(summary.championTop3HitRate).toBe(1);
    expect(summary.averageChampionBrierScore).toBeGreaterThan(0);
    expect(summary.averageChampionLogLoss).toBeGreaterThan(0);
  });

  it("builds calibration buckets from champion probability snapshots", () => {
    const buckets = buildChampionCalibrationBuckets(
      [prediction("2018", probabilities([["Alpha", 0.7], ["Beta", 0.2], ["Gamma", 0.1]]))],
      [actual("2018", "Alpha")],
      0.5
    );

    expect(buckets).toHaveLength(2);
    expect(buckets[0]?.predictionCount).toBe(2);
    expect(buckets[1]?.actualRate).toBe(1);
  });

  it("rejects invalid probability snapshots", () => {
    expect(() => validateProbabilitySnapshot([], "test snapshot")).toThrow("at least one team");
  });

  it("rejects probabilities outside 0-1", () => {
    expect(() => validateProbabilitySnapshot(probabilities([["Alpha", 1.1]]), "test snapshot")).toThrow("between 0 and 1");
  });

  it("rejects duplicate teams in probability snapshots", () => {
    expect(() => validateProbabilitySnapshot(probabilities([["Alpha", 0.6], ["Alpha", 0.4]]), "test snapshot")).toThrow(
      "duplicate team"
    );
  });

  it("rejects missing actual champion", () => {
    expect(() =>
      evaluateHistoricalTournamentPrediction(prediction("2022", probabilities([["Alpha", 1]])), {
        tournamentId: "2022",
        tournamentName: "Tournament 2022",
        champion: ""
      })
    ).toThrow("actual champion");
  });
});
