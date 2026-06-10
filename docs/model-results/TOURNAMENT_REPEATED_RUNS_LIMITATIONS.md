# Tournament Repeated Runs Limitations

## Current Limitations

Phase 4.0C works only with the simplified tournament simulation foundation.

| Limitation | Status |
| --- | --- |
| Full FIFA World Cup 2026 official format | Not implemented yet. |
| Real fixtures and groups | Not loaded yet. |
| Official FIFA tie-breakers | Not fully implemented yet. |
| Third-place qualification | Not implemented yet. |
| Extra time and penalty shootout modeling | Not implemented yet. |
| Real calibration and backtesting | Not implemented yet. |
| UI/API/database integration | Not implemented yet. |
| Very large run-count performance | Not optimized yet. |

## Interpretation Limits

Repeated-run probabilities depend entirely on the tournament input and match probability matrices. They should not be treated as trustworthy predictions until the underlying match model, fixtures, and assumptions are validated.

## Future Work

Future phases should add:

- Full FIFA 2026 format and fixture modeling.
- Official group and knockout rules.
- Real data loading from validated sources.
- Stability checks across multiple run counts.
- Dashboard-ready exports.
- Model calibration and historical backtesting.
