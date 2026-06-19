# Prediction Snapshot Storage

## Overview

Phase 12.8 introduces immutable, auditable pre-match prediction snapshots for official WC2026 group-stage fixtures. A snapshot captures the full state of a prediction at a specific point in time before a match kicks off, enabling retrospective accuracy evaluation and product history views.

## Design Goals

- **Immutable**: snapshots are written once and never updated or deleted
- **Auditable**: every snapshot carries a stable content hash over its prediction inputs
- **Idempotent**: identical request parameters return the existing snapshot rather than creating a duplicate
- **Look-ahead-free**: snapshot creation is rejected if `capturedAt >= kickoffAt`
- **Deterministic**: same inputs always produce the same snapshot ID and content hash
- **Server-safe**: uses `node:crypto` SHA-256 exclusively; never exposes secrets to the browser

## Snapshot Identity

### Idempotency Key

The idempotency key is a SHA-256 hash of the six fields that fully determine model behavior:

| Field | Purpose |
|---|---|
| `fixtureId` | Which fixture |
| `cutoffAt` | Data cutoff used for the Elo ratings |
| `modelVersion` | `wc2026-prediction-{LIVE_ELO_PIPELINE_VERSION}` |
| `eloPreset` | Elo-to-xG preset (e.g., `"balanced"`) |
| `maxGoals` | Poisson matrix dimension |
| `tournamentResultsAdjustmentEnabled` | Whether tournament adjustment was applied |

Two requests with the same six fields will always return the same snapshot.

### Snapshot ID

`snapshotId = "snap-" + idempotencyKey.slice(0, 16)`

The prefix makes IDs immediately recognizable; the 16-hex suffix provides sufficient collision resistance for an in-memory store.

### Content Hash

The content hash covers the prediction data itself, excluding mutable fields:

**Included in hash:** `fixtureId`, `homeTeam`, `awayTeam`, `cutoffAt`, `modelVersion`, `modelConfiguration`, `inputs`, `prediction`

**Excluded from hash:** `capturedAt`, `snapshotId`, `status`, `kickoffAt`, `group`, `matchday`, `confidence`, `provenance`, `contentHash`

This means the hash is stable across duplicate captures with the same model state, regardless of when the request was made.

## Status Rules

| Status | Condition |
|---|---|
| `"pre_match_locked"` | `kickoffAt` was provided **and** `capturedAt < kickoffAt` |
| `"foundation_unverified"` | No `kickoffAt` provided, or kickoff time unavailable to confirm pre-match capture |

Only `"pre_match_locked"` snapshots are considered verified pre-match locks for accuracy evaluation.

## Store Contract

The `PredictionSnapshotStore` interface enforces a strict append-only contract:

```typescript
create(snapshot, idempotencyKey): WorldCup2026PredictionSnapshotCreateResult
getById(snapshotId): WorldCup2026PredictionSnapshot | undefined
getByFixtureId(fixtureId): readonly WorldCup2026PredictionSnapshot[]
list(): readonly WorldCup2026PredictionSnapshot[]
reset(): void   // test isolation only
```

- No `update` or `delete` methods
- All reads return defensive frozen copies; mutation attempts throw
- `list()` and `getByFixtureId()` are ordered by `capturedAt` ascending, then `snapshotId` ascending

## API Handlers

### `createWorldCup2026PredictionSnapshot(request)`

| Validation | Rejection code |
|---|---|
| Empty or missing `fixtureId` | `validation_error` (field: `fixtureId`) |
| `fixtureId` not in `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` | `validation_error` (field: `fixtureId`) |
| `capturedAt >= kickoffAt` when `kickoffAt` provided | `validation_error` (field: `capturedAt`) |

Defaults:
- `capturedAt` → `new Date().toISOString()` if not provided
- `cutoffAt` → `capturedAt` if not provided
- `tournamentResultsAdjustmentEnabled` → `false`

Returns `result: "created"` on first call, `result: "existing"` with `duplicate: true` on subsequent calls with the same effective parameters.

### `getWorldCup2026PredictionSnapshot(snapshotId)`

Returns `status: "success"` with the snapshot, or `status: "not_found"` with the requested `snapshotId`.

### `listWorldCup2026PredictionSnapshots(fixtureId?)`

Returns all snapshots, optionally filtered by `fixtureId`, ordered deterministically by `capturedAt` then `snapshotId`.

## Canonical Hash Serialization

`canonicalizeForHash(value)` produces stable JSON by sorting object keys recursively before serialization. Arrays preserve their original element order. This guarantees that objects with the same logical content but different key insertion orders hash identically.

## Relationship to Model vs Reality

Phase 12.9 adds the first immutable evaluation layer on top of these stored snapshots. See `docs/model-results/MODEL_VS_REALITY_TRACKER.md` for eligibility rules, metric definitions, calibration buckets, and summary behavior.

## Limitations

- **In-memory only**: snapshots do not persist across serverless invocations or process restarts.
- **No embedded accuracy scoring**: evaluation is handled separately by the Phase 12.9 model-vs-reality tracker so the original snapshot remains untouched.
- **No result attachment**: actual match scores cannot be attached to snapshots yet.
- **Group-stage only**: only fixtures in `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` are eligible.
- **Default Poisson config**: `maxGoals` is fixed at `DEFAULT_POISSON_CONFIG.maxGoals = 7`.

## Files

| File | Role |
|---|---|
| `packages/api/src/snapshot-service.ts` | Hash utilities, idempotency key, snapshot builder |
| `packages/api/src/snapshot-store.ts` | In-memory store implementation |
| `packages/api/src/routes.ts` | Handler implementations |
| `packages/api/src/schemas.ts` | All snapshot schema types |
| `packages/api/tests/snapshot-service.test.ts` | 53 focused tests |
| `apps/web/next.config.ts` | Webpack `node:crypto` compatibility fix |
