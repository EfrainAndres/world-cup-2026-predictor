import type {
  MonteCarloMatchSimulationResult,
  MonteCarloSimulationConfig,
  RandomFunction,
  ScorelineProbability,
  SimulatedScoreline,
  SimulatedScorelineSummary
} from "./types.js";

const PROBABILITY_TOTAL_TOLERANCE = 1e-6;
const MAX_SIMULATION_COUNT = 1_000_000;

interface CumulativeScoreline extends SimulatedScoreline {
  cumulativeProbability: number;
}

function validateSimulationCount(simulationCount: number): void {
  validatePositiveInteger(simulationCount, "simulationCount");

  if (simulationCount > MAX_SIMULATION_COUNT) {
    throw new Error(`simulationCount must be ${MAX_SIMULATION_COUNT} or less.`);
  }
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function validateMostCommonScorelineLimit(limit: number): void {
  validatePositiveInteger(limit, "mostCommonScorelineLimit");

  if (limit > MAX_SIMULATION_COUNT) {
    throw new Error(`mostCommonScorelineLimit must be ${MAX_SIMULATION_COUNT} or less.`);
  }
}

function validateRandomValue(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error("random function must return a finite number from 0 inclusive to 1 exclusive.");
  }
}

function validateSeed(seed: number): void {
  if (!Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new Error("seed must be a finite integer.");
  }
}

export function createSeededRandom(seed: number): RandomFunction {
  validateSeed(seed);

  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export function validateProbabilityMatrix(scoreMatrix: readonly ScorelineProbability[]): void {
  if (scoreMatrix.length === 0) {
    throw new Error("scoreMatrix must include at least one scoreline.");
  }

  const totalProbability = scoreMatrix.reduce((sum, scoreline) => {
    if (!Number.isInteger(scoreline.homeGoals) || scoreline.homeGoals < 0) {
      throw new Error("homeGoals must be a non-negative integer.");
    }

    if (!Number.isInteger(scoreline.awayGoals) || scoreline.awayGoals < 0) {
      throw new Error("awayGoals must be a non-negative integer.");
    }

    if (!Number.isFinite(scoreline.probability) || scoreline.probability < 0) {
      throw new Error("scoreline probability must be finite and non-negative.");
    }

    return sum + scoreline.probability;
  }, 0);

  if (Math.abs(totalProbability - 1) > PROBABILITY_TOTAL_TOLERANCE) {
    throw new Error("scoreMatrix probabilities must sum to 1 within tolerance.");
  }
}

function createCumulativeDistribution(scoreMatrix: readonly ScorelineProbability[]): CumulativeScoreline[] {
  validateProbabilityMatrix(scoreMatrix);

  let cumulativeProbability = 0;

  return scoreMatrix.map((scoreline, index) => {
    cumulativeProbability += scoreline.probability;

    return {
      homeGoals: scoreline.homeGoals,
      awayGoals: scoreline.awayGoals,
      cumulativeProbability: index === scoreMatrix.length - 1 ? 1 : cumulativeProbability
    };
  });
}

function getRandomFunction(config?: Pick<MonteCarloSimulationConfig, "random" | "seed">): RandomFunction {
  if (config?.random !== undefined) {
    return config.random;
  }

  if (config?.seed !== undefined) {
    return createSeededRandom(config.seed);
  }

  return Math.random;
}

export function simulateOneMatch(
  scoreMatrix: readonly ScorelineProbability[],
  config?: Pick<MonteCarloSimulationConfig, "random" | "seed">
): SimulatedScoreline {
  const random = getRandomFunction(config);
  const randomValue = random();
  validateRandomValue(randomValue);

  const cumulativeDistribution = createCumulativeDistribution(scoreMatrix);
  const selectedScoreline = cumulativeDistribution.find((scoreline) => randomValue < scoreline.cumulativeProbability);

  if (selectedScoreline === undefined) {
    const fallback = cumulativeDistribution[cumulativeDistribution.length - 1];

    if (fallback === undefined) {
      throw new Error("scoreMatrix must include at least one scoreline.");
    }

    return {
      homeGoals: fallback.homeGoals,
      awayGoals: fallback.awayGoals
    };
  }

  return {
    homeGoals: selectedScoreline.homeGoals,
    awayGoals: selectedScoreline.awayGoals
  };
}

function toScorelineKey(scoreline: SimulatedScoreline): string {
  return `${scoreline.homeGoals}-${scoreline.awayGoals}`;
}

function summarizeMostCommonScorelines(scorelineCounts: ReadonlyMap<string, number>, simulationCount: number, limit: number): SimulatedScorelineSummary[] {
  return [...scorelineCounts.entries()]
    .map(([scorelineKey, count]) => {
      const [homeGoalsText, awayGoalsText] = scorelineKey.split("-");
      const homeGoals = Number(homeGoalsText);
      const awayGoals = Number(awayGoalsText);

      if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)) {
        throw new Error(`Invalid simulated scoreline key: ${scorelineKey}`);
      }

      return {
        homeGoals,
        awayGoals,
        count,
        estimatedProbability: count / simulationCount
      };
    })
    .sort((a, b) => b.count - a.count || a.homeGoals - b.homeGoals || a.awayGoals - b.awayGoals)
    .slice(0, limit);
}

export function runMatchSimulations(
  scoreMatrix: readonly ScorelineProbability[],
  config: MonteCarloSimulationConfig
): MonteCarloMatchSimulationResult {
  validateSimulationCount(config.simulationCount);
  validateProbabilityMatrix(scoreMatrix);

  const random = getRandomFunction(config);
  const cumulativeDistribution = createCumulativeDistribution(scoreMatrix);
  const scorelineCounts = new Map<string, number>();
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  for (let simulationIndex = 0; simulationIndex < config.simulationCount; simulationIndex += 1) {
    const randomValue = random();
    validateRandomValue(randomValue);

    const selectedScoreline = cumulativeDistribution.find((scoreline) => randomValue < scoreline.cumulativeProbability);
    const simulatedScoreline = selectedScoreline ?? cumulativeDistribution[cumulativeDistribution.length - 1];

    if (simulatedScoreline === undefined) {
      throw new Error("scoreMatrix must include at least one scoreline.");
    }

    if (simulatedScoreline.homeGoals > simulatedScoreline.awayGoals) {
      homeWins += 1;
    } else if (simulatedScoreline.homeGoals === simulatedScoreline.awayGoals) {
      draws += 1;
    } else {
      awayWins += 1;
    }

    const scorelineKey = toScorelineKey(simulatedScoreline);
    scorelineCounts.set(scorelineKey, (scorelineCounts.get(scorelineKey) ?? 0) + 1);
  }

  const mostCommonScorelineLimit = config.mostCommonScorelineLimit ?? 5;
  validateMostCommonScorelineLimit(mostCommonScorelineLimit);

  return {
    homeWins,
    draws,
    awayWins,
    estimatedHomeWinProbability: homeWins / config.simulationCount,
    estimatedDrawProbability: draws / config.simulationCount,
    estimatedAwayWinProbability: awayWins / config.simulationCount,
    mostCommonScorelines: summarizeMostCommonScorelines(scorelineCounts, config.simulationCount, mostCommonScorelineLimit),
    simulationCount: config.simulationCount
  };
}
