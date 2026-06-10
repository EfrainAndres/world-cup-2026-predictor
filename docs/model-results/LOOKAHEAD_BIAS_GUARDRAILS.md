# Look-Ahead Bias Guardrails

Look-ahead bias happens when a historical prediction uses information that would not have been available at prediction time.

## Why It Is Dangerous

Look-ahead bias makes a model look better than it really is. If tournament results or post-tournament ratings affect a pre-tournament snapshot, the backtest no longer reflects a real prediction scenario.

This can lead to:

- Overstated model quality.
- False confidence in calibration.
- Misleading portfolio claims.
- Poor future predictions.

## Forbidden Inputs

Pre-tournament snapshots must not use:

- Match results from the evaluated tournament.
- Final tournament standings.
- Knockout bracket outcomes.
- Champion or runner-up labels.
- Post-tournament Elo ratings.
- Post-tournament FIFA rankings.
- Any feature updated after the tournament start date.

## Current Guardrails

Phase 4.0J checks:

| Guardrail | Behavior |
| --- | --- |
| Input data cutoff before tournament start | Flags an error when the cutoff is on or after the tournament start date. |
| Snapshot generated before tournament start | Flags a warning when generated on or after the tournament start date. |
| No actual results in input | Rejects snapshot generation when actual tournament results are marked as included. |

## Future Improvements

Future guardrails should add:

- Source-level date metadata.
- Feature-level availability checks.
- Automated data cutoff validation.
- Model artifact timestamps.
- Reproducible snapshot generation commands.
- CI checks that fail if historical reports use unsafe snapshots.

The safest rule is simple: if the model would not have known it before kickoff, it cannot be used in the snapshot.
