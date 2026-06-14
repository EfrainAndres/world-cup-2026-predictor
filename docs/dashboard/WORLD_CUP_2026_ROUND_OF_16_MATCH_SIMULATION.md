# World Cup 2026 Round of 16 Match Simulation

Phase 10.10 adds match-level probability simulation for the 8 projected Round of 16 fixtures. It uses the same Live Elo → Poisson pipeline already used for the Round of 32 simulation (Phase 10.8).

## Handler

`simulateWorldCup2026RoundOf16MatchesFoundation()`

- Consumes `simulateWorldCup2026RoundOf16Foundation()` to obtain 8 projected R16 fixtures.
- For each fixture, looks up Live Elo ratings (or fallback seed) for each team.
- Converts Elo ratings to expected goals via `eloToExpectedGoals` (balanced preset).
- Generates a Poisson score matrix via `generateScoreMatrix`.
- Aggregates outcome probabilities via `aggregateOutcomeProbabilities`.
- Returns top 3 most likely scorelines via `getMostLikelyScorelines`.

## Output Fields

Each `WorldCup2026RoundOf16MatchSimulationFixture` contains:

| Field | Description |
| --- | --- |
| `fixtureId` | `wc2026-r16-sim-NN` (slot-indexed) |
| `round` | `"round_of_16"` |
| `slot` | 1–8 |
| `homeTeam` / `awayTeam` | Projected qualifier names from R16 foundation |
| `homeExpectedGoals` / `awayExpectedGoals` | Elo-to-xG output |
| `homeWinProbability` / `drawProbability` / `awayWinProbability` | Poisson-aggregated outcome probabilities |
| `mostLikelyScorelines` | Top 3 scorelines with individual probabilities |
| `homeRatingSource` / `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |
| `warnings` | Per-fixture fallback warnings if applicable |

## Fixture Pairing

The 8 R16 fixtures are consumed directly from the Phase 10.9 output. Home/away designations follow the R16 qualifier order (R32 slots 1+2 → R16 slot 1, etc.).

## Limitations

- **No winner selection**: probabilities are reported; no team advances.
- **No extra time / penalty modeling**: advancement after 90 minutes is not modeled.
- **No quarterfinal generation**: this phase ends after R16 match simulation.
- **No champion probabilities**: beyond scope.
- **R16 participants are projected**: based on pre-match R32 probabilities, not real results.
- **Fallback seed coverage**: teams missing from the Live Elo pipeline receive a 1500 rating seed; these fixtures are flagged with a "Partial data" badge.

## Data Flow

```
simulateWorldCup2026RoundOf16Foundation()
  → 8 projected R16 fixtures (homeTeam, awayTeam)

buildLiveEloPipelineFoundation()
  → buildWorldCup2026CoverageEntries()
  → buildCoverageLookup()
  → eloToExpectedGoals() → generateScoreMatrix()
  → aggregateOutcomeProbabilities() + getMostLikelyScorelines()
  → WorldCup2026RoundOf16MatchSimulationFixture[]
```

## Future Phases

- Quarterfinal simulation foundation (Phase 10.11+)
- Winner selection from R16 match probabilities
- Penalty shootout modeling (not in scope for this phase)
