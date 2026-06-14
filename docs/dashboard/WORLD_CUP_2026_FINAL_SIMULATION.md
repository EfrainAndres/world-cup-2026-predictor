# World Cup 2026 Final Simulation Foundation

Phase 10.15 adds the projected Final participant layer. It deterministically derives 2 projected finalists and 1 projected Final fixture from the existing semifinal match simulation foundation. No Final match probabilities are computed in this phase.

## Handler

`simulateWorldCup2026FinalFoundation()`

- Consumes `simulateWorldCup2026SemifinalMatchesFoundation()` to obtain 2 simulated semifinal fixtures with win/draw/win probabilities.
- Applies a deterministic winner-selection rule to each semifinal fixture.
- Pairs the 2 projected winners into 1 Final fixture.

## Winner Selection Logic

For each semifinal simulated fixture:

1. Highest win probability wins.
2. If `homeWinProbability === awayWinProbability`, the team with the higher Live Elo rating advances.
3. If Elo is also equal or unavailable, the home team advances.

No penalties. No randomization. The output is fully deterministic.

## Fixture Generation

The two semifinal winners become the projected Final fixture:

- SF match 1 winner vs SF match 2 winner = Final

## Output Fields

Each `WorldCup2026FinalQualifier` includes:

- `team`
- `qualificationSource`
- `semifinalSourceFixtureId`
- `sourceSlot`
- `advancementReason`
- `probabilitySnapshot`
- `sourceHomeTeam`
- `sourceAwayTeam`
- `homeRatingSource`
- `awayRatingSource`

Each `WorldCup2026FinalFixture` includes:

- `fixtureId`
- `round`
- `slot`
- `homeTeam`
- `awayTeam`
- `homeQualifier`
- `awayQualifier`
- `status`

## Limitations

- No Final match simulation yet.
- No extra time or penalty shootout modeling.
- No champion selection.
- No title probabilities.
- Finalists are projected from semifinal pre-match probabilities, not real played results.

## Future Phases

- Final match simulation
- Champion projection
- Later knockout resolution phases with explicit draw-resolution modeling if needed
