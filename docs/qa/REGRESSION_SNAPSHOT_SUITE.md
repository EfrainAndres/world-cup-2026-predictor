# Regression Snapshot Suite

Phase 8.4 adds deterministic regression snapshot coverage for key model and API outputs so that future formula or dataset changes are intentional and visible.

## Purpose

Regression snapshot tests capture stable numerical outputs from the live Elo pipeline, prediction handlers, tournament simulation, and static foundation data. Any change to fixture data, Elo parameters, probability formulas, or static foundation values will cause one or more snapshot tests to fail, making the regression explicit and auditable before merging.

## Test File

`packages/api/tests/regression-snapshots.test.ts`

## Test Count

40 tests across 7 `describe` blocks.

## Coverage by Snapshot Group

### Live Elo Ratings Top 15

8 tests that snapshot the `getLiveEloRatingsFoundation()` handler output.

| Test | What is asserted |
| --- | --- |
| Pipeline match and team counts | `matchesProcessed === 312`, `teamsRatedTotal === 60` |
| Latest match date | `latestMatchDate === "2024-07-14"` |
| Team list length | Returns exactly 15 entries |
| Top 5 team order | Argentina, Netherlands, Spain, Colombia, France |
| All 15 team names and ranks | Exact name and rank for every entry in the top 15 |
| Argentina Elo | Close to 1620.86 (±0.05) |
| All 15 Elo ratings | Each within ±0.05 of the expected 2dp-rounded value |
| Descending order | Every Elo rating ≤ the previous entry |

Captured top 15 Elo ratings (2dp-rounded from deterministic run):

| Rank | Team | Elo |
| --- | --- | --- |
| 1 | Argentina | 1620.86 |
| 2 | Netherlands | 1605.38 |
| 3 | Spain | 1577.72 |
| 4 | Colombia | 1576.95 |
| 5 | France | 1575.33 |
| 6 | Brazil | 1573.59 |
| 7 | Germany | 1570.29 |
| 8 | Belgium | 1562.62 |
| 9 | Uruguay | 1530.40 |
| 10 | England | 1530.11 |
| 11 | Portugal | 1519.96 |
| 12 | Venezuela | 1513.53 |
| 13 | Croatia | 1511.48 |
| 14 | Sweden | 1510.75 |
| 15 | Switzerland | 1508.76 |

### Canada vs Bosnia-Herzegovina

7 tests that snapshot the `predictMatchFromLiveElo()` handler for this specific matchup.

| Test | What is asserted |
| --- | --- |
| Status and team names | `status === "success"`, canonical names echoed |
| Ranks | Canada rank 56, Bosnia-Herzegovina rank 33 |
| Elo difference and xG | `eloDifference === -30.37`, home xG 1.22, away xG 1.28 |
| xG model bounds | Both values finite and in \[0.2, 4.0\] |
| Probability sum and favorite | Sum ≈ 1.0 (to 10 digits), Bosnia-Herzegovina `awayWin > homeWin` |
| Home win probability | Close to 0.3507 (±0.00005) |
| Most likely scoreline | Top scoreline is 1–1 |

### South Korea vs Czechia

5 tests that snapshot the live Elo prediction for this matchup (canonical team names, not aliases).

| Test | What is asserted |
| --- | --- |
| Status and team names | `status === "success"`, canonical names echoed |
| Ranks | South Korea rank 55, Czechia rank 34 |
| xG bounds and values | Both finite, in \[0.2, 4.0\], home 1.22, away 1.28 |
| Probability sum and favorite | Sum ≈ 1.0, Czechia `awayWin > homeWin` |
| Home win probability | Close to 0.3507 (±0.00005) |

The South Korea xG values (1.22 home, 1.28 away) match the Canada vs Bosnia-Herzegovina values because the Elo difference for both matchups rounds to the same 2dp adjustment value via the `eloToExpectedGoals` formula.

### Germany vs New Zealand

5 tests that snapshot the live Elo prediction for a clearly asymmetric matchup.

| Test | What is asserted |
| --- | --- |
| Status and ranks | `status === "success"`, Germany rank 7, New Zealand rank 21 |
| Elo difference and xG | `eloDifference === 70`, home xG 1.32, away xG 1.18 |
| xG model bounds | Both values finite and in \[0.2, 4.0\] |
| Probability sum and favorite | Sum ≈ 1.0, Germany `homeWin > awayWin` |
| Germany home win probability | Close to 0.3985 (±0.00005) |

### Tournament Simulation Foundation

6 tests that snapshot `simulateTournamentFoundation()` with seed 2026, 1000 runs, 8 teams.

| Test | What is asserted |
| --- | --- |
| Run and team counts | `simulationCount === 1000`, `teamResults.length === 8` |
| Champion probability sum | Sum ≈ 1.0 (to 10 digits) |
| Top-ranked champion | Netherlands rank 1 for seed 2026 |
| Top 4 champion order | Netherlands, Brazil, Germany, Argentina |
| Netherlands champion probability | Close to 13.8% (±0.005) |
| All probabilities in range | Every champion and runner-up probability in \[0, 1\] |

### Historical Replay Audit Summary

5 tests that snapshot `getHistoricalReplayAudit()` (static data).

| Test | What is asserted |
| --- | --- |
| Status and readiness | `status === "success"`, `apiReadiness === "ready_with_warnings"` |
| Supported years | Exactly `[2010, 2014, 2018, 2022]` |
| Metric availability | All five metric flags are `true` |
| Component availability | All five component flags are `true` |
| Known gaps | List is non-empty |

### Team Ratings Foundation

4 tests that snapshot `getTeamRatingsFoundation()` (static data).

| Test | What is asserted |
| --- | --- |
| Offense and defense leaders | 10 teams, Brazil strongest offense (90), France strongest defense (90) |
| Aggregate stats | `topEloRating === 1870`, `averageEloRating === 1807` |
| Top 5 static entries | Exact rank, team, tier, eloRating, offenseStrength, defenseStrength for Argentina through Brazil |
| Strong-tier order | Germany, Netherlands, Belgium, Italy |

## Stability Design

### Explicit assertions over full-object snapshots

All assertions target specific fields rather than snapshotting entire response objects. This prevents spurious failures from innocuous changes like adding a new `metadata.notes` entry.

### Probability tolerances

Probabilities are checked with `toBeCloseTo(expected, 4)` (tolerance ±0.00005) or `toBeCloseTo(1, 10)` for sum checks (tolerance ±5e-11). These pass for the fully deterministic Poisson computation while catching any formula change.

### Elo rating tolerances

Elo ratings are checked with `toBeCloseTo(expected, 1)` (tolerance ±0.05). Expected values are the 2dp-rounded probe outputs, so the maximum actual difference is ~0.005 — a 10× safety margin below the tolerance. This catches any meaningful formula or dataset change while surviving minor floating-point representation differences.

### Determinism

All handlers under test are pure synchronous functions with no external I/O. Given fixed fixture data and fixed parameters, every call produces identical results. The tournament simulation uses a fixed seed (`simulateTournamentFoundation()` hard-codes seed 2026 internally).

## What Triggers a Failure

A regression snapshot test will fail when:

- A World Cup fixture entry is added, removed, or edited in the curated dataset.
- Any Elo parameter changes (K-factor, home advantage, recency or competition weights).
- The `eloToExpectedGoals` formula or any preset parameter changes.
- The Poisson score-matrix or `aggregateOutcomeProbabilities` implementation changes.
- The tournament simulation seed or group composition changes.
- A static foundation constant changes (team ratings, offense/defense scores, tiers).
- The `LIVE_ELO_TOP_TEAMS_LIMIT` drops a team from the top 15.

## What Does Not Trigger a Failure

- Adding new teams to the fixture data that do not displace the current top 15.
- Changing API response fields other than those explicitly asserted (e.g., metadata notes, warning text).
- Changes to any handler not covered by this suite.

## Current Boundary

This suite does not test predictive accuracy, edge-case team aliases, or HTTP routing. Those concerns are covered by `api-contracts.test.ts`, `api-integration.test.ts`, `team-aliases.test.ts`, and the Playwright E2E suite.
