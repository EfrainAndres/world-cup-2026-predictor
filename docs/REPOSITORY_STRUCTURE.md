# Repository Structure

This document defines the planned monorepo structure. Phase 0.7 documents the structure only; it does not create application folders or package scaffolding.

## Planned Tree

```txt
world-cup-2026-predictor/
├─ apps/
│  └─ web/
├─ packages/
│  ├─ domain/
│  ├─ application/
│  ├─ infrastructure/
│  ├─ shared/
│  ├─ data/
│  └─ model/
├─ scripts/
├─ docs/
│  ├─ adr/
│  └─ ...
├─ CHANGELOG.md
├─ PROJECT_BRIEF.md
├─ AGENTS.md
└─ README.md
```

## Top-Level Folders

| Folder | Purpose | Should Not Contain |
| --- | --- | --- |
| `apps/` | User-facing applications. | Core model logic, raw datasets, reusable domain rules. |
| `packages/` | Reusable domain, application, infrastructure, data, model, and shared packages. | App-specific pages or one-off scripts. |
| `scripts/` | Repeatable project automation commands. | Business logic that belongs in packages. |
| `docs/` | Project documentation, ADRs, strategy, and delivery planning. | Generated data outputs or application code. |

## `apps/web`

Purpose: Future Next.js dashboard and route handlers.

Belongs here:

- App Router pages and layouts.
- React components specific to the dashboard.
- Thin API route handlers.
- UI state and presentation logic.
- Dashboard styling and shadcn/ui usage when introduced.
- E2E-facing routes and UI behavior.

Should not be placed here:

- Prediction formulas.
- Model training logic.
- Data ingestion or cleaning logic.
- Direct CSV, database, or external API access from UI components.
- Core domain rules that need framework independence.

Future file examples, not to create yet:

- `apps/web/app/page.tsx`
- `apps/web/app/matches/[matchId]/page.tsx`
- `apps/web/app/api/predictions/route.ts`
- `apps/web/components/match-probability-card.tsx`

## `packages/domain`

Purpose: Business entities, value objects, and core rules.

Belongs here:

- Team and match entities.
- Match result concepts.
- Tournament rule primitives.
- Probability invariants.
- Domain validation that has no framework dependency.

Should not be placed here:

- React, Next.js, FastAPI, database, or file-system imports.
- Data cleaning scripts.
- Model training procedures.
- Dashboard formatting.

Future file examples, not to create yet:

- `packages/domain/src/match.ts`
- `packages/domain/src/team.ts`
- `packages/domain/src/probability.ts`

## `packages/application`

Purpose: Use cases and orchestration.

Belongs here:

- Get match prediction use case.
- Compare teams use case.
- Run tournament simulation use case.
- Coordinate domain rules, model outputs, and infrastructure ports.

Should not be placed here:

- UI rendering.
- Raw database queries embedded in use cases.
- File parsing details.
- Statistical model internals.

Future file examples, not to create yet:

- `packages/application/src/get-match-prediction.ts`
- `packages/application/src/compare-teams.ts`
- `packages/application/src/run-tournament-simulation.ts`

## `packages/infrastructure`

Purpose: External integrations and adapters.

Belongs here:

- Database repositories.
- File access adapters.
- API clients.
- Model artifact loaders.
- Data export readers for dashboard-facing use cases.

Should not be placed here:

- Core business decisions.
- UI components.
- Model formulas.
- Data science experiments.

Future file examples, not to create yet:

- `packages/infrastructure/src/repositories/match-repository.ts`
- `packages/infrastructure/src/files/model-artifact-loader.ts`
- `packages/infrastructure/src/api/fifa-client.ts`

## `packages/shared`

Purpose: Carefully selected shared contracts and utilities.

Belongs here:

- Shared TypeScript types.
- Schemas used across app and packages.
- Constants with stable cross-layer meaning.
- Serialization helpers.

Should not be placed here:

- Random helper functions.
- Business rules that belong in domain.
- UI-only components.
- Infrastructure adapters.

Future file examples, not to create yet:

- `packages/shared/src/prediction-schema.ts`
- `packages/shared/src/team-code.ts`
- `packages/shared/src/api-response.ts`

## `packages/data`

Purpose: Data ingestion, cleaning, validation, and dataset preparation.

Belongs here:

- Source ingestion code.
- Raw-to-processed transformations.
- Data validation rules.
- Dataset metadata generation.
- Canonical team mapping logic.

Should not be placed here:

- Dashboard components.
- Match prediction UI formatting.
- Model scoring logic that belongs in `packages/model`.
- API route handlers.

Future file examples, not to create yet:

- `packages/data/src/ingest_results.py`
- `packages/data/src/validate_matches.py`
- `packages/data/src/team_mapping.py`

## `packages/model`

Purpose: Prediction models, scoring, backtesting, and simulations.

Belongs here:

- Historical baseline model.
- Elo implementation.
- Poisson and Dixon-Coles models.
- Monte Carlo simulation.
- Backtesting and validation metrics.
- Model report generation.

Should not be placed here:

- React components.
- Next.js route handlers.
- Raw scraping logic.
- Dashboard-specific chart formatting.

Future file examples, not to create yet:

- `packages/model/src/elo.py`
- `packages/model/src/poisson.py`
- `packages/model/src/backtesting.py`
- `packages/model/src/simulation.py`

## `scripts`

Purpose: Repeatable project automation.

Belongs here:

- Thin wrappers around package commands.
- Local setup helpers.
- Report generation entrypoints.
- Release helper scripts if needed.

Should not be placed here:

- Primary business logic.
- Large one-off notebooks.
- Duplicated package behavior.

Future file examples, not to create yet:

- `scripts/validate-data`
- `scripts/run-backtest`
- `scripts/generate-model-report`

## `docs`

Purpose: Project memory and decision record.

Belongs here:

- Strategy docs.
- ADRs.
- Roadmaps and milestones.
- Product, UX, data, model, QA, and release documentation.
- Human-readable reports when appropriate.

Should not be placed here:

- Application code.
- Raw datasets.
- Generated build artifacts.
- Secrets.

## Structure Rules

- Create folders only when a phase needs real files inside them.
- Avoid placeholder files that future phases will delete.
- Keep dependencies pointing inward according to `docs/ARCHITECTURE.md`.
- Update this document when the actual structure changes.
- Add an ADR for major structural changes.
