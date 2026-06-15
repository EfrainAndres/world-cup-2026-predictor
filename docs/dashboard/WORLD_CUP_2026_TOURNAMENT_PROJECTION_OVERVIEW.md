# World Cup 2026 Tournament Projection Overview

Phase 11.4 adds a `TournamentProjectionOverviewSection` to the dashboard. This is a presentation polish phase — no new prediction logic, no new API handler, and no changes to winner selection rules or simulation outputs.

## Purpose

The overview section provides a single, clear summary of the full tournament projection at the top of the simulation content area. It answers three questions immediately:
1. Who is the projected champion?
2. Who is the projected runner-up?
3. Who plays in the Third Place Match?

It also provides anchor navigation links to jump directly to any knockout round simulation section.

## Source Data

| Data | Source field |
| --- | --- |
| Projected champion | `resolveWorldCup2026KnockoutWinnersFoundation().champion` |
| Projected runner-up | `resolveWorldCup2026KnockoutWinnersFoundation().runnerUp` |
| Total resolved fixtures | `resolveWorldCup2026KnockoutWinnersFoundation().totalResolvedFixtures` |
| Third place contestants | `getWorldCup2026ThirdPlaceMatchFoundation().thirdPlaceMatchFixture.homeTeam / awayTeam` |

Both handlers are already called in `getDashboardSnapshot()`. No new API call or snapshot key is added in Phase 11.4.

## Section id

`world-cup-tournament-overview`

This id is used by the `AppHeader` nav link "Tournament" → `#world-cup-tournament-overview`.

## Displayed Content

### Portfolio readiness banner

A teal-toned banner confirms the projection is complete:

> Full tournament projection complete — {N} knockout fixtures resolved · R32 → R16 → QF → SF → Final · Live Elo + Poisson model · No extra time or penalties modeled

The badge reads "Deterministic" to signal the projection method.

### Projected finalist cards

Three cards in a responsive grid:
- **Projected Champion** — champion team name, "Beat {opponent} in the Final", Final probability snapshot (H/D/A)
- **Projected Runner-Up** — runner-up team name, final opponent label
- **Third Place Match** — `{homeTeam} vs {awayTeam}`, "Projected from semifinal losers" note

No third-place winner is shown because winner selection after the Third Place Match is not modeled in this phase.

### Anchor navigation

A row of links scoped to `<nav aria-label="Tournament phase navigation">` allows users to jump to:

| Label | Target |
| --- | --- |
| R32 Simulations | `#world-cup-knockout-simulation` |
| Round of 16 | `#world-cup-round-of-16` |
| Quarterfinals | `#world-cup-quarterfinal` |
| Semifinals | `#world-cup-semifinal` |
| Final | `#world-cup-final` |
| Champion | `#world-cup-champion-projection-summary` |

## Placement in Dashboard

`TournamentProjectionOverviewSection` is placed after `WorldCupKnockoutBracketSection` and before `WorldCupKnockoutSimulationSection`. This gives users a headline summary of the full tournament result before they scroll into the round-by-round simulation detail.

## AppHeader Navigation

Phase 11.4 adds two items to the `AppHeader` navigation:
- **Tournament** → `#world-cup-tournament-overview`
- **Champion** → `#world-cup-champion-projection-summary`

## Champion Path Visualization Improvement

Phase 11.4 also adds numbered step indicators (1–5) to each row of the champion path in `WorldCupChampionProjectionSummarySection`. Each step shows:
1. Step number (circle badge)
2. Round label (uppercase, small)
3. Opponent defeated (medium weight)
4. Match probability snapshot (H/D/A, small)

## Limitations

- No third-place winner is shown — Third Place Match winner selection is not modeled.
- All participants are projected from local curated match data, not live results.
- The "Deterministic" badge reflects that no randomization or Monte Carlo is used.
- No real-time data, injury news, or lineup information is incorporated.

## Future Improvement Ideas

- Live results integration replacing projected teams as the tournament progresses.
- Probabilistic champion distribution (champion probability %, not a single deterministic pick).
- Confidence intervals on the champion path probabilities.
- Visual bracket diagram embedded in the overview.
