# Group Detail Data Foundation

Phase 12.13A adds a deterministic API foundation for a single World Cup 2026 group detail view.

## Handler

- `getWorldCup2026GroupDetail({ group, timezone? })`
- `group` accepts only `A` through `L`
- `timezone` must be a valid IANA timezone
- default timezone is `UTC`

Validation uses the existing `validation_error` response shape. The handler never uses the machine-local timezone implicitly.

## Response Shape

The response combines existing read-only foundations for one group:

- ordered group teams with official position
- official standings
- provisional live standings when live or halftime matches exist
- categorized fixtures:
  - `completed`
  - `live`
  - `upcoming`
  - `postponed`
  - `cancelled`
  - `unscheduled`
- compact qualification summary
- provider and synchronization metadata
- prediction-history summaries reused from the daily-match foundation

## Standings Sources

The handler does not recalculate standings logic on its own.

It reuses:

- Phase 12.6 official standings from completed matches only
- Phase 12.6 provisional standings when live or halftime matches exist

Official qualification context is always derived from official standings. Provisional standings are exposed separately and do not replace the official qualification summary.

## Match Categorization

Fixtures are categorized per group using normalized synchronized status as the source of truth:

- `finished` -> `completed`
- `live` / `halftime` -> `live`
- `scheduled` with kickoff -> `upcoming`
- `scheduled` without kickoff -> `unscheduled`
- `postponed` -> `postponed`
- `cancelled` -> `cancelled`

Unknown statuses are excluded from active collections and returned as warnings.

Finished matches must have valid non-negative integer scores. Invalid finished records are skipped with warnings instead of breaking the full group response.

## Qualification Summary

The qualification block exposes only current read-only context:

- first place from official standings row 1
- second place from official standings row 2
- third place from official standings row 3
- current best-third-place qualification flag from the existing best-third-place foundation

Status values:

- `official`
- `provisional`
- `foundation_only`

`foundation_only` is used when the group is still incomplete or when local static fallback data is active.

## Prediction-History Reuse

Each match summary reuses the compact read-only history summary from Phase 12.12C:

- selected snapshot summary
- selected evaluation summary
- mismatch warnings when stored history does not match the selected fixture/result identity

The handler does not:

- create snapshots
- create evaluations
- mutate snapshot or evaluation stores
- regenerate predictions

## Provider Metadata

The response includes enough metadata for a future UI to distinguish:

- external live provider data
- cached external data
- local static fallback
- stale cache state

No provider tokens, environment variables, raw upstream payloads, or cache internals are exposed.

## Timezone Behavior

Timezone is used only for localized kickoff display fields already supported by the daily-match foundation.

This phase does not:

- refilter dates per timezone
- invent kickoff timestamps
- change provider status logic

## Deduplication

Fixture deduplication follows the existing precedence:

1. internal resolved fixture ID
2. provider fixture ID

Duplicate records are skipped once and surfaced as warnings. One invalid record must not fail the full group response when the rest of the data remains usable.

## Limitations

- no UI in this phase
- no new page route
- no qualification probabilities
- no knockout or champion projection changes
- no persistent storage
- local fallback still reflects the current static fixture/result foundation

## Next Phase

Phase 12.13B will build the group-centered dashboard page on top of this API foundation.
