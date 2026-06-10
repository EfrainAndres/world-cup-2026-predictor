# Backtesting Limitations

Phase 4.0G is a backtesting foundation, not a complete evaluation program.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| No full group-stage historical data yet | Group qualification and table behavior cannot be backtested. |
| No full knockout historical data yet | Round-of-16 and quarter-final paths are not fully represented. |
| No pre-tournament model snapshots yet | Current tests use deterministic example probabilities, not model-generated forecasts. |
| No calibrated expected goals yet | Match probabilities are not tied to a validated goal model. |
| No official full FIFA tie-breaker validation yet | Official historical tournament rules are not fully reconstructed. |
| No public accuracy claim yet | The partial dataset is not enough to claim predictive performance. |

## Dataset Boundary

Current fixtures cover:

- 2018 semi-finals, third-place match, and final.
- 2022 semi-finals, third-place match, and final.

This scope is useful for testing champion and runner-up extraction, but it is not enough for complete tournament validation.

## Required Before Model Promotion

Before using backtesting results to promote a model, the project needs:

- Complete historical tournament fixtures.
- Historical prediction snapshots generated before each tournament or match.
- Data cutoff metadata.
- Model version metadata.
- Baseline comparisons.
- Calibration review over many predictions.
- Documented known weaknesses.

Until then, backtesting output should be labeled partial and exploratory.
