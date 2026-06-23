// ---------------------------------------------------------------------------
// Phase 12.18A1 — Automated Pre-Match Snapshot Capture CLI
//
// Manual / scheduled entry point that discovers eligible upcoming World Cup
// 2026 fixtures and persists immutable pre-match snapshots before kickoff.
// Suitable for cron / GitHub Actions / Vercel Cron.
//
// Invoke: pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
//
// This file performs I/O (persistence + network sync) and is therefore kept OUT
// of `index.ts` so it never enters the web client bundle (same pattern as
// `db-migrate.ts` and `prediction-usefulness-audit-cli.ts`). It injects the
// production `predictMatchFromLiveElo` path into the pure capture service.
//
// Supported environment:
//   PERSISTENCE_PROVIDER=postgres            (required for real persistence)
//   DATABASE_URL=...                         (required when provider=postgres)
//   PREMATCH_CAPTURE_DRY_RUN=true|false      (default false)
//   PREMATCH_CAPTURE_NOW=<ISO>               (non-production testing only)
//   PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE=true (gate for NOW in postgres mode)
//   PREMATCH_CAPTURE_FIXTURE_IDS=id1,id2     (optional allow-list)
//
// No connection string or secret is ever printed.
// ---------------------------------------------------------------------------

import postgres from "postgres";
import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import {
  createPostgresAdvisoryCaptureLock,
  runScheduledPreMatchSnapshotCapture,
  type PreMatchSnapshotCaptureLock,
  type ScheduledPreMatchSnapshotCaptureReport
} from "./prematch-snapshot-capture.js";
import { predictMatchFromLiveElo } from "./routes.js";

function parseBoolean(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

function parseFixtureIds(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return ids.length > 0 ? ids : undefined;
}

async function main(): Promise<void> {
  const provider = (process.env["PERSISTENCE_PROVIDER"]?.trim() ?? "memory").toLowerCase();
  const dryRun = parseBoolean(process.env["PREMATCH_CAPTURE_DRY_RUN"]);
  const nowOverride = process.env["PREMATCH_CAPTURE_NOW"]?.trim();
  const allowTimeOverride = parseBoolean(process.env["PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE"]);
  const fixtureIds = parseFixtureIds(process.env["PREMATCH_CAPTURE_FIXTURE_IDS"]);

  if (provider !== "memory" && provider !== "postgres") {
    console.error('PERSISTENCE_PROVIDER must be "memory" or "postgres".');
    process.exitCode = 1;
    return;
  }

  const isProductionPersistence = provider === "postgres" && !dryRun;

  if (provider === "postgres") {
    const databaseUrl = process.env["DATABASE_URL"]?.trim();
    if (databaseUrl === undefined || databaseUrl === "") {
      console.error("DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres.");
      process.exitCode = 1;
      return;
    }
  }

  // Do not allow an arbitrary historical `now` in production capture unless an
  // explicit non-production guard is set.
  if (nowOverride !== undefined && nowOverride !== "" && isProductionPersistence && !allowTimeOverride) {
    console.error(
      "PREMATCH_CAPTURE_NOW is not permitted in postgres capture mode unless PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE=true."
    );
    process.exitCode = 1;
    return;
  }

  const syncResult = await synchronizeWorldCup2026Results({});
  const providerInvalid = syncResult.status === "error" || syncResult.error !== undefined;

  // For postgres scheduled mode, guard concurrency with a PostgreSQL advisory
  // lock on a dedicated short-lived connection. Memory/dry runs use the default
  // process-local mutex.
  let advisorySql: ReturnType<typeof postgres> | undefined;
  let lock: PreMatchSnapshotCaptureLock | undefined;
  if (provider === "postgres" && !dryRun) {
    advisorySql = postgres(process.env["DATABASE_URL"]!.trim(), {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
    lock = createPostgresAdvisoryCaptureLock(advisorySql);
  }

  let report: ScheduledPreMatchSnapshotCaptureReport;
  try {
    report = await runScheduledPreMatchSnapshotCapture({
      env: { PERSISTENCE_PROVIDER: provider, ...(process.env["DATABASE_URL"] ? { DATABASE_URL: process.env["DATABASE_URL"] } : {}) },
      dryRun,
      predictor: predictMatchFromLiveElo,
      fixtureRecords: syncResult.fixtures,
      providerInvalid,
      ...(fixtureIds !== undefined ? { fixtureIds } : {}),
      ...(nowOverride !== undefined && nowOverride !== "" ? { now: nowOverride } : {}),
      ...(lock !== undefined ? { lock } : {})
    });
  } finally {
    if (advisorySql !== undefined) {
      await advisorySql.end({ timeout: 1 });
    }
  }

  console.log("Pre-match snapshot capture complete.");
  console.log(`  provider:           ${report.persistenceProvider}`);
  console.log(`  dry run:            ${report.dryRun}`);
  console.log(`  already running:    ${report.alreadyRunning}`);
  console.log(`  discovered:         ${report.discoveredFixtures}`);
  console.log(`  eligible:           ${report.eligibleFixtures}`);
  console.log(`  captured:           ${report.captured}`);
  console.log(`  already captured:   ${report.alreadyCaptured}`);
  console.log(`  skipped:            ${report.skipped}`);
  console.log(`  failed:             ${report.failed}`);

  if (report.failed > 0) {
    for (const result of report.results) {
      if (result.action === "failed") {
        console.error(`  FAILED ${result.fixtureId}: ${result.issueCode ?? "unknown_issue"}`);
      }
    }
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    const { shutdownPredictionHistoryPersistenceForTests } = await import("./persistence-runtime.js");
    await shutdownPredictionHistoryPersistenceForTests();
  })
  .catch((error: unknown) => {
    console.error(
      `Pre-match snapshot capture failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
