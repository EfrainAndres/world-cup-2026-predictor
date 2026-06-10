# Tournament Validation Report

## Current Status

Phase 4.0B validates a simplified tournament simulation foundation with deterministic unit tests. This confirms that group standings, knockout rounds, and a small tournament bracket behave predictably.

## Group Stage Coverage

| Area | Validation |
| --- | --- |
| Points calculation | A win gives `3` points, a loss gives `0`, and draw behavior is covered through standings logic. |
| Sorting by points | Higher points rank above lower points. |
| Sorting by goal difference | Higher goal difference ranks above lower goal difference when points are tied. |
| Sorting by goals for | Higher goals for ranks above lower goals for when points and goal difference are tied. |
| Team-name fallback | Fully tied teams sort by deterministic team name. |
| Qualifiers | Top teams are selected from sorted standings. |
| Invalid input | Duplicate teams and invalid group definitions are rejected. |

## Knockout Coverage

| Area | Validation |
| --- | --- |
| Winner guarantee | Knockout matches always return a winner and loser. |
| Draw tie-break | Drawn knockout scorelines use tie-break resolution. |
| Injected randomness | Tie-breaks can be controlled deterministically in tests. |
| Round winners | Knockout rounds return the expected number of winners. |
| Invalid fixture input | Invalid fixtures are rejected. |

## Tournament Coverage

| Area | Validation |
| --- | --- |
| Champion and runner-up | A simplified tournament returns both final teams. |
| Group and knockout outputs | Results include group and knockout details. |
| Reproducibility | Reusing the same seed returns the same tournament result. |
| Invalid input | Empty tournaments and non-power-of-two qualifier counts are rejected. |

## Known Validation Gaps

- No official FIFA 2026 format validation yet.
- No official FIFA tie-breaker validation yet.
- No penalty shootout model validation yet.
- No repeated-run stability report yet.
- No historical backtesting or calibration yet.

## Phase Acceptance

This phase is acceptable when tournament simulation is deterministic, input validation is clear, group and knockout behavior are tested, and existing model/data tests continue to pass.
