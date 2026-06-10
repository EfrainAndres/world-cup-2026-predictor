# Historical Monte Carlo Replay Limitations

Phase 4.0M creates a Monte Carlo replay foundation. It is not a final historical model evaluation.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| Elo-to-goals mapping is not calibrated | Expected goals are transparent foundation values, not validated forecasts. |
| Full international match history is still missing unless supplied externally | Elo snapshots may not reflect true pre-tournament team strength. |
| Full historical bracket reconstruction is incomplete | Current replay uses explicit simplified fixtures rather than exact historical tournament paths. |
| Knockout replay is simplified | The current foundation uses a neutral knockout score matrix until tournament-specific bracket reconstruction exists. |
| No player, injury, squad strength, xG, travel, or rest-day data | Important football context is absent. |
| No public accuracy claim | Foundation simulations do not prove predictive quality. |

## What This Phase Does Not Do

This phase does not:

- Download external datasets.
- Build full historical World Cup brackets.
- Calibrate Elo-to-goals parameters.
- Model official tournament-specific tie-breakers.
- Account for player availability or squad strength.
- Promote simulation outputs as public predictions.

## Safe Interpretation

It is safe to say:

- The project can run seeded Monte Carlo replay from explicit pre-tournament snapshot inputs.
- The replay foundation produces champion probabilities and scoring metrics.
- The implementation keeps limitations visible in warnings and documentation.

It is not safe to say:

- The model has proven historical World Cup accuracy.
- The expected-goals mapping is calibrated.
- The simulated probabilities are ready for publication.
