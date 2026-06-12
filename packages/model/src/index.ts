export type {
  LiveEloAttackDefenseConfig,
  LiveEloAttackDefenseMetadata,
  LiveEloCompetitionWeightCategory,
  LiveEloCompetitionWeightMap,
  LiveEloCompetitionWeightingConfig,
  LiveEloCompetitionWeightingMetadata,
  LiveEloDataCoverage,
  LiveEloHomeAdvantageConfig,
  LiveEloHomeAdvantageMetadata,
  LiveEloMatchLocationContext,
  LiveEloPipelineInput,
  LiveEloPipelineResult,
  LiveEloRankedEntry,
  LiveEloRecencyWeightingBucketConfig,
  LiveEloRecencyWeightingConfig,
  LiveEloRecencyWeightingMetadata
} from "./types.js";

export {
  DEFAULT_LIVE_ELO_HOME_ADVANTAGE_POINTS,
  LIVE_ELO_COMPETITION_WEIGHT_BUCKETS,
  LIVE_ELO_PIPELINE_ATTACK_DEFENSE_NO_GOAL_DATA_WARNING,
  LIVE_ELO_PIPELINE_ATTACK_DEFENSE_SPARSE_WARNING,
  LIVE_ELO_PIPELINE_ATTACK_DEFENSE_WARNING,
  LIVE_ELO_PIPELINE_HOME_ADVANTAGE_WARNING,
  LIVE_ELO_PIPELINE_COMPETITION_WEIGHTING_WARNING,
  LIVE_ELO_PIPELINE_FOUNDATION_WARNING,
  LIVE_ELO_PIPELINE_MISSING_COMPETITION_METADATA_WARNING,
  LIVE_ELO_PIPELINE_MISSING_NEUTRAL_SITE_METADATA_WARNING,
  LIVE_ELO_PIPELINE_NO_MATCHES_WARNING,
  LIVE_ELO_PIPELINE_RECENCY_WEIGHTING_WARNING,
  LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING,
  LIVE_ELO_PIPELINE_UNKNOWN_COMPETITION_WARNING,
  LIVE_ELO_RECENCY_WEIGHT_BUCKETS,
  LIVE_ELO_PIPELINE_VERSION,
  calculateEffectiveHomeRating,
  calculateLiveEloCompetitionWeight,
  calculateLiveEloRecencyWeight,
  classifyLiveEloCompetition,
  getLiveEloMatchLocationContext,
  runLiveEloPipeline
} from "./live-elo-pipeline.js";

export type {
  HistoricalReplayAccuracyAggregateAudit,
  HistoricalReplayAccuracyApiReadiness,
  HistoricalReplayAccuracyAuditComponent,
  HistoricalReplayAccuracyAuditInput,
  HistoricalReplayAccuracyAuditMetadata,
  HistoricalReplayAccuracyAuditResult,
  HistoricalReplayAccuracyAuditStatus,
  HistoricalReplayAccuracyAuditWarning,
  HistoricalReplayAccuracyAuditWarningCode,
  HistoricalReplayAccuracyMetricName,
  HistoricalReplayAccuracyYearAudit,
  HistoricalReplayMetricAvailability,
  HistoricalReplayYearComponentAudit,
  HistoricalReplayYearMetricAvailability
} from "./historical-replay-accuracy-audit.js";

export type {
  CompleteHistoricalReplayAggregateValidation,
  CompleteHistoricalReplayComponentStatus,
  CompleteHistoricalReplayValidationComponent,
  CompleteHistoricalReplayValidationInput,
  CompleteHistoricalReplayValidationMetadata,
  CompleteHistoricalReplayValidationResult,
  CompleteHistoricalReplayValidationStatus,
  CompleteHistoricalReplayValidationWarning,
  CompleteHistoricalReplayValidationWarningCode,
  CompleteHistoricalReplayYearValidation
} from "./complete-historical-replay-validation.js";

export type {
  HistoricalBracketMetadata,
  HistoricalBracketStage,
  HistoricalBracketValidationCode,
  HistoricalBracketValidationIssue,
  HistoricalBracketValidationResult,
  HistoricalBracketWarning,
  HistoricalFixturesByStage,
  HistoricalGroupName,
  HistoricalGroupStructure,
  HistoricalGroupTable,
  HistoricalGroupTableRow,
  HistoricalKnockoutFixture,
  HistoricalKnockoutRounds,
  HistoricalTournamentBracketFixtureInput,
  HistoricalTournamentBracketInput,
  ReconstructedHistoricalBracket
} from "./historical-brackets.js";

export type {
  EloConfig,
  EloMatch,
  EloMatchRatingHistory,
  EloProcessResult,
  EloRatingEntry,
  EloRatingMap,
  EloResult,
  DixonColesConfig,
  ExpectedGoalsInput,
  OutcomeProbabilities,
  PoissonConfig,
  ScorelineProbability,
  MonteCarloMatchSimulationResult,
  MonteCarloSimulationConfig,
  RandomFunction,
  SimulatedScoreline,
  SimulatedScorelineSummary,
  GroupInput,
  GroupMatchInput,
  GroupStanding,
  KnockoutFixtureInput,
  SimulatedGroupMatch,
  SimulatedGroupResult,
  SimulatedKnockoutMatch,
  SimulatedKnockoutRound,
  SimulatedTournamentResult,
  TournamentInput,
  TournamentMetadata,
  TournamentSimulationConfig,
  TournamentTeamInput,
  TournamentRepeatedRunsConfig,
  TournamentRepeatedRunsMetadata,
  TournamentRepeatedRunsResult,
  TournamentTeamProbabilitySummary,
  FIFA2026BracketSlot,
  FIFA2026Group,
  FIFA2026GroupId,
  FIFA2026GroupStanding,
  FIFA2026QualifiedTeam,
  FIFA2026QualificationSource,
  FIFA2026RoundOf32Fixture,
  FIFA2026Team,
  FIFA2026TournamentFormat,
  ActualTournamentResult,
  ChampionCalibrationBucket,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalBacktestInput,
  HistoricalBacktestResult,
  HistoricalBacktestSummary,
  HistoricalBacktestYearResult,
  HistoricalBacktestingCalibrationBucketSummary,
  HistoricalBacktestingDatasetCompleteness,
  HistoricalBacktestingReport,
  HistoricalBacktestingReportInput,
  HistoricalBacktestingReportPredictionInput,
  HistoricalBacktestingReportSummary,
  HistoricalBacktestingSnapshotType,
  HistoricalBacktestingYearReport,
  HistoricalTournamentEvaluationResult,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentPredictionInput,
  HistoricalTournamentReplayAggregateSummary,
  HistoricalTournamentReplayBacktestResult,
  HistoricalTournamentReplayInput,
  HistoricalTournamentReplayLookAheadStatus,
  HistoricalTournamentReplayMetadata,
  HistoricalTournamentReplaySnapshotInput,
  HistoricalTournamentReplaySnapshotTypeSummary,
  HistoricalTournamentReplayWarning,
  HistoricalTournamentReplayWarningCode,
  HistoricalTournamentReplayWarningSeverity,
  HistoricalTournamentReplayYearInput,
  HistoricalTournamentReplayYearResult,
  HistoricalValidationResult,
  GeneratedPreTournamentSnapshot,
  GeneratedHistoricalEloSnapshot,
  HistoricalEloReplayConfig,
  HistoricalEloReplayDataCoverage,
  HistoricalEloReplayInput,
  HistoricalEloReplayMetadata,
  HistoricalEloReplayRatingResult,
  HistoricalEloReplayWarning,
  HistoricalEloReplayWarningCode,
  HistoricalEloReplayWarningSeverity,
  HistoricalEloTeamSnapshot,
  HistoricalMonteCarloEloToExpectedGoalsConfig,
  HistoricalMonteCarloReplayAggregateSummary,
  HistoricalMonteCarloReplayFixtureInput,
  HistoricalMonteCarloReplayGroupInput,
  HistoricalMonteCarloReplayInput,
  HistoricalMonteCarloReplayMetadata,
  HistoricalMonteCarloReplayResult,
  HistoricalMonteCarloReplaySimulationConfig,
  HistoricalMonteCarloReplaySimulationCountSummary,
  HistoricalMonteCarloReplayTournamentInput,
  HistoricalMonteCarloReplayWarning,
  HistoricalMonteCarloReplayWarningCode,
  HistoricalMonteCarloReplayWarningSeverity,
  HistoricalMonteCarloReplayYearInput,
  HistoricalMonteCarloReplayYearMetadata,
  HistoricalMonteCarloReplayYearResult,
  KnockoutQualificationEvaluationResult,
  LookAheadGuardrailName,
  LookAheadGuardrailResult,
  LookAheadGuardrailSeverity,
  PreTournamentSnapshotInput,
  PreTournamentSnapshotMetadata,
  PreTournamentTeamSeedRating,
  RunnerUpEvaluationResult,
  SnapshotTeamProbability,
  TeamProbabilitySnapshot,
  ValidationMetricSummary
} from "./types.js";

export {
  DEFAULT_ELO_CONFIG,
  calculateExpectedScore,
  calculateRatingDelta,
  deriveEloResult,
  getCurrentTeamRatings,
  getRatingHistoryByTeam,
  initializeTeamRatings,
  processMatches,
  resultToScore,
  updateRatingsAfterMatch
} from "./elo.js";

export {
  DEFAULT_POISSON_CONFIG,
  calculateScorelineProbability,
  factorial,
  generateScoreMatrix,
  poissonProbability,
  validateExpectedGoals
} from "./poisson.js";

export { aggregateOutcomeProbabilities, getMostLikelyScorelines } from "./probability.js";

export {
  DEFAULT_DIXON_COLES_CONFIG,
  calculateDixonColesScorelineProbability,
  dixonColesAdjustmentFactor,
  generateDixonColesScoreMatrix
} from "./dixon-coles.js";

export { createSeededRandom, runMatchSimulations, simulateOneMatch, validateProbabilityMatrix } from "./simulation.js";

export { createInitialStandings, simulateGroup, sortGroupStandings, validateGroupInput } from "./group-stage.js";

export { simulateKnockoutMatch, simulateKnockoutRound, validateKnockoutFixture } from "./knockout.js";

export { simulateTournament } from "./tournament.js";

export { DEFAULT_TOURNAMENT_RUNS_MAX, runTournamentRepeatedRuns, summarizeTeamCounts } from "./tournament-runs.js";

export {
  FIFA_2026_BEST_THIRD_PLACE_TEAMS,
  FIFA_2026_GROUP_COUNT,
  FIFA_2026_GROUP_IDS,
  FIFA_2026_KNOCKOUT_TEAMS,
  FIFA_2026_TEAMS_PER_GROUP,
  FIFA_2026_TOP_TEAMS_PER_GROUP,
  FIFA_2026_TOTAL_TEAMS,
  FIFA_2026_TOURNAMENT_FORMAT,
  rankFIFA2026ThirdPlaceTeams,
  selectFIFA2026BestThirdPlaceTeams,
  selectFIFA2026GroupRunnersUp,
  selectFIFA2026GroupWinners,
  selectFIFA2026QualifiedTeams,
  validateFIFA2026Groups
} from "./fifa-2026-format.js";

export {
  FIFA_2026_ROUND_OF_32_FIXTURE_COUNT,
  buildSimpleFIFA2026RoundOf32Fixtures,
  validateFIFA2026RoundOf32Fixtures
} from "./fifa-2026-fixtures.js";

export {
  HISTORICAL_VALIDATION_EPSILON,
  buildChampionCalibrationBuckets,
  calculateChampionBrierScore,
  calculateChampionLogLoss,
  evaluateHistoricalTournamentPrediction,
  evaluateKnockoutQualificationPrediction,
  evaluateRunnerUpPrediction,
  isTeamInTopN,
  summarizeHistoricalTournamentValidations,
  validateHistoricalTournaments,
  validateProbabilitySnapshot
} from "./historical-validation.js";

export {
  PARTIAL_HISTORICAL_BACKTEST_WARNING,
  buildActualTournamentResultFromFixtureSubset,
  calculateBacktestBrierScore,
  calculateBacktestLogLoss,
  evaluateHistoricalBacktestYear,
  extractActualChampion,
  extractActualRunnerUp,
  generateBacktestCalibrationBuckets,
  runHistoricalBacktest
} from "./backtesting.js";

export {
  BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING,
  DEFAULT_HISTORICAL_REPORT_CALIBRATION_BUCKET_SIZE,
  DEFAULT_HISTORICAL_REPORT_EXPECTED_MATCHES,
  SYNTHETIC_REPORT_FIXTURE_WARNING,
  generateHistoricalBacktestingReport,
  generateHistoricalBacktestingYearReport,
  getProbabilityRank
} from "./backtesting-reports.js";

export {
  BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION,
  PROBABILITY_SUM_TOLERANCE,
  evaluateLookAheadGuardrails,
  generateBaselinePreTournamentSnapshot,
  normalizeRatingProbabilities,
  rankSnapshotProbabilities,
  validateGeneratedSnapshotProbabilities,
  validatePreTournamentSnapshotInput
} from "./pre-tournament-snapshots.js";

export {
  DEFAULT_HISTORICAL_ELO_REPLAY_CONFIG,
  HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING,
  HISTORICAL_ELO_REPLAY_SNAPSHOT_MODEL_VERSION,
  buildHistoricalEloRatings,
  generateHistoricalEloSnapshot,
  normalizeHistoricalEloProbabilities,
  rankHistoricalEloProbabilities,
  splitHistoricalEloMatchesByCutoff
} from "./historical-elo-snapshots.js";

export {
  HISTORICAL_TOURNAMENT_REPLAY_YEARS,
  MISSING_LOOKAHEAD_GUARDRAILS_WARNING,
  MODEL_SNAPSHOT_METADATA_MISSING_WARNING,
  evaluateHistoricalTournamentReplayYear,
  runHistoricalTournamentReplayBacktest
} from "./tournament-replay-backtesting.js";

export {
  DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG,
  FOUNDATION_HISTORICAL_DATA_WARNING,
  HISTORICAL_MONTE_CARLO_REPLAY_MODEL_VERSION,
  SIMPLIFIED_TOURNAMENT_BRACKET_WARNING,
  UNCALIBRATED_ELO_TO_GOALS_WARNING,
  buildPairwiseExpectedGoalsFromEloSnapshot,
  generatePairwisePoissonMatrixFromEloSnapshot,
  mapEloRatingsToExpectedGoals,
  runHistoricalMonteCarloReplay,
  runHistoricalMonteCarloReplayYear
} from "./historical-monte-carlo-replay.js";

export {
  EXPECTED_HISTORICAL_BRACKET_MATCHES,
  EXPECTED_HISTORICAL_FINAL_MATCHES,
  EXPECTED_HISTORICAL_GROUP_STAGE_MATCHES,
  EXPECTED_HISTORICAL_KNOCKOUT_AND_PLACEMENT_MATCHES,
  EXPECTED_HISTORICAL_QUARTER_FINAL_MATCHES,
  EXPECTED_HISTORICAL_ROUND_OF_16_MATCHES,
  EXPECTED_HISTORICAL_SEMI_FINAL_MATCHES,
  EXPECTED_HISTORICAL_THIRD_PLACE_MATCHES,
  HISTORICAL_32_TEAM_WORLD_CUP_FORMAT,
  HISTORICAL_BRACKET_GROUP_NAMES,
  HISTORICAL_BRACKET_RECONSTRUCTION_VERSION,
  groupHistoricalFixturesByYear,
  reconstructHistoricalBracket,
  reconstructHistoricalGroupStandings,
  reconstructHistoricalGroupStructures,
  reconstructHistoricalKnockoutProgression,
  separateHistoricalFixturesByStage,
  validateHistoricalBracketInput
} from "./historical-brackets.js";

export {
  HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION,
  HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING,
  auditHistoricalReplayAccuracy
} from "./historical-replay-accuracy-audit.js";

export {
  COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS,
  COMPLETE_HISTORICAL_REPLAY_FOUNDATION_WARNING,
  COMPLETE_HISTORICAL_REPLAY_VALIDATION_VERSION,
  validateCompleteHistoricalReplay
} from "./complete-historical-replay-validation.js";
