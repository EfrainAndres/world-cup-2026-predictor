# ADR 0004: Use Python for Modeling and Data Work

## Status

Accepted

## Date

2026-06-08

## Context

The project will need football data ingestion, cleaning, validation, feature generation, Elo ratings, Poisson and Dixon-Coles modeling, Monte Carlo simulation, backtesting, calibration checks, and model metrics such as accuracy, log loss, and Brier score.

Python has a strong ecosystem for this kind of data and statistical modeling work.

## Decision

Use Python for data and modeling packages.

The planned Python areas are:

- `packages/data/` for ETL, dataset preparation, and data validation.
- `packages/model/` for prediction models, backtesting, scoring, calibration, and simulation.

Likely future tools include pandas, NumPy, SciPy, scikit-learn, statsmodels, pytest, and a data validation library such as Pandera or Great Expectations. Specific dependencies will be chosen in a later implementation phase and should not be installed during Phase 0.1.

Python model and data code should remain separated from the UI. The web dashboard should consume stable outputs or call thin application boundaries, not import ad hoc data scripts.

## Consequences

Benefits:

- Strong ecosystem for statistical modeling and data validation.
- Easier implementation of Elo, Poisson, Dixon-Coles, and Monte Carlo workflows.
- Natural fit for backtesting, calibration, and model evaluation.
- Keeps modeling concerns separate from dashboard presentation.

Tradeoffs:

- The project will eventually need clear TypeScript/Python integration boundaries.
- CI must handle both JavaScript/TypeScript and Python tooling.
- Model artifacts and data exports need versioning rules.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| TypeScript for all data and modeling | Reduces language count, but has a weaker statistical modeling ecosystem. |
| R for modeling | Strong statistics ecosystem, but less aligned with the likely full-stack and CI workflow. |
| Notebook-only modeling | Useful for exploration, but not enough for tested, reusable model code. |
| External modeling service first | Adds infrastructure complexity before the modeling boundary is proven. |
