# World Cup 2026 Dashboard Ordering & Section Cleanup

Phase 11.5 reorders the dashboard sections from a chronological simulation order to a summary-first / inverted-knockout flow. No new prediction logic, API handlers, or schemas are added.

## Problem

Prior to Phase 11.5, the dashboard rendered sections in the order they were implemented:
1. Hero / model evidence
2. Live Elo / Team Ratings
3. Groups / Standings / R32 / Bracket
4. Tournament Projection Overview
5. R32 Simulation → R16 Simulation → R16 Match Sim → QF → QF Match Sim → SF → SF Match Sim → Final → Final Match Sim
6. Champion Projection Summary
7. Knockout Winner Resolution
8. Third Place Match + Simulation

This order places the most compelling projection content (champion, final) far below the fold and buries it after all the incremental simulation detail.

## Solution

Reorder to **summary-first / inverted-knockout**: show the headline projection result first, then drill down into each round from the most recent round backwards.

## New Section Order

| Position | Section | Caption |
| --- | --- | --- |
| 1 | Hero intro + model evidence + match form + Live Elo + Team Ratings | — |
| 2 | TournamentProjectionOverviewSection | Summary |
| 3 | WorldCupChampionProjectionSummarySection | Summary |
| 4 | WorldCupFinalMatchSimulationSection | Projected final |
| 5 | WorldCupFinalSimulationSection | Projected final |
| 6 | WorldCupSemifinalMatchSimulationSection | Projected semifinals |
| 7 | WorldCupSemifinalSimulationSection | Projected semifinals |
| 8 | WorldCupQuarterfinalMatchSimulationSection | Projected quarterfinals |
| 9 | WorldCupQuarterfinalSimulationSection | Projected quarterfinals |
| 10 | WorldCupRoundOf16MatchSimulationSection | Projected early knockout |
| 11 | WorldCupRoundOf16SimulationSection | Projected early knockout |
| 12 | WorldCupKnockoutSimulationSection | Projected early knockout |
| 13 | WorldCupRoundOf32Section | Projected early knockout |
| 14 | WorldCupThirdPlaceMatchSimulationSection | Third place match |
| 15 | WorldCupThirdPlaceMatchSection | Third place match |
| 16 | WorldCupKnockoutWinnerResolutionSection | Audit detail |
| 17 | WorldCupGroupsSection | — |
| 18 | WorldCupStandingsSection | — |
| 19 | WorldCupKnockoutBracketSection | — |
| 20 | TournamentSimulationSection | — |
| 21 | HistoricalValidationSection | — |

## Section Captions

Six visual dividers with small uppercase labels separate logical blocks:

| Label | Separates |
| --- | --- |
| Summary | Separates model evidence from tournament overview |
| Projected final | Separates summary from Final simulation group |
| Projected semifinals | Separates Final from Semifinal simulation group |
| Projected quarterfinals | Separates Semis from QF simulation group |
| Projected early knockout | Separates QFs from R16/R32 simulation group |
| Third place match | Separates early knockout from Third Place group |
| Audit detail | Separates Third Place from winner resolution audit |

## AppHeader Navigation

Phase 11.5 extends `AppHeader` navigation from 6 items to 12:

| Label | Href |
| --- | --- |
| Home | `#overview` |
| Tournament | `#world-cup-tournament-overview` |
| Champion | `#world-cup-champion-projection-summary` |
| Final | `#world-cup-final-match-simulation` |
| Semifinals | `#world-cup-semifinal-match-simulation` |
| Quarterfinals | `#world-cup-quarterfinal-match-simulation` |
| Round of 16 | `#world-cup-round-of-16-match-simulation` |
| Round of 32 | `#world-cup-knockout-simulation` |
| Third Place | `#world-cup-third-place-match-simulation` |
| Match Preview | `#match-preview` |
| Replay Audit | `#replay-audit` |
| Historical | `#historical` |

## TournamentProjectionOverviewSection Anchor Nav

`ROUND_ANCHORS` in `TournamentProjectionOverviewSection` updated to point to simulation sections (which now appear first in each round group) and reordered chronologically from most recent round:

| Label | Href |
| --- | --- |
| Champion | `#world-cup-champion-projection-summary` |
| Final | `#world-cup-final-match-simulation` |
| Semifinals | `#world-cup-semifinal-match-simulation` |
| Quarterfinals | `#world-cup-quarterfinal-match-simulation` |
| Round of 16 | `#world-cup-round-of-16-match-simulation` |
| R32 Simulations | `#world-cup-knockout-simulation` |

## E2E Coverage

Phase 11.5 adds one new E2E test (test #43):

> **Dashboard sections appear in correct top-to-bottom order for portfolio flow**
>
> Asserts that Tournament Projection Overview appears above Champion Projection Summary; Champion Projection Summary appears above Final match simulation; Final match simulation appears above Semifinal match simulation; Semifinal match simulation appears above Projected Third Place Match; Projected Third Place Match appears above Projected Tournament Winner (audit detail).
>
> Uses Playwright `boundingBox()` to compare element `y` coordinates in the rendered DOM.

## Files Changed

| File | Change |
| --- | --- |
| `apps/web/app/page.tsx` | Section reorder + six caption dividers |
| `apps/web/src/components/AppHeader.tsx` | Six new nav items |
| `apps/web/src/components/TournamentProjectionOverviewSection.tsx` | ROUND_ANCHORS reordered and hrefs updated |
| `apps/web/tests/e2e/match-simulation.spec.ts` | Added ordering test (#43) |
| `docs/dashboard/WORLD_CUP_2026_DASHBOARD_ORDERING_CLEANUP.md` | This file |
| `docs/ROADMAP.md` | Phase 11.5 row |
| `docs/qa/E2E_MATCH_PREDICTION_COVERAGE.md` | Count 42 → 43, test #43 added |
| `CHANGELOG.md` | Phase 11.5 entry |
| `apps/web/README.md` | Phase 11.5 section list update |

## Limitations

- Match simulation sections rendered before their corresponding foundation sections in the new order. This is intentional: the simulation output is the primary content; the foundation section provides the underlying qualifier data.
- Section captions are plain divider elements, not `<section>` or `<nav>` landmarks, so they do not appear in the accessibility tree as named regions.
- The `#match-preview`, `#replay-audit`, and `#historical` AppHeader anchors are pre-existing; those IDs are not on elements in `page.tsx` as of Phase 11.5.
