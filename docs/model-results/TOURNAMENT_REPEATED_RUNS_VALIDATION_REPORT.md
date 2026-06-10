# Tournament Repeated Runs Validation Report

## Current Status

Phase 4.0C validates repeated tournament simulation aggregation with deterministic unit tests. This verifies counts, probabilities, reproducibility, sorting, and input immutability for the simplified tournament format.

## Test Coverage

| Area | Validation |
| --- | --- |
| Run count | Returned `totalRuns` matches the requested run count. |
| Champion probabilities | Champion probabilities sum close to `1`. |
| Runner-up probabilities | Runner-up probabilities sum close to `1`. |
| Champion counts | Champion counts sum to the run count. |
| Runner-up counts | Runner-up counts sum to the run count. |
| Reproducibility | Same seed and input produce identical aggregate results. |
| Seed sensitivity | Different seeds can produce different aggregate results when stochastic inputs are present. |
| Sorting | Summaries sort by probability descending. |
| Tie fallback | Equal-probability summaries sort by team name. |
| Input validation | Invalid run counts and excessive run counts are rejected. |
| Immutability | Tournament input is unchanged after repeated runs. |
| Qualification summaries | Group and knockout qualification counts are aggregated. |

## Probability Sum Validation

Champion and runner-up probabilities are checked because exactly one champion and one runner-up should exist for every simulated tournament.

Qualification probabilities can sum above `1` because multiple teams qualify in each run. Those summaries are interpreted per team: a probability of `1` means the team qualified in every run.

## Current Gaps

- No full FIFA 2026 format validation yet.
- No official group tie-breaker validation yet.
- No real fixture validation yet.
- No historical calibration or backtesting yet.
- No large-run performance benchmark yet.

## Acceptance For Phase 4.0C

This phase is acceptable when repeated-run outputs are deterministic when seeded, counts and probabilities are internally consistent, sorting is stable, and the existing model/data test suite still passes.
