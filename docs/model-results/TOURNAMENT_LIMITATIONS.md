# Tournament Limitations

## Current Limitations

The Phase 4.0B tournament simulation is a foundation, not a complete World Cup simulator.

| Limitation | Status |
| --- | --- |
| Full 48-team FIFA 2026 format | Not implemented yet. |
| Official FIFA group tie-breakers | Not fully implemented yet. |
| Real fixtures and groups | Not loaded yet. |
| Third-place qualification rules | Not implemented yet. |
| Extra time model | Not implemented yet. |
| Penalty shootout model | Replaced by simple deterministic tie-break randomness. |
| Team-specific knockout probabilities | Simplified with a shared knockout score matrix. |
| Repeated tournament probability estimates | Not implemented yet. |
| Dashboard/API/database integration | Not implemented yet. |

## Modeling Limitations

The tournament engine depends on input score probability matrices. It does not decide whether the match model is calibrated, fair, or historically accurate.

## Data Limitations

This phase does not download or use real World Cup 2026 teams, groups, fixtures, venues, kickoff times, or rules metadata.

## Future Improvements

Future phases should add:

- Repeated tournament simulations with champion and stage probabilities.
- Full FIFA 2026 tournament format support.
- Official group tie-breakers.
- Knockout extra time and penalty shootout modeling.
- Team-specific match probability generation.
- Real fixture loading from validated data.
- Simulation stability reports.
