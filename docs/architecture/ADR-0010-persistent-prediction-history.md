# ADR 0010: Use Relational PostgreSQL for Persistent Prediction History

## Status

Accepted

## Date

2026-06-22

## Context

The project now has three distinct persistence concerns:

1. immutable pre-match prediction snapshots
2. immutable Model-vs-Reality evaluations
3. mutable group-projection cache entries

The current implementation uses in-memory stores and a server-side in-memory cache. That is acceptable for deterministic development and serverless-safe behavior, but it does not provide durable history, uniqueness enforcement, foreign keys, or backup/export guarantees for long-lived prediction records.

The persistence design must support:

- immutable history for snapshots and evaluations
- safe upserts and expiration for projection cache records
- serverless and local development workflows
- future migration from in-memory stores without changing domain contracts

## Decision

Use relational PostgreSQL as the primary persistent store for immutable prediction snapshots and immutable Model-vs-Reality evaluations.

Use the same relational PostgreSQL provider initially for the mutable projection cache unless a later operational review justifies a dedicated cache technology.

Keep the domain contracts and store interfaces persistence-agnostic:

- domain and model packages do not import a database client
- runtime composition selects the storage adapter
- in-memory adapters remain available for tests and local default behavior

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| Managed relational PostgreSQL | This is the selected primary direction, but the exact vendor remains open. |
| Serverless PostgreSQL | Attractive for serverless deployment, but still a PostgreSQL deployment choice rather than a different persistence model. |
| Hosted key-value storage | Suitable for cache-like data, but weaker for relational integrity, joins, and immutable history guarantees. |
| Embedded/local database or filesystem | Useful for prototyping, but not the best long-term fit for immutable production history and shared runtime behavior. |
| In-memory only | Acceptable for deterministic development, but not durable enough for production history or auditability. |

## Consequences

### Benefits

- Strong fit for immutable historical records with unique constraints and transaction support.
- Supports snapshot idempotency and evaluation idempotency with database-level guards.
- Keeps the cache and history concerns explicit instead of mixing them into one opaque blob.
- Preserves a clean adapter boundary between domain logic and persistence.
- Provides export, backup, and operational tooling that is easier to reason about than ad hoc local files.

### Tradeoffs

- Requires migrations and environment configuration once persistence is enabled.
- Adds operational work for connection management and deployment.
- Introduces a future choice point around connection pooling and provider-specific runtime behavior.

## Security

- Database credentials stay server-side.
- No `NEXT_PUBLIC_` persistence secrets.
- Queries must be parameterized.
- Immutable history stores must reject accidental update and delete paths at the application layer and enforce uniqueness in the database.
- Projection cache failures must degrade safely to regeneration, but history-store failures are integrity failures and must not be silently masked.
- Raw provider payloads and API tokens are not persisted.
- Production and test databases must remain separate.

## Migration Plan

1. Merge this architecture decision.
2. Add PostgreSQL adapters behind a provider flag.
3. Validate migrations outside production.
4. Run shared contract tests against memory and PostgreSQL adapters.
5. Enable persistent reads.
6. Enable persistent writes.
7. Verify idempotency and concurrency behavior.
8. Deploy to production with monitoring.

No migrations are introduced in this phase.

## Rollback Plan

- Keep the in-memory adapters available for local development and tests.
- If persistent writes fail, the runtime should not pretend the history write succeeded.
- The projection cache may fall back to regeneration.
- Rollback from PostgreSQL can happen by switching the runtime provider flag back to memory while keeping the schema and adapters in place.

## Open Questions

- Exact managed PostgreSQL vendor
- SQL client or ORM choice
- Migration tool
- Connection pooling strategy for serverless deployment
- Whether the projection cache should later move to a dedicated key-value store
- How historical in-memory records should be backfilled
- Whether administrative deletion of immutable history will ever be required

## Notes

This ADR intentionally does not pick a vendor or ORM. It sets the persistence direction and the contract boundaries first so the implementation phase can add adapters without changing product behavior.
