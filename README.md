# World Cup 2026 Predictor

A professional portfolio project for predicting FIFA World Cup 2026 match outcomes with data-driven methods, transparent model validation, and a future web dashboard.

## Project Goal

The project will explore and compare football prediction methods such as Elo ratings, Poisson and Dixon-Coles goal models, and Monte Carlo tournament simulations.

The emphasis is not only on producing predictions. The project is designed to demonstrate clean software architecture, data quality practices, model validation, automated QA, and a polished user experience.

## Planned Stack

| Area | Planned Direction |
| --- | --- |
| Data pipeline | Python-based ingestion, cleaning, validation, and feature generation |
| Modeling | Elo baseline, Poisson model, Dixon-Coles adjustment, Monte Carlo simulation |
| Testing | Unit, integration, data validation, model validation, and E2E tests |
| Dashboard | Future web dashboard with strong UI/UX and clear uncertainty communication |
| CI/CD | GitHub Actions for repeatable checks and deployment automation |

## Planned Architecture

The project will grow from documentation and architecture into data, modeling, simulation, and presentation layers:

1. Project foundation and architecture decisions
2. Data collection, cleaning, and validation
3. Baseline Elo model
4. Goal-based Poisson and Dixon-Coles models
5. Monte Carlo tournament simulation
6. Web dashboard and API or static data export
7. QA automation, CI/CD, and portfolio polish

See `docs/ROADMAP.md` for the full phase plan.

## Current Status

Current phase: **Phase 0.0 - Project Foundation**

This repository currently contains project documentation only. No application code, dependencies, prediction models, or dashboard have been created yet.

## Repository Documents

| File | Purpose |
| --- | --- |
| `PROJECT_BRIEF.md` | Defines project scope, goals, non-goals, architecture direction, quality rules, and Git workflow. |
| `AGENTS.md` | Gives future Codex sessions required context and working rules. |
| `CHANGELOG.md` | Tracks notable project changes over time. |
| `docs/ROADMAP.md` | Defines the phase-by-phase delivery plan. |
| `docs/DATA_STRATEGY.md` | Describes data source options, quality rules, updates, and risks. |
| `docs/MODEL_STRATEGY.md` | Explains planned modeling approaches and validation metrics. |
| `docs/QA_STRATEGY.md` | Defines the planned testing and validation approach. |
| `docs/VALIDATION_BACKLOG.md` | Tracks future risks and validation work. |

## Working on the Repo

Before making changes:

```bash
git status
git branch --show-current
```

After the initial foundation commit, use focused branches for future work:

```bash
git switch -c docs/example-change
```

Recommended development habits:

- Read `PROJECT_BRIEF.md` and `AGENTS.md` before changing the repository.
- Keep changes small and aligned to the current roadmap phase.
- Do not mix documentation, data, modeling, and dashboard work in one commit unless the task explicitly requires it.
- Add or update tests when behavior is implemented.
- Keep model assumptions and data limitations visible.

## Next Recommended Phase

Next phase: **Phase 0.1 - Architecture Foundation**

That phase should define the initial repository structure, technology decisions, command conventions, data directory policy, and quality gates before application logic begins.
