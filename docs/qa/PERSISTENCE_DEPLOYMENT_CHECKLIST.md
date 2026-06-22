# Persistence Deployment Checklist

Use this checklist when deploying `PERSISTENCE_PROVIDER=postgres` to a new environment for the first time or after schema migrations.

---

## Pre-Deployment

- [ ] Provision a managed PostgreSQL database (Neon, Supabase, Railway, Vercel Postgres, or self-hosted).
- [ ] Obtain the connection string. It must NOT use a `NEXT_PUBLIC_` variable.
- [ ] Add `DATABASE_URL=postgresql://...` to the target environment's server-side secrets.
- [ ] Add `PERSISTENCE_PROVIDER=postgres` to the target environment's server-side config.
- [ ] Verify `DATABASE_URL` is absent from the client build (`NEXT_PUBLIC_*` variables are forbidden).
- [ ] Create a separate database for integration tests. Set `TEST_DATABASE_URL` for that database only.
- [ ] Confirm `TEST_DATABASE_URL` does NOT equal `DATABASE_URL`.

---

## Migration Run

```bash
# From packages/api, using the deployment database:
DATABASE_URL=postgresql://... node --experimental-strip-types ./src/db-migrate.ts
```

Expected output:

```
Running migration: 0001_prediction_snapshots.sql
Running migration: 0002_prediction_evaluations.sql
Running migration: 0003_projection_cache.sql
Migrations complete.
```

- [ ] Migration script exits with code 0.
- [ ] All three tables exist: `prediction_snapshots`, `prediction_evaluations`, `projection_cache`.
- [ ] All indexes exist (verify with `\d prediction_snapshots` etc. in psql).

---

## Post-Migration Validation

```bash
# Verify tables
psql $DATABASE_URL -c "\dt"

# Verify prediction_snapshots constraints
psql $DATABASE_URL -c "\d prediction_snapshots"

# Verify prediction_evaluations FK
psql $DATABASE_URL -c "\d prediction_evaluations"

# Verify projection_cache natural key
psql $DATABASE_URL -c "\d projection_cache"
```

- [ ] `prediction_snapshots` has `UNIQUE (idempotency_key)`.
- [ ] `prediction_evaluations` has FK to `prediction_snapshots` with `ON DELETE RESTRICT`.
- [ ] `prediction_evaluations` has `UNIQUE (snapshot_id, result_identity, metric_version)`.
- [ ] `projection_cache` has `UNIQUE (group_code, timezone)`.
- [ ] `projection_cache` has `CHECK (expires_at > generated_at)`.

---

## PostgreSQL Contract Tests (Optional but Recommended)

```bash
TEST_DATABASE_URL=postgresql://... pnpm --filter @world-cup-2026-predictor/api test
```

- [ ] 28 previously-skipped PostgreSQL tests now run and pass.
- [ ] No `SnapshotStorageError` thrown during contract test teardown.
- [ ] Test database cleaned up by `afterEach` hooks.

---

## Application Smoke Test

After deploying the application:

- [ ] `GET /` — Dashboard loads without error.
- [ ] `GET /groups/A` — Group A page loads; no warning banner about cache unavailability.
- [ ] `GET /groups/A` (second request) — Response is fast; projection is served from cache if unchanged.
- [ ] `GET /api/world-cup-2026/groups/A` — API route responds with 200 and valid JSON.
- [ ] Repeat for at least one more group (e.g. `/groups/B`).

---

## Rollback

If the application fails after migration:

1. Revert `PERSISTENCE_PROVIDER` to `memory` in the environment config.
2. Redeploy. The application will use in-memory adapters and skip all database reads/writes.
3. Migrations do not need to be reversed — `prediction_snapshots`, `prediction_evaluations`, and `projection_cache` tables are backward-compatible and do not affect the memory provider path.

To drop tables if needed:

```sql
DROP TABLE IF EXISTS prediction_evaluations;
DROP TABLE IF EXISTS projection_cache;
DROP TABLE IF EXISTS prediction_snapshots;
```

**Note:** Dropping `prediction_evaluations` before `prediction_snapshots` is required due to the FK constraint.

---

## Security Reminders

- `DATABASE_URL` must never be prefixed with `NEXT_PUBLIC_`.
- `TEST_DATABASE_URL` must never equal `DATABASE_URL`.
- No raw SQL parameters, connection strings, or database error details are exposed in API responses or client-side JavaScript.
- The `runMigrations` export was intentionally removed from the API package's main `index.ts` to prevent webpack from bundling `node:fs`/`node:path` into the client bundle.
