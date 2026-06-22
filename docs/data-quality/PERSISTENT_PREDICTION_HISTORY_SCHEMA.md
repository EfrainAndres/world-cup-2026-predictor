# Persistent Prediction History Schema

## Overview

This document defines the future relational schema for three storage concerns:

1. immutable prediction snapshots
2. immutable Model-vs-Reality evaluations
3. mutable projection cache records

The current codebase still uses in-memory stores. This schema is the persistence target for future phases and must remain compatible with the existing store interfaces.

The concrete PostgreSQL stack recommendation is documented in [ADR 0011: Use Neon, `postgres`, and SQL-First Migrations for Persistent Prediction History](../architecture/ADR-0011-postgresql-persistence-stack.md).

## Architecture Boundary

Future persistence should follow this shape:

```text
domain/store interface
  -> in-memory adapter
  -> PostgreSQL adapter
  -> runtime resolver
```

The domain packages must not import a database client. Runtime composition selects the adapter.

## Table: `prediction_snapshots`

### Purpose

Immutable append-only historical snapshot records.

### Identity

- Primary key: `snapshot_id`
- Natural keys: `fixture_id`, `captured_at`, `model_version`, `schema_version`
- Idempotency key: `idempotency_key`
- Content hash: `content_hash`

### Required Columns

| Column | Notes |
| --- | --- |
| `snapshot_id` | Stable identifier for the snapshot |
| `fixture_id` | Internal fixture identity |
| `provider_fixture_id` | Optional upstream fixture identity |
| `snapshot_status` | `pre_match_locked` or `foundation_unverified` |
| `captured_at` | Snapshot capture timestamp |
| `cutoff_at` | Data cutoff timestamp |
| `kickoff_at` | Optional kickoff timestamp |
| `group_code` | Optional group code |
| `matchday` | Optional matchday |
| `home_team` | Canonical home team |
| `away_team` | Canonical away team |
| `model_version` | Prediction model version |
| `formula_version` | Elo-to-xG formula version |
| `schema_version` | Snapshot schema version |
| `idempotency_key` | Unique idempotency key |
| `content_hash` | Canonical content hash |
| `prediction_payload` | Versioned JSONB prediction payload |
| `confidence_payload` | Versioned JSONB confidence payload |
| `provenance_payload` | Versioned JSONB provenance payload |
| `created_at` | Record creation timestamp |

### Constraints

- Primary key on `snapshot_id`
- Unique constraint on `idempotency_key`
- Recommended unique index on `content_hash` if duplicate-content suppression is desired
- Check constraint: `captured_at < kickoff_at` when `kickoff_at` is present
- Check constraint: `snapshot_status` in the allowed enum
- Check constraint: `schema_version` is supported by the writer

### Indexes

- `fixture_id, captured_at desc`
- `provider_fixture_id`
- `group_code, matchday`
- `content_hash`

### Policy

- Immutable
- Insert-only application behavior
- No normal update path
- No normal delete path
- Duplicate writes with the same idempotency key return the existing record

### Retention

- Retain permanently

## Table: `prediction_evaluations`

### Purpose

Immutable derived records linking one snapshot to one completed result.

### Identity

- Primary key: `evaluation_id`
- Foreign key: `snapshot_id -> prediction_snapshots.snapshot_id`
- Natural key: `result_identity`
- Unique composite key: `snapshot_id, result_identity, metric_version`

### Required Columns

| Column | Notes |
| --- | --- |
| `evaluation_id` | Stable evaluation identifier |
| `snapshot_id` | Foreign key to the source snapshot |
| `fixture_id` | Internal fixture identity |
| `provider_fixture_id` | Optional upstream fixture identity |
| `metric_version` | Evaluation metric version |
| `schema_version` | Evaluation schema version |
| `result_identity` | Completed-result identity key |
| `evaluated_at` | Evaluation timestamp |
| `actual_home_goals` | Non-negative integer |
| `actual_away_goals` | Non-negative integer |
| `actual_outcome` | `home_win`, `draw`, or `away_win` |
| `metrics_payload` | Versioned JSONB metrics payload |
| `confidence_payload` | Versioned JSONB confidence payload |
| `provenance_payload` | Versioned JSONB provenance payload |
| `created_at` | Record creation timestamp |

### Constraints

- Foreign key to `prediction_snapshots`
- Unique constraint on `snapshot_id, result_identity, metric_version`
- Check constraint: scores are non-negative integers
- Check constraint: `actual_outcome` in the allowed enum
- Check constraint: `schema_version` is supported by the writer

### Indexes

- `snapshot_id`
- `fixture_id, evaluated_at desc`
- `result_identity`
- `metric_version`

### Policy

- Immutable
- Insert-only application behavior
- No normal update path
- No normal delete path
- Duplicate concurrent writes return the existing record when the identity matches

### Retention

- Retain permanently

## Table: `projection_cache`

### Purpose

Mutable response-level cache for generated group projections.

### Identity

- Primary key or unique key: `cache_key`
- Natural key: `group_code, timezone`
- Input fingerprint: `input_fingerprint`

### Required Columns

| Column | Notes |
| --- | --- |
| `cache_key` | Stable cache key |
| `group_code` | Group A-L |
| `timezone` | Explicit timezone |
| `projection_payload` | Serialized projection payload |
| `input_fingerprint` | Fingerprint of the inputs used to generate the projection |
| `model_version` | Model version used for generation |
| `formula_version` | Formula version used for generation |
| `schema_version` | Cache schema version |
| `generated_at` | Generation timestamp |
| `expires_at` | Expiration timestamp |
| `updated_at` | Update timestamp |

### Constraints

- Unique constraint on `cache_key`
- Check constraint: `expires_at > generated_at`
- Check constraint: `schema_version` is supported by the writer

### Indexes

- `group_code, timezone`
- `expires_at`
- `input_fingerprint`

### Policy

- Mutable
- Upsert allowed
- Invalidation allowed
- Expiration allowed
- Safe cache miss must fall back to regeneration

### Retention

- Short TTL
- Expired rows may be removed by a future maintenance process

## Schema Versioning

Use explicit version constants in the application layer:

- `snapshot_schema_version`
- `evaluation_schema_version`
- `projection_cache_schema_version`

Reader behavior:

- current version: read normally
- supported older version: migrate in code if explicitly supported
- unsupported future version: reject with a typed schema error
- corrupted payload: reject as invalid

## Ports and Adapters

Recommended future interfaces:

```ts
interface PredictionSnapshotStore {
  create(snapshot, idempotencyKey): Promise<CreateResult>;
  getById(snapshotId): Promise<Snapshot | null>;
  getByFixtureId(fixtureId): Promise<readonly Snapshot[]>;
  list(): Promise<readonly Snapshot[]>;
}

interface PredictionEvaluationStore {
  create(evaluation, identityKey): Promise<CreateResult>;
  getById(evaluationId): Promise<Evaluation | null>;
  getBySnapshotId(snapshotId): Promise<Evaluation | null>;
  getByFixtureId(fixtureId): Promise<readonly Evaluation[]>;
  list(): Promise<readonly Evaluation[]>;
}

interface ProjectionCacheStore {
  get(cacheKey): Promise<ProjectionCacheEntry | null>;
  upsert(entry): Promise<void>;
  invalidate(cacheKey): Promise<void>;
  clearExpired(now): Promise<number>;
}
```

These remain async-compatible so the memory adapter and PostgreSQL adapter can share the same contract.

## Runtime Selection

Future provider selection should be explicit and server-side only:

```text
PERSISTENCE_PROVIDER=memory | postgres
DATABASE_URL=...
```

Recommended behavior:

- tests: memory adapter
- local development: memory by default, PostgreSQL opt-in
- production history writes: persistent provider required
- projection-cache failure: safe regeneration fallback
- history-store failure: integrity failure, never silently reported as success

The selected stack, provider category, SQL client, and migration strategy are defined in ADR 0011.

## Failure Behavior

Typed failure categories to plan for:

- database unavailable
- missing migration
- duplicate idempotency key
- concurrent duplicate writes
- transaction failure
- corrupted payload
- unsupported schema version
- snapshot persistence failure
- evaluation persistence failure
- projection-cache read failure
- projection-cache write failure

Distinction:

- snapshot/evaluation failures are history-integrity failures
- projection-cache failures are non-critical and may degrade to regeneration

## Transactions and Concurrency

- Snapshot creation must be atomic.
- Evaluation creation must be atomic.
- Duplicate create requests with matching identities should return the existing record.
- Unique database constraints remain the final concurrency guard.
- Projection cache should use upsert semantics.
- No distributed locking is required initially.

## Security

- Credentials stay server-side.
- No `NEXT_PUBLIC_` persistence secrets.
- Parameterized queries only.
- Minimal database privileges.
- No raw provider payload persistence.
- Sanitized errors only.
- Separate production and test databases.
- Backup/export expectations should be documented before production writes begin.

## Deployment Plan

1. Merge the architecture decision.
2. Add migrations and adapters behind a provider flag.
3. Test migrations outside production.
4. Run shared adapter contract tests.
5. Enable persistent reads.
6. Enable persistent writes.
7. Verify idempotency and concurrency.
8. Deploy production.
9. Monitor persistence failures.
10. Keep explicit rollback instructions.

## Open Questions

- Exact managed PostgreSQL vendor
- SQL client or ORM selection
- Migration tool
- Production connection pooling strategy
- Whether the projection cache should later move to a dedicated KV store
- How historical in-memory records will be backfilled
- Whether administrative deletion will ever be required
