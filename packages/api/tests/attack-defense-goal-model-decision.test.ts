import { describe, expect, it } from "vitest";
import type {
  GoalModelBacktestResult,
  GoalModelCandidateMetrics,
} from "../src/attack-defense-goal-model-backtest.js";
import { evaluateGoalModelDecision } from "../src/attack-defense-goal-model-decision.js";

function makeMetrics(
  candidateId: GoalModelCandidateMetrics["candidateId"],
  brierScore: number,
  logLoss: number,
  totalGoalMae: number,
  uniqueXgPairCount: number = 10,
  avgPredictedHomeGoals: number = 1.4
): GoalModelCandidateMetrics {
  return {
    candidateId,
    fixtureCount: 64,
    brierScore,
    logLoss,
    outcomeAccuracy: 0.5,
    exactScoreAccuracy: 0.1,
    top3ScoreCoverage: 0.3,
    top5ScoreCoverage: 0.4,
    homeGoalMae: 0.9,
    awayGoalMae: 0.8,
    totalGoalMae,
    avgPredictedHomeGoals,
    avgPredictedAwayGoals: 1.1,
    avgActualHomeGoals: 1.4,
    avgActualAwayGoals: 1.1,
    uniqueXgPairCount,
    uniqueModalScorelineCount: 5,
    modalOneOneFrequency: 0.3,
    recommended10Frequency: 0.25,
    recommended20Frequency: 0.05,
    recommended21Frequency: 0.05,
    recommended30Frequency: 0.01,
    recommended31Frequency: 0.01,
    top1Concentration: 0.15,
    top5CumulativeProbabilityAvg: 0.55,
    totalGoalDistribution: { "0": 5, "1": 10, "2": 25, "3": 15, "4+": 9 },
  };
}

function makeBacktestResult(
  overrides: Partial<GoalModelBacktestResult> = {}
): GoalModelBacktestResult {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    modelVersion: "attack-defense-goal-model-v1",
    evaluationYears: [2018, 2022],
    fixtureCount: 64,
    profileCoverageSummary: {
      competitionEnvSampleSize: 60,
      profileStrategy: "goals_unadjusted",
      recencyStrategy: "uniform",
      coverageCounts: { full: 20, partial: 10, sparse: 5, fallback: 5 },
      fallbackRate: 5 / 40,
      fullCoverageRate: 20 / 40,
      totalNoLookAheadViolations: 0,
    },
    candidateMetrics: [
      makeMetrics("elo_only_v2_baseline", 0.220, 0.680, 1.30, 3),
      makeMetrics("attack_defense_multiplicative", 0.215, 0.670, 1.28, 20),
      makeMetrics("attack_defense_log_linear", 0.217, 0.675, 1.29, 18),
      makeMetrics("attack_defense_statsbomb_blend", 0.218, 0.676, 1.30, 15),
    ],
    xgDiagnostics: [],
    fixtures: [],
    ...overrides,
  };
}

describe("evaluateGoalModelDecision — data quality gate", () => {
  it("blocks when fixture count is too low", () => {
    const result = makeBacktestResult({ fixtureCount: 10 });
    const decision = evaluateGoalModelDecision(result);
    expect(decision.decision).toBe("data_quality_blocked");
    expect(decision.blockers.length).toBeGreaterThan(0);
  });

  it("blocks when no-look-ahead violations exist", () => {
    const result = makeBacktestResult({
      profileCoverageSummary: {
        ...makeBacktestResult().profileCoverageSummary,
        totalNoLookAheadViolations: 5,
      },
    });
    const decision = evaluateGoalModelDecision(result);
    expect(decision.decision).toBe("data_quality_blocked");
  });
});

describe("evaluateGoalModelDecision — coverage gate", () => {
  it("blocks with insufficient_profile_coverage when fallback rate is too high", () => {
    const result = makeBacktestResult({
      profileCoverageSummary: {
        ...makeBacktestResult().profileCoverageSummary,
        fallbackRate: 0.9, // 90% fallback — too high
      },
    });
    const decision = evaluateGoalModelDecision(result);
    expect(decision.decision).toBe("insufficient_profile_coverage");
  });
});

describe("evaluateGoalModelDecision — promotes when all gates pass", () => {
  it("promotes the best candidate when metrics are favorable", () => {
    const result = makeBacktestResult();
    const decision = evaluateGoalModelDecision(result);
    expect(decision.decision).toBe("promote_candidate");
    expect(decision.selectedCandidateId).toBe("attack_defense_multiplicative");
    expect(decision.blockers.length).toBe(0);
  });

  it("reports baseline and best candidate metrics", () => {
    const result = makeBacktestResult();
    const decision = evaluateGoalModelDecision(result);
    expect(decision.baselineMetrics?.candidateId).toBe("elo_only_v2_baseline");
    expect(decision.bestCandidateMetrics?.candidateId).toBe("attack_defense_multiplicative");
  });

  it("reports Brier and log loss deltas", () => {
    const result = makeBacktestResult();
    const decision = evaluateGoalModelDecision(result);
    expect(decision.brierDelta).not.toBeNull();
    expect(decision.logLossDelta).not.toBeNull();
  });
});

describe("evaluateGoalModelDecision — regression gate", () => {
  it("blocks when candidate Brier Score materially regresses", () => {
    const result = makeBacktestResult({
      candidateMetrics: [
        makeMetrics("elo_only_v2_baseline", 0.220, 0.680, 1.30, 3),
        makeMetrics("attack_defense_multiplicative", 0.240, 0.695, 1.35, 15), // worse
        makeMetrics("attack_defense_log_linear", 0.238, 0.692, 1.34, 12),
        makeMetrics("attack_defense_statsbomb_blend", 0.235, 0.690, 1.32, 10),
      ],
    });
    const decision = evaluateGoalModelDecision(result);
    expect(decision.decision).not.toBe("promote_candidate");
    expect(decision.blockers.length).toBeGreaterThan(0);
  });
});

describe("evaluateGoalModelDecision — goal calibration gate", () => {
  it("blocks when average home xG is implausibly high", () => {
    const result = makeBacktestResult({
      candidateMetrics: [
        makeMetrics("elo_only_v2_baseline", 0.220, 0.680, 1.30, 3, 1.4),
        makeMetrics("attack_defense_multiplicative", 0.215, 0.670, 1.28, 20, 4.5), // xG too high
        makeMetrics("attack_defense_log_linear", 0.217, 0.675, 1.29, 18, 1.4),
        makeMetrics("attack_defense_statsbomb_blend", 0.218, 0.676, 1.30, 15, 1.4),
      ],
    });
    const decision = evaluateGoalModelDecision(result);
    // multiplicative blocked by xG cap; should not promote it
    if (decision.selectedCandidateId === "attack_defense_multiplicative") {
      expect(decision.decision).not.toBe("promote_candidate");
    }
  });
});

describe("evaluateGoalModelDecision — returns retain_elo_v2 on no valid candidates", () => {
  it("retains baseline when no candidate beats it", () => {
    const result = makeBacktestResult({
      candidateMetrics: [
        makeMetrics("elo_only_v2_baseline", 0.220, 0.680, 1.30),
        // All candidates have null metrics
        {
          ...makeMetrics("attack_defense_multiplicative", 0.220, 0.680, 1.30),
          brierScore: null,
        },
        {
          ...makeMetrics("attack_defense_log_linear", 0.220, 0.680, 1.30),
          brierScore: null,
        },
        {
          ...makeMetrics("attack_defense_statsbomb_blend", 0.220, 0.680, 1.30),
          brierScore: null,
        },
      ],
    });
    const decision = evaluateGoalModelDecision(result);
    expect(decision.decision).toBe("retain_elo_v2");
  });
});
