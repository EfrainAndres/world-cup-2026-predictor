# Validation Backlog

This backlog tracks risks and future validation work. Items should be refined as the project moves from documentation into architecture, data, modeling, and dashboard development.

## Status Legend

| Status | Meaning |
| --- | --- |
| Planned | Known work that has not started. |
| In progress | Work has started but is not complete. |
| Done | Validation exists and is documented. |
| Deferred | Intentionally postponed with a reason. |

## Backlog

| Area | Risk or Question | Validation Needed | Status |
| --- | --- | --- | --- |
| Data | Are source licenses compatible with portfolio publication? | Review source terms before committing or redistributing datasets. | Planned |
| Data | Are team names consistent across sources? | Create canonical team IDs and mapping validation. | Planned |
| Data | Can duplicate matches enter the dataset? | Add duplicate detection by date, teams, competition, and score. | Planned |
| Data | Can future data leak into training? | Add cutoff-date tests for feature generation and model training. | Planned |
| Data | Is the dataset fresh enough for 2026 predictions? | Add freshness metadata and validation checks. | Planned |
| Model | Does Elo beat a naive baseline? | Backtest Elo against simple home/draw/away or ranking-based baselines. | Planned |
| Model | Are predicted probabilities calibrated? | Add calibration plots or bucketed reliability checks. | Planned |
| Model | Does Dixon-Coles improve over plain Poisson? | Compare log loss and Brier score across backtest windows. | Planned |
| Model | Are simulations reproducible? | Test fixed random seeds and stable aggregate probabilities. | Planned |
| Model | Are tournament tiebreakers implemented correctly? | Build fixtures for group standings and knockout edge cases. | Planned |
| Quality | Are project commands consistent and documented? | Define command conventions in Phase 0.1. | Planned |
| Quality | Do tests cover critical deterministic logic? | Add unit tests during implementation phases. | Planned |
| Quality | Are validation failures understandable? | Review error messages and reports from data/model checks. | Planned |
| Security | Are secrets or private API keys protected? | Add `.env` guidance and secret scanning strategy before external APIs. | Planned |
| Security | Are third-party data/API terms respected? | Document source terms and usage constraints. | Planned |
| UX | Could users misread probabilities as guarantees? | Add copy, labels, and visual design patterns that communicate uncertainty. | Planned |
| UX | Is the dashboard usable on mobile and desktop? | Add responsive E2E and visual checks when UI exists. | Planned |
| UX | Are charts accessible and understandable? | Add labels, legends, keyboard support, and contrast checks. | Planned |
| Portfolio | Does the repository explain the engineering story clearly? | Review README, case study, architecture diagrams, and screenshots. | Planned |

## Review Cadence

This backlog should be reviewed:

- At the end of each roadmap phase.
- Before adding a new model.
- Before publishing dashboard predictions.
- Before presenting the project as a portfolio artifact.

## Adding New Items

When adding an item, include:

- The area of risk.
- The specific question or failure mode.
- The validation needed.
- Current status.

Prefer concrete validation tasks over vague concerns.
