import { describe, expect, it } from "vitest";
import {
  CALIBRATION_RUNNER_DEFAULT_PRESET,
  CALIBRATION_RUNNER_POISSON_MAX_GOALS,
  CALIBRATION_RUNNER_VERSION,
  COMPRESSION_GAP_NOTE,
  assertReportDeterminism,
  runEloToXgCalibrationBaselineExperiment
} from "../src/index.js";
import { buildEloToXgCalibrationDataset } from "../src/index.js";
import { ELO_TO_XG_BASE_GOALS, ELO_TO_XG_ADJUSTMENT_PER_100, ELO_TO_XG_MAX_ELO_ADJUSTMENT } from "../src/elo-to-xg.js";
import type { CalibrationMatchInput } from "../src/index.js";

// --- Shared fixtures ---

function makeMatch(overrides: Partial<CalibrationMatchInput> & { match_id: string }): CalibrationMatchInput {
  return {
    match_id: overrides.match_id,
    match_date: overrides.match_date ?? "2010-06-11",
    competition: overrides.competition ?? "FIFA World Cup 2010",
    year: overrides.year ?? 2010,
    home_team: overrides.home_team ?? "Alpha",
    away_team: overrides.away_team ?? "Beta",
    home_score: overrides.home_score ?? 1,
    away_score: overrides.away_score ?? 0,
    result: overrides.result ?? "home_win",
    neutral_site: overrides.neutral_site ?? true,
    source_dataset: overrides.source_dataset ?? "world-cup-2010-results"
  };
}

const MATCH_WC10_A = makeMatch({ match_id: "WC10-001", year: 2010 });
const MATCH_WC10_B = makeMatch({ match_id: "WC10-002", year: 2010, home_team: "Beta", away_team: "Gamma", home_score: 2, away_score: 1, result: "home_win" });
const MATCH_WC10_DRAW = makeMatch({ match_id: "WC10-003", year: 2010, home_team: "Gamma", away_team: "Alpha", home_score: 1, away_score: 1, result: "draw" });
const MATCH_WC14_A = makeMatch({ match_id: "WC14-001", match_date: "2014-06-12", competition: "FIFA World Cup 2014", year: 2014, source_dataset: "world-cup-2014-results" });
const MATCH_WC18_A = makeMatch({ match_id: "WC18-001", match_date: "2018-06-14", competition: "FIFA World Cup 2018", year: 2018, source_dataset: "world-cup-2018-results" });
const MATCH_WC18_DRAW = makeMatch({ match_id: "WC18-002", match_date: "2018-06-15", competition: "FIFA World Cup 2018", year: 2018, source_dataset: "world-cup-2018-results", home_team: "Delta", away_team: "Epsilon", home_score: 0, away_score: 0, result: "draw" });
const MATCH_WC22_A = makeMatch({ match_id: "WC22-001", match_date: "2022-11-20", competition: "FIFA World Cup 2022", year: 2022, source_dataset: "world-cup-2022-results" });
const MATCH_WC22_AWAY = makeMatch({ match_id: "WC22-002", match_date: "2022-11-21", competition: "FIFA World Cup 2022", year: 2022, source_dataset: "world-cup-2022-results", home_team: "Zeta", away_team: "Eta", home_score: 0, away_score: 2, result: "away_win" });
const MATCH_INTL_2017 = makeMatch({ match_id: "INT-2017-001", match_date: "2017-03-01", competition: "Friendly", year: 2017, source_dataset: "international-matches-expanded-v1", neutral_site: false });
const MATCH_WC26 = makeMatch({ match_id: "WC26-001", match_date: "2026-06-11", competition: "FIFA World Cup 2026", year: 2026, source_dataset: "wc2026" });

const ALL_HISTORICAL = [MATCH_WC10_A, MATCH_WC10_B, MATCH_WC10_DRAW, MATCH_WC14_A, MATCH_WC18_A, MATCH_WC18_DRAW, MATCH_WC22_A, MATCH_WC22_AWAY];

// --- Tests ---

describe("runEloToXgCalibrationBaselineExperiment", () => {
  it("runs without error on minimal input", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    expect(report).toBeDefined();
    expect(report.formula).toBeDefined();
    expect(report.splits).toBeDefined();
    expect(report.elo_gap_buckets).toBeDefined();
  });

  it("returns correct formula snapshot with production constants", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    expect(report.formula.base_goals).toBe(ELO_TO_XG_BASE_GOALS);
    expect(report.formula.adjustment_per_100).toBe(ELO_TO_XG_ADJUSTMENT_PER_100);
    expect(report.formula.max_elo_adjustment).toBe(ELO_TO_XG_MAX_ELO_ADJUSTMENT);
    expect(report.formula.preset_used).toBe(CALIBRATION_RUNNER_DEFAULT_PRESET);
    expect(report.formula.runner_version).toBe(CALIBRATION_RUNNER_VERSION);
  });

  it("uses the balanced preset as default", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    expect(report.formula.preset_used).toBe("balanced");
  });

  it("includes Poisson path in prediction_path description", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    expect(report.formula.prediction_path).toContain("Poisson");
    expect(report.formula.prediction_path).toContain(`maxGoals=${CALIBRATION_RUNNER_POISSON_MAX_GOALS}`);
  });

  it("evaluates all four named splits independently", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: [],
      wc2026CompletedMatches: [MATCH_WC26]
    });

    expect(report.splits.training.split).toBe("training");
    expect(report.splits.validation.split).toBe("validation");
    expect(report.splits.holdout.split).toBe("holdout");
    expect(report.splits.wc2026_holdout.split).toBe("wc2026_holdout");
    expect(report.splits.combined_non_2026.split).toBe("combined_non_2026");
  });

  it("combined_non_2026 excludes WC2026 records", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: [],
      wc2026CompletedMatches: [MATCH_WC26]
    });

    const wc2026Count = report.splits.wc2026_holdout.records_evaluated;
    const nonWc2026Count = report.splits.combined_non_2026.records_evaluated;
    const totalCount = report.dataset.total_count;

    expect(wc2026Count + nonWc2026Count).toBe(totalCount);
  });

  it("returns null metrics (not NaN) for empty splits", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    // WC2026 holdout has no records since we didn't supply any
    const wc2026Split = report.splits.wc2026_holdout;
    expect(wc2026Split.records_evaluated).toBe(0);
    expect(wc2026Split.mean_brier_score).toBeNull();
    expect(wc2026Split.mean_log_loss).toBeNull();
    expect(wc2026Split.outcome_accuracy).toBeNull();
  });

  it("produces finite metrics for non-empty splits", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A, MATCH_WC18_A, MATCH_WC22_A],
      internationalMatches: [MATCH_INTL_2017]
    });

    for (const splitKey of ["training", "validation", "holdout", "combined_non_2026"] as const) {
      const split = report.splits[splitKey];
      if (split.records_evaluated === 0) continue;

      const numericFields = [
        split.mean_home_goal_mae,
        split.mean_away_goal_mae,
        split.mean_total_goal_mae,
        split.mean_brier_score,
        split.mean_log_loss,
        split.outcome_accuracy
      ];

      for (const v of numericFields) {
        if (v !== null) {
          expect(Number.isNaN(v)).toBe(false);
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it("validates probability sums are close to 1.0", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A, MATCH_WC22_A],
      internationalMatches: []
    });

    expect(report.splits.training.probability_sum_valid).toBe(true);
    expect(report.splits.holdout.probability_sum_valid).toBe(true);
    expect(report.splits.combined_non_2026.probability_sum_valid).toBe(true);
  });

  it("WC2026 records are isolated in wc2026_holdout split", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: [],
      wc2026CompletedMatches: [MATCH_WC26]
    });

    // WC2026 warning should not appear in report warnings (isolation is preserved)
    const hasViolation = report.warnings.some((w) => w.includes("INVARIANT VIOLATION") && w.includes("WC2026"));
    expect(hasViolation).toBe(false);

    expect(report.splits.wc2026_holdout.records_evaluated).toBe(1);
    // Combined_non_2026 should not include the WC2026 match
    expect(report.splits.combined_non_2026.records_evaluated).toBe(1); // only WC10_A
  });

  it("produces 7 bucket entries in elo_gap_buckets", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: []
    });

    expect(report.elo_gap_buckets).toHaveLength(7);
  });

  it("compression_gap is null for empty buckets", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A], // only near-equal elo → middle bucket
      internationalMatches: []
    });

    const outerBuckets = report.elo_gap_buckets.filter((b) => b.bucket === "<= -300" || b.bucket === ">= 300");
    for (const bucket of outerBuckets) {
      if (bucket.count === 0) {
        expect(bucket.compression_gap).toBeNull();
        expect(bucket.predicted_favorite_win_probability).toBeNull();
        expect(bucket.actual_favorite_win_frequency).toBeNull();
      }
    }
  });

  it("compression_gap is a finite number for non-empty buckets", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: []
    });

    const nonEmptyBuckets = report.elo_gap_buckets.filter((b) => b.count > 0);
    for (const bucket of nonEmptyBuckets) {
      if (bucket.compression_gap !== null) {
        expect(Number.isFinite(bucket.compression_gap)).toBe(true);
      }
    }
  });

  it("compression_gap sign convention: positive means under-prediction", () => {
    // COMPRESSION_GAP_NOTE documents: positive = actual freq > predicted prob (model under-predicts)
    expect(COMPRESSION_GAP_NOTE).toContain("actualFavoriteWinFrequency - predictedFavoriteWinProbability");
    expect(COMPRESSION_GAP_NOTE).toContain("Positive value means the model under-predicts");
  });

  it("includes by_competition breakdown with correct competition names", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: [MATCH_INTL_2017]
    });

    const compNames = report.by_competition.map((c) => c.competition);
    expect(compNames).toContain("FIFA World Cup 2010");
    expect(compNames).toContain("FIFA World Cup 2014");
    expect(compNames).toContain("Friendly");
  });

  it("by_neutral_site counts sum to total non-WC2026 records", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: [MATCH_INTL_2017]
    });

    const totalNonWc2026 = report.splits.combined_non_2026.records_evaluated;
    const neutralTotal =
      report.by_neutral_site.neutral.count + report.by_neutral_site.non_neutral.count;
    expect(neutralTotal).toBe(totalNonWc2026);
  });

  it("by_source breakdown includes all sources", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: [MATCH_INTL_2017],
      wc2026CompletedMatches: [MATCH_WC26]
    });

    const sources = report.by_source.map((s) => s.source_dataset);
    expect(sources).toContain("world-cup-2010-results");
    expect(sources).toContain("world-cup-2014-results");
    expect(sources).toContain("international-matches-expanded-v1");
    expect(sources).toContain("wc2026");
  });

  it("accepts a pre-built dataset to avoid rebuilding", () => {
    const preBuilt = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: []
    });

    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [],
      internationalMatches: [],
      preBuiltDataset: preBuilt
    });

    expect(report.dataset.total_count).toBe(2);
  });

  it("includes limitations array with at least 5 entries", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    expect(report.limitations.length).toBeGreaterThanOrEqual(5);
    for (const s of report.limitations) {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic — repeated runs produce identical JSON", () => {
    const input = {
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: [MATCH_INTL_2017],
      wc2026CompletedMatches: [MATCH_WC26]
    };

    const first = runEloToXgCalibrationBaselineExperiment(input);
    const second = runEloToXgCalibrationBaselineExperiment(input);

    expect(assertReportDeterminism(first, second)).toBe(true);
  });

  it("different inputs produce different reports", () => {
    const reportA = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    const reportB = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: []
    });

    expect(assertReportDeterminism(reportA, reportB)).toBe(false);
  });

  it("brier scores are bounded between 0 and 2 for all records", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: [MATCH_INTL_2017]
    });

    const splitValues = [
      report.splits.training.mean_brier_score,
      report.splits.validation.mean_brier_score,
      report.splits.holdout.mean_brier_score
    ];

    for (const v of splitValues) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(2);
      }
    }
  });

  it("log loss is positive for all splits", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: []
    });

    for (const v of [
      report.splits.training.mean_log_loss,
      report.splits.validation.mean_log_loss,
      report.splits.holdout.mean_log_loss
    ]) {
      if (v !== null) {
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it("V2 production constants are set correctly", () => {
    expect(ELO_TO_XG_BASE_GOALS).toBe(1.25);
    expect(ELO_TO_XG_ADJUSTMENT_PER_100).toBe(0.15);
    expect(ELO_TO_XG_MAX_ELO_ADJUSTMENT).toBe(0.65);
  });

  it("handles draws correctly in outcome accuracy", () => {
    // Include a draw match — outcome_correct should fire when model predicts draw
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC10_DRAW],
      internationalMatches: []
    });

    // outcome_accuracy should be a valid number between 0 and 1
    const acc = report.splits.training.outcome_accuracy;
    if (acc !== null) {
      expect(acc).toBeGreaterThanOrEqual(0);
      expect(acc).toBeLessThanOrEqual(1);
    }
  });

  it("split counts in dataset summary match split record counts", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: ALL_HISTORICAL,
      internationalMatches: [MATCH_INTL_2017],
      wc2026CompletedMatches: [MATCH_WC26]
    });

    expect(report.dataset.split_counts.training).toBe(report.splits.training.records_evaluated);
    expect(report.dataset.split_counts.validation).toBe(report.splits.validation.records_evaluated);
    expect(report.dataset.split_counts.holdout).toBe(report.splits.holdout.records_evaluated);
    expect(report.dataset.split_counts.wc2026_holdout).toBe(report.splits.wc2026_holdout.records_evaluated);
  });
});

describe("assertReportDeterminism", () => {
  it("returns true for identical reports", () => {
    const input = { historicalWorldCupMatches: [MATCH_WC10_A], internationalMatches: [] };
    const a = runEloToXgCalibrationBaselineExperiment(input);
    const b = runEloToXgCalibrationBaselineExperiment(input);
    expect(assertReportDeterminism(a, b)).toBe(true);
  });

  it("returns false for different reports", () => {
    const a = runEloToXgCalibrationBaselineExperiment({ historicalWorldCupMatches: [MATCH_WC10_A], internationalMatches: [] });
    const b = runEloToXgCalibrationBaselineExperiment({ historicalWorldCupMatches: [MATCH_WC14_A], internationalMatches: [] });
    expect(assertReportDeterminism(a, b)).toBe(false);
  });
});
