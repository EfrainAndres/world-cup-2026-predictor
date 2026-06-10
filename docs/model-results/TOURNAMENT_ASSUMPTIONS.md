# Tournament Assumptions

## Purpose

Phase 4.0B adds a simplified tournament simulation foundation. It uses the existing match simulation engine to simulate group matches, rank teams, qualify top teams, and run a basic knockout bracket.

## Simplified Format

The implementation supports small deterministic demo tournaments, not the full FIFA World Cup 2026 format.

Current assumptions:

- Groups are provided as explicit teams and match fixtures.
- Each group fixture includes its own score probability matrix.
- A configurable number of top teams qualify from each group.
- The total number of qualified teams must be a power of two.
- Knockout fixtures use a shared score probability matrix for now.
- Knockout rounds continue until one champion remains.

## Group Ranking Assumptions

Group standings are sorted by:

1. Points.
2. Goal difference.
3. Goals for.
4. Team name as a deterministic fallback.

Official FIFA tie-breakers are more detailed. This simplified ranking is intentionally transparent and easy to test.

## Knockout Tie-Break Assumptions

If a knockout match is simulated as a draw, the winner is resolved with deterministic seeded randomness when a seed is provided. This stands in for extra time and penalties until those rules are modeled explicitly.

## Seeded Randomness

Tournament simulation accepts a seed or injected random function. The same input and seed should produce the same group results, knockout results, champion, and runner-up.

## Not Full FIFA 2026 Support Yet

This phase does not load real fixtures, does not implement the 48-team FIFA 2026 format, and does not apply official FIFA group ranking or knockout rules. Those items are future work.
