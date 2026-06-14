# World Cup 2026 Final Match Simulation

## Purpose

Phase 10.16 simulates the single projected World Cup 2026 Final fixture produced by the Final foundation layer.

This phase stops at match probabilities. It does not select a champion.

## Inputs

- `simulateWorldCup2026FinalFoundation()`
- 1 projected Final fixture
- Live Elo ratings when available
- fallback seed ratings when Live Elo coverage is missing

## Simulation method

For the projected Final fixture, the API:

1. resolves team ratings from the local Live Elo pipeline
2. falls back to the seeded World Cup 2026 fallback rating when needed
3. converts Elo difference to expected goals using the existing balanced Elo-to-xG preset
4. runs the existing Poisson score matrix
5. aggregates home win, draw, and away win probabilities
6. returns the most likely scorelines

## Output fields

- `fixtureId`
- `round`
- `slot`
- `homeTeam`
- `awayTeam`
- `homeExpectedGoals`
- `awayExpectedGoals`
- `homeWinProbability`
- `drawProbability`
- `awayWinProbability`
- `mostLikelyScorelines`
- `homeRatingSource`
- `awayRatingSource`
- `warnings`

Response metadata includes:

- `simulatedFixturesCount: 1`
- `round: "final"`
- `simulationType: "match_level_foundation"`
- `source: "projected_final"`

## Treatment of draws

The model allows a draw after 90 minutes.

That draw output remains in the response because extra time and penalties are not modeled yet.

## No-advancement boundary

- no champion is selected in this phase
- no extra-time logic is modeled
- no penalty shootout logic is modeled
- no title probabilities are produced

## Fallback team behavior

If a finalist does not have Live Elo coverage, the fixture uses the World Cup 2026 fallback seed rating.

That fallback is surfaced through rating-source fields and warnings. It is illustrative and not calibrated.

## Future phases

Planned follow-up work:

- deterministic champion projection
- extra-time and penalty modeling decisions
- title probability layer
- end-to-end tournament advancement reporting
