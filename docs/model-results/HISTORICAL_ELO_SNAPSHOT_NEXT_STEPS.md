# Historical Elo Snapshot Next Steps

Phase 4.0L creates the Elo snapshot replay foundation. The next step is to make replay inputs more complete and turn ratings into tournament simulations.

## Improve Historical Inputs

Future work should add full international match history with:

- Source metadata.
- License notes.
- Retrieval date.
- Team-name normalization.
- Duplicate checks.
- Date validation.
- Competition labels.
- Cutoff-safe dataset versions.

## Compute True Pre-Tournament Elo Ratings

For each historical World Cup, the project should:

1. Load all validated international matches before the tournament start.
2. Choose a cutoff date before the opening match.
3. Replay Elo chronologically through that cutoff.
4. Store ratings, configuration, data source, and match counts.
5. Compare Elo snapshot outputs against the seed-rating baseline.

## Move From Elo Ratings To Match Probabilities

After true Elo snapshots exist, the model should map Elo differences to expected goals.

That work should include:

- Calibrating Elo-to-goals parameters.
- Comparing Elo-only and Elo-plus-Poisson performance.
- Checking Brier Score, Log Loss, and calibration.
- Keeping simpler baselines if added complexity does not improve validation.

## Run Monte Carlo Historical Replay

The recommended next modeling phase is Phase 4.0M, Historical Monte Carlo Replay.

That phase should:

- Use Elo-derived match probabilities.
- Simulate historical tournament paths before each tournament.
- Estimate champion and runner-up probabilities.
- Compare simulated probabilities to actual outcomes.
- Calibrate parameters carefully.
- Publish results with conservative limitations.

## Publication Standard

Do not publish accuracy claims until snapshots are built from complete pre-tournament data, evaluated with proper scoring metrics, and documented with known exclusions.
