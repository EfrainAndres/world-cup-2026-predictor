# Historical Bracket Reconstruction Limitations

Phase 4.0N improves historical replay realism, but it is still a foundation.

## Simplified Tie-Breakers

Group tables use points, goal difference, goals for, and team-name fallback sorting. The full official FIFA tie-breaker chain is not modeled yet.

This is deterministic and works for the current curated fixtures, but future validation should add the official tie-breaker sequence before treating standings reconstruction as final.

## Result-Level Reconstruction

The reconstruction uses fixture-level results only. It does not model:

- Substitutions.
- Cards.
- Match events.
- Penalty shootout details beyond the recorded winner and penalty score.
- Minute-by-minute state.

## Missing Model Features

This phase does not add player-level data, expected goals, travel effects, rest-day modeling, injury data, or squad-strength adjustments.

## No Accuracy Claim

Historical bracket reconstruction does not prove predictive accuracy. It rebuilds actual historical paths so future replay simulations can be evaluated more realistically.

Public model-quality claims still require complete pre-tournament inputs, calibrated probability generation, and careful validation.
