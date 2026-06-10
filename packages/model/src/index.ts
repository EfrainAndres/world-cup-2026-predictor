export type {
  EloConfig,
  EloMatch,
  EloMatchRatingHistory,
  EloProcessResult,
  EloRatingEntry,
  EloRatingMap,
  EloResult,
  DixonColesConfig,
  ExpectedGoalsInput,
  OutcomeProbabilities,
  PoissonConfig,
  ScorelineProbability,
  MonteCarloMatchSimulationResult,
  MonteCarloSimulationConfig,
  RandomFunction,
  SimulatedScoreline,
  SimulatedScorelineSummary
} from "./types.js";

export {
  DEFAULT_ELO_CONFIG,
  calculateExpectedScore,
  calculateRatingDelta,
  deriveEloResult,
  getCurrentTeamRatings,
  getRatingHistoryByTeam,
  initializeTeamRatings,
  processMatches,
  resultToScore,
  updateRatingsAfterMatch
} from "./elo.js";

export {
  DEFAULT_POISSON_CONFIG,
  calculateScorelineProbability,
  factorial,
  generateScoreMatrix,
  poissonProbability,
  validateExpectedGoals
} from "./poisson.js";

export { aggregateOutcomeProbabilities, getMostLikelyScorelines } from "./probability.js";

export {
  DEFAULT_DIXON_COLES_CONFIG,
  calculateDixonColesScorelineProbability,
  dixonColesAdjustmentFactor,
  generateDixonColesScoreMatrix
} from "./dixon-coles.js";

export { createSeededRandom, runMatchSimulations, simulateOneMatch, validateProbabilityMatrix } from "./simulation.js";
