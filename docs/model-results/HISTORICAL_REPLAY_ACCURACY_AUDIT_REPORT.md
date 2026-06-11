# Historical Replay Accuracy Audit Report

Phase 4.0P produces a per-year and aggregate audit report.

## Per-Year Audit

Each year includes:

| Field | Meaning |
| --- | --- |
| `tournamentYear` | Historical tournament year. |
| `status` | `pass`, `warning`, or `fail`. |
| `apiReadiness` | `ready`, `ready_with_warnings`, or `not_ready`. |
| `metricAvailability` | Availability of Brier Score, Log Loss, Top-1, Top-3, and Top-5. |
| `datasetCompleteness` | Dataset availability and validation status. |
| `bracketReconstruction` | Historical bracket availability and validation status. |
| `eloSnapshotReplay` | Historical Elo snapshot replay availability and validation status. |
| `monteCarloReplay` | Historical Monte Carlo replay availability and validation status. |
| `replayValidation` | Complete replay validation availability and status. |
| `foundationOnlyWarningDetected` | Whether foundation-only warnings are present. |
| `knownGaps` | Known limitations that block stronger accuracy claims. |
| `warnings` | Per-year audit warnings. |

## Aggregate Audit

The aggregate audit includes:

- Expected years.
- Years audited.
- Missing years.
- Availability flags for metrics and replay components.
- Foundation-warning detection.
- Known gaps.
- Warning count.
- Error count.
- Overall API readiness recommendation.

## Expected Current Interpretation

The current project should generally be `ready_with_warnings` when all artifacts are available. That means the foundation can be exposed carefully, but outputs must include warnings and must not be described as final model accuracy.
