# Backtesting Validation Report

Phase 4.0G implements a deterministic foundation for historical backtesting and calibration.

## What Was Implemented

| Area | Status |
| --- | --- |
| Historical fixture subset input types | Implemented |
| Actual champion extraction | Implemented |
| Actual runner-up extraction | Implemented |
| Champion probability evaluation | Implemented |
| Runner-up probability evaluation | Implemented |
| Brier Score helper | Implemented via historical validation metrics |
| Log Loss helper | Implemented via historical validation metrics |
| Top-N hit reporting | Implemented |
| Calibration bucket generation | Implemented |
| Multi-year summary | Implemented |
| Partial dataset warning metadata | Implemented |

## Supported Metrics

The backtesting foundation supports:

- Champion Brier Score.
- Champion Log Loss.
- Champion Top-1 hit.
- Champion Top-3 hit.
- Configurable champion Top-N hit.
- Runner-up Top-1, Top-3, and Top-N hit rates when runner-up snapshots exist.
- Champion calibration buckets.

## Test Coverage

The Vitest suite validates:

- Valid partial historical datasets are accepted.
- 2018 champion extraction returns France.
- 2022 champion extraction returns Argentina from the penalty-decided final metadata.
- Runner-up extraction works for 2018 and 2022.
- Brier Score and Log Loss helpers work.
- Top-1 and Top-3 results are reported.
- Calibration buckets are generated.
- Multiple years are summarized.
- Partial dataset warning metadata is returned.
- Invalid probability snapshots are rejected.
- Missing champion data is rejected.

## What Can Be Trusted Now

The project can now trust that:

- Backtesting helpers are deterministic.
- The current curated fixture subset can identify champion and runner-up outcomes.
- Probability snapshot validation is reused from the historical validation foundation.
- Partial dataset warnings are returned with backtest results.

## What Cannot Be Trusted Yet

The project cannot yet trust or publish:

- Full historical World Cup model accuracy.
- Full tournament calibration.
- Group-stage backtesting.
- Official full FIFA tie-breaker validation.
- Model promotion decisions based on the current partial fixtures.

Those require broader historical data and real model-generated probability snapshots.
