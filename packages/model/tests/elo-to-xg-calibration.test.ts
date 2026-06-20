import { describe, expect, it } from "vitest";
import {
  ELO_DIFFERENCE_BUCKETS,
  ELO_TO_XG_CALIBRATION_HOLDOUT_YEARS,
  ELO_TO_XG_CALIBRATION_TRAINING_YEARS,
  ELO_TO_XG_CALIBRATION_VALIDATION_YEARS,
  ELO_TO_XG_CALIBRATION_VERSION,
  ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT,
  assignEloDifferenceBucket,
  buildEloToXgCalibrationDataset,
  evaluateEloToXgBaseline,
  verifyProductionFormulaUnchanged
} from "../src/index.js";
import type { CalibrationMatchInput } from "../src/index.js";
import { ELO_TO_XG_BASE_GOALS, ELO_TO_XG_ADJUSTMENT_PER_100, ELO_TO_XG_MAX_ELO_ADJUSTMENT } from "../src/elo-to-xg.js";

// --- Fixtures ---

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

const MATCH_WC10_A = makeMatch({ match_id: "WC10-001", match_date: "2010-06-11", year: 2010 });
const MATCH_WC10_B = makeMatch({ match_id: "WC10-002", match_date: "2010-06-12", year: 2010, home_team: "Beta", away_team: "Gamma", home_score: 2, away_score: 1, result: "home_win" });
const MATCH_WC14_A = makeMatch({ match_id: "WC14-001", match_date: "2014-06-12", competition: "FIFA World Cup 2014", year: 2014, source_dataset: "world-cup-2014-results" });
const MATCH_WC18_A = makeMatch({ match_id: "WC18-001", match_date: "2018-06-14", competition: "FIFA World Cup 2018", year: 2018, source_dataset: "world-cup-2018-results" });
const MATCH_WC22_A = makeMatch({ match_id: "WC22-001", match_date: "2022-11-20", competition: "FIFA World Cup 2022", year: 2022, source_dataset: "world-cup-2022-results" });

const MATCH_INTL_2017 = makeMatch({ match_id: "INT-2017-001", match_date: "2017-03-01", competition: "Friendly", year: 2017, source_dataset: "international-matches-expanded-v1" });
const MATCH_INTL_2019 = makeMatch({ match_id: "INT-2019-001", match_date: "2019-09-05", competition: "Friendly", year: 2019, source_dataset: "international-matches-expanded-v1" });
const MATCH_INTL_2022 = makeMatch({ match_id: "INT-2022-001", match_date: "2022-03-01", competition: "Friendly", year: 2022, source_dataset: "international-matches-expanded-v1" });

const MATCH_WC26_COMPLETED = makeMatch({ match_id: "WC26-001", match_date: "2026-06-11", competition: "FIFA World Cup 2026", year: 2026, source_dataset: "wc2026" });

// --- Tests ---

describe("ELO_DIFFERENCE_BUCKETS", () => {
  it("has exactly 7 buckets", () => {
    expect(ELO_DIFFERENCE_BUCKETS).toHaveLength(7);
  });

  it("covers the full range with no gaps (adjacent boundaries match)", () => {
    for (let i = 0; i < ELO_DIFFERENCE_BUCKETS.length - 1; i++) {
      const current = ELO_DIFFERENCE_BUCKETS[i];
      const next = ELO_DIFFERENCE_BUCKETS[i + 1];
      if (current !== undefined && next !== undefined) {
        expect(current.max).toBe(next.min);
      }
    }
  });
});

describe("assignEloDifferenceBucket", () => {
  it("assigns the lowest bucket for very negative diff", () => {
    expect(assignEloDifferenceBucket(-500)).toBe("<= -300");
    expect(assignEloDifferenceBucket(-300)).toBe("<= -300");
  });

  it("assigns second bucket for -299 to -151", () => {
    expect(assignEloDifferenceBucket(-299)).toBe("-300 to -150");
    expect(assignEloDifferenceBucket(-150)).toBe("-300 to -150");
  });

  it("assigns third bucket for -149 to -76", () => {
    expect(assignEloDifferenceBucket(-149)).toBe("-150 to -75");
    expect(assignEloDifferenceBucket(-75)).toBe("-150 to -75");
  });

  it("assigns middle bucket for near-equal teams", () => {
    expect(assignEloDifferenceBucket(0)).toBe("-75 to 75");
    expect(assignEloDifferenceBucket(50)).toBe("-75 to 75");
    expect(assignEloDifferenceBucket(-50)).toBe("-75 to 75");
    expect(assignEloDifferenceBucket(75)).toBe("-75 to 75");
  });

  it("assigns fifth bucket for 76 to 150", () => {
    expect(assignEloDifferenceBucket(76)).toBe("75 to 150");
    expect(assignEloDifferenceBucket(150)).toBe("75 to 150");
  });

  it("assigns sixth bucket for 151 to 300", () => {
    expect(assignEloDifferenceBucket(151)).toBe("150 to 300");
    expect(assignEloDifferenceBucket(300)).toBe("150 to 300");
  });

  it("assigns the highest bucket for very positive diff", () => {
    expect(assignEloDifferenceBucket(301)).toBe(">= 300");
    expect(assignEloDifferenceBucket(600)).toBe(">= 300");
  });
});

describe("buildEloToXgCalibrationDataset", () => {
  it("returns an empty dataset when no matches provided", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [],
      internationalMatches: []
    });

    expect(result.total_count).toBe(0);
    expect(result.rejected_count).toBe(0);
    expect(result.records).toHaveLength(0);
    expect(result.calibration_version).toBe(ELO_TO_XG_CALIBRATION_VERSION);
  });

  it("builds calibration records from WC matches", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: []
    });

    expect(result.total_count).toBe(2);
    expect(result.records).toHaveLength(2);
  });

  it("assigns training split to WC2010 and WC2014 matches", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: []
    });

    for (const record of result.records) {
      expect(record.split).toBe("training");
    }
  });

  it("assigns validation split to WC2018 matches", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC18_A],
      internationalMatches: []
    });

    expect(result.records[0]?.split).toBe("validation");
    expect(ELO_TO_XG_CALIBRATION_VALIDATION_YEARS).toContain(2018);
  });

  it("assigns holdout split to WC2022 matches", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC22_A],
      internationalMatches: []
    });

    expect(result.records[0]?.split).toBe("holdout");
    expect(ELO_TO_XG_CALIBRATION_HOLDOUT_YEARS).toContain(2022);
  });

  it("assigns wc2026_holdout split to WC2026 completed matches", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [],
      internationalMatches: [],
      wc2026CompletedMatches: [MATCH_WC26_COMPLETED]
    });

    expect(result.records[0]?.split).toBe("wc2026_holdout");
    expect(ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT).toBe("wc2026");
  });

  it("assigns chronological splits to international matches", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [],
      internationalMatches: [MATCH_INTL_2017, MATCH_INTL_2019, MATCH_INTL_2022]
    });

    const splits = result.records.map((r) => ({ year: r.year, split: r.split }));

    const training = splits.find((s) => s.year === 2017);
    const validation = splits.find((s) => s.year === 2019);
    const holdout = splits.find((s) => s.year === 2022);

    expect(training?.split).toBe("training");
    expect(validation?.split).toBe("validation");
    expect(holdout?.split).toBe("holdout");
  });

  it("records pre-match Elo as the initial rating for the first match", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    const record = result.records[0];
    expect(record).toBeDefined();
    // Both teams are new so start at 1500
    expect(record?.pre_match_home_elo).toBe(1500);
    expect(record?.pre_match_away_elo).toBe(1500);
    expect(record?.elo_difference).toBe(0);
  });

  it("updates Elo after each match (no look-ahead)", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC10_B],
      internationalMatches: []
    });

    expect(result.records).toHaveLength(2);
    const first = result.records[0];
    const second = result.records[1];

    // Both teams start at 1500 for first match
    expect(first?.pre_match_home_elo).toBe(1500);
    expect(first?.pre_match_away_elo).toBe(1500);

    // Second match: Beta (away in match 1, lost) should have updated rating
    // Beta appears as home in WC10_B — rating should differ from 1500
    const betaRating = second?.pre_match_home_elo;
    expect(betaRating).not.toBeUndefined();
    expect(betaRating).not.toBe(1500); // Beta lost WC10_A, so rating dropped
  });

  it("sorts matches chronologically before Elo replay", () => {
    // Supply matches out of order - result should be same as in-order
    const reversed = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC14_A, MATCH_WC10_A],
      internationalMatches: []
    });

    const inOrder = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: []
    });

    // Same teams and dates should produce same pre-match Elo
    const wc10Reversed = reversed.records.find((r) => r.match_id === MATCH_WC10_A.match_id);
    const wc10InOrder = inOrder.records.find((r) => r.match_id === MATCH_WC10_A.match_id);

    expect(wc10Reversed?.pre_match_home_elo).toBe(wc10InOrder?.pre_match_home_elo);
    expect(wc10Reversed?.pre_match_away_elo).toBe(wc10InOrder?.pre_match_away_elo);
  });

  it("rejects duplicate match IDs", () => {
    const duplicate = { ...MATCH_WC10_A };
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, duplicate],
      internationalMatches: []
    });

    expect(result.total_count).toBe(1);
    expect(result.rejected_count).toBe(1);
    expect(result.rejection_reasons.some((r) => r.includes("duplicate_match_id"))).toBe(true);
  });

  it("rejects match with invalid score (negative)", () => {
    const badMatch: CalibrationMatchInput = {
      ...MATCH_WC10_A,
      match_id: "BAD-001",
      home_score: -1,
      away_score: 0,
      result: "home_win"
    };

    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [badMatch],
      internationalMatches: []
    });

    expect(result.total_count).toBe(0);
    expect(result.rejected_count).toBe(1);
    expect(result.rejection_reasons.some((r) => r.includes("invalid_score"))).toBe(true);
  });

  it("rejects match with missing home team", () => {
    const badMatch: CalibrationMatchInput = {
      ...MATCH_WC10_A,
      match_id: "BAD-002",
      home_team: ""
    };

    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [badMatch],
      internationalMatches: []
    });

    expect(result.total_count).toBe(0);
    expect(result.rejected_count).toBe(1);
    expect(result.rejection_reasons.some((r) => r.includes("missing_home_team"))).toBe(true);
  });

  it("rejects match where result contradicts scores", () => {
    const badMatch: CalibrationMatchInput = {
      ...MATCH_WC10_A,
      match_id: "BAD-003",
      home_score: 0,
      away_score: 2,
      result: "home_win"
    };

    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [badMatch],
      internationalMatches: []
    });

    expect(result.total_count).toBe(0);
    expect(result.rejected_count).toBe(1);
    expect(result.rejection_reasons.some((r) => r.includes("result_score_mismatch"))).toBe(true);
  });

  it("rejects match with invalid date", () => {
    const badMatch: CalibrationMatchInput = {
      ...MATCH_WC10_A,
      match_id: "BAD-004",
      match_date: "not-a-date"
    };

    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [badMatch],
      internationalMatches: []
    });

    expect(result.total_count).toBe(0);
    expect(result.rejected_count).toBe(1);
  });

  it("populates split_counts correctly", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC18_A, MATCH_WC22_A],
      internationalMatches: []
    });

    expect(result.split_counts.training).toBe(1);
    expect(result.split_counts.validation).toBe(1);
    expect(result.split_counts.holdout).toBe(1);
    expect(result.split_counts.wc2026_holdout).toBe(0);
  });

  it("populates sources with unique dataset identifiers", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: [MATCH_INTL_2017]
    });

    expect(result.sources).toContain("world-cup-2010-results");
    expect(result.sources).toContain("world-cup-2014-results");
    expect(result.sources).toContain("international-matches-expanded-v1");
  });

  it("assigns correct elo_bucket to each record", () => {
    const result = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    const record = result.records[0];
    // Both teams start at 1500 → diff = 0 → middle bucket
    expect(record?.elo_bucket).toBe("-75 to 75");
  });

  it("is deterministic — repeated calls produce identical output", () => {
    const input = {
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC10_B, MATCH_WC14_A],
      internationalMatches: [MATCH_INTL_2017]
    };

    const first = buildEloToXgCalibrationDataset(input);
    const second = buildEloToXgCalibrationDataset(input);

    expect(first.records.map((r) => r.pre_match_home_elo)).toEqual(second.records.map((r) => r.pre_match_home_elo));
    expect(first.records.map((r) => r.elo_difference)).toEqual(second.records.map((r) => r.elo_difference));
    expect(first.total_count).toBe(second.total_count);
  });
});

describe("evaluateEloToXgBaseline", () => {
  it("returns null metrics for empty dataset", () => {
    const result = evaluateEloToXgBaseline([]);

    expect(result.records_evaluated).toBe(0);
    expect(result.mean_home_goal_mae).toBeNull();
    expect(result.mean_away_goal_mae).toBeNull();
    expect(result.mean_brier_score).toBeNull();
    expect(result.mean_log_loss).toBeNull();
    expect(result.outcome_accuracy).toBeNull();
    expect(result.warnings).toContain("No records to evaluate.");
  });

  it("computes finite metrics for valid records", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC10_B, MATCH_WC14_A, MATCH_WC18_A],
      internationalMatches: []
    });

    const result = evaluateEloToXgBaseline(dataset.records);

    expect(result.records_evaluated).toBe(4);
    expect(result.mean_home_goal_mae).not.toBeNull();
    expect(result.mean_away_goal_mae).not.toBeNull();
    expect(result.mean_brier_score).not.toBeNull();
    expect(result.mean_log_loss).not.toBeNull();
    expect(result.outcome_accuracy).not.toBeNull();

    // All should be finite numbers
    expect(Number.isFinite(result.mean_home_goal_mae as number)).toBe(true);
    expect(Number.isFinite(result.mean_brier_score as number)).toBe(true);
    expect(Number.isFinite(result.mean_log_loss as number)).toBe(true);
  });

  it("produces no NaN or Infinity in metric outputs", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A, MATCH_WC18_A, MATCH_WC22_A],
      internationalMatches: [MATCH_INTL_2017, MATCH_INTL_2019]
    });

    const result = evaluateEloToXgBaseline(dataset.records);

    const numericFields = [
      result.mean_home_goal_mae,
      result.mean_away_goal_mae,
      result.mean_total_goal_mae,
      result.home_goal_rmse,
      result.away_goal_rmse,
      result.total_goal_rmse,
      result.mean_brier_score,
      result.mean_log_loss,
      result.avg_predicted_home_goals,
      result.avg_predicted_away_goals,
      result.avg_actual_home_goals,
      result.avg_actual_away_goals,
      result.outcome_accuracy
    ];

    for (const value of numericFields) {
      if (value !== null) {
        expect(Number.isNaN(value)).toBe(false);
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it("filters records by split when splitFilter is provided", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC18_A, MATCH_WC22_A],
      internationalMatches: []
    });

    const trainingOnly = evaluateEloToXgBaseline(dataset.records, "training");
    const validationOnly = evaluateEloToXgBaseline(dataset.records, "validation");

    expect(trainingOnly.records_evaluated).toBe(1); // WC2010
    expect(validationOnly.records_evaluated).toBe(1); // WC2018
  });

  it("returns 7 bucket entries in elo_gap_bucket_analysis", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A],
      internationalMatches: []
    });

    const result = evaluateEloToXgBaseline(dataset.records);
    expect(result.elo_gap_bucket_analysis).toHaveLength(7);
  });

  it("reports by_competition with one entry per competition", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: [MATCH_INTL_2017]
    });

    const result = evaluateEloToXgBaseline(dataset.records);
    const competitionNames = result.by_competition.map((c) => c.competition);

    expect(competitionNames).toContain("FIFA World Cup 2010");
    expect(competitionNames).toContain("FIFA World Cup 2014");
    expect(competitionNames).toContain("Friendly");
    expect(new Set(competitionNames).size).toBe(competitionNames.length); // no duplicates
  });

  it("reports by_neutral_site breakdown", () => {
    const neutralMatch: CalibrationMatchInput = {
      ...MATCH_WC10_A,
      match_id: "N-001",
      neutral_site: true
    };
    const nonNeutralMatch: CalibrationMatchInput = {
      ...MATCH_WC14_A,
      match_id: "NN-001",
      neutral_site: false
    };

    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [neutralMatch, nonNeutralMatch],
      internationalMatches: []
    });

    const result = evaluateEloToXgBaseline(dataset.records);

    expect(result.by_neutral_site.neutral.count + result.by_neutral_site.non_neutral.count).toBe(2);
  });

  it("includes formula_version in output", () => {
    const result = evaluateEloToXgBaseline([]);
    expect(result.formula_version).toBe("elo-to-xg-v1");
  });

  it("brier score is bounded between 0 and 2 for each record (multiclass)", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC10_B, MATCH_WC14_A, MATCH_WC18_A, MATCH_WC22_A],
      internationalMatches: [MATCH_INTL_2017, MATCH_INTL_2019, MATCH_INTL_2022]
    });

    const result = evaluateEloToXgBaseline(dataset.records);

    if (result.mean_brier_score !== null) {
      expect(result.mean_brier_score).toBeGreaterThanOrEqual(0);
      expect(result.mean_brier_score).toBeLessThanOrEqual(2);
    }
  });

  it("log loss is positive for all valid probability outputs", () => {
    const dataset = buildEloToXgCalibrationDataset({
      historicalWorldCupMatches: [MATCH_WC10_A, MATCH_WC14_A],
      internationalMatches: []
    });

    const result = evaluateEloToXgBaseline(dataset.records);

    if (result.mean_log_loss !== null) {
      expect(result.mean_log_loss).toBeGreaterThan(0);
    }
  });
});

describe("verifyProductionFormulaUnchanged", () => {
  it("reports unchanged: true", () => {
    const guard = verifyProductionFormulaUnchanged();
    expect(guard.unchanged).toBe(true);
  });

  it("reports correct production constants", () => {
    const guard = verifyProductionFormulaUnchanged();
    expect(guard.baseGoals).toBe(ELO_TO_XG_BASE_GOALS);
    expect(guard.adjustmentPer100).toBe(ELO_TO_XG_ADJUSTMENT_PER_100);
    expect(guard.maxEloAdjustment).toBe(ELO_TO_XG_MAX_ELO_ADJUSTMENT);
  });

  it("V2 production constants are set correctly", () => {
    expect(ELO_TO_XG_BASE_GOALS).toBe(1.25);
    expect(ELO_TO_XG_ADJUSTMENT_PER_100).toBe(0.15);
    expect(ELO_TO_XG_MAX_ELO_ADJUSTMENT).toBe(0.65);
  });
});

describe("split policy constants", () => {
  it("training years are 2010 and 2014", () => {
    expect(ELO_TO_XG_CALIBRATION_TRAINING_YEARS).toContain(2010);
    expect(ELO_TO_XG_CALIBRATION_TRAINING_YEARS).toContain(2014);
  });

  it("validation years are 2018", () => {
    expect(ELO_TO_XG_CALIBRATION_VALIDATION_YEARS).toContain(2018);
  });

  it("holdout years are 2022", () => {
    expect(ELO_TO_XG_CALIBRATION_HOLDOUT_YEARS).toContain(2022);
  });

  it("WC2026 holdout sentinel is 'wc2026'", () => {
    expect(ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT).toBe("wc2026");
  });
});
