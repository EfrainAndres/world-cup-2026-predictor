# Model Package

`packages/model` contains prediction model logic. Phase 2.0 started with a deterministic Elo baseline. Phase 3.0 added a Poisson goal-modeling foundation and a simple Dixon-Coles low-score adjustment foundation. Phase 4.0A adds a match-level Monte Carlo simulation engine.

## Current Scope

The package currently includes:

- Elo rating types and interfaces.
- Default Elo configuration.
- Expected score calculation.
- Rating delta calculation.
- Single-match rating updates.
- Sequential match processing.
- Team rating initialization.
- Current rating output.
- Match history and team history helpers.
- Expected-goals input types.
- Poisson probability mass function.
- Scoreline probability matrix generation.
- Win/draw/loss probability aggregation.
- Most likely scoreline ranking.
- Simple Dixon-Coles low-score adjustment with fixed `rho`.
- Seeded match-level Monte Carlo simulation.
- Simulation aggregation for home wins, draws, away wins, and common scorelines.
- Deterministic Vitest unit tests.

## Defaults

| Setting | Value |
| --- | --- |
| Initial team rating | `1500` |
| K-factor | `20` |
| Win score | `1` |
| Draw score | `0.5` |
| Loss score | `0` |
| Poisson max goals | `7` |
| Poisson matrix normalization | `true` |
| Dixon-Coles rho | `-0.1` |
| Maximum simulation count | `1,000,000` |

## Poisson And Dixon-Coles Scope

The Poisson foundation accepts expected home and away goals directly, then converts those expected goals into scoreline probabilities. Outcome probabilities are calculated by summing scorelines into home win, draw, and away win buckets.

The Dixon-Coles foundation applies a small fixed adjustment to low-score outcomes: `0-0`, `1-0`, `0-1`, and `1-1`. It is intentionally not calibrated yet. Future phases must validate whether this adjustment improves probabilistic metrics before using it as a trusted product model.

## Monte Carlo Scope

The Monte Carlo foundation simulates one match many times from an existing score probability matrix. It supports deterministic seeds and injected random functions so tests and future reports can reproduce results.

This phase does not simulate group tables, knockout brackets, penalty shootouts, or full tournament paths. Those rules belong in later tournament simulation phases.

## Boundaries

This package does not implement:

- Mapping Elo ratings to expected goals.
- Calibrated attack and defense strengths.
- Full Dixon-Coles parameter optimization.
- Group-stage simulation.
- Knockout bracket simulation.
- Full tournament simulation.
- FastAPI service.
- Database access.
- Dashboard behavior.
- External dataset ingestion.

## Type Integration Note

The model package uses a small local `EloMatch` interface that is compatible with the normalized match shape from `packages/data`. A future shared package or workspace-level type strategy can improve cross-package contracts once more packages exist.

## Commands

From the repository root:

```bash
pnpm test:model
pnpm --filter @world-cup-2026-predictor/model typecheck
pnpm build
```
