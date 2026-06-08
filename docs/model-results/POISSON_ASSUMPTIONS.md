# Poisson Assumptions

## Purpose

The Poisson foundation estimates football scoreline probabilities from expected goals. It answers: "If the home team is expected to score this many goals and the away team is expected to score that many goals, what scorelines and match outcomes are most likely?"

## What Is Implemented

- Expected goals are supplied directly as inputs.
- Home and away goal counts are modeled with independent Poisson distributions.
- Scoreline probabilities are generated up to a configurable max goals value.
- The default max goals value is `7`.
- The truncated score matrix is normalized so outcome probabilities sum close to `1`.
- Win, draw, and loss probabilities are aggregated from scorelines.
- Most likely scorelines can be ranked for explanation.

## Key Assumptions

| Assumption | Current Choice | Notes |
| --- | --- | --- |
| Goal distribution | Poisson | Simple, transparent, and common for football goal modeling. |
| Home and away independence | Independent distributions | Real matches have correlation; Dixon-Coles begins to address low-score dependence. |
| Expected goals source | Provided by caller | Mapping ratings or team strengths to expected goals is deferred. |
| Max goals | `7` | Captures most common outcomes while keeping tests and outputs small. |
| Matrix normalization | Enabled | Corrects the small probability tail beyond max goals. |

## Why Poisson Is Useful

Poisson modeling produces scoreline probabilities, not only win/draw/loss probabilities. That makes future dashboard explanations stronger because users can see likely scores and understand where the outcome probabilities come from.

## Deferred Work

- Estimate expected goals from historical attack and defense strengths.
- Map Elo differences to expected goals.
- Add home advantage.
- Add competition and recency weighting.
- Compare Poisson outputs against Elo-only outputs in backtests.
- Calibrate parameters on validated historical data.
