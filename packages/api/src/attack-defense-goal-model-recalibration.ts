import {
  ATTACK_DEFENSE_MAX_BLOWOUT_RATE_DELTA,
  ATTACK_DEFENSE_MAX_CLAMP_RATE,
  aggregateOutcomeProbabilities,
  buildNeutralAttackDefenseProfile,
  computeRecalibratedAttackDefenseGoalModel,
  generateScoreMatrix,
  getMostLikelyScorelines,
} from "../../model/src/index.js";
import type {
  AttackDefenseRecalibrationConfig,
  AttackDefenseProfileCoverage,
  AttackDefenseProfileStrategy,
  AttackDefenseRecencyStrategy,
  CompetitionGoalEnvironment,
  RecalibratedGoalModelCandidate,
  TeamAttackDefenseProfile,
} from "../../model/src/index.js";
import {
  BACKTEST_MIN_PROFILE_COVERAGE_RATE,
  BACKTEST_PROMOTION_MAX_BRIER_REGRESSION,
  BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION,
  BACKTEST_PROMOTION_MAX_LOG_LOSS_REGRESSION,
  type GoalModelEvalFixture,
  loadEvaluationFixtures,
} from "./attack-defense-goal-model-backtest.js";
import {
  buildCompetitionGoalEnvironment,
  buildProfilesForEvaluationSet,
  type HistoricalMatchRecord,
} from "./attack-defense-profile-builder.js";
import { loadHistoricalInternationalScoredFixtures } from "./historical-international-fixtures.js";
import type { HistoricalInternationalScoredFixture } from "./historical-international-fixtures.js";
import { canonicalizeTeamName } from "./team-aliases.js";
import {
  DEFAULT_ELO_CONFIG,
  processMatches,
} from "../../model/src/index.js";
import type { EloMatch } from "../../model/src/index.js";

export type AttackDefenseRecalibrationDecision =
  | "promote_recalibrated_candidate"
  | "retain_elo_v2"
  | "recalibration_improved_but_not_ready"
  | "goal_calibration_blocked"
  | "probability_calibration_blocked"
  | "diversity_only_improvement"
  | "data_quality_blocked";

export interface RecalibrationCandidateConfig extends AttackDefenseRecalibrationConfig {
  id: string;
}

export interface RecalibrationFixturePrediction {
  matchId: string;
  homeXg: number;
  awayXg: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  modalHomeGoals: number;
  modalAwayGoals: number;
  topScorelines: ReadonlyArray<{ homeGoals: number; awayGoals: number; probability: number }>;
  homeCoverage: AttackDefenseProfileCoverage;
  awayCoverage: AttackDefenseProfileCoverage;
  componentLogs: {
    attack: number;
    defense: number;
    elo: number;
    venue: number;
  };
  clamped: boolean;
  clampedAtMinimum: boolean;
  clampedAtMaximum: boolean;
}

export interface ProbabilityCalibrationBucket {
  bucket: string;
  count: number;
  averagePredicted: number | null;
  observedRate: number | null;
  absoluteError: number | null;
}

export interface ProbabilityCalibrationSummary {
  homeWin: ProbabilityCalibrationBucket[];
  draw: ProbabilityCalibrationBucket[];
  awayWin: ProbabilityCalibrationBucket[];
  expectedCalibrationError: number | null;
  maximumCalibrationError: number | null;
  favoriteBuckets: ProbabilityCalibrationBucket[];
  underConfidenceRate: number | null;
  overConfidenceRate: number | null;
}

export interface GoalCalibrationSummary {
  avgPredictedHomeGoals: number | null;
  avgActualHomeGoals: number | null;
  avgPredictedAwayGoals: number | null;
  avgActualAwayGoals: number | null;
  avgPredictedTotalGoals: number | null;
  avgActualTotalGoals: number | null;
  totalGoalBuckets: ProbabilityCalibrationBucket[];
  totalGoalUnderpredictionRate: number | null;
  totalGoalOverpredictionRate: number | null;
}

export interface ExtremeDiagnostics {
  xgBelow05: number;
  xgBelow08: number;
  xgAbove15: number;
  xgAbove20: number;
  xgAbove25: number;
  xgClampedAtMinimum: number;
  xgClampedAtMaximum: number;
  clampRate: number | null;
  predictedThreePlusGoalMargins: number;
  predictedFourPlusGoalTotals: number;
  predictedFivePlusGoalTotals: number;
  actualThreePlusGoalMargins: number;
  actualFourPlusGoalTotals: number;
  actualFivePlusGoalTotals: number;
  blowoutRateDelta: number | null;
}

export interface ComponentContributionSummary {
  averageAttackContributionLog: number | null;
  averageDefenseContributionLog: number | null;
  averageEloContributionLog: number | null;
  averageVenueContributionLog: number | null;
  averageAbsoluteAttackContributionLog: number | null;
  averageAbsoluteDefenseContributionLog: number | null;
  averageAbsoluteEloContributionLog: number | null;
  averageAbsoluteVenueContributionLog: number | null;
  largestAverageFactor: "attack" | "defense" | "elo" | "venue" | null;
  clampFrequency: number | null;
  combinedFactorThresholdExceedances: number;
}

export interface RecalibrationMetrics {
  candidateId: string;
  fixtureCount: number;
  brierScore: number | null;
  logLoss: number | null;
  outcomeAccuracy: number | null;
  homeGoalMae: number | null;
  awayGoalMae: number | null;
  totalGoalMae: number | null;
  exactScoreAccuracy: number | null;
  top3ScoreCoverage: number | null;
  top5ScoreCoverage: number | null;
  top10ScoreCoverage: number | null;
  uniqueXgPairCount: number;
  uniqueModalScorelineCount: number;
  modalOneOneFrequency: number | null;
  recommended10Frequency: number | null;
  recommended20Frequency: number | null;
  recommended21Frequency: number | null;
  recommended30Frequency: number | null;
  recommended31Frequency: number | null;
  recommendedFourPlusTotalFrequency: number | null;
  probabilityCalibration: ProbabilityCalibrationSummary;
  goalCalibration: GoalCalibrationSummary;
  extremes: ExtremeDiagnostics;
  componentContributions: ComponentContributionSummary;
}

export interface RecalibrationDecisionReport {
  decision: AttackDefenseRecalibrationDecision;
  selectedCandidateId: string | null;
  reasons: string[];
  blockers: string[];
  deltas: {
    brier: number | null;
    logLoss: number | null;
    homeGoalMae: number | null;
    awayGoalMae: number | null;
    totalGoalMae: number | null;
  };
}

export interface AttackDefenseGoalModelRecalibrationResult {
  schemaVersion: string;
  generatedAt: string;
  tuningYear: 2018;
  validationYear: 2022;
  profileStrategy: AttackDefenseProfileStrategy;
  recencyStrategy: AttackDefenseRecencyStrategy;
  parameterGridSize: number;
  selectedConfig: RecalibrationCandidateConfig | null;
  tuning: {
    baseline: RecalibrationMetrics;
    current: RecalibrationMetrics;
    selected: RecalibrationMetrics | null;
  };
  validation: {
    baseline: RecalibrationMetrics;
    current: RecalibrationMetrics;
    selected: RecalibrationMetrics | null;
  };
  combined: {
    baseline: RecalibrationMetrics;
    current: RecalibrationMetrics;
    selected: RecalibrationMetrics | null;
  };
  topCandidates: {
    byBrier: RecalibrationMetrics[];
    byLogLoss: RecalibrationMetrics[];
    byTotalGoalMae: RecalibrationMetrics[];
    byBalancedScore: RecalibrationMetrics[];
  };
  rejectedExtremeCandidateSummary: {
    clampBlocked: number;
    blowoutBlocked: number;
  };
  profileCoverageSummary: {
    coverageCounts: Record<AttackDefenseProfileCoverage, number>;
    fallbackRate: number;
    noLookAheadViolations: number;
  };
  decision: RecalibrationDecisionReport;
}

const RECALIBRATION_SCHEMA_VERSION = "1.0.0";
const LOG_EPSILON = 1e-15;
const MAX_GOALS = 7;
const COMPONENT_FACTOR_THRESHOLD = 0.45;
const TOP_RETAINED_COUNT = 8;

function toHistoricalMatchRecord(fixture: HistoricalInternationalScoredFixture): HistoricalMatchRecord {
  return {
    matchId: fixture.fixtureId,
    matchDate: fixture.kickoffAt.slice(0, 10),
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeScore: fixture.homeGoals,
    awayScore: fixture.awayGoals,
    neutralSite: fixture.neutralVenue,
    competition: fixture.competitionId,
    stage: fixture.stage ?? "",
  };
}

function loadHistoricalMatchRecords(): HistoricalMatchRecord[] {
  return loadHistoricalInternationalScoredFixtures({ mode: "expanded" })
    .filter((fixture) => fixture.kickoffAt < "2026-01-01")
    .map(toHistoricalMatchRecord);
}

function buildEloAtDateMap(historicalMatches: readonly HistoricalMatchRecord[]): Map<string, Map<string, number>> {
  const allEloMatches: EloMatch[] = historicalMatches
    .filter((match) => match.matchDate < "2026-01-01")
    .map((match): EloMatch => ({
      match_id: match.matchId,
      match_date: match.matchDate,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      home_score: match.homeScore,
      away_score: match.awayScore,
      neutral_site: match.neutralSite,
      competition: match.competition,
      result: match.homeScore > match.awayScore ? "home_win" : match.homeScore < match.awayScore ? "away_win" : "draw",
    }))
    .sort((a, b) => a.match_date.localeCompare(b.match_date) || a.match_id.localeCompare(b.match_id));

  const replay = processMatches(allEloMatches, DEFAULT_ELO_CONFIG);
  const teamEloAtDate = new Map<string, Map<string, number>>();
  for (const history of replay.matchHistory) {
    const homeTeam = canonicalizeTeamName(history.home_team);
    const awayTeam = canonicalizeTeamName(history.away_team);
    if (!teamEloAtDate.has(homeTeam)) teamEloAtDate.set(homeTeam, new Map());
    if (!teamEloAtDate.has(awayTeam)) teamEloAtDate.set(awayTeam, new Map());
    teamEloAtDate.get(homeTeam)!.set(history.match_date, history.home_rating_before);
    teamEloAtDate.get(awayTeam)!.set(history.match_date, history.away_rating_before);
  }
  return teamEloAtDate;
}

function configId(config: AttackDefenseRecalibrationConfig): string {
  const encode = (value: number) => value.toFixed(2).replace(".", "p");
  return [
    config.candidate,
    `a${encode(config.attackWeight)}`,
    `d${encode(config.defenseWeight)}`,
    `e${encode(config.eloWeight)}`,
    `v${encode(config.venueWeight)}`,
    `b${encode(config.attackDefenseBlendWeight)}`,
    `r${encode(config.residualCap)}`,
    config.coverageDampingEnabled ? "damp1" : "damp0",
  ].join("__");
}

function withId(config: AttackDefenseRecalibrationConfig): RecalibrationCandidateConfig {
  return { ...config, id: configId(config) };
}

export function buildAttackDefenseRecalibrationGrid(): RecalibrationCandidateConfig[] {
  const configs: RecalibrationCandidateConfig[] = [];
  const seen = new Set<string>();
  const add = (config: AttackDefenseRecalibrationConfig): void => {
    const candidate = withId(config);
    if (seen.has(candidate.id)) return;
    seen.add(candidate.id);
    configs.push(candidate);
  };

  const attackWeights = [0.2, 0.35, 0.5, 0.65];
  const defenseWeights = [0.2, 0.35, 0.5, 0.65];
  const eloWeights = [0, 0.25, 0.5, 0.75];
  const blendWeights = [0.2, 0.35, 0.5];
  const residualCaps = [0.1, 0.2, 0.3];
  const dampingModes = [true, false];

  for (const attackWeight of attackWeights) {
    for (const defenseWeight of defenseWeights) {
      for (const eloWeight of eloWeights) {
        for (const coverageDampingEnabled of dampingModes) {
          add({
            candidate: "attack_defense_log_linear_damped",
            attackWeight,
            defenseWeight,
            eloWeight,
            venueWeight: 0.5,
            attackDefenseBlendWeight: 1,
            residualCap: 0.2,
            coverageDampingEnabled,
          });
        }
      }
    }
  }

  for (const residualCap of residualCaps) {
    for (const coverageDampingEnabled of dampingModes) {
      add({
        candidate: "attack_defense_residual_over_elo",
        attackWeight: 0.35,
        defenseWeight: 0.35,
        eloWeight: 0,
        venueWeight: 0,
        attackDefenseBlendWeight: 0,
        residualCap,
        coverageDampingEnabled,
      });
    }
  }

  for (const attackDefenseBlendWeight of blendWeights) {
    for (const attackWeight of [0.35, 0.5]) {
      for (const defenseWeight of [0.35, 0.5]) {
        for (const eloWeight of [0, 0.25]) {
          for (const coverageDampingEnabled of dampingModes) {
            add({
              candidate: "attack_defense_calibrated_blend",
              attackWeight,
              defenseWeight,
              eloWeight,
              venueWeight: 0.5,
              attackDefenseBlendWeight,
              residualCap: 0.2,
              coverageDampingEnabled,
            });
          }
        }
      }
    }
  }

  for (const attackWeight of [0.2, 0.35, 0.5]) {
    for (const defenseWeight of [0.2, 0.35, 0.5]) {
      for (const eloWeight of [0, 0.25]) {
        add({
          candidate: "attack_defense_regularized",
          attackWeight,
          defenseWeight,
          eloWeight,
          venueWeight: 0.5,
          attackDefenseBlendWeight: 1,
          residualCap: 0.2,
          coverageDampingEnabled: true,
        });
      }
    }
  }

  return configs.sort((a, b) => a.id.localeCompare(b.id));
}

const BASELINE_CONFIG: RecalibrationCandidateConfig = withId({
  candidate: "elo_only_v2_baseline",
  attackWeight: 0,
  defenseWeight: 0,
  eloWeight: 0,
  venueWeight: 0,
  attackDefenseBlendWeight: 0,
  residualCap: 0,
  coverageDampingEnabled: false,
});

const CURRENT_CONFIG: RecalibrationCandidateConfig = withId({
  candidate: "attack_defense_log_linear_current",
  attackWeight: 1,
  defenseWeight: 1,
  eloWeight: 1,
  venueWeight: 1,
  attackDefenseBlendWeight: 1,
  residualCap: 0.2,
  coverageDampingEnabled: false,
});

function splitFixtures(fixtures: readonly GoalModelEvalFixture[], year: number): GoalModelEvalFixture[] {
  return fixtures.filter((fixture) => fixture.tournamentYear === year);
}

function buildProfileContext(input: {
  fixtures: readonly GoalModelEvalFixture[];
  historicalMatches: readonly HistoricalMatchRecord[];
  teamEloAtDate: Map<string, Map<string, number>>;
  profileStrategy: AttackDefenseProfileStrategy;
  recencyStrategy: AttackDefenseRecencyStrategy;
}): {
  profilesByYear: Map<number, Map<string, TeamAttackDefenseProfile>>;
  envByYear: Map<number, CompetitionGoalEnvironment>;
  coverageCounts: Record<AttackDefenseProfileCoverage, number>;
  noLookAheadViolations: number;
} {
  const profilesByYear = new Map<number, Map<string, TeamAttackDefenseProfile>>();
  const envByYear = new Map<number, CompetitionGoalEnvironment>();
  const coverageCounts: Record<AttackDefenseProfileCoverage, number> = {
    full: 0,
    partial: 0,
    sparse: 0,
    fallback: 0,
  };
  let noLookAheadViolations = 0;

  for (const year of [2018, 2022]) {
    const cutoffAt = `${year}-01-01`;
    const yearFixtures = splitFixtures(input.fixtures, year);
    const teams = new Set<string>();
    for (const fixture of yearFixtures) {
      teams.add(fixture.homeTeam);
      teams.add(fixture.awayTeam);
    }
    const preCutoff = input.historicalMatches.filter((match) => match.matchDate < cutoffAt);
    const env = buildCompetitionGoalEnvironment({
      historicalMatches: preCutoff,
      cutoffAt,
      competitionId: "world_cup",
    });
    envByYear.set(year, env);
    const profiles = buildProfilesForEvaluationSet({
      teams: [...teams],
      cutoffAt,
      historicalMatches: preCutoff,
      competitionEnv: env,
      teamEloAtDate: input.teamEloAtDate,
      recencyStrategy: input.recencyStrategy,
      profileStrategy: input.profileStrategy,
    });
    profilesByYear.set(year, profiles.profiles);
    noLookAheadViolations += profiles.totalNoLookAheadViolations;
    for (const [coverage, count] of Object.entries(profiles.coverageSummary) as [AttackDefenseProfileCoverage, number][]) {
      coverageCounts[coverage] += count;
    }
  }

  return { profilesByYear, envByYear, coverageCounts, noLookAheadViolations };
}

function predictFixture(input: {
  fixture: GoalModelEvalFixture;
  config: RecalibrationCandidateConfig;
  profilesByYear: Map<number, Map<string, TeamAttackDefenseProfile>>;
  envByYear: Map<number, CompetitionGoalEnvironment>;
}): RecalibrationFixturePrediction {
  const profiles = input.profilesByYear.get(input.fixture.tournamentYear) ?? new Map<string, TeamAttackDefenseProfile>();
  const env = input.envByYear.get(input.fixture.tournamentYear) ?? {
    competitionId: "world_cup",
    averageHomeGoals: 1.25,
    averageAwayGoals: 1.25,
    averageTotalGoals: 2.5,
    sampleSize: 0,
    cutoffAt: input.fixture.profileCutoffDate,
  };
  const homeProfile = profiles.get(input.fixture.homeTeam) ?? buildNeutralAttackDefenseProfile(input.fixture.homeTeam, env);
  const awayProfile = profiles.get(input.fixture.awayTeam) ?? buildNeutralAttackDefenseProfile(input.fixture.awayTeam, env);
  const output = computeRecalibratedAttackDefenseGoalModel(
    {
      homeTeamId: input.fixture.homeTeam,
      awayTeamId: input.fixture.awayTeam,
      competition: env,
      homeProfile,
      awayProfile,
      homeElo: 1500,
      awayElo: 1500,
      neutralVenue: input.fixture.neutralSite,
    },
    input.config
  );
  const matrix = generateScoreMatrix(
    { expectedHomeGoals: output.homeXg, expectedAwayGoals: output.awayXg },
    { maxGoals: MAX_GOALS, normalizeMatrix: true }
  );
  const probs = aggregateOutcomeProbabilities(matrix);
  const topScorelines = getMostLikelyScorelines(matrix, 10);

  return {
    matchId: input.fixture.matchId,
    homeXg: output.homeXg,
    awayXg: output.awayXg,
    homeWinProb: probs.homeWinProbability,
    drawProb: probs.drawProbability,
    awayWinProb: probs.awayWinProbability,
    modalHomeGoals: topScorelines[0]?.homeGoals ?? 1,
    modalAwayGoals: topScorelines[0]?.awayGoals ?? 1,
    topScorelines,
    homeCoverage: homeProfile.coverage,
    awayCoverage: awayProfile.coverage,
    componentLogs: {
      attack: output.diagnostic.attackContributionLog,
      defense: output.diagnostic.defenseContributionLog,
      elo: output.diagnostic.eloContributionLog,
      venue: output.diagnostic.venueContributionLog,
    },
    clamped:
      output.diagnostic.homeClampedAtMinimum ||
      output.diagnostic.homeClampedAtMaximum ||
      output.diagnostic.awayClampedAtMinimum ||
      output.diagnostic.awayClampedAtMaximum,
    clampedAtMinimum: output.diagnostic.homeClampedAtMinimum || output.diagnostic.awayClampedAtMinimum,
    clampedAtMaximum: output.diagnostic.homeClampedAtMaximum || output.diagnostic.awayClampedAtMaximum,
  };
}

function bucketLabel(index: number): string {
  const start = (index * 0.2).toFixed(1);
  const end = ((index + 1) * 0.2).toFixed(1);
  return `${start}-${end}`;
}

function buildProbabilityBuckets(
  values: readonly { predicted: number; actual: number }[]
): ProbabilityCalibrationBucket[] {
  return Array.from({ length: 5 }, (_, index) => {
    const start = index * 0.2;
    const end = index === 4 ? 1.0000001 : (index + 1) * 0.2;
    const items = values.filter((item) => item.predicted >= start && item.predicted < end);
    if (items.length === 0) {
      return { bucket: bucketLabel(index), count: 0, averagePredicted: null, observedRate: null, absoluteError: null };
    }
    const avgPredicted = items.reduce((sum, item) => sum + item.predicted, 0) / items.length;
    const observedRate = items.reduce((sum, item) => sum + item.actual, 0) / items.length;
    return {
      bucket: bucketLabel(index),
      count: items.length,
      averagePredicted: avgPredicted,
      observedRate,
      absoluteError: Math.abs(avgPredicted - observedRate),
    };
  });
}

function summarizeProbabilityCalibration(
  fixtures: readonly GoalModelEvalFixture[],
  predictions: readonly RecalibrationFixturePrediction[]
): ProbabilityCalibrationSummary {
  const homeValues = predictions.map((prediction, index) => ({
    predicted: prediction.homeWinProb,
    actual: fixtures[index]?.actualOutcome === "home_win" ? 1 : 0,
  }));
  const drawValues = predictions.map((prediction, index) => ({
    predicted: prediction.drawProb,
    actual: fixtures[index]?.actualOutcome === "draw" ? 1 : 0,
  }));
  const awayValues = predictions.map((prediction, index) => ({
    predicted: prediction.awayWinProb,
    actual: fixtures[index]?.actualOutcome === "away_win" ? 1 : 0,
  }));
  const allBuckets = [
    ...buildProbabilityBuckets(homeValues),
    ...buildProbabilityBuckets(drawValues),
    ...buildProbabilityBuckets(awayValues),
  ].filter((bucket) => bucket.count > 0 && bucket.absoluteError !== null);
  const totalCount = allBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const expectedCalibrationError =
    totalCount === 0
      ? null
      : allBuckets.reduce((sum, bucket) => sum + bucket.count * (bucket.absoluteError ?? 0), 0) / totalCount;
  const maximumCalibrationError =
    allBuckets.length === 0 ? null : Math.max(...allBuckets.map((bucket) => bucket.absoluteError ?? 0));

  const favoriteValues = predictions.map((prediction, index) => {
    const probs = [
      { outcome: "home_win", probability: prediction.homeWinProb },
      { outcome: "draw", probability: prediction.drawProb },
      { outcome: "away_win", probability: prediction.awayWinProb },
    ].sort((a, b) => b.probability - a.probability);
    return {
      predicted: probs[0]?.probability ?? 0,
      actual: probs[0]?.outcome === fixtures[index]?.actualOutcome ? 1 : 0,
    };
  });
  const favoriteBuckets = buildProbabilityBuckets(favoriteValues);
  const underConfidenceRate =
    favoriteValues.length === 0
      ? null
      : favoriteValues.filter((item) => item.actual > item.predicted).length / favoriteValues.length;
  const overConfidenceRate =
    favoriteValues.length === 0
      ? null
      : favoriteValues.filter((item) => item.actual < item.predicted).length / favoriteValues.length;

  return {
    homeWin: buildProbabilityBuckets(homeValues),
    draw: buildProbabilityBuckets(drawValues),
    awayWin: buildProbabilityBuckets(awayValues),
    expectedCalibrationError,
    maximumCalibrationError,
    favoriteBuckets,
    underConfidenceRate,
    overConfidenceRate,
  };
}

function summarizeGoalCalibration(
  fixtures: readonly GoalModelEvalFixture[],
  predictions: readonly RecalibrationFixturePrediction[]
): GoalCalibrationSummary {
  if (fixtures.length === 0) {
    return {
      avgPredictedHomeGoals: null,
      avgActualHomeGoals: null,
      avgPredictedAwayGoals: null,
      avgActualAwayGoals: null,
      avgPredictedTotalGoals: null,
      avgActualTotalGoals: null,
      totalGoalBuckets: [],
      totalGoalUnderpredictionRate: null,
      totalGoalOverpredictionRate: null,
    };
  }

  const totalBuckets = ["0-1", "2", "3", "4+"].map((bucket) => {
    const items = predictions
      .map((prediction, index) => ({
        predicted: prediction.homeXg + prediction.awayXg,
        actual: (fixtures[index]?.homeScore ?? 0) + (fixtures[index]?.awayScore ?? 0),
      }))
      .filter((item) =>
        bucket === "0-1" ? item.actual <= 1 : bucket === "4+" ? item.actual >= 4 : item.actual === Number(bucket)
      );
    if (items.length === 0) return { bucket, count: 0, averagePredicted: null, observedRate: null, absoluteError: null };
    const averagePredicted = items.reduce((sum, item) => sum + item.predicted, 0) / items.length;
    const observedRate = items.reduce((sum, item) => sum + item.actual, 0) / items.length;
    return { bucket, count: items.length, averagePredicted, observedRate, absoluteError: Math.abs(averagePredicted - observedRate) };
  });

  const totalPairs = predictions.map((prediction, index) => ({
    predicted: prediction.homeXg + prediction.awayXg,
    actual: (fixtures[index]?.homeScore ?? 0) + (fixtures[index]?.awayScore ?? 0),
  }));

  return {
    avgPredictedHomeGoals: predictions.reduce((sum, prediction) => sum + prediction.homeXg, 0) / predictions.length,
    avgActualHomeGoals: fixtures.reduce((sum, fixture) => sum + fixture.homeScore, 0) / fixtures.length,
    avgPredictedAwayGoals: predictions.reduce((sum, prediction) => sum + prediction.awayXg, 0) / predictions.length,
    avgActualAwayGoals: fixtures.reduce((sum, fixture) => sum + fixture.awayScore, 0) / fixtures.length,
    avgPredictedTotalGoals: totalPairs.reduce((sum, pair) => sum + pair.predicted, 0) / totalPairs.length,
    avgActualTotalGoals: totalPairs.reduce((sum, pair) => sum + pair.actual, 0) / totalPairs.length,
    totalGoalBuckets: totalBuckets,
    totalGoalUnderpredictionRate: totalPairs.filter((pair) => pair.predicted < pair.actual).length / totalPairs.length,
    totalGoalOverpredictionRate: totalPairs.filter((pair) => pair.predicted > pair.actual).length / totalPairs.length,
  };
}

function summarizeExtremes(
  fixtures: readonly GoalModelEvalFixture[],
  predictions: readonly RecalibrationFixturePrediction[]
): ExtremeDiagnostics {
  if (predictions.length === 0) {
    return {
      xgBelow05: 0,
      xgBelow08: 0,
      xgAbove15: 0,
      xgAbove20: 0,
      xgAbove25: 0,
      xgClampedAtMinimum: 0,
      xgClampedAtMaximum: 0,
      clampRate: null,
      predictedThreePlusGoalMargins: 0,
      predictedFourPlusGoalTotals: 0,
      predictedFivePlusGoalTotals: 0,
      actualThreePlusGoalMargins: 0,
      actualFourPlusGoalTotals: 0,
      actualFivePlusGoalTotals: 0,
      blowoutRateDelta: null,
    };
  }

  const allXg = predictions.flatMap((prediction) => [prediction.homeXg, prediction.awayXg]);
  const predictedThreePlusGoalMargins = predictions.filter(
    (prediction) => Math.abs(prediction.modalHomeGoals - prediction.modalAwayGoals) >= 3
  ).length;
  const actualThreePlusGoalMargins = fixtures.filter(
    (fixture) => Math.abs(fixture.homeScore - fixture.awayScore) >= 3
  ).length;
  return {
    xgBelow05: allXg.filter((value) => value < 0.5).length,
    xgBelow08: allXg.filter((value) => value < 0.8).length,
    xgAbove15: allXg.filter((value) => value > 1.5).length,
    xgAbove20: allXg.filter((value) => value > 2.0).length,
    xgAbove25: allXg.filter((value) => value > 2.5).length,
    xgClampedAtMinimum: predictions.filter((prediction) => prediction.clampedAtMinimum).length,
    xgClampedAtMaximum: predictions.filter((prediction) => prediction.clampedAtMaximum).length,
    clampRate: predictions.filter((prediction) => prediction.clamped).length / predictions.length,
    predictedThreePlusGoalMargins,
    predictedFourPlusGoalTotals: predictions.filter((prediction) => prediction.modalHomeGoals + prediction.modalAwayGoals >= 4).length,
    predictedFivePlusGoalTotals: predictions.filter((prediction) => prediction.modalHomeGoals + prediction.modalAwayGoals >= 5).length,
    actualThreePlusGoalMargins,
    actualFourPlusGoalTotals: fixtures.filter((fixture) => fixture.homeScore + fixture.awayScore >= 4).length,
    actualFivePlusGoalTotals: fixtures.filter((fixture) => fixture.homeScore + fixture.awayScore >= 5).length,
    blowoutRateDelta: predictedThreePlusGoalMargins / predictions.length - actualThreePlusGoalMargins / fixtures.length,
  };
}

function summarizeComponentContributions(
  predictions: readonly RecalibrationFixturePrediction[]
): ComponentContributionSummary {
  if (predictions.length === 0) {
    return {
      averageAttackContributionLog: null,
      averageDefenseContributionLog: null,
      averageEloContributionLog: null,
      averageVenueContributionLog: null,
      averageAbsoluteAttackContributionLog: null,
      averageAbsoluteDefenseContributionLog: null,
      averageAbsoluteEloContributionLog: null,
      averageAbsoluteVenueContributionLog: null,
      largestAverageFactor: null,
      clampFrequency: null,
      combinedFactorThresholdExceedances: 0,
    };
  }
  const avg = (selector: (prediction: RecalibrationFixturePrediction) => number): number =>
    predictions.reduce((sum, prediction) => sum + selector(prediction), 0) / predictions.length;
  const absAvg = (selector: (prediction: RecalibrationFixturePrediction) => number): number =>
    predictions.reduce((sum, prediction) => sum + Math.abs(selector(prediction)), 0) / predictions.length;
  const absolute = {
    attack: absAvg((prediction) => prediction.componentLogs.attack),
    defense: absAvg((prediction) => prediction.componentLogs.defense),
    elo: absAvg((prediction) => prediction.componentLogs.elo),
    venue: absAvg((prediction) => prediction.componentLogs.venue),
  };
  const largestAverageFactor = Object.entries(absolute).sort((a, b) => b[1] - a[1])[0]?.[0] as
    | "attack"
    | "defense"
    | "elo"
    | "venue"
    | undefined;

  return {
    averageAttackContributionLog: avg((prediction) => prediction.componentLogs.attack),
    averageDefenseContributionLog: avg((prediction) => prediction.componentLogs.defense),
    averageEloContributionLog: avg((prediction) => prediction.componentLogs.elo),
    averageVenueContributionLog: avg((prediction) => prediction.componentLogs.venue),
    averageAbsoluteAttackContributionLog: absolute.attack,
    averageAbsoluteDefenseContributionLog: absolute.defense,
    averageAbsoluteEloContributionLog: absolute.elo,
    averageAbsoluteVenueContributionLog: absolute.venue,
    largestAverageFactor: largestAverageFactor ?? null,
    clampFrequency: predictions.filter((prediction) => prediction.clamped).length / predictions.length,
    combinedFactorThresholdExceedances: predictions.filter(
      (prediction) =>
        Math.abs(prediction.componentLogs.attack) +
          Math.abs(prediction.componentLogs.defense) +
          Math.abs(prediction.componentLogs.elo) +
          Math.abs(prediction.componentLogs.venue) >
        COMPONENT_FACTOR_THRESHOLD
    ).length,
  };
}

function computeMetrics(
  config: RecalibrationCandidateConfig,
  fixtures: readonly GoalModelEvalFixture[],
  predictions: readonly RecalibrationFixturePrediction[]
): RecalibrationMetrics {
  const n = fixtures.length;
  if (n === 0) {
    return {
      candidateId: config.id,
      fixtureCount: 0,
      brierScore: null,
      logLoss: null,
      outcomeAccuracy: null,
      homeGoalMae: null,
      awayGoalMae: null,
      totalGoalMae: null,
      exactScoreAccuracy: null,
      top3ScoreCoverage: null,
      top5ScoreCoverage: null,
      top10ScoreCoverage: null,
      uniqueXgPairCount: 0,
      uniqueModalScorelineCount: 0,
      modalOneOneFrequency: null,
      recommended10Frequency: null,
      recommended20Frequency: null,
      recommended21Frequency: null,
      recommended30Frequency: null,
      recommended31Frequency: null,
      recommendedFourPlusTotalFrequency: null,
      probabilityCalibration: summarizeProbabilityCalibration([], []),
      goalCalibration: summarizeGoalCalibration([], []),
      extremes: summarizeExtremes([], []),
      componentContributions: summarizeComponentContributions([]),
    };
  }

  let brierSum = 0;
  let logLossSum = 0;
  let outcomeCorrect = 0;
  let homeGoalMae = 0;
  let awayGoalMae = 0;
  let totalGoalMae = 0;
  let exact = 0;
  let top3 = 0;
  let top5 = 0;
  let top10 = 0;
  let oneOne = 0;
  let r10 = 0;
  let r20 = 0;
  let r21 = 0;
  let r30 = 0;
  let r31 = 0;
  let r4Plus = 0;
  const xgPairs = new Set<string>();
  const modal = new Set<string>();

  for (let i = 0; i < n; i++) {
    const fixture = fixtures[i]!;
    const prediction = predictions[i]!;
    const actual = {
      home: fixture.actualOutcome === "home_win" ? 1 : 0,
      draw: fixture.actualOutcome === "draw" ? 1 : 0,
      away: fixture.actualOutcome === "away_win" ? 1 : 0,
    };
    brierSum +=
      (prediction.homeWinProb - actual.home) ** 2 +
      (prediction.drawProb - actual.draw) ** 2 +
      (prediction.awayWinProb - actual.away) ** 2;
    const actualProbability =
      fixture.actualOutcome === "home_win"
        ? prediction.homeWinProb
        : fixture.actualOutcome === "draw"
          ? prediction.drawProb
          : prediction.awayWinProb;
    logLossSum += -Math.log(Math.max(actualProbability, LOG_EPSILON));
    const predictedOutcome =
      prediction.homeWinProb >= prediction.drawProb && prediction.homeWinProb >= prediction.awayWinProb
        ? "home_win"
        : prediction.drawProb >= prediction.awayWinProb
          ? "draw"
          : "away_win";
    if (predictedOutcome === fixture.actualOutcome) outcomeCorrect += 1;
    homeGoalMae += Math.abs(prediction.homeXg - fixture.homeScore);
    awayGoalMae += Math.abs(prediction.awayXg - fixture.awayScore);
    totalGoalMae += Math.abs(prediction.homeXg + prediction.awayXg - (fixture.homeScore + fixture.awayScore));
    if (prediction.modalHomeGoals === fixture.homeScore && prediction.modalAwayGoals === fixture.awayScore) exact += 1;
    if (prediction.topScorelines.slice(0, 3).some((score) => score.homeGoals === fixture.homeScore && score.awayGoals === fixture.awayScore)) top3 += 1;
    if (prediction.topScorelines.slice(0, 5).some((score) => score.homeGoals === fixture.homeScore && score.awayGoals === fixture.awayScore)) top5 += 1;
    if (prediction.topScorelines.some((score) => score.homeGoals === fixture.homeScore && score.awayGoals === fixture.awayScore)) top10 += 1;
    xgPairs.add(`${prediction.homeXg.toFixed(4)}|${prediction.awayXg.toFixed(4)}`);
    modal.add(`${prediction.modalHomeGoals}-${prediction.modalAwayGoals}`);
    if (prediction.modalHomeGoals === 1 && prediction.modalAwayGoals === 1) oneOne += 1;
    if (prediction.modalHomeGoals === 1 && prediction.modalAwayGoals === 0) r10 += 1;
    if (prediction.modalHomeGoals === 2 && prediction.modalAwayGoals === 0) r20 += 1;
    if (prediction.modalHomeGoals === 2 && prediction.modalAwayGoals === 1) r21 += 1;
    if (prediction.modalHomeGoals === 3 && prediction.modalAwayGoals === 0) r30 += 1;
    if (prediction.modalHomeGoals === 3 && prediction.modalAwayGoals === 1) r31 += 1;
    if (prediction.modalHomeGoals + prediction.modalAwayGoals >= 4) r4Plus += 1;
  }

  return {
    candidateId: config.id,
    fixtureCount: n,
    brierScore: brierSum / n / 3,
    logLoss: logLossSum / n,
    outcomeAccuracy: outcomeCorrect / n,
    homeGoalMae: homeGoalMae / n,
    awayGoalMae: awayGoalMae / n,
    totalGoalMae: totalGoalMae / n,
    exactScoreAccuracy: exact / n,
    top3ScoreCoverage: top3 / n,
    top5ScoreCoverage: top5 / n,
    top10ScoreCoverage: top10 / n,
    uniqueXgPairCount: xgPairs.size,
    uniqueModalScorelineCount: modal.size,
    modalOneOneFrequency: oneOne / n,
    recommended10Frequency: r10 / n,
    recommended20Frequency: r20 / n,
    recommended21Frequency: r21 / n,
    recommended30Frequency: r30 / n,
    recommended31Frequency: r31 / n,
    recommendedFourPlusTotalFrequency: r4Plus / n,
    probabilityCalibration: summarizeProbabilityCalibration(fixtures, predictions),
    goalCalibration: summarizeGoalCalibration(fixtures, predictions),
    extremes: summarizeExtremes(fixtures, predictions),
    componentContributions: summarizeComponentContributions(predictions),
  };
}

function evaluateConfig(
  config: RecalibrationCandidateConfig,
  fixtures: readonly GoalModelEvalFixture[],
  profilesByYear: Map<number, Map<string, TeamAttackDefenseProfile>>,
  envByYear: Map<number, CompetitionGoalEnvironment>
): RecalibrationMetrics {
  const predictions = fixtures.map((fixture) => predictFixture({ fixture, config, profilesByYear, envByYear }));
  return computeMetrics(config, fixtures, predictions);
}

function metricValue(value: number | null): number {
  return value ?? Number.POSITIVE_INFINITY;
}

function balancedScore(metrics: RecalibrationMetrics): number {
  return (
    metricValue(metrics.brierScore) * 5 +
    metricValue(metrics.logLoss) +
    metricValue(metrics.totalGoalMae) * 0.2 +
    metricValue(metrics.homeGoalMae) * 0.1 +
    metricValue(metrics.awayGoalMae) * 0.1 -
    metrics.uniqueXgPairCount * 0.00005 -
    metrics.uniqueModalScorelineCount * 0.0005
  );
}

function sortByCoreMetrics(metrics: readonly RecalibrationMetrics[]): RecalibrationMetrics[] {
  return [...metrics].sort(
    (a, b) =>
      metricValue(a.brierScore) - metricValue(b.brierScore) ||
      metricValue(a.logLoss) - metricValue(b.logLoss) ||
      metricValue(a.totalGoalMae) - metricValue(b.totalGoalMae) ||
      metricValue(a.homeGoalMae) - metricValue(b.homeGoalMae) ||
      metricValue(a.awayGoalMae) - metricValue(b.awayGoalMae) ||
      b.uniqueModalScorelineCount - a.uniqueModalScorelineCount ||
      a.candidateId.localeCompare(b.candidateId)
  );
}

export function selectRecalibrationCandidateFromTuning(
  tuningMetrics: readonly RecalibrationMetrics[]
): RecalibrationMetrics | null {
  const eligible = tuningMetrics.filter(
    (metrics) =>
      !metrics.candidateId.startsWith("elo_only_v2_baseline") &&
      !metrics.candidateId.startsWith("attack_defense_log_linear_current")
  );
  return sortByCoreMetrics(eligible)[0] ?? null;
}

export function evaluateAttackDefenseRecalibrationDecision(input: {
  baseline: RecalibrationMetrics;
  selected: RecalibrationMetrics | null;
  fallbackRate: number;
  noLookAheadViolations: number;
  validationLeakage: boolean;
}): RecalibrationDecisionReport {
  const blockers: string[] = [];
  const reasons: string[] = [];
  if (input.noLookAheadViolations > 0 || input.validationLeakage) {
    blockers.push("Data quality failure: no-look-ahead or validation leakage detected.");
    return {
      decision: "data_quality_blocked",
      selectedCandidateId: input.selected?.candidateId ?? null,
      reasons,
      blockers,
      deltas: { brier: null, logLoss: null, homeGoalMae: null, awayGoalMae: null, totalGoalMae: null },
    };
  }
  if (input.fallbackRate > 1 - BACKTEST_MIN_PROFILE_COVERAGE_RATE) {
    blockers.push(`Fallback rate ${(input.fallbackRate * 100).toFixed(1)}% exceeds maximum allowed.`);
    return {
      decision: "data_quality_blocked",
      selectedCandidateId: input.selected?.candidateId ?? null,
      reasons,
      blockers,
      deltas: { brier: null, logLoss: null, homeGoalMae: null, awayGoalMae: null, totalGoalMae: null },
    };
  }
  if (input.selected === null) {
    blockers.push("No recalibrated candidate was selected.");
    return {
      decision: "retain_elo_v2",
      selectedCandidateId: null,
      reasons,
      blockers,
      deltas: { brier: null, logLoss: null, homeGoalMae: null, awayGoalMae: null, totalGoalMae: null },
    };
  }

  const deltas = {
    brier: input.selected.brierScore !== null && input.baseline.brierScore !== null ? input.selected.brierScore - input.baseline.brierScore : null,
    logLoss: input.selected.logLoss !== null && input.baseline.logLoss !== null ? input.selected.logLoss - input.baseline.logLoss : null,
    homeGoalMae: input.selected.homeGoalMae !== null && input.baseline.homeGoalMae !== null ? input.selected.homeGoalMae - input.baseline.homeGoalMae : null,
    awayGoalMae: input.selected.awayGoalMae !== null && input.baseline.awayGoalMae !== null ? input.selected.awayGoalMae - input.baseline.awayGoalMae : null,
    totalGoalMae: input.selected.totalGoalMae !== null && input.baseline.totalGoalMae !== null ? input.selected.totalGoalMae - input.baseline.totalGoalMae : null,
  };

  if (deltas.brier !== null && deltas.brier > BACKTEST_PROMOTION_MAX_BRIER_REGRESSION) {
    blockers.push(`Brier regression ${deltas.brier.toFixed(5)} exceeds threshold.`);
  }
  if (deltas.logLoss !== null && deltas.logLoss > BACKTEST_PROMOTION_MAX_LOG_LOSS_REGRESSION) {
    blockers.push(`Log Loss regression ${deltas.logLoss.toFixed(5)} exceeds threshold.`);
  }
  if (deltas.totalGoalMae !== null && deltas.totalGoalMae > BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION) {
    blockers.push(`Total-goal MAE regression ${deltas.totalGoalMae.toFixed(4)} exceeds threshold.`);
  }
  if (deltas.homeGoalMae !== null && deltas.homeGoalMae > BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION) {
    blockers.push(`Home-goal MAE regression ${deltas.homeGoalMae.toFixed(4)} exceeds threshold.`);
  }
  if (deltas.awayGoalMae !== null && deltas.awayGoalMae > BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION) {
    blockers.push(`Away-goal MAE regression ${deltas.awayGoalMae.toFixed(4)} exceeds threshold.`);
  }
  if ((input.selected.extremes.clampRate ?? 0) > ATTACK_DEFENSE_MAX_CLAMP_RATE) {
    blockers.push(`Clamp rate ${((input.selected.extremes.clampRate ?? 0) * 100).toFixed(1)}% exceeds threshold.`);
  }
  if ((input.selected.extremes.blowoutRateDelta ?? 0) > ATTACK_DEFENSE_MAX_BLOWOUT_RATE_DELTA) {
    blockers.push(`Blowout-rate delta ${(input.selected.extremes.blowoutRateDelta ?? 0).toFixed(4)} exceeds threshold.`);
  }
  if (
    input.selected.exactScoreAccuracy !== null &&
    input.baseline.exactScoreAccuracy !== null &&
    input.baseline.exactScoreAccuracy - input.selected.exactScoreAccuracy > 0.05
  ) {
    blockers.push("Exact-score accuracy regression exceeds threshold.");
  }
  if (
    input.selected.top3ScoreCoverage !== null &&
    input.baseline.top3ScoreCoverage !== null &&
    input.baseline.top3ScoreCoverage - input.selected.top3ScoreCoverage > 0.05
  ) {
    blockers.push("Top-3 score coverage regression exceeds threshold.");
  }
  if (
    input.selected.top5ScoreCoverage !== null &&
    input.baseline.top5ScoreCoverage !== null &&
    input.baseline.top5ScoreCoverage - input.selected.top5ScoreCoverage > 0.05
  ) {
    blockers.push("Top-5 score coverage regression exceeds threshold.");
  }
  if (
    input.selected.top10ScoreCoverage !== null &&
    input.baseline.top10ScoreCoverage !== null &&
    input.baseline.top10ScoreCoverage - input.selected.top10ScoreCoverage > 0.05
  ) {
    blockers.push("Top-10 score coverage regression exceeds threshold.");
  }

  const diversityImproved =
    input.selected.uniqueXgPairCount > input.baseline.uniqueXgPairCount + 10 ||
    input.selected.uniqueModalScorelineCount > input.baseline.uniqueModalScorelineCount;

  if (blockers.length > 0) {
    const probabilityBlocked = blockers.some((blocker) => blocker.includes("Brier") || blocker.includes("Log Loss"));
    return {
      decision: diversityImproved ? "diversity_only_improvement" : probabilityBlocked ? "probability_calibration_blocked" : "goal_calibration_blocked",
      selectedCandidateId: input.selected.candidateId,
      reasons,
      blockers,
      deltas,
    };
  }

  if (!diversityImproved) {
    reasons.push("Candidate avoids material regression but does not improve diversity enough.");
    return {
      decision: "recalibration_improved_but_not_ready",
      selectedCandidateId: input.selected.candidateId,
      reasons,
      blockers,
      deltas,
    };
  }

  reasons.push("Candidate passes validation holdout gates and improves xG or modal-score diversity.");
  return {
    decision: "promote_recalibrated_candidate",
    selectedCandidateId: input.selected.candidateId,
    reasons,
    blockers,
    deltas,
  };
}

export function runAttackDefenseGoalModelRecalibration(input: {
  profileStrategy?: AttackDefenseProfileStrategy;
  recencyStrategy?: AttackDefenseRecencyStrategy;
  generatedAt?: string;
} = {}): AttackDefenseGoalModelRecalibrationResult {
  const profileStrategy = input.profileStrategy ?? "goals_strength_of_schedule_adjusted";
  const recencyStrategy = input.recencyStrategy ?? "exponential_half_life";
  const fixtures = loadEvaluationFixtures();
  const historicalMatches = loadHistoricalMatchRecords();
  const teamEloAtDate = buildEloAtDateMap(historicalMatches);
  const profileContext = buildProfileContext({
    fixtures,
    historicalMatches,
    teamEloAtDate,
    profileStrategy,
    recencyStrategy,
  });

  const tuningFixtures = splitFixtures(fixtures, 2018);
  const validationFixtures = splitFixtures(fixtures, 2022);
  const combinedFixtures = [...tuningFixtures, ...validationFixtures];
  const grid = buildAttackDefenseRecalibrationGrid();

  const tuningGridMetrics = grid.map((config) =>
    evaluateConfig(config, tuningFixtures, profileContext.profilesByYear, profileContext.envByYear)
  );
  const selectedTuningMetric = selectRecalibrationCandidateFromTuning(tuningGridMetrics);
  const selectedConfig = selectedTuningMetric === null
    ? null
    : grid.find((config) => config.id === selectedTuningMetric.candidateId) ?? null;

  const tuningBaseline = evaluateConfig(BASELINE_CONFIG, tuningFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const tuningCurrent = evaluateConfig(CURRENT_CONFIG, tuningFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const validationBaseline = evaluateConfig(BASELINE_CONFIG, validationFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const validationCurrent = evaluateConfig(CURRENT_CONFIG, validationFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const combinedBaseline = evaluateConfig(BASELINE_CONFIG, combinedFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const combinedCurrent = evaluateConfig(CURRENT_CONFIG, combinedFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const tuningSelected = selectedConfig === null ? null : evaluateConfig(selectedConfig, tuningFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const validationSelected = selectedConfig === null ? null : evaluateConfig(selectedConfig, validationFixtures, profileContext.profilesByYear, profileContext.envByYear);
  const combinedSelected = selectedConfig === null ? null : evaluateConfig(selectedConfig, combinedFixtures, profileContext.profilesByYear, profileContext.envByYear);

  const topCandidates = {
    byBrier: sortByCoreMetrics(tuningGridMetrics).slice(0, TOP_RETAINED_COUNT),
    byLogLoss: [...tuningGridMetrics].sort((a, b) => metricValue(a.logLoss) - metricValue(b.logLoss) || a.candidateId.localeCompare(b.candidateId)).slice(0, TOP_RETAINED_COUNT),
    byTotalGoalMae: [...tuningGridMetrics].sort((a, b) => metricValue(a.totalGoalMae) - metricValue(b.totalGoalMae) || a.candidateId.localeCompare(b.candidateId)).slice(0, TOP_RETAINED_COUNT),
    byBalancedScore: [...tuningGridMetrics].sort((a, b) => balancedScore(a) - balancedScore(b) || a.candidateId.localeCompare(b.candidateId)).slice(0, TOP_RETAINED_COUNT),
  };
  const rejectedExtremeCandidateSummary = {
    clampBlocked: tuningGridMetrics.filter((metrics) => (metrics.extremes.clampRate ?? 0) > ATTACK_DEFENSE_MAX_CLAMP_RATE).length,
    blowoutBlocked: tuningGridMetrics.filter((metrics) => (metrics.extremes.blowoutRateDelta ?? 0) > ATTACK_DEFENSE_MAX_BLOWOUT_RATE_DELTA).length,
  };
  const totalTeams = Object.values(profileContext.coverageCounts).reduce((sum, count) => sum + count, 0);
  const fallbackRate = profileContext.coverageCounts.fallback / Math.max(1, totalTeams);
  const decision = evaluateAttackDefenseRecalibrationDecision({
    baseline: validationBaseline,
    selected: validationSelected,
    fallbackRate,
    noLookAheadViolations: profileContext.noLookAheadViolations,
    validationLeakage: false,
  });

  return {
    schemaVersion: RECALIBRATION_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    tuningYear: 2018,
    validationYear: 2022,
    profileStrategy,
    recencyStrategy,
    parameterGridSize: grid.length,
    selectedConfig,
    tuning: {
      baseline: tuningBaseline,
      current: tuningCurrent,
      selected: tuningSelected,
    },
    validation: {
      baseline: validationBaseline,
      current: validationCurrent,
      selected: validationSelected,
    },
    combined: {
      baseline: combinedBaseline,
      current: combinedCurrent,
      selected: combinedSelected,
    },
    topCandidates,
    rejectedExtremeCandidateSummary,
    profileCoverageSummary: {
      coverageCounts: profileContext.coverageCounts,
      fallbackRate,
      noLookAheadViolations: profileContext.noLookAheadViolations,
    },
    decision,
  };
}
