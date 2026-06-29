import {
  DEFAULT_POISSON_CONFIG,
  aggregateOutcomeProbabilities,
  eloToExpectedGoals,
  generateScoreMatrix,
  getMostLikelyScorelines
} from "../../model/src/index.js";
import {
  STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90,
  STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90,
  calculateStatsBombPredictionAdjustment
} from "./statsbomb-prediction-signal.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";
import { teamNameToId } from "./providers/statsbomb/statsbomb-team-mapping.js";
import type { StatsBombAdjustmentReason } from "./schemas.js";

const LOG_EPSILON = 1e-15;

export const BACKTEST_SAMPLE_SIZE_LABELS = {
  INSUFFICIENT_MAX: 19,
  LIMITED_MAX: 49,
  MODERATE_MAX: 99,
} as const;

export const BACKTEST_FAVORITE_THRESHOLDS = {
  STRONG: 0.40,
  MODERATE: 0.20,
  WEAK: 0.05,
} as const;

export interface BacktestFixture {
  matchId: string;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  homeElo: number;
  awayElo: number;
  actualOutcome: "home_win" | "draw" | "away_win";
  actualHomeGoals: number | null;
  actualAwayGoals: number | null;
  isNeutralVenue: boolean;
  competition: string;
  stage: string;
}

export interface MatchPrediction {
  homeXg: number;
  awayXg: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  modalHomeGoals: number;
  modalAwayGoals: number;
  modalScoreProb: number;
  top5Scorelines: ReadonlyArray<{ homeGoals: number; awayGoals: number; probability: number }>;
}

export interface BacktestResult {
  fixture: BacktestFixture;
  baseline: MatchPrediction;
  enriched: MatchPrediction;
  signalApplied: boolean;
  signalReason: StatsBombAdjustmentReason;
  signalWeight: number;
  homeCoverage: string | null;
  awayCoverage: string | null;
  homeFreshness: string | null;
  awayFreshness: string | null;
  warnings: string[];
}

export type SampleSizeLabel = "insufficient" | "limited" | "moderate" | "stronger";

export interface BacktestMetrics {
  fixtureCount: number;
  brierScore: number | null;
  logLoss: number | null;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
  top3ScoreCoverage: number | null;
  top5ScoreCoverage: number | null;
  homeGoalMae: number | null;
  awayGoalMae: number | null;
  totalGoalMae: number | null;
  avgPredictedHomeGoals: number | null;
  avgPredictedAwayGoals: number | null;
  avgActualHomeGoals: number | null;
  avgActualAwayGoals: number | null;
  probabilitySumValid: boolean;
  sampleSizeLabel: SampleSizeLabel;
}

export interface BacktestMetricDelta {
  brierScore: number | null;
  logLoss: number | null;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
  homeGoalMae: number | null;
  awayGoalMae: number | null;
  totalGoalMae: number | null;
}

export interface BacktestCohort {
  name: string;
  results: BacktestResult[];
  metrics: {
    baseline: BacktestMetrics;
    enriched: BacktestMetrics;
    delta: BacktestMetricDelta;
  };
}

function buildMatchPrediction(
  homeXg: number,
  awayXg: number
): MatchPrediction {
  const scoreMatrix = generateScoreMatrix(
    { expectedHomeGoals: homeXg, expectedAwayGoals: awayXg },
    { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
  );
  const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
  const top5 = getMostLikelyScorelines(scoreMatrix, 5);

  const top5Scorelines = top5.map(s => ({
    homeGoals: s.homeGoals,
    awayGoals: s.awayGoals,
    probability: s.probability
  }));

  const modal = top5Scorelines[0] ?? { homeGoals: 1, awayGoals: 1, probability: 0 };

  return {
    homeXg,
    awayXg,
    homeWinProb: outcomes.homeWinProbability,
    drawProb: outcomes.drawProbability,
    awayWinProb: outcomes.awayWinProbability,
    modalHomeGoals: modal.homeGoals,
    modalAwayGoals: modal.awayGoals,
    modalScoreProb: modal.probability,
    top5Scorelines,
  };
}

export function evaluateBacktestFixture(
  fixture: BacktestFixture,
  profileSource: TeamPerformanceProfileSource
): BacktestResult {
  const xgResult = eloToExpectedGoals({
    homeEloRating: fixture.homeElo,
    awayEloRating: fixture.awayElo,
    preset: "balanced"
  });

  const baseline = buildMatchPrediction(xgResult.homeExpectedGoals, xgResult.awayExpectedGoals);

  const homeTeamId = teamNameToId(fixture.homeTeam);
  const awayTeamId = teamNameToId(fixture.awayTeam);
  const homeProfileRaw = profileSource.getProfile(homeTeamId);
  const awayProfileRaw = profileSource.getProfile(awayTeamId);

  const homeProfile =
    homeProfileRaw !== null && homeProfileRaw.cutoffAt <= fixture.kickoffAt ? homeProfileRaw : null;
  const awayProfile =
    awayProfileRaw !== null && awayProfileRaw.cutoffAt <= fixture.kickoffAt ? awayProfileRaw : null;

  const adjustment = calculateStatsBombPredictionAdjustment({
    homeProfile,
    awayProfile,
    baselineHomeXg: xgResult.homeExpectedGoals,
    baselineAwayXg: xgResult.awayExpectedGoals,
    globalPriorXgForPer90: STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90,
    globalPriorXgAgainstPer90: STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90,
  });

  const enriched = buildMatchPrediction(adjustment.adjustedHomeXg, adjustment.adjustedAwayXg);

  return {
    fixture,
    baseline,
    enriched,
    signalApplied: adjustment.applied,
    signalReason: adjustment.reason,
    signalWeight: Math.min(adjustment.homeWeight, adjustment.awayWeight),
    homeCoverage: adjustment.homeCoverage,
    awayCoverage: adjustment.awayCoverage,
    homeFreshness: adjustment.homeFreshness,
    awayFreshness: adjustment.awayFreshness,
    warnings: adjustment.warnings,
  };
}

function getSampleSizeLabel(count: number): SampleSizeLabel {
  if (count <= BACKTEST_SAMPLE_SIZE_LABELS.INSUFFICIENT_MAX) return "insufficient";
  if (count <= BACKTEST_SAMPLE_SIZE_LABELS.LIMITED_MAX) return "limited";
  if (count <= BACKTEST_SAMPLE_SIZE_LABELS.MODERATE_MAX) return "moderate";
  return "stronger";
}

function outcomeFromResult(result: BacktestResult, useEnriched: boolean): {
  pH: number; pD: number; pA: number;
} {
  const pred = useEnriched ? result.enriched : result.baseline;
  return { pH: pred.homeWinProb, pD: pred.drawProb, pA: pred.awayWinProb };
}

export function computeBacktestMetrics(
  results: BacktestResult[],
  useEnriched: boolean
): BacktestMetrics {
  const n = results.length;
  if (n === 0) {
    return {
      fixtureCount: 0,
      brierScore: null,
      logLoss: null,
      outcomeAccuracy: null,
      exactScoreAccuracy: null,
      top3ScoreCoverage: null,
      top5ScoreCoverage: null,
      homeGoalMae: null,
      awayGoalMae: null,
      totalGoalMae: null,
      avgPredictedHomeGoals: null,
      avgPredictedAwayGoals: null,
      avgActualHomeGoals: null,
      avgActualAwayGoals: null,
      probabilitySumValid: true,
      sampleSizeLabel: "insufficient",
    };
  }

  let brierSum = 0;
  let logLossSum = 0;
  let outcomeCorrect = 0;
  let exactScoreCorrect = 0;
  let top3Correct = 0;
  let top5Correct = 0;

  let homeGoalMaeSum = 0;
  let awayGoalMaeSum = 0;
  let goalsAvailableCount = 0;

  let predictedHomeSum = 0;
  let predictedAwaySum = 0;
  let actualHomeSum = 0;
  let actualAwaySum = 0;
  let actualGoalsCount = 0;

  let probabilitySumValid = true;

  for (const result of results) {
    const pred = useEnriched ? result.enriched : result.baseline;
    const { actualOutcome, actualHomeGoals, actualAwayGoals } = result.fixture;

    const { pH, pD, pA } = outcomeFromResult(result, useEnriched);

    // Probability sum check
    const probSum = pH + pD + pA;
    if (!Number.isFinite(probSum) || Math.abs(probSum - 1) > 1e-6) {
      probabilitySumValid = false;
    }

    // Brier (three-class)
    const iH = actualOutcome === "home_win" ? 1 : 0;
    const iD = actualOutcome === "draw" ? 1 : 0;
    const iA = actualOutcome === "away_win" ? 1 : 0;
    brierSum += (pH - iH) ** 2 + (pD - iD) ** 2 + (pA - iA) ** 2;

    // LogLoss
    const pActual = actualOutcome === "home_win" ? pH : actualOutcome === "draw" ? pD : pA;
    logLossSum -= Math.log(Math.max(pActual, LOG_EPSILON));

    // Outcome accuracy
    const predictedOutcome =
      pH >= pD && pH >= pA ? "home_win" :
      pA >= pD ? "away_win" : "draw";
    if (predictedOutcome === actualOutcome) outcomeCorrect++;

    // Score accuracy
    if (actualHomeGoals !== null && actualAwayGoals !== null) {
      if (pred.modalHomeGoals === actualHomeGoals && pred.modalAwayGoals === actualAwayGoals) {
        exactScoreCorrect++;
      }
      const hasInTop3 = pred.top5Scorelines.slice(0, 3).some(
        s => s.homeGoals === actualHomeGoals && s.awayGoals === actualAwayGoals
      );
      const hasInTop5 = pred.top5Scorelines.some(
        s => s.homeGoals === actualHomeGoals && s.awayGoals === actualAwayGoals
      );
      if (hasInTop3) top3Correct++;
      if (hasInTop5) top5Correct++;

      // Goal MAE
      homeGoalMaeSum += Math.abs(pred.homeXg - actualHomeGoals);
      awayGoalMaeSum += Math.abs(pred.awayXg - actualAwayGoals);
      goalsAvailableCount++;

      actualHomeSum += actualHomeGoals;
      actualAwaySum += actualAwayGoals;
      actualGoalsCount++;
    }

    predictedHomeSum += pred.homeXg;
    predictedAwaySum += pred.awayXg;
  }

  const brierScore = brierSum / n;
  const logLoss = logLossSum / n;
  const outcomeAccuracy = outcomeCorrect / n;

  const exactScoreAccuracy = goalsAvailableCount > 0 ? exactScoreCorrect / goalsAvailableCount : null;
  const top3ScoreCoverage = goalsAvailableCount > 0 ? top3Correct / goalsAvailableCount : null;
  const top5ScoreCoverage = goalsAvailableCount > 0 ? top5Correct / goalsAvailableCount : null;
  const homeGoalMae = goalsAvailableCount > 0 ? homeGoalMaeSum / goalsAvailableCount : null;
  const awayGoalMae = goalsAvailableCount > 0 ? awayGoalMaeSum / goalsAvailableCount : null;
  const totalGoalMae =
    homeGoalMae !== null && awayGoalMae !== null ? (homeGoalMae + awayGoalMae) / 2 : null;

  const avgPredictedHomeGoals = predictedHomeSum / n;
  const avgPredictedAwayGoals = predictedAwaySum / n;
  const avgActualHomeGoals = actualGoalsCount > 0 ? actualHomeSum / actualGoalsCount : null;
  const avgActualAwayGoals = actualGoalsCount > 0 ? actualAwaySum / actualGoalsCount : null;

  // Guard against NaN/Infinity
  const safe = (v: number | null): number | null =>
    v !== null && Number.isFinite(v) ? v : null;

  return {
    fixtureCount: n,
    brierScore: safe(brierScore),
    logLoss: safe(logLoss),
    outcomeAccuracy: safe(outcomeAccuracy),
    exactScoreAccuracy: safe(exactScoreAccuracy),
    top3ScoreCoverage: safe(top3ScoreCoverage),
    top5ScoreCoverage: safe(top5ScoreCoverage),
    homeGoalMae: safe(homeGoalMae),
    awayGoalMae: safe(awayGoalMae),
    totalGoalMae: safe(totalGoalMae),
    avgPredictedHomeGoals: safe(avgPredictedHomeGoals),
    avgPredictedAwayGoals: safe(avgPredictedAwayGoals),
    avgActualHomeGoals: safe(avgActualHomeGoals),
    avgActualAwayGoals: safe(avgActualAwayGoals),
    probabilitySumValid,
    sampleSizeLabel: getSampleSizeLabel(n),
  };
}

export function computeMetricDelta(
  baseline: BacktestMetrics,
  enriched: BacktestMetrics
): BacktestMetricDelta {
  const diff = (e: number | null, b: number | null): number | null =>
    e !== null && b !== null ? e - b : null;

  return {
    brierScore: diff(enriched.brierScore, baseline.brierScore),
    logLoss: diff(enriched.logLoss, baseline.logLoss),
    outcomeAccuracy: diff(enriched.outcomeAccuracy, baseline.outcomeAccuracy),
    exactScoreAccuracy: diff(enriched.exactScoreAccuracy, baseline.exactScoreAccuracy),
    homeGoalMae: diff(enriched.homeGoalMae, baseline.homeGoalMae),
    awayGoalMae: diff(enriched.awayGoalMae, baseline.awayGoalMae),
    totalGoalMae: diff(enriched.totalGoalMae, baseline.totalGoalMae),
  };
}

function buildCohort(
  name: string,
  results: BacktestResult[]
): BacktestCohort {
  const baseline = computeBacktestMetrics(results, false);
  const enriched = computeBacktestMetrics(results, true);
  const delta = computeMetricDelta(baseline, enriched);
  return { name, results, metrics: { baseline, enriched, delta } };
}

function classifyFavoriteStrength(result: BacktestResult): "strong" | "moderate" | "weak" | "none" {
  const gap = Math.abs(result.baseline.homeWinProb - result.baseline.awayWinProb);
  if (gap >= BACKTEST_FAVORITE_THRESHOLDS.STRONG) return "strong";
  if (gap >= BACKTEST_FAVORITE_THRESHOLDS.MODERATE) return "moderate";
  if (gap >= BACKTEST_FAVORITE_THRESHOLDS.WEAK) return "weak";
  return "none";
}

export function buildBacktestCohorts(results: BacktestResult[]): BacktestCohort[] {
  const all = buildCohort("all", results);
  const wcOnly = buildCohort("wc_only", results.filter(r => r.fixture.competition.toLowerCase().includes("world cup")));
  const nonWc = buildCohort("non_wc", results.filter(r => !r.fixture.competition.toLowerCase().includes("world cup")));
  const neutral = buildCohort("neutral", results.filter(r => r.fixture.isNeutralVenue));
  const knockout = buildCohort("knockout", results.filter(r => r.fixture.stage === "knockout" || r.fixture.stage.toLowerCase().includes("final") || r.fixture.stage.toLowerCase().includes("semi") || r.fixture.stage.toLowerCase().includes("quarter") || r.fixture.stage.toLowerCase().includes("round of")));
  const groupStage = buildCohort("group_stage", results.filter(r => r.fixture.stage === "group" || r.fixture.stage.toLowerCase().includes("group")));
  const fullOrPartial = buildCohort("full_or_partial_coverage", results.filter(r => r.homeCoverage === "full" || r.homeCoverage === "partial" || r.awayCoverage === "full" || r.awayCoverage === "partial"));
  const sparse = buildCohort("sparse_coverage", results.filter(r => r.homeCoverage === "sparse" || r.awayCoverage === "sparse"));
  const signalNotApplied = buildCohort("signal_not_applied", results.filter(r => !r.signalApplied));
  const signalApplied = buildCohort("signal_applied", results.filter(r => r.signalApplied));
  const strong = buildCohort("strong_favorite", results.filter(r => classifyFavoriteStrength(r) === "strong"));
  const moderate = buildCohort("moderate_favorite", results.filter(r => classifyFavoriteStrength(r) === "moderate"));
  const weak = buildCohort("weak_favorite", results.filter(r => classifyFavoriteStrength(r) === "weak"));
  const noFavorite = buildCohort("no_clear_favorite", results.filter(r => classifyFavoriteStrength(r) === "none"));
  const baseline1_1 = buildCohort("baseline_modal_1_1", results.filter(r => r.baseline.modalHomeGoals === 1 && r.baseline.modalAwayGoals === 1));
  const drawHeavy = buildCohort("draw_heavy_baseline", results.filter(r => r.baseline.drawProb > r.baseline.homeWinProb && r.baseline.drawProb > r.baseline.awayWinProb));

  return [
    all, wcOnly, nonWc, neutral, knockout, groupStage,
    fullOrPartial, sparse, signalNotApplied, signalApplied,
    strong, moderate, weak, noFavorite,
    baseline1_1, drawHeavy
  ];
}

export interface BacktestSignalCoverage {
  totalFixtures: number;
  signalApplied: number;
  signalApplicationRate: number;
  notAppliedReasons: Record<StatsBombAdjustmentReason, number>;
  avgSignalWeight: number | null;
  maxSignalWeight: number | null;
  avgHomeXgDelta: number;
  avgAwayXgDelta: number;
  maxAbsXgDelta: number;
}

export function computeSignalCoverage(results: BacktestResult[]): BacktestSignalCoverage {
  const n = results.length;
  const reasons: Record<string, number> = {};
  let appliedCount = 0;
  let totalWeight = 0;
  let maxWeight = 0;
  let homeXgDeltaSum = 0;
  let awayXgDeltaSum = 0;
  let maxAbsDelta = 0;

  for (const r of results) {
    if (r.signalApplied) {
      appliedCount++;
      totalWeight += r.signalWeight;
      if (r.signalWeight > maxWeight) maxWeight = r.signalWeight;
    }
    const reason = r.signalReason as string;
    reasons[reason] = (reasons[reason] ?? 0) + 1;

    const homeDelta = r.enriched.homeXg - r.baseline.homeXg;
    const awayDelta = r.enriched.awayXg - r.baseline.awayXg;
    homeXgDeltaSum += homeDelta;
    awayXgDeltaSum += awayDelta;
    const absDelta = Math.max(Math.abs(homeDelta), Math.abs(awayDelta));
    if (absDelta > maxAbsDelta) maxAbsDelta = absDelta;
  }

  return {
    totalFixtures: n,
    signalApplied: appliedCount,
    signalApplicationRate: n > 0 ? appliedCount / n : 0,
    notAppliedReasons: reasons as Record<StatsBombAdjustmentReason, number>,
    avgSignalWeight: appliedCount > 0 ? totalWeight / appliedCount : null,
    maxSignalWeight: appliedCount > 0 ? maxWeight : null,
    avgHomeXgDelta: n > 0 ? homeXgDeltaSum / n : 0,
    avgAwayXgDelta: n > 0 ? awayXgDeltaSum / n : 0,
    maxAbsXgDelta: maxAbsDelta,
  };
}
