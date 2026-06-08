# Dashboard Structure

This document defines planned screens for the future web dashboard. Phase 0.5 does not create the web app or UI components.

## Screen Plan

| Screen | Purpose | Main Components | Primary User Action | MVP Priority |
| --- | --- | --- | --- | --- |
| Landing page | Introduce the project and route users into the dashboard or portfolio story. | Hero summary, tournament context, product promise, project credibility links. | Enter dashboard or read project story. | High |
| Dashboard home | Give a fast overview of key predictions, data status, and navigation paths. | Featured matches, top tournament probabilities, model status, data freshness, navigation. | Choose what to explore next. | High |
| Match prediction | Explain a single match forecast. | Team header, win/draw/loss probabilities, scoreline estimates, key factors, model notes, data freshness. | Inspect why a team is favored. | High |
| Team explorer | Compare teams and inspect team-level model inputs. | Team search, rating trend, recent matches, attack/defense indicators, comparison table. | Select or compare teams. | High |
| Tournament simulation | Explore group, knockout, and winner probabilities. | Stage probability table, bracket view, group standings scenarios, simulation metadata. | Explore tournament paths. | High |
| Model explanation | Make the prediction methods understandable. | Elo summary, Poisson/Dixon-Coles summary, Monte Carlo explanation, metrics, limitations. | Understand how predictions are produced. | Medium |
| Data quality/status page | Show data freshness, validation checks, and known limitations. | Source inventory, freshness status, validation results, missing data notes, quality warnings. | Verify data trustworthiness. | High |
| About/portfolio page | Explain the engineering and QA story behind the project. | Project narrative, architecture summary, QA strategy, roadmap, links to docs and repository. | Understand portfolio value. | Medium |

## Navigation Direction

The dashboard should support a small, predictable navigation model:

- Home
- Matches
- Teams
- Simulation
- Model
- Data Quality
- About

The navigation should avoid exposing internal implementation names such as `domain`, `application`, or `infrastructure`. Those belong in technical documentation, not primary product navigation.

## MVP Screen Priorities

| Priority | Screens |
| --- | --- |
| Must have | Dashboard home, match prediction, team explorer, tournament simulation, data quality/status. |
| Should have | Model explanation, about/portfolio page. |
| Later | Saved scenarios, user accounts, alerts, personalization. |

## Screen Design Principles

- Lead with the most useful answer, then let users drill down.
- Keep probability displays visually clear and numerically precise enough.
- Always include context for model version, data freshness, and uncertainty.
- Prefer comparison tables and simple charts over decorative visuals.
- Keep pages scannable on mobile before expanding desktop density.
