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
  SimulatedScorelineSummary,
  GroupInput,
  GroupMatchInput,
  GroupStanding,
  KnockoutFixtureInput,
  SimulatedGroupMatch,
  SimulatedGroupResult,
  SimulatedKnockoutMatch,
  SimulatedKnockoutRound,
  SimulatedTournamentResult,
  TournamentInput,
  TournamentMetadata,
  TournamentSimulationConfig,
  TournamentTeamInput,
  TournamentRepeatedRunsConfig,
  TournamentRepeatedRunsMetadata,
  TournamentRepeatedRunsResult,
  TournamentTeamProbabilitySummary,
  FIFA2026BracketSlot,
  FIFA2026Group,
  FIFA2026GroupId,
  FIFA2026GroupStanding,
  FIFA2026QualifiedTeam,
  FIFA2026QualificationSource,
  FIFA2026RoundOf32Fixture,
  FIFA2026Team,
  FIFA2026TournamentFormat
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

export { createInitialStandings, simulateGroup, sortGroupStandings, validateGroupInput } from "./group-stage.js";

export { simulateKnockoutMatch, simulateKnockoutRound, validateKnockoutFixture } from "./knockout.js";

export { simulateTournament } from "./tournament.js";

export { DEFAULT_TOURNAMENT_RUNS_MAX, runTournamentRepeatedRuns, summarizeTeamCounts } from "./tournament-runs.js";

export {
  FIFA_2026_BEST_THIRD_PLACE_TEAMS,
  FIFA_2026_GROUP_COUNT,
  FIFA_2026_GROUP_IDS,
  FIFA_2026_KNOCKOUT_TEAMS,
  FIFA_2026_TEAMS_PER_GROUP,
  FIFA_2026_TOP_TEAMS_PER_GROUP,
  FIFA_2026_TOTAL_TEAMS,
  FIFA_2026_TOURNAMENT_FORMAT,
  rankFIFA2026ThirdPlaceTeams,
  selectFIFA2026BestThirdPlaceTeams,
  selectFIFA2026GroupRunnersUp,
  selectFIFA2026GroupWinners,
  selectFIFA2026QualifiedTeams,
  validateFIFA2026Groups
} from "./fifa-2026-format.js";

export {
  FIFA_2026_ROUND_OF_32_FIXTURE_COUNT,
  buildSimpleFIFA2026RoundOf32Fixtures,
  validateFIFA2026RoundOf32Fixtures
} from "./fifa-2026-fixtures.js";
