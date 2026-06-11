# Complete Historical Replay Validation Report

Phase 4.0O reports per-year and aggregate validation status for the historical replay foundation.

## Per-Year Structure

Each year reports:

| Field | Meaning |
| --- | --- |
| `tournamentYear` | Historical tournament year. |
| `status` | `pass`, `warning`, or `fail`. |
| `dataset` | Fixture completeness availability and match counts. |
| `bracketReconstruction` | Reconstructed bracket availability and summary. |
| `eloSnapshotReplay` | Elo snapshot availability, data coverage, match counts, and guardrail status. |
| `monteCarloReplay` | Monte Carlo replay availability, simulation count, and metric fields. |
| `replayBacktestingReport` | Replay report availability, dataset coverage, scoring fields, and guardrail status. |
| `warnings` | Foundation, missing-data, or validation warnings for the year. |

## Aggregate Structure

The aggregate report includes:

- Expected years.
- Years evaluated.
- Missing years.
- Whether all expected years were evaluated.
- Availability flags for every replay layer.
- Warning count.
- Error count.
- Overall status.
- Deduplicated warnings.

## Interpretation

A `warning` status is expected while the system still uses foundation-only model inputs or uncalibrated replay assumptions.

A `fail` status means a required component is missing or incomplete for at least one expected year.

The report is designed for internal model validation and release readiness checks, not public accuracy claims.
