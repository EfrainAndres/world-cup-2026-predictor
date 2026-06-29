# Recommended Score and Scoreline Diversity

Phase 12.20E adds a presentation-layer selection function that surfaces the most useful scoreline prediction from an existing Poisson score matrix. No model constants, Elo ratings, or probabilities are modified.

## Motivation

The Poisson model produces a full score matrix. The modal exact score — the highest-probability individual scoreline — is sometimes in a minority outcome. For example, when the aggregate 1X2 probabilities favour a home win but `1-1` is the single highest-probability scoreline because draw probabilities are spread across many cells, the modal score misleads rather than guides the viewer.

The recommended score is the most probable scoreline within the most likely aggregate 1X2 outcome, addressing this discrepancy.

## Types

### `ScorelineCandidate`

```typescript
interface ScorelineCandidate {
  homeGoals: number;
  awayGoals: number;
  probability: number;
  outcome: MatchOutcome;           // "home_win" | "draw" | "away_win"
  rankOverall: number;             // position in the globally sorted matrix
  rankWithinOutcome: number;       // position among scorelines of the same outcome
}
```

### `ScorelinePresentation`

```typescript
interface ScorelinePresentation {
  modalExactScore: ScorelineCandidate;
  recommendedScore: ScorelineCandidate;
  topScorelines: ScorelineCandidate[];
  recommendedOutcome: MatchOutcome;
  recommendationReason: RecommendedScoreReason;
  diversitySummary: ScorelineDiversitySummary;
}
```

### `RecommendedScoreReason`

| Value | When set |
| --- | --- |
| `modal_matches_most_likely_outcome` | Modal scoreline already belongs to the most likely 1X2 outcome and the outcome is not a draw and outcomes are not near-tied |
| `draw_is_most_likely_outcome` | Draw aggregate probability is highest |
| `selected_top_scoreline_for_most_likely_outcome` | Modal belongs to a different outcome; best scoreline within the most likely outcome is selected |
| `outcome_probabilities_near_tied` | The gap between the first and second ranked outcome is ≤ `RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD` (0.02) |
| `fallback_to_modal` | No scorelines exist within the most likely outcome (highly contrived edge case) |

### `ScorelineDiversitySummary`

```typescript
interface ScorelineDiversitySummary {
  uniqueScorelineCount: number;
  top1CumulativeProbability: number;
  top3CumulativeProbability: number;
  top5CumulativeProbability: number;
  top1To2Gap: number;
  modalAndRecommendedAlign: boolean;  // same 1X2 outcome
  recommendedIsModal: boolean;        // exact same scoreline
}
```

## Selection Algorithm

### `selectRecommendedOutcome`

1. Collect the three aggregate outcome probabilities.
2. Sort descending by probability.
3. If the gap between the highest and second-highest probability is ≤ 0.02, set `isNearTie = true`.
4. Return the highest-probability outcome.

### `selectRecommendedScoreline`

1. Run `aggregateOutcomeProbabilities` on the score matrix.
2. Run `selectRecommendedOutcome` to identify the recommended 1X2 outcome.
3. Sort the full score matrix with the deterministic comparator.
4. Assign `rankOverall` and `rankWithinOutcome` to every scoreline.
5. The modal score is `rankOverall = 1`.
6. If `modalExactScore.outcome === recommendedOutcome`: recommended score equals modal score.
7. Otherwise: find the first candidate with `outcome === recommendedOutcome`. That is the recommended score.
8. If no candidate exists for the recommended outcome: use modal and set reason `fallback_to_modal`.
9. Set `recommendationReason` based on near-tie, draw-dominant, or standard paths.
10. Compute `diversitySummary`.

### Deterministic tie-break

When two scorelines have equal probability, the following comparators are applied in order:

1. Lower total goals (home + away) — compactness preference
2. Smaller absolute goal difference — closeness preference
3. Fewer home goals — neutral within same total
4. Fewer away goals — final stable sort key

This produces a unique, reproducible rank for every pair of scorelines regardless of matrix ordering.

## API Integration

`PredictMatchFromLiveEloSuccessResponse` includes an optional `scorelinePresentation` field of type `ScorelinePresentation`. It is always present for live Elo predictions, optional for baseline simulations.

The existing `mostLikelyScorelines` and `outcomeProbabilities` fields are unchanged. `scorelinePresentation` is additive and backward compatible.

## Constants

| Name | Value | Purpose |
| --- | --- | --- |
| `RECOMMENDED_OUTCOME_NEAR_TIE_THRESHOLD` | `0.02` | Maximum gap between first and second outcome probability to flag a near-tie |

## Invariants

- Probabilities are not modified. The function reads the score matrix and aggregates; it never writes back to it.
- Elo ratings, xG constants, Poisson parameters, and all other model inputs are untouched.
- The modal exact score is always preserved in `ScorelinePresentation.modalExactScore`, even when `recommendedScore` differs.
- The ranking is deterministic: the same score matrix always produces the same `ScorelinePresentation`.

## Limitations

- The recommended score is the most probable single scoreline within the most likely outcome, not the conditional mode. These are equivalent when the matrix is Poisson, but the algorithm does not assume it.
- Near-tie detection uses a flat probability-difference threshold, not a statistical significance test.
- `topN` defaults to 5. The full score matrix (64 entries for `maxGoals=7`) is sorted internally, but only `topN` scorelines are included in the response.
