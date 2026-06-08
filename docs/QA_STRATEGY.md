# QA Strategy

Quality for this project means more than passing code tests. The repository should eventually validate code behavior, data reliability, model quality, and dashboard usability.

## QA Principles

- Add checks close to the risk they protect against.
- Keep tests reproducible and easy to run locally.
- Test important assumptions, not only implementation details.
- Prevent data leakage before model metrics are trusted.
- Treat model validation as part of quality, not as an afterthought.

## Test Types

| Test Type | Purpose | Future Examples |
| --- | --- | --- |
| Unit tests | Verify small deterministic functions. | Elo update formula, probability normalization, tiebreaker helpers. |
| Integration tests | Verify multiple modules working together. | Build processed data from sample raw data, generate predictions from fixtures. |
| E2E tests | Verify full user workflows in the future dashboard. | Open dashboard, inspect a team, compare match probabilities, view simulation results. |
| Data validation tests | Verify dataset structure and quality. | Required columns, unique match IDs, valid dates, no future leakage. |
| Model validation tests | Verify modeling behavior and quality thresholds. | Backtest metrics, calibration checks, stable simulation outputs. |
| Accessibility tests | Verify future dashboard usability. | Keyboard navigation, contrast, labels, semantic structure. |

## Unit Testing Direction

When code begins, unit tests should cover:

- Pure functions.
- Edge cases.
- Probability sums and bounds.
- Tournament rule helpers.
- Date cutoff logic.
- Deterministic random-seed behavior.

## Integration Testing Direction

Integration tests should cover:

- Data ingestion to processed dataset.
- Processed dataset to feature matrix.
- Feature matrix to prediction output.
- Prediction output to simulation input.
- Simulation output to dashboard export.

Use small fixtures so tests are fast and understandable.

## Data Validation Direction

Data validation should check:

- Schema and required fields.
- Types and ranges.
- Duplicate records.
- Canonical team identifiers.
- Missing values.
- Dataset freshness.
- Training and prediction cutoff dates.

Validation failures should explain what broke and where to look.

## Model Validation Direction

Model validation should include:

- Historical backtesting.
- Accuracy, log loss, and Brier score.
- Calibration checks.
- Comparison against naive and Elo baselines.
- Sensitivity checks for major assumptions.
- Reproducibility checks for simulations.

Model quality gates should begin as reporting checks. Later, selected thresholds can become CI checks if they are stable and meaningful.

## Future Dashboard QA

The dashboard should eventually be tested for:

- Correct rendering of match probabilities.
- Clear handling of loading and empty states.
- Responsive layout.
- Accessible controls and navigation.
- Scenario exploration workflows.
- No misleading display of probability or certainty.

## Local Quality Commands

Exact commands will be defined in Phase 0.1 and later implementation phases.

Expected future categories:

```bash
# Examples only; final commands are not defined yet.
test
lint
format
validate:data
validate:model
test:e2e
```

## Definition of Done

For implementation phases, a change should be considered done when:

- The behavior is documented where needed.
- Relevant tests or validation checks pass.
- Known limitations are captured.
- The change is committed with a focused message.
- The work does not introduce unrelated file changes.
