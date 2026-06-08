import { describe, expect, it } from "vitest";
import {
  DEFAULT_POISSON_CONFIG,
  calculateScorelineProbability,
  factorial,
  generateScoreMatrix,
  poissonProbability
} from "../src/index.js";

describe("Poisson goal model foundation", () => {
  it("calculates factorial values", () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(5)).toBe(120);
  });

  it("calculates Poisson probability for a known simple case", () => {
    expect(poissonProbability(2, 3)).toBeCloseTo(0.180447, 6);
  });

  it("calculates scoreline probability from independent goal distributions", () => {
    const scoreline = calculateScorelineProbability(
      {
        expectedHomeGoals: 1,
        expectedAwayGoals: 1
      },
      0,
      0
    );

    expect(scoreline.probability).toBeCloseTo(Math.exp(-2), 10);
  });

  it("generates a score matrix with the configured shape", () => {
    const matrix = generateScoreMatrix({
      expectedHomeGoals: 1.4,
      expectedAwayGoals: 1.1
    });

    expect(matrix).toHaveLength((DEFAULT_POISSON_CONFIG.maxGoals + 1) ** 2);
  });

  it("generates positive finite scoreline probabilities", () => {
    const matrix = generateScoreMatrix({
      expectedHomeGoals: 1.4,
      expectedAwayGoals: 1.1
    });

    expect(matrix.every((scoreline) => Number.isFinite(scoreline.probability) && scoreline.probability >= 0)).toBe(true);
  });

  it("throws for invalid expected goals", () => {
    expect(() =>
      generateScoreMatrix({
        expectedHomeGoals: -1,
        expectedAwayGoals: 1
      })
    ).toThrow("expectedHomeGoals");
  });
});
