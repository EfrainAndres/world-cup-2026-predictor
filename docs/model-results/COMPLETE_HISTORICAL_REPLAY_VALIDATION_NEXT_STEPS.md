# Complete Historical Replay Validation Next Steps

Phase 4.0O completes the historical replay validation foundation. The next decision is whether to continue model validation or begin exposing stable outputs.

## Recommended Next Step

Phase 5.0 - API Foundation is reasonable if the project is ready to expose clearly labeled foundation outputs.

## Model Improvements To Consider

Before making stronger model-quality claims, future work should:

1. Add complete pre-tournament international match history.
2. Rebuild true Elo snapshots before each tournament.
3. Calibrate Elo-to-expected-goals mapping.
4. Use reconstructed brackets directly in historical Monte Carlo replay.
5. Compare simulated group qualification and knockout paths against actual paths.
6. Expand calibration reports beyond champion-only summaries.

## API Readiness Notes

If Phase 5.0 begins, API outputs should include:

- Model version.
- Data cutoff.
- Snapshot type.
- Replay validation status.
- Foundation warnings.
- Clear limitations.

No endpoint should present historical replay output as final predictive accuracy.
