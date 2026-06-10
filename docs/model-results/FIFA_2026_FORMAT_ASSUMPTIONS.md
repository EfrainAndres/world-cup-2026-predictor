# FIFA 2026 Format Assumptions

## Purpose

Phase 4.0D adds a structure model for the FIFA World Cup 2026 format without loading real teams, groups, or fixtures.

## Modeled Format

The model targets:

- `48` total teams.
- `12` groups.
- `4` teams per group.
- Top `2` teams from each group qualify automatically.
- The `8` best third-place teams also qualify.
- `32` teams enter the knockout stage.

## Group IDs

Groups are modeled as `A` through `L`.

## Qualification Assumptions

The qualification helper selects:

1. All 12 group winners.
2. All 12 group runners-up.
3. The best 8 third-place teams.

Third-place teams are ranked by:

1. Points.
2. Goal difference.
3. Goals for.
4. Team name as a deterministic fallback.

## Bracket Assumptions

This phase provides a configurable/foundation Round of 32 fixture model and a simple deterministic bracket builder for development and tests.

The official FIFA 2026 knockout slot mapping is not hardcoded yet. Future work should replace or extend the simple builder once official fixture and slot rules are modeled in validated data.

## No Real Fixture Loading Yet

This phase does not download, scrape, or load official fixtures. All tests use synthetic teams and standings.
