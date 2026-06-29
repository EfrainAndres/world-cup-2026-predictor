import { aggregateOutcomeProbabilities } from "./probability.js";
import type {
  MatchOutcome,
  OutcomeProbabilities,
  RecommendedOutcomeSelection,
  RecommendedScoreReason,
  ScorelineCandidate,
  ScorelineDiversitySummary,
  ScorelinePresentation,
  ScorelineProbability
} from "./types.js";

export const RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD = 0.02;

function getScorelineOutcome(homeGoals: number, awayGoals: number): MatchOutcome {
  if (homeGoals > awayGoals) return "home_win";
  if (homeGoals < awayGoals) return "away_win";
  return "draw";
}

// Deterministic sort: probability desc → lower total goals → smaller absolute GD → home asc → away asc
function compareScorelinesByPriority(a: ScorelineProbability, b: ScorelineProbability): number {
  if (b.probability !== a.probability) return b.probability - a.probability;
  const aTotalGoals = a.homeGoals + a.awayGoals;
  const bTotalGoals = b.homeGoals + b.awayGoals;
  if (aTotalGoals !== bTotalGoals) return aTotalGoals - bTotalGoals;
  const aGD = Math.abs(a.homeGoals - a.awayGoals);
  const bGD = Math.abs(b.homeGoals - b.awayGoals);
  if (aGD !== bGD) return aGD - bGD;
  if (a.homeGoals !== b.homeGoals) return a.homeGoals - b.homeGoals;
  return a.awayGoals - b.awayGoals;
}

export function selectRecommendedOutcome(
  outcomeProbabilities: OutcomeProbabilities
): RecommendedOutcomeSelection {
  const { homeWinProbability, drawProbability, awayWinProbability } = outcomeProbabilities;

  const entries: Array<{ outcome: MatchOutcome; prob: number }> = (
    [
      { outcome: "home_win" as const, prob: homeWinProbability },
      { outcome: "draw" as const, prob: drawProbability },
      { outcome: "away_win" as const, prob: awayWinProbability }
    ] satisfies Array<{ outcome: MatchOutcome; prob: number }>
  ).sort((a, b) => b.prob - a.prob);

  const best = entries[0]!;
  const second = entries[1]!;
  const isNearTie = best.prob - second.prob <= RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD;

  return {
    recommendedOutcome: best.outcome,
    isNearTie,
    nearTieThreshold: RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD,
    drawIsMostLikely: best.outcome === "draw"
  };
}

function buildDiversitySummary(
  allCandidates: readonly ScorelineCandidate[],
  modal: ScorelineCandidate,
  recommended: ScorelineCandidate
): ScorelineDiversitySummary {
  const top5 = allCandidates.slice(0, 5);
  const top1Prob = top5[0]?.probability ?? 0;
  const top2Prob = top5[1]?.probability ?? 0;
  return {
    uniqueScorelineCount: allCandidates.length,
    top1CumulativeProbability: top1Prob,
    top3CumulativeProbability: top5.slice(0, 3).reduce((s, c) => s + c.probability, 0),
    top5CumulativeProbability: top5.reduce((s, c) => s + c.probability, 0),
    top1To2Gap: top5.length >= 2 ? top1Prob - top2Prob : top1Prob,
    modalAndRecommendedAlign: modal.outcome === recommended.outcome,
    recommendedIsModal: modal.homeGoals === recommended.homeGoals && modal.awayGoals === recommended.awayGoals
  };
}

export function selectRecommendedScoreline(input: {
  scoreMatrix: readonly ScorelineProbability[];
  topN?: number;
}): ScorelinePresentation {
  const { scoreMatrix, topN = 5 } = input;

  const outcomeProbabilities = aggregateOutcomeProbabilities(scoreMatrix);
  const outcomeSelection = selectRecommendedOutcome(outcomeProbabilities);
  const { recommendedOutcome, isNearTie, drawIsMostLikely } = outcomeSelection;

  const sorted = [...scoreMatrix].sort(compareScorelinesByPriority);

  const outcomeCounts: Record<MatchOutcome, number> = { home_win: 0, draw: 0, away_win: 0 };
  const candidates: ScorelineCandidate[] = sorted.map((s, i) => {
    const outcome = getScorelineOutcome(s.homeGoals, s.awayGoals);
    outcomeCounts[outcome]++;
    return {
      homeGoals: s.homeGoals,
      awayGoals: s.awayGoals,
      probability: s.probability,
      outcome,
      rankOverall: i + 1,
      rankWithinOutcome: outcomeCounts[outcome]
    };
  });

  const modalCandidate = candidates[0]!;

  let recommendedCandidate: ScorelineCandidate;
  let recommendationReason: RecommendedScoreReason;

  if (modalCandidate.outcome === recommendedOutcome) {
    recommendedCandidate = modalCandidate;
    if (isNearTie) {
      recommendationReason = "outcome_probabilities_near_tied";
    } else if (drawIsMostLikely) {
      recommendationReason = "draw_is_most_likely_outcome";
    } else {
      recommendationReason = "modal_matches_most_likely_outcome";
    }
  } else {
    const bestWithinOutcome = candidates.find(c => c.outcome === recommendedOutcome);
    if (bestWithinOutcome !== undefined) {
      recommendedCandidate = bestWithinOutcome;
      recommendationReason = isNearTie
        ? "outcome_probabilities_near_tied"
        : "selected_top_scoreline_for_most_likely_outcome";
    } else {
      recommendedCandidate = modalCandidate;
      recommendationReason = "fallback_to_modal";
    }
  }

  const topScorelines = candidates.slice(0, topN);
  const diversitySummary = buildDiversitySummary(candidates, modalCandidate, recommendedCandidate);

  return {
    modalExactScore: modalCandidate,
    recommendedScore: recommendedCandidate,
    topScorelines,
    recommendedOutcome,
    recommendationReason,
    diversitySummary
  };
}
