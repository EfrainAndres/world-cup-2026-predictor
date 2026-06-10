# Pre-Tournament Snapshot Assumptions

Phase 4.0J adds a foundation for generating pre-tournament probability snapshots.

## What A Pre-Tournament Snapshot Is

A pre-tournament snapshot is a saved set of probabilities created before a tournament starts. It should represent what the model could have believed using only information available before the opening match.

For historical backtesting, this matters because the prediction must be frozen before the outcome is known.

## Why Timing Matters

Snapshots must not use:

- Match results from the tournament being evaluated.
- Post-tournament ratings.
- Final standings.
- Knockout paths.
- Champion or runner-up outcomes.

Using any of those would leak future information into the prediction and make backtesting misleading.

## Baseline Inputs Used Now

The current implementation generates `baseline_pre_tournament_snapshot` outputs from deterministic team seed ratings.

The baseline uses:

- Tournament metadata.
- Tournament start date.
- Input data cutoff.
- Generated date.
- Team seed ratings supplied by the caller.

It converts seed ratings into champion probability weights by normalizing each rating against the total rating sum.

## Not A Calibrated Forecast Yet

This is not yet a calibrated model forecast because the project does not have:

- Complete international match history before each World Cup.
- Historical Elo replay before each tournament.
- Calibrated Elo-to-goals mapping.
- Historical tournament simulations generated from pre-tournament data.

## Why This Is Still Useful

This phase is useful because it:

- Defines the snapshot contract.
- Produces deterministic report inputs.
- Adds look-ahead bias guardrails.
- Lets backtesting reports consume non-synthetic baseline snapshots.
- Creates a safe bridge toward true historical replay backtesting.
