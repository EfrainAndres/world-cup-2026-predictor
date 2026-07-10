// ---------------------------------------------------------------------------
// Phase 12.18A1 / 12.18A2 — Automated Pre-Match Snapshot Capture CLI
//
// Manual / scheduled entry point that discovers eligible upcoming World Cup
// 2026 fixtures and persists immutable pre-match snapshots before kickoff.
// Suitable for cron / GitHub Actions / Vercel Cron.
//
// Invoke: pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
//
// Execution modes (PREMATCH_CAPTURE_MODE):
//   preflight  — validates configuration and connectivity; no predictions, no writes.
//   dry_run    — discovers and evaluates real fixtures; no persistence writes.
//   capture    — performs the protected capture flow (default).
//
// capture mode requires PERSISTENCE_PROVIDER=postgres. It never falls back to memory.
// preflight mode requires PERSISTENCE_PROVIDER=postgres, DATABASE_URL,
//   RESULTS_PROVIDER=football_data_org, and FOOTBALL_DATA_API_TOKEN.
//
// This file performs I/O (persistence + network sync) and is therefore kept OUT
// of `index.ts` so it never enters the web client bundle (same pattern as
// `db-migrate.ts` and `prediction-usefulness-audit-cli.ts`). It injects the
// production `predictMatchFromLiveElo` path into the pure capture service.
//
// Supported environment:
//   PREMATCH_CAPTURE_MODE=preflight|dry_run|capture  (default: capture)
//   PERSISTENCE_PROVIDER=postgres                    (required for capture/preflight)
//   DATABASE_URL=...                                 (required when provider=postgres)
//   RESULTS_PROVIDER=football_data_org               (required for preflight)
//   FOOTBALL_DATA_API_TOKEN=...                      (required for preflight)
//   PREMATCH_CAPTURE_DRY_RUN=true|false              (default false; overridden by dry_run mode)
//   PREMATCH_CAPTURE_NOW=<ISO>                       (non-production testing only)
//   PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE=true        (gate for NOW in postgres mode)
//   PREMATCH_CAPTURE_FIXTURE_IDS=id1,id2             (optional allow-list)
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
import {
  runPreMatchCaptureActivationPreflight,
  type DatabaseConnectivityResult
} from "./prematch-capture-preflight.js";
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

async function checkDatabaseConnectivity(databaseUrl: string): Promise<DatabaseConnectivityResult> {
  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5, idle_timeout: 5, prepare: false });
  try {
    await sql`SELECT 1`;
    return { connected: true };
  } catch {
    // Never expose the connection URL in the error message.
    return { connected: false, error: "connection_failed" };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function runPreflightMode(): Promise<void> {
  const result = await runPreMatchCaptureActivationPreflight({
    checkDatabaseConnectivity,
    synchronize: (input) => synchronizeWorldCup2026Results(input)
  });

  console.log("Pre-match capture preflight complete.");
  console.log(`  status:                          ${result.status}`);
  console.log(`  persistence_provider_configured: ${result.checks.persistenceProviderConfigured}`);
  console.log(`  database_url_configured:         ${result.checks.databaseUrlConfigured}`);
  console.log(`  provider_configured:             ${result.checks.providerConfigured}`);
  console.log(`  database_connectivity:           ${result.checks.databaseConnectivity}`);
  console.log(`  provider_connectivity:           ${result.checks.providerConnectivity}`);
  console.log(`  fixtures_have_kickoff:           ${result.checks.fixturesHaveKickoff}`);
  console.log(`  capture_window_evaluable:        ${result.checks.captureWindowEvaluable}`);

  if (result.providerReadiness !== undefined) {
    const pr = result.providerReadiness;
    console.log(`  total_fixtures:                  ${pr.totalFixtures}`);
    console.log(`  fixtures_with_kickoff:           ${pr.fixturesWithKickoff}`);
    console.log(`  upcoming_fixtures:               ${pr.upcomingFixtures}`);
    console.log(`  unresolved_teams:                ${pr.unresolvedTeams}`);
    console.log(`  invalid_fixtures:                ${pr.invalidFixtures}`);
    console.log(`  in_current_capture_window:       ${pr.fixturesInCurrentCaptureWindow}`);
  }

  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.error(`  ISSUE: ${issue}`);
    }
  }

  const isBlocked = result.status.startsWith("blocked_");
  if (isBlocked) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const captureMode = (process.env["PREMATCH_CAPTURE_MODE"] ?? "capture").trim().toLowerCase();

  if (captureMode === "preflight") {
    await runPreflightMode();
    return;
  }

  const provider = (process.env["PERSISTENCE_PROVIDER"]?.trim() ?? "memory").toLowerCase();
  // dry_run mode overrides PREMATCH_CAPTURE_DRY_RUN
  const dryRun = captureMode === "dry_run" || parseBoolean(process.env["PREMATCH_CAPTURE_DRY_RUN"]);
  const nowOverride = process.env["PREMATCH_CAPTURE_NOW"]?.trim();
  const allowTimeOverride = parseBoolean(process.env["PREMATCH_CAPTURE_ALLOW_TIME_OVERRIDE"]);
  const fixtureIds = parseFixtureIds(process.env["PREMATCH_CAPTURE_FIXTURE_IDS"]);

  if (captureMode !== "dry_run" && captureMode !== "capture") {
    console.error('PREMATCH_CAPTURE_MODE must be "preflight", "dry_run", or "capture".');
    process.exitCode = 1;
    return;
  }

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

  const skippedByReason = Object.entries(report.skippedByReason).sort(([a], [b]) => a.localeCompare(b));
  if (skippedByReason.length > 0) {
    console.log("  skipped_by_reason:");
    for (const [reason, count] of skippedByReason) {
      console.log(`    ${reason}: ${count}`);
    }
  }

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
