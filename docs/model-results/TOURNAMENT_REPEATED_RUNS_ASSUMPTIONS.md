# Tournament Repeated Runs Assumptions

## Purpose

Repeated tournament simulation runs the same simplified tournament many times so the project can estimate tournament-level probabilities instead of reporting only one sampled path.

## Why Repeated Simulation Is Needed

A single tournament simulation can produce one champion, one runner-up, and one bracket path. Repeated runs make the uncertainty visible by showing how often each team reaches important outcomes across many simulated tournaments.

## Current Probability Summaries

Phase 4.0C summarizes:

- Champion counts and probabilities.
- Runner-up counts and probabilities.
- Knockout qualification counts and probabilities.
- Group qualification counts and probabilities.

Every probability is calculated as:

```txt
count / totalRuns
```

## Seeded Randomness

The repeated-runner accepts either a seed or an injected random function. A seed creates a deterministic pseudo-random stream so the same tournament input and seed produce the same aggregate result.

## Run Count Assumptions

The default safe maximum run count is `10,000`. Tests use much smaller run counts to keep local feedback fast. Larger validation runs may be useful later, but performance has not been optimized for very large simulation counts yet.

## Probability Guidance

Repeated-run outputs are uncertainty summaries, not guarantees. If a team has a `0.35` champion probability in this foundation, it means that team won 35% of simulated runs under the current simplified tournament and input probability assumptions.
