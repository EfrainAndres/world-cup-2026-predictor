# Real Historical Backtesting Next Steps

Phase 4.0I validates the report layer. Phase 4.0J adds baseline pre-tournament snapshots from seed ratings. The next step is to replay historical tournaments with stronger pre-tournament model inputs.

## Path To True Model Backtesting

1. Generate pre-tournament Elo snapshots.
2. Map Elo ratings to expected goals.
3. Run historical tournament simulations before each tournament.
4. Compare predictions with actual results.
5. Calibrate model parameters.
6. Publish results carefully with limitations.

## Required Snapshot Metadata

Every real historical probability snapshot should include:

- Tournament year.
- Model version.
- Data cutoff.
- Source dataset version.
- Feature set.
- Simulation count when tournament simulation is used.
- Generation command or reproducible workflow.
- Known exclusions.

## Phase 4.0J Completed Scope

Phase 4.0J focused on baseline pre-tournament snapshot generation:

- Built deterministic helpers to generate baseline historical snapshots.
- Added seed-rating probability normalization.
- Added look-ahead bias guardrails.
- Avoided using tournament results from the evaluated year.
- Stored model version and data cutoff metadata.
- Produced report inputs that can replace `synthetic_report_fixture` snapshots.

## Recommended Phase 4.0K Scope

Phase 4.0K should focus on historical tournament replay backtesting:

- Use `baseline_pre_tournament_snapshot` outputs in historical reports.
- Compare replay outputs against actual outcomes.
- Document whether seed-rating baselines are useful enough to keep.
- Prepare the path for true Elo replay from historical match data.
- Keep all claims conservative until calibrated model snapshots exist.

## Publishing Guidance

Published backtesting results should:

- Report uncertainty.
- Compare against baselines.
- Include Brier Score and Log Loss.
- Include calibration notes.
- Identify weaknesses.
- Avoid guarantee language.

If results are poor or inconclusive, document that honestly. A transparent weak baseline is more credible than an overstated one.
