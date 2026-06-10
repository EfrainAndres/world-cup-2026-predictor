# Historical Monte Carlo Replay Validation Report

Phase 4.0M validates the historical Monte Carlo replay foundation with deterministic Vitest coverage.

## What Is Tested

The test suite checks that:

- Elo-to-expected-goals mapping is deterministic.
- Higher Elo teams receive higher expected goals.
- Expected goals remain positive and finite.
- Poisson score matrices can be generated from Elo-derived expected goals.
- Repeated replay returns the requested simulation count.
- Champion probabilities are returned and sorted.
- Champion probabilities sum close to 1.
- Per-year replay includes actual champion and runner-up.
- Top-1, Top-3, and Top-5 champion flags are calculated.
- Brier Score and Log Loss are included.
- Warnings are included for uncalibrated Elo-to-goals mapping.
- Warnings are included for foundation-only historical data limitations.
- The same seed produces reproducible replay results.
- Different seeds can produce different simulation summaries.
- Invalid simulation counts are rejected.
- Invalid Elo-to-goals configs are rejected.

## Seeded Behavior

Replay tests use seeded simulation configuration. This makes repeated tournament outputs reproducible for the same seed while still allowing different seeds to produce different count summaries.

## Probability Summary Validation

Champion probability summaries are generated from simulation counts. Tests verify that probabilities are sorted and sum close to 1.

Brier Score and Log Loss are calculated from the simulated champion probability assigned to the actual champion.

## What Can Be Trusted Now

The project can trust that:

- The Monte Carlo replay foundation is deterministic when seeded.
- Elo-derived expected goals can feed Poisson score matrices.
- Explicit simplified tournament fixtures can be simulated repeatedly.
- Replay summaries expose scoring metrics and conservative warnings.

The project cannot yet trust these outputs as final model accuracy.
