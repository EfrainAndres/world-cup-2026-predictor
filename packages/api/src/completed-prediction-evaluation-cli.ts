// ---------------------------------------------------------------------------
// Phase 12.18B9 — Automatic Completed-Prediction Evaluation CLI
//
// Manual / scheduled entry point that synchronizes official World Cup 2026
// results and evaluates stored immutable pre-match snapshots when their
// fixtures have completed.
//
// Invoke: pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions
//
// Execution modes (COMPLETED_EVALUATION_MODE):
//   preflight  — validates persistence/provider readiness and scans eligibility; no writes.
//   dry_run    — identifies eligible evaluations; no writes.
//   evaluate   — persists immutable evaluations (default).
//
// evaluate mode requires PERSISTENCE_PROVIDER=postgres and never falls back to
// memory. No connection string, token, request header, or raw provider payload
// is ever printed.
// ---------------------------------------------------------------------------

import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import {
  AutomaticCompletedPredictionEvaluationConfigError,
  runScheduledCompletedPredictionEvaluation
} from "./automatic-completed-prediction-evaluation.js";
import { shutdownPredictionHistoryPersistenceForTests } from "./persistence-runtime.js";

type CliMode = "preflight" | "dry_run" | "evaluate";

function modeFromEnv(): CliMode | undefined {
  const mode = (process.env["COMPLETED_EVALUATION_MODE"] ?? "evaluate").trim().toLowerCase();
  if (mode === "preflight" || mode === "dry_run" || mode === "evaluate") return mode;
  return undefined;
}

function requiredEnvConfigured(name: string): boolean {
  return (process.env[name]?.trim() ?? "") !== "";
}

function printReport(prefix: string, report: Awaited<ReturnType<typeof runScheduledCompletedPredictionEvaluation>>): void {
  console.log(prefix);
  console.log(`  provider:             ${report.persistenceProvider}`);
  console.log(`  dry run:              ${report.dryRun}`);
  console.log(`  already running:      ${report.alreadyRunning}`);
  console.log(`  completed results:    ${report.completedResultCount}`);
  console.log(`  snapshots scanned:    ${report.summary.snapshotsScanned}`);
  console.log(`  eligible:             ${report.summary.eligible}`);
  console.log(`  evaluated:            ${report.summary.evaluated}`);
  console.log(`  already evaluated:    ${report.summary.alreadyEvaluated}`);
  console.log(`  pending result:       ${report.summary.pendingResult}`);
  console.log(`  unresolved fixture:   ${report.summary.unresolvedFixture}`);
  console.log(`  invalid result:       ${report.summary.invalidResult}`);
  console.log(`  ineligible snapshot:  ${report.summary.ineligibleSnapshot}`);
  console.log(`  conflicts:            ${report.summary.conflicts}`);
  console.log(`  failures:             ${report.summary.failures}`);
}

async function main(): Promise<void> {
  const mode = modeFromEnv();
  if (mode === undefined) {
    console.error('COMPLETED_EVALUATION_MODE must be "preflight", "dry_run", or "evaluate".');
    process.exitCode = 1;
    return;
  }

  const provider = (process.env["PERSISTENCE_PROVIDER"]?.trim() ?? "memory").toLowerCase();
  if (provider !== "memory" && provider !== "postgres") {
    console.error('PERSISTENCE_PROVIDER must be "memory" or "postgres".');
    process.exitCode = 1;
    return;
  }

  if (mode !== "dry_run" && provider !== "postgres") {
    console.error("PostgreSQL persistence is required for preflight and evaluate modes.");
    process.exitCode = 1;
    return;
  }

  if (provider === "postgres" && !requiredEnvConfigured("DATABASE_URL")) {
    console.error("DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres.");
    process.exitCode = 1;
    return;
  }

  if (mode === "preflight") {
    const providerConfigured =
      process.env["RESULTS_PROVIDER"]?.trim() === "football_data_org" &&
      requiredEnvConfigured("FOOTBALL_DATA_API_TOKEN");
    if (!providerConfigured) {
      console.error("RESULTS_PROVIDER=football_data_org and FOOTBALL_DATA_API_TOKEN are required for preflight.");
      process.exitCode = 1;
      return;
    }
  }

  const syncResult = await synchronizeWorldCup2026Results({});

  if (mode === "preflight" && (syncResult.status !== "success" || syncResult.localFallbackUsed)) {
    console.error("Live result synchronization preflight failed or returned local fallback data.");
    process.exitCode = 1;
    return;
  }

  if (mode === "evaluate" && (syncResult.status !== "success" || syncResult.localFallbackUsed)) {
    console.error("Live result synchronization did not return active external provider data; evaluation was not run.");
    process.exitCode = 1;
    return;
  }

  const report = await runScheduledCompletedPredictionEvaluation({
    env: {
      PERSISTENCE_PROVIDER: provider,
      ...(process.env["DATABASE_URL"] ? { DATABASE_URL: process.env["DATABASE_URL"] } : {})
    },
    syncResult,
    dryRun: mode !== "evaluate"
  });

  printReport(
    mode === "preflight"
      ? "Completed-prediction evaluation preflight complete."
      : "Completed-prediction evaluation complete.",
    report
  );

  if (report.status === "partial_failure") {
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    await shutdownPredictionHistoryPersistenceForTests();
  })
  .catch(async (error: unknown) => {
    await shutdownPredictionHistoryPersistenceForTests();
    if (error instanceof AutomaticCompletedPredictionEvaluationConfigError) {
      console.error(`Completed-prediction evaluation configuration failed: ${error.message}`);
    } else {
      console.error("Completed-prediction evaluation failed with a sanitized operational error.");
    }
    process.exitCode = 1;
  });
