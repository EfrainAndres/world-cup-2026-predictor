# Historical Elo Snapshot Next Steps

Phase 4.0L creates the Elo snapshot replay foundation. Phase 4.0M connects Elo snapshots to a historical Monte Carlo replay foundation. The next step is to reconstruct historical tournament groups and brackets more accurately.

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

## Phase 4.0M Completed Scope

Phase 4.0M added Historical Monte Carlo Replay foundations:

- Use Elo-derived expected goals.
- Generate Poisson score matrices.
- Simulate explicit simplified tournament paths.
- Estimate champion and runner-up probabilities.
- Compare simulated probabilities to actual outcomes.
- Report Brier Score, Log Loss, and Top-N champion hits.
- Publish foundation limitations and conservative warnings.

## Recommended Next Phase

The recommended next modeling phase is Phase 4.0N, Historical Tournament Bracket Reconstruction.

That phase should rebuild historical group membership and knockout paths so Monte Carlo replay can simulate more realistic historical tournament structures.

## Publication Standard

Do not publish accuracy claims until snapshots are built from complete pre-tournament data, evaluated with proper scoring metrics, and documented with known exclusions.
