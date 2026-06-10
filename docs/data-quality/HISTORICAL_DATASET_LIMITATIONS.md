# Historical Dataset Limitations

Phase 4.0H completes fixture-level result coverage for the 2010, 2014, 2018, and 2022 FIFA World Cups. It is still not a full football intelligence dataset.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| Fixture/result-level only | The dataset records match outcomes, not the context that produced them. |
| No player-level data | Injuries, suspensions, substitutions, and squad strength are not represented. |
| No lineup data | The model cannot evaluate tactical or player availability effects. |
| No pre-match Elo snapshots | Historical rating state still needs to be generated or imported. |
| No pre-tournament probability snapshots | Backtesting needs model outputs created with clear data cutoffs. |
| No xG | Expected-goals model calibration cannot use shot-quality data yet. |
| No venue detail | Stadium, city, altitude, weather, and travel effects are not modeled. |
| No automated sync | Fixture updates remain manually reviewed and committed. |
| Simplified source notes | Row-level notes identify source category, not every verification step. |

## Not Suitable Yet For

Do not use this dataset to:

- Claim model accuracy.
- Publish prediction quality.
- Compare this model against external forecasts.
- Tune model parameters without a documented validation plan.
- Validate every official FIFA tie-breaker detail.
- Represent player availability, rest, travel, or venue effects.

## Future Improvements

Future phases should add:

- Historical pre-match Elo snapshots.
- Model-generated probability snapshots by tournament and match.
- Match-level scoring reports.
- Calibration reports by confidence bucket.
- Venue and host context where useful.
- Optional official match IDs if a permitted source is selected.
- Automated source checks after licensing and provenance rules are settled.
