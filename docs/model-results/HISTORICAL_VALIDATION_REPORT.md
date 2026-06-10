# Historical Validation Report

Phase 4.0E introduces deterministic tournament-level validation helpers for future historical backtesting.

The current report describes validation capability only. It does not report real World Cup model performance.

## Current Helpers

| Helper Area | Purpose |
| --- | --- |
| Probability snapshot validation | Reject empty snapshots, duplicate teams, missing team names, and probabilities outside `0` to `1`. |
| Champion evaluation | Compare champion probability snapshots against the actual champion. |
| Runner-up evaluation | Check the actual runner-up probability and ranking when runner-up probabilities are available. |
| Knockout qualification evaluation | Compare top predicted knockout qualifiers against actual knockout teams when both are available. |
| Multi-tournament summary | Average Brier Score, Log Loss, and hit rates across multiple tournament validations. |
| Calibration buckets | Group champion probabilities into buckets and compare predicted probability levels with observed outcomes. |

## Metric Coverage

| Metric | Current Status | Notes |
| --- | --- | --- |
| Champion Brier Score | Implemented | Uses champion probability snapshots and actual champion outcomes. |
| Champion Log Loss | Implemented | Uses epsilon clipping so zero probabilities do not create infinite scores. |
| Top-1 champion hit | Implemented | Communication metric only; not enough to judge model quality. |
| Top-3 champion hit | Implemented | Useful for tournament-level ranking sanity checks. |
| Runner-up ranking checks | Implemented | Runs when runner-up probabilities and actual runner-up are available. |
| Knockout qualification hit rate | Implemented | Simple top-N comparison foundation. |
| Calibration buckets | Implemented | Foundation for later calibration reporting from real historical tournaments. |

## Test Coverage

The Vitest suite covers:

- Perfect champion Brier Score.
- Confident wrong champion Brier penalty.
- Low Log Loss for high-probability actual champions.
- High Log Loss for low-probability actual champions.
- Top-1, Top-3, and failed Top-N champion checks.
- Runner-up ranking evaluation.
- Multi-tournament summary aggregation.
- Calibration bucket generation.
- Invalid probability snapshots.
- Probabilities outside `0` to `1`.
- Duplicate team probabilities.
- Missing actual champion validation.

## Example Metric Interpretation

| Result | Plain-Language Meaning |
| --- | --- |
| Lower Brier Score | Predicted probabilities were closer to actual outcomes. |
| Higher Brier Score | The model assigned poor probability mass to actual outcomes. |
| Lower Log Loss | The actual champion received meaningful probability. |
| Higher Log Loss | The model was overconfident against what happened. |
| Top-N hit | The actual champion appeared within the highest-ranked probability group. |
| Calibration bucket | Teams predicted around a probability range can be compared with how often they actually won. |

## Known Gaps Before Claiming Model Quality

- No real historical World Cup data is loaded yet.
- No model outputs from real backtests are scored yet.
- No official historical tournament fixture validation is included yet.
- Calibration buckets need many historical predictions before they are meaningful.
- Metrics are not compared against a historical baseline yet.
- Dataset versions, data cutoffs, and model versions are not attached to real validation runs yet.

The next realism pass should connect these helpers to validated historical tournament datasets and documented model probability outputs.
