# World Cup 2026 Third Place Match Foundation

Phase 11.1 projects the Third Place Match fixture by identifying the two semifinal losers from deterministic pre-match probability resolution.

## Handler

`getWorldCup2026ThirdPlaceMatchFoundation()`

**Inputs consumed:**
- `simulateWorldCup2026SemifinalMatchesFoundation()` — 2 simulated semifinal fixtures

For each fixture, the loser is identified using the same deterministic winner selection rule used across all knockout phases. The two losers become the Third Place Match home and away participants.

## Loser Selection Rule

1. **Lower win probability is eliminated.** If `homeWinProbability > awayWinProbability`, home team advances and away team is the loser. If `awayWinProbability > homeWinProbability`, away team advances and home team is the loser.
2. **Elo tie-break.** If win probabilities are equal, the team with the lower Live Elo rating is eliminated.
3. **Away team eliminated.** If Elo ratings are also equal, the away team is eliminated.

No match simulation. No third-place winner selection. No penalties.

## eliminationReason values

| Scenario | eliminationReason |
| --- | --- |
| Team had lower win probability | `"eliminated — opponent had higher pre-match win probability"` |
| Equal win probability, lower Elo | `"eliminated via Elo tie-break (equal win probability)"` |
| Equal win probability and equal Elo | `"eliminated as away team (equal win probability and equal Elo)"` |

## Output Fields

`WorldCup2026ThirdPlaceMatchFoundationResponse`:

| Field | Description |
| --- | --- |
| `dataScope` | `"world_cup_2026_third_place_match_foundation"` |
| `round` | `"third_place"` |
| `simulationType` | `"fixture_foundation"` |
| `participantsCount` | `2` |
| `fixturesCount` | `1` |
| `source` | `"projected_semifinal_losers"` |
| `projectedParticipants` | Tuple of two `WorldCup2026ThirdPlaceParticipant` |
| `thirdPlaceMatchFixture` | `WorldCup2026ThirdPlaceMatchFixture` |

Each `WorldCup2026ThirdPlaceParticipant` contains:

| Field | Description |
| --- | --- |
| `team` | Team name |
| `semifinalSourceFixtureId` | ID of the semifinal fixture this loser came from |
| `lostTo` | Team that eliminated them |
| `eliminationReason` | Deterministic reason string |
| `probabilitySnapshot` | `homeWinProbability`, `drawProbability`, `awayWinProbability` from the SF fixture |
| `homeRatingSource` / `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |

`WorldCup2026ThirdPlaceMatchFixture`:

| Field | Description |
| --- | --- |
| `fixtureId` | `"wc2026-3rd-place-01"` |
| `round` | `"third_place"` |
| `homeTeam` | First SF loser |
| `awayTeam` | Second SF loser |
| `homeParticipant` / `awayParticipant` | Full `WorldCup2026ThirdPlaceParticipant` objects |
| `status` | `"projected"` |
| `source` | `"projected_semifinal_losers"` |

## Data Flow

```
simulateWorldCup2026SemifinalMatchesFoundation()
  → 2 SF simulated fixtures

buildLiveEloPipelineFoundation()
  → buildWorldCup2026CoverageEntries()
  → buildCoverageLookup()
  → Elo tie-break lookup

Loser resolution × 2 SF fixtures
  → projectedParticipants[0] (home), projectedParticipants[1] (away)

thirdPlaceMatchFixture { fixtureId: "wc2026-3rd-place-01" }
```

## Limitations

- **No Third Place Match simulation**: the fixture is projected only; no probabilities or scorelines are generated.
- **No third-place winner selection**: no winner is chosen from the Third Place Match.
- **No penalty modeling**: no extra time or penalty logic.
- **No live results**: all participants are projected from local curated data.
- **Multiply projected**: participants are derived from projected SF losers who themselves descend from projected R32/R16/QF fixtures.

## Future Phases

- Third Place Match simulation (win/draw/win probabilities, likely scorelines)
- Deterministic third-place winner selection
