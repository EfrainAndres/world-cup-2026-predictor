# Historical Elo Snapshot Limitations

Phase 4.0L creates an Elo replay foundation, not a final historical forecast.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| Current repo data may only include curated World Cup fixtures | Snapshots may be based on partial match history unless broader inputs are provided. |
| No full international match history yet | Elo ratings cannot fully represent team strength before each tournament. |
| No calibrated Elo-to-goals mapping yet | Elo ratings are not converted into match scoreline or goal expectations. |
| No Monte Carlo historical tournament replay yet | Champion probabilities are Elo-derived baseline weights, not simulated tournament path probabilities. |
| No player, squad, injury, xG, rest, travel, or venue features | Important football context is not represented. |
| No public accuracy claim yet | Foundation snapshots do not prove the model is accurate or calibrated. |

## Foundation Snapshot Label

Generated snapshots use:

`historical_elo_replay_snapshot_foundation`

This label is intentional. It separates available-data Elo replay from a complete historical model replay that uses full pre-tournament international match history.

## What This Phase Does Not Do

This phase does not:

- Download external data.
- Build a full international match dataset.
- Tune Elo parameters.
- Estimate expected goals.
- Run historical Monte Carlo tournament simulations.
- Promote a model for public predictions.

## Accuracy Claim Boundary

It is safe to say:

- Elo snapshot replay mechanics exist.
- Cutoff filtering prevents post-cutoff matches from entering ratings.
- Foundation snapshots can be scored by replay backtesting helpers.

It is not safe to say:

- The project has true historical World Cup Elo forecasts.
- The current Elo probabilities are calibrated.
- The model has proven predictive accuracy.
