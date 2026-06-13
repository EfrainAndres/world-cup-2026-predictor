export { getHealth } from "./health.js";
export { getModelInfo } from "./model-info.js";
export { apiRuntime, createApiRuntime, handleApiRuntimeRequest } from "./runtime.js";
export {
  apiRoutes,
  getAvailableLiveEloTeams,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getLiveEloRatingsFoundation,
  getTeamRatingsFoundation,
  getWorldCup2026FixtureFoundation,
  predictMatchFromLiveElo,
  simulateMatch,
  simulateTournamentFoundation
} from "./routes.js";
export {
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_FALLBACK_RATING_WARNING,
  WORLD_CUP_2026_FALLBACK_SEED_RATING,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_GROUPS,
  WORLD_CUP_2026_TEAM_NAMES,
  WORLD_CUP_2026_TEAMS,
  buildWorldCup2026FixtureGroups,
  buildWorldCup2026GroupFixtures,
  buildWorldCup2026CoverageEntries
} from "./world-cup-2026-teams.js";

export type { ApiRuntime, ApiRuntimeErrorResponse, ApiRuntimeFailureResponse, ApiRuntimeValidationErrorResponse } from "./runtime.js";

export type { EloXgPreset, EloXgPresetConfig, LiveEloAttackDefenseConfig, LiveEloAttackDefenseMetadata } from "../../model/src/index.js";

export type {
  LiveEloRatedTeamEntry,
  LiveEloRatingSource,
  LiveEloRatingsFoundationResponse,
  ApiFoundationResponseStatus,
  ApiMetadata,
  ApiRoutes,
  ApiStatus,
  ApiValidationIssue,
  HealthResponse,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  HistoricalTournamentSummaryResponse,
  HistoricalTournamentSummarySuccessResponse,
  HistoricalTournamentSummaryValidationErrorResponse,
  LiveEloRatingsFoundationOptions,
  ModelInfoResponse,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  PredictMatchFromLiveEloSuccessResponse,
  PredictMatchFromLiveEloValidationErrorResponse,
  SimulateMatchMonteCarloRequest,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SimulateMatchSuccessResponse,
  SimulateMatchValidationErrorResponse,
  SupportedHistoricalTournamentYear,
  TeamRatingFoundationEntry,
  TeamRatingTier,
  TeamRatingsFoundationResponse,
  TournamentSimulationSuccessResponse,
  TournamentSimulationTeamResult,
  WorldCup2026Fixture,
  WorldCup2026FixtureFoundationResponse,
  WorldCup2026Group
} from "./schemas.js";

export type {
  WorldCup2026CoverageEntry,
  WorldCup2026GroupName,
  WorldCup2026RatingSource,
  WorldCup2026TeamEntry
} from "./world-cup-2026-teams.js";
