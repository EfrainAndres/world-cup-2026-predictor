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
  getWorldCup2026ResultsProviderFoundation,
  getWorldCup2026GroupStandingsFoundation,
  getWorldCup2026KnockoutBracketFoundation,
  getWorldCup2026RoundOf32Foundation,
  predictMatchFromLiveElo,
  simulateMatch,
  simulateTournamentFoundation,
  simulateWorldCup2026KnockoutFixturesFoundation,
  simulateWorldCup2026RoundOf16Foundation,
  simulateWorldCup2026RoundOf16MatchesFoundation,
  simulateWorldCup2026QuarterfinalFoundation,
  simulateWorldCup2026QuarterfinalMatchesFoundation,
  simulateWorldCup2026SemifinalFoundation,
  simulateWorldCup2026SemifinalMatchesFoundation,
  simulateWorldCup2026FinalFoundation,
  simulateWorldCup2026FinalMatchFoundation,
  resolveWorldCup2026KnockoutWinnersFoundation,
  getWorldCup2026ThirdPlaceMatchFoundation,
  simulateWorldCup2026ThirdPlaceMatchFoundation,
  getWorldCup2026EloIngestionFoundation,
  getWorldCup2026TournamentFormFoundation,
  createWorldCup2026PredictionSnapshot,
  getWorldCup2026PredictionSnapshot,
  listWorldCup2026PredictionSnapshots,
  createWorldCup2026PredictionEvaluation,
  getWorldCup2026PredictionEvaluation,
  listWorldCup2026PredictionEvaluations,
  getWorldCup2026ModelRealitySummary
} from "./routes.js";
export {
  createCachedResultsProvider,
  createExternalApiResultsProvider,
  createLocalStaticResultsProvider,
  normalizeExternalFixtureRecords,
  resolveWorldCup2026ResultsProviderFoundation,
  toExternalStandings,
  toFixtureResultsFromExternalRecords
} from "./results-provider-foundation.js";
export {
  createFootballDataOrgResultsProvider,
  synchronizeWorldCup2026Results
} from "./live-results-sync.js";
export type { FootballDataOrgProviderConfig, SynchronizeWorldCup2026ResultsInput } from "./live-results-sync.js";
export { getWorldCup2026LiveGroupStandings } from "./live-group-standings.js";
export type { GetWorldCup2026LiveGroupStandingsInput } from "./live-group-standings.js";
export { ingestWorldCup2026ResultsIntoLiveElo, isBeforeCutoff } from "./elo-ingestion.js";
export type { IngestWorldCup2026ResultsIntoLiveEloInput } from "./elo-ingestion.js";
export {
  WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
  WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES,
  WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT,
  WORLD_CUP_2026_TOURNAMENT_FORM_RESULT_WEIGHT,
  WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_WEIGHT,
  WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP,
  WORLD_CUP_2026_TOURNAMENT_FORM_OPPONENT_STRENGTH_WEIGHT,
  calculateWorldCup2026TournamentForm
} from "./tournament-form.js";
export type { CalculateWorldCup2026TournamentFormInput } from "./tournament-form.js";
export { canonicalizeForHash, computeContentHash, buildSnapshotIdempotencyKey, buildSnapshotId, buildWorldCup2026PredictionSnapshot, WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "./snapshot-service.js";
export type { BuildSnapshotInput } from "./snapshot-service.js";
export { createInMemorySnapshotStore, defaultSnapshotStore } from "./snapshot-store.js";
export type { PredictionSnapshotStore } from "./snapshot-store.js";
export {
  WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
  buildWorldCup2026PredictionEvaluationId,
  buildWorldCup2026PredictionCalibrationBuckets,
  calculateOutcomeLogLoss,
  calculateThreeWayBrierScore,
  deriveActualOutcome,
  derivePredictionOutcome,
  evaluateWorldCup2026PredictionSnapshot,
  selectTopPredictedScoreline,
  summarizeWorldCup2026ModelReality
} from "./prediction-evaluation-service.js";
export type {
  EvaluateWorldCup2026PredictionSnapshotInput,
  EvaluateWorldCup2026PredictionSnapshotResult
} from "./prediction-evaluation-service.js";
export {
  createInMemoryPredictionEvaluationStore,
  defaultPredictionEvaluationStore
} from "./prediction-evaluation-store.js";
export type { PredictionEvaluationStore } from "./prediction-evaluation-store.js";
export {
  WORLD_CUP_2026_BEST_THIRD_PLACE_RANKING,
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_FALLBACK_RATING_WARNING,
  WORLD_CUP_2026_FALLBACK_SEED_RATING,
  WORLD_CUP_2026_GROUP_STANDINGS,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_GROUPS,
  WORLD_CUP_2026_KNOCKOUT_BRACKET,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA,
  WORLD_CUP_2026_LOCAL_STATIC_RESULTS,
  WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT,
  WORLD_CUP_2026_QUALIFIED_TEAMS,
  WORLD_CUP_2026_ROUND_OF_32_FIXTURES,
  WORLD_CUP_2026_TEAM_NAMES,
  WORLD_CUP_2026_TEAMS,
  buildWorldCup2026BestThirdPlaceRanking,
  buildWorldCup2026GroupStandings,
  buildWorldCup2026KnockoutBracket,
  buildWorldCup2026QualifiedTeams,
  buildWorldCup2026RoundOf32Fixtures,
  buildWorldCup2026FixtureGroups,
  buildWorldCup2026GroupFixtures,
  buildWorldCup2026CoverageEntries
} from "./world-cup-2026-teams.js";
export {
  assessPredictionConfidence
} from "./prediction-confidence.js";
export {
  TEAM_ALIASES,
  canonicalizeTeamName,
  getAvailableTeamCoverage,
  normalizeTeamSearchText,
  resolveTeamAlias,
  suggestAvailableTeams
} from "./team-aliases.js";

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
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026ExternalStandingRecord,
  WorldCup2026FinalFixture,
  WorldCup2026FinalFoundationResponse,
  WorldCup2026FinalMatchSimulationFixture,
  WorldCup2026FinalMatchSimulationFoundationResponse,
  WorldCup2026FinalQualifier,
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
  PredictionConfidenceAssessment,
  PredictionConfidenceDataPoints,
  PredictionConfidenceLevel,
  PredictionCoverageType,
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
  WorldCup2026FixtureResult,
  WorldCup2026FixtureStatus,
  WorldCup2026Group,
  WorldCup2026GroupStandingEntry,
  WorldCup2026GroupStandings,
  WorldCup2026GroupStandingsFoundationResponse,
  WorldCup2026QualificationSource,
  WorldCup2026QualifiedTeamEntry,
  WorldCup2026ResultProviderMetadata,
  WorldCup2026ResultSource,
  WorldCup2026KnockoutBracketFixture,
  WorldCup2026KnockoutBracketFoundationResponse,
  WorldCup2026KnockoutRound,
  WorldCup2026KnockoutSimulationFixture,
  WorldCup2026KnockoutSimulationFoundationResponse,
  WorldCup2026ProjectedQualifier,
  WorldCup2026RoundOf16Fixture,
  WorldCup2026RoundOf16FoundationResponse,
  WorldCup2026RoundOf16MatchSimulationFixture,
  WorldCup2026RoundOf16MatchSimulationFoundationResponse,
  WorldCup2026QuarterfinalFixture,
  WorldCup2026QuarterfinalFoundationResponse,
  WorldCup2026QuarterfinalMatchSimulationFixture,
  WorldCup2026QuarterfinalMatchSimulationFoundationResponse,
  WorldCup2026QuarterfinalQualifier,
  WorldCup2026SemifinalFixture,
  WorldCup2026SemifinalFoundationResponse,
  WorldCup2026SemifinalMatchSimulationFixture,
  WorldCup2026SemifinalMatchSimulationFoundationResponse,
  WorldCup2026SemifinalQualifier,
  WorldCup2026RoundOf32Fixture,
  WorldCup2026RoundOf32FoundationResponse,
  WorldCup2026ResolvedKnockoutWinner,
  WorldCup2026ResultsProviderError,
  WorldCup2026ResultsProviderErrorCode,
  WorldCup2026ResultsProviderFoundationResponse,
  WorldCup2026ResultsProviderFoundationSource,
  WorldCup2026KnockoutWinnerResolutionResponse,
  WorldCup2026ThirdPlaceParticipant,
  WorldCup2026ThirdPlaceMatchFixture,
  WorldCup2026ThirdPlaceMatchFoundationResponse,
  WorldCup2026ThirdPlaceMatchSimulationFixture,
  WorldCup2026ThirdPlaceMatchSimulationFoundationResponse,
  WorldCup2026SyncProviderMode,
  WorldCup2026SyncResult,
  WorldCup2026StandingsMode,
  WorldCup2026LiveStandingsSyncMetadata,
  WorldCup2026LiveGroupStandingsResponse,
  WorldCup2026EloIngestionIssueCode,
  WorldCup2026EloIngestionIssue,
  WorldCup2026EloIngestionRecord,
  WorldCup2026TournamentAdjustedEloEntry,
  WorldCup2026EloIngestionMetadata,
  WorldCup2026EloIngestionResult,
  WorldCup2026EloIngestionFoundationResponse,
  WorldCup2026TournamentFormIssueCode,
  WorldCup2026TournamentFormIssue,
  WorldCup2026TournamentFormTeamSummary,
  WorldCup2026TournamentFormMetadata,
  WorldCup2026TournamentFormResult,
  GetWorldCup2026TournamentFormFoundationInput,
  WorldCup2026TournamentFormFoundationResponse,
  PredictionSnapshotStatus,
  WorldCup2026PredictionSnapshotModelConfig,
  WorldCup2026PredictionSnapshotInputs,
  WorldCup2026PredictionSnapshotScoreline,
  WorldCup2026PredictionSnapshotPrediction,
  WorldCup2026PredictionSnapshotProvenance,
  WorldCup2026PredictionSnapshot,
  WorldCup2026PredictionSnapshotCreateResult,
  CreateWorldCup2026PredictionSnapshotRequest,
  CreateWorldCup2026PredictionSnapshotSuccessResponse,
  CreateWorldCup2026PredictionSnapshotValidationErrorResponse,
  CreateWorldCup2026PredictionSnapshotResponse,
  GetWorldCup2026PredictionSnapshotSuccessResponse,
  GetWorldCup2026PredictionSnapshotNotFoundResponse,
  GetWorldCup2026PredictionSnapshotResponse,
  ListWorldCup2026PredictionSnapshotsResponse,
  PredictionOutcome,
  PredictionEvaluationStatus,
  WorldCup2026PredictionEvaluationIssueCode,
  WorldCup2026PredictionEvaluationIssue,
  WorldCup2026PredictionEvaluationPredictedScoreline,
  WorldCup2026PredictionEvaluationPredicted,
  WorldCup2026PredictionEvaluationActual,
  WorldCup2026PredictionEvaluationMetrics,
  WorldCup2026PredictionEvaluationConfidence,
  WorldCup2026PredictionEvaluationProvenance,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionEvaluationCreateResult,
  CreateWorldCup2026PredictionEvaluationRequest,
  CreateWorldCup2026PredictionEvaluationSuccessResponse,
  CreateWorldCup2026PredictionEvaluationNotEligibleResponse,
  CreateWorldCup2026PredictionEvaluationResponse,
  GetWorldCup2026PredictionEvaluationSuccessResponse,
  GetWorldCup2026PredictionEvaluationNotFoundResponse,
  GetWorldCup2026PredictionEvaluationResponse,
  ListWorldCup2026PredictionEvaluationsResponse,
  WorldCup2026PredictionCalibrationBucket,
  WorldCup2026ModelRealityConfidenceSummary,
  WorldCup2026ModelRealityCoverageSummary,
  WorldCup2026ModelRealityFallbackSummary,
  WorldCup2026ModelRealitySummary,
  GetWorldCup2026ModelRealitySummaryResponse
} from "./schemas.js";

export type {
  ResolveWorldCup2026ResultsProviderInput,
  WorldCup2026FootballResultsProvider,
  WorldCup2026ResultsProviderFailure,
  WorldCup2026ResultsProviderResult,
  WorldCup2026ResultsProviderSuccess
} from "./results-provider-foundation.js";
export type {
  BuildWorldCup2026GroupStandingsInput,
  WorldCup2026CoverageEntry,
  WorldCup2026GroupName,
  WorldCup2026RatingSource,
  WorldCup2026ResultProvider,
  WorldCup2026TeamEntry
} from "./world-cup-2026-teams.js";
export type { TeamAliasResolution, TeamCoverageEntry } from "./team-aliases.js";
