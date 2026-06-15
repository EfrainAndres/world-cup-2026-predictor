# World Cup 2026 Champion Projection Summary

Phase 11.3 adds a polished champion projection summary section to the dashboard. It is a presentation layer over the existing Phase 11.0 knockout winner resolution data — no new prediction logic, no new API handler, and no changes to winner selection rules.

## Source Handler

`resolveWorldCup2026KnockoutWinnersFoundation()`

No new handler is introduced. The champion projection summary consumes the same `WorldCup2026KnockoutWinnerResolutionResponse` snapshot already used by the detailed knockout winner resolution section.

## Displayed Fields

| Field | Source in API response |
| --- | --- |
| Projected champion team name | `champion.team` |
| Champion advancement reason | `champion.advancementReason` |
| Final opponent | `champion.opponent` |
| Final probability snapshot (H/D/A) | `champion.probabilitySnapshot` |
| Projected runner-up team name | `runnerUp.team` |
| Runner-up advancement note | `runnerUp.advancementReason` |
| Champion path (R32 → Final) | Derived from `roundOf32Winners`, `roundOf16Winners`, `quarterfinalWinners`, `semifinalWinners`, and `champion` |

## Champion Path Display

The champion path is derived entirely in the component from the existing response fields. For each knockout round, the component searches the round's winners array for the entry where `winner.team === champion.team`, then reads the opponent and probability snapshot from that entry.

| Round | Data source |
| --- | --- |
| Round of 32 | `roundOf32Winners.find(w => w.team === champion.team)` |
| Round of 16 | `roundOf16Winners.find(w => w.team === champion.team)` |
| Quarterfinal | `quarterfinalWinners.find(w => w.team === champion.team)` |
| Semifinal | `semifinalWinners.find(w => w.team === champion.team)` |
| Final | `champion` directly |

Each path entry shows the round label, the defeated opponent, and the probability snapshot (home win / draw / away win) from the simulated fixture that decided the result.

If the champion's entry is missing for a round (which is not expected in the deterministic foundation), that step is silently omitted from the path list.

## Deterministic Limitation

The section renders a prominent warning banner:

> Champion projection is deterministic and based on pre-match probabilities only. Extra time, penalties, live injuries, lineups, and real-time results are not modeled.

This matches the limitation documented in `docs/dashboard/WORLD_CUP_2026_KNOCKOUT_WINNER_RESOLUTION.md`. The same deterministic winner selection rules apply:

1. Highest win probability wins.
2. Elo tie-break if win probabilities are equal.
3. Home team wins if both are also equal.

## No Penalties / No Real-Time Data

- No penalty shootout is modeled at any stage.
- No extra-time probability model is applied.
- All participants are projected from the local curated match dataset. No live results, lineups, or injury news are incorporated.
- This section is a dashboard polish layer — it does not add any new prediction capability.

## Placement in Dashboard

The `WorldCupChampionProjectionSummarySection` is rendered **before** the full `WorldCupKnockoutWinnerResolutionSection`. Both consume the same `worldCup2026KnockoutWinnerResolution` snapshot from `getDashboardSnapshot()`.

The summary section is intended to give a reader a quick, clear view of the projected champion and their path before scrolling into the detailed per-round winner lists.

## Future Improvement Ideas

- Champion probability distribution across all 48 teams (requires Monte Carlo or probabilistic path integration).
- Extra-time probability model to resolve draws at 90 minutes.
- Penalty shootout resolution (deterministic or probabilistic).
- Live results integration to replace projected participants with actual match outcomes as the tournament progresses.
- Narrative path description (e.g., "Won all five matches without a tiebreaker").
