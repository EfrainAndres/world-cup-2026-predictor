export { getHealth } from "./health.js";
export { getModelInfo } from "./model-info.js";
export { apiRoutes, getHistoricalReplayAudit, getHistoricalTournamentSummary, simulateMatch } from "./routes.js";

export type {
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
  ModelInfoResponse,
  SimulateMatchMonteCarloRequest,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SimulateMatchSuccessResponse,
  SimulateMatchValidationErrorResponse,
  SupportedHistoricalTournamentYear
} from "./schemas.js";
