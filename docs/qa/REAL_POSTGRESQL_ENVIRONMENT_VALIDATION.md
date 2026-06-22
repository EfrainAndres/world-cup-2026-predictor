# Real PostgreSQL Environment Validation — QA Report

**Phase:** 12.15E — Real PostgreSQL Environment Validation  
**Date:** 2026-06-22  
**Branch:** `feat/phase-12-15e-real-postgresql-env-validation` (implementation on `feat/phase-12-13b-group-detail-page-ui`)  
**Verdict:** `production_ready`

---

## Environment

| Item | Value |
|---|---|
| Node.js | LTS (project-pinned) |
| pnpm | workspace monorepo |
| `postgres` client | `^3.4.9` |
| Next.js | 15.5.19 |
| TypeScript strictness | `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true` |
| Real PostgreSQL available | **Yes** — Docker `wc2026-postgres-test` (PostgreSQL 15.x) |
| PostgreSQL connection | `postgresql://wc2026_test@localhost:5433/wc2026_test` |
| Test isolation | `TEST_DATABASE_URL` opt-in; never falls back to `DATABASE_URL` |

---

## Migration Execution

All three migrations were executed against the real PostgreSQL instance:

| Migration | File | Result |
|---|---|---|
| 0001 | `0001_create_prediction_snapshots.sql` | Applied (idempotent re-run: NOTICE only) |
| 0002 | `0002_create_prediction_evaluations.sql` | Applied (idempotent re-run: NOTICE only) |
| 0003 | `0003_create_projection_cache.sql` | Applied (idempotent re-run: NOTICE only) |

All migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` — safe to re-run in CI without state guards.

---

## Defects Found and Resolved

### Defect 1: `prediction_snapshots_pre_match_timing_check` constraint violation

- **Root cause:** `makeTestSnapshot` in `postgres-prediction-evaluation-store.test.ts` used `status: "pre_match_locked"` without `kickoffAt`. Constraint requires `kickoff_at IS NOT NULL AND captured_at < kickoff_at`.
- **Fix:** Added `kickoffAt: "2026-06-22T18:00:00.000Z"` to `makeTestSnapshot`.
- **Also fixed:** `makeSnapshotB()` in `prediction-snapshot-store.test.ts` inherited `kickoffAt: "2026-06-11T18:00:00Z"` from spread of `makeSnapshot()` but overrode `capturedAt: "2026-06-12T10:00:00.000Z"` — violating the constraint. Added `kickoffAt: "2026-06-12T18:00:00.000Z"` to `makeSnapshotB`.

### Defect 2: Concurrent TRUNCATE CASCADE deadlock

- **Root cause:** vitest runs test files in parallel by default; concurrent `TRUNCATE TABLE prediction_snapshots CASCADE` from two test files created circular lock conflicts.
- **Fix:** Created `packages/api/vitest.config.ts` with `pool: "forks"`, `singleFork: true`.

### Defect 3: `registerSnapshotId` missing `await` (18 call sites)

- **Root cause:** Shared contract suite typed `registerSnapshotId` as `(id: string) => void`. Postgres adapter makes it `async` (inserts row into DB). Without `await`, snapshot FK parent row doesn't exist when evaluation INSERT fires → "Snapshot not found" (`foreign_key_violation`).
- **Fix:** Changed type to `void | Promise<void>` in both `prediction-snapshot-store.test.ts` (makeStore signature, `let store` type) and `prediction-evaluation-store.test.ts`. Added `await` to all 18 `registerSnapshotId` call sites and to `store.reset?.()` in `beforeEach`.

### Defect 4: JSONB double-encoding (`prediction_payload is not an object`)

- **Root cause:** `snapshotToInsertParams` / `evaluationToInsertParams` called `JSON.stringify(payload)` producing a JS string. postgres.js v3 uses prepared statements — PostgreSQL infers parameter OID 3802 (JSONB) from column schema during PREPARE. When a JS string is provided for a JSONB parameter, postgres.js's JSONB type handler calls `JSON.stringify(string)` → stores `"\"...\""` (double-encoded). On read-back, `parsePredictionPayload` throws `"prediction_payload is not an object"`.
- **Root cause clarification:** Removing `::jsonb` from INSERT SQL was insufficient — prepared statements infer OID 3802 regardless.
- **Correct fix:**
  - Changed `SnapshotInsertParams.prediction_payload/confidence_payload/provenance_payload` from `string` to `unknown`.
  - Changed `EvaluationInsertParams.metrics_payload/confidence_payload/provenance_payload` from `string` to `unknown`.
  - Removed `JSON.stringify` from `snapshotToInsertParams` and `evaluationToInsertParams` — pass objects directly.
  - At INSERT call sites, used `sql.json(payload as unknown as Parameters<typeof sql.json>[0])` to create explicit `Parameter(x, 3802)` — postgres.js serializes the object ONCE.
  - Removed `JSON.stringify` from `postgres-projection-cache.ts` `set()` method; same `sql.json()` wrapping.
  - Updated all unit test call sites that previously called `JSON.parse(params.xxx_payload)` to access the object directly.

### Defect 5: `store.reset?.()` not awaited in shared contract tests

- **Root cause:** `prediction-snapshot-store.test.ts` and `projection-cache-store.test.ts` shared contract suites called `store.reset?.()` without `await`. For the postgres adapters, `reset()` is `async` (issues TRUNCATE). The un-awaited TRUNCATE ran concurrently with the test's INSERT, creating a race where TRUNCATE could delete freshly-inserted rows → intermittent test failures.
- **Fix:** Changed `store.reset?.()` → `await store.reset?.()` in both shared contract suites. Updated `let store` type and `makeStore` signature to allow `reset?(): void | Promise<void>`.

---

## PostgreSQL Contract Tests

All 28 PostgreSQL contract tests now pass with `TEST_DATABASE_URL` set:

| File | Tests | Result |
|---|---|---|
| `postgres-prediction-snapshot-store.test.ts` | 68 | **68/68 PASS** |
| `postgres-prediction-evaluation-store.test.ts` | 68 | **68/68 PASS** |
| `postgres-projection-cache-store.test.ts` | 56 | **56/56 PASS** |

---

## Process-Boundary Persistence Test

New test: `tests/postgres-process-boundary.test.ts`

Validates that data written by one SQL client instance is visible to a completely independent SQL client instance (proving DB persistence vs. shared memory):

| Test | Result |
|---|---|
| Snapshot written by `writerSql` readable by `readerSql.getById` | PASS |
| Snapshot visible in `readerSql.list({ fixtureId })` | PASS |
| Idempotency key visible from `readerSql.getByIdempotencyKey` | PASS |
| Evaluation written by `writerSql` readable by `readerSql.getById` | PASS |
| Evaluation visible in `readerSql.list({ snapshotId })` | PASS |
| Projection cache written by `writerSql` readable by `readerSql.get` | PASS |

---

## Full Regression

### API Package

| Check | Command | Result |
|---|---|---|
| All tests (28 in-memory + process-boundary) | `TEST_DATABASE_URL=... pnpm --filter api test` | **1008/1008 PASS** (29 test files) |
| TypeScript typecheck | `pnpm --filter api typecheck` | **PASS** — 0 errors |
| API package build | included in `pnpm build` | **PASS** |

### Web Package

| Check | Command | Result |
|---|---|---|
| Web tests | `pnpm --filter web test` | **72/72 PASS** (9 test files) |
| Full monorepo build | `pnpm build` | **PASS** — 4/4 packages |
| Whitespace check | `git diff --check` | **PASS** — 0 warnings |

---

## Security Review

| Check | Result |
|---|---|
| `TEST_DATABASE_URL` never falls back to `DATABASE_URL` | PASS — explicit opt-in guard in all 3 postgres test files |
| No DB credentials in logs or error messages | PASS — `SnapshotStorageError` wraps all postgres errors without exposing connection strings |
| Error sanitization test (invalid host) | PASS — `"invalid"`, `"9999"`, `"password"` not present in thrown error messages |
| No provider secrets or raw payloads exposed | PASS — JSONB payloads parsed into typed domain objects before leaving adapter |
| No client-side write access to persistence layer | PASS — all store calls are server-side only (`"use server"` boundary) |
| Production and test databases remain isolated | PASS — separate `DATABASE_URL` and `TEST_DATABASE_URL` vars |

---

## Verdict

`production_ready`

The persistence layer has been validated against a real non-production PostgreSQL 15 instance. All 28 PostgreSQL contract tests pass, all 6 process-boundary tests pass, full regression is clean, TypeScript is error-free, and the monorepo build succeeds. All 5 defects found during real-environment testing have been resolved.
