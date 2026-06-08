# Milestones

Milestones group roadmap phases into reviewable delivery outcomes.

## Milestone Summary

| Milestone | Name | Primary Outcome |
| --- | --- | --- |
| 1 | Documentation Foundation | Project direction, architecture, stack, product, data/model research, and delivery plan. |
| 2 | Data Pipeline MVP | Repeatable validated dataset foundation. |
| 3 | Elo Baseline MVP | First transparent prediction model. |
| 4 | Probabilistic Model MVP | Goal-based model with measured improvement or clear tradeoff. |
| 5 | Tournament Simulation MVP | Tournament probabilities from validated match probabilities. |
| 6 | Dashboard MVP | Usable prediction dashboard with trust signals. |
| 7 | Quality & CI MVP | Automated checks across code, data, model, and UI. |
| 8 | Portfolio Release | Polished project ready for review and sharing. |

## Milestone 1: Documentation Foundation

| Item | Details |
| --- | --- |
| Goal | Establish project scope, architecture, decisions, UX direction, data/model research, and delivery rules. |
| Included phases | 0.0, 0.1, 0.2, 0.5, 0.6, 0.7 |
| Deliverables | Brief, roadmap, architecture docs, ADRs, tech stack, UX docs, data/model research, repository structure, Definition of Done, milestones, release strategy. |
| Success criteria | Future implementation work has clear boundaries, standards, and priorities. |
| Risks | Documentation may drift if implementation phases do not keep it updated. |

## Milestone 2: Data Pipeline MVP

| Item | Details |
| --- | --- |
| Goal | Build a repeatable, validated data foundation for modeling. |
| Included phases | 1.0 |
| Deliverables | Data folders, ingestion command, processed dataset, source metadata, validation checks, fixtures. |
| Success criteria | A clean dataset can be generated and validated locally. |
| Risks | Source licensing, stale data, inconsistent team names, and data leakage. |

## Milestone 3: Elo Baseline MVP

| Item | Details |
| --- | --- |
| Goal | Produce the first explainable match prediction baseline. |
| Included phases | 2.0 |
| Deliverables | Elo implementation, parameters, tests, probability conversion, backtest report. |
| Success criteria | Elo beats or contextualizes the simple historical baseline and outputs valid probabilities. |
| Risks | Poor parameter choices, overreacting to friendlies, draw probability weakness. |

## Milestone 4: Probabilistic Model MVP

| Item | Details |
| --- | --- |
| Goal | Evaluate goal-based probabilistic modeling. |
| Included phases | 3.0 |
| Deliverables | Poisson model, optional Dixon-Coles adjustment, metrics, calibration notes, model comparison. |
| Success criteria | Model improves probabilistic metrics or clearly explains why Elo remains preferred. |
| Risks | Sparse national-team data, overfitting, unstable low-score adjustment. |

## Milestone 5: Tournament Simulation MVP

| Item | Details |
| --- | --- |
| Goal | Convert match probabilities into tournament outcome probabilities. |
| Included phases | 4.0 |
| Deliverables | Group simulation, knockout simulation, tiebreaker handling, reproducibility checks, stage probabilities. |
| Success criteria | Simulations are reproducible, rule-aware, and traceable to a model version. |
| Risks | Incorrect tournament rules, unstable probabilities, hard-to-debug randomness. |

## Milestone 6: Dashboard MVP

| Item | Details |
| --- | --- |
| Goal | Present predictions, simulations, explanations, and data/model quality clearly. |
| Included phases | 5.0 |
| Deliverables | Dashboard home, match prediction page, team explorer, simulation view, model explanation, data quality page. |
| Success criteria | Users can inspect predictions and understand uncertainty without reading the code. |
| Risks | UI complexity, misleading probability presentation, weak mobile behavior. |

## Milestone 7: Quality & CI MVP

| Item | Details |
| --- | --- |
| Goal | Make quality checks repeatable locally and in CI. |
| Included phases | 6.0, 7.0 |
| Deliverables | Unit tests, integration tests, data validation, model validation, E2E checks, GitHub Actions workflows. |
| Success criteria | Pull requests run meaningful automated checks and failures are actionable. |
| Risks | Slow CI, flaky E2E tests, excessive checks before the project is stable. |

## Milestone 8: Portfolio Release

| Item | Details |
| --- | --- |
| Goal | Package the project as a polished portfolio artifact. |
| Included phases | 8.0 |
| Deliverables | Final README, screenshots, demo notes, model evaluation summary, architecture story, release notes. |
| Success criteria | Recruiters, engineers, and QA leaders can quickly understand the value of the project. |
| Risks | Too much detail without a clear narrative, incomplete demo path, stale docs. |
