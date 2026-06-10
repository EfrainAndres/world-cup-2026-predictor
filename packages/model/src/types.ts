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

export type HistoricalBacktestingSnapshotType =
  | "synthetic_report_fixture"
  | "baseline_pre_tournament_snapshot"
  | "historical_elo_replay_snapshot_foundation"
  | "model_generated";

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

export interface PreTournamentTeamSeedRating {
  team: string;
  rating: number;
}

export interface PreTournamentSnapshotInput {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  tournamentStartDate: string;
  generatedAt: string;
  inputDataCutoff: string;
  teamSeedRatings: readonly PreTournamentTeamSeedRating[];
  actualTournamentResultsIncluded?: boolean;
  metadata?: Record<string, string>;
}

export interface SnapshotTeamProbability extends TeamProbabilitySnapshot {
  rating: number;
  rank: number;
}

export type LookAheadGuardrailName = "input_data_before_tournament" | "generated_before_tournament" | "no_actual_results_in_input";

export type LookAheadGuardrailSeverity = "warning" | "error";

export interface LookAheadGuardrailResult {
  guardrail: LookAheadGuardrailName;
  passed: boolean;
  severity: LookAheadGuardrailSeverity;
  message: string;
}

export interface PreTournamentSnapshotMetadata {
  tournamentYear: number;
  tournamentStartDate: string;
  inputDataCutoff: string;
  generatedAt: string;
  modelVersion: string;
  snapshotType: "baseline_pre_tournament_snapshot";
  warnings: string[];
  lookAheadGuardrails: LookAheadGuardrailResult[];
}

export interface GeneratedPreTournamentSnapshot extends HistoricalBacktestingReportPredictionInput {
  snapshotType: "baseline_pre_tournament_snapshot";
  championProbabilities: readonly SnapshotTeamProbability[];
  snapshotMetadata: PreTournamentSnapshotMetadata;
}

export type HistoricalEloReplayDataCoverage = "complete_international_history" | "curated_world_cup_fixtures_only" | "custom_partial_history";

export interface HistoricalEloReplayConfig extends EloConfig {
  probabilityRatingScale: number;
}

export interface HistoricalEloReplayInput {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  tournamentStartDate: string;
  generatedAt: string;
  inputDataCutoff: string;
  targetTeams: readonly string[];
  historicalMatches: readonly EloMatch[];
  config?: Partial<HistoricalEloReplayConfig>;
  dataCoverage?: HistoricalEloReplayDataCoverage;
  actualTournamentResultsIncluded?: boolean;
  metadata?: Record<string, string>;
}

export type HistoricalEloReplayWarningCode = "incomplete_historical_data" | "matches_after_cutoff_ignored" | "no_matches_before_cutoff";

export type HistoricalEloReplayWarningSeverity = "info" | "warning" | "error";

export interface HistoricalEloReplayWarning {
  code: HistoricalEloReplayWarningCode;
  severity: HistoricalEloReplayWarningSeverity;
  message: string;
}

export interface HistoricalEloTeamSnapshot extends TeamProbabilitySnapshot {
  eloRating: number;
  rank: number;
}

export interface HistoricalEloReplayMetadata {
  tournamentYear: number;
  tournamentStartDate: string;
  inputDataCutoff: string;
  generatedAt: string;
  modelVersion: string;
  snapshotType: "historical_elo_replay_snapshot_foundation";
  dataCoverage: HistoricalEloReplayDataCoverage;
  inputMatchCount: number;
  matchesUsed: number;
  matchesIgnoredAfterCutoff: number;
  targetTeamCount: number;
  inputDataLatestDate?: string;
  usedMatchLatestDate?: string;
  config: HistoricalEloReplayConfig;
  warnings: readonly HistoricalEloReplayWarning[];
  lookAheadGuardrails: readonly LookAheadGuardrailResult[];
}

export interface HistoricalEloReplayRatingResult {
  ratings: readonly EloRatingEntry[];
  matchHistory: readonly EloMatchRatingHistory[];
  matchesUsed: readonly EloMatch[];
  matchesIgnoredAfterCutoff: readonly EloMatch[];
  inputDataLatestDate?: string;
  usedMatchLatestDate?: string;
}

export interface GeneratedHistoricalEloSnapshot extends HistoricalBacktestingReportPredictionInput {
  snapshotType: "historical_elo_replay_snapshot_foundation";
  teams: readonly string[];
  championProbabilities: readonly HistoricalEloTeamSnapshot[];
  eloRatings: readonly HistoricalEloTeamSnapshot[];
  snapshotMetadata: HistoricalEloReplayMetadata;
}

export type HistoricalTournamentReplayWarningCode =
  | "baseline_snapshot"
  | "dataset_incomplete"
  | "historical_elo_foundation_snapshot"
  | "lookahead_guardrail_error"
  | "lookahead_guardrail_warning"
  | "missing_lookahead_guardrails"
  | "model_snapshot_metadata_missing";

export type HistoricalTournamentReplayWarningSeverity = "info" | "warning" | "error";

export interface HistoricalTournamentReplayWarning {
  code: HistoricalTournamentReplayWarningCode;
  severity: HistoricalTournamentReplayWarningSeverity;
  message: string;
  tournamentYear?: number;
}

export interface HistoricalTournamentReplayLookAheadStatus {
  passed: boolean;
  guardrails: readonly LookAheadGuardrailResult[];
  errorCount: number;
  warningCount: number;
}

export interface HistoricalTournamentReplaySnapshotInput extends HistoricalBacktestingReportPredictionInput {
  snapshotMetadata?: PreTournamentSnapshotMetadata | HistoricalEloReplayMetadata;
  actualTournamentResultsIncluded?: boolean;
}

export interface HistoricalTournamentReplayYearInput {
  fixtureSubset: HistoricalTournamentFixtureSubset;
  snapshot: HistoricalTournamentReplaySnapshotInput;
  calibrationBuckets?: readonly ChampionCalibrationBucket[];
  expectedMatchesPerTournament?: number;
}

export interface HistoricalTournamentReplayYearResult {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  actualChampion: string;
  actualRunnerUp: string;
  snapshotType: HistoricalBacktestingSnapshotType;
  championProbability: number;
  championRank: number | null;
  runnerUpProbability?: number;
  runnerUpRank?: number | null;
  championTop1Hit: boolean;
  championTop3Hit: boolean;
  championTop5Hit: boolean;
  brierScore: number;
  logLoss: number;
  calibrationBucketSummary?: HistoricalBacktestingCalibrationBucketSummary;
  datasetCompleteness: HistoricalBacktestingDatasetCompleteness;
  lookAheadGuardrailStatus: HistoricalTournamentReplayLookAheadStatus;
  warnings: readonly HistoricalTournamentReplayWarning[];
  modelVersion?: string;
  dataCutoff?: string;
}

export interface HistoricalTournamentReplaySnapshotTypeSummary {
  snapshotType: HistoricalBacktestingSnapshotType;
  count: number;
}

export interface HistoricalTournamentReplayAggregateSummary {
  yearsEvaluated: number[];
  tournamentCount: number;
  averageBrierScore: number;
  averageLogLoss: number;
  top1HitRate: number;
  top3HitRate: number;
  top5HitRate: number;
  warnings: readonly HistoricalTournamentReplayWarning[];
  snapshotTypeSummary: readonly HistoricalTournamentReplaySnapshotTypeSummary[];
}

export interface HistoricalTournamentReplayMetadata {
  fixtureSubsetCount: number;
  snapshotCount: number;
  expectedMatchesPerTournament: number;
  calibrationBucketSize: number;
  notes: readonly string[];
}

export interface HistoricalTournamentReplayInput {
  fixtureSubsets: readonly HistoricalTournamentFixtureSubset[];
  snapshots: readonly HistoricalTournamentReplaySnapshotInput[];
  expectedMatchesPerTournament?: number;
  calibrationBucketSize?: number;
}

export interface HistoricalTournamentReplayBacktestResult {
  results: readonly HistoricalTournamentReplayYearResult[];
  summary: HistoricalTournamentReplayAggregateSummary;
  metadata: HistoricalTournamentReplayMetadata;
}

export interface HistoricalMonteCarloEloToExpectedGoalsConfig {
  baseExpectedGoals: number;
  eloAdjustmentPer100: number;
  maxGoalAdjustment: number;
  minExpectedGoals: number;
  poissonConfig: PoissonConfig;
}

export interface HistoricalMonteCarloReplayFixtureInput {
  homeTeam: string;
  awayTeam: string;
}

export interface HistoricalMonteCarloReplayGroupInput {
  name: string;
  teams: readonly string[];
  fixtures: readonly HistoricalMonteCarloReplayFixtureInput[];
  qualifiersCount?: number;
}

export interface HistoricalMonteCarloReplayTournamentInput {
  name: string;
  groups: readonly HistoricalMonteCarloReplayGroupInput[];
  groupQualifiersCount?: number;
  metadata?: Record<string, string>;
}

export interface HistoricalMonteCarloReplaySimulationConfig {
  simulationCount: number;
  seed?: number;
  random?: RandomFunction;
  maxSimulationCount?: number;
}

export type HistoricalMonteCarloReplayWarningCode =
  | "uncalibrated_elo_to_goals"
  | "foundation_historical_data"
  | "simplified_tournament_bracket";

export type HistoricalMonteCarloReplayWarningSeverity = "info" | "warning" | "error";

export interface HistoricalMonteCarloReplayWarning {
  code: HistoricalMonteCarloReplayWarningCode;
  severity: HistoricalMonteCarloReplayWarningSeverity;
  message: string;
  tournamentYear?: number;
}

export interface HistoricalMonteCarloReplayYearMetadata {
  tournamentName: string;
  simulationCount: number;
  seed?: number;
  snapshotModelVersion?: string;
  snapshotDataCutoff?: string;
  snapshotDataCoverage: HistoricalEloReplayDataCoverage;
  eloToExpectedGoalsConfig: HistoricalMonteCarloEloToExpectedGoalsConfig;
  tournamentFormat: string;
  notes: readonly string[];
}

export interface HistoricalMonteCarloReplayYearInput {
  fixtureSubset: HistoricalTournamentFixtureSubset;
  snapshot: GeneratedHistoricalEloSnapshot;
  tournamentInput: HistoricalMonteCarloReplayTournamentInput;
  simulationConfig: HistoricalMonteCarloReplaySimulationConfig;
  eloToExpectedGoalsConfig?: Partial<HistoricalMonteCarloEloToExpectedGoalsConfig>;
}

export interface HistoricalMonteCarloReplayYearResult {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  actualChampion: string;
  actualRunnerUp: string;
  snapshotType: HistoricalBacktestingSnapshotType;
  simulationCount: number;
  championProbability: number;
  championRank: number | null;
  runnerUpProbability: number;
  runnerUpRank: number | null;
  championTop1Hit: boolean;
  championTop3Hit: boolean;
  championTop5Hit: boolean;
  brierScore: number;
  logLoss: number;
  championProbabilities: readonly TournamentTeamProbabilitySummary[];
  runnerUpProbabilities: readonly TournamentTeamProbabilitySummary[];
  warnings: readonly HistoricalMonteCarloReplayWarning[];
  metadata: HistoricalMonteCarloReplayYearMetadata;
}

export interface HistoricalMonteCarloReplaySimulationCountSummary {
  min: number;
  max: number;
  total: number;
}

export interface HistoricalMonteCarloReplayAggregateSummary {
  yearsEvaluated: number[];
  tournamentCount: number;
  averageBrierScore: number;
  averageLogLoss: number;
  top1HitRate: number;
  top3HitRate: number;
  top5HitRate: number;
  warnings: readonly HistoricalMonteCarloReplayWarning[];
  simulationCountSummary: HistoricalMonteCarloReplaySimulationCountSummary;
}

export interface HistoricalMonteCarloReplayMetadata {
  replayCount: number;
  notes: readonly string[];
}

export interface HistoricalMonteCarloReplayInput {
  replays: readonly HistoricalMonteCarloReplayYearInput[];
}

export interface HistoricalMonteCarloReplayResult {
  results: readonly HistoricalMonteCarloReplayYearResult[];
  summary: HistoricalMonteCarloReplayAggregateSummary;
  metadata: HistoricalMonteCarloReplayMetadata;
}
