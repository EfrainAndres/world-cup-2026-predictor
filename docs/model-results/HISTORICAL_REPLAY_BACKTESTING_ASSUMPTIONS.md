# Historical Replay Backtesting Assumptions

Phase 4.0K adds replay-style historical tournament backtesting.

## What Replay Backtesting Means

Replay backtesting means evaluating a frozen pre-tournament probability snapshot against what actually happened in that tournament.

For each historical World Cup, the replay uses:

- A fixture dataset with actual tournament outcomes.
- A probability snapshot created before the tournament start date.
- Actual champion and runner-up values extracted from the final.
- Deterministic metrics such as Brier Score, Log Loss, and Top-N champion hits.

The replay asks: "If this snapshot had existed before the tournament, how would its probabilities score against the final outcome?"

## Why It Matters

Replay backtesting matters because tournament predictions are easy to overstate after results are known.

The replay layer helps by:

- Separating pre-tournament probabilities from actual results.
- Carrying look-ahead guardrail status into reports.
- Showing whether the actual champion was highly ranked before the tournament.
- Reporting probabilistic scoring metrics instead of only winner accuracy.
- Making baseline warnings visible before dashboard or API work.

## Data Used

The current replay foundation uses the complete curated World Cup fixture datasets already stored in `packages/data`:

| Year | Tournament | Fixture Coverage |
| --- | --- | --- |
| 2010 | FIFA World Cup 2010 | Group stage through final |
| 2014 | FIFA World Cup 2014 | Group stage through final |
| 2018 | FIFA World Cup 2018 | Group stage through final |
| 2022 | FIFA World Cup 2022 | Group stage through final |

Actual champions and runner-ups are extracted from each tournament final. Finals decided by penalties use the curated `winner` field.

## Snapshots Used Now

The current tests use `baseline_pre_tournament_snapshot` inputs generated from deterministic seed-rating probabilities.

These snapshots include:

- Tournament year.
- Tournament start date.
- Input data cutoff.
- Generated date.
- Model version.
- Champion probabilities.
- Runner-up probabilities when supplied.
- Look-ahead guardrail results.

## Not A Final Accuracy Claim

This is still not a final model accuracy claim.

The current baseline snapshots are not produced from historical Elo replay, calibrated Poisson probabilities, or Monte Carlo tournament simulations. They are deterministic seed-rating snapshots that prove the replay pipeline works and that reports can be labeled honestly.

Safe interpretation: the project can now replay and score frozen pre-tournament snapshots.

Unsafe interpretation: the model has proven predictive accuracy for historical World Cups.
