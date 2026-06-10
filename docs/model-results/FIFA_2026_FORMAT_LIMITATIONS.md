# FIFA 2026 Format Limitations

## Current Limitations

Phase 4.0D models the tournament structure but does not make the project a complete FIFA 2026 simulator yet.

| Limitation | Status |
| --- | --- |
| Real FIFA fixtures | Not loaded yet. |
| Real groups | Not loaded yet. |
| Real teams | Not loaded yet. |
| Official knockout slot mapping | Not fully implemented yet. |
| Official FIFA tie-breakers | Simplified. |
| Third-place mapping to Round of 32 slots | Not official yet. |
| API/UI/database integration | Not implemented yet. |

## Simplified Tie-Breakers

Third-place ranking currently uses points, goal difference, goals for, then team name. Official FIFA tie-breakers include additional criteria that should be modeled later.

## Fixture Mapping

The simple Round of 32 builder pairs teams deterministically for development and validation. It should not be treated as the official FIFA 2026 knockout bracket.

## Future Work

Future phases should add:

- Validated real fixture and group data.
- Official Round of 32 slot mapping.
- Official group and third-place tie-breakers.
- Integration with tournament simulation and repeated-run summaries.
- API or dashboard outputs only after the format model is realistic enough to explain.
