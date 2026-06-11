# Team Ratings Dashboard

Phase 6.5 adds a team ratings section to the dashboard showing strength information for the top World Cup 2026 contenders.

## Purpose

The team ratings section makes team strength visible on the dashboard before a live model-derived ratings handler exists. It uses a static foundation of approximate Elo-based seed ratings to give readers a clear picture of relative team quality — framed explicitly as illustrative data, not a live model or official FIFA ranking.

## Current UI

The dashboard now includes a team ratings section with:

- Section header and description explaining the foundation scope.
- Foundation warning banner (amber) clearly stating the data is not derived from a live model.
- Five summary stat cards:
  - Teams rated count.
  - Top Elo rating with team name.
  - Average Elo across the top 10.
  - Strongest offense indicator with score and team name (teal highlight).
  - Strongest defense indicator with score and team name (teal highlight).
- Grid of 10 `TeamRatingCard` components (one per contender), responsive across breakpoints.
- Rating source note at the bottom.

## Components

| Component | Purpose |
| --- | --- |
| `TeamRatingsSection` | Section wrapper with header, warning, summary stats, and card grid. |
| `TeamRatingCard` | Individual team card with rank, name, Elo rating, tier pill, offense/defense scores, and summary. |

Both components are pure — they receive all data through props. No model or data package is imported inside components.

## Rating Tier System

| Tier | Elo Range | StatusPill Tone |
| --- | --- | --- |
| Elite | 1800+ | success (teal) |
| Strong | 1700–1799 | neutral (slate) |
| Competitive | 1600–1699 | warning (amber) |

## Static Foundation Data

The current data in `FOUNDATION_TEAM_RATINGS` (in `apps/web/src/lib/api-client.ts`) covers the top 10 contenders:

| Rank | Team | Elo | Tier | Offense | Defense |
| --- | --- | --- | --- | --- | --- |
| 1 | Argentina | 1870 | Elite | 88 | 82 |
| 2 | France | 1855 | Elite | 85 | 90 |
| 3 | Spain | 1840 | Elite | 88 | 84 |
| 4 | England | 1825 | Elite | 84 | 80 |
| 5 | Brazil | 1818 | Elite | 90 | 78 |
| 6 | Portugal | 1800 | Elite | 84 | 76 |
| 7 | Germany | 1786 | Strong | 82 | 80 |
| 8 | Netherlands | 1772 | Strong | 80 | 78 |
| 9 | Belgium | 1758 | Strong | 82 | 76 |
| 10 | Italy | 1742 | Strong | 74 | 88 |

Strongest offense: **Brazil** (90/100)
Strongest defense: **France** (90/100)
Average Elo (top 10): **1807**

These values are approximate seed ratings derived from historical World Cup results and general team reputation. They are **not** calibrated from live match data, official FIFA rankings, or a trained model.

## Data Sources

| Prop | Source |
| --- | --- |
| `teamRatings` | `snapshot.teamRatings` — `FOUNDATION_TEAM_RATINGS` constant from `apps/web/src/lib/api-client.ts` |

`FOUNDATION_TEAM_RATINGS` is a typed constant exported from the API client wrapper. No model or data package is called from within the component tree.

## Boundaries

Phase 6.5 does not add:

- A live team ratings API handler.
- Charts or rating bar visuals.
- Authentication.
- Database storage.
- External data services.
- New model or data package behavior.
- External UI libraries.

## Accuracy Framing

The section and each card clearly label the data as a foundation preview. The amber warning banner and the rating source note at the bottom ensure no reader mistakes these ratings for a calibrated model output or official standings.

## Next Steps

Future phases can:

- Add a `getTeamRatings()` API handler that derives ratings from the existing `processMatches` / `getCurrentTeamRatings` model helpers using the historical fixture dataset.
- Replace the static constant with a live call once a handler is available.
- Expand coverage to all 48 FIFA 2026 qualified teams.
- Add a rating trend (up/down) indicator once multi-year Elo history is available.
- Add group assignment once the FIFA 2026 group draw is finalized.
