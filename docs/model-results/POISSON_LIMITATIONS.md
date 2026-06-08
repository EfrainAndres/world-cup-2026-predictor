# Poisson Limitations

## Current Limitations

The Phase 3.0 Poisson implementation is a foundation, not a fully trained football model.

| Limitation | Impact |
| --- | --- |
| Expected goals are caller-provided | The model does not yet know team strength by itself. |
| Home and away goals are independent | Real match scoring can be correlated, especially in low-score outcomes. |
| No home advantage | Neutral-site and host effects are not modeled yet. |
| No attack/defense calibration | The model cannot yet learn team-specific scoring tendencies. |
| No recency weighting | Recent form does not affect expected goals yet. |
| No competition weighting | Friendlies, qualifiers, and tournament matches are treated outside this model. |
| No backtesting | There is no evidence yet that Poisson improves over Elo. |

## Probability Tail

The score matrix uses a default maximum of `7` goals for each team. This covers the vast majority of realistic international football scorelines, but it leaves a small probability tail for scores above that range. The implementation normalizes the truncated matrix so home/draw/away probabilities sum close to `1`.

## User Trust Guidance

Poisson outputs should be described as uncertainty estimates, not guarantees. A `55%` home win probability means the home team is favored under the model assumptions, not that the home team should be expected to win with certainty.

## Future Improvements

- Calibrate attack and defense strengths from validated historical results.
- Map Elo rating differences to expected goals.
- Add home advantage and neutral-site handling.
- Add recency and competition weighting.
- Backtest against Elo and historical win-rate baselines.
- Review calibration and draw prediction behavior.
