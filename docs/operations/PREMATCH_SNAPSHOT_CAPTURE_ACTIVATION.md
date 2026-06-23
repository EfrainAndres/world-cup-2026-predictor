# Pre-Match Snapshot Capture — Activation & Operations Guide

Phase 12.18A2. Describes how to activate, verify, and operate the automated pre-match snapshot capture introduced in Phase 12.18A1.

---

## Overview

The capture pipeline discovers upcoming World Cup 2026 fixtures from the `football_data_org` provider, generates one deterministic pre-match prediction per fixture, and persists an immutable snapshot before kickoff. This document explains how to take that pipeline from zero to a running scheduled workflow.

---

## Required Provider

The external provider `football_data_org` (football-data.org API v4) is required. It is the only supported provider that supplies kickoff timestamps for scheduled fixtures. The local static provider does not include kickoff times, so all fixtures will result in `missing_kickoff` eligibility if the external provider is not configured.

---

## Required Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PERSISTENCE_PROVIDER` | Yes | Must be `postgres` for capture mode. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Never use a `NEXT_PUBLIC_` prefix and never commit real values. |
| `RESULTS_PROVIDER` | Yes | Must be `football_data_org` to enable kickoff-bearing fixture records. |
| `FOOTBALL_DATA_API_TOKEN` | Yes | API token from football-data.org (free tier works for WC competition). |
| `PREMATCH_CAPTURE_MODE` | No | `preflight` \| `dry_run` \| `capture` (default: `capture`). |
| `PREMATCH_CAPTURE_DRY_RUN` | No | `true` \| `false` (default: `false`). Overridden by `dry_run` mode. |
| `PREMATCH_CAPTURE_NOW` | No | ISO timestamp override for non-production clock testing only. |
| `PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE` | No | Must be `true` to permit `PREMATCH_CAPTURE_NOW` in postgres capture mode. |
| `PREMATCH_CAPTURE_FIXTURE_IDS` | No | Comma-separated fixture IDs to restrict capture to a subset. |

---

## GitHub Repository Secrets

For the scheduled GitHub Actions workflow add these secrets at **Settings → Secrets and variables → Actions**:

| Secret name | Maps to | Notes |
| --- | --- | --- |
| `WC2026_DATABASE_URL` | `DATABASE_URL` | PostgreSQL connection string for the capture database. Never expose in logs. |
| `FOOTBALL_DATA_API_TOKEN` | `FOOTBALL_DATA_API_TOKEN` | API token for football-data.org. Free tier suffices. |

---

## CLI Modes

Run via: `pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots`

### preflight

Validates configuration and connectivity without making predictions or writes.

```bash
PREMATCH_CAPTURE_MODE=preflight \
  PERSISTENCE_PROVIDER=postgres \
  DATABASE_URL=postgresql://... \
  RESULTS_PROVIDER=football_data_org \
  FOOTBALL_DATA_API_TOKEN=... \
  pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
```

Exit 0 for `ready` or `ready_no_currently_eligible_fixture`. Exit 1 for any `blocked_*` status.

The preflight checks in order:

1. `PERSISTENCE_PROVIDER=postgres`
2. `DATABASE_URL` present
3. `RESULTS_PROVIDER=football_data_org` and `FOOTBALL_DATA_API_TOKEN` present
4. Database connectivity (SELECT 1)
5. Provider connectivity (live API call; no local fallback accepted)
6. Fixtures have kickoff timestamps
7. Capture window is evaluable

### dry_run

Discovers and evaluates eligible fixtures. No predictions. No writes.

```bash
PREMATCH_CAPTURE_MODE=dry_run \
  PERSISTENCE_PROVIDER=postgres \
  DATABASE_URL=postgresql://... \
  RESULTS_PROVIDER=football_data_org \
  FOOTBALL_DATA_API_TOKEN=... \
  pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
```

Output includes `eligible`, `would_capture`, and `skipped` counts. No `captured` write occurs.

### capture

Performs the full protected capture flow.

```bash
PREMATCH_CAPTURE_MODE=capture \
  PERSISTENCE_PROVIDER=postgres \
  DATABASE_URL=postgresql://... \
  RESULTS_PROVIDER=football_data_org \
  FOOTBALL_DATA_API_TOKEN=... \
  pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
```

Requires `PERSISTENCE_PROVIDER=postgres`. Never falls back to memory. Exits non-zero on partial failure.

---

## Recommended Activation Progression

```
preflight → dry_run → capture → capture (repeat to verify idempotency)
```

### Step 1: Preflight

Run preflight to confirm all configuration and connectivity checks pass.

Expected output for a fully ready environment:

```
Pre-match capture preflight complete.
  status:                          ready
  persistence_provider_configured: true
  database_url_configured:         true
  provider_configured:             true
  database_connectivity:           true
  provider_connectivity:           true
  fixtures_have_kickoff:           true
  capture_window_evaluable:        true
  total_fixtures:                  <N>
  fixtures_with_kickoff:           <N>
  upcoming_fixtures:               <N>
  unresolved_teams:                0
  invalid_fixtures:                0
  in_current_capture_window:       <0 or more>
```

Status `ready_no_currently_eligible_fixture` is also acceptable — it means the pipeline is ready but no fixture is currently within the 24h→15m window. Exit code is 0.

### Step 2: Dry Run

Confirm fixtures are discovered and evaluated correctly.

Expected output (when a fixture is eligible):

```
Pre-match snapshot capture complete.
  provider:           postgres
  dry run:            true
  already running:    false
  discovered:         <N>
  eligible:           1
  captured:           1
  already captured:   0
  skipped:            <N>
  failed:             0
```

In dry run mode `captured` reflects `would_capture` count (no actual write).

### Step 3: First Real Capture

Run capture mode. Verify the output shows `captured: 1` (or the number of eligible fixtures) and `failed: 0`.

### Step 4: Repeated Capture (Idempotency Verification)

Run capture a second time immediately. Idempotency is guaranteed by the stable fixture-derived `cutoffAt = kickoff` identity:

```
  captured:         0
  already captured: 1
  failed:           0
```

The `snapshotId` in the database is identical to the first run. No duplicate is created.

---

## Scheduling Cadence

The GitHub Actions workflow runs every 30 minutes:

```yaml
schedule:
  - cron: "*/30 * * * *"
```

The capture window is 24 hours to 15 minutes before kickoff. Running every 30 minutes means:
- First capture attempt: approximately 24 hours before kickoff (±30 min)
- Subsequent runs: idempotent (return `already_captured`)
- Last eligible run: at most 15 minutes before kickoff

---

## Concurrency

### Process-local mutex

A module-level `processLocalLockHeld` flag prevents two concurrent calls within the same Node.js process. Contention returns `alreadyRunning: true`.

### PostgreSQL advisory lock

In postgres non-dry mode, the CLI acquires a `pg_try_advisory_lock` on a dedicated short-lived connection. If a second workflow run starts while the first holds the lock, it returns `alreadyRunning: true` without error. The advisory connection is always released in a `finally` block.

### GitHub Actions concurrency

The workflow uses:
```yaml
concurrency:
  group: prematch-snapshot-capture
  cancel-in-progress: false
```

A second workflow run waits for the first to finish rather than being cancelled. This is safe because the capture is idempotent.

---

## Database Requirement

Capture mode requires PostgreSQL. The CLI throws `PreMatchSnapshotCaptureConfigError("requires_postgres")` and exits 1 when `PERSISTENCE_PROVIDER` is not `postgres` for a non-dry scheduled run.

The database must have the `prediction_snapshots` migration applied before the first capture run:

```bash
pnpm --filter @world-cup-2026-predictor/api db:migrate
```

---

## Expected Capture Output

A successful capture run prints:

```
Pre-match snapshot capture complete.
  provider:           postgres
  dry run:            false
  already running:    false
  discovered:         <total fixture records>
  eligible:           <fixtures in window>
  captured:           <new snapshots written>
  already captured:   <idempotent duplicates detected>
  skipped:            <ineligible records>
  failed:             0
```

A partial failure exits non-zero and lists the failed fixture IDs with sanitized issue codes.

---

## Failure Handling

| Issue code | Cause | Action |
| --- | --- | --- |
| `prediction_failed` | Predictor returned non-success for a resolvable fixture. | Check Elo pipeline; verify team names are recognized. |
| `unresolved_teams` | Home or away team name not found in the Elo pipeline. | Add team aliases or verify provider team names. |
| `persistence_failed` | Snapshot store write failed. | Check `DATABASE_URL` connectivity and table health. |
| `snapshot_identity_conflict` | Conflicting snapshot with same idempotency key and different content hash. | Investigate model version or policy mismatch. |
| `look_ahead_guard` | Final guard caught a post-kickoff `now`. | Likely a clock skew; the run should recover on the next attempt. |
| `max_fixtures_per_run_reached` | Eligible fixture count exceeded `maxFixturesPerRun` (32). | Increase `maxFixturesPerRun` in policy or investigate why many fixtures are in-window simultaneously. |

Raw provider or database error text is never surfaced in the output.

---

## Disabling the Workflow

To temporarily stop scheduled captures, disable the workflow in the GitHub Actions UI under **Actions → Pre-Match Snapshot Capture → (⋯) → Disable workflow**. The workflow can be re-enabled from the same menu.

To disable permanently, remove or comment out the `schedule` block in `.github/workflows/prematch-snapshot-capture.yml`.

---

## Rollback

Snapshots are immutable and append-only — the capture service never updates or deletes existing records. To roll back:

1. Disable the workflow (above).
2. If needed, manually delete unwanted rows from `prediction_snapshots` using the `snapshotId` printed in the capture output. This is a manual operation and should be rare.

No code rollback is required to stop captures.

---

## Security

- `DATABASE_URL` and `FOOTBALL_DATA_API_TOKEN` are stored as GitHub repository secrets and are never echoed in workflow logs.
- The CLI never prints connection strings, tokens, or any secret value.
- Database errors are sanitized before output — raw error messages from the driver are never surfaced.
- No secret uses a `NEXT_PUBLIC_` prefix.
- No browser route performs snapshot writes.
- The workflow runs with `permissions: contents: read` (least privilege).
- The historical `PREMATCH_CAPTURE_NOW` override is blocked in postgres capture mode unless `PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE=true`.

---

## Activation Verdict

| Verdict | Meaning |
| --- | --- |
| `activated_and_verified` | A real upcoming fixture was captured before kickoff and a repeated run proved idempotency (zero duplicates, same `snapshotId`). |
| `ready_to_activate` | Workflow, provider, database, preflight and dry run all pass, but no fixture is currently in the capture window. |
| `blocked` | Provider, database, or secrets prevent validation. See preflight issues. |

**Current verdict (as of Phase 12.18A2):** `ready_to_activate`

The GitHub Actions workflow, provider configuration, database connectivity, preflight, and dry-run paths are all implemented and validated. No fixture is currently in the 24h→15m capture window (the World Cup group stage is underway / has not yet supplied an upcoming scheduled fixture at the time of this phase). A real `activated_and_verified` verdict will be recorded when the first live upcoming fixture enters the capture window and a real snapshot is persisted.

> **Note on local provider:** the local static provider supplies no kickoff timestamps; local capture is a no-op by design. All capture runs in the field must use `RESULTS_PROVIDER=football_data_org`.

---

## Limitations

- Real `activated_and_verified` evidence requires a real upcoming fixture in the provider's fixture list (not a past date or test fixture).
- The capture window (24h → 15m) means the window for any single fixture lasts approximately 23h 45m. Missing it requires waiting for the next eligible fixture.
- Advisory lock mutual exclusion is per-database-connection; two processes on different hosts can run concurrently if the advisory lock is not held. The lock is always attempted before starting the capture loop.
- The `PREMATCH_CAPTURE_MAX_FIXTURES_PER_RUN` limit (32) caps how many fixtures can be captured in a single run. All eligible fixtures across all groups could be queued in one day if scheduling concentrates fixtures, but 32 is well above any realistic single-day peak.
