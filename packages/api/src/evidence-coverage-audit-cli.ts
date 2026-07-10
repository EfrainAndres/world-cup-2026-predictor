import {
  PredictionHistoryPersistenceConfigError,
  resolvePredictionHistoryPersistence,
  shutdownPredictionHistoryPersistenceForTests
} from "./persistence-runtime.js";
import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import { buildEvidenceCoverageAudit } from "./evidence-coverage-audit.js";
import type { EvidenceCoverageAuditReport } from "./evidence-coverage-audit.js";

function providerIsPostgres(): boolean {
  return (process.env["PERSISTENCE_PROVIDER"] ?? "").trim().toLowerCase() === "postgres";
}

function hasDatabaseUrl(): boolean {
  return (process.env["DATABASE_URL"] ?? "").trim() !== "";
}

function printFixtureList(title: string, rows: readonly { fixtureId: string; homeTeam: string; awayTeam: string }[]): void {
  console.log(`\n--- ${title} (${rows.length}) ---`);
  if (rows.length === 0) {
    console.log("  none");
    return;
  }
  for (const row of rows) {
    console.log(`  ${row.fixtureId}: ${row.homeTeam} vs ${row.awayTeam}`);
  }
}

function printReport(report: EvidenceCoverageAuditReport, resultSource: string, resultWarning: string | null): void {
  const c = report.counts;
  console.log("=".repeat(72));
  console.log("  Evidence Coverage Audit");
  console.log(`  Generated: ${report.generatedAt}`);
  console.log(`  Result source: ${resultSource}`);
  if (resultWarning !== null) console.log(`  Result warning: ${resultWarning}`);
  console.log("=".repeat(72));

  console.log("\n--- Counts ---");
  console.log(`  Completed group fixtures:                  ${c.completedGroupFixtures}`);
  console.log(`  Total snapshots:                           ${c.totalSnapshots}`);
  console.log(`  Total evaluations:                         ${c.totalEvaluations}`);
  console.log(`  Fixtures with any snapshot:                ${c.fixturesWithAnySnapshot}`);
  console.log(`  Fixtures with valid primary snapshot:      ${c.fixturesWithValidPrimarySnapshot}`);
  console.log(`  Fixtures with persisted evaluation:        ${c.fixturesWithPersistedEvaluation}`);
  console.log(`  Unique evaluated fixtures:                 ${c.uniqueEvaluatedFixtures}`);
  console.log(`  Duplicate snapshot fixtures:               ${c.duplicateSnapshotFixtures}`);
  console.log(`  Duplicate evaluation fixtures:             ${c.duplicateEvaluationFixtures}`);
  console.log(`  Duplicate evaluation snapshots:            ${c.duplicateEvaluationSnapshots}`);
  console.log(`  Completed fixtures without any snapshot:   ${c.completedFixturesWithoutAnySnapshot}`);
  console.log(`  Completed fixtures without valid snapshot: ${c.completedFixturesWithoutValidPrimarySnapshot}`);
  console.log(`  Completed fixtures snapshot/no evaluation: ${c.completedFixturesWithSnapshotButNoEvaluation}`);
  console.log(`  Excluded snapshots:                        ${c.excludedSnapshots}`);

  printFixtureList("Completed fixtures without any snapshot", report.completedFixturesWithoutAnySnapshot);
  printFixtureList("Completed fixtures without valid primary snapshot", report.completedFixturesWithoutValidPrimarySnapshot);
  printFixtureList(
    "Completed fixtures with selected snapshot but no evaluation",
    report.completedFixturesWithSnapshotButNoEvaluation.map((entry) => entry.fixture)
  );

  console.log(`\n--- Duplicate Snapshot Fixtures (${report.duplicateSnapshotFixtures.length}) ---`);
  for (const entry of report.duplicateSnapshotFixtures) {
    console.log(`  ${entry.fixture.fixtureId}: ${entry.fixture.homeTeam} vs ${entry.fixture.awayTeam}`);
    for (const snapshot of entry.snapshots) {
      console.log(`    snapshot=${snapshot.snapshotId} status=${snapshot.status} capturedAt=${snapshot.capturedAt}`);
    }
  }
  if (report.duplicateSnapshotFixtures.length === 0) console.log("  none");

  console.log(`\n--- Duplicate Evaluation Fixtures (${report.duplicateEvaluationFixtures.length}) ---`);
  for (const entry of report.duplicateEvaluationFixtures) {
    console.log(`  ${entry.fixture.fixtureId}: ${entry.fixture.homeTeam} vs ${entry.fixture.awayTeam}`);
    for (const evaluation of entry.evaluations) {
      console.log(`    evaluation=${evaluation.evaluationId} snapshot=${evaluation.snapshotId} evaluatedAt=${evaluation.evaluatedAt}`);
    }
  }
  if (report.duplicateEvaluationFixtures.length === 0) console.log("  none");

  console.log(`\n--- Excluded Snapshots (${report.excludedSnapshots.length}) ---`);
  for (const snapshot of report.excludedSnapshots) {
    console.log(
      `  ${snapshot.fixtureId}: snapshot=${snapshot.snapshotId} status=${snapshot.status} reason=${snapshot.reason ?? "unknown"} capturedAt=${snapshot.capturedAt}`
    );
  }
  if (report.excludedSnapshots.length === 0) console.log("  none");
}

async function main(): Promise<void> {
  if (!providerIsPostgres()) {
    console.error("PERSISTENCE_PROVIDER=postgres is required for evidence coverage audits.");
    process.exitCode = 1;
    return;
  }
  if (!hasDatabaseUrl()) {
    console.error("DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres.");
    process.exitCode = 1;
    return;
  }

  const persistence = await resolvePredictionHistoryPersistence({
    env: {
      PERSISTENCE_PROVIDER: "postgres",
      DATABASE_URL: process.env["DATABASE_URL"]
    }
  });

  const [snapshots, evaluations, syncResult] = await Promise.all([
    persistence.snapshotStore.list({ limit: 5000 }),
    persistence.evaluationStore.list({ limit: 5000 }),
    synchronizeWorldCup2026Results({})
  ]);

  const report = buildEvidenceCoverageAudit({
    generatedAt: new Date().toISOString(),
    snapshots,
    evaluations,
    completedResults: syncResult.status === "success" ? syncResult.completedResults : []
  });

  const resultWarning =
    syncResult.status !== "success"
      ? "result synchronization failed; completed fixture gaps may be undercounted"
      : syncResult.localFallbackUsed
        ? "local fallback results were used; production completed fixture gaps may be undercounted"
        : null;

  printReport(report, syncResult.status === "success" ? syncResult.activeProvider : "sync_failed", resultWarning);
}

main()
  .then(async () => {
    await shutdownPredictionHistoryPersistenceForTests();
  })
  .catch(async (error: unknown) => {
    await shutdownPredictionHistoryPersistenceForTests();
    if (error instanceof PredictionHistoryPersistenceConfigError) {
      console.error(`Evidence coverage audit configuration failed: ${error.message}`);
    } else {
      console.error("Evidence coverage audit failed with a sanitized operational error.");
    }
    process.exitCode = 1;
  });
