import { describe, expect, it } from "vitest";
import {
  aggregateOutcomeProbabilities,
  generateScoreMatrix,
  runMatchSimulations,
  simulateOneMatch,
  validateProbabilityMatrix
} from "../src/index.js";
import type { ScorelineProbability } from "../src/index.js";

const scoreMatrix = generateScoreMatrix({
  expectedHomeGoals: 1.5,
  expectedAwayGoals: 1.1
});

describe("Monte Carlo match simulation engine", () => {
  it("produces reproducible seeded simulations", () => {
    const firstRun = runMatchSimulations(scoreMatrix, {
      simulationCount: 500,
      seed: 2026
    });
    const secondRun = runMatchSimulations(scoreMatrix, {
      simulationCount: 500,
      seed: 2026
    });

    expect(secondRun).toEqual(firstRun);
  });

  it("simulates one valid scoreline from the matrix", () => {
    const simulated = simulateOneMatch(scoreMatrix, {
      random: () => 0
    });
    const scorelineExists = scoreMatrix.some(
      (scoreline) => scoreline.homeGoals === simulated.homeGoals && scoreline.awayGoals === simulated.awayGoals
    );

    expect(scorelineExists).toBe(true);
  });

  it("returns the requested simulation count", () => {
    const result = runMatchSimulations(scoreMatrix, {
      simulationCount: 250,
      seed: 7
    });

    expect(result.simulationCount).toBe(250);
  });

  it("returns result counts that sum to the simulation count", () => {
    const result = runMatchSimulations(scoreMatrix, {
      simulationCount: 250,
      seed: 7
    });

    expect(result.homeWins + result.draws + result.awayWins).toBe(result.simulationCount);
  });

  it("returns estimated probabilities that sum close to 1", () => {
    const result = runMatchSimulations(scoreMatrix, {
      simulationCount: 250,
      seed: 7
    });

    expect(
      result.estimatedHomeWinProbability + result.estimatedDrawProbability + result.estimatedAwayWinProbability
    ).toBeCloseTo(1, 10);
  });

  it("returns most common scorelines sorted by count", () => {
    const result = runMatchSimulations(scoreMatrix, {
      simulationCount: 1_000,
      seed: 99,
      mostCommonScorelineLimit: 4
    });

    expect(result.mostCommonScorelines).toHaveLength(4);

    for (let index = 1; index < result.mostCommonScorelines.length; index += 1) {
      const previousCount = result.mostCommonScorelines[index - 1]?.count ?? 0;
      const currentCount = result.mostCommonScorelines[index]?.count ?? 0;

      expect(previousCount).toBeGreaterThanOrEqual(currentCount);
    }
  });

  it("rejects invalid simulation counts", () => {
    expect(() =>
      runMatchSimulations(scoreMatrix, {
        simulationCount: 0,
        seed: 1
      })
    ).toThrow("simulationCount");
  });

  it("rejects invalid probability matrices", () => {
    const invalidMatrix: ScorelineProbability[] = [
      {
        homeGoals: 0,
        awayGoals: 0,
        probability: 0.5
      }
    ];

    expect(() => validateProbabilityMatrix(invalidMatrix)).toThrow("sum to 1");
  });

  it("does not mutate the input matrix", () => {
    const matrixCopy = scoreMatrix.map((scoreline) => ({ ...scoreline }));

    runMatchSimulations(scoreMatrix, {
      simulationCount: 100,
      seed: 123
    });

    expect(scoreMatrix).toEqual(matrixCopy);
  });

  it("approximates analytical probabilities when simulation count is high", () => {
    const analytical = aggregateOutcomeProbabilities(scoreMatrix);
    const simulated = runMatchSimulations(scoreMatrix, {
      simulationCount: 20_000,
      seed: 42
    });

    expect(simulated.estimatedHomeWinProbability).toBeCloseTo(analytical.homeWinProbability, 1);
    expect(simulated.estimatedDrawProbability).toBeCloseTo(analytical.drawProbability, 1);
    expect(simulated.estimatedAwayWinProbability).toBeCloseTo(analytical.awayWinProbability, 1);
  });
});
