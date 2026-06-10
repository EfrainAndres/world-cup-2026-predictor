# Historical Replay Backtesting Next Steps

Phase 4.0K proves that historical tournaments can be replayed with frozen pre-tournament snapshots. The next improvement is to replace seed-rating baseline snapshots with true model replay snapshots.

## Move From Baseline Replay To True Model Replay

Recommended sequence:

1. Build pre-tournament Elo snapshots from historical match data.
2. Enforce a data cutoff before each tournament start date.
3. Map Elo differences to expected goals.
4. Generate match-level probabilities from the Elo-to-goals mapping.
5. Run Monte Carlo tournament simulations for each historical tournament.
6. Compare simulated champion and runner-up probabilities to real outcomes.
7. Calibrate model parameters against Brier Score, Log Loss, and calibration buckets.
8. Publish results carefully with limitations and data-cutoff notes.

## Required Artifacts For True Replay

Future replay snapshots should include:

- Historical match dataset version.
- Data cutoff.
- Model version.
- Elo configuration.
- Elo ratings at cutoff.
- Elo-to-goals parameters.
- Simulation count and seed policy when simulations are used.
- Feature list.
- Known exclusions.
- Reproducible command or workflow.

## Recommended Next Phase

Phase 4.0L should focus on Historical Elo Snapshot Replay.

That phase should generate true pre-tournament Elo snapshots for 2010, 2014, 2018, and 2022 from historical match data available before each tournament. After that, the project can decide whether to improve model realism further or move to Phase 5.0 API/dashboard foundation.
