# World Cup 2026 Third Place Match Simulation

Phase 11.2 simulates the projected Third Place Match fixture using the same deterministic Live Elo → Elo-to-xG → Poisson pipeline already used for the Round of 16, Quarterfinal, Semifinal, and Final match simulation phases.

## Handler

`simulateWorldCup2026ThirdPlaceMatchFoundation()`

**Inputs consumed:**
- `getWorldCup2026ThirdPlaceMatchFoundation()` — projected Third Place Match fixture generated in Phase 11.1

## Simulation Flow

```
getWorldCup2026ThirdPlaceMatchFoundation()
  → thirdPlaceMatchFixture (homeTeam, awayTeam)

buildLiveEloPipelineFoundation()
  → pipeline.rankedRatings
  → buildWorldCup2026CoverageEntries()
  → buildCoverageLookup()

Lookup homeEntry and awayEntry by team name
  → homeElo / awayElo (fallback to WORLD_CUP_2026_FALLBACK_SEED_RATING if missing)
  → homeRatingSource / awayRatingSource

eloToExpectedGoals({ homeEloRating, awayEloRating })
  → homeExpectedGoals, awayExpectedGoals

generateScoreMatrix(expectedGoals, poissonConfig)
  → score matrix (maxGoals x maxGoals Poisson probabilities)

aggregateOutcomeProbabilities(scoreMatrix)
  → homeWinProbability, drawProbability, awayWinProbability

getMostLikelyScorelines(scoreMatrix, 3)
  → top 3 scorelines by probability
```

## Elo Usage

- Live Elo ratings are loaded from the curated partial international match dataset (256 World Cup fixtures + expanded international supplement).
- Teams not present in the pipeline receive the `WORLD_CUP_2026_FALLBACK_SEED_RATING` (1500) and are marked as `"fallback_seed"`.
- Rating source metadata (`homeRatingSource`, `awayRatingSource`) is included in every fixture.
- Fallback teams trigger a per-fixture warning.

## xG Generation

`eloToExpectedGoals()` converts the Elo rating difference into expected goals using:

- A base expected goals value
- An Elo sensitivity multiplier
- Bounded output to prevent extreme values

The function is uncalibrated and uses a transparent linear transformation. Warnings are always emitted.

## Poisson Model

`generateScoreMatrix()` builds a score probability matrix using the independent Poisson model:

- Each cell `(h, a)` = P(home scores h goals) × P(away scores a goals)
- Matrix is normalized to sum to 1.0

`aggregateOutcomeProbabilities()` sums the cells:
- homeWinProbability = sum of cells where h > a
- drawProbability = sum of cells where h = a
- awayWinProbability = sum of cells where h < a

## Output Fields

### `WorldCup2026ThirdPlaceMatchSimulationFixture`

| Field | Description |
| --- | --- |
| `fixtureId` | `"wc2026-3rd-place-sim-01"` |
| `round` | `"third_place"` |
| `homeTeam` | Team name (first SF loser) |
| `awayTeam` | Team name (second SF loser) |
| `homeExpectedGoals` | Elo-derived expected goals for home team |
| `awayExpectedGoals` | Elo-derived expected goals for away team |
| `homeWinProbability` | Probability home team wins in 90 minutes |
| `drawProbability` | Probability of a draw after 90 minutes |
| `awayWinProbability` | Probability away team wins in 90 minutes |
| `mostLikelyScorelines` | Top 3 scorelines by Poisson probability |
| `homeRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |
| `awayRatingSource` | `"live_elo_pipeline"` or `"fallback_seed"` |
| `warnings` | Per-fixture fallback warnings |

### `WorldCup2026ThirdPlaceMatchSimulationFoundationResponse`

| Field | Description |
| --- | --- |
| `status` | `"success"` |
| `tournamentName` | `"FIFA World Cup 2026"` |
| `dataScope` | `"world_cup_2026_third_place_match_simulation_foundation"` |
| `simulatedFixturesCount` | `1` |
| `round` | `"third_place"` |
| `simulationType` | `"match_level_foundation"` |
| `source` | `"projected_third_place_match"` |
| `fixtures` | Tuple of one `WorldCup2026ThirdPlaceMatchSimulationFixture` |
| `warnings` | Response-level simulation and data warnings |
| `metadata` | API metadata |

## Dashboard Component

`WorldCupThirdPlaceMatchSimulationSection` renders after `WorldCupThirdPlaceMatchSection`.

The section displays:

- Section header with eyebrow "Third Place Match simulation"
- Amber warning banner: "Match probabilities only"
- Match card with:
  - Teams and Live Elo / Partial Data badge
  - Win / Draw / Win probability cards
  - Expected goals panel
  - Top scorelines panel

## Limitations

- **No third-place winner selection**: the winner is not resolved in this phase.
- **No extra time or penalties**: 90-minute probabilities only. Draws are preserved in output.
- **No live results**: all participants are projected from local curated data.
- **Uncalibrated Elo-to-xG**: the expected goals conversion is a transparent linear model, not a calibrated fit.
- **Multiply projected**: both teams descend from projected R32 → R16 → QF → SF → loser resolution chains.

## Future Phases

- Deterministic third-place winner selection using the same deterministic winner rule.
- Third-place winner path in the knockout winner resolution response.
