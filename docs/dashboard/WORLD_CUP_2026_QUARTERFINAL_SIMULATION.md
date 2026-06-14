# World Cup 2026 Quarterfinal Simulation Foundation

Phase 10.11 adds the quarterfinal advancement projection layer. It deterministically derives 8 projected quarterfinal participants and 4 projected quarterfinal fixtures from the existing Round of 16 match simulation (Phase 10.10). No quarterfinal match probabilities are computed in this phase.

## Handler

`simulateWorldCup2026QuarterfinalFoundation()`

- Consumes `simulateWorldCup2026RoundOf16MatchesFoundation()` to obtain 8 simulated R16 fixtures with win/draw/win probabilities.
- For each fixture, applies a deterministic winner-selection rule to derive the projected QF qualifier.
- Pairs the 8 qualifiers sequentially into 4 quarterfinal fixtures.

## Winner Selection Logic

For each Round of 16 simulated fixture:

1. **Highest win probability wins.** If `homeWinProbability > awayWinProbability`, the home team advances. If `awayWinProbability > homeWinProbability`, the away team advances.
2. **Elo tie-break.** If win probabilities are equal, the team with the higher Live Elo rating advances.
3. **Home team wins.** If Elo ratings are also equal, the home team advances.

No penalties. No randomization. The output is fully deterministic.

## advancementReason values

| Scenario | advancementReason |
| --- | --- |
| Team has higher win probability | `"advanced via highest pre-match win probability"` |
| Equal win probability, higher Elo | `"advanced via Elo tie-break (equal win probability)"` |
| Equal win probability and equal Elo | `"advanced as home team (equal win probability and equal Elo)"` |

## Fixture Pairing

The 8 R16 winners are paired into 4 QF fixtures sequentially:

| QF Slot | Home team source | Away team source |
| --- | --- | --- |
| 1 | R16 match 1 winner | R16 match 2 winner |
| 2 | R16 match 3 winner | R16 match 4 winner |
| 3 | R16 match 5 winner | R16 match 6 winner |
| 4 | R16 match 7 winner | R16 match 8 winner |

## Output Fields

Each `WorldCup2026QuarterfinalQualifier` contains:

| Field | Description |
| --- | --- |
| `team` | Projected advancing team name |
| `qualificationSource` | `"round_of_16"` |
| `sourceFixtureId` | ID of the source R16 simulation fixture |
| `sourceSlot` | Slot number of the source R16 fixture (1–8) |
| `advancementReason` | Deterministic advancement reason string |
| `sourceHomeTeam` / `sourceAwayTeam` | Home and away teams of the source R16 match |
| `sourceHomeWinProbability` / `sourceDrawProbability` / `sourceAwayWinProbability` | Probability snapshot from the source R16 simulation |
| `homeRatingSource` / `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |

Each `WorldCup2026QuarterfinalFixture` contains:

| Field | Description |
| --- | --- |
| `fixtureId` | `wc2026-qf-NN` (slot-indexed) |
| `round` | `"quarterfinals"` |
| `slot` | 1–4 |
| `homeTeam` / `awayTeam` | Projected qualifier team names |
| `homeQualifier` / `awayQualifier` | Full `WorldCup2026QuarterfinalQualifier` objects |
| `status` | `"projected"` |

## Data Flow

```
simulateWorldCup2026RoundOf16MatchesFoundation()
  → 8 R16 simulated fixtures (homeWinProbability, awayWinProbability, ...)

buildLiveEloPipelineFoundation()
  → buildWorldCup2026CoverageEntries()
  → buildCoverageLookup()
  → Elo tie-break lookup for equal-probability fixtures

deriveQuarterfinalQualifier() × 8
  → projectedQuarterfinalTeams: WorldCup2026QuarterfinalQualifier[]

pair sequentially (2 per QF fixture)
  → projectedQuarterfinalFixtures: WorldCup2026QuarterfinalFixture[]
```

## Limitations

- **No QF match simulation**: probabilities for QF matches are not computed in this phase.
- **No semifinal generation**: this phase ends after QF fixture creation.
- **No winner selection for QF**: the projected QF participants are output only.
- **No extra time / penalty modeling**: advancement from R16 draws is not simulated.
- **No champion probabilities**: beyond scope of this phase.
- **Participants are doubly-projected**: R16 teams are themselves projected from R32 pre-match probabilities.

## Future Phases

- Quarterfinal match simulation (Phase 10.12+)
- Semifinal foundation
- Final projection
