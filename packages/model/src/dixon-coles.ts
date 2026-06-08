import { calculateScorelineProbability, DEFAULT_POISSON_CONFIG, validateExpectedGoals } from "./poisson.js";
import type { DixonColesConfig, ExpectedGoalsInput, ScorelineProbability } from "./types.js";

export const DEFAULT_DIXON_COLES_CONFIG: DixonColesConfig = {
  ...DEFAULT_POISSON_CONFIG,
  rho: -0.1
};

function validateRho(rho: number): void {
  if (!Number.isFinite(rho) || rho <= -1 || rho >= 1) {
    throw new Error("rho must be a finite number greater than -1 and less than 1.");
  }
}

function validateGoalCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function validateDixonColesConfig(config: DixonColesConfig): void {
  validateRho(config.rho);
  validateGoalCount(config.maxGoals, "maxGoals");

  if (config.maxGoals > 20) {
    throw new Error("maxGoals must be 20 or less for this foundation implementation.");
  }
}

function validateAdjustmentFactor(factor: number): number {
  if (!Number.isFinite(factor) || factor < 0) {
    throw new Error("Dixon-Coles adjustment factor must be finite and non-negative.");
  }

  return factor;
}

function normalizeScoreMatrix(scoreMatrix: readonly ScorelineProbability[]): ScorelineProbability[] {
  const totalProbability = scoreMatrix.reduce((sum, scoreline) => sum + scoreline.probability, 0);

  if (totalProbability <= 0) {
    throw new Error("Adjusted score matrix probability total must be greater than 0.");
  }

  return scoreMatrix.map((scoreline) => ({
    ...scoreline,
    probability: scoreline.probability / totalProbability
  }));
}

// Foundation only: this applies the standard Dixon-Coles low-score shape with a fixed rho.
// Real calibration against historical data is intentionally deferred to a future backtesting phase.
export function dixonColesAdjustmentFactor(
  input: ExpectedGoalsInput,
  homeGoals: number,
  awayGoals: number,
  rho = DEFAULT_DIXON_COLES_CONFIG.rho
): number {
  validateExpectedGoals(input);
  validateGoalCount(homeGoals, "homeGoals");
  validateGoalCount(awayGoals, "awayGoals");
  validateRho(rho);

  if (homeGoals === 0 && awayGoals === 0) {
    return validateAdjustmentFactor(1 - input.expectedHomeGoals * input.expectedAwayGoals * rho);
  }

  if (homeGoals === 0 && awayGoals === 1) {
    return validateAdjustmentFactor(1 + input.expectedHomeGoals * rho);
  }

  if (homeGoals === 1 && awayGoals === 0) {
    return validateAdjustmentFactor(1 + input.expectedAwayGoals * rho);
  }

  if (homeGoals === 1 && awayGoals === 1) {
    return validateAdjustmentFactor(1 - rho);
  }

  return 1;
}

export function calculateDixonColesScorelineProbability(
  input: ExpectedGoalsInput,
  homeGoals: number,
  awayGoals: number,
  config: DixonColesConfig = DEFAULT_DIXON_COLES_CONFIG
): ScorelineProbability {
  const baseScoreline = calculateScorelineProbability(input, homeGoals, awayGoals);
  const adjustmentFactor = dixonColesAdjustmentFactor(input, homeGoals, awayGoals, config.rho);
  const adjustedProbability = baseScoreline.probability * adjustmentFactor;

  if (!Number.isFinite(adjustedProbability) || adjustedProbability < 0) {
    throw new Error("Dixon-Coles adjustment produced an invalid probability.");
  }

  return {
    ...baseScoreline,
    probability: adjustedProbability
  };
}

export function generateDixonColesScoreMatrix(
  input: ExpectedGoalsInput,
  config: DixonColesConfig = DEFAULT_DIXON_COLES_CONFIG
): ScorelineProbability[] {
  validateExpectedGoals(input);
  validateDixonColesConfig(config);

  const scoreMatrix: ScorelineProbability[] = [];

  for (let homeGoals = 0; homeGoals <= config.maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= config.maxGoals; awayGoals += 1) {
      scoreMatrix.push(calculateDixonColesScorelineProbability(input, homeGoals, awayGoals, config));
    }
  }

  if (!config.normalizeMatrix) {
    return scoreMatrix;
  }

  return normalizeScoreMatrix(scoreMatrix);
}
