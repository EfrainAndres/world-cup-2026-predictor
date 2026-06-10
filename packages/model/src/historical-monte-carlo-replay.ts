import { extractActualChampion, extractActualRunnerUp } from "./backtesting.js";
import { calculateChampionBrierScore, calculateChampionLogLoss, isTeamInTopN, validateProbabilitySnapshot } from "./historical-validation.js";
import { DEFAULT_POISSON_CONFIG, generateScoreMatrix } from "./poisson.js";
import { runTournamentRepeatedRuns } from "./tournament-runs.js";
import type {
  ExpectedGoalsInput,
  GeneratedHistoricalEloSnapshot,
  GroupInput,
  HistoricalMonteCarloEloToExpectedGoalsConfig,
  HistoricalMonteCarloReplayAggregateSummary,
  HistoricalMonteCarloReplayInput,
  HistoricalMonteCarloReplayResult,
  HistoricalMonteCarloReplaySimulationConfig,
  HistoricalMonteCarloReplayTournamentInput,
  HistoricalMonteCarloReplayWarning,
  HistoricalMonteCarloReplayWarningCode,
  HistoricalMonteCarloReplayYearInput,
  HistoricalMonteCarloReplayYearMetadata,
  HistoricalMonteCarloReplayYearResult,
  ScorelineProbability,
  TournamentInput,
  TournamentTeamProbabilitySummary
} from "./types.js";

export const HISTORICAL_MONTE_CARLO_REPLAY_MODEL_VERSION = "historical-monte-carlo-replay-foundation-v1";
export const UNCALIBRATED_ELO_TO_GOALS_WARNING =
  "Elo-to-expected-goals mapping is an uncalibrated foundation and must not be treated as final model accuracy.";
export const FOUNDATION_HISTORICAL_DATA_WARNING =
  "Historical Monte Carlo replay is foundation-only when full pre-tournament international match history is unavailable.";
export const SIMPLIFIED_TOURNAMENT_BRACKET_WARNING =
  "Historical Monte Carlo replay currently uses explicit simplified tournament fixtures; full historical bracket reconstruction is future work.";

export const DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG: HistoricalMonteCarloEloToExpectedGoalsConfig = {
  baseExpectedGoals: 1.35,
  eloAdjustmentPer100: 0.12,
  maxGoalAdjustment: 0.75,
  minExpectedGoals: 0.2,
  poissonConfig: DEFAULT_POISSON_CONFIG
};

function assertNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function resolveEloToExpectedGoalsConfig(
  config: Partial<HistoricalMonteCarloEloToExpectedGoalsConfig> | undefined
): HistoricalMonteCarloEloToExpectedGoalsConfig {
  const resolvedConfig: HistoricalMonteCarloEloToExpectedGoalsConfig = {
    baseExpectedGoals: config?.baseExpectedGoals ?? DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG.baseExpectedGoals,
    eloAdjustmentPer100: config?.eloAdjustmentPer100 ?? DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG.eloAdjustmentPer100,
    maxGoalAdjustment: config?.maxGoalAdjustment ?? DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG.maxGoalAdjustment,
    minExpectedGoals: config?.minExpectedGoals ?? DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG.minExpectedGoals,
    poissonConfig: config?.poissonConfig ?? DEFAULT_HISTORICAL_MONTE_CARLO_ELO_TO_GOALS_CONFIG.poissonConfig
  };

  if (!Number.isFinite(resolvedConfig.baseExpectedGoals) || resolvedConfig.baseExpectedGoals <= 0) {
    throw new Error("baseExpectedGoals must be a finite positive number.");
  }

  if (!Number.isFinite(resolvedConfig.eloAdjustmentPer100) || resolvedConfig.eloAdjustmentPer100 < 0) {
    throw new Error("eloAdjustmentPer100 must be a finite number greater than or equal to 0.");
  }

  if (!Number.isFinite(resolvedConfig.maxGoalAdjustment) || resolvedConfig.maxGoalAdjustment < 0) {
    throw new Error("maxGoalAdjustment must be a finite number greater than or equal to 0.");
  }

  if (!Number.isFinite(resolvedConfig.minExpectedGoals) || resolvedConfig.minExpectedGoals <= 0) {
    throw new Error("minExpectedGoals must be a finite positive number.");
  }

  if (resolvedConfig.minExpectedGoals > resolvedConfig.baseExpectedGoals + resolvedConfig.maxGoalAdjustment) {
    throw new Error("minExpectedGoals is too high for the configured base expected goals and maximum adjustment.");
  }

  return resolvedConfig;
}

function validateSimulationConfig(config: HistoricalMonteCarloReplaySimulationConfig): void {
  const maxSimulationCount = config.maxSimulationCount ?? 10_000;

  if (!Number.isInteger(config.simulationCount) || config.simulationCount < 1) {
    throw new Error("simulationCount must be a positive integer.");
  }

  if (!Number.isInteger(maxSimulationCount) || maxSimulationCount < 1) {
    throw new Error("maxSimulationCount must be a positive integer.");
  }

  if (config.simulationCount > maxSimulationCount) {
    throw new Error(`simulationCount must be ${maxSimulationCount} or less.`);
  }
}

function getEloRating(snapshot: GeneratedHistoricalEloSnapshot, team: string): number {
  assertNonEmptyText(team, "team");
  const entry = snapshot.eloRatings.find((candidate) => candidate.team === team.trim());

  if (entry === undefined) {
    throw new Error(`Missing Elo rating for team: ${team.trim()}`);
  }

  return entry.eloRating;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function mapEloRatingsToExpectedGoals(
  homeEloRating: number,
  awayEloRating: number,
  config: Partial<HistoricalMonteCarloEloToExpectedGoalsConfig> = {}
): ExpectedGoalsInput {
  const resolvedConfig = resolveEloToExpectedGoalsConfig(config);

  if (!Number.isFinite(homeEloRating) || homeEloRating <= 0) {
    throw new Error("homeEloRating must be a finite positive number.");
  }

  if (!Number.isFinite(awayEloRating) || awayEloRating <= 0) {
    throw new Error("awayEloRating must be a finite positive number.");
  }

  const ratingDifference = homeEloRating - awayEloRating;
  const rawAdjustment = (ratingDifference / 100) * resolvedConfig.eloAdjustmentPer100;
  const adjustment = clamp(rawAdjustment, -resolvedConfig.maxGoalAdjustment, resolvedConfig.maxGoalAdjustment);

  return {
    expectedHomeGoals: Math.max(resolvedConfig.minExpectedGoals, resolvedConfig.baseExpectedGoals + adjustment),
    expectedAwayGoals: Math.max(resolvedConfig.minExpectedGoals, resolvedConfig.baseExpectedGoals - adjustment)
  };
}

export function buildPairwiseExpectedGoalsFromEloSnapshot(
  snapshot: GeneratedHistoricalEloSnapshot,
  homeTeam: string,
  awayTeam: string,
  config: Partial<HistoricalMonteCarloEloToExpectedGoalsConfig> = {}
): ExpectedGoalsInput {
  return mapEloRatingsToExpectedGoals(getEloRating(snapshot, homeTeam), getEloRating(snapshot, awayTeam), config);
}

export function generatePairwisePoissonMatrixFromEloSnapshot(
  snapshot: GeneratedHistoricalEloSnapshot,
  homeTeam: string,
  awayTeam: string,
  config: Partial<HistoricalMonteCarloEloToExpectedGoalsConfig> = {}
): ScorelineProbability[] {
  const resolvedConfig = resolveEloToExpectedGoalsConfig(config);
  const expectedGoals = buildPairwiseExpectedGoalsFromEloSnapshot(snapshot, homeTeam, awayTeam, resolvedConfig);

  return generateScoreMatrix(expectedGoals, resolvedConfig.poissonConfig);
}

function buildNeutralKnockoutMatrix(config: HistoricalMonteCarloEloToExpectedGoalsConfig): ScorelineProbability[] {
  return generateScoreMatrix(
    {
      expectedHomeGoals: config.baseExpectedGoals,
      expectedAwayGoals: config.baseExpectedGoals
    },
    config.poissonConfig
  );
}

function buildTournamentInput(
  input: HistoricalMonteCarloReplayTournamentInput,
  snapshot: GeneratedHistoricalEloSnapshot,
  config: HistoricalMonteCarloEloToExpectedGoalsConfig
): TournamentInput {
  const groups: GroupInput[] = input.groups.map((group) => {
    assertNonEmptyText(group.name, "group name");

    return {
      name: group.name,
      teams: group.teams.map((team) => ({ name: team })),
      matches: group.fixtures.map((fixture) => ({
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        scoreMatrix: generatePairwisePoissonMatrixFromEloSnapshot(snapshot, fixture.homeTeam, fixture.awayTeam, config)
      })),
      ...(group.qualifiersCount === undefined ? {} : { qualifiersCount: group.qualifiersCount })
    };
  });
  const tournamentInput: TournamentInput = {
    name: input.name,
    groups,
    knockoutScoreMatrix: buildNeutralKnockoutMatrix(config),
    metadata: {
      modelVersion: HISTORICAL_MONTE_CARLO_REPLAY_MODEL_VERSION,
      snapshotType: snapshot.snapshotType,
      note: "Simplified foundation tournament replay"
    }
  };

  if (input.groupQualifiersCount !== undefined) {
    tournamentInput.groupQualifiersCount = input.groupQualifiersCount;
  }

  if (input.metadata !== undefined) {
    tournamentInput.metadata = {
      ...tournamentInput.metadata,
      ...input.metadata
    };
  }

  return tournamentInput;
}

function getTeamProbability(probabilities: readonly TournamentTeamProbabilitySummary[], team: string): number {
  return probabilities.find((entry) => entry.team === team)?.probability ?? 0;
}

function getTeamRank(probabilities: readonly TournamentTeamProbabilitySummary[], team: string): number | null {
  const index = probabilities.findIndex((entry) => entry.team === team);

  return index === -1 ? null : index + 1;
}

function toTeamProbabilitySnapshot(probabilities: readonly TournamentTeamProbabilitySummary[]): { team: string; probability: number }[] {
  return probabilities.map((entry) => ({ team: entry.team, probability: entry.probability }));
}

function replayWarning(
  code: HistoricalMonteCarloReplayWarningCode,
  message: string,
  tournamentYear: number
): HistoricalMonteCarloReplayWarning {
  return {
    code,
    severity: "warning",
    message,
    tournamentYear
  };
}

function buildWarnings(snapshot: GeneratedHistoricalEloSnapshot, tournamentYear: number): HistoricalMonteCarloReplayWarning[] {
  const warnings = [
    replayWarning("uncalibrated_elo_to_goals", UNCALIBRATED_ELO_TO_GOALS_WARNING, tournamentYear),
    replayWarning("simplified_tournament_bracket", SIMPLIFIED_TOURNAMENT_BRACKET_WARNING, tournamentYear)
  ];

  if (snapshot.snapshotMetadata.dataCoverage !== "complete_international_history") {
    warnings.push(replayWarning("foundation_historical_data", FOUNDATION_HISTORICAL_DATA_WARNING, tournamentYear));
  }

  return warnings;
}

function uniqueWarnings(warnings: readonly HistoricalMonteCarloReplayWarning[]): HistoricalMonteCarloReplayWarning[] {
  const seenWarnings = new Set<string>();
  const unique: HistoricalMonteCarloReplayWarning[] = [];

  for (const warning of warnings) {
    const key = `${warning.code}|${warning.severity}|${warning.message}`;

    if (seenWarnings.has(key)) continue;

    seenWarnings.add(key);
    unique.push({
      code: warning.code,
      severity: warning.severity,
      message: warning.message
    });
  }

  return unique;
}

function buildMetadata(
  input: HistoricalMonteCarloReplayYearInput,
  config: HistoricalMonteCarloEloToExpectedGoalsConfig
): HistoricalMonteCarloReplayYearMetadata {
  const metadata: HistoricalMonteCarloReplayYearMetadata = {
    tournamentName: input.tournamentInput.name,
    simulationCount: input.simulationConfig.simulationCount,
    snapshotDataCoverage: input.snapshot.snapshotMetadata.dataCoverage,
    eloToExpectedGoalsConfig: config,
    tournamentFormat: "Simplified explicit group fixtures plus neutral knockout matrix",
    notes: [
      "Elo-to-goals mapping is deterministic but not calibrated.",
      "Group fixtures use pairwise Elo-derived Poisson matrices.",
      "Knockout fixtures use a neutral foundation matrix until historical bracket reconstruction is implemented."
    ]
  };

  if (input.snapshot.modelVersion !== undefined) {
    metadata.snapshotModelVersion = input.snapshot.modelVersion;
  }

  if (input.snapshot.dataCutoff !== undefined) {
    metadata.snapshotDataCutoff = input.snapshot.dataCutoff;
  }

  if (input.simulationConfig.seed !== undefined) {
    metadata.seed = input.simulationConfig.seed;
  }

  return metadata;
}

export function runHistoricalMonteCarloReplayYear(input: HistoricalMonteCarloReplayYearInput): HistoricalMonteCarloReplayYearResult {
  validateSimulationConfig(input.simulationConfig);
  const config = resolveEloToExpectedGoalsConfig(input.eloToExpectedGoalsConfig);
  const tournamentInput = buildTournamentInput(input.tournamentInput, input.snapshot, config);
  const repeatedRunConfig = {
    runCount: input.simulationConfig.simulationCount,
    ...(input.simulationConfig.seed === undefined ? {} : { seed: input.simulationConfig.seed }),
    ...(input.simulationConfig.random === undefined ? {} : { random: input.simulationConfig.random }),
    ...(input.simulationConfig.maxSimulationCount === undefined ? {} : { maxRunCount: input.simulationConfig.maxSimulationCount })
  };
  const replay = runTournamentRepeatedRuns(tournamentInput, repeatedRunConfig);
  const actualChampion = extractActualChampion(input.fixtureSubset);
  const actualRunnerUp = extractActualRunnerUp(input.fixtureSubset);
  const championProbabilities = replay.championProbabilities;
  const runnerUpProbabilities = replay.runnerUpProbabilities;
  const championProbabilitySnapshot = toTeamProbabilitySnapshot(championProbabilities);
  validateProbabilitySnapshot(championProbabilitySnapshot, "historical Monte Carlo champion probabilities");

  return {
    tournamentId: input.fixtureSubset.tournamentId,
    tournamentName: input.fixtureSubset.tournamentName,
    tournamentYear: input.fixtureSubset.tournamentYear,
    actualChampion,
    actualRunnerUp,
    snapshotType: input.snapshot.snapshotType,
    simulationCount: replay.totalRuns,
    championProbability: getTeamProbability(championProbabilities, actualChampion),
    championRank: getTeamRank(championProbabilities, actualChampion),
    runnerUpProbability: getTeamProbability(runnerUpProbabilities, actualRunnerUp),
    runnerUpRank: getTeamRank(runnerUpProbabilities, actualRunnerUp),
    championTop1Hit: isTeamInTopN(championProbabilitySnapshot, actualChampion, 1),
    championTop3Hit: isTeamInTopN(championProbabilitySnapshot, actualChampion, 3),
    championTop5Hit: isTeamInTopN(championProbabilitySnapshot, actualChampion, 5),
    brierScore: calculateChampionBrierScore(championProbabilitySnapshot, actualChampion),
    logLoss: calculateChampionLogLoss(championProbabilitySnapshot, actualChampion),
    championProbabilities,
    runnerUpProbabilities,
    warnings: buildWarnings(input.snapshot, input.fixtureSubset.tournamentYear),
    metadata: buildMetadata(input, config)
  };
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error("cannot average an empty value list.");
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeSimulationCounts(results: readonly HistoricalMonteCarloReplayYearResult[]) {
  const counts = results.map((result) => result.simulationCount);

  return {
    min: Math.min(...counts),
    max: Math.max(...counts),
    total: counts.reduce((sum, count) => sum + count, 0)
  };
}

function buildAggregateSummary(results: readonly HistoricalMonteCarloReplayYearResult[]): HistoricalMonteCarloReplayAggregateSummary {
  if (results.length === 0) {
    throw new Error("historical Monte Carlo replay summary requires at least one result.");
  }

  return {
    yearsEvaluated: results.map((result) => result.tournamentYear).sort((a, b) => a - b),
    tournamentCount: results.length,
    averageBrierScore: average(results.map((result) => result.brierScore)),
    averageLogLoss: average(results.map((result) => result.logLoss)),
    top1HitRate: results.filter((result) => result.championTop1Hit).length / results.length,
    top3HitRate: results.filter((result) => result.championTop3Hit).length / results.length,
    top5HitRate: results.filter((result) => result.championTop5Hit).length / results.length,
    warnings: uniqueWarnings(results.flatMap((result) => result.warnings)),
    simulationCountSummary: summarizeSimulationCounts(results)
  };
}

export function runHistoricalMonteCarloReplay(input: HistoricalMonteCarloReplayInput): HistoricalMonteCarloReplayResult {
  if (input.replays.length === 0) {
    throw new Error("historical Monte Carlo replay requires at least one replay input.");
  }

  const results = input.replays.map((replayInput) => runHistoricalMonteCarloReplayYear(replayInput)).sort((a, b) => a.tournamentYear - b.tournamentYear);

  return {
    results,
    summary: buildAggregateSummary(results),
    metadata: {
      replayCount: results.length,
      notes: [
        "Historical Monte Carlo replay uses deterministic pre-tournament snapshot inputs.",
        "Current outputs are foundation simulations, not public predictive accuracy claims."
      ]
    }
  };
}
