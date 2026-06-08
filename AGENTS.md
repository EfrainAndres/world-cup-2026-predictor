# Agent Instructions

These instructions apply to future Codex sessions working in this repository.

## Required Reading

Before making changes, always read:

1. `PROJECT_BRIEF.md`
2. `AGENTS.md`
3. `docs/ROADMAP.md`
4. Any relevant document under `docs/`
5. Existing code and tests related to the requested change, when code exists

Use those files as the project context before planning or editing.

For architecture-sensitive work, also read:

- `docs/ARCHITECTURE.md`
- Relevant ADRs in `docs/adr/`

For technology, implementation, workflow, or standards-sensitive work, also read:

- `docs/TECH_STACK.md`
- `docs/CODING_STANDARDS.md`
- `docs/GIT_WORKFLOW.md`
- `docs/DECISIONS.md`

For UI, dashboard, product, or UX-sensitive work, also read:

- `docs/PRODUCT_VISION.md`
- `docs/DASHBOARD_STRUCTURE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/USER_FLOWS.md`

For data or modeling work, also read:

- `docs/DATA_SOURCES.md`
- `docs/DATA_DICTIONARY.md`
- `docs/MODEL_ROADMAP.md`
- `docs/MODEL_VALIDATION.md`
- `docs/BACKTESTING_STRATEGY.md`
- `packages/data/README.md` when changing data package behavior
- `packages/model/README.md` when changing model package behavior

For project structure, milestone, release, or phase implementation work, also read:

- `docs/REPOSITORY_STRUCTURE.md`
- `docs/DEFINITION_OF_DONE.md`
- `docs/MILESTONES.md`
- `docs/RELEASE_STRATEGY.md`

## Working Rules

- Check `git status` before editing.
- Confirm the current branch before editing.
- Do not overwrite unrelated local changes.
- Keep each change focused on the requested task.
- Do not install dependencies unless the task explicitly requires it.
- Do not create application logic during documentation-only phases.
- Prefer simple, explainable architecture over premature complexity.
- Update documentation when decisions, commands, assumptions, or workflows change.
- Follow `docs/ARCHITECTURE.md` when adding packages, app code, data code, model code, or cross-layer behavior.
- Document major architecture decisions with ADRs.
- Follow `docs/TECH_STACK.md`, `docs/CODING_STANDARDS.md`, and `docs/GIT_WORKFLOW.md` when implementation or workflow decisions are relevant.
- Follow product and design guidance before creating or modifying dashboard UI.
- Follow data/modeling research docs before creating or modifying datasets, pipelines, models, validation, or backtests.
- Follow delivery and release docs before creating project structure, implementing phases, defining milestones, or preparing releases.
- Keep `packages/data` focused on data contracts, normalization, validation, ingestion, and data quality; do not add prediction models there.
- Keep `packages/model` focused on model logic, validation, backtesting, scoring, and simulation; do not add UI, database, or API service code there.

## Architecture Standards

- React components must not contain business logic.
- API route handlers must be thin and must not contain prediction logic.
- UI must not access datasets, CSV files, databases, or external APIs directly.
- Domain code must remain independent from frameworks.
- Application code must orchestrate use cases.
- Infrastructure code must handle external integrations.
- Model code must isolate prediction and modeling logic.
- Data code must isolate ingestion, cleaning, and validation.
- Shared code must stay small and purposeful.

## Documentation Standards

- Keep documents beginner-friendly but professional.
- Explain why decisions matter, not only what they are.
- Prefer small focused files over one large document.
- Use Markdown tables where they improve scanning.
- Use Mermaid diagrams only when they clarify architecture or flow.
- Update `docs/DECISIONS.md` when adding, superseding, or changing major technical decisions.

## Modeling Standards

When modeling work begins:

- Start with a transparent baseline before advanced models.
- Track assumptions, feature definitions, and data cutoffs.
- Evaluate models with backtests and proper scoring metrics.
- Report uncertainty and limitations clearly.
- Never present predictions as guarantees.

## QA Standards

Future changes should consider:

- Unit tests for deterministic logic.
- Integration tests for data and modeling pipelines.
- Data validation checks for schema, freshness, duplicates, and ranges.
- Model validation checks for backtesting, calibration, and scoring.
- E2E tests for future dashboard workflows.

## Git Standards

- Use focused branches after the initial repository foundation commit.
- Stage only files related to the current task.
- Use descriptive conventional commits, such as `docs: add project foundation`.
- Push completed branches to `origin` when a remote exists.

## Phase Discipline

Respect the roadmap in `docs/ROADMAP.md`.

Do not jump ahead by creating app scaffolding, installing dependencies, or implementing models during phases that are meant to define foundation, architecture, or research.
