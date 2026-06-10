# Historical Elo Snapshot Validation Report

Phase 4.0L validates historical Elo snapshot replay with deterministic TypeScript tests.

## What Is Tested

The test suite checks that:

- Elo replay uses only matches on or before the cutoff.
- Matches after the cutoff are ignored and reported.
- Cutoff dates on or after the tournament start are rejected.
- Elo ratings change after replaying completed matches.
- Higher Elo ratings produce higher champion probabilities.
- Elo-derived probabilities sum close to 1.
- Rankings sort by probability descending.
- Tied probabilities fall back to team name sorting.
- Generated snapshots include metadata.
- Incomplete historical data creates warnings.
- Generated snapshots are accepted by replay backtesting helpers.
- Duplicate target teams are rejected.
- Invalid cutoff dates are rejected.
- Input matches are not mutated.

## Cutoff Date Validation

The snapshot helper requires `inputDataCutoff` to be before `tournamentStartDate`.

This protects against using tournament matches, post-tournament Elo ratings, or other future information in a pre-tournament snapshot.

## Look-Ahead Prevention

The helper filters historical matches before Elo replay:

- Matches on or before the cutoff are replayed.
- Matches after the cutoff are ignored.
- Ignored match counts are stored in snapshot metadata.
- Warnings are emitted when matches after the cutoff are provided.

Generated snapshots also include the existing look-ahead guardrail results for data cutoff, generated date, and actual-result leakage.

## Probability Normalization And Ranking

The helper converts Elo ratings into positive weights, normalizes those weights into champion probabilities, and verifies that probabilities sum to 1 within the existing snapshot tolerance.

Rankings are deterministic:

1. Higher probability ranks first.
2. Ties fall back to team name sorting.

## What Can Be Trusted Now

The project can trust that:

- Elo replay is deterministic.
- Cutoff dates are enforced.
- Post-cutoff matches are excluded from rating generation.
- Snapshot metadata records match usage and ignored matches.
- Generated Elo foundation snapshots can feed historical replay backtesting.

The project still cannot claim final model accuracy from these snapshots until full pre-tournament international match history and calibration are available.
