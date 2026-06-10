# Historical Monte Carlo Replay Next Steps

Phase 4.0M connects historical Elo-style snapshots to expected goals, Poisson score matrices, and repeated tournament simulations. The next step is to make the historical tournament structure more realistic.

## Improve Inputs

Future work should add:

- Complete international match history before each evaluated tournament.
- True pre-tournament Elo snapshots from those datasets.
- Dataset versioning and source metadata.
- Team-name normalization across historical sources.

## Calibrate Elo To Goals

The current mapping is transparent but uncalibrated.

Future calibration should:

- Fit Elo-to-goals parameters on historical match outcomes.
- Compare Elo-only, Elo-plus-Poisson, and simulation outputs.
- Report Brier Score, Log Loss, and calibration.
- Keep simpler baselines if complexity does not improve validation.

## Reconstruct Historical Tournament Brackets

The recommended next phase is Phase 4.0N, Historical Tournament Bracket Reconstruction.

That phase should:

- Rebuild historical group structures.
- Rebuild knockout bracket paths.
- Model tournament-specific qualification rules.
- Feed exact historical tournament structures into replay simulations.
- Keep actual outcomes separate from pre-tournament probability generation.

## Publish Carefully

Only publish model quality after:

- Inputs are cutoff-safe.
- Tournament brackets are reconstructed.
- Elo-to-goals mapping is calibrated.
- Monte Carlo replay reports are validated.
- Limitations and exclusions are documented.
