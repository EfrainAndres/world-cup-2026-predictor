# Historical Replay Accuracy Audit Limitations

Phase 4.0P audits the replay foundation. It does not remove the underlying modeling limitations.

## Metric Availability Is Not Accuracy

The audit confirms that Brier Score, Log Loss, and Top-N hit fields exist. It does not prove that the probabilities are calibrated or predictive.

## Foundation Inputs Remain Limited

Current historical Elo snapshots may still rely on curated fixture history rather than full pre-tournament international match history. That limits how strongly replay results can be interpreted.

## Simulation Limits Remain

Historical Monte Carlo replay still uses an uncalibrated Elo-to-expected-goals mapping. Reconstructed brackets improve tournament realism, but do not add calibrated match probabilities.

## Feature Gaps Remain

The audit does not add:

- Player-level data.
- Injury data.
- Squad-strength modeling.
- xG.
- Travel effects.
- Rest-day effects.
- Full official tie-breaker chains.

## No Public Accuracy Claim

Audit output is suitable for internal readiness checks and careful API metadata. It is not a public model-quality claim.
