import type {
  LiveEloCompetitionWeightingConfig,
  LiveEloCompetitionWeightingMetadata,
  LiveEloHomeAdvantageConfig,
  LiveEloHomeAdvantageMetadata,
  LiveEloRecencyWeightingConfig,
  LiveEloRecencyWeightingMetadata,
  MonteCarloMatchSimulationResult,
  OutcomeProbabilities,
  ScorelineProbability
} from "../../model/src/index.js";

export type ApiStatus = "ok" | "error";
export type ApiFoundationResponseStatus = "success" | "validation_error";
export type SupportedHistoricalTournamentYear = 2010 | 2014 | 2018 | 2022;

export interface ApiMetadata {
  apiVersion: string;
  mode: "pure_handlers";
  serverEnabled: false;
  databaseEnabled: false;
  externalServicesEnabled: false;
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
  monteCarloSimulation?: MonteCarloMatchSimulationResult;
  warnings: readonly string[];
  metadata: ApiMetadata;
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
  warnings: readonly string[];
  metadata: ApiMetadata;
}

export interface LiveEloRatingsFoundationOptions {
  recencyWeighting?: LiveEloRecencyWeightingConfig;
  competitionWeighting?: LiveEloCompetitionWeightingConfig;
  homeAdvantage?: LiveEloHomeAdvantageConfig;
}

export interface ApiRoutes {
  getHealth: () => HealthResponse;
  getModelInfo: () => ModelInfoResponse;
  simulateMatch: (request: SimulateMatchRequest) => SimulateMatchResponse;
  predictMatchFromLiveElo: (request: PredictMatchFromLiveEloRequest) => PredictMatchFromLiveEloResponse;
  getHistoricalTournamentSummary: (year: number) => HistoricalTournamentSummaryResponse;
  getHistoricalReplayAudit: () => HistoricalReplayAuditResponse;
}

export const API_VERSION = "api-foundation-v1";
export const API_MODE = "pure_handlers" as const;

export function buildApiMetadata(notes: readonly string[] = []): ApiMetadata {
  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    serverEnabled: false,
    databaseEnabled: false,
    externalServicesEnabled: false,
    notes
  };
}
