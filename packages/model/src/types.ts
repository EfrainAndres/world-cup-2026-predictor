export type EloResult = "home_win" | "draw" | "away_win";

export interface EloConfig {
  initialRating: number;
  kFactor: number;
}

export interface EloMatch {
  match_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  neutral_site: boolean;
  home_score?: number;
  away_score?: number;
  result?: EloResult;
}

export interface EloRatingEntry {
  team: string;
  rating: number;
}

export type EloRatingMap = ReadonlyMap<string, number>;

export interface EloMatchRatingHistory {
  match_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_rating_before: number;
  away_rating_before: number;
  home_rating_after: number;
  away_rating_after: number;
  home_rating_delta: number;
  away_rating_delta: number;
  result: EloResult;
}

export interface EloProcessResult {
  ratings: EloRatingMap;
  matchHistory: EloMatchRatingHistory[];
}

export interface ExpectedGoalsInput {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
}

export interface PoissonConfig {
  maxGoals: number;
  normalizeMatrix: boolean;
}

export interface ScorelineProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface OutcomeProbabilities {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  totalProbability: number;
}

export interface DixonColesConfig extends PoissonConfig {
  rho: number;
}

export type RandomFunction = () => number;

export interface MonteCarloSimulationConfig {
  simulationCount: number;
  seed?: number;
  random?: RandomFunction;
  mostCommonScorelineLimit?: number;
}

export interface SimulatedScoreline {
  homeGoals: number;
  awayGoals: number;
}

export interface SimulatedScorelineSummary extends SimulatedScoreline {
  count: number;
  estimatedProbability: number;
}

export interface MonteCarloMatchSimulationResult {
  homeWins: number;
  draws: number;
  awayWins: number;
  estimatedHomeWinProbability: number;
  estimatedDrawProbability: number;
  estimatedAwayWinProbability: number;
  mostCommonScorelines: SimulatedScorelineSummary[];
  simulationCount: number;
}

export interface TournamentTeamInput {
  name: string;
}

export interface GroupMatchInput {
  homeTeam: string;
  awayTeam: string;
  scoreMatrix: readonly ScorelineProbability[];
}

export interface GroupInput {
  name: string;
  teams: readonly TournamentTeamInput[];
  matches: readonly GroupMatchInput[];
  qualifiersCount?: number;
}

export interface GroupStanding {
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

export interface SimulatedGroupMatch extends GroupMatchInput {
  homeGoals: number;
  awayGoals: number;
}

export interface SimulatedGroupResult {
  groupName: string;
  matches: SimulatedGroupMatch[];
  standings: GroupStanding[];
  qualifiers: GroupStanding[];
}

export interface KnockoutFixtureInput {
  homeTeam: string;
  awayTeam: string;
  scoreMatrix: readonly ScorelineProbability[];
}

export interface SimulatedKnockoutMatch extends KnockoutFixtureInput {
  homeGoals: number;
  awayGoals: number;
  winner: string;
  loser: string;
  tieBreakUsed: boolean;
}

export interface SimulatedKnockoutRound {
  roundName: string;
  matches: SimulatedKnockoutMatch[];
  winners: string[];
}

export interface TournamentSimulationConfig {
  seed?: number;
  random?: RandomFunction;
}

export interface TournamentInput {
  name: string;
  groups: readonly GroupInput[];
  knockoutScoreMatrix: readonly ScorelineProbability[];
  groupQualifiersCount?: number;
  metadata?: Record<string, string>;
}

export interface TournamentMetadata {
  tournamentName: string;
  groupCount: number;
  qualifiedTeamCount: number;
  knockoutRoundCount: number;
  format: string;
  notes: string[];
  metadata?: Record<string, string>;
}

export interface SimulatedTournamentResult {
  groupResults: SimulatedGroupResult[];
  knockoutResults: SimulatedKnockoutRound[];
  champion: string;
  runnerUp: string;
  metadata: TournamentMetadata;
}

export interface TournamentRepeatedRunsConfig extends TournamentSimulationConfig {
  runCount: number;
  maxRunCount?: number;
}

export interface TournamentTeamProbabilitySummary {
  team: string;
  count: number;
  probability: number;
}

export interface TournamentRepeatedRunsMetadata {
  tournamentName: string;
  totalRuns: number;
  seed?: number;
  maxRunCount: number;
  format: string;
  notes: string[];
}

export interface TournamentRepeatedRunsResult {
  totalRuns: number;
  championProbabilities: TournamentTeamProbabilitySummary[];
  runnerUpProbabilities: TournamentTeamProbabilitySummary[];
  knockoutQualificationProbabilities: TournamentTeamProbabilitySummary[];
  groupQualificationProbabilities: TournamentTeamProbabilitySummary[];
  metadata: TournamentRepeatedRunsMetadata;
}

export type FIFA2026GroupId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

export interface FIFA2026Team {
  id: string;
  name: string;
}

export interface FIFA2026Group {
  id: FIFA2026GroupId;
  teams: readonly FIFA2026Team[];
}

export interface FIFA2026GroupStanding {
  team: FIFA2026Team;
  groupId: FIFA2026GroupId;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export type FIFA2026QualificationSource = "group_winner" | "group_runner_up" | "third_place";

export interface FIFA2026QualifiedTeam extends FIFA2026GroupStanding {
  qualificationSource: FIFA2026QualificationSource;
}

export interface FIFA2026BracketSlot {
  slotId: string;
  team: FIFA2026QualifiedTeam;
}

export interface FIFA2026RoundOf32Fixture {
  fixtureId: string;
  homeSlot: FIFA2026BracketSlot;
  awaySlot: FIFA2026BracketSlot;
}

export interface FIFA2026TournamentFormat {
  totalTeams: number;
  groupCount: number;
  teamsPerGroup: number;
  topTeamsPerGroup: number;
  bestThirdPlaceTeams: number;
  knockoutTeams: number;
  groupIds: readonly FIFA2026GroupId[];
}

export interface TeamProbabilitySnapshot {
  team: string;
  probability: number;
}

export interface HistoricalTournamentPredictionInput {
  tournamentId: string;
  tournamentName: string;
  championProbabilities: readonly TeamProbabilitySnapshot[];
  runnerUpProbabilities?: readonly TeamProbabilitySnapshot[];
  knockoutQualificationProbabilities?: readonly TeamProbabilitySnapshot[];
  metadata?: Record<string, string>;
}

export interface ActualTournamentResult {
  tournamentId: string;
  tournamentName: string;
  champion: string;
  runnerUp?: string;
  knockoutTeams?: readonly string[];
  metadata?: Record<string, string>;
}

export interface RunnerUpEvaluationResult {
  actualRunnerUp: string;
  probability: number;
  top1Hit: boolean;
  top3Hit: boolean;
}

export interface KnockoutQualificationEvaluationResult {
  evaluatedTeams: number;
  hitCount: number;
  hitRate: number;
}

export interface HistoricalTournamentEvaluationResult {
  tournamentId: string;
  tournamentName: string;
  actualChampion: string;
  championProbability: number;
  championBrierScore: number;
  championLogLoss: number;
  championTop1Hit: boolean;
  championTop3Hit: boolean;
  runnerUpEvaluation?: RunnerUpEvaluationResult;
  knockoutQualificationEvaluation?: KnockoutQualificationEvaluationResult;
}

export interface ChampionCalibrationBucket {
  bucketStart: number;
  bucketEnd: number;
  predictionCount: number;
  averagePredictedProbability: number;
  actualRate: number;
}

export interface ValidationMetricSummary {
  tournamentCount: number;
  averageChampionBrierScore: number;
  averageChampionLogLoss: number;
  championTop1HitRate: number;
  championTop3HitRate: number;
  runnerUpTop1HitRate?: number;
  runnerUpTop3HitRate?: number;
  averageKnockoutQualificationHitRate?: number;
  championCalibrationBuckets: ChampionCalibrationBucket[];
}

export interface HistoricalValidationResult {
  results: HistoricalTournamentEvaluationResult[];
  summary: ValidationMetricSummary;
}

export type HistoricalBacktestDecisionMethod = "regular_time" | "extra_time" | "penalties" | "draw";

export interface HistoricalBacktestFixture {
  matchId: string;
  tournamentYear: number;
  stage: string;
  stageOrder: number;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  result: EloResult;
  winner?: string;
  decidedBy?: HistoricalBacktestDecisionMethod;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
}

export interface HistoricalTournamentFixtureSubset {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  matches: readonly HistoricalBacktestFixture[];
  isPartial: boolean;
  coverageNote: string;
  sourceNote?: string;
}

export interface HistoricalBacktestInput {
  fixtureSubsets: readonly HistoricalTournamentFixtureSubset[];
  predictions: readonly HistoricalTournamentPredictionInput[];
  topN?: number;
  calibrationBucketSize?: number;
}

export interface HistoricalBacktestYearResult {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  actual: ActualTournamentResult;
  evaluation: HistoricalTournamentEvaluationResult;
  topN: number;
  championTopNHit: boolean;
  runnerUpTopNHit?: boolean;
  isPartial: boolean;
  warnings: string[];
}

export interface HistoricalBacktestSummary {
  tournamentCount: number;
  years: number[];
  averageChampionBrierScore: number;
  averageChampionLogLoss: number;
  championTop1HitRate: number;
  championTop3HitRate: number;
  championTopNHitRate: number;
  runnerUpTop1HitRate?: number;
  runnerUpTop3HitRate?: number;
  runnerUpTopNHitRate?: number;
  calibrationBuckets: ChampionCalibrationBucket[];
  warnings: string[];
}

export interface HistoricalBacktestResult {
  results: HistoricalBacktestYearResult[];
  summary: HistoricalBacktestSummary;
  metadata: {
    fixtureSubsetCount: number;
    predictionCount: number;
    isPartialHistoricalValidation: boolean;
    notes: string[];
  };
}

export type HistoricalBacktestingSnapshotType = "synthetic_report_fixture" | "model_generated";

export interface HistoricalBacktestingReportPredictionInput extends HistoricalTournamentPredictionInput {
  tournamentYear: number;
  snapshotType: HistoricalBacktestingSnapshotType;
  modelVersion?: string;
  dataCutoff?: string;
}

export interface HistoricalBacktestingDatasetCompleteness {
  isComplete: boolean;
  matchCount: number;
  expectedMatchCount: number;
  coverageNote: string;
  sourceNote?: string;
}

export interface HistoricalBacktestingCalibrationBucketSummary {
  bucketStart: number;
  bucketEnd: number;
  predictionCount: number;
  averagePredictedProbability: number;
  actualRate: number;
}

export interface HistoricalBacktestingYearReport {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  actualChampion: string;
  actualRunnerUp: string;
  championProbabilityRank: number | null;
  runnerUpProbabilityRank?: number | null;
  championProbability: number;
  runnerUpProbability?: number;
  championTop1Hit: boolean;
  championTop3Hit: boolean;
  championTop5Hit: boolean;
  brierScore: number;
  logLoss: number;
  calibrationBucketSummary?: HistoricalBacktestingCalibrationBucketSummary;
  datasetCompleteness: HistoricalBacktestingDatasetCompleteness;
  probabilitySnapshotType: HistoricalBacktestingSnapshotType;
  modelVersion?: string;
  dataCutoff?: string;
  warnings: string[];
}

export interface HistoricalBacktestingReportSummary {
  yearsEvaluated: number[];
  tournamentCount: number;
  averageBrierScore: number;
  averageLogLoss: number;
  top1HitRate: number;
  top3HitRate: number;
  top5HitRate: number;
  warnings: string[];
}

export interface HistoricalBacktestingReportInput {
  fixtureSubsets: readonly HistoricalTournamentFixtureSubset[];
  predictions: readonly HistoricalBacktestingReportPredictionInput[];
  expectedMatchesPerTournament?: number;
  calibrationBucketSize?: number;
}

export interface HistoricalBacktestingReport {
  reports: HistoricalBacktestingYearReport[];
  summary: HistoricalBacktestingReportSummary;
}
