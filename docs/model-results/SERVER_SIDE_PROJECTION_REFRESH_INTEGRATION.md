# Server-Side Projection Refresh Integration

**Phase:** 12.14B  
**Scope:** `packages/api` only — no web changes, no persistent store, no external calls beyond injected foundations.

## Overview

Phase 12.14B wires the `assessProjectionRefresh` policy (Phase 12.14A) into `buildGroupProjection` inside `group-detail.ts`. When the caller supplies a `previousProjection`, the builder compares each auto-generated fixture projection against the current sync state. Stale projections are re-predicted; current projections are reused without calling the predictor.

## Input Change

`BuildWorldCup2026GroupDetailInput` gains one optional field:

```ts
previousProjection?: WorldCup2026GroupProjection;
```

No persistent store is involved. The caller is responsible for retaining the previous projection between requests.

## Refresh Boundary

Only `auto_predict` source fixtures are eligible for refresh. `stored_snapshot` fixtures are always immutable (`shouldRefresh: false`). `unavailable` fixtures never attempt a predictor call.

## Staleness Detection

Before calling the predictor, a "pre-check" fingerprint is built using the previous fixture's Elo values (from `projectionInputSummary`) alongside current sync metadata. This avoids calling the predictor solely to detect staleness. The full `assessProjectionRefresh` policy runs on this pre-check fingerprint. If `shouldRefresh === false`, the previous projection is reused.

Triggers that cause a stale verdict and a predictor call:

| Trigger | Description |
|---|---|
| `completedResultAdded` | `currentGroupCompletedCount > storedTournamentMatchesIncluded` |
| `formulaVersionChanged` | `ELO_TO_XG_FORMULA_VERSION` differs from stored formula version |
| `eloInputChanged` | Elo ratings differ between stored and current sync (not applicable at pre-check with same Elo values) |
| `tournamentFormChanged` | Tournament form formula version changed |
| `providerDataChanged` | Fingerprint mismatch after other triggers are ruled out |
| `stale_threshold_exceeded` | Pre-match freshness threshold exceeded (15 min) |

## tournamentMatchesIncluded Tracking

`ProjectionInputSummary.tournamentMatchesIncluded` is set to `currentGroupCompletedCount` (the number of completed results in the sync data for this group), not to `predictResult.tournamentAdjustment?.matchesIncluded`. This correctly captures "what data the predictor had access to" and prevents infinite refresh loops when tournament-form adjustment is disabled or returns zero.

## Post-Refresh Assessment

After a successful predictor call, `refreshAssessment` is computed using `freshSummary` for all "stored" comparison values (formula version, model version, Elo, tournament matches). This means the assessment reflects whether the newly generated projection is current relative to the current state — it always returns "current" immediately after a successful refresh, since `freshSummary` and current values are identical at that point.

## RefreshExecution Metadata

Each projected fixture records a `refreshExecution: ProjectionRefreshExecution`:

| Scenario | `attempted` | `completed` | `reasonCodes` |
|---|---|---|---|
| First generation | `false` | `false` | `[]` |
| Reused (current) | `false` | `false` | `[]` |
| Successful refresh | `true` | `true` | trigger codes |
| Failed refresh | `true` | `false` | `["prediction_failed"]` |

## Failure Handling

If the predictor returns a non-success status during a refresh attempt and a previous projection exists, the old projection is preserved. `refreshExecution.attempted = true`, `refreshExecution.completed = false`. A warning is attached to the fixture. The group projection as a whole continues with the preserved fixture — one failed fixture does not abort other fixture projections.

## Predictor Call Guard

The predictor is called at most once per fixture per `buildWorldCup2026GroupDetail` call. The `previousFixtureMap` is populated once before the fixture loop and looked up in O(1). There is no retry or loop for the predictor within a single request.

## Snapshot Immutability

`buildWorldCup2026GroupDetail` never creates, updates, or deletes prediction snapshots. The snapshot store is read-only from the builder's perspective.

## Limitations

- No persistent projection store: the caller must supply `previousProjection` for refresh comparisons. If omitted, every call regenerates all auto-predictions.
- ELO change detection at pre-check uses the stored Elo from `projectionInputSummary`. If the predictor produces different Elo at prediction time, the post-refresh assessment will not retroactively detect it as stale (the post-refresh assessment compares `freshSummary` against itself).
- `tournamentMatchesIncluded` tracks sync-level completed results, not tournament-form-model inclusion. If tournament adjustment is disabled, the stored count and current count still match after a refresh, preventing re-runs.
