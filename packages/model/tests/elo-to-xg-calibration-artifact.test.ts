/**
 * Calibration experiment runner integration test.
 *
 * Loads actual historical fixture files, runs the V2 baseline experiment,
 * validates all invariants, and writes the structured summary artifact to
 * docs/model-results/artifacts/elo-to-xg-v2-baseline-summary.json.
 *
 * The V1 baseline artifact (elo-to-xg-v1-baseline-summary.json) is a historical
 * snapshot and is no longer regenerated here after V2 promotion in Phase 12.11E.
 *
 * Run with: pnpm --filter @world-cup-2026-predictor/model calibration:baseline
 * Or as part of the full test suite: pnpm --filter @world-cup-2026-predictor/model test
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertReportDeterminism,
  runEloToXgCalibrationBaselineExperiment
} from "../src/index.js";
import type { CalibrationMatchInput } from "../src/index.js";
import type { EloResult } from "../src/index.js";

// --- Raw fixture file shapes ---

interface RawWcMatch {
  match_id: string;
  tournament_year: number;
  stage: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: EloResult;
  neutral_site: boolean;
}

interface RawIntlMatch {
  match_id: string;
  match_date: string;
  competition: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: EloResult;
  neutral_site: boolean;
}

interface RawWcFile {
  dataset_id: string;
  matches: RawWcMatch[];
}

interface RawIntlFile {
  dataset_id: string;
  matches: RawIntlMatch[];
}

// --- Fixture loading helpers ---

function loadWcFixtureFile(year: number): CalibrationMatchInput[] {
  const url = new URL(`../../data/fixtures/world-cup/world-cup-${year}-results.json`, import.meta.url);
  const raw = JSON.parse(readFileSync(url, "utf8")) as RawWcFile;

  return raw.matches.map((m): CalibrationMatchInput => ({
    match_id: m.match_id,
    match_date: m.match_date,
    competition: `FIFA World Cup ${m.tournament_year}`,
    year: m.tournament_year,
    home_team: m.home_team,
    away_team: m.away_team,
    home_score: m.home_score,
    away_score: m.away_score,
    result: m.result,
    neutral_site: m.neutral_site,
    source_dataset: `world-cup-${year}-results`
  }));
}

function loadExpandedIntlFixtures(): CalibrationMatchInput[] {
  const url = new URL(
    "../../data/fixtures/international/expanded-international-matches.json",
    import.meta.url
  );
  const raw = JSON.parse(readFileSync(url, "utf8")) as RawIntlFile;

  return raw.matches.map((m): CalibrationMatchInput => ({
    match_id: m.match_id,
    match_date: m.match_date,
    competition: m.competition,
    home_team: m.home_team,
    away_team: m.away_team,
    home_score: m.home_score,
    away_score: m.away_score,
    result: m.result,
    neutral_site: m.neutral_site,
    source_dataset: raw.dataset_id
  }));
}

// --- Integration tests ---

describe("elo-to-xg calibration artifact integration", () => {
  const wc2010 = loadWcFixtureFile(2010);
  const wc2014 = loadWcFixtureFile(2014);
  const wc2018 = loadWcFixtureFile(2018);
  const wc2022 = loadWcFixtureFile(2022);
  const intlExpanded = loadExpandedIntlFixtures();

  const historicalWcMatches = [...wc2010, ...wc2014, ...wc2018, ...wc2022];

  it("loads all four WC fixture files with correct counts", () => {
    expect(wc2010).toHaveLength(64);
    expect(wc2014).toHaveLength(64);
    expect(wc2018).toHaveLength(64);
    expect(wc2022).toHaveLength(64);
  });

  it("loads expanded international fixtures", () => {
    expect(intlExpanded.length).toBeGreaterThan(0);
  });

  it("runs experiment and produces a report", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    expect(report.dataset.total_count).toBeGreaterThan(0);
    expect(report.splits.training.records_evaluated).toBeGreaterThan(0);
    expect(report.splits.validation.records_evaluated).toBeGreaterThan(0);
    expect(report.splits.holdout.records_evaluated).toBeGreaterThan(0);
  });

  it("training split contains WC2010 and WC2014 matches", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    expect(report.splits.training.records_evaluated).toBeGreaterThanOrEqual(128); // 64 + 64 WC
  });

  it("holdout split contains WC2022 matches", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    expect(report.splits.holdout.records_evaluated).toBeGreaterThanOrEqual(64); // WC2022
  });

  it("probability sums are valid for all splits", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    for (const split of [report.splits.training, report.splits.validation, report.splits.holdout]) {
      if (split.records_evaluated > 0) {
        expect(split.probability_sum_valid).toBe(true);
      }
    }
  });

  it("no NaN or Infinity in any split metric", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    for (const split of Object.values(report.splits)) {
      const nums = [
        split.mean_home_goal_mae,
        split.mean_away_goal_mae,
        split.mean_total_goal_mae,
        split.home_goal_rmse,
        split.away_goal_rmse,
        split.total_goal_rmse,
        split.mean_brier_score,
        split.mean_log_loss,
        split.outcome_accuracy
      ];
      for (const v of nums) {
        if (v !== null) {
          expect(Number.isNaN(v)).toBe(false);
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it("no NaN or Infinity in bucket compression metrics", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    for (const bucket of report.elo_gap_buckets) {
      const nums = [
        bucket.avg_elo_difference,
        bucket.avg_predicted_home_xg,
        bucket.avg_predicted_away_xg,
        bucket.avg_actual_home_goals,
        bucket.avg_actual_away_goals,
        bucket.outcome_accuracy,
        bucket.mean_brier_score,
        bucket.mean_log_loss,
        bucket.compression_gap,
        bucket.predicted_favorite_win_probability,
        bucket.actual_favorite_win_frequency
      ];
      for (const v of nums) {
        if (v !== null) {
          expect(Number.isNaN(v)).toBe(false);
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it("no INVARIANT VIOLATION warnings in report", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    const violations = report.warnings.filter((w) => w.includes("INVARIANT VIOLATION"));
    expect(violations).toHaveLength(0);
  });

  it("is deterministic across two runs with real fixtures", () => {
    const input = {
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    };

    const first = runEloToXgCalibrationBaselineExperiment(input);
    const second = runEloToXgCalibrationBaselineExperiment(input);

    expect(assertReportDeterminism(first, second)).toBe(true);
  });

  it("generates and writes the artifact file", () => {
    const report = runEloToXgCalibrationBaselineExperiment({
      historicalWorldCupMatches: historicalWcMatches,
      internationalMatches: intlExpanded
    });

    // Build the artifact — deterministic, no clock-based timestamps
    const artifact = {
      schema_version: "1",
      formula_version: report.formula.runner_version,
      calibration_version: report.formula.calibration_version,
      preset: report.formula.preset_used,
      production_constants: {
        base_goals: report.formula.base_goals,
        adjustment_per_100: report.formula.adjustment_per_100,
        max_elo_adjustment: report.formula.max_elo_adjustment
      },
      prediction_path: report.formula.prediction_path,
      dataset: report.dataset,
      splits: report.splits,
      elo_gap_buckets: report.elo_gap_buckets,
      by_competition: report.by_competition,
      by_neutral_site: report.by_neutral_site,
      by_source: report.by_source,
      limitations: report.limitations,
      warnings: report.warnings
    };

    const artifactDir = new URL("../../../docs/model-results/artifacts/", import.meta.url);
    const artifactPath = new URL("elo-to-xg-v2-baseline-summary.json", artifactDir);

    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");

    // Verify the artifact can be re-read and parsed
    const readBack = JSON.parse(readFileSync(artifactPath, "utf8")) as typeof artifact;
    expect(readBack.schema_version).toBe("1");
    expect(readBack.formula_version).toBe(report.formula.runner_version);
    expect(readBack.dataset.total_count).toBe(report.dataset.total_count);
    expect(readBack.splits.training.records_evaluated).toBe(report.splits.training.records_evaluated);
  });
});
