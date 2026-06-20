import { describe, expect, it } from "vitest";
import {
  V2_CANDIDATE_V1_ADJUSTMENT_PER_100,
  V2_CANDIDATE_V1_MAX_ELO_ADJUSTMENT,
  V2_CANDIDATE_V1_BASE_GOALS,
  V2_STEEPER_LINEAR_CANDIDATES,
  v2SteepLinearXg,
  runV2CandidateEvaluation
} from "../src/elo-to-xg-v2-candidate.js";
import {
  ELO_TO_XG_ADJUSTMENT_PER_100,
  ELO_TO_XG_MAX_ELO_ADJUSTMENT,
  ELO_TO_XG_BASE_GOALS
} from "../src/index.js";
import type { V2CandidateRecord, V2BaselineReference } from "../src/elo-to-xg-v2-candidate.js";

// --- Helpers ---

const DUMMY_BASELINE: V2BaselineReference = {
  source_artifact: "test",
  holdout_brier_score: 0.6321909388786933,
  holdout_log_loss: 1.0479966522393562,
  holdout_home_goal_mae: 1.1350000000000002,
  holdout_away_goal_mae: 0.8605000000000004,
  holdout_total_goal_mae: 1.4416666666666667,
  holdout_outcome_accuracy: 0.525,
  training_brier_score: 0.6451623337654311,
  training_log_loss: 1.0662929548992306,
  validation_brier_score: 0.6441,
  validation_log_loss: 1.0639,
  combined_non_2026_brier_score: 0.6399,
  combined_non_2026_log_loss: 1.0588
};

function makeRecord(
  homeElo: number,
  awayElo: number,
  homeScore: number,
  awayScore: number,
  result: "home_win" | "draw" | "away_win",
  split: string = "holdout"
): V2CandidateRecord {
  return { homeElo, awayElo, homeScore, awayScore, result, split };
}

// --- Candidate parameter set ---

describe("V2_STEEPER_LINEAR_CANDIDATES", () => {
  it("contains exactly 3 candidates", () => {
    expect(V2_STEEPER_LINEAR_CANDIDATES).toHaveLength(3);
  });

  it("all candidates have steeper adjustmentPer100 than V1", () => {
    for (const c of V2_STEEPER_LINEAR_CANDIDATES) {
      expect(c.adjustmentPer100).toBeGreaterThan(V2_CANDIDATE_V1_ADJUSTMENT_PER_100);
    }
  });

  it("all candidates have larger maxAdjustment than V1", () => {
    for (const c of V2_STEEPER_LINEAR_CANDIDATES) {
      expect(c.maxAdjustment).toBeGreaterThan(V2_CANDIDATE_V1_MAX_ELO_ADJUSTMENT);
    }
  });

  it("candidates are ordered by increasing steepness", () => {
    for (let i = 1; i < V2_STEEPER_LINEAR_CANDIDATES.length; i++) {
      const curr = V2_STEEPER_LINEAR_CANDIDATES[i]!;
      const prev = V2_STEEPER_LINEAR_CANDIDATES[i - 1]!;
      expect(curr.adjustmentPer100).toBeGreaterThan(prev.adjustmentPer100);
    }
  });

  it("all candidates have unique labels", () => {
    const labels = V2_STEEPER_LINEAR_CANDIDATES.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// --- V1 reference constants unchanged ---

describe("V1 reference constants", () => {
  it("V2_CANDIDATE_V1_ADJUSTMENT_PER_100 matches production", () => {
    expect(V2_CANDIDATE_V1_ADJUSTMENT_PER_100).toBe(ELO_TO_XG_ADJUSTMENT_PER_100);
  });

  it("V2_CANDIDATE_V1_MAX_ELO_ADJUSTMENT matches production", () => {
    expect(V2_CANDIDATE_V1_MAX_ELO_ADJUSTMENT).toBe(ELO_TO_XG_MAX_ELO_ADJUSTMENT);
  });

  it("V2_CANDIDATE_V1_BASE_GOALS matches production", () => {
    expect(V2_CANDIDATE_V1_BASE_GOALS).toBe(ELO_TO_XG_BASE_GOALS);
  });
});

// --- v2SteepLinearXg symmetry and bounds ---

describe("v2SteepLinearXg", () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const params = V2_STEEPER_LINEAR_CANDIDATES[1]!; // 0.15 / 0.65

  it("equal Elo produces symmetric xG equal to base", () => {
    const { homeXg, awayXg } = v2SteepLinearXg(1500, 1500, params);
    expect(homeXg).toBeCloseTo(1.25, 5);
    expect(awayXg).toBeCloseTo(1.25, 5);
    expect(homeXg).toBe(awayXg);
  });

  it("home advantage (positive eloDiff) raises home xG and lowers away xG", () => {
    const { homeXg, awayXg } = v2SteepLinearXg(1600, 1500, params);
    expect(homeXg).toBeGreaterThan(1.25);
    expect(awayXg).toBeLessThan(1.25);
  });

  it("is symmetric: swapping teams negates the xG adjustment", () => {
    const r1 = v2SteepLinearXg(1600, 1400, params);
    const r2 = v2SteepLinearXg(1400, 1600, params);
    expect(r1.homeXg).toBeCloseTo(r2.awayXg, 5);
    expect(r1.awayXg).toBeCloseTo(r2.homeXg, 5);
  });

  it("xG values are always within [0.2, 4.0]", () => {
    const cases = [
      [2000, 1000],
      [1000, 2000],
      [1500, 1500],
      [1800, 1800],
      [1200, 1900]
    ] as const;
    for (const [h, a] of cases) {
      const { homeXg, awayXg } = v2SteepLinearXg(h, a, params);
      expect(homeXg).toBeGreaterThanOrEqual(0.2);
      expect(homeXg).toBeLessThanOrEqual(4.0);
      expect(awayXg).toBeGreaterThanOrEqual(0.2);
      expect(awayXg).toBeLessThanOrEqual(4.0);
    }
  });

  it("produces finite numbers — no NaN or Infinity", () => {
    const { homeXg, awayXg } = v2SteepLinearXg(1750, 1400, params);
    expect(Number.isFinite(homeXg)).toBe(true);
    expect(Number.isFinite(awayXg)).toBe(true);
  });

  it("is deterministic — repeated calls produce identical results", () => {
    const r1 = v2SteepLinearXg(1650, 1450, params);
    const r2 = v2SteepLinearXg(1650, 1450, params);
    expect(r1).toEqual(r2);
  });

  it("steeper candidate produces larger xG spread than V1 at the same Elo gap", () => {
    const v1Params = { adjustmentPer100: V2_CANDIDATE_V1_ADJUSTMENT_PER_100, maxAdjustment: V2_CANDIDATE_V1_MAX_ELO_ADJUSTMENT, label: "v1" };
    const v1 = v2SteepLinearXg(1600, 1400, v1Params);
    const v2 = v2SteepLinearXg(1600, 1400, params);
    const v1Spread = Math.abs(v1.homeXg - v1.awayXg);
    const v2Spread = Math.abs(v2.homeXg - v2.awayXg);
    expect(v2Spread).toBeGreaterThan(v1Spread);
  });

  it("large Elo gap saturates at maxAdjustment", () => {
    // 500 Elo gap * 0.15 per 100 = 0.75 raw, but maxAdjustment = 0.65
    const { homeXg, awayXg } = v2SteepLinearXg(2000, 1500, params);
    // adj = roundToTwo(clamp(0.75, -0.65, 0.65)) = roundToTwo(0.65) = 0.65
    expect(homeXg).toBeCloseTo(1.25 + 0.65, 5);
    expect(awayXg).toBeCloseTo(1.25 - 0.65, 5);
  });
});

// --- runV2CandidateEvaluation ---

describe("runV2CandidateEvaluation", () => {
  const records: V2CandidateRecord[] = [
    makeRecord(1550, 1450, 2, 1, "home_win", "training"),
    makeRecord(1500, 1500, 1, 1, "draw", "training"),
    makeRecord(1400, 1600, 0, 2, "away_win", "training"),
    makeRecord(1550, 1450, 1, 0, "home_win", "validation"),
    makeRecord(1500, 1500, 0, 0, "draw", "validation"),
    makeRecord(1550, 1450, 2, 1, "home_win", "holdout"),
    makeRecord(1500, 1500, 1, 1, "draw", "holdout"),
    makeRecord(1400, 1600, 0, 1, "away_win", "holdout")
  ];

  it("returns a report with the correct number of evaluations", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    expect(report.evaluations).toHaveLength(V2_STEEPER_LINEAR_CANDIDATES.length);
  });

  it("summary counts sum to total_candidates", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    const { eligible_for_review, rejected, inconclusive, total_candidates } = report.summary;
    expect(eligible_for_review + rejected + inconclusive).toBe(total_candidates);
  });

  it("each evaluation has splits for training, validation, holdout, combined_non_2026", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      expect(ev.splits.training).toBeDefined();
      expect(ev.splits.validation).toBeDefined();
      expect(ev.splits.holdout).toBeDefined();
      expect(ev.splits.combined_non_2026).toBeDefined();
    }
  });

  it("split record counts match input data", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      expect(ev.splits.training.records_evaluated).toBe(3);
      expect(ev.splits.validation.records_evaluated).toBe(2);
      expect(ev.splits.holdout.records_evaluated).toBe(3);
      expect(ev.splits.combined_non_2026.records_evaluated).toBe(8);
    }
  });

  it("no NaN or Infinity in any split metrics", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
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
            expect(Number.isNaN(v)).toBe(false);
            expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
  });

  it("delta = candidateMetric - baselineMetric convention for Brier", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      const delta = ev.deltas.holdout.brier_score_delta;
      const cand = ev.splits.holdout.mean_brier_score;
      if (delta !== null && cand !== null) {
        expect(delta).toBeCloseTo(cand - DUMMY_BASELINE.holdout_brier_score, 10);
      }
    }
  });

  it("delta = candidateMetric - baselineMetric convention for LogLoss", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      const delta = ev.deltas.holdout.log_loss_delta;
      const cand = ev.splits.holdout.mean_log_loss;
      if (delta !== null && cand !== null) {
        expect(delta).toBeCloseTo(cand - DUMMY_BASELINE.holdout_log_loss, 10);
      }
    }
  });

  it("acceptance gate verdict is one of the valid options", () => {
    const validVerdicts = new Set(["eligible_for_review", "rejected", "inconclusive"]);
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      expect(validVerdicts.has(ev.acceptance_gate.verdict)).toBe(true);
    }
  });

  it("acceptance gate is inconclusive when holdout is empty", () => {
    const noHoldout = records.filter((r) => r.split !== "holdout");
    const report = runV2CandidateEvaluation({ records: noHoldout, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      expect(ev.acceptance_gate.verdict).toBe("inconclusive");
    }
  });

  it("is deterministic — two runs with the same input produce identical JSON", () => {
    const input = { records, v1Reference: DUMMY_BASELINE };
    const r1 = runV2CandidateEvaluation(input);
    const r2 = runV2CandidateEvaluation(input);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("candidate_version is present in the report", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    expect(typeof report.candidate_version).toBe("string");
    expect(report.candidate_version.length).toBeGreaterThan(0);
  });

  it("limitations array is non-empty", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    expect(report.limitations.length).toBeGreaterThan(0);
  });

  it("steeper candidates produce larger xG spread in predictions", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    // Each subsequent candidate should produce larger avg xG spread in non-equal-Elo records
    const spreads = report.evaluations.map((ev) => {
      const h = ev.splits.holdout.avg_predicted_home_xg;
      const a = ev.splits.holdout.avg_predicted_away_xg;
      if (h === null || a === null) return null;
      return Math.abs(h - a);
    });
    for (let i = 1; i < spreads.length; i++) {
      const curr = spreads[i];
      const prev = spreads[i - 1];
      if (curr !== null && curr !== undefined && prev !== null && prev !== undefined) {
        // steeper = larger divergence from 1.25 on both sides
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it("accepts custom candidate set", () => {
    const custom = [{ adjustmentPer100: 0.12, maxAdjustment: 0.50, label: "custom-0.12" }];
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE, candidates: custom });
    expect(report.evaluations).toHaveLength(1);
    expect(report.evaluations[0]!.params.label).toBe("custom-0.12");
  });

  it("rejected gate fires when goal MAE is materially worsened", () => {
    // Construct a case where the candidate clearly worsens MAE:
    // use very extreme baseline with very low MAE threshold
    const extremeRef: V2BaselineReference = {
      ...DUMMY_BASELINE,
      // Set baseline home MAE very low — candidate will exceed by >0.05
      holdout_home_goal_mae: 0.0,
      holdout_away_goal_mae: 0.0,
      holdout_total_goal_mae: 0.0,
      // Set baseline Brier very high so candidate appears to improve it
      holdout_brier_score: 0.99,
      holdout_log_loss: 5.0
    };
    const report = runV2CandidateEvaluation({ records, v1Reference: extremeRef });
    // All candidates should be rejected due to MAE worsening (actual goals deviate from xG by >0.05)
    for (const ev of report.evaluations) {
      expect(ev.acceptance_gate.goal_mae_materially_worsened).toBe(true);
      expect(ev.acceptance_gate.verdict).toBe("rejected");
    }
  });

  it("Brier score is between 0 and 2 for each split (multiclass)", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      for (const split of Object.values(ev.splits)) {
        if (split.mean_brier_score !== null) {
          expect(split.mean_brier_score).toBeGreaterThanOrEqual(0);
          expect(split.mean_brier_score).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("log loss is positive for each split", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      for (const split of Object.values(ev.splits)) {
        if (split.mean_log_loss !== null) {
          expect(split.mean_log_loss).toBeGreaterThan(0);
        }
      }
    }
  });

  it("outcome_accuracy is between 0 and 1", () => {
    const report = runV2CandidateEvaluation({ records, v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      for (const split of Object.values(ev.splits)) {
        if (split.outcome_accuracy !== null) {
          expect(split.outcome_accuracy).toBeGreaterThanOrEqual(0);
          expect(split.outcome_accuracy).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("empty records produce null metrics and inconclusive gate", () => {
    const report = runV2CandidateEvaluation({ records: [], v1Reference: DUMMY_BASELINE });
    for (const ev of report.evaluations) {
      expect(ev.splits.holdout.records_evaluated).toBe(0);
      expect(ev.splits.holdout.mean_brier_score).toBeNull();
      expect(ev.acceptance_gate.verdict).toBe("inconclusive");
    }
  });
});
