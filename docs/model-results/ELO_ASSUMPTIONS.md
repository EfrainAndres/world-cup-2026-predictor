# Elo Assumptions

## What Elo Does

Elo estimates team strength by updating ratings after matches. A team gains rating points when it performs better than expected and loses rating points when it performs worse than expected.

This baseline uses Elo because it is:

- Simple.
- Explainable.
- Deterministic.
- Easy to test.
- Useful as a benchmark before more complex models.

## Current Assumptions

| Assumption | Current Decision |
| --- | --- |
| Initial team rating | `1500` |
| K-factor | `20` |
| Win result | `1` |
| Draw result | `0.5` |
| Loss result | `0` |
| Expected score formula | Standard Elo expected score formula |
| Neutral site | Accepted in input but not used yet |
| Home advantage | Not implemented yet |

## What Elo Does Not Do Yet

The current Elo baseline does not account for:

- Home advantage.
- Competition weighting.
- Recency weighting.
- Margin of victory.
- Team lineups.
- Injuries or suspensions.
- Travel or rest days.
- FIFA ranking comparison.
- Goal-level probabilities.

## Future Improvements

Future phases may add:

- Home advantage adjustment.
- Competition weighting.
- Recency weighting.
- Margin-of-victory scaling.
- FIFA rankings comparison.
- Integration with Poisson goal modeling.
