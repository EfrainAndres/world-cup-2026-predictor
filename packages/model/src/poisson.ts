import type { ExpectedGoalsInput, PoissonConfig, ScorelineProbability } from "./types.js";

export const DEFAULT_POISSON_CONFIG: PoissonConfig = {
  maxGoals: 7,
  normalizeMatrix: true
};

function validateExpectedGoalsValue(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite number greater than or equal to 0.`);
  }
}

function validateGoalCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function validatePoissonConfig(config: PoissonConfig): void {
  validateGoalCount(config.maxGoals, "maxGoals");

  if (config.maxGoals > 20) {
    throw new Error("maxGoals must be 20 or less for this foundation implementation.");
  }
}

export function validateExpectedGoals(input: ExpectedGoalsInput): void {
  validateExpectedGoalsValue(input.expectedHomeGoals, "expectedHomeGoals");
  validateExpectedGoalsValue(input.expectedAwayGoals, "expectedAwayGoals");
}

export function factorial(value: number): number {
  validateGoalCount(value, "factorial input");

  let result = 1;

  for (let current = 2; current <= value; current += 1) {
    result *= current;
  }

  return result;
}

export function poissonProbability(expectedGoals: number, goals: number): number {
  validateExpectedGoalsValue(expectedGoals, "expectedGoals");
  validateGoalCount(goals, "goals");

  if (expectedGoals === 0) {
    return goals === 0 ? 1 : 0;
  }

  return (Math.exp(-expectedGoals) * expectedGoals ** goals) / factorial(goals);
}

export function calculateScorelineProbability(input: ExpectedGoalsInput, homeGoals: number, awayGoals: number): ScorelineProbability {
  validateExpectedGoals(input);
  validateGoalCount(homeGoals, "homeGoals");
  validateGoalCount(awayGoals, "awayGoals");

  return {
    homeGoals,
    awayGoals,
    probability: poissonProbability(input.expectedHomeGoals, homeGoals) * poissonProbability(input.expectedAwayGoals, awayGoals)
  };
}

export function generateScoreMatrix(
  input: ExpectedGoalsInput,
  config: PoissonConfig = DEFAULT_POISSON_CONFIG
): ScorelineProbability[] {
  validateExpectedGoals(input);
  validatePoissonConfig(config);

  const scoreMatrix: ScorelineProbability[] = [];

  for (let homeGoals = 0; homeGoals <= config.maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= config.maxGoals; awayGoals += 1) {
      scoreMatrix.push(calculateScorelineProbability(input, homeGoals, awayGoals));
    }
  }

  if (!config.normalizeMatrix) {
    return scoreMatrix;
  }

  const totalProbability = scoreMatrix.reduce((sum, scoreline) => sum + scoreline.probability, 0);

  if (totalProbability <= 0) {
    throw new Error("Score matrix probability total must be greater than 0.");
  }

  return scoreMatrix.map((scoreline) => ({
    ...scoreline,
    probability: scoreline.probability / totalProbability
  }));
}
