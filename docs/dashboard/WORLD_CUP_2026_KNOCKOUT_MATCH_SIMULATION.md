# World Cup 2026 Knockout Match Simulation

Phase 10.8 adds deterministic match-level simulation for all 16 projected Round of 32 fixtures.

This is not a bracket advancement engine. It simulates match probabilities per fixture and stops there.

## Inputs

- **Fixtures**: The 16 projected Round of 32 fixtures from Phase 10.6 (`WORLD_CUP_2026_ROUND_OF_32_FIXTURES`).
- **Ratings**: Live Elo ratings for each team from the same pipeline used by Auto Predict From Elo. Teams not in the pipeline receive a fallback seed rating of 1500.

## Simulation Method

For each Round of 32 fixture:

1. Look up Live Elo ratings for `homeTeam` and `awayTeam` using the World Cup 2026 Auto Predict coverage entries.
2. Convert the Elo ratings to expected goals using `eloToExpectedGoals` with the default (balanced) preset.
3. Build a Poisson score matrix via `generateScoreMatrix`.
4. Compute win/draw/win probabilities using `aggregateOutcomeProbabilities`.
5. Extract the top 3 most likely scorelines using `getMostLikelyScorelines`.

This is the same pipeline used by `predictMatchFromLiveElo`. No new model logic is added.

## Output Fields

Each `WorldCup2026KnockoutSimulationFixture` includes:

| Field | Description |
|---|---|
| `fixtureId` | Unique identifier from the R32 fixture |
| `round` | Always `"round_of_32"` |
| `slot` | Bracket slot (1–16) |
| `homeTeam` | Projected home team |
| `awayTeam` | Projected away team |
| `homeExpectedGoals` | Poisson-input xG for home team |
| `awayExpectedGoals` | Poisson-input xG for away team |
| `homeWinProbability` | Probability (0–1) |
| `drawProbability` | Probability (0–1) |
| `awayWinProbability` | Probability (0–1) |
| `mostLikelyScorelines` | Top 3 scorelines with per-scoreline probability |
| `homeRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |
| `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |
| `warnings` | Per-fixture fallback seed warnings if applicable |

## Treatment of Draws

A draw result after 90 minutes is a valid model output. The draw probability is included in the response. The API **does not select a winner** from drawn matches and **does not model extra time or penalties**.

The response includes the warning:

> Advancement after extra time/penalties is not modeled in this phase.

## Limitations

- **No winner selection.** Probabilities are informational only.
- **No bracket advancement.** No team progresses from R32 to R16.
- **No penalty shootout logic.** Extra time and penalties are out of scope.
- **No champion probabilities.** Only per-fixture match level probabilities.
- **No external APIs.** All data is local and deterministic.
- **No Elo or xG formula changes.** The same model pipeline as Auto Predict From Elo is reused.

## Fallback Team Behavior

Teams not in the Live Elo pipeline receive a fallback seed rating of 1500. Their fixture card is labeled "Partial data" in the dashboard. A per-fixture warning is included in the API response.

## Dashboard Section

`WorldCupKnockoutSimulationSection` renders after the knockout bracket section:

- "Round of 32 match simulations" heading.
- "Match probabilities only" warning banner.
- 16 compact fixture cards, each showing:
  - Home vs away team names.
  - Home win / away win probability (formatted as %).
  - Draw probability.
  - Top 3 scorelines.
  - "Live Elo" or "Partial data" badge.

## Future Phases

- Round of 16 simulation (requires winner selection or re-seeding logic).
- Bracket progression simulation.
- Extra time / penalty modeling.
