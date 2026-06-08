# Model Validation

Model validation is the process of checking whether model predictions are useful, honest, and safe to show to users.

## Why Validation Matters

Football predictions are uncertain. A model can look convincing while being poorly calibrated, overfit to historical data, or accidentally trained on future information.

Validation matters because it:

- Protects against misleading users.
- Shows whether complexity actually improves predictions.
- Makes model limitations visible.
- Supports portfolio credibility.
- Turns QA into part of the product, not just a release gate.

## Evaluating Predictions Probabilistically

The project should evaluate predicted probabilities, not only the most likely winner.

For a match with probabilities:

- Home win: `0.50`
- Draw: `0.25`
- Away win: `0.25`

The model should be judged on whether those probabilities are well calibrated over many matches, not only whether the home team wins this one match.

## Metrics

| Metric | What It Measures | Why It Matters |
| --- | --- | --- |
| Accuracy | How often the top predicted outcome is correct. | Easy to understand, but incomplete. |
| Brier Score | Squared error between predicted probabilities and actual outcomes. | Rewards calibrated probabilities and is easier to explain than log loss. |
| Log Loss | Penalty for assigning low probability to the true outcome. | Strong probabilistic metric; punishes overconfident wrong predictions. |
| Calibration | Whether predicted probabilities match real frequencies. | A model that says 60% should be right about 60% over time. |
| Confusion Matrix | Counts predicted class versus actual class. | Helps reveal class-specific patterns, such as underpredicting draws. |

## Why Accuracy Alone Is Not Enough

Accuracy ignores confidence.

Example:

- Model A predicts home win at 40% and is correct.
- Model B predicts home win at 95% and is correct.

Both get the same accuracy credit, but they are very different probability forecasts. Accuracy also hides whether the model is bad at draws, underdogs, or closely matched teams.

Use accuracy as a communication metric, not the main validation metric.

## Validation Risks

| Risk | Description | Mitigation |
| --- | --- | --- |
| Data leakage | Model uses information that would not have been known before kickoff. | Enforce time-based splits and feature cutoff checks. |
| Overfitting | Model performs well on historical data but poorly on future matches. | Use backtesting windows and compare against simple baselines. |
| Recency bias | Model overreacts to recent results or ignores longer-term strength. | Test multiple recency settings and report sensitivity. |
| Friendly match noise | Friendlies may not reflect tournament strength. | Track match type and evaluate weighting or filtering. |
| Ranking bias | Official rankings may reflect politics of schedule or lag true form. | Treat rankings as optional features, not ground truth. |

## MVP Acceptance Criteria

Before a model is shown as the MVP prediction model:

- It must beat or clearly contextualize the simple historical baseline.
- It must have time-based backtest results.
- It must report accuracy, Brier Score, and log loss.
- It must include calibration review, even if simple.
- It must document data cutoff dates.
- It must prove probabilities are valid and sum to approximately 1.
- It must identify known limitations.

If a more complex model does not beat the Elo baseline on probabilistic metrics, the simpler Elo model should remain the product baseline.
