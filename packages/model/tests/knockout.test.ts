import { describe, expect, it } from "vitest";
import { simulateKnockoutMatch, simulateKnockoutRound, validateKnockoutFixture } from "../src/index.js";
import type { KnockoutFixtureInput, ScorelineProbability } from "../src/index.js";

function fixedScoreline(homeGoals: number, awayGoals: number): ScorelineProbability[] {
  return [
    {
      homeGoals,
      awayGoals,
      probability: 1
    }
  ];
}

describe("knockout foundation", () => {
  it("always returns a winner", () => {
    const match = simulateKnockoutMatch(fixture("Alpha", "Beta", fixedScoreline(2, 1)), () => 0);

    expect(match.winner).toBe("Alpha");
    expect(match.loser).toBe("Beta");
  });

  it("uses tie-break when simulated knockout match is a draw", () => {
    const match = simulateKnockoutMatch(fixture("Alpha", "Beta", fixedScoreline(1, 1)), () => 0);

    expect(match.tieBreakUsed).toBe(true);
    expect(match.winner).toBe("Alpha");
  });

  it("can resolve a draw for the away team through injected randomness", () => {
    const randomValues = [0, 0.75];
    const match = simulateKnockoutMatch(fixture("Alpha", "Beta", fixedScoreline(0, 0)), () => randomValues.shift() ?? 0);

    expect(match.tieBreakUsed).toBe(true);
    expect(match.winner).toBe("Beta");
  });

  it("returns the expected number of knockout winners", () => {
    const round = simulateKnockoutRound(
      "Semifinals",
      [fixture("Alpha", "Beta", fixedScoreline(1, 0)), fixture("Gamma", "Delta", fixedScoreline(0, 2))],
      () => 0
    );

    expect(round.winners).toEqual(["Alpha", "Delta"]);
  });

  it("rejects invalid fixture inputs", () => {
    expect(() => validateKnockoutFixture(fixture("Alpha", "Alpha", fixedScoreline(1, 0)))).toThrow("different");
  });
});

function fixture(homeTeam: string, awayTeam: string, scoreMatrix: ScorelineProbability[]): KnockoutFixtureInput {
  return {
    homeTeam,
    awayTeam,
    scoreMatrix
  };
}
