# Real Historical Backtesting Report Foundation

Phase 4.0I adds TypeScript helpers for generating historical backtesting-style reports from complete curated World Cup fixture datasets.

This is a report foundation. It does not claim real predictive accuracy yet because the project does not yet generate true pre-tournament probability snapshots from the model pipeline.

## What The Report Generator Does

The report generator accepts:

- Complete historical World Cup fixture subsets.
- Probability snapshots for each tournament.
- Actual champion and runner-up data extracted from the final match.

It produces:

- One report object per tournament year.
- Aggregate metrics across all evaluated years.
- Dataset completeness metadata.
- Warnings when probability snapshots are synthetic fixtures.

## Covered Tournaments

Current complete fixture coverage:

| Year | Tournament | Fixture Coverage |
| --- | --- | --- |
| 2010 | FIFA World Cup 2010 | Group stage through final |
| 2014 | FIFA World Cup 2014 | Group stage through final |
| 2018 | FIFA World Cup 2018 | Group stage through final |
| 2022 | FIFA World Cup 2022 | Group stage through final |

## Metrics Included

Per-year reports include:

- Actual champion.
- Actual runner-up.
- Champion probability.
- Runner-up probability when supplied.
- Champion probability rank.
- Runner-up probability rank when supplied.
- Champion Top-1, Top-3, and Top-5 hit flags.
- Champion Brier Score.
- Champion Log Loss.
- Calibration bucket summary when available.
- Dataset completeness metadata.
- Snapshot warnings.

Aggregate reports include:

- Average Brier Score.
- Average Log Loss.
- Top-1 hit rate.
- Top-3 hit rate.
- Top-5 hit rate.
- Years evaluated.
- Combined warnings.

## Outcome Extraction

Actual champions and runner-ups are extracted from the `final` match in each complete fixture dataset.

For finals decided on penalties, the fixture `winner` field is used. This handles cases such as the 2022 final, where Argentina and France were level after extra time but Argentina won on penalties.

## What This Can Prove

This phase can prove that:

- Complete fixture datasets can feed report generation.
- Actual tournament outcomes can be extracted consistently.
- Probability snapshots can be scored against historical outcomes.
- The reporting pipeline calculates deterministic metrics.
- Synthetic snapshot warnings are carried into report outputs.

## What This Cannot Prove

This phase cannot prove that:

- The model is accurate.
- The model is calibrated.
- The model would have predicted past tournaments correctly.
- Current World Cup 2026 predictions are trustworthy.

Those claims require real model-generated snapshots created only from data available before each historical tournament.
