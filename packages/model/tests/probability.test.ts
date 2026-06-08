import { describe, expect, it } from "vitest";
import { aggregateOutcomeProbabilities, generateScoreMatrix, getMostLikelyScorelines } from "../src/index.js";

describe("Outcome probability aggregation", () => {
  it("aggregates score matrix probabilities into home, draw, and away outcomes", () => {
    const matrix = generateScoreMatrix({
      expectedHomeGoals: 1.5,
      expectedAwayGoals: 0.9
    });
    const probabilities = aggregateOutcomeProbabilities(matrix);

    expect(probabilities.homeWinProbability).toBeGreaterThan(probabilities.awayWinProbability);
    expect(probabilities.drawProbability).toBeGreaterThan(0);
    expect(probabilities.totalProbability).toBeCloseTo(1, 10);
  });

  it("returns most likely scorelines sorted by probability", () => {
    const matrix = generateScoreMatrix({
      expectedHomeGoals: 1.5,
      expectedAwayGoals: 0.9
    });
    const scorelines = getMostLikelyScorelines(matrix, 4);

    expect(scorelines).toHaveLength(4);

    for (let index = 1; index < scorelines.length; index += 1) {
      expect(scorelines[index - 1]?.probability).toBeGreaterThanOrEqual(scorelines[index]?.probability ?? 0);
    }
  });

  it("throws for an empty score matrix", () => {
    expect(() => aggregateOutcomeProbabilities([])).toThrow("scoreMatrix");
  });

  it("throws for invalid scoreline probabilities", () => {
    expect(() =>
      aggregateOutcomeProbabilities([
        {
          homeGoals: 1,
          awayGoals: 0,
          probability: Number.NaN
        }
      ])
    ).toThrow("scoreline probability");
  });
});
