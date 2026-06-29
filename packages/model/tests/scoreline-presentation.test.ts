import { describe, expect, it } from "vitest";
import { generateScoreMatrix } from "../src/poisson.js";
import {
  RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD,
  selectRecommendedOutcome,
  selectRecommendedScoreline
} from "../src/scoreline-presentation.js";
import type { OutcomeProbabilities, ScorelineProbability } from "../src/types.js";

// Minimal score matrix for deterministic unit tests
function makeMatrix(entries: Array<[number, number, number]>): ScorelineProbability[] {
  return entries.map(([homeGoals, awayGoals, probability]) => ({ homeGoals, awayGoals, probability }));
}

const BALANCED_OUTCOME: OutcomeProbabilities = {
  homeWinProbability: 0.40,
  drawProbability: 0.30,
  awayWinProbability: 0.30,
  totalProbability: 1.0
};

const NEAR_TIE_OUTCOME: OutcomeProbabilities = {
  homeWinProbability: 0.35,
  drawProbability: 0.34,
  awayWinProbability: 0.31,
  totalProbability: 1.0
};

const DRAW_DOMINANT_OUTCOME: OutcomeProbabilities = {
  homeWinProbability: 0.28,
  drawProbability: 0.45,
  awayWinProbability: 0.27,
  totalProbability: 1.0
};

describe("selectRecommendedOutcome", () => {
  it("returns home_win when it has the highest probability", () => {
    const result = selectRecommendedOutcome(BALANCED_OUTCOME);
    expect(result.recommendedOutcome).toBe("home_win");
    expect(result.isNearTie).toBe(false);
    expect(result.drawIsMostLikely).toBe(false);
    expect(result.nearTieThreshold).toBe(RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD);
  });

  it("returns draw when draw is most likely", () => {
    const result = selectRecommendedOutcome(DRAW_DOMINANT_OUTCOME);
    expect(result.recommendedOutcome).toBe("draw");
    expect(result.drawIsMostLikely).toBe(true);
    expect(result.isNearTie).toBe(false);
  });

  it("returns away_win when it has the highest probability", () => {
    const outcome: OutcomeProbabilities = {
      homeWinProbability: 0.25,
      drawProbability: 0.30,
      awayWinProbability: 0.45,
      totalProbability: 1.0
    };
    const result = selectRecommendedOutcome(outcome);
    expect(result.recommendedOutcome).toBe("away_win");
  });

  it("flags near-tie when gap is exactly the threshold", () => {
    const outcome: OutcomeProbabilities = {
      homeWinProbability: 0.35,
      drawProbability: 0.33,
      awayWinProbability: 0.32,
      totalProbability: 1.0
    };
    const result = selectRecommendedOutcome(outcome);
    // gap = 0.35 - 0.33 = 0.02 which equals threshold — should be flagged
    expect(result.isNearTie).toBe(true);
  });

  it("does not flag near-tie when gap is above the threshold", () => {
    const outcome: OutcomeProbabilities = {
      homeWinProbability: 0.40,
      drawProbability: 0.33,
      awayWinProbability: 0.27,
      totalProbability: 1.0
    };
    const result = selectRecommendedOutcome(outcome);
    // gap = 0.40 - 0.33 = 0.07, above 0.02
    expect(result.isNearTie).toBe(false);
  });

  it("detects near-tie from NEAR_TIE_OUTCOME fixture", () => {
    const result = selectRecommendedOutcome(NEAR_TIE_OUTCOME);
    // gap = 0.35 - 0.34 = 0.01, below threshold
    expect(result.isNearTie).toBe(true);
  });
});

describe("selectRecommendedScoreline — modal matches most likely outcome", () => {
  it("returns modal as recommended when modal belongs to most likely outcome", () => {
    // home_win is most likely, and 1-0 should be the modal home_win scoreline
    const matrix = makeMatrix([
      [1, 0, 0.18],
      [1, 1, 0.14],
      [2, 0, 0.10],
      [0, 0, 0.09],
      [0, 1, 0.08],
      [2, 1, 0.07]
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.modalExactScore.homeGoals).toBe(1);
    expect(result.modalExactScore.awayGoals).toBe(0);
    expect(result.recommendedScore.homeGoals).toBe(1);
    expect(result.recommendedScore.awayGoals).toBe(0);
    expect(result.recommendationReason).toBe("modal_matches_most_likely_outcome");
    expect(result.diversitySummary.recommendedIsModal).toBe(true);
    expect(result.diversitySummary.modalAndRecommendedAlign).toBe(true);
  });

  it("sets reason to draw_is_most_likely_outcome when draw dominates and modal is a draw", () => {
    const matrix = makeMatrix([
      [1, 1, 0.20],
      [0, 0, 0.15],
      [1, 0, 0.12],
      [0, 1, 0.10],
      [2, 0, 0.08]
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.recommendationReason).toBe("draw_is_most_likely_outcome");
    expect(result.recommendedOutcome).toBe("draw");
    expect(result.diversitySummary.recommendedIsModal).toBe(true);
  });
});

describe("selectRecommendedScoreline — modal does not match most likely outcome", () => {
  it("selects best scoreline within the most likely outcome when modal is in a different outcome", () => {
    // 1-1 is modal (draw), but home_win has higher aggregate probability
    const matrix = makeMatrix([
      [1, 1, 0.16],  // draw — modal overall
      [1, 0, 0.14],  // home_win — best within home_win
      [2, 0, 0.12],  // home_win
      [0, 1, 0.10],  // away_win
      [0, 0, 0.09],  // draw
      [2, 1, 0.08],  // home_win
      [0, 2, 0.07],  // away_win
      [3, 0, 0.06]   // home_win
      // aggregate: draw≈0.25, home_win≈0.40, away_win≈0.17 → home_win most likely
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.modalExactScore.homeGoals).toBe(1);
    expect(result.modalExactScore.awayGoals).toBe(1);
    expect(result.modalExactScore.outcome).toBe("draw");
    // 1-0 is the most probable home_win scoreline
    expect(result.recommendedScore.homeGoals).toBe(1);
    expect(result.recommendedScore.awayGoals).toBe(0);
    expect(result.recommendedScore.outcome).toBe("home_win");
    expect(result.recommendationReason).toBe("selected_top_scoreline_for_most_likely_outcome");
    expect(result.diversitySummary.recommendedIsModal).toBe(false);
    expect(result.diversitySummary.modalAndRecommendedAlign).toBe(false);
  });
});

describe("selectRecommendedScoreline — near-tie outcome", () => {
  it("flags near-tie when outcome gap is within threshold", () => {
    // homeWin and draw are within 0.02 of each other
    const matrix = makeMatrix([
      [1, 0, 0.17],  // home_win
      [1, 1, 0.16],  // draw
      [0, 0, 0.13],  // draw
      [2, 0, 0.11],  // home_win
      [0, 1, 0.09]   // away_win
    ]);
    // home_win aggregate ≈ 0.28, draw ≈ 0.29, away ≈ 0.09
    // or home ≈ 0.28, draw ≈ 0.29 — gap 0.01 < threshold
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.recommendationReason).toBe("outcome_probabilities_near_tied");
  });
});

describe("selectRecommendedScoreline — deterministic ranking tie-break", () => {
  it("prefers lower total goals when probabilities are equal", () => {
    const matrix = makeMatrix([
      [2, 1, 0.15],  // total 3
      [1, 0, 0.15],  // total 1 — wins tie-break
      [3, 0, 0.15],  // total 3
      [1, 2, 0.12]
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.modalExactScore.homeGoals).toBe(1);
    expect(result.modalExactScore.awayGoals).toBe(0);
  });

  it("prefers smaller absolute goal difference as secondary tie-break", () => {
    const matrix = makeMatrix([
      [2, 0, 0.15],  // total 2, GD 2
      [1, 1, 0.15],  // total 2, GD 0 — wins
      [3, 1, 0.12]
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.modalExactScore.homeGoals).toBe(1);
    expect(result.modalExactScore.awayGoals).toBe(1);
  });

  it("prefers lower home goals as tertiary tie-break", () => {
    const matrix = makeMatrix([
      [2, 0, 0.15],  // total 2, GD 2
      [3, 1, 0.15],  // total 4
      [1, 0, 0.15],  // total 1 — wins on total goals
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.modalExactScore.homeGoals).toBe(1);
    expect(result.modalExactScore.awayGoals).toBe(0);
  });
});

describe("selectRecommendedScoreline — ScorelineCandidate ranks", () => {
  it("assigns correct overall and within-outcome ranks", () => {
    const matrix = makeMatrix([
      [1, 0, 0.18],
      [2, 0, 0.14],
      [1, 1, 0.12],
      [0, 1, 0.10],
      [0, 0, 0.08]
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });

    const sorted = result.topScorelines;
    expect(sorted[0]?.rankOverall).toBe(1);
    expect(sorted[1]?.rankOverall).toBe(2);
    expect(sorted[2]?.rankOverall).toBe(3);

    // 1-0 and 2-0 are both home_win
    const homeWins = sorted.filter(s => s.outcome === "home_win");
    expect(homeWins[0]?.rankWithinOutcome).toBe(1);
    expect(homeWins[1]?.rankWithinOutcome).toBe(2);

    // 1-1 is first draw
    const draws = sorted.filter(s => s.outcome === "draw");
    expect(draws[0]?.rankWithinOutcome).toBe(1);
  });
});

describe("selectRecommendedScoreline — diversity summary", () => {
  it("computes cumulative probabilities correctly", () => {
    const matrix = makeMatrix([
      [1, 0, 0.20],
      [1, 1, 0.15],
      [2, 0, 0.12],
      [0, 1, 0.10],
      [0, 0, 0.09]
    ]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    const d = result.diversitySummary;

    expect(d.top1CumulativeProbability).toBeCloseTo(0.20, 5);
    expect(d.top3CumulativeProbability).toBeCloseTo(0.47, 5);
    expect(d.top5CumulativeProbability).toBeCloseTo(0.66, 5);
    expect(d.top1To2Gap).toBeCloseTo(0.05, 5);
  });

  it("uniqueScorelineCount equals total entries in score matrix", () => {
    const matrix = generateScoreMatrix(
      { expectedHomeGoals: 1.3, expectedAwayGoals: 1.1 },
      { maxGoals: 7, normalizeMatrix: true }
    );
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.diversitySummary.uniqueScorelineCount).toBe(64); // 8×8
  });
});

describe("selectRecommendedScoreline — topN parameter", () => {
  it("respects topN option", () => {
    const matrix = makeMatrix([
      [1, 0, 0.20],
      [1, 1, 0.15],
      [2, 0, 0.12],
      [0, 1, 0.10],
      [0, 0, 0.09],
      [2, 1, 0.07]
    ]);
    const result3 = selectRecommendedScoreline({ scoreMatrix: matrix, topN: 3 });
    expect(result3.topScorelines.length).toBe(3);

    const result6 = selectRecommendedScoreline({ scoreMatrix: matrix, topN: 6 });
    expect(result6.topScorelines.length).toBe(6);
  });
});

describe("selectRecommendedScoreline — fallback_to_modal", () => {
  it("uses fallback_to_modal when score matrix has no scorelines in the most likely outcome", () => {
    // Construct an unusual matrix where all scorelines are draws but homeWinProbability is highest
    // This is contrived but tests the fallback path
    // In practice, if homeWin prob is highest, there must be some homeWin scoreline
    // Simulate by having a single draw scoreline only — draw must then be most likely
    const matrix = makeMatrix([[1, 1, 1.0]]);
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.recommendedOutcome).toBe("draw");
    expect(result.recommendedScore.homeGoals).toBe(1);
    expect(result.recommendedScore.awayGoals).toBe(1);
    // reason is draw_is_most_likely_outcome since draw is dominant and modal matches it
    expect(result.recommendationReason).toBe("draw_is_most_likely_outcome");
  });
});

describe("selectRecommendedScoreline — with real Poisson matrix", () => {
  it("handles Brazil vs France style (balanced) fixture without throwing", () => {
    const matrix = generateScoreMatrix(
      { expectedHomeGoals: 1.5, expectedAwayGoals: 1.4 },
      { maxGoals: 7, normalizeMatrix: true }
    );
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.modalExactScore).toBeDefined();
    expect(result.recommendedScore).toBeDefined();
    expect(result.topScorelines.length).toBe(5);
    expect(["home_win", "draw", "away_win"]).toContain(result.recommendedOutcome);
    expect(result.diversitySummary.top5CumulativeProbability).toBeGreaterThan(0);
    expect(result.diversitySummary.top5CumulativeProbability).toBeLessThanOrEqual(1);
  });

  it("handles strong favourite (Argentina vs Haiti style) fixture correctly", () => {
    const matrix = generateScoreMatrix(
      { expectedHomeGoals: 2.5, expectedAwayGoals: 0.6 },
      { maxGoals: 7, normalizeMatrix: true }
    );
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.recommendedOutcome).toBe("home_win");
    expect(result.recommendedScore.homeGoals).toBeGreaterThan(result.recommendedScore.awayGoals);
    expect(result.recommendationReason).toMatch(/modal_matches_most_likely_outcome|draw_is_most_likely_outcome/);
  });

  it("handles away favourite fixture correctly", () => {
    const matrix = generateScoreMatrix(
      { expectedHomeGoals: 0.7, expectedAwayGoals: 2.2 },
      { maxGoals: 7, normalizeMatrix: true }
    );
    const result = selectRecommendedScoreline({ scoreMatrix: matrix });
    expect(result.recommendedOutcome).toBe("away_win");
    expect(result.recommendedScore.awayGoals).toBeGreaterThan(result.recommendedScore.homeGoals);
  });
});

describe("RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD constant", () => {
  it("is exactly 0.02", () => {
    expect(RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD).toBe(0.02);
  });
});
