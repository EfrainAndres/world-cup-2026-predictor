# Historical Bracket Reconstruction Validation Report

Phase 4.0N validates that reconstructed historical brackets match the curated 2010, 2014, 2018, and 2022 World Cup fixture structure.

## Match Count Validation

Each tournament is validated against the historical 32-team format:

| Check | Expected |
| --- | ---: |
| Total matches | 64 |
| Group-stage matches | 48 |
| Knockout and placement matches | 16 |
| Round of 16 fixtures | 8 |
| Quarter-final fixtures | 4 |
| Semi-final fixtures | 2 |
| Third-place fixtures | 1 |
| Final fixtures | 1 |

Invalid totals are rejected before a reconstructed bracket is returned.

## Group Validation

The validation checks that reconstruction produces:

- 8 groups.
- 4 teams per group.
- 6 fixtures per group.
- 8 group winners.
- 8 group runners-up.

Group tables are tested against real fixture data, including 2022 Group C standings.

## Knockout Validation

The validation checks that every knockout and placement fixture has a winner. This is required because penalty-decided scoreline draws still need an actual advancing or placement team.

## Outcome Validation

The final winner becomes the champion. The final loser becomes the runner-up. The third-place fixture winner becomes third place when the fixture is available.

## Current Test Coverage

Deterministic Vitest tests cover:

- 2010, 2014, 2018, and 2022 bracket reconstruction.
- Match count and stage count validation.
- Group standings and qualifiers.
- Knockout round counts.
- Champion, runner-up, and third-place extraction.
- Rejection of missing knockout winners.
- Rejection of invalid match counts.
- Separation from the FIFA 2026 tournament format.
