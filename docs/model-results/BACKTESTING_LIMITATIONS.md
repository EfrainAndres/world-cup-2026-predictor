# Backtesting Limitations

Phase 4.0G is a backtesting foundation, not a complete evaluation program.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| No pre-tournament model snapshots yet | Current tests use deterministic example probabilities, not model-generated forecasts. |
| No calibrated expected goals yet | Match probabilities are not tied to a validated goal model. |
| No official full FIFA tie-breaker validation yet | Official historical tournament rules are not fully reconstructed. |
| No public accuracy claim yet | Fixture results alone are not enough to claim predictive performance. |

## Dataset Boundary

Current fixtures cover complete fixture-level results for:

- 2010 FIFA World Cup.
- 2014 FIFA World Cup.
- 2018 FIFA World Cup.
- 2022 FIFA World Cup.

This scope is useful for future full-tournament reporting, but it still lacks model-generated historical probability snapshots.

## Required Before Model Promotion

Before using backtesting results to promote a model, the project needs:

- Historical prediction snapshots generated before each tournament or match.
- Data cutoff metadata.
- Model version metadata.
- Baseline comparisons.
- Calibration review over many predictions.
- Documented known weaknesses.

Until then, backtesting output should be labeled exploratory and should not be used for public model-quality claims.
