import type {
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
  ScorelineProbability
} from "../../model/src/index.js";

export type { EloXgPreset };

export type ApiStatus = "ok" | "error";
export type ApiFoundationResponseStatus = "success" | "validation_error";
export type SupportedHistoricalTournamentYear = 2010 | 2014 | 2018 | 2022;
export type LiveEloRatingSource = "live_elo_pipeline" | "fallback_seed";

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
  preset?: EloXgPreset;
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

export interface WorldCup2026Group {
  group: string;
  groupName: string;
  teams: readonly string[];
  fixtureCount: number;
}

export interface WorldCup2026Fixture {
  id: string;
  group: string;
  matchday: number;
  order: number;
  groupFixtureOrder: number;
  homeTeam: string;
  awayTeam: string;
  dateStatus: "deferred";
  venueStatus: "deferred";
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

export interface ApiRoutes {
  getHealth: () => HealthResponse;
  getModelInfo: () => ModelInfoResponse;
  simulateMatch: (request: SimulateMatchRequest) => SimulateMatchResponse;
  predictMatchFromLiveElo: (request: PredictMatchFromLiveEloRequest) => PredictMatchFromLiveEloResponse;
  getHistoricalTournamentSummary: (year: number) => HistoricalTournamentSummaryResponse;
  getHistoricalReplayAudit: () => HistoricalReplayAuditResponse;
  getWorldCup2026FixtureFoundation: () => WorldCup2026FixtureFoundationResponse;
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
