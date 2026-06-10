# Monte Carlo Assumptions

## Purpose

The Phase 4.0A Monte Carlo engine simulates a single match many times using an existing score probability matrix. It does not create match probabilities by itself; it samples from probabilities produced by the Poisson or Dixon-Coles foundations.

## What Is Being Simulated

Each simulation selects one scoreline from a normalized score probability matrix. The selected scoreline is then counted as:

- Home win when home goals are greater than away goals.
- Draw when home goals equal away goals.
- Away win when away goals are greater than home goals.

The final output estimates home win, draw, and away win probabilities from repeated sampled outcomes.

## Why Simulation Is Useful

Simulation is useful because future tournament logic will need to sample many uncertain matches, not only calculate one match analytically. This match-level engine is the foundation for later group-stage, knockout, and tournament-path simulations.

## Simulation Count Assumptions

Higher simulation counts usually produce more stable estimates, but they cost more runtime. The current implementation supports a configurable simulation count and caps it at `1,000,000` to prevent accidental runaway local checks.

## Randomness And Seeds

The engine supports:

- An injectable random function for direct test control.
- A deterministic seeded pseudo-random generator.
- `Math.random` as a fallback when no seed or random function is provided.

Tests use deterministic randomness so results are reproducible.

## Probability Guidance

Monte Carlo outputs are probability estimates, not guarantees. A simulated home win probability of `0.55` means the home team won about 55% of sampled runs under the input model assumptions. It does not mean the real match is certain or that the model has been calibrated against real data.
