# Pre-Tournament Snapshot Limitations

Phase 4.0J creates a baseline snapshot generator. It is not the final historical model replay system.

## Current Limitations

| Limitation | Impact |
| --- | --- |
| No complete pre-tournament international match history yet | Elo ratings cannot be replayed from all prior matches. |
| No real Elo replay before each tournament yet | Seed ratings are caller-supplied baseline inputs. |
| No calibrated Elo-to-goals mapping yet | Snapshot probabilities are not tied to goal models. |
| No real tournament simulation snapshot yet | Outputs are normalized rating weights, not Monte Carlo tournament probabilities. |
| No player availability data | Injuries, squads, suspensions, and lineups are absent. |
| No travel, rest, venue, or xG features | Contextual model features are not represented. |
| No public accuracy claim yet | Baseline snapshots are implementation foundations, not proven predictions. |

## What The Baseline Does Not Do

The baseline does not:

- Learn parameters from historical outcomes.
- Use post-tournament results.
- Simulate match paths.
- Estimate scorelines.
- Account for group draw difficulty.
- Validate calibration.

## Future Work Needed

Before historical snapshots can support model-quality claims, the project needs:

- Validated international match history before each tournament.
- Sequential Elo replay with data cutoffs.
- Mapping from ratings to expected goals.
- Tournament simulations created before the evaluated tournament.
- Baseline comparisons and calibration reports.
