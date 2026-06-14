# World Cup 2026 Quarterfinal Match Simulation

Phase 10.12 adds match-level probability simulation for the 4 projected Quarterfinal fixtures. It uses the same Live Elo → Poisson pipeline already used for the Round of 32 (Phase 10.8) and Round of 16 (Phase 10.10) simulations.

## Handler

`simulateWorldCup2026QuarterfinalMatchesFoundation()`

- Consumes `simulateWorldCup2026QuarterfinalFoundation()` to obtain 4 projected QF fixtures.
- For each fixture, looks up Live Elo ratings (or fallback seed) for each team.
- Converts Elo ratings to expected goals via `eloToExpectedGoals` (balanced preset).
- Generates a Poisson score matrix via `generateScoreMatrix`.
- Aggregates outcome probabilities via `aggregateOutcomeProbabilities`.
- Returns top 3 most likely scorelines via `getMostLikelyScorelines`.

## Output Fields

Each `WorldCup2026QuarterfinalMatchSimulationFixture` contains:

| Field | Description |
| --- | --- |
| `fixtureId` | `wc2026-qf-sim-NN` (slot-indexed) |
| `round` | `"quarterfinal"` |
| `slot` | 1–4 |
| `homeTeam` / `awayTeam` | Projected qualifier names from QF foundation |
| `homeExpectedGoals` / `awayExpectedGoals` | Elo-to-xG output |
| `homeWinProbability` / `drawProbability` / `awayWinProbability` | Poisson-aggregated outcome probabilities |
| `mostLikelyScorelines` | Top 3 scorelines with individual probabilities |
| `homeRatingSource` / `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |
| `warnings` | Per-fixture fallback warnings if applicable |

## Treatment of Draws

A draw after 90 minutes is a valid match outcome in the Poisson model. `drawProbability` will always be greater than zero. The model does not simulate extra time or penalty shootouts — draw resolution after 90 minutes is not modeled in this phase.

## Fallback Team Behavior

Teams not present in the Live Elo pipeline receive a fallback seed rating of `WORLD_CUP_2026_FALLBACK_SEED_RATING` (1500). These fixtures are labeled "Partial data" in the UI and include a per-fixture fallback warning in the `warnings` array.

## Data Flow

```
simulateWorldCup2026QuarterfinalFoundation()
  → 4 projected QF fixtures (homeTeam, awayTeam)

buildLiveEloPipelineFoundation()
  → buildWorldCup2026CoverageEntries()
  → buildCoverageLookup()
  → eloToExpectedGoals() → generateScoreMatrix()
  → aggregateOutcomeProbabilities() + getMostLikelyScorelines()
  → WorldCup2026QuarterfinalMatchSimulationFixture[]
```

## Limitations

- **No winner selection**: probabilities are reported; no team advances.
- **No extra time / penalty modeling**: advancement after 90 minutes is not modeled.
- **No semifinal generation**: this phase ends after QF match simulation.
- **No champion probabilities**: beyond scope.
- **QF participants are triply-projected**: R32 → R16 → QF projections each carry compounding uncertainty.
- **Fallback seed coverage**: teams missing from the Live Elo pipeline receive a 1500 rating seed; these fixtures are flagged with a "Partial data" badge.

## Future Phases

- Semifinal simulation foundation (Phase 10.13+)
- Winner selection from QF match probabilities
- Penalty shootout modeling (not in scope for this phase)
