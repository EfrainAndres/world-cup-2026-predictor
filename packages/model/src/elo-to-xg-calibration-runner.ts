import { eloToExpectedGoals, ELO_TO_XG_BASE_GOALS, ELO_TO_XG_ADJUSTMENT_PER_100, ELO_TO_XG_MAX_ELO_ADJUSTMENT, ELO_XG_PRESETS } from "./elo-to-xg.js";
import { generateScoreMatrix } from "./poisson.js";
import { aggregateOutcomeProbabilities } from "./probability.js";
import { HISTORICAL_VALIDATION_EPSILON } from "./historical-validation.js";
import {
  buildEloToXgCalibrationDataset,
  ELO_DIFFERENCE_BUCKETS,
  ELO_TO_XG_CALIBRATION_VERSION,
  assignEloDifferenceBucket
} from "./elo-to-xg-calibration.js";
import type {
  BuildCalibrationDatasetInput,
  CalibrationMatchInput,
  CalibrationSplit,
  EloGapBucket,
  EloToXgCalibrationDataset,
  EloToXgCalibrationRecord
} from "./elo-to-xg-calibration.js";
import type { EloResult } from "./types.js";

// --- Re-export types for consumers ---
export type { BuildCalibrationDatasetInput, CalibrationMatchInput, CalibrationSplit };

// --- Constants ---

export const CALIBRATION_RUNNER_VERSION = "elo-to-xg-calibration-runner-v1";
export const CALIBRATION_RUNNER_DEFAULT_PRESET = "balanced";
export const CALIBRATION_RUNNER_POISSON_MAX_GOALS = 7;

export const COMPRESSION_GAP_NOTE =
  "compressionGap = actualFavoriteWinFrequency - predictedFavoriteWinProbability. " +
  "Positive value means the model under-predicts the stronger team's win probability (compression). " +
  "Negative value means the model over-predicts.";

// --- Types ---

export interface SplitMetrics {
  split: CalibrationSplit | "combined_non_2026";
  records_available: number;
  records_evaluated: number;
  records_rejected: number;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  home_goal_rmse: number | null;
  away_goal_rmse: number | null;
  total_goal_rmse: number | null;
  mean_brier_score: number | null;
  mean_log_loss: number | null;
  outcome_accuracy: number | null;
  avg_predicted_home_goals: number | null;
  avg_predicted_away_goals: number | null;
  avg_actual_home_goals: number | null;
  avg_actual_away_goals: number | null;
  probability_sum_valid: boolean;
  warnings: string[];
}

export interface BucketCompressionMetrics {
  bucket: string;
  count: number;
  avg_elo_difference: number | null;
  avg_predicted_home_xg: number | null;
  avg_predicted_away_xg: number | null;
  avg_actual_home_goals: number | null;
  avg_actual_away_goals: number | null;
  outcome_accuracy: number | null;
  mean_brier_score: number | null;
  mean_log_loss: number | null;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  predicted_favorite_win_probability: number | null;
  actual_favorite_win_frequency: number | null;
  compression_gap: number | null;
}

export interface CompetitionBreakdown {
  competition: string;
  count: number;
  split: string;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  mean_brier_score: number | null;
  mean_log_loss: number | null;
}

export interface NeutralSiteBreakdown {
  neutral: { count: number; mean_home_goal_mae: number | null; mean_away_goal_mae: number | null; mean_brier_score: number | null; mean_log_loss: number | null };
  non_neutral: { count: number; mean_home_goal_mae: number | null; mean_away_goal_mae: number | null; mean_brier_score: number | null; mean_log_loss: number | null };
}

export interface DataSourceBreakdown {
  source_dataset: string;
  count: number;
  split: CalibrationSplit;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_brier_score: number | null;
}

export interface ProductionFormulaSnapshot {
  base_goals: number;
  adjustment_per_100: number;
  max_elo_adjustment: number;
  preset_used: string;
  prediction_path: string;
  calibration_version: string;
  runner_version: string;
}

export interface CalibrationExperimentReport {
  formula: ProductionFormulaSnapshot;
  dataset: {
    total_count: number;
    rejected_count: number;
    sources: string[];
    split_counts: Record<CalibrationSplit, number>;
    calibration_version: string;
  };
  splits: {
    training: SplitMetrics;
    validation: SplitMetrics;
    holdout: SplitMetrics;
    wc2026_holdout: SplitMetrics;
    combined_non_2026: SplitMetrics;
  };
  elo_gap_buckets: BucketCompressionMetrics[];
  by_competition: CompetitionBreakdown[];
  by_neutral_site: NeutralSiteBreakdown;
  by_source: DataSourceBreakdown[];
  limitations: string[];
  warnings: string[];
}

// --- Internal helpers ---

interface PoissonOutcomeProbs {
  homeWin: number;
  draw: number;
  awayWin: number;
  totalProbability: number;
}

function computePoissonOutcomeProbs(homeElo: number, awayElo: number): PoissonOutcomeProbs {
  const xgResult = eloToExpectedGoals({
    homeEloRating: homeElo,
    awayEloRating: awayElo,
    preset: CALIBRATION_RUNNER_DEFAULT_PRESET
  });

  const scoreMatrix = generateScoreMatrix(
    { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
    { maxGoals: CALIBRATION_RUNNER_POISSON_MAX_GOALS, normalizeMatrix: true }
  );

  const agg = aggregateOutcomeProbabilities(scoreMatrix);

  return {
    homeWin: agg.homeWinProbability,
    draw: agg.drawProbability,
    awayWin: agg.awayWinProbability,
    totalProbability: agg.totalProbability
  };
}

function computeXg(homeElo: number, awayElo: number): { homeXg: number; awayXg: number } {
  const xgResult = eloToExpectedGoals({
    homeEloRating: homeElo,
    awayEloRating: awayElo,
    preset: CALIBRATION_RUNNER_DEFAULT_PRESET
  });
  return { homeXg: xgResult.homeExpectedGoals, awayXg: xgResult.awayExpectedGoals };
}

function brierScore(probs: PoissonOutcomeProbs, actual: EloResult): number {
  const yHome = actual === "home_win" ? 1 : 0;
  const yDraw = actual === "draw" ? 1 : 0;
  const yAway = actual === "away_win" ? 1 : 0;
  return (probs.homeWin - yHome) ** 2 + (probs.draw - yDraw) ** 2 + (probs.awayWin - yAway) ** 2;
}

function logLoss(probs: PoissonOutcomeProbs, actual: EloResult): number {
  const p = actual === "home_win" ? probs.homeWin : actual === "draw" ? probs.draw : probs.awayWin;
  const clamped = Math.max(HISTORICAL_VALIDATION_EPSILON, Math.min(1 - HISTORICAL_VALIDATION_EPSILON, p));
  return -Math.log(clamped);
}

function predictedOutcome(probs: PoissonOutcomeProbs): EloResult {
  if (probs.homeWin >= probs.draw && probs.homeWin >= probs.awayWin) return "home_win";
  if (probs.draw >= probs.awayWin) return "draw";
  return "away_win";
}

function safeAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = values.reduce((a, v) => a + v, 0) / values.length;
  return Number.isFinite(s) ? s : null;
}

function safeRmse(values: number[]): number | null {
  if (values.length === 0) return null;
  const mse = values.reduce((a, v) => a + v * v, 0) / values.length;
  return Number.isFinite(mse) ? Math.sqrt(mse) : null;
}

// --- Per-record computation ---

interface RecordResult {
  homeXg: number;
  awayXg: number;
  homeGoalMae: number;
  awayGoalMae: number;
  totalGoalMae: number;
  brier: number;
  ll: number;
  correct: boolean;
  probHomeWin: number;
  probDraw: number;
  probAwayWin: number;
  probSum: number;
}

function evalRecord(record: EloToXgCalibrationRecord): RecordResult {
  const probs = computePoissonOutcomeProbs(record.pre_match_home_elo, record.pre_match_away_elo);
  const { homeXg, awayXg } = computeXg(record.pre_match_home_elo, record.pre_match_away_elo);
  return {
    homeXg,
    awayXg,
    homeGoalMae: Math.abs(homeXg - record.home_goals),
    awayGoalMae: Math.abs(awayXg - record.away_goals),
    totalGoalMae: Math.abs(homeXg + awayXg - record.total_goals),
    brier: brierScore(probs, record.outcome),
    ll: logLoss(probs, record.outcome),
    correct: predictedOutcome(probs) === record.outcome,
    probHomeWin: probs.homeWin,
    probDraw: probs.draw,
    probAwayWin: probs.awayWin,
    probSum: probs.totalProbability
  };
}

// --- Split evaluation ---

function evaluateSplit(
  records: readonly EloToXgCalibrationRecord[],
  splitName: CalibrationSplit | "combined_non_2026",
  totalRejected: number
): SplitMetrics {
  const warnings: string[] = [];

  if (records.length === 0) {
    return {
      split: splitName,
      records_available: 0,
      records_evaluated: 0,
      records_rejected: totalRejected,
      mean_home_goal_mae: null,
      mean_away_goal_mae: null,
      mean_total_goal_mae: null,
      home_goal_rmse: null,
      away_goal_rmse: null,
      total_goal_rmse: null,
      mean_brier_score: null,
      mean_log_loss: null,
      outcome_accuracy: null,
      avg_predicted_home_goals: null,
      avg_predicted_away_goals: null,
      avg_actual_home_goals: null,
      avg_actual_away_goals: null,
      probability_sum_valid: true,
      warnings: ["No records in this split."]
    };
  }

  const results = records.map(evalRecord);

  // Validate probability sums (all should be ~1.0)
  const probSumValid = results.every((r) => Math.abs(r.probSum - 1.0) < 0.001);
  if (!probSumValid) {
    warnings.push("One or more records have outcome probability sums deviating more than 0.001 from 1.0.");
  }

  // Validate no NaN/Infinity
  const allNums = results.flatMap((r) => [r.homeGoalMae, r.awayGoalMae, r.totalGoalMae, r.brier, r.ll]);
  if (allNums.some((v) => !Number.isFinite(v))) {
    warnings.push("One or more computed metric values are non-finite.");
  }

  return {
    split: splitName,
    records_available: records.length,
    records_evaluated: records.length,
    records_rejected: totalRejected,
    mean_home_goal_mae: safeAvg(results.map((r) => r.homeGoalMae)),
    mean_away_goal_mae: safeAvg(results.map((r) => r.awayGoalMae)),
    mean_total_goal_mae: safeAvg(results.map((r) => r.totalGoalMae)),
    home_goal_rmse: safeRmse(results.map((r) => r.homeGoalMae)),
    away_goal_rmse: safeRmse(results.map((r) => r.awayGoalMae)),
    total_goal_rmse: safeRmse(results.map((r) => r.totalGoalMae)),
    mean_brier_score: safeAvg(results.map((r) => r.brier)),
    mean_log_loss: safeAvg(results.map((r) => r.ll)),
    outcome_accuracy: safeAvg(results.map((r) => (r.correct ? 1 : 0))),
    avg_predicted_home_goals: safeAvg(results.map((r) => r.homeXg)),
    avg_predicted_away_goals: safeAvg(results.map((r) => r.awayXg)),
    avg_actual_home_goals: safeAvg(records.map((r) => r.home_goals)),
    avg_actual_away_goals: safeAvg(records.map((r) => r.away_goals)),
    probability_sum_valid: probSumValid,
    warnings
  };
}

// --- Bucket compression analysis ---

function computeBucketCompression(
  records: readonly EloToXgCalibrationRecord[],
  bucket: EloGapBucket
): BucketCompressionMetrics {
  const bucketRecords = records.filter((r) => r.elo_bucket === bucket.label);

  if (bucketRecords.length === 0) {
    return {
      bucket: bucket.label,
      count: 0,
      avg_elo_difference: null,
      avg_predicted_home_xg: null,
      avg_predicted_away_xg: null,
      avg_actual_home_goals: null,
      avg_actual_away_goals: null,
      outcome_accuracy: null,
      mean_brier_score: null,
      mean_log_loss: null,
      mean_home_goal_mae: null,
      mean_away_goal_mae: null,
      mean_total_goal_mae: null,
      predicted_favorite_win_probability: null,
      actual_favorite_win_frequency: null,
      compression_gap: null
    };
  }

  const results = bucketRecords.map(evalRecord);

  // Determine the "favorite" for each match.
  // In positive-diff buckets home team is favorite, in negative-diff buckets away team is favorite.
  // For the middle bucket (near zero), we use the team with higher predicted win prob.
  const predictedFavWinProbs: number[] = [];
  const actualFavWins: number[] = [];

  for (let i = 0; i < bucketRecords.length; i++) {
    const record = bucketRecords[i];
    const result = results[i];
    if (record === undefined || result === undefined) continue;

    if (record.elo_difference > 0) {
      // Home team is favorite
      predictedFavWinProbs.push(result.probHomeWin);
      actualFavWins.push(record.outcome === "home_win" ? 1 : 0);
    } else if (record.elo_difference < 0) {
      // Away team is favorite
      predictedFavWinProbs.push(result.probAwayWin);
      actualFavWins.push(record.outcome === "away_win" ? 1 : 0);
    } else {
      // Exact equal — use home team as nominal favorite
      predictedFavWinProbs.push(result.probHomeWin);
      actualFavWins.push(record.outcome === "home_win" ? 1 : 0);
    }
  }

  const predictedFavWin = safeAvg(predictedFavWinProbs);
  const actualFavWin = safeAvg(actualFavWins);
  const compressionGap =
    predictedFavWin !== null && actualFavWin !== null
      ? actualFavWin - predictedFavWin
      : null;

  return {
    bucket: bucket.label,
    count: bucketRecords.length,
    avg_elo_difference: safeAvg(bucketRecords.map((r) => r.elo_difference)),
    avg_predicted_home_xg: safeAvg(results.map((r) => r.homeXg)),
    avg_predicted_away_xg: safeAvg(results.map((r) => r.awayXg)),
    avg_actual_home_goals: safeAvg(bucketRecords.map((r) => r.home_goals)),
    avg_actual_away_goals: safeAvg(bucketRecords.map((r) => r.away_goals)),
    outcome_accuracy: safeAvg(results.map((r) => (r.correct ? 1 : 0))),
    mean_brier_score: safeAvg(results.map((r) => r.brier)),
    mean_log_loss: safeAvg(results.map((r) => r.ll)),
    mean_home_goal_mae: safeAvg(results.map((r) => r.homeGoalMae)),
    mean_away_goal_mae: safeAvg(results.map((r) => r.awayGoalMae)),
    mean_total_goal_mae: safeAvg(results.map((r) => r.totalGoalMae)),
    predicted_favorite_win_probability: predictedFavWin,
    actual_favorite_win_frequency: actualFavWin,
    compression_gap: compressionGap
  };
}

// --- Competition breakdown ---

function computeCompetitionBreakdown(records: readonly EloToXgCalibrationRecord[]): CompetitionBreakdown[] {
  const map = new Map<string, { records: EloToXgCalibrationRecord[] }>();

  for (const record of records) {
    const key = `${record.competition}__${record.split}`;
    let entry = map.get(key);
    if (entry === undefined) {
      entry = { records: [] };
      map.set(key, entry);
    }
    entry.records.push(record);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => {
      const [competition, split] = key.split("__");
      const results = entry.records.map(evalRecord);
      return {
        competition: competition ?? "",
        count: entry.records.length,
        split: split ?? "",
        mean_home_goal_mae: safeAvg(results.map((r) => r.homeGoalMae)),
        mean_away_goal_mae: safeAvg(results.map((r) => r.awayGoalMae)),
        mean_total_goal_mae: safeAvg(results.map((r) => r.totalGoalMae)),
        mean_brier_score: safeAvg(results.map((r) => r.brier)),
        mean_log_loss: safeAvg(results.map((r) => r.ll))
      };
    });
}

// --- Neutral site breakdown ---

function computeNeutralBreakdown(records: readonly EloToXgCalibrationRecord[]): NeutralSiteBreakdown {
  const neutral = records.filter((r) => r.neutral_site);
  const nonNeutral = records.filter((r) => !r.neutral_site);

  const neutralResults = neutral.map(evalRecord);
  const nonNeutralResults = nonNeutral.map(evalRecord);

  return {
    neutral: {
      count: neutral.length,
      mean_home_goal_mae: safeAvg(neutralResults.map((r) => r.homeGoalMae)),
      mean_away_goal_mae: safeAvg(neutralResults.map((r) => r.awayGoalMae)),
      mean_brier_score: safeAvg(neutralResults.map((r) => r.brier)),
      mean_log_loss: safeAvg(neutralResults.map((r) => r.ll))
    },
    non_neutral: {
      count: nonNeutral.length,
      mean_home_goal_mae: safeAvg(nonNeutralResults.map((r) => r.homeGoalMae)),
      mean_away_goal_mae: safeAvg(nonNeutralResults.map((r) => r.awayGoalMae)),
      mean_brier_score: safeAvg(nonNeutralResults.map((r) => r.brier)),
      mean_log_loss: safeAvg(nonNeutralResults.map((r) => r.ll))
    }
  };
}

// --- Data source breakdown ---

function computeSourceBreakdown(records: readonly EloToXgCalibrationRecord[]): DataSourceBreakdown[] {
  const map = new Map<string, { records: EloToXgCalibrationRecord[]; split: CalibrationSplit }>();

  for (const record of records) {
    const key = `${record.source_dataset}__${record.split}`;
    let entry = map.get(key);
    if (entry === undefined) {
      entry = { records: [], split: record.split };
      map.set(key, entry);
    }
    entry.records.push(record);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => {
      const results = entry.records.map(evalRecord);
      return {
        source_dataset: entry.records[0]?.source_dataset ?? "",
        count: entry.records.length,
        split: entry.split,
        mean_home_goal_mae: safeAvg(results.map((r) => r.homeGoalMae)),
        mean_away_goal_mae: safeAvg(results.map((r) => r.awayGoalMae)),
        mean_brier_score: safeAvg(results.map((r) => r.brier))
      };
    });
}

// --- Main experiment runner ---

export interface RunCalibrationExperimentInput extends BuildCalibrationDatasetInput {
  preBuiltDataset?: EloToXgCalibrationDataset;
}

export function runEloToXgCalibrationBaselineExperiment(
  input: RunCalibrationExperimentInput
): CalibrationExperimentReport {
  // Allow a pre-built dataset for testing; otherwise build it
  const dataset = input.preBuiltDataset ?? buildEloToXgCalibrationDataset(input);

  const { records, split_counts, rejected_count, total_count, sources, calibration_version } = dataset;

  const trainingRecords = records.filter((r) => r.split === "training");
  const validationRecords = records.filter((r) => r.split === "validation");
  const holdoutRecords = records.filter((r) => r.split === "holdout");
  const wc2026Records = records.filter((r) => r.split === "wc2026_holdout");
  const nonWc2026Records = records.filter((r) => r.split !== "wc2026_holdout");

  const warnings: string[] = [];

  // Verify WC2026 isolation: none of its records appear in non-2026 splits
  const wc2026InNonHoldout = records.filter(
    (r) => r.source_dataset === "wc2026" && r.split !== "wc2026_holdout"
  );
  if (wc2026InNonHoldout.length > 0) {
    warnings.push(`INVARIANT VIOLATION: ${wc2026InNonHoldout.length} WC2026 record(s) assigned outside wc2026_holdout split.`);
  }

  // Verify no xG outside production bounds
  const outOfBounds = records.some((r) => {
    const { homeXg, awayXg } = computeXg(r.pre_match_home_elo, r.pre_match_away_elo);
    return homeXg < 0.2 || homeXg > 4.0 || awayXg < 0.2 || awayXg > 4.0;
  });
  if (outOfBounds) {
    warnings.push("INVARIANT VIOLATION: one or more records produce xG outside production bounds [0.2, 4.0].");
  }

  // Verify production preset = balanced
  const balancedPreset = ELO_XG_PRESETS["balanced"];
  if (
    balancedPreset.adjustmentPer100 !== ELO_TO_XG_ADJUSTMENT_PER_100 ||
    balancedPreset.maxAdjustment !== ELO_TO_XG_MAX_ELO_ADJUSTMENT
  ) {
    warnings.push("INVARIANT WARNING: balanced preset constants may have drifted from production defaults.");
  }

  const formula: ProductionFormulaSnapshot = {
    base_goals: ELO_TO_XG_BASE_GOALS,
    adjustment_per_100: ELO_TO_XG_ADJUSTMENT_PER_100,
    max_elo_adjustment: ELO_TO_XG_MAX_ELO_ADJUSTMENT,
    preset_used: CALIBRATION_RUNNER_DEFAULT_PRESET,
    prediction_path: `eloToExpectedGoals(balanced) → Poisson(maxGoals=${CALIBRATION_RUNNER_POISSON_MAX_GOALS}, normalize=true) → aggregateOutcomeProbabilities`,
    calibration_version: ELO_TO_XG_CALIBRATION_VERSION,
    runner_version: CALIBRATION_RUNNER_VERSION
  };

  return {
    formula,
    dataset: {
      total_count,
      rejected_count,
      sources,
      split_counts,
      calibration_version
    },
    splits: {
      training: evaluateSplit(trainingRecords, "training", rejected_count),
      validation: evaluateSplit(validationRecords, "validation", rejected_count),
      holdout: evaluateSplit(holdoutRecords, "holdout", rejected_count),
      wc2026_holdout: evaluateSplit(wc2026Records, "wc2026_holdout", rejected_count),
      combined_non_2026: evaluateSplit(nonWc2026Records, "combined_non_2026", rejected_count)
    },
    elo_gap_buckets: ELO_DIFFERENCE_BUCKETS.map((b) => computeBucketCompression(nonWc2026Records, b)),
    by_competition: computeCompetitionBreakdown(nonWc2026Records),
    by_neutral_site: computeNeutralBreakdown(nonWc2026Records),
    by_source: computeSourceBreakdown(records),
    limitations: [
      "Calibration dataset is a curated sample, not complete international match history.",
      "Teams appearing for the first time in the dataset start at the fallback initial rating (1500).",
      "WC2026 holdout metrics are only available when wc2026CompletedMatches is supplied.",
      "Bucket analysis covers only non-WC2026 records to preserve holdout isolation.",
      "Outcome probability uses Poisson(maxGoals=7, normalize=true) with the balanced preset.",
      "No statistical significance testing is performed; sample sizes in outer buckets may be small.",
      "Repeated runs produce identical output; no random state is involved."
    ],
    warnings
  };
}

// --- Determinism guard ---

export function assertReportDeterminism(
  a: CalibrationExperimentReport,
  b: CalibrationExperimentReport
): boolean {
  const aJson = JSON.stringify(a);
  const bJson = JSON.stringify(b);
  return aJson === bJson;
}

// --- Bucket label helper (re-exported for convenience) ---
export { assignEloDifferenceBucket };
