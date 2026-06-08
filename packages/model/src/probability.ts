import type { OutcomeProbabilities, ScorelineProbability } from "./types.js";

function validateScorelineProbability(scoreline: ScorelineProbability): void {
  if (!Number.isInteger(scoreline.homeGoals) || scoreline.homeGoals < 0) {
    throw new Error("homeGoals must be a non-negative integer.");
  }

  if (!Number.isInteger(scoreline.awayGoals) || scoreline.awayGoals < 0) {
    throw new Error("awayGoals must be a non-negative integer.");
  }

  if (!Number.isFinite(scoreline.probability) || scoreline.probability < 0) {
    throw new Error("scoreline probability must be finite and non-negative.");
  }
}

export function aggregateOutcomeProbabilities(scoreMatrix: readonly ScorelineProbability[]): OutcomeProbabilities {
  if (scoreMatrix.length === 0) {
    throw new Error("scoreMatrix must include at least one scoreline.");
  }

  let homeWinProbability = 0;
  let drawProbability = 0;
  let awayWinProbability = 0;

  for (const scoreline of scoreMatrix) {
    validateScorelineProbability(scoreline);

    if (scoreline.homeGoals > scoreline.awayGoals) {
      homeWinProbability += scoreline.probability;
    } else if (scoreline.homeGoals === scoreline.awayGoals) {
      drawProbability += scoreline.probability;
    } else {
      awayWinProbability += scoreline.probability;
    }
  }

  return {
    homeWinProbability,
    drawProbability,
    awayWinProbability,
    totalProbability: homeWinProbability + drawProbability + awayWinProbability
  };
}

export function getMostLikelyScorelines(scoreMatrix: readonly ScorelineProbability[], limit = 5): ScorelineProbability[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer.");
  }

  for (const scoreline of scoreMatrix) {
    validateScorelineProbability(scoreline);
  }

  return [...scoreMatrix]
    .sort((a, b) => b.probability - a.probability || a.homeGoals - b.homeGoals || a.awayGoals - b.awayGoals)
    .slice(0, limit);
}
