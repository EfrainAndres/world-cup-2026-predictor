# Monte Carlo Limitations

## Current Limitations

The Phase 4.0A simulation engine is intentionally limited to one match at a time.

| Limitation | Status |
| --- | --- |
| Group stage | Not implemented yet. |
| Knockout bracket | Not implemented yet. |
| Full tournament simulation | Not implemented yet. |
| Official World Cup 2026 format rules | Not implemented yet. |
| Group standings and tiebreakers | Not implemented yet. |
| Penalty shootout logic | Not implemented yet. |
| Real dataset calibration | Not implemented yet. |
| Dashboard exports | Not implemented yet. |

## Model Input Limitations

The engine trusts the input score probability matrix. It does not decide whether those probabilities are calibrated, fair, or historically accurate. Poor input probabilities will produce poor simulation outputs.

## Football Context Not Included Yet

This phase does not model:

- Player injuries.
- Squad strength.
- Home advantage.
- Travel distance.
- Rest days.
- Venue effects.
- Competition weighting.
- Recency weighting.
- Tactical matchups.

## Future Improvements

Next phases should add tournament structure gradually:

1. Group-stage standings and tiebreakers.
2. Knockout match resolution.
3. Full tournament path simulation.
4. Simulation stability reports.
5. Dashboard-ready tournament probability exports.

The engine should remain deterministic and testable as those layers are added.
