# World Cup 2026 Semifinal Simulation Foundation

Phase 10.13 adds the semifinal advancement projection layer. It deterministically derives 4 projected semifinal participants and 2 projected semifinal fixtures from the existing quarterfinal match simulation foundation. No semifinal match probabilities are computed in this phase.

## Handler

`simulateWorldCup2026SemifinalFoundation()`

- Consumes `simulateWorldCup2026QuarterfinalMatchesFoundation()` to obtain 4 simulated quarterfinal fixtures with win/draw/win probabilities.
- Applies a deterministic winner-selection rule to each simulated quarterfinal fixture.
- Pairs the 4 projected winners into 2 semifinal fixtures.

## Winner Selection Logic

For each quarterfinal simulated fixture:

1. Highest win probability wins.
2. If `homeWinProbability === awayWinProbability`, the team with the higher Live Elo rating advances.
3. If Elo is also equal or unavailable, the home team advances.

No penalties. No randomization. The output is fully deterministic.

## Pairing

Projected quarterfinal winners are paired in bracket order:

- QF match 1 winner vs QF match 2 winner = SF 1
- QF match 3 winner vs QF match 4 winner = SF 2

## Output Fields

Each `WorldCup2026SemifinalQualifier` includes:

- `team`
- `qualificationSource`
- `sourceFixtureId`
- `sourceSlot`
- `advancementReason`
- `probabilitySnapshot`
- `sourceHomeTeam`
- `sourceAwayTeam`
- `homeRatingSource`
- `awayRatingSource`

Each `WorldCup2026SemifinalFixture` includes:

- `fixtureId`
- `round`
- `slot`
- `homeTeam`
- `awayTeam`
- `homeQualifier`
- `awayQualifier`
- `status`

## Limitations

- No semifinal match simulation yet.
- No extra time or penalty shootout modeling.
- No finalist generation.
- No champion probabilities.
- Semifinal teams are projected from quarterfinal pre-match probabilities, not real played results.

## Future Phases

- Semifinal match simulation
- Final projection
- Later knockout resolution phases with explicit draw-resolution modeling if needed
