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
  getWorldCup2026DailyMatches,
  getWorldCup2026GroupDetail,
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
  getWorldCup2026ModelRealitySummary,
  listWorldCup2026PredictionHistory
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
export {
  buildWorldCup2026DailyMatches,
  WORLD_CUP_2026_DISPLAY_TIMEZONE
} from "./daily-matches.js";
export type { BuildWorldCup2026DailyMatchesInput } from "./daily-matches.js";
export { buildWorldCup2026GroupDetail } from "./group-detail.js";
export type { BuildWorldCup2026GroupDetailInput } from "./group-detail.js";
export {
  assessProjectionRefresh,
  buildProjectionFingerprint,
  CURRENT_FORMULA_VERSION,
  CURRENT_MODEL_VERSION,
  PROJECTION_FRESHNESS_UPCOMING_MS,
  PROJECTION_FRESHNESS_THRESHOLDS
} from "./projection-refresh-policy.js";
export type { AssessProjectionRefreshInput } from "./projection-refresh-policy.js";
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
export { resolveTournamentFormPredictionAdjustment } from "./tournament-form-prediction-integration.js";
export type {
  ResolveTournamentFormPredictionAdjustmentInput
} from "./tournament-form-prediction-integration.js";
export { canonicalizeForHash, computeContentHash, buildSnapshotIdempotencyKey, buildSnapshotId, buildWorldCup2026PredictionSnapshot, WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "./snapshot-service.js";
export type { BuildSnapshotInput } from "./snapshot-service.js";
export { createInMemorySnapshotStore, defaultSnapshotStore } from "./snapshot-store.js";
export type { PredictionSnapshotStore } from "./snapshot-store.js";
export {
  SNAPSHOT_SCHEMA_VERSION,
  SnapshotStorageError,
  createAsyncInMemorySnapshotStore
} from "./async-snapshot-store.js";
export type {
  AsyncPredictionSnapshotStore,
  SnapshotStorageErrorCode
} from "./async-snapshot-store.js";
export {
  createPostgresPredictionSnapshotStore,
  snapshotToInsertParams,
  rowToSnapshot
} from "./postgres-snapshot-store.js";
export type { SnapshotInsertParams } from "./postgres-snapshot-store.js";
export {
  EVALUATION_SCHEMA_VERSION,
  createAsyncInMemoryEvaluationStore
} from "./async-evaluation-store.js";
export type {
  AsyncPredictionEvaluationStore,
  AsyncInMemoryEvaluationStoreOptions
} from "./async-evaluation-store.js";
export {
  createPostgresPredictionEvaluationStore,
  evaluationToInsertParams,
  rowToEvaluation
} from "./postgres-evaluation-store.js";
export type { EvaluationInsertParams } from "./postgres-evaluation-store.js";
export {
  PROJECTION_CACHE_SCHEMA_VERSION,
  PROJECTION_CACHE_TTL_MS,
  buildProjectionCacheKey,
  computeProjectionCacheExpiresAt,
  createInMemoryGroupProjectionCacheStore
} from "./async-projection-cache.js";
export type {
  GroupProjectionCacheStore,
  GroupProjectionCacheGetInput,
  GroupProjectionCacheSetInput,
  GroupProjectionCacheDeleteInput
} from "./async-projection-cache.js";
export { createPostgresGroupProjectionCacheStore } from "./postgres-projection-cache.js";
export {
  PredictionHistoryPersistenceConfigError,
  getPredictionHistoryPersistenceConfig,
  isPredictionHistoryPersistenceError,
  resolvePredictionHistoryPersistence,
  shutdownPredictionHistoryPersistenceForTests
} from "./persistence-runtime.js";
export type {
  PredictionHistoryPersistenceConfig,
  PredictionHistoryPersistenceErrorCode,
  PredictionHistoryPersistenceMetadata,
  PredictionHistoryPersistenceProvider,
  PredictionHistoryPersistenceResolution,
  ResolvePredictionHistoryPersistenceInput
} from "./persistence-runtime.js";
export {
  PREDICTION_HISTORY_ALLOWED_PAGE_SIZES,
  PREDICTION_HISTORY_DEFAULT_PAGE,
  PREDICTION_HISTORY_DEFAULT_PAGE_SIZE,
  PREDICTION_HISTORY_DEFAULT_SORT,
  createInMemoryPredictionHistoryReadStore,
  createPostgresPredictionHistoryReadStore,
  validatePredictionHistoryListQuery
} from "./prediction-history.js";
export type {
  PredictionHistoryReadStore,
  PredictionHistoryListResult,
  ValidatedPredictionHistoryListQuery
} from "./prediction-history.js";
export {
  WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
  buildWorldCup2026PredictionEvaluationId,
  buildWorldCup2026PredictionCalibrationBuckets,
  calculateOutcomeLogLoss,
  calculateThreeWayBrierScore,
  deriveActualOutcome,
  derivePredictionOutcome,
  evaluateWorldCup2026PredictionSnapshotAsync,
  evaluateWorldCup2026PredictionSnapshot,
  selectTopPredictedScoreline,
  summarizeWorldCup2026ModelReality
} from "./prediction-evaluation-service.js";
export type {
  EvaluateWorldCup2026PredictionSnapshotAsyncInput,
  EvaluateWorldCup2026PredictionSnapshotInput,
  EvaluateWorldCup2026PredictionSnapshotResult
} from "./prediction-evaluation-service.js";
export {
  AutomaticCompletedPredictionEvaluationConfigError,
  __resetCompletedPredictionEvaluationRuntimeForTests,
  createProcessLocalCompletedEvaluationLock,
  evaluateCompletedWorldCup2026PredictionSnapshots,
  runScheduledCompletedPredictionEvaluation
} from "./automatic-completed-prediction-evaluation.js";
export type {
  AutomaticCompletedPredictionEvaluationAction,
  AutomaticCompletedPredictionEvaluationConfigErrorCode,
  AutomaticCompletedPredictionEvaluationLock,
  AutomaticCompletedPredictionEvaluationMode,
  AutomaticCompletedPredictionEvaluationReport,
  AutomaticCompletedPredictionEvaluationResult,
  AutomaticCompletedPredictionEvaluationSummary,
  EvaluateCompletedPredictionsInput,
  RunScheduledAutomaticCompletedPredictionEvaluationInput,
  ScheduledAutomaticCompletedPredictionEvaluationReport
} from "./automatic-completed-prediction-evaluation.js";
export {
  createInMemoryPredictionEvaluationStore,
  defaultPredictionEvaluationStore
} from "./prediction-evaluation-store.js";
export type { PredictionEvaluationStore } from "./prediction-evaluation-store.js";
export {
  FAVORITE_STRENGTH_THRESHOLDS,
  PREDICTION_USEFULNESS_AUDIT_THRESHOLDS,
  buildAuditCompletedFixtures,
  classifyFavoriteStrength,
  runWorldCup2026PredictionUsefulnessAudit,
  selectAuditSnapshotForFixture
} from "./prediction-usefulness-audit.js";
export type {
  AuditCompletedFixture,
  DrawBiasAudit,
  DrawCalibrationBucket,
  FavoriteBucketAudit,
  FavoriteStrength,
  ModalVsAggregateCase,
  PredictionUsefulnessAuditInput,
  PredictionUsefulnessAuditRecord,
  PredictionUsefulnessAuditReport,
  PredictionUsefulnessExclusionReason,
  PredictionUsefulnessFinding,
  PredictionUsefulnessRecommendation,
  ScorelineFrequencyAudit,
  SnapshotSelectionResult,
  TopNUsefulnessAudit,
  UpsetAndBlowoutAudit,
  UpsetBlowoutExample,
  XgCompressionAudit,
  XgEloBucketAudit
} from "./prediction-usefulness-audit.js";
export {
  DEFAULT_PREMATCH_SNAPSHOT_CAPTURE_POLICY,
  PREMATCH_SNAPSHOT_CAPTURE_ADVISORY_LOCK_KEY,
  PREMATCH_SNAPSHOT_CAPTURE_DEFAULT_PRESET,
  PREMATCH_SNAPSHOT_CAPTURE_MAX_FIXTURES_PER_RUN,
  PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS,
  PREMATCH_SNAPSHOT_CAPTURE_POLICY_VERSION,
  PREMATCH_SNAPSHOT_CAPTURE_WINDOW_END_BEFORE_KICKOFF_MINUTES,
  PREMATCH_SNAPSHOT_CAPTURE_WINDOW_START_BEFORE_KICKOFF_MINUTES,
  PreMatchSnapshotCaptureConfigError,
  captureWorldCup2026PreMatchSnapshots,
  createPostgresAdvisoryCaptureLock,
  createProcessLocalCaptureLock,
  evaluatePreMatchCaptureEligibility,
  getPreMatchSnapshotCaptureStatus,
  resolvePreMatchSnapshotCapturePolicy,
  runScheduledPreMatchSnapshotCapture
} from "./prematch-snapshot-capture.js";
export type {
  CapturePreMatchSnapshotsInput,
  CapturePreMatchSnapshotsReport,
  GetPreMatchSnapshotCaptureStatusInput,
  PreMatchCaptureAction,
  PreMatchCaptureEligibility,
  PreMatchCaptureEligibilityInput,
  PreMatchCaptureEligibilityResult,
  PreMatchSnapshotCaptureConfigErrorCode,
  PreMatchSnapshotCaptureLock,
  PreMatchSnapshotCapturePolicy,
  PreMatchSnapshotCaptureResult,
  PreMatchSnapshotCaptureStatus,
  PreMatchSnapshotPredictor,
  ResolvedPreMatchSnapshotCapturePolicy,
  RunScheduledPreMatchSnapshotCaptureInput,
  ScheduledPreMatchSnapshotCaptureReport
} from "./prematch-snapshot-capture.js";
export {
  assessProviderReadiness,
  runPreMatchCaptureActivationPreflight
} from "./prematch-capture-preflight.js";
export type {
  DatabaseConnectivityResult,
  PreflightChecks,
  PreMatchCaptureActivationPreflightResult,
  ProviderReadinessReport,
  RunPreMatchCaptureActivationPreflightInput,
  ScheduledCaptureActivationStatus,
  ScheduledCaptureActivationVerdict
} from "./prematch-capture-preflight.js";
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
export { buildWorldCup2026MatchContext } from "./match-context.js";
export type { BuildWorldCup2026MatchContextInput } from "./match-context.js";
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

export type { EloToXgFormulaVersion, EloXgPreset, EloXgPresetConfig, LiveEloAttackDefenseConfig, LiveEloAttackDefenseMetadata } from "../../model/src/index.js";

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
  GetWorldCup2026DailyMatchesInput,
  GetWorldCup2026GroupDetailInput,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchIssue,
  WorldCup2026DailyMatchIssueCode,
  WorldCup2026DailyMatchSnapshotSummary,
  WorldCup2026DailyMatchState,
  WorldCup2026DailyMatchesCounts,
  WorldCup2026DailyMatchesProviderMetadata,
  WorldCup2026DailyMatchesResponse,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026DailyMatchesValidationErrorResponse,
  WorldCup2026GroupDetailMatch,
  WorldCup2026GroupDetailProviderMetadata,
  WorldCup2026GroupDetailQualificationSummary,
  WorldCup2026GroupDetailResponse,
  WorldCup2026GroupDetailSuccessResponse,
  WorldCup2026GroupDetailTeamEntry,
  WorldCup2026GroupDetailValidationErrorResponse,
  WorldCup2026GroupProjection,
  WorldCup2026GroupProjectionFixture,
  WorldCup2026GroupProjectionQualification,
  WorldCup2026GroupProjectionSource,
  WorldCup2026GroupProjectionStatus,
  ProjectionRefreshState,
  ProjectionRefreshTriggers,
  ProjectionRefreshSourceVersions,
  ProjectionRefreshAssessment,
  ProjectionFingerprintInput,
  ProjectionInputSummary,
  ProjectionRefreshExecution,
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
  WorldCup2026LiveStandingsIssueCode,
  WorldCup2026LiveStandingsIssue,
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
  GetWorldCup2026ModelRealitySummaryResponse,
  PredictionHistoryEvaluationState,
  PredictionHistoryListSort,
  PredictionHistoryProjectedScore,
  PredictionHistoryExpectedGoals,
  PredictionHistoryOutcomeProbabilities,
  PredictionHistoryConfidenceSummary,
  PredictionHistoryEvaluationSummary,
  PredictionHistoryListItem,
  PredictionHistoryListQuery,
  PredictionHistoryListSummary,
  PredictionHistoryListPagination,
  PredictionHistoryListFilters,
  PredictionHistoryListSuccessResponse,
  PredictionHistoryListValidationErrorResponse,
  PredictionHistoryListResponse,
  WorldCup2026FixtureImportanceLevel,
  WorldCup2026MatchContext,
  WorldCup2026MatchContextErrorCode,
  WorldCup2026MatchContextFallbackState,
  WorldCup2026MatchContextFixtureImportance,
  WorldCup2026MatchContextGroup,
  WorldCup2026MatchContextProviderFreshness,
  WorldCup2026MatchContextQualificationState,
  WorldCup2026MatchContextQualificationStatus,
  WorldCup2026MatchContextError,
  WorldCup2026MatchContextResult,
  WorldCup2026MatchContextStandingsContext,
  WorldCup2026MatchContextSuccess,
  WorldCup2026MatchContextStandingsMode,
  WorldCup2026MatchContextTournamentForm,
  WorldCup2026TeamStandingContext
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
export {
  LIVE_EVIDENCE_GATE_THRESHOLDS,
  classifyLiveEvidenceFavoriteStrength,
  runLiveEvidenceGate
} from "./live-prediction-evidence-gate.js";
export type {
  LiveEvidenceCoreMetrics,
  LiveEvidenceCounts,
  LiveEvidenceDataQualityAssessment,
  LiveEvidenceDrawCalibration,
  LiveEvidenceDrawCalibrationBucket,
  LiveEvidenceExcludedSnapshot,
  LiveEvidenceFavoriteBucket,
  LiveEvidenceFavoriteSeparation,
  LiveEvidenceFavoriteStrength,
  LiveEvidenceFinding,
  LiveEvidenceGateDecision,
  LiveEvidenceGateInput,
  LiveEvidenceGateReport,
  LiveEvidenceScorelineConcentration,
  LiveEvidenceScorelineEntry,
  LiveEvidenceSegment,
  LiveEvidenceSelectionExclusionReason,
  LiveEvidenceSelectionSummary,
  LiveEvidenceXgCompression,
  LiveEvidenceXgStrengthBucket
} from "./live-prediction-evidence-gate.js";
export {
  UNKNOWN_TEAM_VISUAL_IDENTITY,
  WORLD_CUP_2026_TEAM_IDENTITIES,
  assertAllCanonicalTeamsCovered,
  getTeamFlagPath,
  getTeamVisualIdentity,
  isKnownTeam,
  resolveTeamVisualIdentity
} from "./world-cup-2026-team-identity.js";
export type { WorldCup2026TeamVisualIdentity } from "./world-cup-2026-team-identity.js";
