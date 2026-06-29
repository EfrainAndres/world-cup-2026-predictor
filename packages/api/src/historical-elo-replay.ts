import {
  DEFAULT_ELO_CONFIG,
  DEFAULT_LIVE_ELO_HOME_ADVANTAGE_POINTS,
  DEFAULT_POISSON_CONFIG,
  ELO_TO_XG_ADJUSTMENT_PER_100,
  ELO_TO_XG_MAX_ELO_ADJUSTMENT,
  calculateLiveEloCompetitionWeight,
  deriveEloResult,
  eloToExpectedGoals,
  generateScoreMatrix,
  getMostLikelyScorelines,
  processMatches,
  updateRatingsAfterMatch,
  updateRatingsAfterMatchWithHomeAdvantage
} from "../../model/src/index.js";
import type { EloConfig, EloMatch, EloResult, EloRatingMap } from "../../model/src/index.js";
import { canonicalizeTeamName } from "./team-aliases.js";
import {
  LIVE_ELO_FOUNDATION_MATCHES,
  loadLiveEloInternationalSupplement
} from "./live-elo-data.js";
import { mergeEloMatchSources } from "./international-elo-adapter.js";
import { computeBacktestMetrics, evaluateBacktestFixture } from "./statsbomb-backtesting.js";
import type { BacktestFixture, BacktestMetrics, BacktestResult } from "./statsbomb-backtesting.js";
import type { HistoricalScoreLookup } from "./statsbomb-historical-scores.js";
import { lookupHistoricalScore } from "./statsbomb-historical-scores.js";

export type HistoricalEloReplayStrategy =
  | "world_cup_only_basic"
  | "expanded_international_basic"
  | "expanded_international_weighted";

export const HISTORICAL_ELO_REPLAY_STRATEGIES: readonly HistoricalEloReplayStrategy[] = [
  "world_cup_only_basic",
  "expanded_international_basic",
  "expanded_international_weighted"
];

export const HISTORICAL_ELO_GAP_THRESHOLDS = [50, 100, 150, 167, 200, 300] as const;

export interface HistoricalEloReplaySourceMatch extends EloMatch {
  source_dataset?: string;
}

export interface HistoricalEloReplayExclusion {
  matchId: string;
  reason:
    | "duplicate_match"
    | "invalid_date"
    | "invalid_score"
    | "invalid_result"
    | "missing_team"
    | "missing_actual_score"
    | "wc2026_excluded";
  sourceDataset: string;
}

export interface HistoricalEloReplayFixture extends BacktestFixture {
  sourceDataset: string;
  season: number | null;
  competitionWeight: number;
  eloGap: number;
  homeRatingAfter: number;
  awayRatingAfter: number;
}

export interface HistoricalEloReplayStrategyDiagnostics {
  strategy: HistoricalEloReplayStrategy;
  fixtureCount: number;
  acceptedFixtureCount: number;
  excludedFixtureCount: number;
  unresolvedTeamCount: number;
  duplicateCount: number;
  uniquePreMatchEloPairCount: number;
  uniqueEloGapCount: number;
  minEloGap: number | null;
  maxEloGap: number | null;
  averageAbsoluteEloGap: number | null;
  medianAbsoluteEloGap: number | null;
  percentile25AbsoluteEloGap: number | null;
  percentile75AbsoluteEloGap: number | null;
  thresholdCounts: Record<string, { count: number; percentage: number }>;
  uniqueBaselineXgPairCount: number;
  uniqueModalScorelineCount: number;
  modalOneOneFrequency: number | null;
  top10ModalScorelines: Array<{ scoreline: string; count: number; frequency: number }>;
  noLookAheadFailures: number;
}

export interface HistoricalEloReplayBaselineMetrics {
  brierScore: number | null;
  logLoss: number | null;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
  top3ScoreCoverage: number | null;
  top5ScoreCoverage: number | null;
  homeGoalMae: number | null;
  awayGoalMae: number | null;
  totalGoalMae: number | null;
  averagePredictedGoals: number | null;
  averageActualGoals: number | null;
  modalOneOneFrequency: number | null;
  uniqueModalScorelineCount: number;
  scorelineConcentration: number | null;
}

export interface HistoricalEloReplayStrategyResult {
  strategy: HistoricalEloReplayStrategy;
  dataset: {
    sourceDatasets: string[];
    inputMatchCount: number;
    replayMatchCount: number;
    evaluationYears: number[];
    cutoffPolicy: string;
  };
  diagnostics: HistoricalEloReplayStrategyDiagnostics;
  baselineMetrics: HistoricalEloReplayBaselineMetrics;
  fixtures: HistoricalEloReplayFixture[];
  exclusions: HistoricalEloReplayExclusion[];
  backtestResults: BacktestResult[];
}

export interface HistoricalEloReplayComparison {
  schemaVersion: "1.0.0";
  generatedAt: string;
  strategies: HistoricalEloReplayStrategyResult[];
}

export interface BuildHistoricalEloReplayInput {
  strategy: HistoricalEloReplayStrategy;
  foundationMatches?: readonly EloMatch[];
  expandedInternationalMatches?: readonly HistoricalEloReplaySourceMatch[];
  scoreLookup?: HistoricalScoreLookup;
  eloConfig?: Partial<EloConfig>;
  evaluationYears?: readonly number[];
}

function safeNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

function safeRound(value: number | null, decimals = 6): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isoDateToKickoff(date: string): string {
  return `${date.slice(0, 10)}T12:00:00.000Z`;
}

function yearFromDate(date: string): number | null {
  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function sourceDataset(match: HistoricalEloReplaySourceMatch | EloMatch): string {
  if ("source_dataset" in match && typeof match.source_dataset === "string") return match.source_dataset;
  if (match.match_id.startsWith("EXP-")) return "expanded_international_supplement";
  if (match.match_id.startsWith("INT-")) return "inline_international_supplement";
  return "world_cup_foundation";
}

function withSourceDataset(match: EloMatch, source: string): HistoricalEloReplaySourceMatch {
  return { ...match, source_dataset: source };
}

function defaultExpandedInternationalMatches(): readonly HistoricalEloReplaySourceMatch[] {
  const supplement = loadLiveEloInternationalSupplement();
  const merged = mergeEloMatchSources(LIVE_ELO_FOUNDATION_MATCHES, supplement.matches);
  return merged.map((match) => withSourceDataset(match, match.match_id.startsWith("EXP-") || match.match_id.startsWith("INT-")
    ? supplement.metadata.datasetId
    : "world_cup_foundation"));
}

function defaultWorldCupOnlyMatches(): readonly HistoricalEloReplaySourceMatch[] {
  return LIVE_ELO_FOUNDATION_MATCHES.map((match) => withSourceDataset(match, "world_cup_foundation"));
}

function selectInputMatches(input: BuildHistoricalEloReplayInput): readonly HistoricalEloReplaySourceMatch[] {
  if (input.strategy === "world_cup_only_basic") {
    return (input.foundationMatches ?? LIVE_ELO_FOUNDATION_MATCHES).map((match) => withSourceDataset(match, "world_cup_foundation"));
  }

  return input.expandedInternationalMatches ?? defaultExpandedInternationalMatches();
}

function sortReplayMatches(matches: readonly HistoricalEloReplaySourceMatch[]): HistoricalEloReplaySourceMatch[] {
  return [...matches].sort((a, b) => {
    const date = a.match_date.localeCompare(b.match_date);
    if (date !== 0) return date;
    return a.match_id.localeCompare(b.match_id);
  });
}

function duplicateKey(match: HistoricalEloReplaySourceMatch): string {
  return [
    match.match_date,
    canonicalizeTeamName(match.home_team),
    canonicalizeTeamName(match.away_team)
  ].join("|");
}

function actualOutcome(result: EloResult): BacktestFixture["actualOutcome"] {
  return result;
}

function validateReplayMatch(match: HistoricalEloReplaySourceMatch): HistoricalEloReplayExclusion["reason"] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.match_date)) return "invalid_date";
  if (match.match_date >= "2026-01-01") return "wc2026_excluded";
  if (match.home_team.trim().length === 0 || match.away_team.trim().length === 0) return "missing_team";
  if (match.home_score !== undefined && (!Number.isInteger(match.home_score) || match.home_score < 0)) return "invalid_score";
  if (match.away_score !== undefined && (!Number.isInteger(match.away_score) || match.away_score < 0)) return "invalid_score";
  try {
    deriveEloResult(match);
  } catch {
    return "invalid_result";
  }
  return null;
}

function isEvaluationMatch(match: HistoricalEloReplaySourceMatch, evaluationYears: readonly number[]): boolean {
  const year = yearFromDate(match.match_date);
  return (
    year !== null &&
    evaluationYears.includes(year) &&
    /^20(18|22)-WC-\d{3}$/.test(match.match_id)
  );
}

function resolveActualScore(
  match: HistoricalEloReplaySourceMatch,
  scoreLookup: HistoricalScoreLookup | undefined
): { homeGoals: number; awayGoals: number } | null {
  if (match.home_score !== undefined && match.away_score !== undefined) {
    return { homeGoals: match.home_score, awayGoals: match.away_score };
  }

  if (scoreLookup !== undefined) {
    const score = lookupHistoricalScore(
      scoreLookup,
      canonicalizeTeamName(match.home_team),
      canonicalizeTeamName(match.away_team),
      match.match_date
    );
    if (score !== null) return { homeGoals: score.homeGoals, awayGoals: score.awayGoals };
  }

  return null;
}

function updateRatingsForStrategy(
  strategy: HistoricalEloReplayStrategy,
  ratings: EloRatingMap,
  match: EloMatch,
  config: EloConfig
): {
  ratings: Map<string, number>;
  homeRatingAfter: number;
  awayRatingAfter: number;
  competitionWeight: number;
} {
  if (strategy === "expanded_international_weighted") {
    const competitionWeight = calculateLiveEloCompetitionWeight(match);
    const update = updateRatingsAfterMatchWithHomeAdvantage(
      ratings,
      match,
      { ...config, kFactor: config.kFactor * competitionWeight },
      DEFAULT_LIVE_ELO_HOME_ADVANTAGE_POINTS
    );
    return {
      ratings: update.ratings,
      homeRatingAfter: update.history.home_rating_after,
      awayRatingAfter: update.history.away_rating_after,
      competitionWeight
    };
  }

  const update = updateRatingsAfterMatch(ratings, match, config);
  return {
    ratings: update.ratings,
    homeRatingAfter: update.history.home_rating_after,
    awayRatingAfter: update.history.away_rating_after,
    competitionWeight: 1
  };
}

function baselineResults(fixtures: readonly HistoricalEloReplayFixture[]): BacktestResult[] {
  const nullSource = {
    getProfile: () => null,
    getAvailableTeamIds: () => []
  };
  return fixtures.map((fixture) => evaluateBacktestFixture(fixture, nullSource));
}

function modalKey(result: BacktestResult): string {
  return `${result.baseline.modalHomeGoals}-${result.baseline.modalAwayGoals}`;
}

function percentile(sortedValues: readonly number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const lowerValue = sortedValues[lower];
  const upperValue = sortedValues[upper];
  if (lowerValue === undefined || upperValue === undefined) return null;
  if (lower === upper) return lowerValue;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

function topModalScorelines(results: readonly BacktestResult[]): Array<{ scoreline: string; count: number; frequency: number }> {
  const counts = new Map<string, number>();
  for (const result of results) {
    const key = modalKey(result);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([scoreline, count]) => ({ scoreline, count, frequency: results.length > 0 ? count / results.length : 0 }))
    .sort((a, b) => b.count - a.count || a.scoreline.localeCompare(b.scoreline))
    .slice(0, 10);
}

function buildDiagnostics(
  strategy: HistoricalEloReplayStrategy,
  fixtures: readonly HistoricalEloReplayFixture[],
  exclusions: readonly HistoricalEloReplayExclusion[],
  results: readonly BacktestResult[],
  inputMatchCount: number
): HistoricalEloReplayStrategyDiagnostics {
  const absGaps = fixtures.map((fixture) => Math.abs(fixture.eloGap)).sort((a, b) => a - b);
  const thresholdCounts: HistoricalEloReplayStrategyDiagnostics["thresholdCounts"] = {};

  for (const threshold of HISTORICAL_ELO_GAP_THRESHOLDS) {
    const count = absGaps.filter((gap) => gap > threshold).length;
    thresholdCounts[String(threshold)] = {
      count,
      percentage: fixtures.length > 0 ? count / fixtures.length : 0
    };
  }

  const modalCounts = topModalScorelines(results);
  const modalOneOne = modalCounts.find((entry) => entry.scoreline === "1-1");
  const xgPairs = new Set(results.map((result) => `${result.baseline.homeXg.toFixed(4)}|${result.baseline.awayXg.toFixed(4)}`));

  return {
    strategy,
    fixtureCount: inputMatchCount,
    acceptedFixtureCount: fixtures.length,
    excludedFixtureCount: exclusions.length,
    unresolvedTeamCount: exclusions.filter((exclusion) => exclusion.reason === "missing_team").length,
    duplicateCount: exclusions.filter((exclusion) => exclusion.reason === "duplicate_match").length,
    uniquePreMatchEloPairCount: new Set(fixtures.map((fixture) => `${fixture.homeElo.toFixed(1)}|${fixture.awayElo.toFixed(1)}`)).size,
    uniqueEloGapCount: new Set(fixtures.map((fixture) => fixture.eloGap.toFixed(1))).size,
    minEloGap: safeRound(absGaps[0] ?? null, 3),
    maxEloGap: safeRound(absGaps[absGaps.length - 1] ?? null, 3),
    averageAbsoluteEloGap: safeRound(absGaps.length > 0 ? absGaps.reduce((sum, gap) => sum + gap, 0) / absGaps.length : null, 3),
    medianAbsoluteEloGap: safeRound(percentile(absGaps, 0.5), 3),
    percentile25AbsoluteEloGap: safeRound(percentile(absGaps, 0.25), 3),
    percentile75AbsoluteEloGap: safeRound(percentile(absGaps, 0.75), 3),
    thresholdCounts,
    uniqueBaselineXgPairCount: xgPairs.size,
    uniqueModalScorelineCount: new Set(results.map(modalKey)).size,
    modalOneOneFrequency: fixtures.length > 0 ? modalOneOne?.frequency ?? 0 : null,
    top10ModalScorelines: modalCounts,
    noLookAheadFailures: 0
  };
}

function convertBaselineMetrics(metrics: BacktestMetrics, results: readonly BacktestResult[]): HistoricalEloReplayBaselineMetrics {
  const totalPredictedGoals =
    metrics.avgPredictedHomeGoals !== null && metrics.avgPredictedAwayGoals !== null
      ? metrics.avgPredictedHomeGoals + metrics.avgPredictedAwayGoals
      : null;
  const totalActualGoals =
    metrics.avgActualHomeGoals !== null && metrics.avgActualAwayGoals !== null
      ? metrics.avgActualHomeGoals + metrics.avgActualAwayGoals
      : null;
  const modalCounts = topModalScorelines(results);
  const top = modalCounts[0] ?? null;

  return {
    brierScore: safeNumber(metrics.brierScore),
    logLoss: safeNumber(metrics.logLoss),
    outcomeAccuracy: safeNumber(metrics.outcomeAccuracy),
    exactScoreAccuracy: safeNumber(metrics.exactScoreAccuracy),
    top3ScoreCoverage: safeNumber(metrics.top3ScoreCoverage),
    top5ScoreCoverage: safeNumber(metrics.top5ScoreCoverage),
    homeGoalMae: safeNumber(metrics.homeGoalMae),
    awayGoalMae: safeNumber(metrics.awayGoalMae),
    totalGoalMae: safeNumber(metrics.totalGoalMae),
    averagePredictedGoals: safeNumber(totalPredictedGoals),
    averageActualGoals: safeNumber(totalActualGoals),
    modalOneOneFrequency: results.length > 0 ? modalCounts.find((entry) => entry.scoreline === "1-1")?.frequency ?? 0 : null,
    uniqueModalScorelineCount: new Set(results.map(modalKey)).size,
    scorelineConcentration: top?.frequency ?? null
  };
}

export function buildHistoricalEloReplayStrategy(input: BuildHistoricalEloReplayInput): HistoricalEloReplayStrategyResult {
  const config: EloConfig = {
    initialRating: input.eloConfig?.initialRating ?? DEFAULT_ELO_CONFIG.initialRating,
    kFactor: input.eloConfig?.kFactor ?? DEFAULT_ELO_CONFIG.kFactor
  };
  const evaluationYears = [...(input.evaluationYears ?? [2018, 2022])];
  const inputMatches = selectInputMatches(input);
  const sortedMatches = sortReplayMatches(inputMatches);
  const exclusions: HistoricalEloReplayExclusion[] = [];
  const seenKeys = new Set<string>();
  const fixtures: HistoricalEloReplayFixture[] = [];
  let ratings: EloRatingMap = new Map();

  for (const sourceMatch of sortedMatches) {
    const source = sourceDataset(sourceMatch);
    const validation = validateReplayMatch(sourceMatch);
    if (validation !== null) {
      exclusions.push({ matchId: sourceMatch.match_id, reason: validation, sourceDataset: source });
      continue;
    }

    const key = duplicateKey(sourceMatch);
    if (seenKeys.has(key)) {
      exclusions.push({ matchId: sourceMatch.match_id, reason: "duplicate_match", sourceDataset: source });
      continue;
    }
    seenKeys.add(key);

    const homeTeam = canonicalizeTeamName(sourceMatch.home_team);
    const awayTeam = canonicalizeTeamName(sourceMatch.away_team);
    const replayMatch: EloMatch = {
      ...sourceMatch,
      home_team: homeTeam,
      away_team: awayTeam
    };
    const result = deriveEloResult(replayMatch);
    const homeElo = ratings.get(homeTeam) ?? config.initialRating;
    const awayElo = ratings.get(awayTeam) ?? config.initialRating;
    const score = resolveActualScore(sourceMatch, input.scoreLookup);
    const shouldEvaluate = isEvaluationMatch(sourceMatch, evaluationYears);
    const competitionWeight =
      input.strategy === "expanded_international_weighted"
        ? calculateLiveEloCompetitionWeight(replayMatch)
        : 1;

    if (shouldEvaluate && score === null) {
      exclusions.push({ matchId: sourceMatch.match_id, reason: "missing_actual_score", sourceDataset: source });
    }

    const update = updateRatingsForStrategy(input.strategy, ratings, replayMatch, config);
    ratings = update.ratings;

    if (shouldEvaluate && score !== null) {
      fixtures.push({
        matchId: sourceMatch.match_id,
        kickoffAt: isoDateToKickoff(sourceMatch.match_date),
        homeTeam,
        awayTeam,
        homeElo,
        awayElo,
        actualOutcome: actualOutcome(result),
        actualHomeGoals: score.homeGoals,
        actualAwayGoals: score.awayGoals,
        isNeutralVenue: sourceMatch.neutral_site ?? sourceMatch.neutralSite ?? true,
        competition: sourceMatch.competition ?? "FIFA World Cup",
        stage: Number(sourceMatch.match_id.split("-").pop() ?? "0") > 48 ? "knockout" : "group",
        sourceDataset: source,
        season: yearFromDate(sourceMatch.match_date),
        competitionWeight,
        eloGap: homeElo - awayElo,
        homeRatingAfter: update.homeRatingAfter,
        awayRatingAfter: update.awayRatingAfter
      });
    }
  }

  const results = baselineResults(fixtures);
  const baseline = computeBacktestMetrics(results, false);
  const sourceDatasets = [...new Set(inputMatches.map(sourceDataset))].sort();

  return {
    strategy: input.strategy,
    dataset: {
      sourceDatasets,
      inputMatchCount: inputMatches.length,
      replayMatchCount: seenKeys.size,
      evaluationYears,
      cutoffPolicy: "For every evaluated fixture, Elo ratings are captured before updating that fixture; later matches cannot affect earlier fixtures. WC2026 is excluded."
    },
    diagnostics: buildDiagnostics(input.strategy, fixtures, exclusions, results, inputMatches.length),
    baselineMetrics: convertBaselineMetrics(baseline, results),
    fixtures,
    exclusions,
    backtestResults: results
  };
}

export function buildHistoricalEloReplayComparison(input: {
  scoreLookup?: HistoricalScoreLookup;
  strategies?: readonly HistoricalEloReplayStrategy[];
  foundationMatches?: readonly EloMatch[];
  expandedInternationalMatches?: readonly HistoricalEloReplaySourceMatch[];
  generatedAt?: string;
} = {}): HistoricalEloReplayComparison {
  const strategies = input.strategies ?? HISTORICAL_ELO_REPLAY_STRATEGIES;
  return {
    schemaVersion: "1.0.0",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    strategies: strategies.map((strategy) => buildHistoricalEloReplayStrategy({
      strategy,
      ...(input.scoreLookup === undefined ? {} : { scoreLookup: input.scoreLookup }),
      ...(input.foundationMatches === undefined ? {} : { foundationMatches: input.foundationMatches }),
      ...(input.expandedInternationalMatches === undefined ? {} : { expandedInternationalMatches: input.expandedInternationalMatches })
    }))
  };
}

export function summarizeReplayPredictionSurface(fixtures: readonly HistoricalEloReplayFixture[]) {
  return fixtures.map((fixture) => {
    const xg = eloToExpectedGoals({
      homeEloRating: fixture.homeElo,
      awayEloRating: fixture.awayElo,
      preset: "balanced"
    });
    const matrix = generateScoreMatrix(
      { expectedHomeGoals: xg.homeExpectedGoals, expectedAwayGoals: xg.awayExpectedGoals },
      { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
    );
    const modal = getMostLikelyScorelines(matrix, 1)[0];
    return {
      matchId: fixture.matchId,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeElo: fixture.homeElo,
      awayElo: fixture.awayElo,
      homeXg: xg.homeExpectedGoals,
      awayXg: xg.awayExpectedGoals,
      modalScoreline: modal === undefined ? null : `${modal.homeGoals}-${modal.awayGoals}`
    };
  });
}

export const HISTORICAL_ELO_REPLAY_CONSTANT_SNAPSHOT = {
  defaultEloKFactor: DEFAULT_ELO_CONFIG.kFactor,
  defaultEloInitialRating: DEFAULT_ELO_CONFIG.initialRating,
  eloToXgAdjustmentPer100: ELO_TO_XG_ADJUSTMENT_PER_100,
  eloToXgMaxAdjustment: ELO_TO_XG_MAX_ELO_ADJUSTMENT
} as const;

export function buildWorldCupOnlyProcessMatchesDiagnostic(matches: readonly EloMatch[] = defaultWorldCupOnlyMatches()) {
  return processMatches(matches);
}
