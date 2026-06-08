# Model Package

`packages/model` contains prediction model logic. Phase 2.0 starts with a deterministic Elo baseline.

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
- Deterministic Vitest unit tests.

## Defaults

| Setting | Value |
| --- | --- |
| Initial team rating | `1500` |
| K-factor | `20` |
| Win score | `1` |
| Draw score | `0.5` |
| Loss score | `0` |

## Boundaries

This package does not implement:

- Poisson modeling.
- Dixon-Coles adjustment.
- Monte Carlo simulation.
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
```
