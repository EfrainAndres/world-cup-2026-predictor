export type {
  EloConfig,
  EloMatch,
  EloMatchRatingHistory,
  EloProcessResult,
  EloRatingEntry,
  EloRatingMap,
  EloResult
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
