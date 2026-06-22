# ADR 0011: Use Neon, `postgres`, and SQL-First Migrations for Persistent Prediction History

## Status

Accepted

## Date

2026-06-22

## Context

Phase 12.15A established that persistent prediction snapshots, Model-vs-Reality evaluations, and the projection cache should use relational PostgreSQL as the storage direction. This ADR selects the concrete stack so the later adapter phase can implement a reproducible, serverless-safe persistence layer without changing product behavior.

The stack must work with:

- Next.js and Vercel server runtimes
- serverless-safe connection behavior
- PostgreSQL transactions, unique constraints, foreign keys, and JSONB
- deterministic migrations checked into Git
- TypeScript
- local development and test isolation
- minimal operational complexity and vendor portability

## Decision

Use a serverless PostgreSQL provider such as Neon as the primary persistence category.

Use the lightweight `postgres` SQL client as the initial data-access layer.

Use SQL-first, versioned migrations checked into the repository as the migration strategy.

Keep a single provider initially for snapshots, evaluations, and the projection cache. Do not introduce a second cache provider at this stage.

## Provider Recommendation

### Selected Category

- Serverless PostgreSQL

### Why

- Matches Next.js/Vercel serverless runtime constraints.
- Supports pooled, short-lived connections better than a traditional long-lived connection model.
- Retains full PostgreSQL semantics for transactions, unique constraints, foreign keys, and JSONB.
- Keeps the project portable across compatible managed PostgreSQL vendors.

### Why Not the Other Options

| Option | Reason Not Chosen |
| --- | --- |
| Supabase PostgreSQL | Viable, but the project does not need the extra product surface for this phase. |
| Vercel Postgres-compatible managed PostgreSQL | Viable, but selecting a vendor-specific managed offering now is less portable than a general serverless PostgreSQL direction. |
| Traditional managed PostgreSQL | Works, but is less aligned with serverless runtime behavior and often requires more explicit pooling management. |

## SQL Client / ORM Recommendation

### Selected Client

- Lightweight SQL client: `postgres`

### Why

- SQL-transparent and easy to reason about.
- Good fit for the project’s explicit domain contracts and small adapter surface.
- Low bundle/runtime overhead compared with a larger ORM.
- Strong support for parameterized queries and straightforward transaction handling.
- Avoids code generation and the broader runtime surface of a heavier ORM.

### Why Not the Other Options

| Option | Reason Not Chosen |
| --- | --- |
| Drizzle ORM | Reasonable future option, but not necessary for the current contract-driven design and adds schema-generation conventions the project does not currently need. |
| Prisma | Powerful, but heavier than required and less aligned with the project preference for simple, explainable architecture. |
| Other ORM | Not justified until the persistence surface grows beyond the current history and cache contracts. |

## Migration Recommendation

### Selected Strategy

- SQL-first migrations stored in Git

### Why

- Deterministic and reviewable.
- Keeps schema changes explicit and portable.
- Works well with a lightweight SQL client.
- Avoids coupling migrations to ORM-generated behavior.

### Why Not ORM-Native Migrations

- The project does not need ORM-generated migrations to define the data model.
- ORM-native migrations increase coupling to the selected ORM.

## Connection Strategy

Use one server-side connection abstraction that is created only in the runtime/composition layer.

Required behavior:

- no database client in browser code
- no `NEXT_PUBLIC_` database URL
- production uses a pooled or serverless-safe connection path
- transaction boundaries stay inside the adapter layer
- readiness checks should report database unavailability clearly
- migration mismatch should fail fast rather than pretending the database is ready

## Local Development

- Memory adapters remain the default for unit tests and local deterministic work.
- PostgreSQL may be opt-in for local development.
- Local developer PostgreSQL should use the same SQL schema and migrations as production.
- Local setup should not require a separate cache provider.

## Test Database

- Contract tests against PostgreSQL should run separately from pure memory tests.
- Test databases must not share production credentials.
- Each test run should isolate state using transactions, disposable schemas, or a disposable database.
- Migrations should run before PostgreSQL adapter integration tests.

## Deployment Sequence

1. Merge this stack-selection ADR.
2. Add the PostgreSQL adapter behind a provider flag.
3. Add SQL-first migrations to the repository.
4. Run migrations against a non-production database.
5. Run shared adapter contract tests against memory and PostgreSQL.
6. Enable persistent reads.
7. Enable persistent writes.
8. Verify idempotency, foreign keys, and concurrency behavior.
9. Deploy to production.
10. Monitor connection and migration failures.

## Rollback

- Keep the in-memory adapters intact.
- Switch the runtime provider flag back to memory if persistent writes fail.
- Keep migrations versioned so a failed rollout can be diagnosed and rolled forward or reverted explicitly.
- Projection-cache regeneration must remain safe if the cache database path is unavailable.

## Consequences

### Benefits

- Lightweight SQL-transparent stack.
- Serverless-compatible connection behavior.
- Clear transactional semantics for immutable history.
- Minimal runtime overhead.
- Strong portability because the project still speaks PostgreSQL directly rather than a vendor-specific abstraction.

### Tradeoffs

- Fewer ORM conveniences.
- More explicit SQL to maintain.
- Connection pooling and environment configuration still need careful implementation.

## Security

- Database credentials remain server-side.
- No browser-exposed persistence secrets.
- Parameterized queries only.
- Minimal database privileges.
- Separate production and test databases.
- No raw provider payloads in the database.

## Alternatives Considered

| Area | Considered | Reason Not Selected |
| --- | --- | --- |
| Provider | Neon, Supabase, Vercel Postgres-compatible, traditional managed PostgreSQL | Neon-style serverless PostgreSQL best matches the serverless/runtime constraints without overcommitting to a broader platform surface |
| SQL layer | `postgres`, Drizzle, Prisma, other ORM | `postgres` keeps the stack small and SQL-transparent |
| Migrations | SQL-first, ORM-native, standalone tool-only | SQL-first gives deterministic, reviewable migrations without ORM coupling |

## Open Questions

- Exact managed PostgreSQL vendor within the serverless PostgreSQL category
- Whether the project should later migrate the projection cache to a dedicated KV store
- Whether local development should document a recommended Docker or hosted Postgres setup
- Which connection pooling variant should be used in production deployment
- Whether a future repository policy wants a dedicated migration runner package or a lightweight script-based migration flow

## Notes

This ADR selects the stack direction, not the implementation. Phase 12.15B can now add adapters and migrations without revisiting the provider, SQL-client, or migration strategy unless new evidence appears.
