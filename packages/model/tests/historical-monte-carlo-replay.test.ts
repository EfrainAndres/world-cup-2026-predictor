import { describe, expect, it } from "vitest";
import {
  FOUNDATION_HISTORICAL_DATA_WARNING,
  SIMPLIFIED_TOURNAMENT_BRACKET_WARNING,
  UNCALIBRATED_ELO_TO_GOALS_WARNING,
  buildPairwiseExpectedGoalsFromEloSnapshot,
  generatePairwisePoissonMatrixFromEloSnapshot,
  mapEloRatingsToExpectedGoals,
  runHistoricalMonteCarloReplay,
  runHistoricalMonteCarloReplayYear
} from "../src/index.js";
import type {
  GeneratedHistoricalEloSnapshot,
  HistoricalMonteCarloReplayTournamentInput,
  HistoricalTournamentFixtureSubset
} from "../src/index.js";

function snapshot(): GeneratedHistoricalEloSnapshot {
  const championProbabilities = [
    { team: "Alpha", eloRating: 1700, probability: 0.4, rank: 1 },
    { team: "Gamma", eloRating: 1600, probability: 0.3, rank: 2 },
    { team: "Beta", eloRating: 1400, probability: 0.15, rank: 3 },
    { team: "Delta", eloRating: 1400, probability: 0.15, rank: 4 }
  ];

  return {
    tournamentId: "test-cup-2020",
    tournamentName: "Test Cup 2020",
    tournamentYear: 2020,
    snapshotType: "historical_elo_replay_snapshot_foundation",
    modelVersion: "historical-elo-replay-foundation-v1",
    dataCutoff: "2020-01-01",
    teams: championProbabilities.map((entry) => entry.team),
    championProbabilities,
    eloRatings: championProbabilities,
    snapshotMetadata: {
      tournamentYear: 2020,
      tournamentStartDate: "2020-02-01",
      inputDataCutoff: "2020-01-01",
      generatedAt: "2020-01-15",
      modelVersion: "historical-elo-replay-foundation-v1",
      snapshotType: "historical_elo_replay_snapshot_foundation",
      dataCoverage: "custom_partial_history",
      inputMatchCount: 2,
      matchesUsed: 2,
      matchesIgnoredAfterCutoff: 0,
      targetTeamCount: 4,
      config: {
        initialRating: 1500,
        kFactor: 20,
        probabilityRatingScale: 400
      },
      warnings: [
        {
          code: "incomplete_historical_data",
          severity: "warning",
          message:
            "Probability snapshot is a historical_elo_replay_snapshot_foundation generated from available curated historical fixtures, not a complete international-history forecast."
        }
      ],
      lookAheadGuardrails: [
        {
          guardrail: "input_data_before_tournament",
          passed: true,
          severity: "error",
          message: "Input data cutoff is before the tournament start date."
        },
        {
          guardrail: "generated_before_tournament",
          passed: true,
          severity: "warning",
          message: "Snapshot generated date is before the tournament start date."
        },
        {
          guardrail: "no_actual_results_in_input",
          passed: true,
          severity: "error",
          message: "Snapshot input does not include actual tournament results."
        }
      ]
    }
  };
}

function tournamentInput(): HistoricalMonteCarloReplayTournamentInput {
  return {
    name: "Test Cup 2020 Simulation Foundation",
    groupQualifiersCount: 1,
    groups: [
      {
        name: "Group A",
        teams: ["Alpha", "Beta"],
        fixtures: [{ homeTeam: "Alpha", awayTeam: "Beta" }]
      },
      {
        name: "Group B",
        teams: ["Gamma", "Delta"],
        fixtures: [{ homeTeam: "Gamma", awayTeam: "Delta" }]
      }
    ]
  };
}

function fixtureSubset(): HistoricalTournamentFixtureSubset {
  return {
    tournamentId: "test-cup-2020",
    tournamentName: "Test Cup 2020",
    tournamentYear: 2020,
    isPartial: false,
    coverageNote: "Small deterministic fixture subset for Monte Carlo replay foundation tests.",
    matches: [
      {
        matchId: "test-final-2020",
        tournamentYear: 2020,
        stage: "final",
        stageOrder: 6,
        matchDate: "2020-02-20",
        homeTeam: "Alpha",
        awayTeam: "Gamma",
        homeScore: 2,
        awayScore: 1,
        result: "home_win",
        winner: "Alpha",
        decidedBy: "regular_time"
      }
    ]
  };
}

describe("historical Monte Carlo replay foundation", () => {
  it("maps Elo ratings to expected goals deterministically", () => {
    expect(mapEloRatingsToExpectedGoals(1600, 1400)).toEqual(mapEloRatingsToExpectedGoals(1600, 1400));
  });

  it("gives the higher Elo team higher expected goals", () => {
    const expectedGoals = mapEloRatingsToExpectedGoals(1700, 1400);

    expect(expectedGoals.expectedHomeGoals).toBeGreaterThan(expectedGoals.expectedAwayGoals);
  });

  it("keeps expected goals positive and finite", () => {
    const expectedGoals = mapEloRatingsToExpectedGoals(1000, 2200);

    expect(expectedGoals.expectedHomeGoals).toBeGreaterThan(0);
    expect(expectedGoals.expectedAwayGoals).toBeGreaterThan(0);
    expect(Number.isFinite(expectedGoals.expectedHomeGoals)).toBe(true);
    expect(Number.isFinite(expectedGoals.expectedAwayGoals)).toBe(true);
  });

  it("generates a match probability matrix from Elo-derived expected goals", () => {
    const matrix = generatePairwisePoissonMatrixFromEloSnapshot(snapshot(), "Alpha", "Beta");
    const probabilitySum = matrix.reduce((sum, scoreline) => sum + scoreline.probability, 0);

    expect(matrix.length).toBeGreaterThan(0);
    expect(probabilitySum).toBeCloseTo(1);
  });

  it("builds pairwise expected goals from snapshot teams", () => {
    const expectedGoals = buildPairwiseExpectedGoalsFromEloSnapshot(snapshot(), "Alpha", "Beta");

    expect(expectedGoals.expectedHomeGoals).toBeGreaterThan(expectedGoals.expectedAwayGoals);
  });

  it("returns the requested simulation count", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 40, seed: 7 }
    });

    expect(result.simulationCount).toBe(40);
    expect(result.metadata.simulationCount).toBe(40);
  });

  it("returns sorted champion probabilities", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 60, seed: 7 }
    });

    expect(result.championProbabilities.length).toBeGreaterThan(0);
    for (let index = 1; index < result.championProbabilities.length; index += 1) {
      expect(result.championProbabilities[index - 1]?.probability ?? 0).toBeGreaterThanOrEqual(
        result.championProbabilities[index]?.probability ?? 0
      );
    }
  });

  it("returns champion probabilities that sum close to 1", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 60, seed: 8 }
    });
    const probabilitySum = result.championProbabilities.reduce((sum, entry) => sum + entry.probability, 0);

    expect(probabilitySum).toBeCloseTo(1);
  });

  it("includes actual champion and runner-up in per-year replay", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 30, seed: 9 }
    });

    expect(result.actualChampion).toBe("Alpha");
    expect(result.actualRunnerUp).toBe("Gamma");
  });

  it("calculates Top-1, Top-3, and Top-5 champion flags", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 80, seed: 7 }
    });

    expect(typeof result.championTop1Hit).toBe("boolean");
    expect(result.championTop3Hit).toBe(true);
    expect(result.championTop5Hit).toBe(true);
  });

  it("includes Brier Score and Log Loss", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 40, seed: 11 }
    });

    expect(result.brierScore).toBeGreaterThanOrEqual(0);
    expect(result.logLoss).toBeGreaterThan(0);
  });

  it("includes warnings for uncalibrated Elo-to-goals mapping and foundation data limits", () => {
    const result = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 20, seed: 1 }
    });

    expect(result.warnings.map((warning) => warning.message)).toContain(UNCALIBRATED_ELO_TO_GOALS_WARNING);
    expect(result.warnings.map((warning) => warning.message)).toContain(FOUNDATION_HISTORICAL_DATA_WARNING);
    expect(result.warnings.map((warning) => warning.message)).toContain(SIMPLIFIED_TOURNAMENT_BRACKET_WARNING);
  });

  it("is reproducible with the same seed", () => {
    const replayInput = {
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 41, seed: 12 }
    };

    expect(runHistoricalMonteCarloReplayYear(replayInput)).toEqual(runHistoricalMonteCarloReplayYear(replayInput));
  });

  it("can produce different summaries with different seeds", () => {
    const first = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 41, seed: 1 }
    });
    const second = runHistoricalMonteCarloReplayYear({
      fixtureSubset: fixtureSubset(),
      snapshot: snapshot(),
      tournamentInput: tournamentInput(),
      simulationConfig: { simulationCount: 41, seed: 2 }
    });

    expect(second.championProbabilities).not.toEqual(first.championProbabilities);
  });

  it("rejects invalid simulation counts", () => {
    expect(() =>
      runHistoricalMonteCarloReplayYear({
        fixtureSubset: fixtureSubset(),
        snapshot: snapshot(),
        tournamentInput: tournamentInput(),
        simulationConfig: { simulationCount: 0 }
      })
    ).toThrow("simulationCount");
  });

  it("rejects invalid Elo-to-goals config", () => {
    expect(() =>
      runHistoricalMonteCarloReplayYear({
        fixtureSubset: fixtureSubset(),
        snapshot: snapshot(),
        tournamentInput: tournamentInput(),
        simulationConfig: { simulationCount: 10, seed: 1 },
        eloToExpectedGoalsConfig: { baseExpectedGoals: 0 }
      })
    ).toThrow("baseExpectedGoals");
  });

  it("summarizes multiple Monte Carlo replay years", () => {
    const report = runHistoricalMonteCarloReplay({
      replays: [
        {
          fixtureSubset: fixtureSubset(),
          snapshot: snapshot(),
          tournamentInput: tournamentInput(),
          simulationConfig: { simulationCount: 20, seed: 3 }
        },
        {
          fixtureSubset: { ...fixtureSubset(), tournamentId: "test-cup-2021", tournamentName: "Test Cup 2021", tournamentYear: 2021 },
          snapshot: { ...snapshot(), tournamentId: "test-cup-2021", tournamentName: "Test Cup 2021", tournamentYear: 2021 },
          tournamentInput: { ...tournamentInput(), name: "Test Cup 2021 Simulation Foundation" },
          simulationConfig: { simulationCount: 30, seed: 4 }
        }
      ]
    });

    expect(report.results).toHaveLength(2);
    expect(report.summary.yearsEvaluated).toEqual([2020, 2021]);
    expect(report.summary.simulationCountSummary).toEqual({ min: 20, max: 30, total: 50 });
    expect(report.summary.averageBrierScore).toBeGreaterThanOrEqual(0);
  });
});
