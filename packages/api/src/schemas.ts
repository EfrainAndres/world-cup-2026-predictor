import type {
  EloToXgFormulaVersion,
  EloXgPreset,
  LiveEloAttackDefenseConfig,
  LiveEloAttackDefenseMetadata,
  LiveEloCompetitionWeightingConfig,
  LiveEloCompetitionWeightingMetadata,
  LiveEloHomeAdvantageConfig,
  LiveEloHomeAdvantageMetadata,
  LiveEloRecencyWeightingConfig,
  LiveEloRecencyWeightingMetadata,
  MonteCarloMatchSimulationResult,
  OutcomeProbabilities,
  ScorelinePresentation,
  ScorelineProbability
} from "../../model/src/index.js";

export type { ScorelinePresentation };

export type { EloXgPreset };

export type ApiStatus = "ok" | "error";
export type ApiFoundationResponseStatus = "success" | "validation_error";
export type SupportedHistoricalTournamentYear = 2010 | 2014 | 2018 | 2022;
export type LiveEloRatingSource = "live_elo_pipeline" | "fallback_seed";
export type PredictionConfidenceLevel = "high" | "medium" | "low" | "very_low";
export type PredictionCoverageType = "full" | "partial" | "fallback" | "fallback_only";

export interface ApiMetadata {
  apiVersion: string;
  mode: "pure_handlers";
  serverEnabled: boolean;
  databaseEnabled: boolean;
  externalServicesEnabled: boolean;
  notes: readonly string[];
}

export interface HealthResponse {
  status: ApiStatus;
  service: "world-cup-2026-predictor-api";
  version: string;
  metadata: ApiMetadata;
}

export interface ModelInfoResponse {
  status: ApiStatus;
  modelPackage: string;
  modelScope: readonly string[];
  supportedHandlers: readonly string[];
  limitations: readonly string[];
  metadata: ApiMetadata;
}

export type PredictionHistoryPersistenceProvider = "memory" | "postgres";

export type PredictionHistoryPersistenceErrorCode =
  | "invalid_provider"
  | "missing_database_url"
  | "connection_unavailable"
  | "migration_missing"
  | "duplicate_conflict"
  | "foreign_key_violation"
  | "invalid_stored_record"
  | "unsupported_schema_version"
  | "query_failed"
  | "invalid_cache_key"
  | "invalid_expiration";

export interface PredictionHistoryPersistenceMetadata {
  provider: PredictionHistoryPersistenceProvider;
  persistent: boolean;
  configuredProvider: string;
}

export interface PredictionHistoryPersistenceErrorResponse {
  status: "error";
  error: {
    code: PredictionHistoryPersistenceErrorCode;
    message: string;
  };
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface SimulateMatchMonteCarloRequest {
  simulationCount: number;
  seed?: number;
  mostCommonScorelineLimit?: number;
}

export interface SimulateMatchRequest {
  homeTeam: string;
  awayTeam: string;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  maxGoals?: number;
  normalizeMatrix?: boolean;
  mostLikelyScorelineLimit?: number;
  monteCarlo?: SimulateMatchMonteCarloRequest;
}

export interface ApiValidationIssue {
  field: string;
  message: string;
  suggestions?: readonly string[];
}

export interface SimulateMatchSuccessResponse {
  status: "success";
  request: {
    homeTeam: string;
    awayTeam: string;
    expectedHomeGoals: number;
    expectedAwayGoals: number;
    maxGoals: number;
    normalizeMatrix: boolean;
  };
  outcomeProbabilities: OutcomeProbabilities;
  mostLikelyScorelines: ScorelineProbability[];
  monteCarloSimulation?: MonteCarloMatchSimulationResult;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface SimulateMatchValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

export type SimulateMatchResponse = SimulateMatchSuccessResponse | SimulateMatchValidationErrorResponse;

export interface PredictMatchFromLiveEloRequest {
  homeTeam: string;
  awayTeam: string;
  maxGoals?: number;
  normalizeMatrix?: boolean;
  mostLikelyScorelineLimit?: number;
  monteCarlo?: SimulateMatchMonteCarloRequest;
  preset?: EloXgPreset;
  tournamentResultsAdjustment?: {
    enabled: boolean;
    cutoffAt?: string;
  };
  tournamentFormAdjustment?: {
    enabled: boolean;
    cutoffAt?: string;
  };
  statsBombSignal?: StatsBombPredictionSignalRequest;
}

export interface PredictionConfidenceDataPoints {
  homeUsesFallback: boolean;
  awayUsesFallback: boolean;
  homeMatchesPlayed: number;
  awayMatchesPlayed: number;
  historicalMatchesAvailable: number;
  latestMatchDate?: string | undefined;
  currentTournamentMatchesIncluded?: number | undefined;
  attackDefenseAvailable?: boolean | undefined;
  tournamentFormEnabled?: boolean | undefined;
  tournamentFormApplied?: boolean | undefined;
  homeTournamentFormMatchesIncluded?: number | undefined;
  awayTournamentFormMatchesIncluded?: number | undefined;
  tournamentFormFormulaVersion?: string | undefined;
}

export interface PredictionConfidenceAssessment {
  level: PredictionConfidenceLevel;
  coverageType: PredictionCoverageType;
  reasons: readonly string[];
  dataPoints: PredictionConfidenceDataPoints;
  manualXgRecommended: boolean;
}

export interface PredictMatchFromLiveEloSuccessResponse {
  status: "success";
  request: {
    homeTeam: string;
    awayTeam: string;
    expectedHomeGoals: number;
    expectedAwayGoals: number;
    maxGoals: number;
    normalizeMatrix: boolean;
  };
  expectedGoals: {
    home: number;
    away: number;
    eloDifference: number;
    baseExpectedGoals: number;
    goalsAdjustment: number;
    preset: EloXgPreset;
    presetDescription: string;
    formulaVersion: EloToXgFormulaVersion;
    adjustmentPer100: number;
    maxAdjustment: number;
    v1RollbackAvailable: boolean;
  };
  liveElo: {
    homeTeam: string;
    awayTeam: string;
    homeEloRating: number;
    awayEloRating: number;
    homeRank: number;
    awayRank: number;
    homeMatchesPlayed: number;
    awayMatchesPlayed: number;
    homeGroup: string;
    awayGroup: string;
    homeRatingSource: LiveEloRatingSource;
    awayRatingSource: LiveEloRatingSource;
    fallbackSeedRating: number;
    matchesProcessed: number;
    latestMatchDate: string;
    dataCoverage: string;
    homeInput: string;
    awayInput: string;
    homeMatchedBy: "canonical" | "alias";
    awayMatchedBy: "canonical" | "alias";
  };
  outcomeProbabilities: OutcomeProbabilities;
  mostLikelyScorelines: ScorelineProbability[];
  scorelinePresentation?: ScorelinePresentation;
  predictionConfidence: PredictionConfidenceAssessment;
  monteCarloSimulation?: MonteCarloMatchSimulationResult;
  tournamentAdjustment?: {
    applied: boolean;
    matchesIncluded: number;
  };
  tournamentFormAdjustment?: {
    enabled: boolean;
    applied: boolean;
    cutoffAt?: string;
    home: {
      baselineElo: number;
      adjustment: number;
      effectiveElo: number;
      matchesIncluded: number;
      formScore?: number;
    };
    away: {
      baselineElo: number;
      adjustment: number;
      effectiveElo: number;
      matchesIncluded: number;
      formScore?: number;
    };
    formulaVersion?: string;
    warnings: readonly string[];
  };
  statsBombSignal?: StatsBombSignalResponseMetadata;
  attackDefenseGoalModel?: AttackDefenseGoalModelRuntimeMetadata;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface AttackDefenseGoalModelProfileSummary {
  coverage: string;
  matchCount: number;
  cutoffAt: string;
}

export interface AttackDefenseGoalModelRuntimeMetadata {
  mode: "off" | "shadow" | "on";
  applied: boolean;
  reason: string;
  activationDecision?: string;
  candidateId?: string;
  baselineExpectedGoals: { home: number; away: number };
  effectiveExpectedGoals: { home: number; away: number };
  shadowExpectedGoals?: { home: number; away: number };
  homeProfile: AttackDefenseGoalModelProfileSummary | null;
  awayProfile: AttackDefenseGoalModelProfileSummary | null;
  warnings: readonly string[];
}

export interface PredictMatchFromLiveEloValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  availableTeams?: readonly string[];
  metadata: ApiMetadata;
}

export type PredictMatchFromLiveEloResponse =
  | PredictMatchFromLiveEloSuccessResponse
  | PredictMatchFromLiveEloValidationErrorResponse;

export interface HistoricalTournamentSummary {
  year: SupportedHistoricalTournamentYear;
  tournamentName: string;
  matchCount: number;
  expectedMatchCount: number;
  groupStageMatchCount: number;
  knockoutAndPlacementMatchCount: number;
  champion: string;
  runnerUp: string;
  thirdPlace: string;
  datasetStatus: "complete_curated_fixture_foundation";
  warnings: readonly string[];
}

export interface HistoricalTournamentSummarySuccessResponse {
  status: "success";
  summary: HistoricalTournamentSummary;
  metadata: ApiMetadata;
}

export interface HistoricalTournamentSummaryValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  supportedYears: readonly SupportedHistoricalTournamentYear[];
  metadata: ApiMetadata;
}

export type HistoricalTournamentSummaryResponse =
  | HistoricalTournamentSummarySuccessResponse
  | HistoricalTournamentSummaryValidationErrorResponse;

export interface HistoricalReplayAuditResponse {
  status: "success";
  auditVersion: string;
  apiReadiness: "ready_with_warnings";
  supportedYears: readonly SupportedHistoricalTournamentYear[];
  metricAvailability: {
    brierScore: true;
    logLoss: true;
    top1Hit: true;
    top3Hit: true;
    top5Hit: true;
  };
  componentAvailability: {
    datasetCompleteness: true;
    bracketReconstruction: true;
    eloSnapshotReplay: true;
    monteCarloReplay: true;
    replayValidation: true;
  };
  warnings: readonly string[];
  knownGaps: readonly string[];
  metadata: ApiMetadata;
}

export interface TournamentSimulationTeamResult {
  rank: number;
  team: string;
  championProbability: number;
  runnerUpProbability: number;
}

export interface TournamentSimulationSuccessResponse {
  status: "success";
  simulationCount: number;
  tournamentName: string;
  dataScope: "sample_foundation_8_team_tournament";
  teamResults: TournamentSimulationTeamResult[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026Group {
  group: string;
  groupName: string;
  teams: readonly string[];
  fixtureCount: number;
}

export type WorldCup2026FixtureStatus = "scheduled" | "completed";
export type WorldCup2026ResultSource = "local_static" | "manual_override" | "external_api";

export interface WorldCup2026Fixture {
  id: string;
  group: string;
  matchday: number;
  order: number;
  groupFixtureOrder: number;
  homeTeam: string;
  awayTeam: string;
  status: WorldCup2026FixtureStatus;
  dateStatus: "deferred";
  venueStatus: "deferred";
}

export interface WorldCup2026FixtureResult {
  fixtureId: string;
  status: WorldCup2026FixtureStatus;
  homeScore?: number;
  awayScore?: number;
  resultSource: WorldCup2026ResultSource;
  updatedAt?: string;
}

export interface WorldCup2026ResultProviderMetadata {
  providerName: string;
  resultSource: WorldCup2026ResultSource;
  externalProviderEnabled: boolean;
  localOverridesEnabled: boolean;
  resultsCount: number;
  dataUpdatedAt?: string;
  warnings: readonly string[];
}

export type WorldCup2026ExternalMatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "unknown";

export type WorldCup2026MatchDecisionMethod = "regular_time" | "extra_time" | "penalties";

export interface WorldCup2026ExternalFixtureRecord {
  providerFixtureId: string;
  competition: string;
  season: string;
  stage?: string;
  group?: string;
  matchday?: number;
  kickoffAt?: string;
  homeTeam: string;
  awayTeam: string;
  status: WorldCup2026ExternalMatchStatus;
  homeScore?: number;
  awayScore?: number;
  regularTimeHomeScore?: number;
  regularTimeAwayScore?: number;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  winner?: string;
  decisionMethod?: WorldCup2026MatchDecisionMethod;
  venue?: string;
  updatedAt?: string;
}

export interface WorldCup2026ExternalStandingRecord {
  group?: string;
  team: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  updatedAt?: string;
}

export type WorldCup2026ResultsProviderErrorCode =
  | "provider_disabled"
  | "provider_unavailable"
  | "invalid_provider_response"
  | "duplicate_fixture_id"
  | "unsupported_match_status"
  | "stale_cache_unavailable"
  | "normalization_failure";

export interface WorldCup2026ResultsProviderError {
  code: WorldCup2026ResultsProviderErrorCode;
  providerId: string;
  operation: "fixtures" | "live_matches" | "completed_results" | "standings" | "bundle";
  message: string;
  details?: readonly string[];
}

export interface WorldCup2026ResultsProviderFoundationSource {
  currentDefaultProvider: string;
  attemptedProvider: string;
  activeProvider: string;
  cacheUsed: boolean;
  localFallbackUsed: boolean;
  externalProviderEnabled: boolean;
  lastSuccessfulSync?: string;
  warnings: readonly string[];
  normalizationIssues: readonly WorldCup2026ResultsProviderError[];
  error?: WorldCup2026ResultsProviderError;
}

export interface WorldCup2026ResultsProviderFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_results_provider_foundation";
  fixtures: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches: readonly WorldCup2026ExternalFixtureRecord[];
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  standings: readonly WorldCup2026ExternalStandingRecord[];
  provider: WorldCup2026ResultsProviderFoundationSource;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type WorldCup2026SyncProviderMode = "football_data_org" | "local_static";

export interface WorldCup2026SyncResult {
  status: "success" | "error";
  providerMode: WorldCup2026SyncProviderMode;
  activeProvider: string;
  cacheUsed: boolean;
  localFallbackUsed: boolean;
  externalProviderEnabled: boolean;
  syncedAt: string;
  lastSuccessfulSync?: string;
  fixtures: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches: readonly WorldCup2026ExternalFixtureRecord[];
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  standings: readonly WorldCup2026ExternalStandingRecord[];
  normalizationIssues: readonly WorldCup2026ResultsProviderError[];
  warnings: readonly string[];
  error?: WorldCup2026ResultsProviderError;
}

export interface WorldCup2026FixtureFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_group_stage_fixture_foundation";
  groupCount: number;
  teamCount: number;
  fixtureCount: number;
  fixturesPerGroup: number;
  matchesPerTeam: number;
  groups: readonly WorldCup2026Group[];
  fixtures: readonly WorldCup2026Fixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026GroupStandingEntry {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface WorldCup2026GroupStandings {
  group: string;
  groupName: string;
  completedFixtureCount: number;
  pendingFixtureCount: number;
  standings: readonly WorldCup2026GroupStandingEntry[];
}

export interface WorldCup2026GroupStandingsFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_group_standings_foundation";
  groupCount: number;
  teamCount: number;
  completedFixtureCount: number;
  pendingFixtureCount: number;
  resultProvider: WorldCup2026ResultProviderMetadata;
  groups: readonly WorldCup2026GroupStandings[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type WorldCup2026StandingsMode = "official" | "live_provisional" | "projected";

export type WorldCup2026LiveStandingsIssueCode =
  | "invalid_group_label"
  | "missing_group_label"
  | "provider_group_mismatch"
  | "unresolved_canonical_team"
  | "provider_fixture_unresolved"
  | "duplicate_fixture"
  | "invalid_finished_score"
  | "future_record_excluded"
  | "provider_standings_not_grouped"
  | "provider_global_standings_mismatch";

export interface WorldCup2026LiveStandingsIssue {
  code: WorldCup2026LiveStandingsIssueCode;
  providerFixtureId?: string;
  fixtureId?: string;
  group?: string;
  team?: string;
  message: string;
}

export interface WorldCup2026LiveStandingsSyncMetadata {
  mode: WorldCup2026StandingsMode;
  activeProvider: string;
  cacheUsed: boolean;
  localFallbackUsed: boolean;
  externalProviderEnabled: boolean;
  lastSuccessfulSync?: string;
  generatedAt: string;
  activeLiveMatchCount: number;
  completedMatchCount: number;
  warnings: readonly string[];
}

export interface WorldCup2026LiveGroupStandingsResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_live_group_standings";
  groupCount: number;
  teamCount: number;
  officialGroups: readonly WorldCup2026GroupStandings[];
  provisionalGroups: readonly WorldCup2026GroupStandings[] | null;
  projectedGroups: readonly WorldCup2026GroupStandings[] | null;
  activeLiveMatchCount: number;
  completedMatchCount: number;
  syncMetadata: WorldCup2026LiveStandingsSyncMetadata;
  standingsIssues: readonly WorldCup2026LiveStandingsIssue[];
  resultProvider: WorldCup2026ResultProviderMetadata;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type WorldCup2026DailyMatchState =
  | "upcoming"
  | "live"
  | "halftime"
  | "final"
  | "postponed"
  | "cancelled"
  | "unknown";

export type WorldCup2026DailyMatchIssueCode =
  | "duplicate_fixture"
  | "invalid_finished_score"
  | "missing_kickoff";

export interface WorldCup2026DailyMatchSnapshotSummary {
  available: boolean;
  status?: PredictionSnapshotStatus;
  snapshotId?: string;
  capturedAt?: string;
  modelVersion?: string;
}

export interface WorldCup2026DailyMatchProjectedScoreline {
  homeGoals: number;
  awayGoals: number;
}

export interface WorldCup2026DailyMatchPredictionSummary {
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  projectedScoreline?: WorldCup2026DailyMatchProjectedScoreline;
  confidenceLevel?: PredictionConfidenceLevel;
  coverageType?: PredictionCoverageType;
}

export interface WorldCup2026DailyMatchHistorySnapshotSummary
  extends WorldCup2026DailyMatchSnapshotSummary {
  formulaVersion?: EloToXgFormulaVersion;
  prediction?: WorldCup2026DailyMatchPredictionSummary;
}

export interface WorldCup2026DailyMatchHistoryEvaluationMetricsSummary {
  outcomeCorrect: boolean;
  exactScoreCorrect: boolean;
  brierScore: number;
  logLoss: number;
  totalGoalAbsoluteError: number;
}

export interface WorldCup2026DailyMatchHistoryEvaluationSummary {
  available: boolean;
  evaluationId?: string;
  evaluatedAt?: string;
  metrics?: WorldCup2026DailyMatchHistoryEvaluationMetricsSummary;
}

export interface WorldCup2026DailyMatchPredictionHistorySummary {
  snapshot: WorldCup2026DailyMatchHistorySnapshotSummary;
  evaluation: WorldCup2026DailyMatchHistoryEvaluationSummary;
  warnings: readonly string[];
}

export interface WorldCup2026DailyMatchIssue {
  code: WorldCup2026DailyMatchIssueCode;
  fixtureId?: string;
  providerFixtureId?: string;
  message: string;
}

export interface WorldCup2026DailyMatchEntry {
  fixtureId: string;
  providerFixtureId?: string;
  group?: string;
  matchday?: number;
  kickoffAt?: string;
  localizedKickoff?: string;
  homeTeam: string;
  awayTeam: string;
  normalizedStatus: WorldCup2026ExternalMatchStatus;
  state: WorldCup2026DailyMatchState;
  homeScore?: number;
  awayScore?: number;
  regularTimeHomeScore?: number;
  regularTimeAwayScore?: number;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  winner?: string;
  decisionMethod?: WorldCup2026MatchDecisionMethod;
  venue?: string;
  predictionSnapshot: WorldCup2026DailyMatchSnapshotSummary;
  predictionHistory: WorldCup2026DailyMatchPredictionHistorySummary;
  matchContext?: WorldCup2026MatchContext;
}

export interface WorldCup2026DailyMatchesCounts {
  total: number;
  upcoming: number;
  live: number;
  halftime: number;
  final: number;
  postponed: number;
  cancelled: number;
  unknown: number;
  unavailableKickoff: number;
}

export interface WorldCup2026DailyMatchesProviderMetadata {
  configuredProvider: WorldCup2026SyncProviderMode;
  activeProvider: string;
  externalRequestAttempted: boolean;
  cacheUsed: boolean;
  localFallbackUsed: boolean;
  lastSuccessfulSync?: string;
  stale: boolean;
}

export interface GetWorldCup2026DailyMatchesInput {
  date?: string;
  timezone?: string;
}

export interface WorldCup2026DailyMatchesSuccessResponse {
  status: "success";
  requestedDate: string;
  timezone: string;
  generatedAt: string;
  matches: readonly WorldCup2026DailyMatchEntry[];
  unscheduledMatches: readonly WorldCup2026DailyMatchEntry[];
  counts: WorldCup2026DailyMatchesCounts;
  providerMetadata: WorldCup2026DailyMatchesProviderMetadata;
  issues: readonly WorldCup2026DailyMatchIssue[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026DailyMatchesValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

export type WorldCup2026DailyMatchesResponse =
  | WorldCup2026DailyMatchesSuccessResponse
  | WorldCup2026DailyMatchesValidationErrorResponse;

export interface GetWorldCup2026GroupDetailInput {
  group: string;
  timezone?: string;
  previousProjection?: WorldCup2026GroupProjection;
}

export interface WorldCup2026GroupDetailMatch extends Omit<WorldCup2026DailyMatchEntry, "predictionSnapshot"> {
  warnings: readonly string[];
}

export interface WorldCup2026GroupDetailTeamEntry {
  team: string;
  position?: number;
}

export interface WorldCup2026GroupDetailQualificationSummary {
  firstPlace?: string;
  secondPlace?: string;
  thirdPlace?: string;
  thirdPlaceCurrentlyQualifying?: boolean;
  status: "official" | "provisional" | "foundation_only";
}

export interface WorldCup2026GroupDetailProviderMetadata {
  configuredProvider: WorldCup2026SyncProviderMode;
  activeProvider: string;
  cacheUsed: boolean;
  localFallbackUsed: boolean;
  stale: boolean;
  lastSuccessfulSync?: string;
}

export type WorldCup2026GroupProjectionStatus = "complete" | "partial" | "unavailable";
export type WorldCup2026GroupProjectionSource = "stored_snapshot" | "auto_predict" | "unavailable";

export interface WorldCup2026GroupProjectionFixture {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  source: WorldCup2026GroupProjectionSource;
  projectedScoreline?: { homeGoals: number; awayGoals: number };
  homeWinProbability?: number;
  drawProbability?: number;
  awayWinProbability?: number;
  confidenceLevel?: PredictionConfidenceLevel;
  coverageType?: PredictionCoverageType;
  warnings: readonly string[];
  currentFingerprint?: string;
  storedFingerprint?: string;
  refreshAssessment?: ProjectionRefreshAssessment;
  projectionInputSummary?: ProjectionInputSummary;
  refreshExecution?: ProjectionRefreshExecution;
}

export interface WorldCup2026GroupProjectionQualification {
  projectedFirstPlace?: string;
  projectedSecondPlace?: string;
  projectedThirdPlace?: string;
  projectedThirdPlaceQualifying?: boolean;
}

export interface WorldCup2026GroupProjection {
  available: boolean;
  status: WorldCup2026GroupProjectionStatus;
  standings?: readonly WorldCup2026GroupStandingEntry[];
  qualification?: WorldCup2026GroupProjectionQualification;
  fixtures: readonly WorldCup2026GroupProjectionFixture[];
  warnings: readonly string[];
}

export interface ProjectionInputSummary {
  lastSuccessfulSync?: string;
  tournamentMatchesIncluded: number;
  formulaVersion: string;
  modelVersion: string;
  homeElo: number;
  awayElo: number;
}

export interface ProjectionRefreshExecution {
  attempted: boolean;
  completed: boolean;
  previousFingerprint?: string;
  refreshedFingerprint?: string;
  reasonCodes: readonly string[];
  warnings: readonly string[];
}

export type ProjectionRefreshState = "current" | "stale" | "invalidated" | "unavailable";

export interface ProjectionRefreshTriggers {
  providerDataChanged: boolean;
  completedResultAdded: boolean;
  liveStatusChanged: boolean;
  eloInputChanged: boolean;
  tournamentFormChanged: boolean;
  formulaVersionChanged: boolean;
  fixtureStatusChanged: boolean;
  snapshotAvailable: boolean;
}

export interface ProjectionRefreshSourceVersions {
  providerSyncId?: string;
  lastSuccessfulSync?: string;
  formulaVersion?: string;
  modelVersion?: string;
  tournamentFormVersion?: string;
}

export interface ProjectionRefreshAssessment {
  state: ProjectionRefreshState;
  shouldRefresh: boolean;
  projectionGeneratedAt?: string;
  evaluatedAt: string;
  reasons: readonly string[];
  triggers: ProjectionRefreshTriggers;
  sourceVersions: ProjectionRefreshSourceVersions;
}

export interface ProjectionFingerprintInput {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  preset: string;
  formulaVersion: string;
  modelVersion: string;
  homeElo: number;
  awayElo: number;
  tournamentMatchesIncluded: number;
  tournamentFormVersion?: string;
  lastSuccessfulSync?: string;
  projectionCutoffAt?: string;
}

export interface WorldCup2026GroupDetailSuccessResponse {
  status: "success";
  group: string;
  timezone: string;
  generatedAt: string;
  teams: readonly WorldCup2026GroupDetailTeamEntry[];
  standings: {
    official: readonly WorldCup2026GroupStandingEntry[];
    liveProvisional?: readonly WorldCup2026GroupStandingEntry[];
    liveAvailable: boolean;
  };
  matches: {
    completed: readonly WorldCup2026GroupDetailMatch[];
    live: readonly WorldCup2026GroupDetailMatch[];
    upcoming: readonly WorldCup2026GroupDetailMatch[];
    postponed: readonly WorldCup2026GroupDetailMatch[];
    cancelled: readonly WorldCup2026GroupDetailMatch[];
    unscheduled: readonly WorldCup2026GroupDetailMatch[];
  };
  qualification: WorldCup2026GroupDetailQualificationSummary;
  projection: WorldCup2026GroupProjection;
  providerMetadata: WorldCup2026GroupDetailProviderMetadata;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026GroupDetailValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

export type WorldCup2026GroupDetailResponse =
  | WorldCup2026GroupDetailSuccessResponse
  | WorldCup2026GroupDetailValidationErrorResponse;

export type WorldCup2026QualificationSource = "group_winner" | "group_runner_up" | "best_third_place";

export interface WorldCup2026QualifiedTeamEntry extends WorldCup2026GroupStandingEntry {
  group: string;
  groupName: string;
  qualificationSource: WorldCup2026QualificationSource;
  qualificationRank: number;
}

export interface WorldCup2026RoundOf32Fixture {
  fixtureId: string;
  round: "round_of_32";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeQualificationSource: WorldCup2026QualificationSource;
  awayQualificationSource: WorldCup2026QualificationSource;
  status: "projected";
}

export interface WorldCup2026RoundOf32FoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_round_of_32_foundation";
  totalQualifiedTeams: number;
  groupWinners: number;
  groupRunnersUp: number;
  bestThirdPlaceTeams: number;
  fixturesCount: number;
  source: "current_local_standings_foundation";
  qualifiedTeams: readonly WorldCup2026QualifiedTeamEntry[];
  fixtures: readonly WorldCup2026RoundOf32Fixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type WorldCup2026KnockoutRound = "round_of_32" | "round_of_16" | "quarterfinals" | "semifinals" | "third_place" | "final";

export interface WorldCup2026KnockoutBracketFixture {
  fixtureId: string;
  round: WorldCup2026KnockoutRound;
  slot: number;
  homeTeam: string;
  awayTeam: string;
  source: string;
  status: "projected";
}

export interface WorldCup2026KnockoutBracketFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_knockout_bracket_foundation";
  roundOf32: readonly WorldCup2026KnockoutBracketFixture[];
  roundOf16: readonly WorldCup2026KnockoutBracketFixture[];
  quarterfinals: readonly WorldCup2026KnockoutBracketFixture[];
  semifinals: readonly WorldCup2026KnockoutBracketFixture[];
  thirdPlaceMatch: WorldCup2026KnockoutBracketFixture;
  final: WorldCup2026KnockoutBracketFixture;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026KnockoutSimulationFixture {
  fixtureId: string;
  round: "round_of_32";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly ScorelineProbability[];
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  warnings: readonly string[];
}

export interface WorldCup2026KnockoutSimulationFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_knockout_simulation_foundation";
  simulatedFixturesCount: number;
  round: "round_of_32";
  simulationType: "match_level_foundation";
  source: "projected_round_of_32";
  fixtures: readonly WorldCup2026KnockoutSimulationFixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026ProjectedQualifier {
  team: string;
  qualificationSource: "round_of_32";
  sourceFixtureId: string;
  sourceSlot: number;
  advancementReason: string;
  sourceHomeTeam: string;
  sourceAwayTeam: string;
  sourceHomeWinProbability: number;
  sourceDrawProbability: number;
  sourceAwayWinProbability: number;
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
}

export interface WorldCup2026RoundOf16Fixture {
  fixtureId: string;
  round: "round_of_16";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeQualifier: WorldCup2026ProjectedQualifier;
  awayQualifier: WorldCup2026ProjectedQualifier;
  status: "projected";
}

export interface WorldCup2026RoundOf16FoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_round_of_16_foundation";
  round: "round_of_16";
  projectedQualifiersCount: number;
  fixturesCount: number;
  simulationType: "deterministic_winner_selection";
  source: "round_of_32_simulation_foundation";
  projectedRoundOf16Teams: readonly WorldCup2026ProjectedQualifier[];
  projectedRoundOf16Fixtures: readonly WorldCup2026RoundOf16Fixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026RoundOf16MatchSimulationFixture {
  fixtureId: string;
  round: "round_of_16";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly ScorelineProbability[];
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  warnings: readonly string[];
}

export interface WorldCup2026RoundOf16MatchSimulationFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_round_of_16_match_simulation_foundation";
  simulatedFixturesCount: number;
  round: "round_of_16";
  simulationType: "match_level_foundation";
  source: "projected_round_of_16";
  fixtures: readonly WorldCup2026RoundOf16MatchSimulationFixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026QuarterfinalQualifier {
  team: string;
  qualificationSource: "round_of_16";
  sourceFixtureId: string;
  sourceSlot: number;
  advancementReason: string;
  sourceHomeTeam: string;
  sourceAwayTeam: string;
  sourceHomeWinProbability: number;
  sourceDrawProbability: number;
  sourceAwayWinProbability: number;
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
}

export interface WorldCup2026QuarterfinalFixture {
  fixtureId: string;
  round: "quarterfinals";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeQualifier: WorldCup2026QuarterfinalQualifier;
  awayQualifier: WorldCup2026QuarterfinalQualifier;
  status: "projected";
}

export interface WorldCup2026QuarterfinalFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_quarterfinal_foundation";
  round: "quarterfinals";
  projectedQualifiersCount: number;
  fixturesCount: number;
  simulationType: "deterministic_winner_selection";
  source: "round_of_16_match_simulation_foundation";
  projectedQuarterfinalTeams: readonly WorldCup2026QuarterfinalQualifier[];
  projectedQuarterfinalFixtures: readonly WorldCup2026QuarterfinalFixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026QuarterfinalMatchSimulationFixture {
  fixtureId: string;
  round: "quarterfinal";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly ScorelineProbability[];
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  warnings: readonly string[];
}

export interface WorldCup2026QuarterfinalMatchSimulationFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_quarterfinal_match_simulation_foundation";
  simulatedFixturesCount: number;
  round: "quarterfinal";
  simulationType: "match_level_foundation";
  source: "projected_quarterfinals";
  fixtures: readonly WorldCup2026QuarterfinalMatchSimulationFixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026SemifinalQualifier {
  team: string;
  qualificationSource: "quarterfinal";
  sourceFixtureId: string;
  sourceSlot: number;
  advancementReason: string;
  probabilitySnapshot: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
  };
  sourceHomeTeam: string;
  sourceAwayTeam: string;
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
}

export interface WorldCup2026SemifinalFixture {
  fixtureId: string;
  round: "semifinal";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeQualifier: WorldCup2026SemifinalQualifier;
  awayQualifier: WorldCup2026SemifinalQualifier;
  status: "projected";
}

export interface WorldCup2026SemifinalFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_semifinal_foundation";
  round: "semifinal";
  projectedSemifinalTeamsCount: number;
  fixturesCount: number;
  simulationType: "deterministic_winner_selection";
  source: "quarterfinal_match_simulation_foundation";
  projectedSemifinalTeams: readonly WorldCup2026SemifinalQualifier[];
  projectedSemifinalFixtures: readonly WorldCup2026SemifinalFixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026SemifinalMatchSimulationFixture {
  fixtureId: string;
  round: "semifinal";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly ScorelineProbability[];
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  warnings: readonly string[];
}

export interface WorldCup2026SemifinalMatchSimulationFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_semifinal_match_simulation_foundation";
  simulatedFixturesCount: number;
  round: "semifinal";
  simulationType: "match_level_foundation";
  source: "projected_semifinals";
  fixtures: readonly WorldCup2026SemifinalMatchSimulationFixture[];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026FinalQualifier {
  team: string;
  qualificationSource: "semifinal";
  semifinalSourceFixtureId: string;
  sourceSlot: number;
  advancementReason: string;
  probabilitySnapshot: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
  };
  sourceHomeTeam: string;
  sourceAwayTeam: string;
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
}

export interface WorldCup2026FinalFixture {
  fixtureId: string;
  round: "final";
  slot: 1;
  homeTeam: string;
  awayTeam: string;
  homeQualifier: WorldCup2026FinalQualifier;
  awayQualifier: WorldCup2026FinalQualifier;
  status: "projected";
}

export interface WorldCup2026FinalFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_final_foundation";
  round: "final";
  projectedFinalistsCount: number;
  fixturesCount: number;
  simulationType: "deterministic_winner_selection";
  source: "projected_semifinals";
  projectedFinalists: readonly WorldCup2026FinalQualifier[];
  projectedFinalFixtures: readonly [WorldCup2026FinalFixture];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026FinalMatchSimulationFixture {
  fixtureId: string;
  round: "final";
  slot: 1;
  homeTeam: string;
  awayTeam: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly ScorelineProbability[];
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  warnings: readonly string[];
}

export interface WorldCup2026FinalMatchSimulationFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_final_match_simulation_foundation";
  simulatedFixturesCount: 1;
  round: "final";
  simulationType: "match_level_foundation";
  source: "projected_final";
  fixtures: readonly [WorldCup2026FinalMatchSimulationFixture];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026ThirdPlaceParticipant {
  team: string;
  semifinalSourceFixtureId: string;
  lostTo: string;
  eliminationReason: string;
  probabilitySnapshot: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
  };
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
}

export interface WorldCup2026ThirdPlaceMatchFixture {
  fixtureId: string;
  round: "third_place";
  homeTeam: string;
  awayTeam: string;
  homeParticipant: WorldCup2026ThirdPlaceParticipant;
  awayParticipant: WorldCup2026ThirdPlaceParticipant;
  status: "projected";
  source: "projected_semifinal_losers";
}

export interface WorldCup2026ThirdPlaceMatchFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_third_place_match_foundation";
  round: "third_place";
  participantsCount: 2;
  fixturesCount: 1;
  simulationType: "fixture_foundation";
  source: "projected_semifinal_losers";
  projectedParticipants: readonly [WorldCup2026ThirdPlaceParticipant, WorldCup2026ThirdPlaceParticipant];
  thirdPlaceMatchFixture: WorldCup2026ThirdPlaceMatchFixture;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026ThirdPlaceMatchSimulationFixture {
  fixtureId: string;
  round: "third_place";
  homeTeam: string;
  awayTeam: string;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly ScorelineProbability[];
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  warnings: readonly string[];
}

export interface WorldCup2026ThirdPlaceMatchSimulationFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_third_place_match_simulation_foundation";
  simulatedFixturesCount: 1;
  round: "third_place";
  simulationType: "match_level_foundation";
  source: "projected_third_place_match";
  fixtures: readonly [WorldCup2026ThirdPlaceMatchSimulationFixture];
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface WorldCup2026ResolvedKnockoutWinner {
  team: string;
  round: "round_of_32" | "round_of_16" | "quarterfinal" | "semifinal" | "final";
  sourceFixtureId: string;
  slot: number;
  opponent: string;
  advancementReason: string;
  probabilitySnapshot: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
  };
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
}

export interface WorldCup2026KnockoutWinnerResolutionResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_knockout_winner_resolution_foundation";
  resolutionType: "deterministic_foundation";
  resolvedRounds: readonly string[];
  totalResolvedFixtures: number;
  championSelected: true;
  roundOf32Winners: readonly WorldCup2026ResolvedKnockoutWinner[];
  roundOf16Winners: readonly WorldCup2026ResolvedKnockoutWinner[];
  quarterfinalWinners: readonly WorldCup2026ResolvedKnockoutWinner[];
  semifinalWinners: readonly WorldCup2026ResolvedKnockoutWinner[];
  champion: WorldCup2026ResolvedKnockoutWinner;
  runnerUp: WorldCup2026ResolvedKnockoutWinner;
  finalFixtureId: string;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type TeamRatingTier = "Elite" | "Strong" | "Competitive";

export interface TeamRatingFoundationEntry {
  rank: number;
  team: string;
  eloRating: number;
  tier: TeamRatingTier;
  offenseStrength: number;
  defenseStrength: number;
  summary: string;
}

export interface TeamRatingsFoundationResponse {
  status: "success";
  teams: readonly TeamRatingFoundationEntry[];
  ratingSource: string;
  foundationWarning: string;
  strongestOffenseTeam: string;
  strongestOffenseScore: number;
  strongestDefenseTeam: string;
  strongestDefenseScore: number;
  averageEloRating: number;
  topEloRating: number;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface LiveEloRatedTeamEntry {
  rank: number;
  team: string;
  eloRating: number;
  matchesPlayed: number;
  attackScore?: number;
  defenseScore?: number;
}

export interface LiveEloRatingsFoundationResponse {
  status: "success";
  teams: readonly LiveEloRatedTeamEntry[];
  matchesProcessed: number;
  teamsRatedTotal: number;
  dataCoverage: string;
  dataScope: string;
  pipelineVersion: string;
  topEloRating: number;
  averageEloRating: number;
  latestMatchDate: string;
  recencyWeighting: LiveEloRecencyWeightingMetadata;
  competitionWeighting: LiveEloCompetitionWeightingMetadata;
  homeAdvantage: LiveEloHomeAdvantageMetadata;
  attackDefense: LiveEloAttackDefenseMetadata;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface LiveEloRatingsFoundationOptions {
  recencyWeighting?: LiveEloRecencyWeightingConfig;
  competitionWeighting?: LiveEloCompetitionWeightingConfig;
  homeAdvantage?: LiveEloHomeAdvantageConfig;
  attackDefense?: LiveEloAttackDefenseConfig;
}

export type WorldCup2026EloIngestionIssueCode =
  | "record_rejected_non_finished"
  | "fixture_not_found"
  | "score_missing"
  | "duplicate_skipped"
  | "cutoff_exceeded";

export interface WorldCup2026EloIngestionIssue {
  code: WorldCup2026EloIngestionIssueCode;
  providerFixtureId?: string;
  fixtureId?: string;
  homeTeam?: string;
  awayTeam?: string;
  message: string;
}

export interface WorldCup2026EloIngestionRecord {
  fixtureId: string;
  providerFixtureId?: string;
  processedAt: string;
  kickoffAt?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export interface WorldCup2026TournamentAdjustedEloEntry {
  team: string;
  baselineEloRating: number;
  adjustedEloRating: number;
  ratingChange: number;
}

export interface WorldCup2026EloIngestionMetadata {
  totalRecordsReceived: number;
  eligibleRecords: number;
  processedCount: number;
  skippedCount: number;
  cutoffAt?: string;
  processedAt: string;
  pipelineVersion: string;
  combinedMatchCount: number;
}

export interface WorldCup2026EloIngestionResult {
  status: "success";
  processedRecords: readonly WorldCup2026EloIngestionRecord[];
  adjustedRatings: readonly WorldCup2026TournamentAdjustedEloEntry[];
  issues: readonly WorldCup2026EloIngestionIssue[];
  metadata: WorldCup2026EloIngestionMetadata;
}

export interface WorldCup2026EloIngestionFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_elo_ingestion_foundation";
  ingestion: WorldCup2026EloIngestionResult;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type WorldCup2026TournamentFormIssueCode =
  | "record_rejected_non_finished"
  | "fixture_not_found"
  | "invalid_score"
  | "duplicate_fixture_skipped"
  | "cutoff_excluded"
  | "future_record_excluded";

export interface WorldCup2026TournamentFormIssue {
  code: WorldCup2026TournamentFormIssueCode;
  providerFixtureId?: string;
  fixtureId?: string;
  homeTeam?: string;
  awayTeam?: string;
  message: string;
}

export interface WorldCup2026TournamentFormTeamSummary {
  team: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  mostRecentEligibleMatch?: string;
  opponentsFaced: readonly string[];
  formScore: number;
  eloAdjustmentRecommendation: number;
}

export interface WorldCup2026TournamentFormMetadata {
  cutoffAt?: string;
  referenceAt: string;
  totalRecordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  futureRecordsExcluded: number;
  duplicateFixturesSkipped: number;
  teamsSummarized: number;
  warnings: readonly string[];
  formulaVersion: string;
}

export interface WorldCup2026TournamentFormResult {
  status: "success";
  summaries: readonly WorldCup2026TournamentFormTeamSummary[];
  issues: readonly WorldCup2026TournamentFormIssue[];
  metadata: WorldCup2026TournamentFormMetadata;
}

export interface GetWorldCup2026TournamentFormFoundationInput {
  cutoffAt?: string;
  referenceAt?: string;
}

export interface WorldCup2026TournamentFormFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_tournament_form_foundation";
  form: WorldCup2026TournamentFormResult;
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export type PredictionSnapshotStatus = "pre_match_locked" | "foundation_unverified";

export interface WorldCup2026PredictionSnapshotModelConfig {
  predictionMode: "live_elo";
  eloPreset: string;
  maxGoals: number;
  tournamentResultsAdjustmentEnabled: boolean;
}

export interface WorldCup2026PredictionSnapshotInputs {
  homeElo: number;
  awayElo: number;
  homeUsesFallback: boolean;
  awayUsesFallback: boolean;
  tournamentMatchesIncluded: number;
}

export interface WorldCup2026PredictionSnapshotScoreline {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface WorldCup2026PredictionSnapshotPrediction {
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly WorldCup2026PredictionSnapshotScoreline[];
}

export interface WorldCup2026PredictionSnapshotProvenance {
  dataCoverage?: string;
}

export interface WorldCup2026PredictionSnapshot {
  snapshotId: string;
  fixtureId: string;
  status: PredictionSnapshotStatus;
  capturedAt: string;
  cutoffAt: string;
  kickoffAt?: string;
  group?: string;
  matchday?: number;
  homeTeam: string;
  awayTeam: string;
  modelVersion: string;
  modelConfiguration: WorldCup2026PredictionSnapshotModelConfig;
  inputs: WorldCup2026PredictionSnapshotInputs;
  prediction: WorldCup2026PredictionSnapshotPrediction;
  confidence: PredictionConfidenceAssessment;
  provenance: WorldCup2026PredictionSnapshotProvenance;
  contentHash: string;
}

export interface WorldCup2026PredictionSnapshotCreateResult {
  result: "created" | "existing";
  snapshot: WorldCup2026PredictionSnapshot;
  idempotencyKey: string;
  duplicate: boolean;
}

export interface CreateWorldCup2026PredictionSnapshotRequest {
  fixtureId: string;
  capturedAt?: string;
  cutoffAt?: string;
  kickoffAt?: string;
  tournamentResultsAdjustmentEnabled?: boolean;
}

export interface CreateWorldCup2026PredictionSnapshotSuccessResponse {
  status: "success";
  result: "created" | "existing";
  duplicate: boolean;
  snapshot: WorldCup2026PredictionSnapshot;
  warnings: readonly string[];
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface CreateWorldCup2026PredictionSnapshotValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

export type CreateWorldCup2026PredictionSnapshotResponse =
  | CreateWorldCup2026PredictionSnapshotSuccessResponse
  | CreateWorldCup2026PredictionSnapshotValidationErrorResponse
  | PredictionHistoryPersistenceErrorResponse;

export interface GetWorldCup2026PredictionSnapshotSuccessResponse {
  status: "success";
  snapshot: WorldCup2026PredictionSnapshot;
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface GetWorldCup2026PredictionSnapshotNotFoundResponse {
  status: "not_found";
  snapshotId: string;
  metadata: ApiMetadata;
}

export type GetWorldCup2026PredictionSnapshotResponse =
  | GetWorldCup2026PredictionSnapshotSuccessResponse
  | GetWorldCup2026PredictionSnapshotNotFoundResponse
  | PredictionHistoryPersistenceErrorResponse;

export interface ListWorldCup2026PredictionSnapshotsResponse {
  status: "success";
  snapshots: readonly WorldCup2026PredictionSnapshot[];
  totalCount: number;
  fixtureId?: string;
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export type PredictionOutcome = "home_win" | "draw" | "away_win";
export type PredictionEvaluationStatus = "evaluated" | "duplicate" | "not_eligible";

export type WorldCup2026PredictionEvaluationIssueCode =
  | "missing_snapshot"
  | "missing_completed_result"
  | "fixture_mismatch"
  | "team_order_mismatch"
  | "incomplete_score"
  | "live_or_scheduled_status"
  | "duplicate_completed_result"
  | "invalid_fixture_identity"
  | "unsupported_snapshot_state"
  | "snapshot_after_kickoff"
  | "invalid_snapshot_probabilities";

export interface WorldCup2026PredictionEvaluationIssue {
  code: WorldCup2026PredictionEvaluationIssueCode;
  message: string;
  snapshotId?: string;
  fixtureId?: string;
  providerFixtureId?: string;
}

export interface WorldCup2026PredictionEvaluationPredictedScoreline {
  homeGoals: number;
  awayGoals: number;
}

export interface WorldCup2026PredictionEvaluationPredicted {
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  mostLikelyScorelines: readonly WorldCup2026PredictionSnapshotScoreline[];
  predictedOutcome: PredictionOutcome;
  predictedScoreline: WorldCup2026PredictionEvaluationPredictedScoreline;
}

export interface WorldCup2026PredictionEvaluationActual {
  homeGoals: number;
  awayGoals: number;
  outcome: PredictionOutcome;
}

export interface WorldCup2026PredictionEvaluationMetrics {
  outcomeCorrect: boolean;
  drawCorrect: boolean;
  exactScoreCorrect: boolean;
  homeGoalAbsoluteError: number;
  awayGoalAbsoluteError: number;
  totalGoalAbsoluteError: number;
  goalDifferenceAbsoluteError: number;
  brierScore: number;
  logLoss: number;
  predictedOutcomeProbability: number;
  actualOutcomeProbability: number;
}

export interface WorldCup2026PredictionEvaluationConfidence {
  level: PredictionConfidenceLevel;
  coverageType: PredictionCoverageType;
  fallbackUsed: boolean;
}

export interface WorldCup2026PredictionEvaluationProvenance {
  snapshotContentHash: string;
  resultSource?: string;
  cacheUsed?: boolean;
  localFallbackUsed?: boolean;
  completedAt?: string;
}

export interface WorldCup2026PredictionEvaluation {
  evaluationId: string;
  snapshotId: string;
  fixtureId: string;
  providerFixtureId?: string;
  evaluatedAt: string;
  modelVersion: string;
  metricVersion: string;
  predicted: WorldCup2026PredictionEvaluationPredicted;
  actual: WorldCup2026PredictionEvaluationActual;
  metrics: WorldCup2026PredictionEvaluationMetrics;
  confidence: WorldCup2026PredictionEvaluationConfidence;
  provenance: WorldCup2026PredictionEvaluationProvenance;
}

export interface WorldCup2026PredictionEvaluationCreateResult {
  result: "created" | "existing";
  evaluation: WorldCup2026PredictionEvaluation;
  identityKey: string;
  duplicate: boolean;
}

export interface CreateWorldCup2026PredictionEvaluationRequest {
  snapshotId: string;
  evaluatedAt?: string;
}

export interface CreateWorldCup2026PredictionEvaluationSuccessResponse {
  status: "evaluated" | "duplicate";
  evaluation: WorldCup2026PredictionEvaluation;
  issues: readonly WorldCup2026PredictionEvaluationIssue[];
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface CreateWorldCup2026PredictionEvaluationNotEligibleResponse {
  status: "not_eligible";
  issues: readonly WorldCup2026PredictionEvaluationIssue[];
  metadata: ApiMetadata;
}

export type CreateWorldCup2026PredictionEvaluationResponse =
  | CreateWorldCup2026PredictionEvaluationSuccessResponse
  | CreateWorldCup2026PredictionEvaluationNotEligibleResponse
  | PredictionHistoryPersistenceErrorResponse;

export interface GetWorldCup2026PredictionEvaluationSuccessResponse {
  status: "success";
  evaluation: WorldCup2026PredictionEvaluation;
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface GetWorldCup2026PredictionEvaluationNotFoundResponse {
  status: "not_found";
  evaluationId: string;
  metadata: ApiMetadata;
}

export type GetWorldCup2026PredictionEvaluationResponse =
  | GetWorldCup2026PredictionEvaluationSuccessResponse
  | GetWorldCup2026PredictionEvaluationNotFoundResponse
  | PredictionHistoryPersistenceErrorResponse;

export interface ListWorldCup2026PredictionEvaluationsResponse {
  status: "success";
  evaluations: readonly WorldCup2026PredictionEvaluation[];
  totalCount: number;
  fixtureId?: string;
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface WorldCup2026PredictionCalibrationBucket {
  bucketStart: number;
  bucketEnd: number;
  predictionsCount: number;
  meanPredictedProbability: number | null;
  observedFrequency: number | null;
  absoluteCalibrationGap: number | null;
}

export interface WorldCup2026ModelRealityConfidenceSummary {
  confidenceLevel: PredictionConfidenceLevel;
  evaluationsCount: number;
  outcomeAccuracy: number | null;
  meanBrierScore: number | null;
  meanLogLoss: number | null;
}

export interface WorldCup2026ModelRealityCoverageSummary {
  coverageType: PredictionCoverageType;
  evaluationsCount: number;
  outcomeAccuracy: number | null;
  meanBrierScore: number | null;
}

export interface WorldCup2026ModelRealityFallbackSummary {
  evaluationsCount: number;
  outcomeAccuracy: number | null;
  meanBrierScore: number | null;
}

export interface WorldCup2026ModelRealitySummary {
  evaluationsCount: number;
  outcomeAccuracy: number | null;
  drawAccuracy: number | null;
  exactScoreAccuracy: number | null;
  meanHomeGoalAbsoluteError: number | null;
  meanAwayGoalAbsoluteError: number | null;
  meanTotalGoalAbsoluteError: number | null;
  meanGoalDifferenceAbsoluteError: number | null;
  meanBrierScore: number | null;
  meanLogLoss: number | null;
  byConfidenceLevel: readonly WorldCup2026ModelRealityConfidenceSummary[];
  byCoverageType: readonly WorldCup2026ModelRealityCoverageSummary[];
  withFallback: WorldCup2026ModelRealityFallbackSummary;
  withoutFallback: WorldCup2026ModelRealityFallbackSummary;
  calibrationBuckets: readonly WorldCup2026PredictionCalibrationBucket[];
}

export interface GetWorldCup2026ModelRealitySummaryResponse {
  status: "success";
  summary: WorldCup2026ModelRealitySummary;
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export type PredictionHistoryEvaluationState = "all" | "evaluated" | "pending";
export type PredictionHistoryListSort =
  | "captured_desc"
  | "captured_asc"
  | "kickoff_desc"
  | "kickoff_asc";

export interface PredictionHistoryProjectedScore {
  home: number;
  away: number;
}

export interface PredictionHistoryExpectedGoals {
  home: number;
  away: number;
}

export interface PredictionHistoryOutcomeProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
}

export interface PredictionHistoryConfidenceSummary {
  level: PredictionConfidenceLevel;
  coverage: PredictionCoverageType;
}

export interface PredictionHistoryEvaluationSummary {
  evaluationId: string;
  evaluatedAt: string;
  actualScore: {
    home: number;
    away: number;
  };
  actualOutcome: PredictionOutcome;
  brierScore: number;
  logLoss: number;
  homeGoalAbsoluteError: number;
  awayGoalAbsoluteError: number;
  scorelineCorrect: boolean;
  outcomeCorrect: boolean;
}

export interface PredictionHistoryListItem {
  snapshotId: string;
  fixtureId: string;
  group: string;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string | null;
  capturedAt: string;
  snapshotStatus: PredictionSnapshotStatus;
  projectedScore: PredictionHistoryProjectedScore;
  expectedGoals: PredictionHistoryExpectedGoals;
  outcomeProbabilities: PredictionHistoryOutcomeProbabilities;
  confidence: PredictionHistoryConfidenceSummary;
  evaluation: PredictionHistoryEvaluationSummary | null;
}

export interface PredictionHistoryListQuery {
  group?: string;
  team?: string;
  fixtureId?: string;
  status?: PredictionSnapshotStatus;
  evaluationState?: PredictionHistoryEvaluationState;
  page?: number;
  pageSize?: number;
  sort?: PredictionHistoryListSort;
}

export interface PredictionHistoryListSummary {
  totalSnapshots: number;
  evaluatedSnapshots: number;
  pendingSnapshots: number;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
  averageBrierScore: number | null;
}

export interface PredictionHistoryListPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PredictionHistoryListFilters {
  group: string | null;
  team: string | null;
  fixtureId: string | null;
  status: PredictionSnapshotStatus | null;
  evaluationState: PredictionHistoryEvaluationState;
  sort: PredictionHistoryListSort;
}

export interface PredictionHistoryListSuccessResponse {
  status: "success";
  items: readonly PredictionHistoryListItem[];
  summary: PredictionHistoryListSummary;
  pagination: PredictionHistoryListPagination;
  filters: PredictionHistoryListFilters;
  metadata: ApiMetadata;
  persistenceMetadata?: PredictionHistoryPersistenceMetadata;
}

export interface PredictionHistoryListValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

export type PredictionHistoryListResponse =
  | PredictionHistoryListSuccessResponse
  | PredictionHistoryListValidationErrorResponse
  | PredictionHistoryPersistenceErrorResponse;

export interface ApiRoutes {
  getHealth: () => HealthResponse;
  getModelInfo: () => ModelInfoResponse;
  simulateMatch: (request: SimulateMatchRequest) => SimulateMatchResponse;
  predictMatchFromLiveElo: (request: PredictMatchFromLiveEloRequest) => PredictMatchFromLiveEloResponse;
  createWorldCup2026PredictionSnapshot: (request: CreateWorldCup2026PredictionSnapshotRequest) => Promise<CreateWorldCup2026PredictionSnapshotResponse>;
  getWorldCup2026PredictionSnapshot: (snapshotId: string) => Promise<GetWorldCup2026PredictionSnapshotResponse>;
  listWorldCup2026PredictionSnapshots: (fixtureId?: string) => Promise<ListWorldCup2026PredictionSnapshotsResponse | PredictionHistoryPersistenceErrorResponse>;
  createWorldCup2026PredictionEvaluation: (request: CreateWorldCup2026PredictionEvaluationRequest) => Promise<CreateWorldCup2026PredictionEvaluationResponse>;
  getWorldCup2026PredictionEvaluation: (evaluationId: string) => Promise<GetWorldCup2026PredictionEvaluationResponse>;
  listWorldCup2026PredictionEvaluations: (fixtureId?: string) => Promise<ListWorldCup2026PredictionEvaluationsResponse | PredictionHistoryPersistenceErrorResponse>;
  getWorldCup2026ModelRealitySummary: () => Promise<GetWorldCup2026ModelRealitySummaryResponse | PredictionHistoryPersistenceErrorResponse>;
  listWorldCup2026PredictionHistory: (
    query?: PredictionHistoryListQuery
  ) => Promise<PredictionHistoryListResponse>;
  getHistoricalTournamentSummary: (year: number) => HistoricalTournamentSummaryResponse;
  getHistoricalReplayAudit: () => HistoricalReplayAuditResponse;
  getWorldCup2026FixtureFoundation: () => WorldCup2026FixtureFoundationResponse;
  getWorldCup2026DailyMatches: (
    input?: GetWorldCup2026DailyMatchesInput
  ) => Promise<WorldCup2026DailyMatchesResponse>;
  getWorldCup2026GroupDetail: (
    input: GetWorldCup2026GroupDetailInput
  ) => Promise<WorldCup2026GroupDetailResponse>;
  getWorldCup2026ResultsProviderFoundation: () => WorldCup2026ResultsProviderFoundationResponse;
  getWorldCup2026GroupStandingsFoundation: () => WorldCup2026GroupStandingsFoundationResponse;
  getWorldCup2026LiveGroupStandings: () => WorldCup2026LiveGroupStandingsResponse;
  getWorldCup2026EloIngestionFoundation: () => WorldCup2026EloIngestionFoundationResponse;
  getWorldCup2026TournamentFormFoundation: (
    input?: GetWorldCup2026TournamentFormFoundationInput
  ) => WorldCup2026TournamentFormFoundationResponse;
  getWorldCup2026RoundOf32Foundation: () => WorldCup2026RoundOf32FoundationResponse;
  getWorldCup2026KnockoutBracketFoundation: () => WorldCup2026KnockoutBracketFoundationResponse;
  simulateWorldCup2026KnockoutFixturesFoundation: () => WorldCup2026KnockoutSimulationFoundationResponse;
  simulateWorldCup2026RoundOf16Foundation: () => WorldCup2026RoundOf16FoundationResponse;
  simulateWorldCup2026RoundOf16MatchesFoundation: () => WorldCup2026RoundOf16MatchSimulationFoundationResponse;
  simulateWorldCup2026QuarterfinalFoundation: () => WorldCup2026QuarterfinalFoundationResponse;
  simulateWorldCup2026QuarterfinalMatchesFoundation: () => WorldCup2026QuarterfinalMatchSimulationFoundationResponse;
  simulateWorldCup2026SemifinalFoundation: () => WorldCup2026SemifinalFoundationResponse;
  simulateWorldCup2026SemifinalMatchesFoundation: () => WorldCup2026SemifinalMatchSimulationFoundationResponse;
  simulateWorldCup2026FinalFoundation: () => WorldCup2026FinalFoundationResponse;
  simulateWorldCup2026FinalMatchFoundation: () => WorldCup2026FinalMatchSimulationFoundationResponse;
  resolveWorldCup2026KnockoutWinnersFoundation: () => WorldCup2026KnockoutWinnerResolutionResponse;
  getWorldCup2026ThirdPlaceMatchFoundation: () => WorldCup2026ThirdPlaceMatchFoundationResponse;
  simulateWorldCup2026ThirdPlaceMatchFoundation: () => WorldCup2026ThirdPlaceMatchSimulationFoundationResponse;
}

export type WorldCup2026MatchContextGroup =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type WorldCup2026FixtureImportanceLevel = "unknown" | "low" | "medium" | "high";

export type WorldCup2026MatchContextQualificationStatus =
  | "official"
  | "provisional"
  | "foundation_only";

export type WorldCup2026MatchContextStandingsMode = "official" | "live_provisional";

export interface WorldCup2026TeamStandingContext {
  team: string;
  groupPosition: number | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface WorldCup2026MatchContextStandingsContext {
  mode: WorldCup2026MatchContextStandingsMode;
  home: WorldCup2026TeamStandingContext;
  away: WorldCup2026TeamStandingContext;
  groupComplete: boolean;
}

export interface WorldCup2026MatchContextTournamentForm {
  homeMatchesPlayed: number;
  awayMatchesPlayed: number;
  homeFormScore: number;
  awayFormScore: number;
  formulaVersion: string;
}

export interface WorldCup2026MatchContextQualificationState {
  firstPlace?: string;
  secondPlace?: string;
  thirdPlace?: string;
  thirdPlaceCurrentlyQualifying?: boolean;
  status: WorldCup2026MatchContextQualificationStatus;
}

export interface WorldCup2026MatchContextFixtureImportance {
  level: WorldCup2026FixtureImportanceLevel;
  reasons: readonly string[];
}

export interface WorldCup2026MatchContextProviderFreshness {
  activeProvider: string;
  cacheUsed: boolean;
  localFallbackUsed: boolean;
  stale: boolean;
  lastSuccessfulSync?: string;
}

export interface WorldCup2026MatchContextFallbackState {
  externalProviderEnabled: boolean;
  localFallbackUsed: boolean;
  unresolvedFixture: boolean;
  warnings: readonly string[];
}

export interface WorldCup2026MatchContext {
  fixtureId: string;
  providerFixtureId?: string;
  group: WorldCup2026MatchContextGroup;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt?: string;
  standingsContext: WorldCup2026MatchContextStandingsContext;
  tournamentForm?: WorldCup2026MatchContextTournamentForm;
  qualificationState: WorldCup2026MatchContextQualificationState;
  fixtureImportance: WorldCup2026MatchContextFixtureImportance;
  providerFreshness: WorldCup2026MatchContextProviderFreshness;
  fallbackState: WorldCup2026MatchContextFallbackState;
}

export type WorldCup2026MatchContextErrorCode = "fixture_not_found";

export interface WorldCup2026MatchContextError {
  status: "error";
  code: WorldCup2026MatchContextErrorCode;
  message: string;
}

export interface WorldCup2026MatchContextSuccess {
  status: "success";
  context: WorldCup2026MatchContext;
}

export type WorldCup2026MatchContextResult =
  | WorldCup2026MatchContextSuccess
  | WorldCup2026MatchContextError;

export type TeamPerformanceCoverageLevel = "full" | "partial" | "sparse" | "fallback";
export type TeamPerformanceFreshnessLevel = "fresh" | "aging" | "stale" | "unknown";

export type StatsBombAdjustmentReason =
  | "applied"
  | "disabled"
  | "home_profile_missing"
  | "away_profile_missing"
  | "both_profiles_missing"
  | "insufficient_coverage"
  | "stale_profile"
  | "invalid_profile"
  | "source_unavailable";

export interface StatsBombPredictionSignalRequest {
  enabled?: boolean;
  profileSource?: "artifact" | "provider";
  cutoffAt?: string;
  maxWeight?: number;
}

export interface StatsBombSignalProfileMetadata {
  coverage: TeamPerformanceCoverageLevel;
  freshness: TeamPerformanceFreshnessLevel;
  matchCount: number;
  latestMatchAt: string | null;
  weight: number;
}

export interface StatsBombSignalResponseMetadata {
  enabled: boolean;
  applied: boolean;
  reason: StatsBombAdjustmentReason;
  rolloutMode?: "off" | "shadow" | "on";
  activationDecision?: string;
  authoritative?: "baseline" | "statsbomb";
  provider: "statsbomb_open_data";
  cutoffAt: string;
  artifactCutoffAt?: string;
  artifactGeneratedAt?: string;
  signalVersion: "statsbomb-signal-v1";
  /** Stage input xG entering the StatsBomb stage (current authoritative after Attack/Defense). */
  baselineExpectedGoals: { home: number; away: number };
  /** Original Elo V2 xG before any enrichment stages, available when a prior stage changed the authoritative xG. */
  originalEloExpectedGoals?: { home: number; away: number };
  adjustedExpectedGoals: { home: number; away: number };
  shadowAdjustedExpectedGoals?: { home: number; away: number };
  homeProfile: StatsBombSignalProfileMetadata | null;
  awayProfile: StatsBombSignalProfileMetadata | null;
  warnings: string[];
}

export const API_VERSION = "api-foundation-v1";
export const API_MODE = "pure_handlers" as const;

export function buildApiMetadata(
  notes: readonly string[] = [],
  overrides: Partial<Pick<ApiMetadata, "serverEnabled" | "databaseEnabled" | "externalServicesEnabled">> = {}
): ApiMetadata {
  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    serverEnabled: overrides.serverEnabled ?? false,
    databaseEnabled: overrides.databaseEnabled ?? false,
    externalServicesEnabled: overrides.externalServicesEnabled ?? false,
    notes
  };
}
