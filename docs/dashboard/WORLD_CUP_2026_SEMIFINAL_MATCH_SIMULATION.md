# World Cup 2026 Semifinal Match Simulation

Phase 10.14 adds match-level probability simulation for the 2 projected semifinal fixtures. It uses the same Live Elo to Poisson pipeline already used for the Round of 32, Round of 16, and Quarterfinal simulations.

## Handler

`simulateWorldCup2026SemifinalMatchesFoundation()`

- Consumes `simulateWorldCup2026SemifinalFoundation()` to obtain 2 projected semifinal fixtures.
- For each fixture, looks up Live Elo ratings or fallback seed ratings.
- Converts Elo ratings to expected goals via `eloToExpectedGoals` with the existing balanced preset behavior.
- Generates a Poisson score matrix, aggregates win/draw/win probabilities, and returns top scorelines.

## Output Fields

Each `WorldCup2026SemifinalMatchSimulationFixture` contains:

- `fixtureId`
- `round`
- `slot`
- `homeTeam`
- `awayTeam`
- `homeExpectedGoals`
- `awayExpectedGoals`
- `homeWinProbability`
- `drawProbability`
- `awayWinProbability`
- `mostLikelyScorelines`
- `homeRatingSource`
- `awayRatingSource`
- `warnings`

## Treatment of Draws

A draw after 90 minutes remains a valid model output. This phase does not resolve draws with extra time or penalties.

## Fallback Team Behavior

Teams missing from the current Live Elo pipeline receive the deterministic fallback seed rating of `1500`. These fixtures are labeled as partial data in the UI and expose per-fixture fallback warnings.

## Limitations

- No winner selection.
- No final advancement.
- No extra time or penalties.
- No final generation.
- No champion probabilities.

## Future Phases

- Deterministic finalist projection
- Final match simulation
- Later knockout resolution phases with explicit draw-resolution modeling if needed
