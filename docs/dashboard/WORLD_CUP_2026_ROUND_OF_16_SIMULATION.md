# World Cup 2026 Round of 16 Simulation

Phase 10.9 adds the first projected knockout advancement layer. It derives 16 projected Round of 16 participants from the Round of 32 match simulation and builds 8 projected Round of 16 fixtures.

This is a foundation phase. No Round of 16 matches are simulated. No quarterfinal generation. No champion probabilities.

## Inputs

- **Round of 32 simulation**: The 16 projected R32 fixtures from Phase 10.8 (`simulateWorldCup2026KnockoutFixturesFoundation()`), each with `homeWinProbability`, `drawProbability`, and `awayWinProbability`.
- **Live Elo ratings**: Team Elo ratings from the same pipeline used by Auto Predict From Elo. Used only for tie-breaking when win probabilities are equal.

## Winner Selection Logic

For each Round of 32 fixture, a projected winner is selected using deterministic rules:

1. **Highest win probability wins.** If `homeWinProbability > awayWinProbability`, the home team advances. If `awayWinProbability > homeWinProbability`, the away team advances.

2. **Elo tie-break.** If `homeWinProbability === awayWinProbability`, the team with the higher Live Elo rating advances.

3. **Home team wins.** If win probabilities are equal and Elo ratings are also equal, the home team advances.

### Advancement Reasons

| Scenario | `advancementReason` |
|---|---|
| Higher win probability | `"advanced via highest pre-match win probability"` |
| Equal probabilities, higher Elo | `"advanced via Elo tie-break (equal win probability)"` |
| Equal probabilities, equal Elo | `"advanced as home team (equal win probability and equal Elo)"` |

### Deterministic Tie Breakers

The tie-break chain (probability → Elo → home team) is deterministic and requires no randomization. The same inputs always produce the same projected winner.

## Round of 16 Fixture Pairing

R32 slots are paired sequentially: slot 1 winner vs slot 2 winner forms R16 slot 1, slot 3 vs slot 4 forms R16 slot 2, and so on through slot 15 vs slot 16 for R16 slot 8.

| R16 slot | Home qualifier | Away qualifier |
|---|---|---|
| 1 | R32 slot 1 winner | R32 slot 2 winner |
| 2 | R32 slot 3 winner | R32 slot 4 winner |
| 3 | R32 slot 5 winner | R32 slot 6 winner |
| 4 | R32 slot 7 winner | R32 slot 8 winner |
| 5 | R32 slot 9 winner | R32 slot 10 winner |
| 6 | R32 slot 11 winner | R32 slot 12 winner |
| 7 | R32 slot 13 winner | R32 slot 14 winner |
| 8 | R32 slot 15 winner | R32 slot 16 winner |

## Output Fields

### `WorldCup2026ProjectedQualifier`

| Field | Description |
|---|---|
| `team` | Projected advancing team |
| `qualificationSource` | Always `"round_of_32"` |
| `sourceFixtureId` | The R32 fixture this team won |
| `sourceSlot` | The R32 bracket slot (1–16) |
| `advancementReason` | Human-readable deterministic rule that selected this team |
| `sourceHomeTeam` | Home team of the source R32 fixture |
| `sourceAwayTeam` | Away team of the source R32 fixture |
| `sourceHomeWinProbability` | Home team win probability from R32 simulation |
| `sourceDrawProbability` | Draw probability from R32 simulation |
| `sourceAwayWinProbability` | Away team win probability from R32 simulation |
| `homeRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` for the R32 home team |
| `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` for the R32 away team |

### `WorldCup2026RoundOf16Fixture`

| Field | Description |
|---|---|
| `fixtureId` | Unique identifier (e.g. `"wc2026-r16-01"`) |
| `round` | Always `"round_of_16"` |
| `slot` | R16 bracket slot (1–8) |
| `homeTeam` | Projected home team |
| `awayTeam` | Projected away team |
| `homeQualifier` | Full `WorldCup2026ProjectedQualifier` for the home team |
| `awayQualifier` | Full `WorldCup2026ProjectedQualifier` for the away team |
| `status` | Always `"projected"` |

## Projected Nature

Every output field is a projection, not a match result. The Round of 16 teams are derived from pre-match win probabilities from Round of 32 simulation — not from real match outcomes.

The dashboard warning states: "Round of 16 participants are projected from pre-match probabilities. Real match outcomes are not yet simulated."

## Limitations

- **No Round of 16 match simulation.** Only participants are projected; R16 match probabilities are not computed.
- **No quarterfinal generation.** The bracket stops at R16 fixture participants.
- **No penalty shootout logic.** Extra time and penalties are out of scope.
- **No champion probabilities.** Only R16 participant projection.
- **No external APIs.** All data is local and deterministic.
- **No Elo or xG formula changes.** The same model pipeline as Auto Predict From Elo is reused for Elo lookup.
- **No randomization.** Winner selection is fully deterministic.

## Fallback Team Behavior

Teams not in the Live Elo pipeline use a fallback seed rating of 1500 in the R32 simulation. The `homeRatingSource` and `awayRatingSource` fields on each qualifier indicate whether the R32 match used live or fallback ratings. The dashboard shows an amber "Partial data" badge for fixtures where any team used a fallback rating.

## Dashboard Section

`WorldCupRoundOf16SimulationSection` renders after the Round of 32 simulation section:

- "Projected Round of 16" heading.
- "Projected from pre-match probabilities" warning banner.
- 8 R16 fixture cards, each showing:
  - Projected home and away teams.
  - The R32 match each team came from (as `sourceHomeTeam vs sourceAwayTeam`).
  - Their R32 win probability snapshot.
  - "Live Elo" or "Partial data" badge.
  - Advancement reason for each team.

## Future Phases

- Round of 16 match simulation (computing R16 win/draw/loss probabilities per fixture).
- Quarterfinal participant projection.
- Progressive bracket simulation through to the Final.
