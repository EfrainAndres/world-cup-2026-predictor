# World Cup 2026 Round of 32 Foundation

Phase 10.6 adds a projected Round of 32 foundation for the World Cup 2026 dashboard and API.

This is not the official knockout bracket. It is a deterministic foundation view derived from current local group standings.

## Tournament Context

The first knockout round contains 32 teams:

- 12 group winners.
- 12 group runners-up.
- 8 best third-place teams.

This phase creates only the projected Round of 32 fixture foundation. It does not simulate winners, create the Round of 16, or calculate champion probabilities.

## API Handler

`getWorldCup2026RoundOf32Foundation()` exposes:

- 32 qualified teams.
- 12 group winners.
- 12 group runners-up.
- 8 best third-place teams.
- 16 projected Round of 32 fixtures.
- qualification source labels for both teams in every fixture.
- source metadata showing the bracket is based on current local standings.
- warning text that pending fixtures can change qualification and official third-place pairing rules may differ.

## Derivation

Qualified teams are derived from the existing standings foundation:

1. take the first-place team from each group as `group_winner`.
2. take the second-place team from each group as `group_runner_up`.
3. rank all third-place teams by points, goal difference, goals for, then team name.
4. take the top 8 third-place teams as `best_third_place`.

The fixture builder then creates 16 deterministic projected slots. This mapping is intentionally simple and stable for dashboard foundation work.

## Fixture Fields

Each projected fixture includes:

- `fixtureId`
- `round`: `round_of_32`
- `slot`
- `homeTeam`
- `awayTeam`
- `homeQualificationSource`
- `awayQualificationSource`
- `status`: `projected`

## Dashboard Section

The dashboard includes `WorldCupRoundOf32Section` before the tournament simulation section.

It displays:

- "Projected Round of 32"
- 32 qualified teams summary
- 16 fixtures
- qualification source labels:
  - Group winner
  - Group runner-up
  - Best third-place
- projected/foundation warning

## Warning

The API and dashboard use this warning:

> Projected Round of 32 foundation based on current local standings. Official third-place pairing rules may differ and pending fixtures can change qualification.

## Boundaries

- No official knockout bracket claim.
- No Round of 16.
- No knockout winner simulation.
- No champion probabilities.
- No external API calls.
- No Elo formula changes.
- No xG formula changes.
