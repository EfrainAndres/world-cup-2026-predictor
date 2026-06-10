import { describe, expect, it } from "vitest";
import { DEFAULT_TOURNAMENT_RUNS_MAX, runTournamentRepeatedRuns, summarizeTeamCounts } from "../src/index.js";
import type { ScorelineProbability, TournamentInput } from "../src/index.js";

function fixedScoreline(homeGoals: number, awayGoals: number): ScorelineProbability[] {
  return [
    {
      homeGoals,
      awayGoals,
      probability: 1
    }
  ];
}

function balancedScoreline(): ScorelineProbability[] {
  return [
    {
      homeGoals: 1,
      awayGoals: 0,
      probability: 0.5
    },
    {
      homeGoals: 0,
      awayGoals: 1,
      probability: 0.5
    }
  ];
}

function demoTournament(knockoutScoreMatrix: ScorelineProbability[] = balancedScoreline()): TournamentInput {
  return {
    name: "Repeated Demo Cup",
    groupQualifiersCount: 1,
    knockoutScoreMatrix,
    groups: [
      {
        name: "Group A",
        teams: [{ name: "Alpha" }, { name: "Beta" }],
        matches: [{ homeTeam: "Alpha", awayTeam: "Beta", scoreMatrix: fixedScoreline(2, 0) }]
      },
      {
        name: "Group B",
        teams: [{ name: "Gamma" }, { name: "Delta" }],
        matches: [{ homeTeam: "Gamma", awayTeam: "Delta", scoreMatrix: fixedScoreline(2, 0) }]
      }
    ]
  };
}

function sumCounts(summaries: readonly { count: number }[]): number {
  return summaries.reduce((sum, summary) => sum + summary.count, 0);
}

function sumProbabilities(summaries: readonly { probability: number }[]): number {
  return summaries.reduce((sum, summary) => sum + summary.probability, 0);
}

describe("tournament repeated runs", () => {
  it("returns the requested repeated run count", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 25,
      seed: 2026
    });

    expect(result.totalRuns).toBe(25);
    expect(result.metadata.totalRuns).toBe(25);
  });

  it("champion probabilities sum close to 1", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 50,
      seed: 7
    });

    expect(sumProbabilities(result.championProbabilities)).toBeCloseTo(1, 10);
  });

  it("runner-up probabilities sum close to 1", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 50,
      seed: 7
    });

    expect(sumProbabilities(result.runnerUpProbabilities)).toBeCloseTo(1, 10);
  });

  it("champion counts sum to run count", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 50,
      seed: 7
    });

    expect(sumCounts(result.championProbabilities)).toBe(50);
  });

  it("runner-up counts sum to run count", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 50,
      seed: 7
    });

    expect(sumCounts(result.runnerUpProbabilities)).toBe(50);
  });

  it("is reproducible with the same seed", () => {
    const firstRun = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 40,
      seed: 42
    });
    const secondRun = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 40,
      seed: 42
    });

    expect(secondRun).toEqual(firstRun);
  });

  it("can differ when using different seeds", () => {
    const firstRun = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 41,
      seed: 1
    });
    const secondRun = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 41,
      seed: 2
    });

    expect(secondRun.championProbabilities).not.toEqual(firstRun.championProbabilities);
  });

  it("sorts summaries by probability descending", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 50,
      seed: 7
    });

    for (let index = 1; index < result.championProbabilities.length; index += 1) {
      const previous = result.championProbabilities[index - 1]?.probability ?? 0;
      const current = result.championProbabilities[index]?.probability ?? 0;

      expect(previous).toBeGreaterThanOrEqual(current);
    }
  });

  it("uses deterministic team name fallback when probabilities tie", () => {
    const summaries = summarizeTeamCounts(
      new Map([
        ["Gamma", 2],
        ["Alpha", 2]
      ]),
      4
    );

    expect(summaries.map((summary) => summary.team)).toEqual(["Alpha", "Gamma"]);
  });

  it("rejects invalid run counts", () => {
    expect(() =>
      runTournamentRepeatedRuns(demoTournament(), {
        runCount: 0
      })
    ).toThrow("runCount");
  });

  it("enforces the safe maximum run count", () => {
    expect(() =>
      runTournamentRepeatedRuns(demoTournament(), {
        runCount: DEFAULT_TOURNAMENT_RUNS_MAX + 1
      })
    ).toThrow(`${DEFAULT_TOURNAMENT_RUNS_MAX}`);
  });

  it("does not mutate tournament input", () => {
    const tournament = demoTournament();
    const snapshot = JSON.parse(JSON.stringify(tournament)) as TournamentInput;

    runTournamentRepeatedRuns(tournament, {
      runCount: 20,
      seed: 2026
    });

    expect(tournament).toEqual(snapshot);
  });

  it("tracks group and knockout qualification probabilities", () => {
    const result = runTournamentRepeatedRuns(demoTournament(), {
      runCount: 25,
      seed: 2026
    });

    expect(sumCounts(result.groupQualificationProbabilities)).toBe(50);
    expect(sumCounts(result.knockoutQualificationProbabilities)).toBe(50);
    expect(result.groupQualificationProbabilities.map((summary) => summary.team)).toEqual(["Alpha", "Gamma"]);
  });
});
