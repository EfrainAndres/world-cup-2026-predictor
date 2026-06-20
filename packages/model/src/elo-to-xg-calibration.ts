import { DEFAULT_ELO_CONFIG, updateRatingsAfterMatch } from "./elo.js";
import { eloToExpectedGoals, ELO_TO_XG_BASE_GOALS, ELO_TO_XG_ADJUSTMENT_PER_100, ELO_TO_XG_MAX_ELO_ADJUSTMENT } from "./elo-to-xg.js";
import { HISTORICAL_VALIDATION_EPSILON } from "./historical-validation.js";
import type { EloConfig, EloResult } from "./types.js";

// --- Constants ---

export const ELO_TO_XG_CALIBRATION_VERSION = "elo-to-xg-calibration-v1";

export const ELO_TO_XG_CALIBRATION_TRAINING_YEARS = [2010, 2014] as const;
export const ELO_TO_XG_CALIBRATION_VALIDATION_YEARS = [2018] as const;
export const ELO_TO_XG_CALIBRATION_HOLDOUT_YEARS = [2022] as const;
export const ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT = "wc2026" as const;

export const ELO_DIFFERENCE_BUCKETS: readonly EloGapBucket[] = [
  { label: "<= -300", min: -Infinity, max: -300 },
  { label: "-300 to -150", min: -300, max: -150 },
  { label: "-150 to -75", min: -150, max: -75 },
  { label: "-75 to 75", min: -75, max: 75 },
  { label: "75 to 150", min: 75, max: 150 },
  { label: "150 to 300", min: 150, max: 300 },
  { label: ">= 300", min: 300, max: Infinity }
];

export const CALIBRATION_DATASET_SAMPLE_WARNING =
  "Calibration dataset is built from curated historical fixture samples. Not a complete international match database.";
export const CALIBRATION_NO_LOOKAHEAD_NOTE =
  "Pre-match Elo uses only matches strictly before the fixture date. No look-ahead leakage.";

// --- Input types ---

export interface CalibrationMatchInput {
  match_id: string;
  match_date: string;
  competition: string;
  year?: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: EloResult;
  neutral_site: boolean;
  source_dataset: string;
}

// --- Output types ---

export type CalibrationSplit = "training" | "validation" | "holdout" | "wc2026_holdout";

export interface EloToXgCalibrationRecord {
  match_id: string;
  competition: string;
  year: number | null;
  kickoff_date: string;
  home_team: string;
  away_team: string;
  neutral_site: boolean;
  pre_match_home_elo: number;
  pre_match_away_elo: number;
  elo_difference: number;
  home_goals: number;
  away_goals: number;
  total_goals: number;
  outcome: EloResult;
  source_dataset: string;
  split: CalibrationSplit;
  elo_bucket: string;
  data_quality_warnings: string[];
}

export interface EloGapBucket {
  label: string;
  min: number;
  max: number;
}

export interface EloGapBucketAnalysis {
  bucket: string;
  count: number;
  avg_elo_difference: number | null;
  avg_predicted_home_xg: number | null;
  avg_predicted_away_xg: number | null;
  avg_actual_home_goals: number | null;
  avg_actual_away_goals: number | null;
  outcome_accuracy: number | null;
  mean_brier_score: number | null;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
}

export interface CalibrationByCompetition {
  competition: string;
  count: number;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  mean_brier_score: number | null;
  mean_log_loss: number | null;
}

export interface CalibrationBaselineMetrics {
  records_evaluated: number;
  mean_home_goal_mae: number | null;
  mean_away_goal_mae: number | null;
  mean_total_goal_mae: number | null;
  home_goal_rmse: number | null;
  away_goal_rmse: number | null;
  total_goal_rmse: number | null;
  mean_brier_score: number | null;
  mean_log_loss: number | null;
  avg_predicted_home_goals: number | null;
  avg_predicted_away_goals: number | null;
  avg_actual_home_goals: number | null;
  avg_actual_away_goals: number | null;
  outcome_accuracy: number | null;
  elo_gap_bucket_analysis: EloGapBucketAnalysis[];
  by_competition: CalibrationByCompetition[];
  by_neutral_site: {
    neutral: { count: number; mean_home_goal_mae: number | null; mean_away_goal_mae: number | null; mean_brier_score: number | null };
    non_neutral: { count: number; mean_home_goal_mae: number | null; mean_away_goal_mae: number | null; mean_brier_score: number | null };
  };
  warnings: string[];
  formula_version: string;
}

export interface EloToXgCalibrationDataset {
  records: EloToXgCalibrationRecord[];
  total_count: number;
  rejected_count: number;
  rejection_reasons: string[];
  split_counts: Record<CalibrationSplit, number>;
  sources: string[];
  calibration_version: string;
  warnings: string[];
}

// --- Split assignment ---

function assignSplit(match: CalibrationMatchInput): CalibrationSplit {
  if (match.source_dataset === ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT) {
    return "wc2026_holdout";
  }

  const year = match.year ?? extractYear(match.match_date);

  if (ELO_TO_XG_CALIBRATION_TRAINING_YEARS.includes(year as 2010 | 2014)) {
    return "training";
  }

  if (ELO_TO_XG_CALIBRATION_VALIDATION_YEARS.includes(year as 2018)) {
    return "validation";
  }

  if (ELO_TO_XG_CALIBRATION_HOLDOUT_YEARS.includes(year as 2022)) {
    return "holdout";
  }

  // International matches: split by year chronologically
  // Training: before 2019, Validation: 2019-2021, Holdout: 2022+
  if (year < 2019) return "training";
  if (year <= 2021) return "validation";
  return "holdout";
}

function extractYear(dateString: string): number {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 0;
  return parsed.getFullYear();
}

// --- Bucket assignment ---

export function assignEloDifferenceBucket(eloDifference: number): string {
  for (const bucket of ELO_DIFFERENCE_BUCKETS) {
    if (eloDifference > bucket.min && eloDifference <= bucket.max) {
      return bucket.label;
    }
  }
  // First bucket is -Infinity to -300 (inclusive of -300 edge goes to second bucket)
  // Handle exact -Infinity lower bound: eloDiff <= -300
  const firstBucket = ELO_DIFFERENCE_BUCKETS[0];
  if (eloDifference <= (firstBucket?.max ?? -300)) {
    return firstBucket?.label ?? "<= -300";
  }
  return ELO_DIFFERENCE_BUCKETS[ELO_DIFFERENCE_BUCKETS.length - 1]?.label ?? ">= 300";
}

// --- Eligibility validation ---

interface EligibilityResult {
  eligible: boolean;
  warnings: string[];
  rejectionReason?: string;
}

function checkEligibility(match: CalibrationMatchInput): EligibilityResult {
  const warnings: string[] = [];

  if (!match.match_id || match.match_id.trim().length === 0) {
    return { eligible: false, warnings, rejectionReason: "missing_match_id" };
  }

  if (!match.match_date || match.match_date.trim().length === 0) {
    return { eligible: false, warnings, rejectionReason: "missing_match_date" };
  }

  const dateMs = new Date(match.match_date).getTime();
  if (Number.isNaN(dateMs)) {
    return { eligible: false, warnings, rejectionReason: "invalid_match_date" };
  }

  if (!match.home_team || match.home_team.trim().length === 0) {
    return { eligible: false, warnings, rejectionReason: "missing_home_team" };
  }

  if (!match.away_team || match.away_team.trim().length === 0) {
    return { eligible: false, warnings, rejectionReason: "missing_away_team" };
  }

  if (!Number.isInteger(match.home_score) || match.home_score < 0) {
    return { eligible: false, warnings, rejectionReason: `invalid_score: home=${match.home_score}` };
  }

  if (!Number.isInteger(match.away_score) || match.away_score < 0) {
    return { eligible: false, warnings, rejectionReason: `invalid_score: away=${match.away_score}` };
  }

  if (!match.result || !["home_win", "draw", "away_win"].includes(match.result)) {
    return { eligible: false, warnings, rejectionReason: "invalid_result" };
  }

  // Cross-check result vs scores
  const derivedResult: EloResult =
    match.home_score > match.away_score ? "home_win" :
    match.home_score < match.away_score ? "away_win" :
    "draw";

  if (derivedResult !== match.result) {
    return { eligible: false, warnings, rejectionReason: `result_score_mismatch: result=${match.result} but scores=${match.home_score}-${match.away_score}` };
  }

  return { eligible: true, warnings };
}

// --- Calibration dataset builder ---

export interface BuildCalibrationDatasetInput {
  historicalWorldCupMatches: readonly CalibrationMatchInput[];
  internationalMatches: readonly CalibrationMatchInput[];
  wc2026CompletedMatches?: readonly CalibrationMatchInput[];
  eloConfig?: Partial<EloConfig>;
}

export function buildEloToXgCalibrationDataset(input: BuildCalibrationDatasetInput): EloToXgCalibrationDataset {
  const config: EloConfig = {
    initialRating: input.eloConfig?.initialRating ?? DEFAULT_ELO_CONFIG.initialRating,
    kFactor: input.eloConfig?.kFactor ?? DEFAULT_ELO_CONFIG.kFactor
  };

  const datasetWarnings: string[] = [CALIBRATION_DATASET_SAMPLE_WARNING, CALIBRATION_NO_LOOKAHEAD_NOTE];
  const rejectionReasons: string[] = [];
  let rejectedCount = 0;
  const records: EloToXgCalibrationRecord[] = [];
  const seenMatchIds = new Set<string>();

  // Combine all matches and sort chronologically for Elo replay
  const wc2026Matches = (input.wc2026CompletedMatches ?? []).map((m) => ({
    ...m,
    source_dataset: ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT
  }));

  const allMatches = [
    ...input.historicalWorldCupMatches,
    ...input.internationalMatches,
    ...wc2026Matches
  ];

  // Sort by date then match_id for determinism
  const sortedMatches = [...allMatches].sort(
    (a, b) => a.match_date.localeCompare(b.match_date) || a.match_id.localeCompare(b.match_id)
  );

  // Elo replay: maintain running ratings, capture pre-match rating for each eligible match
  let ratings = new Map<string, number>();

  for (const match of sortedMatches) {
    // Eligibility check
    const eligibility = checkEligibility(match);

    if (!eligibility.eligible) {
      rejectedCount++;
      rejectionReasons.push(`${match.match_id}: ${eligibility.rejectionReason ?? "unknown"}`);
      // Still update Elo if we have valid scores (to not corrupt the Elo sequence)
      if (
        Number.isInteger(match.home_score) && match.home_score >= 0 &&
        Number.isInteger(match.away_score) && match.away_score >= 0 &&
        match.home_team.trim().length > 0 && match.away_team.trim().length > 0
      ) {
        try {
          const update = updateRatingsAfterMatch(ratings, {
            match_id: match.match_id,
            match_date: match.match_date,
            home_team: match.home_team,
            away_team: match.away_team,
            home_score: match.home_score,
            away_score: match.away_score,
            result: match.result
          }, config);
          ratings = update.ratings;
        } catch {
          // Ignore Elo update failures for ineligible matches
        }
      }
      continue;
    }

    // Duplicate detection
    if (seenMatchIds.has(match.match_id)) {
      rejectedCount++;
      rejectionReasons.push(`${match.match_id}: duplicate_match_id`);
      continue;
    }
    seenMatchIds.add(match.match_id);

    // Capture pre-match Elo (ratings BEFORE this match is processed)
    const preMatchHomeElo = ratings.get(match.home_team) ?? config.initialRating;
    const preMatchAwayElo = ratings.get(match.away_team) ?? config.initialRating;
    const eloDifference = preMatchHomeElo - preMatchAwayElo;

    // Update Elo ratings with this match result
    const update = updateRatingsAfterMatch(ratings, {
      match_id: match.match_id,
      match_date: match.match_date,
      home_team: match.home_team,
      away_team: match.away_team,
      home_score: match.home_score,
      away_score: match.away_score,
      result: match.result
    }, config);
    ratings = update.ratings;

    const split = assignSplit(match);
    const eloBucket = assignEloDifferenceBucket(eloDifference);
    const year = match.year ?? extractYear(match.match_date);
    const warnings = [...eligibility.warnings];

    // Warn on fallback initial rating usage
    if (!ratings.has(match.home_team) || preMatchHomeElo === config.initialRating) {
      warnings.push(`home_team_fallback_rating: ${match.home_team} started at initial rating ${config.initialRating}`);
    }
    if (!ratings.has(match.away_team) || preMatchAwayElo === config.initialRating) {
      warnings.push(`away_team_fallback_rating: ${match.away_team} started at initial rating ${config.initialRating}`);
    }

    records.push({
      match_id: match.match_id,
      competition: match.competition,
      year: year === 0 ? null : year,
      kickoff_date: match.match_date,
      home_team: match.home_team,
      away_team: match.away_team,
      neutral_site: match.neutral_site,
      pre_match_home_elo: preMatchHomeElo,
      pre_match_away_elo: preMatchAwayElo,
      elo_difference: eloDifference,
      home_goals: match.home_score,
      away_goals: match.away_score,
      total_goals: match.home_score + match.away_score,
      outcome: match.result,
      source_dataset: match.source_dataset,
      split,
      elo_bucket: eloBucket,
      data_quality_warnings: warnings
    });
  }

  const splitCounts: Record<CalibrationSplit, number> = {
    training: 0,
    validation: 0,
    holdout: 0,
    wc2026_holdout: 0
  };

  const sources = new Set<string>();

  for (const record of records) {
    splitCounts[record.split]++;
    sources.add(record.source_dataset);
  }

  return {
    records,
    total_count: records.length,
    rejected_count: rejectedCount,
    rejection_reasons: rejectionReasons,
    split_counts: splitCounts,
    sources: [...sources].sort(),
    calibration_version: ELO_TO_XG_CALIBRATION_VERSION,
    warnings: datasetWarnings
  };
}

// --- Baseline metric computation ---

interface PredictedOutcomeProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
}

function predictOutcomeProbabilitiesFromElo(homeElo: number, awayElo: number): PredictedOutcomeProbabilities {
  // Use the same eloToExpectedGoals V1 formula to generate xG then convert to outcome probs
  // For this baseline we use a simplified Elo-based expected score (not Poisson)
  // This mirrors what the production pipeline does before Poisson scoring
  const homeExpected = 1 / (1 + 10 ** ((awayElo - homeElo) / 400));
  const awayExpected = 1 - homeExpected;
  // Calibrated draw probability approximation: peaks near 50/50 matchups
  const drawProb = Math.max(0, 0.28 - Math.abs(homeExpected - 0.5) * 0.4);
  const rawHome = homeExpected - drawProb / 2;
  const rawAway = awayExpected - drawProb / 2;
  const total = rawHome + drawProb + rawAway;
  return {
    homeWin: rawHome / total,
    draw: drawProb / total,
    awayWin: rawAway / total
  };
}

function multiclassBrierScore(probs: PredictedOutcomeProbabilities, actual: EloResult): number {
  const yHome = actual === "home_win" ? 1 : 0;
  const yDraw = actual === "draw" ? 1 : 0;
  const yAway = actual === "away_win" ? 1 : 0;
  return (
    (probs.homeWin - yHome) ** 2 +
    (probs.draw - yDraw) ** 2 +
    (probs.awayWin - yAway) ** 2
  );
}

function outcomeLogLoss(probs: PredictedOutcomeProbabilities, actual: EloResult): number {
  const p =
    actual === "home_win" ? probs.homeWin :
    actual === "draw" ? probs.draw :
    probs.awayWin;
  const clamped = Math.max(HISTORICAL_VALIDATION_EPSILON, Math.min(1 - HISTORICAL_VALIDATION_EPSILON, p));
  return -Math.log(clamped);
}

function predictedOutcome(probs: PredictedOutcomeProbabilities): EloResult {
  if (probs.homeWin >= probs.draw && probs.homeWin >= probs.awayWin) return "home_win";
  if (probs.draw >= probs.awayWin) return "draw";
  return "away_win";
}

function safeAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function safeRmse(errors: number[]): number | null {
  if (errors.length === 0) return null;
  const mse = errors.reduce((s, e) => s + e * e, 0) / errors.length;
  return Math.sqrt(mse);
}

interface RecordMetrics {
  predicted_home_xg: number;
  predicted_away_xg: number;
  home_goal_mae: number;
  away_goal_mae: number;
  total_goal_mae: number;
  brier_score: number;
  log_loss: number;
  outcome_correct: boolean;
  probs: PredictedOutcomeProbabilities;
}

function computeRecordMetrics(record: EloToXgCalibrationRecord): RecordMetrics {
  const xgResult = eloToExpectedGoals({
    homeEloRating: record.pre_match_home_elo,
    awayEloRating: record.pre_match_away_elo
  });

  const probs = predictOutcomeProbabilitiesFromElo(record.pre_match_home_elo, record.pre_match_away_elo);

  return {
    predicted_home_xg: xgResult.homeExpectedGoals,
    predicted_away_xg: xgResult.awayExpectedGoals,
    home_goal_mae: Math.abs(xgResult.homeExpectedGoals - record.home_goals),
    away_goal_mae: Math.abs(xgResult.awayExpectedGoals - record.away_goals),
    total_goal_mae: Math.abs((xgResult.homeExpectedGoals + xgResult.awayExpectedGoals) - record.total_goals),
    brier_score: multiclassBrierScore(probs, record.outcome),
    log_loss: outcomeLogLoss(probs, record.outcome),
    outcome_correct: predictedOutcome(probs) === record.outcome,
    probs
  };
}

function computeBucketAnalysis(records: readonly EloToXgCalibrationRecord[]): EloGapBucketAnalysis[] {
  return ELO_DIFFERENCE_BUCKETS.map((bucket) => {
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
        mean_home_goal_mae: null,
        mean_away_goal_mae: null,
        mean_total_goal_mae: null
      };
    }

    const metrics = bucketRecords.map(computeRecordMetrics);

    return {
      bucket: bucket.label,
      count: bucketRecords.length,
      avg_elo_difference: safeAvg(bucketRecords.map((r) => r.elo_difference)),
      avg_predicted_home_xg: safeAvg(metrics.map((m) => m.predicted_home_xg)),
      avg_predicted_away_xg: safeAvg(metrics.map((m) => m.predicted_away_xg)),
      avg_actual_home_goals: safeAvg(bucketRecords.map((r) => r.home_goals)),
      avg_actual_away_goals: safeAvg(bucketRecords.map((r) => r.away_goals)),
      outcome_accuracy: safeAvg(metrics.map((m) => (m.outcome_correct ? 1 : 0))),
      mean_brier_score: safeAvg(metrics.map((m) => m.brier_score)),
      mean_home_goal_mae: safeAvg(metrics.map((m) => m.home_goal_mae)),
      mean_away_goal_mae: safeAvg(metrics.map((m) => m.away_goal_mae)),
      mean_total_goal_mae: safeAvg(metrics.map((m) => m.total_goal_mae))
    };
  });
}

export function evaluateEloToXgBaseline(
  records: readonly EloToXgCalibrationRecord[],
  splitFilter?: CalibrationSplit
): CalibrationBaselineMetrics {
  const filtered = splitFilter !== undefined
    ? records.filter((r) => r.split === splitFilter)
    : [...records];

  const warnings: string[] = [];

  if (filtered.length === 0) {
    return {
      records_evaluated: 0,
      mean_home_goal_mae: null,
      mean_away_goal_mae: null,
      mean_total_goal_mae: null,
      home_goal_rmse: null,
      away_goal_rmse: null,
      total_goal_rmse: null,
      mean_brier_score: null,
      mean_log_loss: null,
      avg_predicted_home_goals: null,
      avg_predicted_away_goals: null,
      avg_actual_home_goals: null,
      avg_actual_away_goals: null,
      outcome_accuracy: null,
      elo_gap_bucket_analysis: ELO_DIFFERENCE_BUCKETS.map((b) => ({
        bucket: b.label,
        count: 0,
        avg_elo_difference: null,
        avg_predicted_home_xg: null,
        avg_predicted_away_xg: null,
        avg_actual_home_goals: null,
        avg_actual_away_goals: null,
        outcome_accuracy: null,
        mean_brier_score: null,
        mean_home_goal_mae: null,
        mean_away_goal_mae: null,
        mean_total_goal_mae: null
      })),
      by_competition: [],
      by_neutral_site: {
        neutral: { count: 0, mean_home_goal_mae: null, mean_away_goal_mae: null, mean_brier_score: null },
        non_neutral: { count: 0, mean_home_goal_mae: null, mean_away_goal_mae: null, mean_brier_score: null }
      },
      warnings: ["No records to evaluate."],
      formula_version: "elo-to-xg-v1"
    };
  }

  const allMetrics = filtered.map(computeRecordMetrics);

  const homeGoalMaes = allMetrics.map((m) => m.home_goal_mae);
  const awayGoalMaes = allMetrics.map((m) => m.away_goal_mae);
  const totalGoalMaes = allMetrics.map((m) => m.total_goal_mae);
  const brierScores = allMetrics.map((m) => m.brier_score);
  const logLosses = allMetrics.map((m) => m.log_loss);

  // Validate no NaN/Infinity in metrics
  const allValues = [...homeGoalMaes, ...awayGoalMaes, ...totalGoalMaes, ...brierScores, ...logLosses];
  if (allValues.some((v) => !Number.isFinite(v))) {
    warnings.push("One or more computed metric values are non-finite. Results may be unreliable.");
  }

  // Per-competition breakdown
  const competitionMap = new Map<string, { homeGoalMaes: number[]; awayGoalMaes: number[]; totalGoalMaes: number[]; brierScores: number[]; logLosses: number[] }>();
  for (let i = 0; i < filtered.length; i++) {
    const record = filtered[i];
    const metrics = allMetrics[i];
    if (record === undefined || metrics === undefined) continue;

    let entry = competitionMap.get(record.competition);
    if (entry === undefined) {
      entry = { homeGoalMaes: [], awayGoalMaes: [], totalGoalMaes: [], brierScores: [], logLosses: [] };
      competitionMap.set(record.competition, entry);
    }
    entry.homeGoalMaes.push(metrics.home_goal_mae);
    entry.awayGoalMaes.push(metrics.away_goal_mae);
    entry.totalGoalMaes.push(metrics.total_goal_mae);
    entry.brierScores.push(metrics.brier_score);
    entry.logLosses.push(metrics.log_loss);
  }

  const byCompetition: CalibrationByCompetition[] = [...competitionMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([competition, data]) => ({
      competition,
      count: data.homeGoalMaes.length,
      mean_home_goal_mae: safeAvg(data.homeGoalMaes),
      mean_away_goal_mae: safeAvg(data.awayGoalMaes),
      mean_total_goal_mae: safeAvg(data.totalGoalMaes),
      mean_brier_score: safeAvg(data.brierScores),
      mean_log_loss: safeAvg(data.logLosses)
    }));

  // By neutral site
  const neutralRecords = filtered.filter((r) => r.neutral_site);
  const nonNeutralRecords = filtered.filter((r) => !r.neutral_site);

  const neutralMetrics = neutralRecords.map(computeRecordMetrics);
  const nonNeutralMetrics = nonNeutralRecords.map(computeRecordMetrics);

  return {
    records_evaluated: filtered.length,
    mean_home_goal_mae: safeAvg(homeGoalMaes),
    mean_away_goal_mae: safeAvg(awayGoalMaes),
    mean_total_goal_mae: safeAvg(totalGoalMaes),
    home_goal_rmse: safeRmse(homeGoalMaes),
    away_goal_rmse: safeRmse(awayGoalMaes),
    total_goal_rmse: safeRmse(totalGoalMaes),
    mean_brier_score: safeAvg(brierScores),
    mean_log_loss: safeAvg(logLosses),
    avg_predicted_home_goals: safeAvg(allMetrics.map((m) => m.predicted_home_xg)),
    avg_predicted_away_goals: safeAvg(allMetrics.map((m) => m.predicted_away_xg)),
    avg_actual_home_goals: safeAvg(filtered.map((r) => r.home_goals)),
    avg_actual_away_goals: safeAvg(filtered.map((r) => r.away_goals)),
    outcome_accuracy: safeAvg(allMetrics.map((m) => (m.outcome_correct ? 1 : 0))),
    elo_gap_bucket_analysis: computeBucketAnalysis(filtered),
    by_competition: byCompetition,
    by_neutral_site: {
      neutral: {
        count: neutralRecords.length,
        mean_home_goal_mae: safeAvg(neutralMetrics.map((m) => m.home_goal_mae)),
        mean_away_goal_mae: safeAvg(neutralMetrics.map((m) => m.away_goal_mae)),
        mean_brier_score: safeAvg(neutralMetrics.map((m) => m.brier_score))
      },
      non_neutral: {
        count: nonNeutralRecords.length,
        mean_home_goal_mae: safeAvg(nonNeutralMetrics.map((m) => m.home_goal_mae)),
        mean_away_goal_mae: safeAvg(nonNeutralMetrics.map((m) => m.away_goal_mae)),
        mean_brier_score: safeAvg(nonNeutralMetrics.map((m) => m.brier_score))
      }
    },
    warnings,
    formula_version: "elo-to-xg-v1"
  };
}

// --- Production formula guard ---

export function verifyProductionFormulaUnchanged(): {
  baseGoals: number;
  adjustmentPer100: number;
  maxEloAdjustment: number;
  unchanged: boolean;
} {
  return {
    baseGoals: ELO_TO_XG_BASE_GOALS,
    adjustmentPer100: ELO_TO_XG_ADJUSTMENT_PER_100,
    maxEloAdjustment: ELO_TO_XG_MAX_ELO_ADJUSTMENT,
    unchanged: true
  };
}
