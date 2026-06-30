import { describe, expect, it } from "vitest";
import {
  buildAttackDefenseRecalibrationGrid,
  evaluateAttackDefenseRecalibrationDecision,
  runAttackDefenseGoalModelRecalibration,
  selectRecalibrationCandidateFromTuning,
  type RecalibrationMetrics,
} from "../src/attack-defense-goal-model-recalibration.js";

function metrics(overrides: Partial<RecalibrationMetrics> = {}): RecalibrationMetrics {
  return {
    candidateId: "candidate",
    fixtureCount: 64,
    brierScore: 0.2,
    logLoss: 1,
    outcomeAccuracy: 0.45,
    homeGoalMae: 1,
    awayGoalMae: 1,
    totalGoalMae: 1.3,
    exactScoreAccuracy: 0.1,
    top3ScoreCoverage: 0.3,
    top5ScoreCoverage: 0.45,
    top10ScoreCoverage: 0.65,
    uniqueXgPairCount: 40,
    uniqueModalScorelineCount: 4,
    modalOneOneFrequency: 0.7,
    recommended10Frequency: 0.1,
    recommended20Frequency: 0.05,
    recommended21Frequency: 0.05,
    recommended30Frequency: 0,
    recommended31Frequency: 0,
    recommendedFourPlusTotalFrequency: 0,
    probabilityCalibration: {
      homeWin: [],
      draw: [],
      awayWin: [],
      expectedCalibrationError: 0.05,
      maximumCalibrationError: 0.1,
      favoriteBuckets: [],
      underConfidenceRate: 0.4,
      overConfidenceRate: 0.6,
    },
    goalCalibration: {
      avgPredictedHomeGoals: 1.2,
      avgActualHomeGoals: 1.2,
      avgPredictedAwayGoals: 1.1,
      avgActualAwayGoals: 1.1,
      avgPredictedTotalGoals: 2.3,
      avgActualTotalGoals: 2.3,
      totalGoalBuckets: [],
      totalGoalUnderpredictionRate: 0.5,
      totalGoalOverpredictionRate: 0.5,
    },
    extremes: {
      xgBelow05: 0,
      xgBelow08: 0,
      xgAbove15: 10,
      xgAbove20: 2,
      xgAbove25: 0,
      xgClampedAtMinimum: 0,
      xgClampedAtMaximum: 0,
      clampRate: 0,
      predictedThreePlusGoalMargins: 0,
      predictedFourPlusGoalTotals: 0,
      predictedFivePlusGoalTotals: 0,
      actualThreePlusGoalMargins: 1,
      actualFourPlusGoalTotals: 4,
      actualFivePlusGoalTotals: 1,
      blowoutRateDelta: 0,
    },
    componentContributions: {
      averageAttackContributionLog: 0.02,
      averageDefenseContributionLog: 0.01,
      averageEloContributionLog: 0,
      averageVenueContributionLog: 0,
      averageAbsoluteAttackContributionLog: 0.04,
      averageAbsoluteDefenseContributionLog: 0.03,
      averageAbsoluteEloContributionLog: 0,
      averageAbsoluteVenueContributionLog: 0,
      largestAverageFactor: "attack",
      clampFrequency: 0,
      combinedFactorThresholdExceedances: 0,
    },
    ...overrides,
  };
}

describe("attack/defense recalibration parameter grid", () => {
  it("has deterministic unique bounded candidate IDs", () => {
    const first = buildAttackDefenseRecalibrationGrid();
    const second = buildAttackDefenseRecalibrationGrid();
    expect(first.map((config) => config.id)).toEqual(second.map((config) => config.id));
    expect(new Set(first.map((config) => config.id)).size).toBe(first.length);
    expect(first.length).toBeGreaterThan(20);
    expect(first.length).toBeLessThanOrEqual(250);
    expect(first.every((config) => config.attackWeight >= 0 && config.attackWeight <= 1)).toBe(true);
    expect(first.every((config) => config.defenseWeight >= 0 && config.defenseWeight <= 1)).toBe(true);
  });

  it("selects from tuning metrics only and ignores validation-like order changes", () => {
    const tuning = [
      metrics({ candidateId: "candidate_b", brierScore: 0.21, logLoss: 1.01 }),
      metrics({ candidateId: "candidate_a", brierScore: 0.2, logLoss: 1.02 }),
      metrics({ candidateId: "elo_only_v2_baseline__a0p00", brierScore: 0.1, logLoss: 0.9 }),
    ];
    expect(selectRecalibrationCandidateFromTuning(tuning)?.candidateId).toBe("candidate_a");
    expect(selectRecalibrationCandidateFromTuning([...tuning].reverse())?.candidateId).toBe("candidate_a");
  });
});

describe("attack/defense recalibration decision gate", () => {
  const baseline = metrics({
    candidateId: "elo_only_v2_baseline",
    brierScore: 0.21,
    logLoss: 1.05,
    totalGoalMae: 1.4,
    homeGoalMae: 1.05,
    awayGoalMae: 0.9,
    uniqueXgPairCount: 1,
    uniqueModalScorelineCount: 1,
  });

  it("promotes a calibrated validation candidate with diversity and no material regression", () => {
    const decision = evaluateAttackDefenseRecalibrationDecision({
      baseline,
      selected: metrics({
        candidateId: "selected",
        brierScore: 0.205,
        logLoss: 1.04,
        totalGoalMae: 1.41,
        homeGoalMae: 1.04,
        awayGoalMae: 0.91,
        uniqueXgPairCount: 50,
        uniqueModalScorelineCount: 3,
      }),
      fallbackRate: 0.2,
      noLookAheadViolations: 0,
      validationLeakage: false,
    });
    expect(decision.decision).toBe("promote_recalibrated_candidate");
  });

  it("rejects diversity-only improvement when probability metrics regress materially", () => {
    const decision = evaluateAttackDefenseRecalibrationDecision({
      baseline,
      selected: metrics({
        candidateId: "diverse_bad",
        brierScore: 0.23,
        logLoss: 1.08,
        uniqueXgPairCount: 80,
        uniqueModalScorelineCount: 10,
      }),
      fallbackRate: 0.2,
      noLookAheadViolations: 0,
      validationLeakage: false,
    });
    expect(decision.decision).toBe("diversity_only_improvement");
    expect(decision.blockers.join(" ")).toMatch(/Brier|Log Loss/);
  });

  it("blocks data-quality failures, clamp inflation, blowout inflation, and top-N regressions", () => {
    expect(
      evaluateAttackDefenseRecalibrationDecision({
        baseline,
        selected: metrics(),
        fallbackRate: 0.2,
        noLookAheadViolations: 1,
        validationLeakage: false,
      }).decision
    ).toBe("data_quality_blocked");

    const blocked = evaluateAttackDefenseRecalibrationDecision({
      baseline,
      selected: metrics({
        extremes: { ...metrics().extremes, clampRate: 0.2, blowoutRateDelta: 0.2 },
        top5ScoreCoverage: 0.2,
      }),
      fallbackRate: 0.2,
      noLookAheadViolations: 0,
      validationLeakage: false,
    });
    expect(blocked.blockers.join(" ")).toMatch(/Clamp|Blowout|Top-5/);
  });
});

describe("runAttackDefenseGoalModelRecalibration", () => {
  it("uses WC2018 for tuning and WC2022 for validation with zero no-look-ahead violations", () => {
    const result = runAttackDefenseGoalModelRecalibration({ generatedAt: "2026-06-30T00:00:00.000Z" });
    expect(result.tuningYear).toBe(2018);
    expect(result.validationYear).toBe(2022);
    expect(result.parameterGridSize).toBe(buildAttackDefenseRecalibrationGrid().length);
    expect(result.selectedConfig?.id).toBe(result.tuning.selected?.candidateId);
    expect(result.validation.selected?.candidateId).toBe(result.selectedConfig?.id);
    expect(result.profileCoverageSummary.noLookAheadViolations).toBe(0);
    expect(result.profileCoverageSummary.fallbackRate).toBeLessThanOrEqual(0.5);
    expect(result.validation.baseline.fixtureCount).toBe(64);
    expect(result.validation.selected?.fixtureCount).toBe(64);
    expect(result.decision.selectedCandidateId).toBe(result.selectedConfig?.id);
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
  });
});
