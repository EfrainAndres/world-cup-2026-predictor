# Poisson Validation Report

## Current Status

Phase 3.0 validates the Poisson foundation with deterministic unit tests. This is implementation validation, not full model validation against historical football results.

## Validated Behaviors

| Area | Validation |
| --- | --- |
| Factorial helper | Confirms known values such as `0! = 1` and `5! = 120`. |
| Poisson PMF | Confirms a known probability for lambda `2` and goals `3`. |
| Scoreline probability | Confirms independent home and away goal probabilities multiply correctly. |
| Score matrix shape | Confirms matrix size follows `(maxGoals + 1)^2`. |
| Probability safety | Confirms generated probabilities are finite and non-negative. |
| Outcome aggregation | Confirms home/draw/away probabilities sum close to `1`. |
| Scoreline ranking | Confirms most likely scorelines are sorted by probability. |
| Invalid inputs | Confirms invalid expected goals are rejected. |

## What This Does Not Validate Yet

- Whether expected goals are accurate for real teams.
- Whether Poisson beats Elo on backtested matches.
- Whether probabilities are calibrated across historical test windows.
- Whether draw probabilities are realistic.
- Whether max-goal truncation is appropriate for all competitions.

## Acceptance For Phase 3.0

Phase 3.0 is acceptable when:

- Probability math is deterministic.
- Invalid inputs fail clearly.
- Outcome probabilities remain valid and normalized.
- Existing Elo and data tests still pass.
- Documentation clearly labels backtesting and calibration as future work.

## Next Validation Step

The next serious validation step is a time-based backtest that compares:

1. Elo-only baseline.
2. Plain Poisson probabilities.
3. Dixon-Coles adjusted probabilities.

That comparison should report accuracy, Brier Score, log loss, calibration notes, and draw behavior before any model is promoted for dashboard use.
