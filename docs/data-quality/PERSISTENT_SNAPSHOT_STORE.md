# Persistent Snapshot Store

**Phase:** 12.15B2  
**Scope:** `packages/api` only — no web changes, no production runtime resolver, no evaluation persistence, no projection-cache persistence.

## Overview

Phase 12.15B2 introduces the PostgreSQL adapter foundation for immutable World Cup 2026 prediction snapshots. It preserves the existing synchronous in-memory adapter for deterministic unit tests and adds:

- A SQL migration that creates the `prediction_snapshots` table.
- An `AsyncPredictionSnapshotStore` interface with async methods and a `getByIdempotencyKey` accessor.
- An async in-memory implementation (`createAsyncInMemorySnapshotStore`) used for contract tests and future local work.
- A PostgreSQL adapter (`createPostgresPredictionSnapshotStore`) that accepts an injected `postgres` SQL client.
- Typed storage errors (`SnapshotStorageError`) with sanitized messages.
- Shared contract tests run against both adapters.
- A minimal migration runner (`runMigrations`) for test setup.

PostgreSQL is **not** enabled in the production runtime by this phase alone. Runtime provider selection, environment policy, and handler wiring are documented separately in `docs/data-quality/PERSISTENCE_RUNTIME_INTEGRATION.md`.

## Migration

File: `packages/api/migrations/0001_prediction_snapshots.sql`

Run once against the target database before enabling the PostgreSQL adapter:

```bash
# Example using the migration runner from a script
node -e "
  import postgres from 'postgres';
  import { runMigrations } from './packages/api/src/migration-runner.js';
  const sql = postgres(process.env.DATABASE_URL);
  await runMigrations(sql);
  await sql.end();
"
```

Do not auto-run migrations during application requests.

### Table: `prediction_snapshots`

| Column | Type | Notes |
|---|---|---|
| `snapshot_id` | text | Primary key |
| `fixture_id` | text | Internal fixture identity |
| `provider_fixture_id` | text | Optional upstream fixture id |
| `snapshot_status` | text | `pre_match_locked` or `foundation_unverified` |
| `captured_at` | timestamptz | Snapshot capture time |
| `cutoff_at` | timestamptz | Data cutoff time |
| `kickoff_at` | timestamptz | Optional kickoff time |
| `group_code` | text | Optional group A–L |
| `matchday` | integer | Optional matchday (positive) |
| `home_team` | text | Canonical home team |
| `away_team` | text | Canonical away team |
| `model_version` | text | Prediction model version |
| `formula_version` | text | Elo-to-xG formula version at capture |
| `snapshot_schema_version` | text | Payload schema version (currently `"1"`) |
| `idempotency_key` | text | Unique idempotency key |
| `content_hash` | text | SHA-256 over prediction inputs and outputs |
| `prediction_payload` | jsonb | `{ schemaVersion, modelConfiguration, inputs, prediction }` |
| `confidence_payload` | jsonb | `{ schemaVersion, confidence }` |
| `provenance_payload` | jsonb | `{ schemaVersion, provenance }` |
| `created_at` | timestamptz | Record creation time (default: `now()`) |

### Constraints

| Constraint | Description |
|---|---|
| Primary key | `snapshot_id` |
| Unique | `idempotency_key` |
| Check | `snapshot_status IN ('pre_match_locked', 'foundation_unverified')` |
| Check | `pre_match_locked → kickoff_at IS NOT NULL AND captured_at < kickoff_at` |
| Check | `group_code IN ('A'–'L')` when present |
| Check | `matchday > 0` when present |
| Non-empty | `fixture_id`, `home_team`, `away_team`, `model_version`, `formula_version`, `content_hash`, `snapshot_schema_version` |

### Indexes

| Index | Columns | Condition |
|---|---|---|
| `prediction_snapshots_fixture_id_idx` | `(fixture_id, captured_at DESC)` | — |
| `prediction_snapshots_captured_at_idx` | `(captured_at)` | — |
| `prediction_snapshots_content_hash_idx` | `(content_hash)` | — |
| `prediction_snapshots_group_matchday_idx` | `(group_code, matchday)` | `WHERE group_code IS NOT NULL` |
| `prediction_snapshots_provider_fixture_id_idx` | `(provider_fixture_id)` | `WHERE provider_fixture_id IS NOT NULL` |

### `content_hash` uniqueness decision

`content_hash` is **not** unique in the database. The content hash covers prediction outputs derived from model inputs. Uniqueness is already enforced by the unique constraint on `idempotency_key` (which hashes the full input identity). A unique constraint on `content_hash` would cause spurious conflicts for distinct fixtures that produce numerically identical probability distributions under the same model version. An index on `content_hash` supports fast deduplication queries without the uniqueness restriction.

## Store Contract

### `AsyncPredictionSnapshotStore`

```ts
interface AsyncPredictionSnapshotStore {
  create(snapshot, idempotencyKey): Promise<WorldCup2026PredictionSnapshotCreateResult>;
  getById(snapshotId): Promise<WorldCup2026PredictionSnapshot | null>;
  getByIdempotencyKey(idempotencyKey): Promise<WorldCup2026PredictionSnapshot | null>;
  list(input?: { fixtureId?: string; limit?: number }): Promise<WorldCup2026PredictionSnapshot[]>;
}
```

No `update` or `delete` methods. All reads return defensive copies. List ordering: `captured_at ASC`, `snapshot_id ASC` as tie-break.

### `create` semantics

| Scenario | Return |
|---|---|
| First insert | `{ result: "created", duplicate: false }` |
| Duplicate key, same content hash | `{ result: "existing", duplicate: true }` |
| Duplicate key, different content hash | throws `SnapshotStorageError("duplicate_conflict")` |
| Storage failure | throws `SnapshotStorageError(...)` |

### `list` semantics

- Ordered by `captured_at ASC`, then `snapshot_id ASC`.
- Optional `fixtureId` filter.
- Optional `limit` (bounded at 1000 for the PostgreSQL adapter).

## In-Memory Adapter

`createAsyncInMemorySnapshotStore()` is the reference implementation for contract tests and local development. It:

- Tracks both `snapshotId` and `idempotency_key` in private maps.
- Throws `SnapshotStorageError("duplicate_conflict")` for conflicting content hashes.
- Returns defensive deep copies via `JSON.parse(JSON.stringify(...))`.
- Exposes a `.reset()` method for test isolation (not present on `AsyncPredictionSnapshotStore`).

The legacy synchronous `PredictionSnapshotStore` (used by the existing production handler) is unchanged. No behavior change in production.

## PostgreSQL Adapter

`createPostgresPredictionSnapshotStore(sql: Sql): AsyncPredictionSnapshotStore`

- Accepts an injected `postgres` SQL client.
- No global database connection is created inside the adapter module.
- Uses parameterized queries for all operations.
- Serializes JSONB payloads explicitly via `JSON.stringify(...) + ::jsonb` cast.
- Timestamps are stored as ISO-8601 strings and round-tripped via `Date.toISOString()`.
- Enforces a 1000-row limit on `list()` to prevent unbounded production queries.

### Idempotency and concurrency

The `create` method uses:

```sql
INSERT INTO prediction_snapshots (...)
VALUES (...)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING *
```

- If the insert returns a row → `result: "created"`.
- If the insert is a no-op (conflict) → SELECT the existing row:
  - Same `content_hash` → `result: "existing"` (idempotent duplicate).
  - Different `content_hash` → `SnapshotStorageError("duplicate_conflict")` (integrity violation).
- Database-level unique constraint on `idempotency_key` is the final concurrency guard.

## Row Mapping

Two pure helper functions handle serialization:

- `snapshotToInsertParams(snapshot, idempotencyKey): SnapshotInsertParams` — maps domain snapshot → insert parameters.
- `rowToSnapshot(row: SnapshotRow): WorldCup2026PredictionSnapshot` — maps database row → domain snapshot.

These are exported for independent unit testing.

`rowToSnapshot` validates:
- `snapshot_schema_version` matches `SNAPSHOT_SCHEMA_VERSION`.
- Each payload's `schemaVersion` matches.
- `snapshot_status` is one of the two supported values.
- Required string identifiers are non-empty.
- Timestamps are parseable as dates.

## Typed Storage Errors

`SnapshotStorageError extends Error` with a `code: SnapshotStorageErrorCode` field.

| Code | When |
|---|---|
| `connection_unavailable` | Database not reachable |
| `migration_missing` | Table does not exist |
| `duplicate_conflict` | Idempotency key conflict with different content |
| `invalid_stored_record` | Row data fails validation |
| `unsupported_schema_version` | Stored schema version not supported by this reader |
| `query_failed` | Unclassified query failure |

Errors are sanitized:
- Messages do not contain connection strings, raw SQL parameters, or database credentials.
- Raw SQL errors are wrapped as the `cause` of a `SnapshotStorageError`.

## Migration Runner

`runMigrations(sql: Sql, migrationsDir?: string): Promise<void>`

Reads `*.sql` files from the migrations directory in lexicographic order and executes each file via `sql.unsafe(...)`. The default migrations directory is resolved relative to the compiled module path.

**Do not call this during application requests.** It is intended for test setup and a future explicit migration script.

## Test Database Safety

PostgreSQL integration tests are opt-in via `TEST_DATABASE_URL`:

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/test_db \
  pnpm --filter @world-cup-2026-predictor/api test -- \
  tests/postgres-prediction-snapshot-store.test.ts
```

Safety requirements:
- `TEST_DATABASE_URL` is never used as a fallback for `DATABASE_URL`.
- The test file refuses URLs that appear to reference a production database (contains `production`, `prod`, or a Neon URL without `test`/`dev` in the host).
- Migrations run once per describe block via `runMigrations`.
- State is truncated before each test via `TRUNCATE TABLE prediction_snapshots RESTART IDENTITY CASCADE`.
- Without `TEST_DATABASE_URL`, all PostgreSQL tests are skipped with a clear message.

Normal `pnpm test` in the API package runs pure unit tests only (no database required).

## Shared Contract Tests

`runSnapshotStoreContractTests(storeName, makeStore)` in `prediction-snapshot-store.test.ts` is executed against:

1. `createAsyncInMemorySnapshotStore` — always runs.
2. `createPostgresPredictionSnapshotStore` — runs when `TEST_DATABASE_URL` is set.

Coverage:
- create / get by ID / get by idempotency key / list
- Fixture filtering / limit / deterministic ordering / tie-break ordering
- Defensive copies
- Idempotent duplicate create
- Conflicting duplicate create (throws `duplicate_conflict`)
- No update / delete interface
- Stable order across repeated list calls

## Runtime Status

PostgreSQL is **not** enabled in the production runtime. The existing synchronous `PredictionSnapshotStore` and `defaultSnapshotStore` continue to serve the production handler unchanged. `createPostgresPredictionSnapshotStore` is exported and ready for composition in Phase 12.15B4.

No new required environment variables are read at runtime.

## Limitations

- No production runtime resolver yet (Phase 12.15B4).
- `getByIdempotencyKey` is not available on the legacy synchronous adapter.
- No evaluation persistence or projection-cache persistence in this phase.
- No automatic migrations at request time.
- No database provisioning or Docker setup included.
- `list()` is bounded at 1000 rows in the PostgreSQL adapter; future pagination support is out of scope.
- No backfill path for existing in-memory snapshots.

## Next Phase

Phase 12.15B3 should add the PostgreSQL adapter for `PredictionEvaluationStore` and validate the shared migration structure with evaluation contract tests.
