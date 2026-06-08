# Model Strategy

The modeling plan is intentionally progressive. The project should start with simple, explainable baselines and only add complexity when validation shows it is useful.

## Modeling Principles

- Build a baseline before advanced models.
- Make assumptions explicit.
- Use chronological backtesting to avoid data leakage.
- Evaluate probabilities, not just predicted winners.
- Report uncertainty and limitations in the dashboard.
- Compare new models against earlier baselines.

## Elo Baseline

Elo ratings estimate team strength through match results over time.

Planned use:

- Maintain a rating for each national team.
- Update ratings after each match based on expected result versus actual result.
- Convert rating differences into win, draw, and loss probabilities.
- Use as the first transparent benchmark.

Key decisions for later:

| Decision | Why It Matters |
| --- | --- |
| Starting rating | Affects early historical estimates. |
| K-factor | Controls how quickly ratings react to results. |
| Home or neutral adjustment | International tournaments often include neutral-site matches. |
| Goal difference adjustment | May improve signal but can overfit if too aggressive. |
| Recency handling | Recent team strength may matter more than old results. |

## Poisson Goal Model

A Poisson model estimates how many goals each team is likely to score.

Planned use:

- Estimate team attack and defense strengths.
- Estimate expected goals for each matchup.
- Convert score probabilities into win, draw, and loss probabilities.

Strengths:

- Produces interpretable scoreline probabilities.
- Connects naturally to match outcome probabilities.
- Works well as a standard football modeling baseline.

Risks:

- Football scores are low and not always independent.
- National team data can be sparse.
- Team strength may change quickly due to squads, injuries, and coaching.

## Dixon-Coles Adjustment

The Dixon-Coles model adjusts the basic Poisson approach, especially for low-scoring results such as 0-0, 1-0, 0-1, and 1-1.

Planned use:

- Improve realism for common low-score outcomes.
- Compare against the plain Poisson model using backtesting.
- Keep the adjustment documented and validated.

## Monte Carlo Tournament Simulation

Monte Carlo simulation will use match probability estimates to simulate the tournament many times.

Planned use:

- Simulate group-stage matches.
- Apply tournament rules for standings and tiebreakers.
- Simulate knockout rounds.
- Estimate probabilities for reaching each stage, making the final, and winning the tournament.

Important checks:

- Simulation rules match the official tournament format.
- Random seeds allow reproducible test runs.
- Large simulation runs produce stable probabilities.
- Edge cases such as ties and tiebreakers are tested.

## Backtesting

Backtesting should evaluate how models would have performed on historical matches that occurred after the training cutoff.

Basic approach:

1. Choose a historical cutoff date.
2. Train the model only on data before that date.
3. Predict matches after that date.
4. Score predictions against actual outcomes.
5. Repeat across multiple windows.

Avoid:

- Training on future matches.
- Selecting model settings only because they fit one tournament.
- Reporting only accuracy when probabilities are poorly calibrated.

## Metrics

| Metric | Purpose | Notes |
| --- | --- | --- |
| Accuracy | Measures how often the top predicted outcome is correct. | Easy to understand but limited for probability models. |
| Log loss | Rewards confident correct probabilities and penalizes confident wrong probabilities. | Strong metric for probabilistic predictions. |
| Brier score | Measures squared error between predicted probabilities and outcomes. | Useful for calibration and easier to explain than log loss. |
| Calibration | Checks whether predicted probabilities match observed frequencies. | Important for user trust. |
| Baseline comparison | Shows whether a new model beats a simple benchmark. | Prevents complexity without value. |

## Reporting Expectations

Model reports should include:

- Data cutoff date.
- Training data summary.
- Feature assumptions.
- Metrics by model version.
- Known limitations.
- Examples where the model performs well and poorly.

The future dashboard should present probabilities as estimates with uncertainty, not as guaranteed outcomes.
