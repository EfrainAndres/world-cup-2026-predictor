# Complete Historical Replay Validation Limitations

Phase 4.0O validates replay artifact availability, but it does not remove the modeling limitations documented in earlier phases.

## Data Limits

The historical fixture datasets cover full World Cup tournaments for 2010, 2014, 2018, and 2022. They do not by themselves provide full pre-tournament international match history.

## Model Limits

Current historical Elo snapshots may still be foundation snapshots if broader international history is missing. The Elo-to-goals mapping used by Monte Carlo replay is not calibrated.

## Bracket Limits

Historical bracket reconstruction is result-level. It does not model event-level match state, full official tie-breaker chains, player availability, injuries, squad strength, travel, rest days, or xG.

## Report Limits

The validation layer checks whether replay artifacts exist and are coherent. It does not prove that generated probabilities are accurate, calibrated, or suitable for public claims.

Any dashboard or API output must continue to label these results as validation foundations until stronger model inputs and calibration are complete.
