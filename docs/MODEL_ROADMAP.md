# Model Roadmap

The modeling path should move from simple and explainable to more realistic and complex. Each step should be evaluated against previous baselines before it becomes part of the product.

## Modeling Sequence

| Stage | Model | Purpose | MVP Role |
| --- | --- | --- | --- |
| Baseline 0 | Simple historical win-rate baseline | Establish a naive benchmark. | Required benchmark. |
| Baseline 1 | Elo-only model | Produce transparent team strength estimates and match probabilities. | First useful model. |
| Model 2 | Elo + Poisson goals | Estimate expected goals and scoreline-driven outcome probabilities. | Candidate MVP improvement. |
| Model 3 | Dixon-Coles adjustment | Improve low-score probability behavior. | Post-baseline enhancement. |
| Model 4 | Monte Carlo tournament simulation | Convert match probabilities into tournament path probabilities. | Required for simulation view once match model is trusted. |

## Baseline 0: Historical Win-Rate Baseline

This baseline should answer: "How well can a very simple historical summary do?"

Possible variants:

- Overall historical win/draw/loss rates.
- Team-level historical win rates.
- Recent-window win rates.

Use this baseline to prove that later models add value.

## Baseline 1: Elo-Only Model

The Elo model should:

- Maintain team ratings over time.
- Update ratings after matches.
- Use only information available before each match.
- Convert rating differences into match outcome probabilities.
- Support clear dashboard explanations.

Key parameters:

- Initial rating.
- K-factor.
- Home/neutral-site adjustment.
- Goal-difference adjustment, if used.
- Recency weighting, if used.

## Model 2: Elo + Poisson Goals

This model should combine strength estimates with expected goal modeling.

It should:

- Estimate expected home and away goals.
- Convert goal distributions into win/draw/loss probabilities.
- Produce scoreline probabilities for dashboard explanation.
- Compare against Elo-only outputs with backtesting.

## Model 3: Dixon-Coles Adjustment

Dixon-Coles should be considered after the plain Poisson model works.

It should:

- Adjust low-score outcomes such as 0-0, 1-0, 0-1, and 1-1.
- Be validated against the plain Poisson model.
- Be used only if it improves probabilistic metrics or calibration.

## Model 4: Monte Carlo Tournament Simulation

The simulation layer should use trusted match probabilities to estimate tournament outcomes.

It should:

- Simulate group-stage results.
- Apply official standings and tiebreaker rules.
- Simulate knockout rounds.
- Estimate stage, final, and champion probabilities.
- Record model version, simulation count, and random seed policy.

## Future Model Ideas

These are out of MVP scope unless earlier models are stable and validated:

- Expected goals data.
- Player availability.
- Travel distance.
- Rest days.
- Squad strength.
- Injuries and suspensions.
- Coaching changes.
- Tournament venue effects.
- Market odds as a comparison benchmark.

## Out Of Scope For MVP

MVP should not include:

- Player-level predictive models.
- Injury scraping.
- Betting recommendations.
- Live in-match prediction.
- Real-time automated refresh.
- Deep learning models.
- Complex ensemble methods.

The MVP should prove the data pipeline, Elo baseline, validation reports, and clear prediction UX before expanding model complexity.
