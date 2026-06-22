# Projection Refresh Status UI

**Phase:** 12.14C  
**Scope:** `apps/web` only — no API formula changes, no snapshot mutation, no external services.

## Overview

Phase 12.14C surfaces the `refreshAssessment` and `refreshExecution` metadata produced by Phase 12.14B directly in the group detail projection UI. Each projected fixture row now shows a compact status badge indicating whether its projection is `Current`, `Stale`, `Invalidated`, or `Unavailable`. Stored-snapshot fixtures show an "Immutable pre-match snapshot" label instead of a badge, reinforcing their read-only history nature.

## In-Memory Server-Side Cache

A minimal server-side in-memory cache (`apps/web/src/lib/group-projection-cache.ts`) retains the last generated `WorldCup2026GroupProjection` per group+timezone key between SSR requests. On each page render the cache is read, the previous projection is passed as `previousProjection` to `getDashboardGroupDetail`, and the resulting new projection is stored back. This enables Phase 12.14B's staleness detection and re-prediction logic to fire correctly across consecutive page requests.

The cache is intentionally non-durable:
- In serverless deployments each cold start resets the cache — no projection is retained across function invocations.
- No secrets, raw provider payloads, or snapshot store state are stored.
- No Redis, database, filesystem, or external service is used.

```ts
export function getGroupProjectionFromCache(group, timezone): WorldCup2026GroupProjection | undefined
export function setGroupProjectionInCache(group, timezone, projection): void
export function clearGroupProjectionCache(): void
export function getGroupProjectionCacheSize(): number
export const GROUP_PROJECTION_CACHE_VERSION: string
```

All reads and writes use `JSON.parse(JSON.stringify(...))` defensive deep copies to prevent caller mutations from contaminating the cache.

## SSR Page Flow

`apps/web/app/groups/[group]/page.tsx`:

1. Read previous projection from cache (returns `undefined` on cold start or miss).
2. Call `getDashboardGroupDetail({ group, timezone, previousProjection? })`.
3. Write the new projection to the cache.
4. Render the page with the new projection (which now includes `refreshAssessment` and `refreshExecution` per fixture).

## Refresh Status Badges

`GroupDetailProjection.tsx` renders a `ProjectionRefreshStatus` sub-component per fixture:

| Source | Render |
|---|---|
| `stored_snapshot` | "Immutable pre-match snapshot" label (no badge) |
| `auto_predict` / `unavailable` | Compact pill badge showing state |

Badge states:

| State | Color |
|---|---|
| `current` | Teal |
| `stale` | Amber |
| `invalidated` | Slate grey |
| `unavailable` | Slate light |

Additional lines:
- **Refreshed**: "Projection refreshed from updated model inputs." (attempted+completed)
- **Failure**: "Projection refresh failed. Previous projection preserved." + alert role (attempted, not completed)
- **Formula/model**: Version metadata rendered when refresh succeeded and `sourceVersions` is present.

All badge elements carry `aria-label="Projection status: {State}"` for accessibility.

## Schema Change

`GetWorldCup2026GroupDetailInput` in `packages/api/src/schemas.ts` gains:

```ts
previousProjection?: WorldCup2026GroupProjection;
```

This allows the async `getWorldCup2026GroupDetail()` entry point to thread `previousProjection` through to `buildWorldCup2026GroupDetail()`. `BuildWorldCup2026GroupDetailInput` inherits this field from the base interface (the explicit duplicate declaration was removed from the child interface).

## New Type Re-Exports (`api-client.ts`)

```ts
export type { ProjectionRefreshState, ProjectionRefreshAssessment, ProjectionRefreshExecution, ProjectionInputSummary };
```

## Tests

| File | Coverage |
|---|---|
| `apps/web/src/lib/group-projection-cache.test.ts` | 10 tests: miss, hit, defensive copy (read and write), group/timezone isolation, clear, version constant, size tracking, uppercase normalization, overwrite |
| `apps/web/src/components/GroupDetailProjection.test.tsx` | 10 new tests: Current/Stale/Invalidated/Unavailable badges, refreshed description, failure warning, stored_snapshot immutable label, undefined assessment, aria-label, formula version |
| `apps/web/tests/e2e/group-detail.spec.ts` | 10 new tests: per-fixture projections present, source badge visible, immutable label (conditional), status badge (conditional), Group C structural, standings+projection coexist, Groups A–D no error, mobile layout, alert accessibility, narrow viewport coexistence |

## Limitations

- **Non-durable cache**: serverless cold starts lose the previous projection; first render after cold start has no `previousProjection` and generates all auto-predictions without refresh comparison.
- **No browser polling**: there is no timer, WebSocket, or cron mechanism to push refresh status updates to the client.
- **No snapshot mutation**: immutable snapshots are never modified; they show the label without a refresh badge.
