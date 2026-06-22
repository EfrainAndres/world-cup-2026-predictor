# Projection Refresh Policy Foundation

## Phase

12.14A — Projection Refresh Policy Foundation

## Summary

Adds a deterministic, pure policy layer to the API package that assesses whether a stored or auto-predicted group-projection is `current`, `stale`, `invalidated`, or `unavailable`. No prediction execution, no polling, no snapshot creation, no UI changes.

## Scope

API package only (`packages/api/`). No web changes.

## New Exports

### `projection-refresh-policy.ts`

| Export | Kind | Description |
|---|---|---|
| `PROJECTION_FRESHNESS_UPCOMING_MS` | constant | 15-minute freshness threshold for upcoming fixtures (ms). |
| `PROJECTION_FRESHNESS_THRESHOLDS` | constant | Threshold map: `upcoming` = 15 min, `live` = 0, `finished` = 0, `localFallback` = null. |
| `CURRENT_FORMULA_VERSION` | constant | Current `ELO_TO_XG_FORMULA_VERSION` from the model package. |
| `CURRENT_MODEL_VERSION` | constant | Current `WORLD_CUP_2026_PREDICTION_MODEL_VERSION` from snapshot-service. |
| `buildProjectionFingerprint` | function | SHA-256 content hash over canonicalized projection inputs. Deterministic; no wall-clock time. |
| `assessProjectionRefresh` | function | Pure policy function returning a `ProjectionRefreshAssessment`. |
| `AssessProjectionRefreshInput` | type | Input shape for `assessProjectionRefresh`. |

### New schema types (`schemas.ts`)

| Type | Description |
|---|---|
| `ProjectionRefreshState` | `"current" \| "stale" \| "invalidated" \| "unavailable"` |
| `ProjectionRefreshTriggers` | Boolean flags for each change condition. |
| `ProjectionRefreshSourceVersions` | Formula, model, tournament-form, and sync-id versions captured at evaluation time. |
| `ProjectionRefreshAssessment` | Full assessment: state, shouldRefresh, timestamps, reasons, triggers, sourceVersions. |
| `ProjectionFingerprintInput` | Inputs that uniquely identify a projection's content. |

## Policy Rules

### State precedence (evaluated in order)

1. **`unavailable`** — `projectionSource === "unavailable"`. `shouldRefresh: false` always.
2. **`invalidated`** — fixture status is `finished`, `live`, `halftime`, `postponed`, or `cancelled`. Pre-match projection is no longer eligible. `shouldRefresh: false` always.
3. **`current` (local fallback)** — `syncMetadata.localFallbackUsed === true`. No live provider data; no time-based freshness claim. `shouldRefresh: false`.
4. **`stale`** — any of the following:
   - `completedResultAdded`: more completed group results exist than when the projection was generated.
   - `formulaVersionChanged`: `storedFormulaVersion !== currentFormulaVersion`.
   - `modelVersionChanged`: `storedModelVersion !== currentModelVersion`.
   - `tournamentFormChanged`: `storedTournamentFormVersion !== currentTournamentFormVersion`.
   - `eloInputChanged`: stored home or away Elo differs from current.
   - Cache used (non-immutable snapshot only): `cacheUsed === true && !isImmutableSnapshot`.
   - Fingerprint changed without any explicit trigger.
   - Age exceeds `freshnessThresholdMs` (default: 15 min for upcoming fixtures) — only when not an immutable snapshot.
5. **`current`** — none of the above conditions apply.

### Immutable snapshot boundary

Stored snapshots may be assessed as `stale`, but `shouldRefresh` is always `false` for immutable snapshots. They record what was believed at capture time; refreshing them would mutate history.

## Fingerprint Strategy

`buildProjectionFingerprint` hashes the following fields using `computeContentHash` (SHA-256 over key-sorted JSON):

- `fixtureId`, `homeTeam`, `awayTeam`, `preset`
- `formulaVersion`, `modelVersion`
- `homeElo`, `awayElo`
- `tournamentMatchesIncluded`
- `tournamentFormVersion` (optional)
- `lastSuccessfulSync` (optional)
- `projectionCutoffAt` (optional)

The fingerprint is stable across runs with identical inputs. Optional fields are conditionally spread to respect `exactOptionalPropertyTypes`.

## Group Projection Integration

`buildGroupProjection` in `group-detail.ts` now attaches refresh metadata to every fixture in the projection:

| Source | Behavior |
|---|---|
| `stored_snapshot` | Computes both `storedFingerprint` (from snapshot inputs) and `currentFingerprint` (from live inputs), calls `assessProjectionRefresh` with `isImmutableSnapshot: true`. |
| `auto_predict` | Computes `currentFingerprint` from live Elo inputs, calls `assessProjectionRefresh` with `isImmutableSnapshot: false`. |
| `unavailable` | Computes `currentFingerprint` with fallback Elo 1500, calls `assessProjectionRefresh` with `projectionSource: "unavailable"`. |

## Refresh Triggers

Each `ProjectionRefreshAssessment` includes a `triggers` object with eight boolean flags:

| Flag | Meaning |
|---|---|
| `providerDataChanged` | Fingerprint differs but no explicit cause (provider drift). |
| `completedResultAdded` | More completed results than at projection time. |
| `liveStatusChanged` | Fixture is currently live or at halftime. |
| `eloInputChanged` | Elo inputs have shifted. |
| `tournamentFormChanged` | Tournament-form formula version changed. |
| `formulaVersionChanged` | xG formula version changed. |
| `fixtureStatusChanged` | Fixture is no longer `scheduled`. |
| `snapshotAvailable` | Projection originates from an immutable snapshot. |

## Tests

`packages/api/tests/projection-refresh-policy.test.ts` — 50 focused tests covering:

- `buildProjectionFingerprint`: determinism, hex length, sensitivity to each input field, key-order independence, no wall-clock dependency.
- `PROJECTION_FRESHNESS_THRESHOLDS`: constant values.
- `assessProjectionRefresh — current`: unchanged inputs, within age threshold, immutable snapshot current.
- `assessProjectionRefresh — stale`: provider sync change, more results, formula change, model change, cache used, age threshold, immutable snapshot stale with `shouldRefresh: false`.
- `assessProjectionRefresh — invalidated`: live, halftime, finished, postponed, cancelled.
- `assessProjectionRefresh — unavailable`: source=unavailable.
- `assessProjectionRefresh — local fallback`: always current, no time claim.
- `assessProjectionRefresh — sourceVersions`: formula/model/sync captured correctly.
- No prediction execution: predictorFn vi.fn() never called by policy functions.
- Group detail integration: auto_predict, stored_snapshot, and unavailable fixtures each carry correct fingerprint and assessment.

## Limitations

- **No automatic refresh execution**: this phase only assesses whether a refresh is needed. Triggering a re-prediction is out of scope.
- **No persistent cache**: `assessProjectionRefresh` is a pure function called at request time; assessments are not stored.
- **No browser polling**: no timer, WebSocket, or cron integration.
- **No snapshot mutation**: immutable snapshots are never modified regardless of `shouldRefresh`.
- **Elo availability**: `currentHomeElo`/`currentAwayElo` must be supplied by the caller from the live Elo pipeline; the policy does not fetch them.

## Next Phase

Phase 12.14B should wire `shouldRefresh: true` assessments to an automatic re-prediction trigger, replacing stale `auto_predict` fixtures in group projections on the next request without creating snapshots.
