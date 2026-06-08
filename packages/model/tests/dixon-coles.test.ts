import { describe, expect, it } from "vitest";
import {
  aggregateOutcomeProbabilities,
  calculateDixonColesScorelineProbability,
  calculateScorelineProbability,
  dixonColesAdjustmentFactor,
  generateDixonColesScoreMatrix
} from "../src/index.js";

const expectedGoals = {
  expectedHomeGoals: 1.3,
  expectedAwayGoals: 1.1
};

describe("Dixon-Coles foundation", () => {
  it("adjusts low-score outcomes", () => {
    const adjusted = dixonColesAdjustmentFactor(expectedGoals, 0, 0, -0.1);

    expect(adjusted).not.toBe(1);
    expect(adjusted).toBeGreaterThan(1);
  });

  it("does not adjust high-score outcomes directly", () => {
    expect(dixonColesAdjustmentFactor(expectedGoals, 2, 2, -0.1)).toBe(1);
  });

  it("changes low-score scoreline probabilities", () => {
    const poissonScoreline = calculateScorelineProbability(expectedGoals, 1, 1);
    const adjustedScoreline = calculateDixonColesScorelineProbability(expectedGoals, 1, 1);

    expect(adjustedScoreline.probability).not.toBe(poissonScoreline.probability);
  });

  it("does not apply unexpected direct changes to high-score probabilities", () => {
    const poissonScoreline = calculateScorelineProbability(expectedGoals, 2, 2);
    const adjustedScoreline = calculateDixonColesScorelineProbability(expectedGoals, 2, 2);

    expect(adjustedScoreline.probability).toBe(poissonScoreline.probability);
  });

  it("generates adjusted probabilities that still sum close to 1 after aggregation", () => {
    const matrix = generateDixonColesScoreMatrix(expectedGoals);
    const probabilities = aggregateOutcomeProbabilities(matrix);

    expect(probabilities.totalProbability).toBeCloseTo(1, 10);
  });

  it("throws when rho is outside the foundation bounds", () => {
    expect(() =>
      calculateDixonColesScorelineProbability(expectedGoals, 0, 0, {
        maxGoals: 7,
        normalizeMatrix: true,
        rho: 1
      })
    ).toThrow("rho");
  });
});
