# Historical Replay Backtesting Report

Phase 4.0K creates a replay report structure for comparing pre-tournament snapshots against complete historical World Cup outcomes.

## Report Structure

Replay reports are produced for:

| Year | Actual Champion | Actual Runner-Up | Current Snapshot Type |
| --- | --- | --- | --- |
| 2010 | Spain | Netherlands | `baseline_pre_tournament_snapshot` |
| 2014 | Germany | Argentina | `baseline_pre_tournament_snapshot` |
| 2018 | France | Croatia | `baseline_pre_tournament_snapshot` |
| 2022 | Argentina | France | `baseline_pre_tournament_snapshot` |

Each report is a structured TypeScript object, not a public model-performance claim.

## Per-Year Metrics

Each replay year includes:

- Year.
- Actual champion.
- Actual runner-up.
- Snapshot type.
- Champion probability.
- Champion rank.
- Runner-up probability when supplied.
- Runner-up rank when supplied.
- Top-1 champion hit.
- Top-3 champion hit.
- Top-5 champion hit.
- Brier Score.
- Log Loss.
- Calibration bucket summary when available.
- Dataset completeness metadata.
- Look-ahead guardrail status.
- Replay warnings.

## Aggregate Metrics

The aggregate replay summary includes:

- Years evaluated.
- Tournament count.
- Average Brier Score.
- Average Log Loss.
- Top-1 champion hit rate.
- Top-3 champion hit rate.
- Top-5 champion hit rate.
- Combined warnings.
- Snapshot type summary.

## Baseline Snapshot Notes

Current replay snapshots are baseline seed-rating snapshots.

Reports must keep the warning:

> Probability snapshot is a baseline_pre_tournament_snapshot generated from seed ratings, not a calibrated model forecast.

This means the report can show whether the replay machinery works and what the baseline scored, but it must not be presented as final model accuracy.

## Look-Ahead Guardrails

Replay reports include guardrail status for:

- Input data cutoff before tournament start.
- Snapshot generated before tournament start.
- No actual tournament results in snapshot input.

Snapshots that include actual tournament results are rejected by the replay helper. Snapshots without guardrail metadata are reported with a warning.
