# Persistent Projection Cache

## Purpose

The persistent projection cache stores generated `WorldCup2026GroupProjection` values per group+timezone combination so they can be reused on subsequent SSR requests without re-running the full prediction pipeline.

Unlike the immutable prediction snapshots and evaluations, cache rows are **mutable operational data**: they can be upserted and deleted. A stale or corrupt cache entry is regenerated — it is never an integrity error.

## Files

| File | Role |
|---|---|
| `packages/api/migrations/0003_projection_cache.sql` | PostgreSQL migration — `projection_cache` table |
| `packages/api/src/async-projection-cache.ts` | `GroupProjectionCacheStore` interface, `PROJECTION_CACHE_SCHEMA_VERSION`, `PROJECTION_CACHE_TTL_MS`, `buildProjectionCacheKey`, `computeProjectionCacheExpiresAt`, in-memory adapter |
| `packages/api/src/postgres-projection-cache.ts` | `createPostgresGroupProjectionCacheStore` — PostgreSQL adapter factory |
| `packages/api/src/persistence-runtime.ts` | Resolver now returns `projectionCache: GroupProjectionCacheStore` alongside history stores |
| `packages/api/tests/projection-cache-store.test.ts` | Shared contract tests, `buildProjectionCacheKey` and `computeProjectionCacheExpiresAt` unit tests |
| `packages/api/tests/postgres-projection-cache-store.test.ts` | PostgreSQL opt-in integration tests |
| `apps/web/app/groups/[group]/page.tsx` | Group Detail SSR path wired to async projection cache |

## Cache Key Strategy

```
buildProjectionCacheKey(group, timezone)
→ "wc2026:<UPPERCASE_GROUP>:<timezone>"
```

Properties:
- Deterministic: same `group` + `timezone` always produces the same key
- Uppercase group code normalization
- No secrets, timestamps, or random components
- Throws `SnapshotStorageError("invalid_cache_key")` for empty group or timezone

Example: `buildProjectionCacheKey("a", "America/New_York")` → `"wc2026:A:America/New_York"`

## TTL

`PROJECTION_CACHE_TTL_MS = 15 * 60 * 1000` (15 minutes)

The helper `computeProjectionCacheExpiresAt(generatedAt, ttlMs?)` computes `expiresAt` from a `generatedAt` ISO string. It is deterministic given the same inputs and throws `SnapshotStorageError("invalid_expiration")` for unparseable timestamps.

A future `PROJECTION_CACHE_TTL_SECONDS` environment variable may be introduced when operational evidence justifies it. It must never use `NEXT_PUBLIC_`.

## Store Interface

```ts
interface GroupProjectionCacheStore {
  get(input: { group, timezone, now? }): Promise<WorldCup2026GroupProjection | null>
  set(input: { group, timezone, projection, inputFingerprint, modelVersion, formulaVersion, generatedAt, expiresAt }): Promise<void>
  delete(input: { group, timezone }): Promise<void>
}
```

### `get` behaviour

- Returns `null` on cache miss or expired entry
- Returns `null` for unknown `projection_cache_schema_version` (cache miss, not an error)
- Returns `null` for corrupted or unparseable payload (cache miss, not an error)
- The `now?` field overrides the clock for deterministic tests

### `set` behaviour

- Stores a defensive deep copy
- Upserts via `ON CONFLICT (group_code, timezone) DO UPDATE SET ...`
- Replaces all mutable columns including `expires_at`

### `delete` behaviour

- Deletes by normalized natural key
- Missing row is not an error

## In-Memory Adapter

`createInMemoryGroupProjectionCacheStore()` returns a synchronous in-memory store behind the `GroupProjectionCacheStore` interface plus a `.reset()` method for test teardown.

- Expired entries are lazily deleted on `get`
- All returned projections are defensive deep copies
- Group code is normalized to uppercase

## PostgreSQL Adapter

`createPostgresGroupProjectionCacheStore(sql: Sql)` returns a `GroupProjectionCacheStore` backed by PostgreSQL using the same injected `Sql` client as the snapshot and evaluation adapters.

Expired rows are lazily deleted in a fire-and-forget background query so the `get` call itself remains fast.

The `projection_payload` JSONB column stores: `{ schemaVersion, projection }`.

## Runtime Resolver Integration

`resolvePredictionHistoryPersistence()` now returns `projectionCache: GroupProjectionCacheStore` alongside `snapshotStore` and `evaluationStore`.

| Provider | `projectionCache` |
|---|---|
| `memory` | `createInMemoryGroupProjectionCacheStore()` — shared, lazily created |
| `postgres` | `createPostgresGroupProjectionCacheStore(sql)` — shares the same `Sql` client |

One SQL client is created lazily and reused. No second client, no auto-migration during requests.

## Group Detail SSR Flow

```
1. resolvePredictionHistoryPersistence() → projectionCache
2. projectionCache.get({ group, timezone }) → previousProjection | null
3. getDashboardGroupDetail({ ..., previousProjection })
4. projectionCache.set({ group, timezone, projection, ... })
5. render page
```

Cache failures degrade gracefully at each step — they never fail official standings or the whole page.

## Cache Failure Policy

| Failure | Behaviour |
|---|---|
| Read failure | Continue as cache miss; add sanitized warning; regenerate projection |
| Write failure | Return the generated projection; add sanitized warning; do not claim durable persistence |
| Schema version mismatch on read | Treat as cache miss; log warning; no crash |
| Corrupted payload | Treat as cache miss; log warning; no crash |

This is explicitly distinct from immutable history (snapshot/evaluation) failures which remain integrity-critical and do not soft-degrade.

## Migration

`0003_projection_cache.sql` creates the `projection_cache` table. It has no FK to immutable history tables — cache rows are replaceable operational data.

### Constraints

- `PRIMARY KEY (cache_key)`
- `UNIQUE (group_code, timezone)` — natural key for upsert
- `CHECK (group_code IN ('A'..'L'))`
- Non-empty checks on `cache_key`, `timezone`, `input_fingerprint`, `model_version`, `formula_version`, `projection_cache_schema_version`
- `CHECK (expires_at > generated_at)`

### Indexes

| Index | Purpose |
|---|---|
| `projection_cache_expires_at_idx` | Expiry-based cleanup queries |
| `projection_cache_updated_at_idx` | Recency-ordered maintenance |
| `projection_cache_fingerprint_idx` | Fingerprint-based staleness queries |

### Schema Version

`PROJECTION_CACHE_SCHEMA_VERSION = "1"`. The `projection_cache_schema_version` column stores it. Unknown versions cause a cache miss, not an error.

## Security Constraints

- `PROJECTION_CACHE_TTL_MS` is a server-side constant — never `NEXT_PUBLIC_`
- Database credentials are injected server-side
- `TEST_DATABASE_URL` must never fall back to `DATABASE_URL`
- Error messages are sanitized — no connection strings, passwords, or raw SQL
- No client-side write access to the cache

## Local Setup

Default local mode (no database required):

```
PERSISTENCE_PROVIDER=memory
```

Optional local PostgreSQL mode:

```
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgresql://...
pnpm --filter @world-cup-2026-predictor/api db:migrate
```

## PostgreSQL Test Setup

```
TEST_DATABASE_URL=postgresql://localhost:5432/wc2026_test \
  pnpm --filter @world-cup-2026-predictor/api test -- tests/postgres-projection-cache-store.test.ts
```

PostgreSQL tests skip cleanly when `TEST_DATABASE_URL` is absent.

## Production Behavior

When `PERSISTENCE_PROVIDER=postgres`:
- Projection cache uses the shared PostgreSQL-backed adapter
- Cache misses regenerate projections normally
- Cache write failures add a warning to the page without failing rendering
- Database migrations must be run separately via `pnpm --filter @world-cup-2026-predictor/api db:migrate`

## Difference from Immutable History

| Aspect | Projection cache | Snapshot/Evaluation history |
|---|---|---|
| Mutability | Mutable — upsert and delete allowed | Immutable — append only |
| FK constraints | None | FK from evaluations to snapshots |
| Failure policy | Soft degradation (cache miss + warning) | Integrity failure (hard error) |
| Purpose | Operational performance cache | Auditable prediction record |
| Recovery | Regenerate from prediction pipeline | Cannot recover — must not lose |

## Limitations

- No automatic cache invalidation on model/formula version changes (refresh policy handles staleness)
- No cluster-wide cache invalidation signal (each instance has its own memory cache in `memory` mode)
- No migration health endpoint
- TTL is a fixed constant; `PROJECTION_CACHE_TTL_SECONDS` env var not yet implemented

## Next Phase

Broader runtime diagnostics and monitoring after production validation of persistent projection cache behavior.
