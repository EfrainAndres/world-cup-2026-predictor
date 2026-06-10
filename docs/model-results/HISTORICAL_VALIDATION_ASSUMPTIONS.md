# Historical Validation Assumptions

Phase 4.0E adds a foundation for comparing tournament-level probability snapshots against known tournament outcomes.

This phase does not load real historical World Cup data. It defines deterministic validation helpers and small test fixtures so future backtesting can plug in validated historical datasets later.

## Why Historical Validation Matters

Tournament predictions can look polished while still being poorly calibrated or overconfident. Historical validation helps answer whether the model gives reasonable probabilities to outcomes that actually happened.

This matters because the dashboard should eventually communicate uncertainty, not certainty. A team with a 20% champion probability should not be treated as a failed prediction if it does not win. The question is whether many predictions like that are calibrated over time.

## What Is Validated Now

Current helpers validate:

- Champion probability snapshots.
- Runner-up probability snapshots when available.
- Knockout qualification probability snapshots when available.
- Champion Brier Score.
- Champion Log Loss with safe epsilon handling.
- Top-N champion hit checks.
- Basic runner-up ranking checks.
- Basic knockout qualification hit rates.
- Calibration bucket foundations for champion probabilities.

## Foundation-Only Scope

This phase is intentionally small. It validates metric behavior and input safety, not real model quality.

The helpers use local deterministic fixtures in tests. Real historical tournament data must be added only after source licensing, data dictionary mapping, and ingestion rules are clear.

## No Real Historical Dataset Yet

No real historical World Cup fixtures, results, or tournament probability outputs are loaded in this phase.

That keeps this phase focused on:

- Metric correctness.
- Deterministic behavior.
- Clean TypeScript contracts.
- Documentation of validation assumptions.

## Accuracy Alone Is Not Enough

Accuracy only checks whether the top-ranked prediction was correct. It ignores probability quality.

Example:

| Prediction | Actual Champion | Accuracy | Problem |
| --- | --- | --- | --- |
| Team A 51% | Team A | Correct | Could still be poorly calibrated over many tournaments. |
| Team A 99% | Team B | Wrong | Log Loss should strongly penalize overconfidence. |
| Team A 20% | Team A | Not necessarily bad | Low-probability outcomes should happen sometimes. |

## Why Brier Score And Log Loss Matter

Brier Score rewards probabilities that are close to actual outcomes. It is easier to explain to non-specialists because it is based on squared error.

Log Loss strongly penalizes assigning very low probability to what actually happened. This is useful for detecting overconfident models.

Both metrics are needed before claiming model quality.
