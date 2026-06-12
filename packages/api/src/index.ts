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
  predictMatchFromLiveElo,
  simulateMatch,
  simulateTournamentFoundation
} from "./routes.js";

export type { ApiRuntime, ApiRuntimeErrorResponse, ApiRuntimeFailureResponse, ApiRuntimeValidationErrorResponse } from "./runtime.js";

export type { EloXgPreset, EloXgPresetConfig, LiveEloAttackDefenseConfig, LiveEloAttackDefenseMetadata } from "../../model/src/index.js";

export type {
  LiveEloRatedTeamEntry,
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
  TournamentSimulationTeamResult
} from "./schemas.js";
