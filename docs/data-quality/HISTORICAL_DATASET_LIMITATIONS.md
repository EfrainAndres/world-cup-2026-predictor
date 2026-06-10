# Historical Dataset Limitations

Phase 4.0F creates a real historical fixture foundation, not a complete backtesting dataset.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| Dataset is incomplete | Only semi-finals, third-place matches, and finals are included for 2018 and 2022. |
| No automated source synchronization | Fixtures must be manually reviewed when updated. |
| No player-level data | Injuries, suspensions, lineups, and squad strength are not represented. |
| No pre-tournament probability snapshots | Historical model validation cannot be scored yet. |
| No real backtesting metrics claimed | The project cannot yet claim model performance. |
| Limited penalty metadata | Penalty winners and scores are represented, but detailed shootout events are not. |
| No venue metadata | Stadium, city, altitude, weather, and travel effects are not modeled. |

## Not Suitable Yet For

Do not use this dataset to:

- Claim model accuracy.
- Publish World Cup 2026 prediction quality.
- Compare models against external forecasts.
- Reconstruct full tournament brackets.
- Validate official FIFA tie-breakers.
- Train or tune model parameters.

## Future Improvements

Future phases should add:

- Complete historical World Cup match coverage.
- Source metadata per fixture file.
- Venue and stage metadata.
- Detailed penalty shootout event fields.
- Group standings and qualification outcomes.
- Historical pre-match probability snapshots.
- Backtesting reports with data cutoffs and model versions.

Until then, this dataset is a compact integration foundation for deterministic validation and future backtesting work.
