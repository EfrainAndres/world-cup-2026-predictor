# Persistence Migration & Deployment QA Report

**Phase:** 12.15D — Migration, Deployment & Persistence QA  
**Date:** 2026-06-22  
**Branch:** `qa/phase-12-15d-persistence-deployment-validation`  
**Verdict:** `ready_for_non_production`

---

## Environment

| Item | Value |
|---|---|
| Node.js | LTS (project-pinned) |
| pnpm | workspace monorepo |
| `postgres` client | `^3.4.5` |
| Next.js | 15.5.19 |
| TypeScript strictness | `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true` |
| Real PostgreSQL available | No — `TEST_DATABASE_URL` not set |
| PostgreSQL tests | 28 skipped (opt-in only) |

---

## Preflight Audit

### Secret / Credential Isolation

| Check | Result |
|---|---|
| No `NEXT_PUBLIC_DATABASE_URL` or `NEXT_PUBLIC_PERSISTENCE_PROVIDER` | PASS |
| No `NEXT_PUBLIC_TEST_DATABASE_URL` | PASS |
| `DATABASE_URL` and `TEST_DATABASE_URL` kept strictly separate | PASS |
| `TEST_DATABASE_URL` never falls back to `DATABASE_URL` | PASS |
| No raw connection strings or provider payloads in any export | PASS |
| No internal stack traces exposed via API routes | PASS |

### Migration File Idempotency

All three migration files use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. Safe to re-run against an already-migrated database without errors.

| Migration | Table | Status |
|---|---|---|
| `0001_prediction_snapshots.sql` | `prediction_snapshots` | Idempotent |
| `0002_prediction_evaluations.sql` | `prediction_evaluations` | Idempotent |
| `0003_projection_cache.sql` | `projection_cache` | Idempotent |

### Orphaned Cache Cleanup

The old synchronous in-memory cache (`apps/web/src/lib/group-projection-cache.ts`) was removed in Phase 12.15B5. No orphaned cache files remain. The Group Detail SSR page (`apps/web/app/groups/[group]/page.tsx`) uses `resolvePredictionHistoryPersistence().projectionCache` exclusively.

---

## Build Validation

### `pnpm build` Result

```
Tasks: 4 successful, 4 total
```

All four packages (`@world-cup-2026-predictor/api`, `@world-cup-2026-predictor/data`, `@world-cup-2026-predictor/model`, `@world-cup-2026-predictor/web`) built successfully. 17 static pages generated, including all 12 group detail pages (`/groups/A` through `/groups/L`).

### Build Regression Root Cause and Fix

**Root cause:** `transpilePackages: ["@world-cup-2026-predictor/api"]` forces webpack to parse the entire API package including `persistence-runtime.ts`, which imports `postgres`. Postgres uses Node.js built-ins (`net`, `tls`, `fs`, `perf_hooks`) that cannot be bundled in the client-side webpack bundle. Since `api-client.ts` is imported by client components (`MatchSimulationForm.tsx`), webpack attempted to include these Node.js modules in the client bundle.

**Fix applied (two-part):**

1. `packages/api/package.json` — added `"sideEffects": false` so webpack can tree-shake `persistence-runtime.ts` (and therefore `postgres`) out of the client bundle when no client component imports `resolvePredictionHistoryPersistence`.

2. `apps/web/next.config.ts` — added `net`, `tls`, `fs`, `perf_hooks` to the client-bundle `resolve.fallback` as empty modules (same pattern already used for `crypto`). This provides a defense-in-depth safety net if any transitive server-only dependency reaches the client bundle.

3. `apps/web/next.config.ts` — `serverExternalPackages: ["postgres"]` (added in Phase 12.15D) prevents webpack from bundling `postgres` in the server bundle; postgres is required at runtime from `node_modules` instead.

---

## TypeScript Validation

```
@world-cup-2026-predictor/api:build: tsc -p tsconfig.json --noEmit — PASS
apps/web: Linting and checking validity of types — PASS
```

No TypeScript errors across the monorepo.

---

## Test Results

### API Package

```
Test Files: 28 passed (28)
Tests:      920 passed | 28 skipped (948)
```

The 28 skipped tests are PostgreSQL contract tests that require `TEST_DATABASE_URL`. They skip cleanly with a `SKIP: TEST_DATABASE_URL not set` message and do not fail the suite.

### Web Package

```
Test Files: 9 passed (9)
Tests:      72 passed (72)
```

### Git Whitespace

```
git diff --check — PASS
```

---

## Migration Validation (Without Live Database)

A live PostgreSQL run was not performed in this session (`TEST_DATABASE_URL` not set). The following structural validations were performed by inspection:

| Check | Result |
|---|---|
| `0001`, `0002`, `0003` execute in lexicographic order via `runMigrations` | CONFIRMED (by code inspection of `migration-runner.ts`) |
| FK from `prediction_evaluations` to `prediction_snapshots` uses `ON DELETE RESTRICT ON UPDATE RESTRICT` | CONFIRMED |
| Cache table has no FK to history tables — operational data isolation | CONFIRMED |
| `UNIQUE (snapshot_id, result_identity, metric_version)` prevents duplicate evaluations | CONFIRMED |
| `UNIQUE (group_code, timezone)` in `projection_cache` enables upsert via natural key | CONFIRMED |
| `CHECK (expires_at > generated_at)` guards against invalid cache entries | CONFIRMED |
| All `CHECK` constraints are non-nullable | CONFIRMED |

---

## Schema Version Strategy

| Store | Constant | Value | Purpose |
|---|---|---|---|
| Snapshot store | `SNAPSHOT_SCHEMA_VERSION` | `"1"` | Validates rows during deserialization |
| Evaluation store | `EVALUATION_SCHEMA_VERSION` | `"1"` | Validates rows during deserialization |
| Projection cache | `PROJECTION_CACHE_SCHEMA_VERSION` | `"1"` | Validates rows during deserialization |

All adapters throw `SnapshotStorageError("unsupported_schema_version", ...)` when a stored row's `schema_version` does not match the expected constant. This prevents silent data corruption during zero-downtime schema migrations.

---

## Security Checks

| Check | Result |
|---|---|
| All SQL queries use parameterized placeholders (`sql\`...\`` tagged templates) | PASS |
| No raw connection strings logged or returned in API responses | PASS |
| `resolvePredictionHistoryPersistence` is server-only (imported only in RSC `page.tsx`) | PASS |
| `PERSISTENCE_PROVIDER` and `DATABASE_URL` are server-only (`process.env`, no `NEXT_PUBLIC_`) | PASS |
| Client bundle does not include `postgres` or persistence-runtime code | PASS (confirmed by build trace and `sideEffects: false`) |

---

## CI Strategy

### Standard CI (No `TEST_DATABASE_URL`)

The existing CI pipeline runs:

```
pnpm typecheck  # TSC across all packages
pnpm test       # 920 API + 72 web tests; PostgreSQL tests skip cleanly
pnpm build      # Full webpack + Next.js build
```

PostgreSQL contract tests skip automatically — no CI configuration change required.

### Optional: Persistence Integration Job

A separate, opt-in CI job can be added when a managed PostgreSQL instance is available (e.g. a Vercel Postgres preview database or a GitHub Actions service container). Required additions:

```yaml
# .github/workflows/persistence-integration.yml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: ci_password
      POSTGRES_DB: wc2026_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s

env:
  TEST_DATABASE_URL: postgresql://postgres:ci_password@localhost:5432/wc2026_test
```

The job then runs `pnpm --filter @world-cup-2026-predictor/api test` — the 28 PostgreSQL contract tests will run against the real database instead of skipping.

**Critical constraint:** `TEST_DATABASE_URL` must never equal `DATABASE_URL`. The integration job uses a dedicated CI database; the application's `DATABASE_URL` is never set in this job.

---

## Verdict

**`ready_for_non_production`**

All in-scope validations pass. The persistence layer is structurally correct and safe to deploy to a non-production environment where `PERSISTENCE_PROVIDER=postgres` and a managed `DATABASE_URL` are provisioned. Full PostgreSQL contract test validation (28 tests) requires `TEST_DATABASE_URL` to be set against a dedicated test database.

See `docs/qa/PERSISTENCE_DEPLOYMENT_CHECKLIST.md` for the operator runbook.
