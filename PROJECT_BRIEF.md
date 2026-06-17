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

The current documentation direction includes Phase 12.0, Live Data, Model Quality & UX Backlog.

This phase is documentation-only and defines the prioritized path from a mostly static World Cup predictor to a live, confidence-aware World Cup intelligence dashboard. The detailed backlog lives in `docs/roadmap/PHASE_12_LIVE_DATA_MODEL_QUALITY_UX_BACKLOG.md`.
