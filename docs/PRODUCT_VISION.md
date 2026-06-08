# Product Vision

## Product Summary

World Cup 2026 Predictor is a data-driven football prediction dashboard for exploring match probabilities, team comparisons, tournament simulations, and model quality.

The product should feel like a serious analytics tool for curious football fans, recruiters, engineers, QA leaders, and data practitioners. It should explain predictions clearly without pretending that football is fully predictable.

## Who The Tool Is For

| Audience | Need |
| --- | --- |
| Football fans | Explore likely match outcomes, team strengths, and tournament scenarios. |
| Data practitioners | Inspect assumptions, methods, metrics, and validation results. |
| Engineering reviewers | See clean architecture, automation, documentation, and product thinking. |
| QA/SDET reviewers | See how data quality, model validation, and E2E testing are treated as first-class concerns. |
| Portfolio visitors | Understand the project quickly and see why it is technically credible. |

## Problem It Solves

World Cup predictions are often presented as either entertainment, betting odds, or opaque model outputs. This project solves a different problem: it helps users understand what a model thinks, why it thinks that, how reliable it has been historically, and where its limits are.

The product should answer:

- Who is favored in this match?
- How close is the matchup?
- What model assumptions drive the prediction?
- How would tournament outcomes change across simulations?
- How trustworthy is the data and model behind the display?

## Why Someone Would Use It

Users would use this tool to:

- Explore World Cup 2026 matches before or during the tournament.
- Compare teams through an analytical lens.
- Understand probability and uncertainty in football.
- See tournament paths and scenario probabilities.
- Review a portfolio project that connects product design, QA, data, modeling, and architecture.

## Different From Betting Sites

This is not a betting product.

| Betting Site Pattern | Project Direction |
| --- | --- |
| Focuses on odds and wagering behavior. | Focuses on explanation, validation, and learning. |
| May optimize for conversion or betting engagement. | Optimizes for trust, transparency, and portfolio clarity. |
| Often hides model assumptions or market logic. | Documents data sources, model assumptions, and validation results. |
| Treats probabilities as action prompts. | Treats probabilities as uncertain estimates. |
| Uses money-focused language. | Avoids betting language and financial advice. |

## Product Principles

- **Trust first:** Always show enough context for users to understand uncertainty.
- **Explain the model:** Predictions need plain-language explanations, not just percentages.
- **Separate signal from noise:** Prioritize the most useful football and model information.
- **Show quality:** Data status, validation results, and model metrics should be visible.
- **Design for scanning:** Users should understand the main insight quickly, then drill down.
- **Avoid false certainty:** No prediction should feel guaranteed.
- **Portfolio-ready:** The product should demonstrate senior engineering, QA, and product judgment.

## MVP Product Promise

For MVP, the product should help a user select a match or team, see clear probabilities, understand the model at a high level, and inspect data/model quality signals.

MVP success is not "the model predicts every match correctly." MVP success is "the system makes responsible predictions that are easy to inspect, test, and explain."
