import { describe, expect, it } from "vitest";
import { simulateGroup, sortGroupStandings, validateGroupInput } from "../src/index.js";
import type { GroupInput, GroupStanding, ScorelineProbability } from "../src/index.js";

function fixedScoreline(homeGoals: number, awayGoals: number): ScorelineProbability[] {
  return [
    {
      homeGoals,
      awayGoals,
      probability: 1
    }
  ];
}

const fourTeamGroup: GroupInput = {
  name: "Group A",
  qualifiersCount: 2,
  teams: [{ name: "Alpha" }, { name: "Beta" }, { name: "Gamma" }, { name: "Delta" }],
  matches: [
    { homeTeam: "Alpha", awayTeam: "Beta", scoreMatrix: fixedScoreline(1, 0) },
    { homeTeam: "Alpha", awayTeam: "Gamma", scoreMatrix: fixedScoreline(2, 0) },
    { homeTeam: "Alpha", awayTeam: "Delta", scoreMatrix: fixedScoreline(1, 0) },
    { homeTeam: "Beta", awayTeam: "Gamma", scoreMatrix: fixedScoreline(1, 0) },
    { homeTeam: "Beta", awayTeam: "Delta", scoreMatrix: fixedScoreline(1, 0) },
    { homeTeam: "Gamma", awayTeam: "Delta", scoreMatrix: fixedScoreline(1, 0) }
  ]
};

describe("group-stage foundation", () => {
  it("calculates group standings points", () => {
    const result = simulateGroup(
      {
        name: "Group Points",
        qualifiersCount: 1,
        teams: [{ name: "Alpha" }, { name: "Beta" }],
        matches: [{ homeTeam: "Alpha", awayTeam: "Beta", scoreMatrix: fixedScoreline(2, 0) }]
      },
      () => 0
    );

    expect(result.standings.find((standing) => standing.team === "Alpha")?.points).toBe(3);
    expect(result.standings.find((standing) => standing.team === "Beta")?.points).toBe(0);
  });

  it("sorts standings by points", () => {
    const standings = sortGroupStandings([
      standing("Beta", { points: 3 }),
      standing("Alpha", { points: 6 })
    ]);

    expect(standings.map((entry) => entry.team)).toEqual(["Alpha", "Beta"]);
  });

  it("sorts standings by goal difference", () => {
    const standings = sortGroupStandings([
      standing("Alpha", { points: 3, goalDifference: 1 }),
      standing("Beta", { points: 3, goalDifference: 2 })
    ]);

    expect(standings.map((entry) => entry.team)).toEqual(["Beta", "Alpha"]);
  });

  it("sorts standings by goals for", () => {
    const standings = sortGroupStandings([
      standing("Alpha", { points: 3, goalDifference: 1, goalsFor: 2 }),
      standing("Beta", { points: 3, goalDifference: 1, goalsFor: 3 })
    ]);

    expect(standings.map((entry) => entry.team)).toEqual(["Beta", "Alpha"]);
  });

  it("uses deterministic team name fallback sorting", () => {
    const standings = sortGroupStandings([standing("Beta"), standing("Alpha")]);

    expect(standings.map((entry) => entry.team)).toEqual(["Alpha", "Beta"]);
  });

  it("selects top qualifiers correctly", () => {
    const result = simulateGroup(fourTeamGroup, () => 0);

    expect(result.qualifiers.map((standing) => standing.team)).toEqual(["Alpha", "Beta"]);
  });

  it("rejects invalid group inputs", () => {
    expect(() =>
      validateGroupInput({
        name: "Invalid",
        teams: [{ name: "Alpha" }, { name: "Alpha" }],
        matches: []
      })
    ).toThrow("duplicate team");
  });
});

function standing(team: string, overrides: Partial<GroupStanding> = {}): GroupStanding {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    ...overrides
  };
}
