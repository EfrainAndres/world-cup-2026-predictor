# Automated Pre-Match Snapshot Capture

**Phase:** 12.18A1 — Automated Pre-Match Snapshot Capture
**Service:** `captureWorldCup2026PreMatchSnapshots` / `runScheduledPreMatchSnapshotCapture` (`packages/api/src/prematch-snapshot-capture.ts`)
**CLI:** `pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots`

---

## Purpose

Automatically capture immutable, auditable **pre-match** prediction snapshots for
eligible upcoming World Cup 2026 fixtures **before kickoff**, so that the existing
Model-vs-Reality evaluator and the Prediction Usefulness Audit have real stored
predictions to evaluate once results arrive.

This phase **does not change** any production prediction formula, Elo/xG constant,
standings logic, provider, migration, or user-facing prediction behaviour. It only
discovers fixtures, reuses the existing production prediction path
(`predictMatchFromLiveElo`), and persists snapshots through the existing async
snapshot store. It never updates or deletes a snapshot.

## Capture Window

A fixture is capturable only inside a bounded window relative to kickoff:

| Boundary | Default | Constant |
|---|---|---|
| Window opens | 24 hours before kickoff | `PREMATCH_SNAPSHOT_CAPTURE_WINDOW_START_BEFORE_KICKOFF_MINUTES = 1440` |
| Window closes | 15 minutes before kickoff | `PREMATCH_SNAPSHOT_CAPTURE_WINDOW_END_BEFORE_KICKOFF_MINUTES = 15` |

Deterministic boundary behaviour (numeric epoch-ms comparison, exact to the
millisecond):

| Moment | Eligibility |
|---|---|
| at window start | `eligible` |
| 1 ms before window start | `too_early` |
| at window end | `eligible` |
| 1 ms after window end | `window_closed` |
| exactly at kickoff | `already_started` (ineligible) |

## Eligibility

A fixture is `eligible` only when all of the following hold:

- it resolves to an official World Cup 2026 group-stage fixture;
- the fixture status is `scheduled` (not live/halftime/finished/postponed/cancelled/unknown);
- a kickoff time exists and parses;
- the injected `now` is inside the capture window and strictly before kickoff;
- provider data is not marked invalid;
- no equivalent immutable snapshot already exists for the capture identity.

Typed eligibility states (`PreMatchCaptureEligibility`):

```
eligible | too_early | window_closed | already_started | missing_kickoff
| unsupported_fixture | unresolved_teams | already_captured | provider_invalid
```

Every excluded fixture is reported with a sanitized `issueCode` (e.g.
`fixture_completed`, `fixture_postponed`, `before_capture_window`,
`after_capture_window`, `missing_kickoff`, `not_official_fixture`,
`provider_data_invalid`). Raw provider or database error text is never surfaced.

## No-Look-Ahead Guarantee

`capturedAt < kickoffAt` is guaranteed two ways:

1. The wall clock is read **exactly once** at the orchestration boundary and the
   resolved `now` is threaded through all pure logic. Pure eligibility logic
   never calls `Date.now()`.
2. A **final guard immediately before persistence** re-asserts that the built
   snapshot has status `pre_match_locked` and that `now < kickoff`. If kickoff
   changes between discovery and persistence, this guard re-validates and the
   capture is reported as a `look_ahead_guard` failure rather than written.

Snapshots are never backdated; completed/live fixtures are never captured.

## Idempotency (Capture Identity)

The capture reuses the **existing** snapshot idempotency key
(`buildSnapshotIdempotencyKey`) and content hash — historical hashes are
unchanged. To make repeated scheduler runs idempotent, the capture derives a
**stable, fixture-derived** `cutoffAt = kickoffAt` instead of the wall clock.
The identity is therefore determined by:

```
fixtureId + cutoffAt(=kickoff) + modelVersion + eloPreset + maxGoals
         + tournamentResultsAdjustmentEnabled
```

Repeated runs resolve to the same `snapshotId` and return the existing record
(`already_captured`) rather than creating a duplicate. Before generating a
prediction the service queries `getByIdempotencyKey` and skips already-captured
fixtures (no wasted prediction work).

**Policy:** at most one snapshot per fixture for a stable
model/formula/preset/input identity. A new model version (which changes
`modelVersion`) produces a different identity and may create a new snapshot; the
prior snapshots are preserved and never overwritten. A conflicting identity (same
key, different content hash) is reported as a typed
`snapshot_identity_conflict` failure, never silently resolved.

## Prediction Configuration

One stable configuration is used for every capture (no second prediction
formula):

| Field | Default |
|---|---|
| `preset` | `balanced` |
| `tournamentResultsAdjustmentEnabled` | `false` (matches the production snapshot handler and keeps the identity deterministic) |
| `tournamentFormAdjustmentEnabled` | `false` (production default; secondary signal off) |
| `maxGoals` | `DEFAULT_POISSON_CONFIG.maxGoals` |

The persisted snapshot records preset, model version, formula version (via the
prediction), Elo source, fallback usage, confidence, coverage, and the content
hash (input fingerprint) through the unchanged `buildWorldCup2026PredictionSnapshot`.

## Dry Run

`dryRun: true` (CLI: `PREMATCH_CAPTURE_DRY_RUN=true`) performs discovery and
eligibility evaluation and reports what **would** be captured, but performs no
persistence writes and exposes no secrets. Clearly ineligible fixtures are
skipped without expensive prediction work; eligible fixtures are reported as
`would_capture`.

## CLI

```bash
pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
```

Environment:

```
PERSISTENCE_PROVIDER=postgres          # required for real persistence
DATABASE_URL=...                       # required when provider=postgres
PREMATCH_CAPTURE_DRY_RUN=true|false    # default false
PREMATCH_CAPTURE_NOW=<ISO>             # non-production testing only
PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE=true   # gate to permit NOW in postgres mode
PREMATCH_CAPTURE_FIXTURE_IDS=id1,id2   # optional allow-list
```

Rules:

- Non-dry-run postgres execution requires `DATABASE_URL`; an explicit error and a
  non-zero exit code are emitted when it is absent.
- The connection string and credentials are never printed.
- An arbitrary historical `PREMATCH_CAPTURE_NOW` is rejected in non-dry postgres
  mode unless `PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE=true` is set.
- The exit code is non-zero on unsafe configuration or any partial fixture
  failure; failed fixtures are listed by id and sanitized issue code.

> **Runtime note:** the CLI follows the repository convention
> `node --experimental-strip-types ./src/*.ts` (matching `db:migrate` and
> `audit:prediction-usefulness`). That convention resolves relative `.js` import
> specifiers to their `.ts` sources only on Node versions where type-stripping
> performs that rewrite; on older Node the same limitation applies to the
> existing CLIs. The pure capture service is fully exercised by the test suite
> regardless of Node version.

## Scheduler Integration

`runScheduledPreMatchSnapshotCapture(input)` is the scheduler-compatible entry
point, suitable for cron, GitHub Actions, or Vercel Cron via the CLI. It:

- resolves persistence and **requires PostgreSQL for non-dry-run scheduled
  capture** — it never silently falls back to memory;
- acquires a lock, runs the capture, and releases the lock in `finally`;
- returns `alreadyRunning: true` (and captures nothing) when the lock is held.

No Vercel Cron, GitHub Actions schedule, or external infrastructure is
provisioned in this phase. A protected runtime route was intentionally **not**
added; the CLI is the integration point. If a route is added later it must be
server-only, authenticated with a dedicated non-`NEXT_PUBLIC_` secret, reject
GET writes, and return a generic unauthorized response.

## Locking

- **Process-local mutex** (`createProcessLocalCaptureLock`) is the default and
  prevents overlapping runs within a single process.
- **PostgreSQL advisory lock** (`createPostgresAdvisoryCaptureLock`) uses
  `pg_try_advisory_lock` (non-blocking, bounded) and `pg_advisory_unlock`, taking
  no table locks. The CLI uses it for postgres scheduled mode on a dedicated
  short-lived connection. A skipped run reports `already_running`.

## Persistence Requirements

- PostgreSQL is required in scheduled production mode.
- Memory mode is for unit tests and local dry runs only.
- Equivalent duplicates are idempotent; conflicting duplicates produce a typed
  failure; no migration runs during capture; there is no update/delete behaviour.

## Security

- Server-only; uses `node:crypto` via the existing snapshot service.
- No secret or connection string is ever printed or placed in any report.
- No `NEXT_PUBLIC_` secret; the CLI is kept out of `index.ts` so it never enters
  the web bundle.

## Operational Status

`getPreMatchSnapshotCaptureStatus()` returns runtime metadata: last attempted /
successful run, last-run counts (discovered / captured / already-captured /
skipped / failed), the persistence provider, the next eligible fixture (when
fixture records and `now` are supplied), and a `schedulerConfigured` flag. This
is in-memory runtime metadata only — there is no persistent run-status table in
this phase.

## Audit Compatibility

Captured snapshots are immediately compatible with both the Model-vs-Reality
evaluator and `runWorldCup2026PredictionUsefulnessAudit`: a snapshot captured
with an injected pre-kickoff `now`, persisted, and paired with a completed result
fixture is selected as exactly one eligible prediction by the audit (covered by a
focused test). Capture and evaluation are never combined into one transaction.

## Limitations

- The default local static provider does **not** supply kickoff times for
  scheduled fixtures, so in local mode every scheduled fixture is reported as
  `missing_kickoff` and nothing is captured. Real capture requires a provider
  (e.g. `football_data_org`) that supplies kickoff times.
- Operational status is in-process runtime metadata only; it resets on restart.
- No automatic post-match evaluation is performed; snapshots are merely made
  compatible with the existing evaluator.

## Rollback / Disable

- Set the policy `enabled: false` (or simply do not schedule the CLI) to stop
  capturing; nothing else changes.
- Stop invoking `capture:prematch-snapshots`; no migration or schema change was
  introduced, so there is nothing to revert.
- Existing snapshots are immutable and are never modified or deleted by this
  feature.
