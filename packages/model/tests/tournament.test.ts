import { describe, expect, it } from "vitest";
import { simulateTournament } from "../src/index.js";
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

function demoTournament(): TournamentInput {
  return {
    name: "Demo Cup",
    groupQualifiersCount: 1,
    knockoutScoreMatrix: fixedScoreline(0, 0),
    metadata: {
      modelVersion: "test-fixture"
    },
    groups: [
      {
        name: "Group A",
        teams: [{ name: "Alpha" }, { name: "Beta" }],
        matches: [{ homeTeam: "Alpha", awayTeam: "Beta", scoreMatrix: fixedScoreline(2, 0) }]
      },
      {
        name: "Group B",
        teams: [{ name: "Gamma" }, { name: "Delta" }],
        matches: [{ homeTeam: "Gamma", awayTeam: "Delta", scoreMatrix: fixedScoreline(1, 0) }]
      }
    ]
  };
}

describe("tournament simulation foundation", () => {
  it("returns a champion and runner-up", () => {
    const result = simulateTournament(demoTournament(), {
      seed: 2026
    });

    expect(result.champion.length).toBeGreaterThan(0);
    expect(result.runnerUp.length).toBeGreaterThan(0);
    expect(result.champion).not.toBe(result.runnerUp);
  });

  it("returns group results and knockout results", () => {
    const result = simulateTournament(demoTournament(), {
      seed: 2026
    });

    expect(result.groupResults).toHaveLength(2);
    expect(result.knockoutResults).toHaveLength(1);
    expect(result.metadata.qualifiedTeamCount).toBe(2);
  });

  it("is reproducible with seeded behavior", () => {
    const firstRun = simulateTournament(demoTournament(), {
      seed: 99
    });
    const secondRun = simulateTournament(demoTournament(), {
      seed: 99
    });

    expect(secondRun).toEqual(firstRun);
  });

  it("rejects invalid tournament input", () => {
    expect(() =>
      simulateTournament({
        name: "Invalid",
        groups: [],
        knockoutScoreMatrix: fixedScoreline(0, 0)
      })
    ).toThrow("at least one group");
  });

  it("rejects non-power-of-two qualifier counts", () => {
    expect(() =>
      simulateTournament({
        name: "Odd Qualifiers",
        groupQualifiersCount: 1,
        knockoutScoreMatrix: fixedScoreline(1, 0),
        groups: [
          {
            name: "Group A",
            teams: [{ name: "Alpha" }, { name: "Beta" }],
            matches: [{ homeTeam: "Alpha", awayTeam: "Beta", scoreMatrix: fixedScoreline(1, 0) }]
          },
          {
            name: "Group B",
            teams: [{ name: "Gamma" }, { name: "Delta" }],
            matches: [{ homeTeam: "Gamma", awayTeam: "Delta", scoreMatrix: fixedScoreline(1, 0) }]
          },
          {
            name: "Group C",
            teams: [{ name: "Epsilon" }, { name: "Zeta" }],
            matches: [{ homeTeam: "Epsilon", awayTeam: "Zeta", scoreMatrix: fixedScoreline(1, 0) }]
          }
        ]
      })
    ).toThrow("power of two");
  });
});
