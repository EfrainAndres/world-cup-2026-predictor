# Real Historical Backtesting Summary

Phase 4.0I creates a report structure for historical tournament validation over complete World Cup fixture datasets.

The current probability snapshots used in tests are `synthetic_report_fixture` snapshots. They validate report mechanics only. They are not real model predictions and must not be presented as model accuracy.

## Report Table Structure

Future generated reports should follow this shape:

| Year | Actual Champion | Actual Runner-Up | Snapshot Type | Champion Rank | Top-1 | Top-3 | Top-5 | Brier Score | Log Loss | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2010 | Spain | Netherlands | `synthetic_report_fixture` until real snapshots exist | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | No accuracy claim yet |
| 2014 | Germany | Argentina | `synthetic_report_fixture` until real snapshots exist | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | No accuracy claim yet |
| 2018 | France | Croatia | `synthetic_report_fixture` until real snapshots exist | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | No accuracy claim yet |
| 2022 | Argentina | France | `synthetic_report_fixture` until real snapshots exist | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | Reported by helper | No accuracy claim yet |

## Aggregate Summary Shape

The aggregate summary reports:

- Years evaluated.
- Tournament count.
- Average Brier Score.
- Average Log Loss.
- Champion Top-1 hit rate.
- Champion Top-3 hit rate.
- Champion Top-5 hit rate.
- Combined warnings.

## Current Status

The report foundation is ready for deterministic local validation.

It is not ready for public model-quality claims because the snapshots are not generated from a historical model pipeline with documented data cutoffs.
