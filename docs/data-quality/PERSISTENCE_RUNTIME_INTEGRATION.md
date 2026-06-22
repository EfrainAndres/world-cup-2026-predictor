# Persistence Runtime Integration

## Scope

Phase 12.15B4 connects prediction-history handlers to a runtime-selected persistence provider without changing prediction formulas, evaluation metrics, standings, or UI behavior.

This phase covers:

- runtime provider resolution for snapshots and evaluations;
- server-side environment policy;
- lazy PostgreSQL client creation;
- explicit migration command;
- async handler integration for snapshot and Model-vs-Reality history.

This phase does not cover:

- projection-cache persistence;
- database provisioning;
- automatic migrations during requests;
- UI changes;
- prediction or standings changes.

## Provider Resolver

`resolvePredictionHistoryPersistence()` selects one provider for both immutable history stores:

```text
memory
postgres
```

It returns:

- selected provider;
- async snapshot store;
- async evaluation store;
- safe metadata:
  - `provider`
  - `persistent`
  - `configuredProvider`

The resolver is the only composition point that knows about the PostgreSQL client.

## Environment Variables

Server-side only:

```text
PERSISTENCE_PROVIDER=memory | postgres
DATABASE_URL=...
```

Rules:

- default is `memory`;
- tests use `memory` unless PostgreSQL contract tests are explicitly enabled;
- `PERSISTENCE_PROVIDER=postgres` requires `DATABASE_URL`;
- no `NEXT_PUBLIC_` persistence variables are allowed.

## Memory Behavior

Memory remains the default for:

- unit tests;
- local development;
- deterministic pure-handler runs.

The runtime resolver wraps the existing in-memory snapshot and evaluation stores so current behavior remains backward compatible inside one runtime instance.

Repeated handler calls in the same server instance reuse the same memory-backed resolver instance.

## PostgreSQL Behavior

When `PERSISTENCE_PROVIDER=postgres`:

- one lazy `postgres` client is created;
- the same client is shared by snapshot and evaluation adapters;
- client creation stays outside the adapter modules;
- request handlers do not create a new client per call;
- request handlers do not call `sql.end()` after each response.

Production requests do not fall back to memory after a history-write failure.

## Connection Lifecycle

The runtime uses a minimal server-safe lifecycle:

- lazy initialization;
- reuse within the server instance;
- no browser inclusion;
- no auto-migration during request handling;
- test-only shutdown/reset helper for deterministic tests.

No second SQL client or pooling library is introduced in this phase.

## Migration Command

Dedicated command:

```bash
pnpm --filter @world-cup-2026-predictor/api db:migrate
```

Behavior:

- reads `DATABASE_URL` only;
- runs checked-in SQL migrations in order;
- exits nonzero on failure;
- sanitizes output;
- never runs from request handlers or browser code.

## Handler Integration

Integrated operations:

- create snapshot;
- get snapshot;
- list snapshots;
- create evaluation;
- get evaluation;
- list evaluations;
- Model-vs-Reality summary.

Pure snapshot construction, prediction logic, evaluation metrics, and summary math remain unchanged.

The handlers now:

- resolve the configured async stores at the service boundary;
- persist or read through the selected provider;
- surface sanitized typed storage/configuration errors;
- preserve existing success payloads and deterministic IDs.

## Failure Policy

History failures are treated as integrity failures, not soft fallbacks.

Covered error classes:

- invalid provider configuration;
- missing database URL;
- connection unavailable;
- missing migration/schema;
- duplicate conflict;
- foreign-key violation;
- invalid stored record;
- unsupported schema version;
- query failure.

Rules:

- no raw SQL in API responses;
- no connection strings;
- no credentials;
- no silent success on failed writes.

## Security

- database credentials remain server-side;
- no `NEXT_PUBLIC_` database secrets;
- no raw provider payload persistence;
- errors are sanitized before reaching API responses;
- PostgreSQL contract tests should use `TEST_DATABASE_URL`, never production credentials.

## Local Setup

Default local mode:

```text
PERSISTENCE_PROVIDER=memory
```

Optional local PostgreSQL mode:

```text
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgresql://...
pnpm --filter @world-cup-2026-predictor/api db:migrate
```

## Test Setup

Default test mode:

```text
PERSISTENCE_PROVIDER=memory
```

PostgreSQL adapter tests remain opt-in and should use:

```text
TEST_DATABASE_URL=postgresql://...
```

They are separate from normal unit runs.

## Production Setup

Persistent history mode requires:

```text
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=...
```

If persistent history is configured but unavailable, production must return explicit storage/configuration failures. It must not silently downgrade history writes to memory.

## Limitations

- projection-cache persistence is still deferred;
- no migration health endpoint exists yet;
- no database provisioning or vendor automation is included;
- existing read-only daily/group foundations still use in-memory history stores directly until later integration phases require otherwise.

## Next Phase

Next persistence phase: persistent projection-cache implementation and broader runtime diagnostics, after history persistence behavior is validated in production-like environments.
