# UI Elo Consistency Polish

Phase 10.2A polishes the dashboard UI so Live Elo, fallback seed ratings, and static foundation ratings are easier to understand and do not look inconsistent.

## Problems Addressed

1. **Raw float display** — Elo ratings like `1620.8566951497519` appeared in the Live Elo cards and match simulation results. Users could not read these as meaningful numbers.
2. **Fallback team confusion** — Haiti and other fallback teams showed a rank and rating (1500) in match simulation results with no indication that the rating was uncalibrated.
3. **"Teams rated" count ambiguity** — The stat card showed how many teams are in the curated dataset but was labeled "Teams rated", which conflicted with the Auto Predict note that 48 WC teams are supported.
4. **Scale difference between sections** — The Team Ratings section uses static integer seed ratings (e.g., 1850) while the Live Elo section uses computed floats. Users could confuse the two.
5. **Live Elo section lacked WC 2026 coverage note** — Nothing in the Live Elo section explained that Auto Predict supports more teams than the curated dataset.

## Changes

### `apps/web/src/lib/api-client.ts`

Added `formatElo(value: number): string` — rounds Elo values to the nearest whole number for display. Does not change the underlying model or API values.

### `apps/web/src/components/LiveEloRatingCard.tsx`

Uses `formatElo` to display `entry.eloRating` as a whole number instead of a raw float.

### `apps/web/src/components/LiveEloRatingsSection.tsx`

- Uses `formatElo` for `liveEloRatings.topEloRating` in the summary stat card.
- Renamed "Teams rated" stat card to "Teams in dataset" with caption "Curated dataset · N shown" to clarify it counts the curated pipeline entries, not all supported teams.
- Added a sentence to the amber warning banner explaining that Auto Predict covers all 48 expected WC 2026 teams and that teams not in the dataset use a fallback seed rating of 1500.

### `apps/web/src/components/MatchSimulationResults.tsx`

- Uses `formatElo` for `result.liveElo.homeEloRating` and `result.liveElo.awayEloRating`.
- Suppresses rank display for fallback teams (`homeRatingSource === "fallback_seed"` / `awayRatingSource === "fallback_seed"`).
- Shows an amber note "Fallback seed rating — not in the Live Elo dataset. Prediction is illustrative only." when any team in the match is a fallback seed team.

### `apps/web/src/components/TeamRatingsSection.tsx`

- Changed eyebrow from "Team ratings" to "Static contender ratings".
- Updated section description to state these are static seed ratings separate from the Live Elo pipeline.
- Added a footer note: "These are static contender ratings and are not updated by the Live Elo pipeline. See the Live Elo section for computed match-history ratings."

### `apps/web/tests/e2e/match-simulation.spec.ts`

Updated test 13 (Haiti vs Scotland) to also assert the fallback seed indicator: `resultsSection.getByText(/Fallback seed rating/)`.

## Constraints

- No model, API, or data logic was modified.
- No new dependencies were added.
- Underlying Elo values are unchanged — only their display format changed.
- All existing tests remain valid and no assertions were weakened.
