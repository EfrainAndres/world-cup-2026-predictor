# Historical Validation Limitations

Phase 4.0E creates validation mechanics, not proof of predictive accuracy.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| No real historical World Cup backtest yet | The project cannot claim tournament prediction performance. |
| No real historical fixtures loaded yet | Historical validation is not tied to official tournament paths. |
| No calibration against historical tournaments yet | Calibration buckets are structural only until real predictions are added. |
| No FIFA official tie-breaker validation yet | Simplified tournament rules may differ from official historical outcomes. |
| No player availability data | Injuries, suspensions, squad strength, and lineup changes are not modeled. |
| No travel or rest-day context | Tournament fatigue and logistics are not represented. |
| No venue or home advantage calibration | Host and venue effects remain future modeling work. |

## What This Phase Should Not Be Used For

Do not use this phase to:

- Claim the model is accurate.
- Publish real World Cup predictions.
- Compare against external forecasts.
- Score historical tournaments without validated data provenance.
- Present validation metrics without data cutoff and model version context.

## Required Future Work

Before historical validation can support model promotion decisions, the project needs:

- A licensed historical tournament dataset.
- Data source metadata and retrieval dates.
- Historical fixture, group, knockout, and result normalization.
- Time-based model outputs generated without future data leakage.
- Baseline comparison reports.
- Calibration analysis across enough predictions to be meaningful.

Until then, the historical validation helpers are best treated as tested infrastructure for future backtesting.
