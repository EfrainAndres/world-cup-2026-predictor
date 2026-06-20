/**
 * Phase 12.11C integration test.
 *
 * Loads the V1 baseline artifact, loads real fixture files, builds the
 * calibration dataset, runs the V2 steeper-linear candidate evaluation,
 * validates invariants, and writes the structured summary artifact to
 * docs/model-results/artifacts/elo-to-xg-v2-steeper-linear-candidate-summary.json.
 *
 * Run with: pnpm --filter @world-cup-2026-predictor/model calibration:v2-candidate
 * Or as part of the full test suite: pnpm --filter @world-cup-2026-predictor/model test
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  V2_STEEPER_LINEAR_CANDIDATES,
  runV2CandidateEvaluation
} from "../src/elo-to-xg-v2-candidate.js";
import { buildEloToXgCalibrationDataset } from "../src/index.js";
import type { CalibrationMatchInput } from "../src/index.js";
import type { V2CandidateRecord, V2BaselineReference } from "../src/elo-to-xg-v2-candidate.js";
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

// --- Fixture loading ---

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

// --- Baseline artifact loading ---

interface V1ArtifactSplits {
  training: { mean_brier_score: number | null; mean_log_loss: number | null; mean_home_goal_mae: number | null; mean_away_goal_mae: number | null; mean_total_goal_mae: number | null; outcome_accuracy: number | null };
  validation: { mean_brier_score: number | null; mean_log_loss: number | null };
  holdout: { mean_brier_score: number | null; mean_log_loss: number | null; mean_home_goal_mae: number | null; mean_away_goal_mae: number | null; mean_total_goal_mae: number | null; outcome_accuracy: number | null };
  combined_non_2026: { mean_brier_score: number | null; mean_log_loss: number | null };
}

interface V1Artifact {
  splits: V1ArtifactSplits;
}

function loadV1Baseline(): V2BaselineReference {
  const url = new URL("../../../docs/model-results/artifacts/elo-to-xg-v1-baseline-summary.json", import.meta.url);
  const raw = JSON.parse(readFileSync(url, "utf8")) as V1Artifact;
  const s = raw.splits;
  return {
    source_artifact: "elo-to-xg-v1-baseline-summary.json",
    holdout_brier_score: s.holdout.mean_brier_score!,
    holdout_log_loss: s.holdout.mean_log_loss!,
    holdout_home_goal_mae: s.holdout.mean_home_goal_mae!,
    holdout_away_goal_mae: s.holdout.mean_away_goal_mae!,
    holdout_total_goal_mae: s.holdout.mean_total_goal_mae!,
    holdout_outcome_accuracy: s.holdout.outcome_accuracy!,
    training_brier_score: s.training.mean_brier_score!,
    training_log_loss: s.training.mean_log_loss!,
    validation_brier_score: s.validation.mean_brier_score!,
    validation_log_loss: s.validation.mean_log_loss!,
    combined_non_2026_brier_score: s.combined_non_2026.mean_brier_score!,
    combined_non_2026_log_loss: s.combined_non_2026.mean_log_loss!
  };
}

// --- Build calibration records from dataset ---

function buildCandidateRecords(
  wcMatches: CalibrationMatchInput[],
  intlMatches: CalibrationMatchInput[]
): V2CandidateRecord[] {
  const dataset = buildEloToXgCalibrationDataset({
    historicalWorldCupMatches: wcMatches,
    internationalMatches: intlMatches
  });
  return dataset.records
    .filter((r) => r.split !== "wc2026_holdout")
    .map((r): V2CandidateRecord => ({
      homeElo: r.pre_match_home_elo,
      awayElo: r.pre_match_away_elo,
      homeScore: r.home_goals,
      awayScore: r.away_goals,
      result: r.outcome,
      split: r.split
    }));
}

// --- Integration tests ---

describe("elo-to-xg v2 steeper-linear candidate artifact integration", () => {
  const wc2010 = loadWcFixtureFile(2010);
  const wc2014 = loadWcFixtureFile(2014);
  const wc2018 = loadWcFixtureFile(2018);
  const wc2022 = loadWcFixtureFile(2022);
  const intlExpanded = loadExpandedIntlFixtures();
  const historicalWcMatches = [...wc2010, ...wc2014, ...wc2018, ...wc2022];

  const v1Reference = loadV1Baseline();
  const candidateRecords = buildCandidateRecords(historicalWcMatches, intlExpanded);

  it("loads V1 baseline artifact with valid reference values", () => {
    expect(Number.isFinite(v1Reference.holdout_brier_score)).toBe(true);
    expect(Number.isFinite(v1Reference.holdout_log_loss)).toBe(true);
    expect(v1Reference.holdout_brier_score).toBeGreaterThan(0);
    expect(v1Reference.holdout_log_loss).toBeGreaterThan(0);
  });

  it("builds candidate records from calibration dataset", () => {
    expect(candidateRecords.length).toBeGreaterThan(0);
  });

  it("holdout candidate records include WC2022", () => {
    const holdout = candidateRecords.filter((r) => r.split === "holdout");
    expect(holdout.length).toBeGreaterThanOrEqual(64);
  });

  it("wc2026 records are excluded from candidate records", () => {
    const wc2026 = candidateRecords.filter((r) => r.split === "wc2026_holdout");
    expect(wc2026).toHaveLength(0);
  });

  it("runs evaluation and produces report with correct candidate count", () => {
    const report = runV2CandidateEvaluation({ records: candidateRecords, v1Reference });
    expect(report.evaluations).toHaveLength(V2_STEEPER_LINEAR_CANDIDATES.length);
  });

  it("no NaN or Infinity in any split metric", () => {
    const report = runV2CandidateEvaluation({ records: candidateRecords, v1Reference });
    for (const ev of report.evaluations) {
      for (const split of Object.values(ev.splits)) {
        const nums = [
          split.mean_brier_score,
          split.mean_log_loss,
          split.mean_home_goal_mae,
          split.mean_away_goal_mae,
          split.mean_total_goal_mae,
          split.outcome_accuracy
        ];
        for (const v of nums) {
          if (v !== null) {
            expect(Number.isNaN(v), `NaN in ${split.split}`).toBe(false);
            expect(Number.isFinite(v), `Infinity in ${split.split}`).toBe(true);
          }
        }
      }
    }
  });

  it("no NaN or Infinity in any delta", () => {
    const report = runV2CandidateEvaluation({ records: candidateRecords, v1Reference });
    for (const ev of report.evaluations) {
      for (const delta of Object.values(ev.deltas)) {
        const nums = [
          delta.brier_score_delta,
          delta.log_loss_delta,
          delta.home_goal_mae_delta,
          delta.away_goal_mae_delta,
          delta.total_goal_mae_delta,
          delta.outcome_accuracy_delta
        ];
        for (const v of nums) {
          if (v !== null) {
            expect(Number.isNaN(v)).toBe(false);
            expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
  });

  it("every evaluation has a non-empty acceptance gate reason", () => {
    const report = runV2CandidateEvaluation({ records: candidateRecords, v1Reference });
    for (const ev of report.evaluations) {
      expect(ev.acceptance_gate.reason.length).toBeGreaterThan(0);
    }
  });

  it("summary counts sum to total_candidates", () => {
    const report = runV2CandidateEvaluation({ records: candidateRecords, v1Reference });
    const s = report.summary;
    expect(s.eligible_for_review + s.rejected + s.inconclusive).toBe(s.total_candidates);
  });

  it("is deterministic across two runs with real fixtures", () => {
    const input = { records: candidateRecords, v1Reference };
    const r1 = runV2CandidateEvaluation(input);
    const r2 = runV2CandidateEvaluation(input);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("generates and writes the artifact file", () => {
    const report = runV2CandidateEvaluation({ records: candidateRecords, v1Reference });

    const artifact = {
      schema_version: "1",
      candidate_version: report.candidate_version,
      v1_reference: report.v1_reference,
      candidate_set: report.candidate_set,
      evaluations: report.evaluations,
      summary: report.summary,
      limitations: report.limitations
    };

    const artifactDir = new URL("../../../docs/model-results/artifacts/", import.meta.url);
    const artifactPath = new URL(
      "elo-to-xg-v2-steeper-linear-candidate-summary.json",
      artifactDir
    );

    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");

    // Verify round-trip
    const readBack = JSON.parse(readFileSync(artifactPath, "utf8")) as typeof artifact;
    expect(readBack.schema_version).toBe("1");
    expect(readBack.candidate_version).toBe(report.candidate_version);
    expect(readBack.evaluations).toHaveLength(report.evaluations.length);
    expect(readBack.summary.total_candidates).toBe(report.summary.total_candidates);
  });
});
