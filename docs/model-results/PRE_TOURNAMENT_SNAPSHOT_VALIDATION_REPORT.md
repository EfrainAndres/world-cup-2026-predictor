# Pre-Tournament Snapshot Validation Report

Phase 4.0J validates the baseline pre-tournament snapshot generator with deterministic TypeScript tests.

## What Is Tested

The test suite validates:

- Probability normalization sums close to 1.
- Higher seed ratings produce higher probabilities.
- Rankings sort by probability descending.
- Tied probabilities fall back to team name sorting.
- Duplicate teams are rejected.
- Invalid ratings are rejected.
- Input data after tournament start is flagged.
- Generated dates after tournament start are flagged.
- Actual tournament results in snapshot input are rejected.
- Snapshot generation works for 2010, 2014, 2018, and 2022.
- Generated snapshots are accepted by the historical backtesting report helpers.

## Probability Normalization

The baseline converts seed ratings into probabilities by dividing each rating by the total rating sum.

This keeps the model transparent:

- Ratings must be finite positive numbers.
- Generated probabilities must be between 0 and 1.
- Generated probabilities must sum to 1 within a small floating-point tolerance.

## Look-Ahead Guardrails

Current guardrails check:

- Input data cutoff must be before tournament start.
- Snapshot generated date should be before tournament start.
- Actual tournament results must not be included in snapshot input.

Guardrail results are stored in snapshot metadata so future reports can show whether a snapshot is safe to evaluate.

## What Can Be Trusted Now

The project can trust that:

- Snapshot generation is deterministic.
- The baseline uses only caller-supplied seed ratings.
- Basic leakage risks are detected or rejected.
- Output can feed the Phase 4.0I report generator.

## What Cannot Be Trusted Yet

The project cannot yet trust that:

- The baseline is calibrated.
- The baseline beats Elo or Poisson models.
- Seed ratings reflect real team strength.
- Tournament champion probabilities are product-ready.

Those require historical match replay, parameter calibration, and proper backtesting reports.
