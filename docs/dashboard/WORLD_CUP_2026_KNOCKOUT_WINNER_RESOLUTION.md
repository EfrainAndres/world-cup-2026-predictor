# World Cup 2026 Knockout Winner Resolution Foundation

Phase 11.0 resolves deterministic knockout winners from all existing match simulation outputs and produces a projected tournament winner path covering all five knockout rounds.

## Handler

`resolveWorldCup2026KnockoutWinnersFoundation()`

**Inputs consumed:**
- `simulateWorldCup2026KnockoutFixturesFoundation()` — 16 Round of 32 simulated fixtures
- `simulateWorldCup2026RoundOf16MatchesFoundation()` — 8 Round of 16 simulated fixtures
- `simulateWorldCup2026QuarterfinalMatchesFoundation()` — 4 quarterfinal simulated fixtures
- `simulateWorldCup2026SemifinalMatchesFoundation()` — 2 semifinal simulated fixtures
- `simulateWorldCup2026FinalMatchFoundation()` — 1 final simulated fixture

For each fixture, applies the deterministic winner selection rule to resolve the advancing team.

## Winner Selection Rule

1. **Highest win probability wins.** If `homeWinProbability > awayWinProbability`, home team advances. If `awayWinProbability > homeWinProbability`, away team advances.
2. **Elo tie-break.** If win probabilities are equal, the team with the higher Live Elo rating advances.
3. **Home team wins.** If Elo ratings are also equal or unavailable, the home team advances.

No penalties. No randomization. The output is fully deterministic.

## advancementReason values

| Scenario | advancementReason |
| --- | --- |
| Team has higher win probability | `"advanced via highest pre-match win probability"` |
| Equal win probability, higher Elo | `"advanced via Elo tie-break (equal win probability)"` |
| Equal win probability and equal Elo | `"advanced as home team (equal win probability and equal Elo)"` |

## Output Fields

`WorldCup2026KnockoutWinnerResolutionResponse`:

| Field | Description |
| --- | --- |
| `dataScope` | `"world_cup_2026_knockout_winner_resolution_foundation"` |
| `resolutionType` | `"deterministic_foundation"` |
| `resolvedRounds` | `["round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"]` |
| `totalResolvedFixtures` | 31 (16 + 8 + 4 + 2 + 1) |
| `championSelected` | `true` |
| `roundOf32Winners` | 16 `WorldCup2026ResolvedKnockoutWinner` entries |
| `roundOf16Winners` | 8 `WorldCup2026ResolvedKnockoutWinner` entries |
| `quarterfinalWinners` | 4 `WorldCup2026ResolvedKnockoutWinner` entries |
| `semifinalWinners` | 2 `WorldCup2026ResolvedKnockoutWinner` entries |
| `champion` | The projected tournament champion |
| `runnerUp` | The projected runner-up (final loser) |
| `finalFixtureId` | ID of the simulated final fixture |

Each `WorldCup2026ResolvedKnockoutWinner` contains:

| Field | Description |
| --- | --- |
| `team` | Advancing team name |
| `round` | Round in which this winner was resolved |
| `sourceFixtureId` | ID of the source simulated fixture |
| `slot` | Slot number of the source fixture |
| `opponent` | Team that was eliminated |
| `advancementReason` | Deterministic reason string |
| `probabilitySnapshot` | `homeWinProbability`, `drawProbability`, `awayWinProbability` from source fixture |
| `homeRatingSource` / `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |

## Data Flow

```
simulateWorldCup2026KnockoutFixturesFoundation()  → 16 R32 fixtures
simulateWorldCup2026RoundOf16MatchesFoundation()  → 8  R16 fixtures
simulateWorldCup2026QuarterfinalMatchesFoundation() → 4 QF fixtures
simulateWorldCup2026SemifinalMatchesFoundation()  → 2  SF fixtures
simulateWorldCup2026FinalMatchFoundation()        → 1  Final fixture

buildLiveEloPipelineFoundation()
  → buildWorldCup2026CoverageEntries()
  → buildCoverageLookup()
  → Elo tie-break lookup

resolveKnockoutWinnerFromFixture() × 31
  → roundOf32Winners, roundOf16Winners, quarterfinalWinners, semifinalWinners, champion, runnerUp
```

## Limitations

- **No extra time modeling**: draws in 90 minutes are not resolved to a winner via extra time.
- **No penalty shootout**: no random or deterministic penalty resolution.
- **No champion probability distribution**: this phase resolves one deterministic champion only.
- **No live results**: all participants are projected from local curated data.
- **Triply+ projected**: championship path is derived from a chain of projected participants starting at R32.

## Why no penalties or extra time?

The knockout simulation foundation emits pre-match win/draw/win probabilities only. Extra time and penalties happen after 90 minutes and depend on real match state, which is not modeled. A draw outcome in the Poisson model does not mean a draw result for match resolution purposes — it represents the probability that the score is level at 90 minutes. Resolving these correctly would require an extra-time probability model, which is deferred to a future phase.

## Future Phases

- Extra time probability modeling
- Deterministic or probabilistic penalty resolution
- Champion path narrative output
