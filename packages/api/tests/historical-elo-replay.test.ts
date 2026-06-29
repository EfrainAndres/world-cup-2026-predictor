import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELO_CONFIG,
  ELO_TO_XG_ADJUSTMENT_PER_100,
  ELO_TO_XG_MAX_ELO_ADJUSTMENT
} from "../../model/src/index.js";
import type { EloMatch, EloResult } from "../../model/src/index.js";
import {
  buildHistoricalEloReplayComparison,
  buildHistoricalEloReplayStrategy,
  buildWorldCupOnlyProcessMatchesDiagnostic,
  HISTORICAL_ELO_REPLAY_CONSTANT_SNAPSHOT
} from "../src/historical-elo-replay.js";
import type {
  HistoricalEloReplayComparison,
  HistoricalEloReplaySourceMatch,
  HistoricalEloReplayStrategy,
  HistoricalEloReplayStrategyResult
} from "../src/historical-elo-replay.js";
import { summarizeHistoricalEloReplayDiagnostics } from "../src/historical-elo-replay-diagnostics.js";
import {
  makeHistoricalEloDataQualityDecision
} from "../src/historical-elo-data-quality-decision.js";
import type {
  HistoricalEloDataQualityDecision,
  HistoricalEloDataQualityStrategySummary
} from "../src/historical-elo-data-quality-decision.js";

function resultFor(homeScore: number, awayScore: number): EloResult {
  if (homeScore > awayScore) return "home_win";
  if (awayScore > homeScore) return "away_win";
  return "draw";
}

function match(
  matchId: string,
  matchDate: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  overrides: Partial<HistoricalEloReplaySourceMatch> = {}
): HistoricalEloReplaySourceMatch {
  const base: HistoricalEloReplaySourceMatch = {
    match_id: matchId,
    match_date: matchDate,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    result: resultFor(homeScore, awayScore),
    competition: "FIFA World Cup",
    neutral_site: true,
    source_dataset: "test_dataset"
  };

  return {
    ...base,
    ...overrides
  };
}

function baseReplayMatches(): HistoricalEloReplaySourceMatch[] {
  return [
    match("TRAIN-002", "2017-01-01", "Alpha", "Bravo", 3, 0, { competition: "International Friendly" }),
    match("TRAIN-001", "2016-01-01", "Alpha", "Bravo", 3, 0, { competition: "International Friendly" }),
    match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0),
    match("2018-WC-002", "2018-06-02", "Alpha", "Bravo", 0, 1)
  ];
}

function makeStrategyResult(
  strategy: HistoricalEloReplayStrategy,
  summary: Partial<HistoricalEloDataQualityStrategySummary>
): HistoricalEloReplayStrategyResult {
  const acceptedFixtureCount = summary.acceptedFixtureCount ?? 128;
  const unresolvedTeamCount = summary.unresolvedTeamCount ?? 0;
  const noLookAheadFailures = summary.noLookAheadFailures ?? 0;
  const uniquePreMatchEloPairCount = summary.uniquePreMatchEloPairCount ?? 32;
  const uniqueBaselineXgPairCount = summary.uniqueBaselineXgPairCount ?? 16;
  const uniqueModalScorelineCount = summary.uniqueModalScorelineCount ?? 3;
  const modalOneOneFrequency = summary.modalOneOneFrequency ?? 0.8;
  const fixturesAbove167PointGap = summary.fixturesAbove167PointGap ?? 4;

  return {
    strategy,
    dataset: {
      sourceDatasets: ["test_dataset"],
      inputMatchCount: acceptedFixtureCount,
      replayMatchCount: acceptedFixtureCount,
      evaluationYears: [2018, 2022],
      cutoffPolicy: "test"
    },
    diagnostics: {
      strategy,
      fixtureCount: acceptedFixtureCount,
      acceptedFixtureCount,
      excludedFixtureCount: 0,
      unresolvedTeamCount,
      duplicateCount: 0,
      uniquePreMatchEloPairCount,
      uniqueEloGapCount: uniquePreMatchEloPairCount,
      minEloGap: 0,
      maxEloGap: 220,
      averageAbsoluteEloGap: 80,
      medianAbsoluteEloGap: 70,
      percentile25AbsoluteEloGap: 30,
      percentile75AbsoluteEloGap: 120,
      thresholdCounts: {
        "50": { count: 60, percentage: 0.46875 },
        "100": { count: 20, percentage: 0.15625 },
        "150": { count: 8, percentage: 0.0625 },
        "167": { count: fixturesAbove167PointGap, percentage: fixturesAbove167PointGap / acceptedFixtureCount },
        "200": { count: 1, percentage: 0.0078125 },
        "300": { count: 0, percentage: 0 }
      },
      uniqueBaselineXgPairCount,
      uniqueModalScorelineCount,
      modalOneOneFrequency,
      top10ModalScorelines: [{ scoreline: "1-1", count: 100, frequency: modalOneOneFrequency }],
      noLookAheadFailures
    },
    baselineMetrics: {
      brierScore: 0.62,
      logLoss: 1.1,
      outcomeAccuracy: 0.42,
      exactScoreAccuracy: 0.08,
      top3ScoreCoverage: 0.2,
      top5ScoreCoverage: 0.28,
      homeGoalMae: 0.9,
      awayGoalMae: 0.8,
      totalGoalMae: 1.7,
      averagePredictedGoals: 2.2,
      averageActualGoals: 2.4,
      modalOneOneFrequency,
      uniqueModalScorelineCount,
      scorelineConcentration: modalOneOneFrequency
    },
    fixtures: [],
    exclusions: [],
    backtestResults: []
  };
}

function makeComparison(results: HistoricalEloReplayStrategyResult[]): HistoricalEloReplayComparison {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-06-29T00:00:00.000Z",
    strategies: results
  };
}

describe("historical Elo replay ordering", () => {
  it("captures pre-match ratings before updating the evaluated fixture", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: baseReplayMatches()
    });

    expect(result.fixtures).toHaveLength(2);
    const first = result.fixtures[0];
    const second = result.fixtures[1];

    expect(first?.matchId).toBe("2018-WC-001");
    expect(first?.homeElo).toBeGreaterThan(first?.awayElo ?? 0);
    expect(first?.homeRatingAfter).not.toBe(first?.homeElo);
    expect(second?.homeElo).toBe(first?.homeRatingAfter);
    expect(second?.awayElo).toBe(first?.awayRatingAfter);
  });

  it("uses deterministic date and ID ordering for same-time fixtures", () => {
    const unordered = [
      match("2018-WC-001", "2018-06-01", "Alpha", "Delta", 1, 0),
      match("TRAIN-B", "2017-01-01", "Alpha", "Charlie", 2, 0, { competition: "International Friendly" }),
      match("TRAIN-A", "2017-01-01", "Alpha", "Bravo", 2, 0, { competition: "International Friendly" })
    ];
    const reversed = [...unordered].reverse();

    const first = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: unordered
    }).fixtures[0];
    const second = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: reversed
    }).fixtures[0];

    expect(first?.homeElo).toBe(second?.homeElo);
    expect(first?.awayElo).toBe(second?.awayElo);
  });

  it("excludes duplicate fixture identities before replaying them twice", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: [
        ...baseReplayMatches(),
        match("DUP-001", "2017-01-01", "Alpha", "Bravo", 4, 0, { competition: "International Friendly" })
      ]
    });

    expect(result.diagnostics.duplicateCount).toBe(1);
    expect(result.exclusions.some((entry) => entry.reason === "duplicate_match")).toBe(true);
  });

  it("excludes WC2026 from historical replay input", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: [
        ...baseReplayMatches(),
        match("2026-WC-001", "2026-06-11", "Alpha", "Bravo", 2, 0)
      ]
    });

    expect(result.exclusions).toContainEqual({
      matchId: "2026-WC-001",
      reason: "wc2026_excluded",
      sourceDataset: "test_dataset"
    });
  });
});

describe("historical Elo replay dataset and weighting", () => {
  it("merges World Cup and expanded international fixtures through the comparison builder", () => {
    const comparison = buildHistoricalEloReplayComparison({
      generatedAt: "2026-06-29T00:00:00.000Z",
      foundationMatches: [match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0)],
      expandedInternationalMatches: [
        match("TRAIN-001", "2017-01-01", "Alpha", "Bravo", 2, 0, { competition: "International Friendly" }),
        match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0)
      ]
    });

    expect(comparison.strategies).toHaveLength(3);
    expect(comparison.strategies.find((entry) => entry.strategy === "world_cup_only_basic")?.dataset.sourceDatasets)
      .toEqual(["world_cup_foundation"]);
    expect(comparison.strategies.find((entry) => entry.strategy === "expanded_international_basic")?.dataset.sourceDatasets)
      .toEqual(["test_dataset"]);
  });

  it("preserves neutral venue and competition metadata on evaluated fixtures", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: [
        match("TRAIN-001", "2017-01-01", "Alpha", "Bravo", 2, 0, { competition: "International Friendly", neutral_site: false }),
        match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0, { competition: "FIFA World Cup 2018", neutral_site: true })
      ]
    });

    expect(result.fixtures[0]?.isNeutralVenue).toBe(true);
    expect(result.fixtures[0]?.competition).toBe("FIFA World Cup 2018");
    expect(result.fixtures[0]?.sourceDataset).toBe("test_dataset");
  });

  it("weighted strategy uses existing competition-sensitive weights", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_weighted",
      expandedInternationalMatches: [
        match("TRAIN-001", "2017-01-01", "Alpha", "Bravo", 1, 0, { competition: "International Friendly", neutral_site: false }),
        match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0, { competition: "FIFA World Cup 2018", neutral_site: true })
      ]
    });

    expect(result.fixtures[0]?.competitionWeight).toBe(4);
  });

  it("higher-weight competition changes ratings more than lower-weight competition", () => {
    const friendly = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_weighted",
      expandedInternationalMatches: [
        match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0, { competition: "International Friendly", neutral_site: true })
      ]
    }).fixtures[0];
    const worldCup = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_weighted",
      expandedInternationalMatches: [
        match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0, { competition: "FIFA World Cup 2018", neutral_site: true })
      ]
    }).fixtures[0];

    expect(Math.abs((worldCup?.homeRatingAfter ?? 0) - (worldCup?.homeElo ?? 0)))
      .toBeGreaterThan(Math.abs((friendly?.homeRatingAfter ?? 0) - (friendly?.homeElo ?? 0)));
  });
});

describe("historical Elo replay diagnostics", () => {
  it("calculates xG, modal, threshold, and percentile diagnostics without NaN", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_weighted",
      expandedInternationalMatches: baseReplayMatches()
    });
    const diagnostics = result.diagnostics;

    expect(diagnostics.uniquePreMatchEloPairCount).toBeGreaterThan(1);
    expect(diagnostics.uniqueBaselineXgPairCount).toBeGreaterThan(1);
    expect(diagnostics.thresholdCounts["50"]).toBeDefined();
    expect(diagnostics.modalOneOneFrequency).not.toBeNull();
    expect(Number.isNaN(diagnostics.averageAbsoluteEloGap)).toBe(false);
    expect(Number.isNaN(diagnostics.medianAbsoluteEloGap)).toBe(false);
  });

  it("is null-safe for empty evaluation datasets", () => {
    const result = buildHistoricalEloReplayStrategy({
      strategy: "expanded_international_basic",
      expandedInternationalMatches: [match("TRAIN-001", "2017-01-01", "Alpha", "Bravo", 1, 0)]
    });

    expect(result.diagnostics.acceptedFixtureCount).toBe(0);
    expect(result.diagnostics.minEloGap).toBeNull();
    expect(result.diagnostics.modalOneOneFrequency).toBeNull();
    expect(result.baselineMetrics.brierScore).toBeNull();
  });

  it("summarizes comparison diagnostics for CLI artifacts", () => {
    const comparison = makeComparison([
      makeStrategyResult("world_cup_only_basic", {}),
      makeStrategyResult("expanded_international_basic", {}),
      makeStrategyResult("expanded_international_weighted", {})
    ]);

    expect(summarizeHistoricalEloReplayDiagnostics(comparison)).toHaveLength(3);
  });
});

describe("historical Elo data-quality decision", () => {
  it("selects weighted replay when it clears all diversity gates", () => {
    const decision = makeHistoricalEloDataQualityDecision(makeComparison([
      makeStrategyResult("world_cup_only_basic", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 }),
      makeStrategyResult("expanded_international_basic", { uniqueModalScorelineCount: 2 }),
      makeStrategyResult("expanded_international_weighted", {})
    ]));

    expect(decision.decision).toBe("weighted_replay_ready");
    expect(decision.selectedStrategy).toBe("expanded_international_weighted");
  });

  it("falls back to expanded basic when weighted remains compressed", () => {
    const decision = makeHistoricalEloDataQualityDecision(makeComparison([
      makeStrategyResult("world_cup_only_basic", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 }),
      makeStrategyResult("expanded_international_basic", {}),
      makeStrategyResult("expanded_international_weighted", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 })
    ]));

    expect(decision.decision).toBe("expanded_basic_ready");
    expect(decision.selectedStrategy).toBe("expanded_international_basic");
  });

  it("reports replay compression when expanded strategies do not diversify", () => {
    const decision = makeHistoricalEloDataQualityDecision(makeComparison([
      makeStrategyResult("world_cup_only_basic", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 }),
      makeStrategyResult("expanded_international_basic", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 }),
      makeStrategyResult("expanded_international_weighted", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 })
    ]));

    expect(decision.decision).toBe("replay_still_compressed");
    expect(decision.selectedStrategy).toBeNull();
  });

  it("reports insufficient historical data", () => {
    const decision = makeHistoricalEloDataQualityDecision(makeComparison([
      makeStrategyResult("world_cup_only_basic", { acceptedFixtureCount: 10 }),
      makeStrategyResult("expanded_international_basic", { acceptedFixtureCount: 10 }),
      makeStrategyResult("expanded_international_weighted", { acceptedFixtureCount: 10 })
    ]));

    expect(decision.decision).toBe("historical_data_insufficient");
  });

  it("reports mapping quality blockers", () => {
    const decision = makeHistoricalEloDataQualityDecision(makeComparison([
      makeStrategyResult("world_cup_only_basic", { unresolvedTeamCount: 1 }),
      makeStrategyResult("expanded_international_basic", {}),
      makeStrategyResult("expanded_international_weighted", {})
    ]));

    expect(decision.decision).toBe("mapping_quality_blocked");
  });

  it("reports no-look-ahead failure before readiness", () => {
    const decision = makeHistoricalEloDataQualityDecision(makeComparison([
      makeStrategyResult("world_cup_only_basic", { noLookAheadFailures: 1 }),
      makeStrategyResult("expanded_international_basic", {}),
      makeStrategyResult("expanded_international_weighted", {})
    ]));

    expect(decision.decision).toBe("no_look_ahead_failure");
  });

  it("is deterministic for repeated inputs", () => {
    const comparison = makeComparison([
      makeStrategyResult("world_cup_only_basic", { uniqueModalScorelineCount: 1, modalOneOneFrequency: 1 }),
      makeStrategyResult("expanded_international_basic", {}),
      makeStrategyResult("expanded_international_weighted", {})
    ]);

    expect(makeHistoricalEloDataQualityDecision(comparison))
      .toEqual(makeHistoricalEloDataQualityDecision(comparison));
  });
});

describe("historical Elo replay compatibility", () => {
  it("preserves production constants and exposes the old world-cup-only diagnostic", () => {
    expect(HISTORICAL_ELO_REPLAY_CONSTANT_SNAPSHOT.defaultEloKFactor).toBe(DEFAULT_ELO_CONFIG.kFactor);
    expect(HISTORICAL_ELO_REPLAY_CONSTANT_SNAPSHOT.eloToXgAdjustmentPer100).toBe(ELO_TO_XG_ADJUSTMENT_PER_100);
    expect(HISTORICAL_ELO_REPLAY_CONSTANT_SNAPSHOT.eloToXgMaxAdjustment).toBe(ELO_TO_XG_MAX_ELO_ADJUSTMENT);

    const diagnostic = buildWorldCupOnlyProcessMatchesDiagnostic([
      match("2018-WC-001", "2018-06-01", "Alpha", "Bravo", 1, 0)
    ]);
    expect(diagnostic.matchHistory).toHaveLength(1);
  });
});
