# Historical Monte Carlo Replay Assumptions

Phase 4.0M adds a foundation for historical Monte Carlo replay.

## What Historical Monte Carlo Replay Means

Historical Monte Carlo replay means using a frozen pre-tournament model snapshot to simulate a tournament many times, then comparing the simulated probabilities against the actual champion and runner-up.

The current foundation connects:

- Historical Elo-style pre-tournament snapshots.
- A simple Elo-to-expected-goals mapping.
- Poisson scoreline probability matrices.
- Repeated tournament simulations.
- Replay-style Brier Score, Log Loss, and Top-N champion checks.

## Elo To Expected Goals

The current mapping starts from a base expected goals value and applies a small adjustment based on Elo difference.

If one team has a higher Elo rating, that team receives a higher expected goals value and the opponent receives a lower value. The adjustment is capped so expected goals remain finite, positive, and conservative.

This mapping is deterministic and transparent, but it is not calibrated yet.

## Poisson And Simulation Use

The replay helper converts pairwise expected goals into Poisson scoreline matrices using the existing Poisson helpers.

Those matrices feed explicit simplified tournament fixtures. Repeated simulations then produce champion and runner-up probabilities from outcome counts.

## Foundation Status

This is a foundation because the project still needs:

- Complete pre-tournament international match history.
- Calibrated Elo-to-goals parameters.
- Tournament-specific historical group and bracket reconstruction.
- Validation across real historical tournament structures.

Current outputs are useful engineering evidence, not public model accuracy claims.
