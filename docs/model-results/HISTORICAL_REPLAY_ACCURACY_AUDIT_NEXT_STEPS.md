# Historical Replay Accuracy Audit Next Steps

Phase 4.0P makes the historical replay foundation auditable enough to decide what to expose next.

## Recommended Next Phase

Phase 5.0 - API Foundation.

## API Exposure Guidance

API responses should include:

- Audit status.
- API readiness recommendation.
- Model version.
- Data cutoff.
- Snapshot type.
- Metric availability.
- Foundation warnings.
- Known gaps.

API output should never describe current replay results as final predictive accuracy.

## Future Model Work

Future model phases should:

1. Add complete pre-tournament international match history.
2. Build stronger historical Elo snapshots from that history.
3. Calibrate Elo-to-expected-goals mapping.
4. Use reconstructed brackets directly in replay simulation paths.
5. Expand calibration reports beyond champion-only summaries.
6. Compare group qualification and knockout path simulations against actual outcomes.

These steps are needed before the project can make stronger model-quality claims.
