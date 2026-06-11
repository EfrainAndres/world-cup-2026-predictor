# Historical Replay Accuracy Audit Assumptions

Phase 4.0P adds an audit layer over the historical replay foundation.

## What The Audit Does

The audit summarizes whether each supported historical year has the replay artifacts needed for responsible API exposure:

- Complete fixture dataset.
- Reconstructed historical bracket.
- Historical Elo snapshot replay.
- Historical Monte Carlo replay.
- Complete replay validation status.
- Required scoring metrics.

The supported audit years are 2010, 2014, 2018, and 2022.

## Required Metrics

The audit checks availability of:

- Brier Score.
- Log Loss.
- Top-1 champion hit.
- Top-3 champion hit.
- Top-5 champion hit.

Metric availability means the metric exists in the replay artifacts. It does not mean the model is accurate or calibrated.

## API Readiness

The audit returns one of three recommendations:

| Recommendation | Meaning |
| --- | --- |
| `ready` | All checks pass and no warnings are present. |
| `ready_with_warnings` | Required artifacts are available, but foundation limitations remain. |
| `not_ready` | Required artifacts, metrics, or validation components are missing or failed. |

## Accuracy Claim Boundary

This audit does not claim real predictive accuracy. It verifies that the current replay foundation is auditable and that warnings are visible before any API or dashboard exposure.
