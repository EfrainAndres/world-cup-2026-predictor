# Real Historical Backtesting Limitations

Phase 4.0I creates a report generator, not a final model evaluation.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| No real pre-tournament model snapshots yet | The current report tests use synthetic fixtures, not true forecasts. |
| No Elo-to-goals calibration yet | Poisson and simulation outputs are not historically calibrated. |
| No historical model replay pipeline yet | The project cannot yet recreate what the model would have known before each tournament. |
| No player availability data | Injuries, suspensions, squads, and lineups are not represented. |
| No travel, rest, or venue features | Context that may affect match probabilities is not modeled. |
| No xG or squad-strength features | Goal-model calibration remains limited. |
| No public accuracy claim | Report mechanics do not equal predictive quality. |

## Accuracy Claims Are Not Allowed Yet

Do not present Phase 4.0I metrics as real model performance unless probability snapshots are generated from:

- Data available before the tournament.
- A documented model version.
- A documented data cutoff.
- A reproducible command or pipeline.
- A reviewed validation report.

## What Is Safe To Say

It is safe to say:

- The project can now generate historical backtesting report objects.
- Complete 2010, 2014, 2018, and 2022 fixture outcomes are available.
- The report pipeline can score supplied probability snapshots.
- Synthetic snapshots are clearly warned as test fixtures.

It is not safe to say:

- The model predicted past World Cups well.
- The current model is calibrated.
- Future predictions are accurate.
