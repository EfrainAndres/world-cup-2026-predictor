# Tournament Form Calculation Foundation

## Overview

Phase 12.10A adds a pure, deterministic tournament-form foundation for World Cup 2026 teams. It reads normalized completed match records and produces bounded per-team summaries plus conservative Elo-adjustment recommendations.

This phase does **not**:

- modify Elo ratings
- change prediction outputs
- recalculate expected goals
- affect UI behavior

It is a secondary-signal foundation only.

## Inputs

The calculation accepts:

- normalized completed World Cup 2026 match records
- optional baseline Elo ratings for opponent-strength context
- optional `cutoffAt`
- optional `referenceAt`

Only `status: "finished"` records are eligible.

Ignored records:

- scheduled
- live
- halftime
- postponed
- cancelled
- invalid score records
- unresolved fixtures
- future records
- duplicate fixture contributions

## Fixture Identity and Canonical Teams

The calculation reuses the same fixture-resolution approach already used by results-to-Elo ingestion:

1. match by official fixture id when possible
2. otherwise match by normalized canonical home/away team pair

Team names are canonicalized through the existing alias helpers, so records such as `Bosnia and Herzegovina` and `Bosnia-Herzegovina` resolve to the same official fixture identity.

## Per-Team Output

Each team summary returns:

- matches played
- wins
- draws
- losses
- goals for
- goals against
- goal difference
- points
- most recent eligible match
- opponents faced
- bounded form score
- bounded Elo adjustment recommendation

## Formula

The formula is intentionally conservative.

Named constants:

- `WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES = 2`
- `WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT = 12`
- `WORLD_CUP_2026_TOURNAMENT_FORM_RESULT_WEIGHT = 0.65`
- `WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_WEIGHT = 0.2`
- `WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP = 2`
- `WORLD_CUP_2026_TOURNAMENT_FORM_OPPONENT_STRENGTH_WEIGHT = 0.15`

### Match Signals

For each eligible match:

- result signal:
  - win = `+1`
  - draw = `0`
  - loss = `-1`
- goal signal:
  - goal difference divided by the cap
  - clamped to `[-1, 1]`
- opponent-strength signal:
  - derived only when baseline Elo exists
  - based on opponent baseline distance from `1500`
  - clamped to `[-1, 1]`
  - set to `0` for draws to keep the effect conservative

### Team Form Score

The team form score is the bounded weighted average:

`result_avg * 0.65 + goal_avg * 0.20 + opponent_avg * 0.15`

The final score is clamped to `[-1, 1]`.

### Elo Adjustment Recommendation

Recommendations are bounded secondary guidance, not direct rating changes.

- teams with fewer than 2 matches receive `0`
- otherwise:
  - `formScore * maxAdjustment * min(matchesPlayed / 3, 1)`
- result is clamped to `[-12, 12]`

This keeps one match from dominating the historical baseline.

## Metadata

The result metadata reports:

- cutoff used
- reference time
- total records received
- records accepted
- records rejected
- future records excluded
- duplicate fixtures skipped
- teams summarized
- warnings
- formula version

## Typed Issues

The calculation returns issues without failing the full result when safe:

- `record_rejected_non_finished`
- `fixture_not_found`
- `invalid_score`
- `duplicate_fixture_skipped`
- `cutoff_excluded`
- `future_record_excluded`

## Guardrails

- deterministic chronological processing
- no look-ahead beyond the optional cutoff and reference time
- no duplicate fixture contribution
- no mutation of baseline Elo ratings
- no prediction recalculation
- no Model vs Reality feedback as model input
- no persistence
- no external network request

## Foundation Handler

`getWorldCup2026TournamentFormFoundation()` builds a local deterministic foundation response by:

1. computing the current live Elo baseline
2. reading local static completed World Cup 2026 results
3. calculating tournament form

This handler exists for API/package inspection only in Phase 12.10A. It does not integrate tournament form into predictions.

## Limitations

- group-stage completed results only
- local completed results only in this phase
- no live or scheduled-state tournament-form view
- no prediction integration yet
- no persistent storage
- no empirical calibration yet for these constants

## Next Phase

Phase 12.10B can decide whether and how to apply this recommendation as an optional secondary signal in live prediction workflows.
