# Historical Replay Backtesting Next Steps

Phase 4.0K proves that historical tournaments can be replayed with frozen pre-tournament snapshots. Phase 4.0L adds cutoff-safe historical Elo foundation snapshots from available match inputs. The next improvement is to turn Elo-derived snapshots into historical tournament simulations.

## Move From Baseline Replay To True Model Replay

Recommended sequence:

1. Build pre-tournament Elo snapshots from historical match data.
2. Enforce a data cutoff before each tournament start date.
3. Add full international match history before each evaluated tournament.
4. Map Elo differences to expected goals.
5. Generate match-level probabilities from the Elo-to-goals mapping.
6. Run Monte Carlo tournament simulations for each historical tournament.
7. Compare simulated champion and runner-up probabilities to real outcomes.
8. Calibrate model parameters against Brier Score, Log Loss, and calibration buckets.
9. Publish results carefully with limitations and data-cutoff notes.

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

## Phase 4.0L Completed Scope

Phase 4.0L focused on Historical Elo Snapshot Replay.

That phase added:

- Cutoff-safe historical match filtering.
- Elo rating replay from supplied historical match inputs.
- Elo-derived champion probability normalization.
- Deterministic probability ranking.
- `historical_elo_replay_snapshot_foundation` outputs.
- Replay-helper compatibility for generated Elo foundation snapshots.
- Warnings for incomplete historical data.

## Recommended Next Phase

Phase 4.0M should focus on Historical Monte Carlo Replay.

That phase should convert cutoff-safe Elo-derived match probabilities into tournament simulation outputs for 2010, 2014, 2018, and 2022. After that, the project can decide whether to improve model realism further or move to Phase 5.0 API/dashboard foundation.
