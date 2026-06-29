# Recommended Score Presentation

Phase 12.20E adds a `ScorelinePresentationSection` component to the match prediction UI that replaces the plain "Most likely scorelines" list with a structured recommended-score hierarchy.

## Information Hierarchy

### 1. Recommended score (primary)

The most probable scoreline within the most likely 1X2 outcome. Displayed in the indigo card at the top left of the scoreline section.

Shown with:
- Score in large text (e.g. `2–1`)
- Probability as a percentage
- "rec." badge in the top-scorelines list

### 2. Modal exact score (secondary, only when it differs)

The single highest-probability scoreline across all outcomes. Shown in the slate card when the recommended score is not the modal score.

When `diversitySummary.recommendedIsModal` is `true`, the secondary card is replaced by a quiet note indicating they are the same.

### 3. Most likely outcome label

Shown as an inline chip next to the section heading. Example: `Most likely outcome: Brazil win`.

### 4. Recommendation reason

A single sentence below the score cards explaining why the recommended score was chosen or why it differs from the modal.

| Reason | Explanation shown |
| --- | --- |
| `modal_matches_most_likely_outcome` | "The most likely scoreline also belongs to the most likely match outcome." |
| `selected_top_scoreline_for_most_likely_outcome` | "The modal score is in a different outcome. This is the most probable scoreline within the most likely outcome (X)." |
| `outcome_probabilities_near_tied` | "The outcome probabilities are closely matched. Shown as the modal exact score." |
| `draw_is_most_likely_outcome` | "A draw is the most likely outcome. Recommended scoreline is the most probable draw." |
| `fallback_to_modal` | "No scorelines found within the most likely outcome. Showing modal as fallback." |

### 5. Top scorelines list

Up to 5 scorelines in a two-column grid, sorted by the deterministic comparator (probability desc → lower total goals → smaller GD → home goals asc → away goals asc).

Each row shows:
- Score
- `rec.` badge (indigo) on the recommended score
- `modal` badge (slate) on the modal score when different from recommended
- Probability percentage

### 6. Diversity footnote

A single compact line below the list:
`Top 5 cumulative: X% · Top-2 gap: Y%`

## Component Location

`apps/web/src/components/MatchSimulationResults.tsx`

The section renders only when `result.scorelinePresentation` is defined (live Elo predictions). Baseline simulations continue to render the plain `mostLikelyScorelines` list.

## Interaction with StatsBomb Mode

The `scorelinePresentation` is computed from the authoritative score matrix, whether baseline or StatsBomb-enriched. When StatsBomb is active and applied, the matrix already incorporates the enriched xG, so the recommended score reflects the enriched signal without additional logic.

## Design Notes

- The indigo accent is reserved for the recommended score only. All other elements use slate.
- The "modal" badge uses slate, not a warning tone — the modal is not wrong, it is simply a different framing of the same data.
- No error states: when `scorelinePresentation` is absent the component falls back to the previous plain list silently.
