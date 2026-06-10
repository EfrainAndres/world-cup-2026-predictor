# Historical Replay Backtesting Limitations

Phase 4.0K creates a replay backtesting foundation. It does not complete the final historical model evaluation.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| Baseline snapshots are seed-rating snapshots | Current replay results are baseline replay results, not full historical model accuracy. |
| No full historical Elo snapshot replay yet | Ratings are not rebuilt from all international matches before each tournament. |
| No calibrated Elo-to-goals mapping yet | Goal expectations are not derived from historical Elo differences. |
| No historical Monte Carlo tournament replay yet | Champion probabilities are not produced by full tournament path simulations. |
| No player availability data | Injuries, suspensions, squads, and lineups are absent. |
| No xG or squad-strength data | Attack and defense quality are not calibrated from richer football signals. |
| No travel, rest-day, or venue context | Tournament-specific conditions are not modeled. |
| No public accuracy claim yet | Replay mechanics do not prove the model is accurate or calibrated. |

## What The Baseline Is Not

The current baseline is not:

- A final Elo forecast.
- A Poisson forecast.
- A Dixon-Coles forecast.
- A Monte Carlo tournament simulation.
- A calibrated tournament probability model.

It is a deterministic, auditable input that lets the project verify replay scoring without look-ahead leakage.

## Accuracy Claim Boundary

It is safe to say:

- Historical replay backtesting infrastructure exists.
- The project can score frozen pre-tournament snapshots.
- The current reports are labeled as baseline replay results.

It is not safe to say:

- The model predicted historical World Cups accurately.
- The current probabilities are calibrated.
- Replay results prove future World Cup 2026 predictions are reliable.
