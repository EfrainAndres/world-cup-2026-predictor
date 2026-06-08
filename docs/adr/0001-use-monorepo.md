# ADR 0001: Use a Monorepo

## Status

Accepted

## Date

2026-06-08

## Context

World Cup 2026 Predictor will include a dashboard, API or route handlers, shared types and schemas, data tooling, prediction models, simulations, tests, scripts, and documentation.

These parts will change together. For example, a prediction response shape may affect the model output, API response, dashboard display, tests, and documentation.

## Decision

Use a monorepo for the project.

The planned top-level structure is:

- `apps/web/` for the future Next.js dashboard and route handlers.
- `packages/domain/` for business entities and core rules.
- `packages/application/` for use cases and orchestration.
- `packages/infrastructure/` for external integrations and repositories.
- `packages/model/` for Python prediction models and simulations.
- `packages/data/` for ETL, datasets, and validation.
- `packages/shared/` for shared types, schemas, constants, and utilities.
- `docs/` for architecture, strategy, ADRs, and project documentation.
- `scripts/` for repeatable project automation.

## Consequences

Benefits:

- Related dashboard, data, model, test, and documentation changes can be reviewed together.
- Shared contracts can live near the code that uses them.
- The repository remains easier to understand as a portfolio project.
- CI can run checks across the full system.

Tradeoffs:

- The repository needs clear boundaries so packages do not become tangled.
- Tooling may become more complex when both TypeScript and Python are introduced.
- Shared code must be curated carefully to avoid becoming a dumping ground.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| Separate repositories for dashboard, data, and models | Adds coordination overhead before the project needs it. |
| Single flat repository with no package boundaries | Simpler at first, but makes architecture harder to communicate and test. |
| Notebook-first repository | Useful for exploration, but weaker for maintainable software architecture and portfolio engineering goals. |
