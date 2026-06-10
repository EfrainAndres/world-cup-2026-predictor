# Real Historical Backtesting Next Steps

Phase 4.0I validates the report layer. The next step is to generate true historical probability snapshots.

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

## Recommended Phase 4.0J Scope

Phase 4.0J should focus on true pre-tournament snapshot generation:

- Build a deterministic command or helper to generate historical snapshots.
- Ensure Elo is calculated only from matches before the cutoff.
- Avoid using tournament results from the evaluated year.
- Store or emit model version metadata.
- Produce report inputs that can replace `synthetic_report_fixture` snapshots.

## Publishing Guidance

Published backtesting results should:

- Report uncertainty.
- Compare against baselines.
- Include Brier Score and Log Loss.
- Include calibration notes.
- Identify weaknesses.
- Avoid guarantee language.

If results are poor or inconclusive, document that honestly. A transparent weak baseline is more credible than an overstated one.
