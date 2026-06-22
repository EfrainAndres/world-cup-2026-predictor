# Persistent Evaluation Store

## Purpose

The persistent evaluation store provides an immutable, append-only PostgreSQL adapter for recording `WorldCup2026PredictionEvaluation` records — the structured comparison between a pre-match model prediction and a final official match result.

Evaluations are never updated or deleted. Each record is tied to a specific `prediction_snapshot` row via a foreign key, making the full evidence trail from model input → snapshot → evaluation auditable from the database.

## Files

| File | Role |
|---|---|
| `packages/api/migrations/0002_prediction_evaluations.sql` | PostgreSQL migration — `prediction_evaluations` table with FK to `prediction_snapshots`, constraints, and indexes |
| `packages/api/src/async-evaluation-store.ts` | `AsyncPredictionEvaluationStore` interface, `EVALUATION_SCHEMA_VERSION`, `createAsyncInMemoryEvaluationStore` |
| `packages/api/src/postgres-evaluation-store.ts` | `createPostgresPredictionEvaluationStore`, pure row-mapping helpers, JSONB payload parsing |
| `packages/api/tests/prediction-evaluation-store.test.ts` | Shared contract tests (`runEvaluationStoreContractTests`), row-mapping unit tests, in-memory adapter tests |
| `packages/api/tests/postgres-prediction-evaluation-store.test.ts` | PostgreSQL opt-in integration tests (skipped when `TEST_DATABASE_URL` is absent) |

## Identity Model

An evaluation is uniquely identified by the triple `(snapshot_id, result_identity, metric_version)` — enforced by `UNIQUE (snapshot_id, result_identity, metric_version)` in the database and by the in-memory adapter.

The `result_identity` value is the caller-supplied `identityKey` argument passed to `store.create()`. The caller determines identity; the store enforces it.

### Idempotency Behaviour

| Scenario | Outcome |
|---|---|
| Same `evaluationId` + same identity triple | `result: "existing"` — idempotent duplicate |
| Different `evaluationId` + same identity triple | Throws `SnapshotStorageError("duplicate_conflict")` |
| `snapshotId` not in `prediction_snapshots` | Throws `SnapshotStorageError("foreign_key_violation")` |

## Error Codes

All errors thrown by the stores are instances of `SnapshotStorageError` (defined in `async-snapshot-store.ts`) with one of these codes:

| Code | When |
|---|---|
| `connection_unavailable` | DB unreachable at connection time |
| `migration_missing` | Required table does not exist |
| `duplicate_conflict` | Identity collision with different evaluation id |
| `foreign_key_violation` | Referenced `snapshot_id` does not exist |
| `invalid_stored_record` | Row deserialization fails a validation check |
| `unsupported_schema_version` | `evaluation_schema_version` or payload `schemaVersion` is unknown |
| `query_failed` | Unexpected DB error (cause attached, message sanitized) |

Error messages never include database connection strings, passwords, or internal SQL state.

## JSONB Payload Layout

Three JSONB columns store data that does not fit flat column representation:

| Column | Content |
|---|---|
| `metrics_payload` | `{ schemaVersion, modelVersion, predicted, metrics }` |
| `confidence_payload` | `{ schemaVersion, confidence }` |
| `provenance_payload` | `{ schemaVersion, provenance }` |

Each payload carries a `schemaVersion` field matching `EVALUATION_SCHEMA_VERSION = "1"`. `rowToEvaluation` validates this on every read and throws `unsupported_schema_version` if it encounters an unknown value, making future migrations detectable without silent data corruption.

## Migration

`0002_prediction_evaluations.sql` depends on `0001_prediction_snapshots.sql`. The `runMigrations()` helper executes all `*.sql` files in `packages/api/migrations/` in lexicographic order, so both migrations run in the correct sequence.

### Constraints

- `PRIMARY KEY (evaluation_id)`
- `UNIQUE (snapshot_id, result_identity, metric_version)` — identity uniqueness
- `FOREIGN KEY (snapshot_id) REFERENCES prediction_snapshots(snapshot_id) ON DELETE RESTRICT ON UPDATE RESTRICT`
- `CHECK (actual_outcome IN ('home_win', 'draw', 'away_win'))`
- `CHECK (actual_home_goals >= 0)` and `CHECK (actual_away_goals >= 0)`
- Non-empty checks on `evaluation_id`, `fixture_id`, `model_version`, `metric_version`, `result_identity`

### Indexes

| Index | Purpose |
|---|---|
| `prediction_evaluations_snapshot_id_idx` | Fast lookup of all evaluations for a snapshot |
| `prediction_evaluations_fixture_id_idx` | Fixture-based queries, ordered by `evaluated_at DESC` |
| `prediction_evaluations_evaluated_at_idx` | Time-range queries |

## In-Memory Async Adapter

`createAsyncInMemoryEvaluationStore(options?)` returns a synchronous in-memory store behind the `AsyncPredictionEvaluationStore` interface plus a `.reset()` method for test teardown.

The optional `options.snapshotExists` callback simulates FK enforcement. When provided and returns `false` for a given `snapshotId`, `create()` throws `SnapshotStorageError("foreign_key_violation")`. When not provided, no FK check is performed (allows standalone use without a snapshot store).

## PostgreSQL Adapter

`createPostgresPredictionEvaluationStore(sql: Sql)` returns an `AsyncPredictionEvaluationStore` backed by PostgreSQL. The `sql` client is injected by the caller.

Insert pattern:
```sql
INSERT INTO prediction_evaluations (...)
VALUES (...)
ON CONFLICT (snapshot_id, result_identity, metric_version) DO NOTHING
RETURNING *
```

When `RETURNING *` produces zero rows (conflict), the adapter fetches the existing row and compares `evaluationId` to distinguish idempotent duplicates from integrity violations.

PG error code `23503` (foreign key violation) is caught and re-thrown as `SnapshotStorageError("foreign_key_violation")`.

## Security Constraints

- Database credentials are injected server-side; no connection string is ever exposed to the client.
- `TEST_DATABASE_URL` is the sole opt-in path for PostgreSQL integration tests. It must never fall back to `DATABASE_URL`.
- `query_failed` error messages are sanitized — they never include connection strings, passwords, or raw PG error payloads.
- No client-side write access is provided.

## Testing

### Unit tests (always run)

`tests/prediction-evaluation-store.test.ts` contains:
- `runEvaluationStoreContractTests(storeName, makeStore)` — shared contract suite (create, getById, getByIdentity, list, filters, limit, ordering, defensive copies, idempotency, duplicate-conflict, no-update/delete). Runs against the in-memory adapter.
- Row-mapping unit tests for `evaluationToInsertParams` and `rowToEvaluation` — including schema-version rejection, non-object payload rejection, invalid outcome rejection, non-finite metric rejection.
- `SnapshotStorageError("foreign_key_violation")` code support test.
- `EVALUATION_SCHEMA_VERSION` sanity test.

### PostgreSQL integration tests (opt-in)

`tests/postgres-prediction-evaluation-store.test.ts` skips the entire file when `TEST_DATABASE_URL` is absent. When present, it:
- Runs both migrations before all tests.
- `TRUNCATE`s evaluations then snapshots before each test.
- Runs the shared contract suite against the PostgreSQL adapter.
- Validates migration structure (table, PK, unique constraint, FK, indexes, check constraint).
- Tests FK enforcement (missing snapshot → `foreign_key_violation`; present snapshot → `created`).
- Tests error sanitization (bad connection string → `query_failed`, no credentials in message).
- Tests `EVALUATION_SCHEMA_VERSION` persistence.

To run PostgreSQL tests locally:
```
TEST_DATABASE_URL=postgresql://localhost:5432/wc2026_test \
  pnpm --filter @world-cup-2026-predictor/api test -- tests/postgres-prediction-evaluation-store.test.ts
```

## Runtime Status

The PostgreSQL evaluation store is **not wired into any production request path**. It is exported from `packages/api/src/index.ts` and ready for composition when a persistence integration phase is implemented.
