# Backtesting Strategy

Backtesting evaluates how a model would have performed on matches that happened after its training data cutoff.

## Objective

The objective is to compare models fairly and prevent future information from leaking into predictions.

Backtesting should answer:

- Does this model beat a simple baseline?
- Does added complexity improve probabilistic metrics?
- Is the model calibrated?
- Does performance hold across different time periods?
- Are weaknesses visible before predictions reach the dashboard?

## Train/Test Split Strategy

Use time-based splits, not random splits.

Random splits are risky because football match data is chronological. A random split can train on future matches and test on earlier matches, which creates leakage.

Basic approach:

1. Choose a cutoff date.
2. Train only on matches before the cutoff.
3. Predict matches after the cutoff.
4. Score predictions against actual results.
5. Repeat for multiple cutoff dates.

## Time-Based Validation

Each prediction should only use information available before the match date.

Validation should check:

- Elo ratings are calculated sequentially.
- Post-match scores do not appear in pre-match features.
- FIFA rankings or external ratings are timestamped.
- Tournament metadata uses the correct version for the date.
- Model versions are tied to data cutoffs.

## Rolling Window Validation

Rolling validation should test model stability across time.

Example pattern:

| Window | Train On | Test On |
| --- | --- | --- |
| Window 1 | Matches before 2014-01-01 | 2014 international tournament period |
| Window 2 | Matches before 2018-01-01 | 2018 international tournament period |
| Window 3 | Matches before 2022-01-01 | 2022 international tournament period |
| Window 4 | Matches before 2024-01-01 | 2024-2025 international matches |

Exact windows should be finalized after the dataset is selected and validated.

## Candidate Historical Test Periods

Candidate periods:

- 2014 FIFA World Cup cycle.
- 2018 FIFA World Cup cycle.
- 2022 FIFA World Cup cycle.
- 2024-2025 major international matches.
- Confederation tournaments when data quality is strong.

These periods help test different tournament contexts and team pools.

## Comparing Models

Compare models using the same test windows and source data.

For each model, report:

- Training cutoff.
- Test period.
- Number of matches.
- Accuracy.
- Brier Score.
- Log loss.
- Calibration notes.
- Draw prediction behavior.
- Known data exclusions.

## Baseline Comparison Rules

Rules:

- Every model must be compared against Baseline 0.
- Elo must be compared against Baseline 0 before becoming the project baseline.
- Poisson must be compared against Elo-only.
- Dixon-Coles must be compared against plain Poisson.
- Tournament simulation quality depends on the match model quality.
- Do not promote a complex model unless it improves relevant metrics or explainability.

## Reporting Format

Recommended report table:

| Model | Test Period | Matches | Accuracy | Brier Score | Log Loss | Calibration Notes | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Historical baseline | TBD | TBD | TBD | TBD | TBD | TBD | Benchmark only |
| Elo-only | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Elo + Poisson | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Dixon-Coles | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

Reports should also include plain-language interpretation for portfolio reviewers.

## Before Trusting A Model

Document:

- Dataset version.
- Data source and retrieval date.
- Training cutoff date.
- Test window.
- Feature list.
- Model parameters.
- Validation metrics.
- Calibration review.
- Known weaknesses.
- Decision to promote, keep, revise, or reject the model.

A model should not power dashboard predictions until this information exists.
