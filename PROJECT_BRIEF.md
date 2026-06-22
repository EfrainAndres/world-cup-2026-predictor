# World Cup 2026 Predictor Project Brief

## Purpose

World Cup 2026 Predictor is a professional portfolio project for predicting FIFA World Cup 2026 match outcomes with transparent, data-driven methods.

The project will combine football domain knowledge, reproducible data engineering, statistical modeling, simulation, quality automation, and a future web dashboard that explains predictions clearly.

## Goals

| Goal | Description |
| --- | --- |
| Predictive modeling | Build progressively stronger models for match outcomes and tournament scenarios. |
| Software architecture | Keep the system modular, testable, documented, and easy to extend. |
| Data quality | Track data sources, validation rules, transformations, and update risks. |
| Model validation | Evaluate models with backtesting, calibration checks, and proper scoring metrics. |
| QA automation | Add repeatable checks for code, data, models, and user-facing behavior. |
| Portfolio polish | Present the project as a clear engineering case study, not only a code repository. |

## Non-Goals

This project will not:

- Guarantee betting advice or financial outcomes.
- Treat predictions as certain or final.
- Scrape or redistribute data in ways that violate data source terms.
- Implement application logic during the documentation foundation phase.
- Prioritize a flashy dashboard over trustworthy data, modeling, and validation.

## Planned Stack

The exact stack may evolve during Phase 0.1, but the current direction is:

| Layer | Planned Options |
| --- | --- |
| Data processing | Python, pandas, Polars, or DuckDB |
| Modeling | Python, NumPy, SciPy, scikit-learn, statsmodels |
| Validation | pytest, Great Expectations or Pandera, custom model checks |
| Simulation | Python Monte Carlo simulation modules |
| API | FastAPI or a lightweight Python service |
| Dashboard | Next.js or another modern React framework |
| Storage | Local files first, then SQLite, DuckDB, or Postgres if needed |
| CI/CD | GitHub Actions |

## Architecture Direction

The project should grow in layers:

```mermaid
flowchart LR
    A["Raw football data"] --> B["Validated datasets"]
    B --> C["Feature engineering"]
    C --> D["Prediction models"]
    D --> E["Tournament simulation"]
    E --> F["API or data export"]
    F --> G["Web dashboard"]
    B --> H["Data quality reports"]
    D --> I["Model validation reports"]
```

Initial architecture principles:

- Keep data ingestion separate from modeling.
- Keep model training separate from prediction and simulation.
- Make assumptions visible in docs and config.
- Store repeatable outputs in predictable locations.
- Prefer simple, explainable baselines before complex models.
- Design the dashboard around trust, comparison, and clear uncertainty.

## Quality Rules

Every meaningful phase should include:

- Clear documentation for assumptions and decisions.
- Tests for important behavior.
- Data validation for incoming and transformed datasets.
- Model validation before presenting predictions as useful.
- Reproducible commands for setup, checks, and outputs.
- Small commits with descriptive messages.

## Git Workflow

Default workflow:

1. Check `git status` before making changes.
2. Confirm the current branch.
3. Work on focused branches after the initial commit.
4. Do not overwrite unrelated local changes.
5. Stage only files related to the current task.
6. Use clear conventional commit messages.
7. Push branches to `origin` when a remote is configured.

Recommended branch naming:

- `docs/...` for documentation work
- `data/...` for data pipeline work
- `model/...` for modeling work
- `app/...` for dashboard or API work
- `test/...` for QA-only changes

## Current Phase

The current implementation track is executing the Phase 12 backlog, including immutable prediction snapshots, synchronized World Cup 2026 result ingestion into Elo, the Phase 12.9 Model vs Reality tracker for post-match evaluation, the Phase 12.11 Elo-to-xG calibration series, and the Phase 12.15 persistence work.

**Phase 12.15D (complete):** The full PostgreSQL persistence layer is implemented and QA-validated. Three migrations (`prediction_snapshots`, `prediction_evaluations`, `projection_cache`) are idempotent and ready to apply. The runtime resolver selects memory or PostgreSQL adapters via `PERSISTENCE_PROVIDER`. The Group Detail SSR page uses the async projection cache with safe degradation. A webpack build regression caused by server-only `postgres` Node.js built-ins was fixed via `"sideEffects": false` in the API package and `serverExternalPackages`/`resolve.fallback` in the Next.js config. QA verdict: `ready_for_non_production`. See `docs/qa/PERSISTENCE_MIGRATION_DEPLOYMENT_QA.md` and `docs/qa/PERSISTENCE_DEPLOYMENT_CHECKLIST.md`.

**Phase 12.11E (complete):** The production Elo-to-xG formula was promoted from V1 (`adjustmentPer100=0.10`, `maxAdjustment=0.45`) to V2 (`adjustmentPer100=0.15`, `maxAdjustment=0.65`) following a three-phase calibration evaluation (Phases 12.11A–D). V2 improves holdout Brier Score by −0.0072 and Log Loss by −0.0097 over n=120 holdout matches. V1 rollback constants are preserved as named exports. Formula version metadata (`formulaVersion: "v2"`) is exposed in all prediction responses.

The ordered Phase 12 plan still lives in `docs/roadmap/PHASE_12_LIVE_DATA_MODEL_QUALITY_UX_BACKLOG.md`.
