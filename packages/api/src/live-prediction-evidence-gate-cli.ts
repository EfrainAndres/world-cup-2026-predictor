// ---------------------------------------------------------------------------
// Phase 12.18C1 — Live Prediction Evidence & Recalibration Gate CLI
//
// Reads persisted prediction snapshots and completed evaluations from the
// configured persistence provider, runs the pure gate service, and either
// prints a human-readable summary to stdout or writes a JSON artifact.
//
// Invoke:
//   pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
//
// Environment variables:
//   LIVE_EVIDENCE_MODE       "summary" (default) | "write_artifact"
//   PERSISTENCE_PROVIDER     "postgres" (required for a full run) | "memory" (preflight only)
//   DATABASE_URL             Required when PERSISTENCE_PROVIDER=postgres.
//   LIVE_EVIDENCE_OUTPUT_PATH (write_artifact only) — overrides the default artifact path.
//
// Default artifact path:
//   docs/model-results/artifacts/world-cup-2026-live-prediction-evidence-gate.json
//
// SECURITY:
//   - DATABASE_URL and all secrets are never printed.
//   - Non-zero exit on unsafe configuration (postgres required in write_artifact mode).
//   - No silent fallback from postgres to memory: the CLI exits with code 1 if
//     PERSISTENCE_PROVIDER=postgres but DATABASE_URL is absent.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  PredictionHistoryPersistenceConfigError,
  resolvePredictionHistoryPersistence,
  shutdownPredictionHistoryPersistenceForTests
} from "./persistence-runtime.js";
import { runLiveEvidenceGate } from "./live-prediction-evidence-gate.js";
import type { LiveEvidenceGateReport } from "./live-prediction-evidence-gate.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CliMode = "summary" | "write_artifact";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

function resolveMode(): CliMode | null {
  const raw = (process.env["LIVE_EVIDENCE_MODE"] ?? "summary").trim().toLowerCase();
  if (raw === "summary" || raw === "write_artifact") return raw;
  return null;
}

function resolveProvider(): { provider: string; databaseUrl: string | undefined } {
  const provider = (process.env["PERSISTENCE_PROVIDER"] ?? "memory").trim().toLowerCase();
  const databaseUrl = process.env["DATABASE_URL"]?.trim() || undefined;
  return { provider, databaseUrl };
}

function resolveOutputPath(): string {
  return (
    process.env["LIVE_EVIDENCE_OUTPUT_PATH"]?.trim() ||
    "docs/model-results/artifacts/world-cup-2026-live-prediction-evidence-gate.json"
  );
}

// ---------------------------------------------------------------------------
// Summary printer
// ---------------------------------------------------------------------------

function printSummary(report: LiveEvidenceGateReport): void {
  const c = report.evidenceCounts;
  const dq = report.dataQualityAssessment;
  const cm = report.coreMetrics;
  const sc = report.scorelineConcentration;
  const dc = report.drawCalibration;

  console.log("=".repeat(72));
  console.log("  Live Prediction Evidence & Recalibration Gate");
  console.log(`  Generated: ${report.generatedAt}`);
  console.log(`  Persistence: ${report.persistenceMetadata.provider} (persistent=${report.persistenceMetadata.persistent})`);
  console.log("=".repeat(72));

  console.log("\n--- Evidence Counts ---");
  console.log(`  Total snapshots:           ${c.totalSnapshots}`);
  console.log(`  Unique fixtures:           ${c.uniqueFixtures}`);
  console.log(`  Evaluated fixtures:        ${c.uniqueEvaluatedFixtures}`);
  console.log(`  Pending fixtures:          ${c.pendingSnapshots}`);
  console.log(`  Multi-snapshot fixtures:   ${c.fixturesWithMultipleSnapshots}`);
  console.log(`  Excluded from primary:     ${c.totalExcludedFromPrimary}`);

  console.log("\n--- Selection Policy ---");
  console.log(`  Policy: ${report.selectionPolicySummary.policy}`);
  console.log(`  pre_match_locked selected:        ${report.selectionPolicySummary.preMatchLockedSelected}`);
  console.log(`  foundation_unverified selected:   ${report.selectionPolicySummary.foundationUnverifiedSelected}`);

  console.log("\n--- Core Metrics (evaluated primary snapshots only) ---");
  console.log(`  Outcome accuracy:          ${fmt(cm.outcomeAccuracy)}`);
  console.log(`  Exact scoreline accuracy:  ${fmt(cm.exactScorelineAccuracy)}`);
  console.log(`  Average Brier score:       ${fmt(cm.averageBrierScore)}`);
  console.log(`  Average log loss:          ${fmt(cm.averageLogLoss)}`);
  console.log(`  Avg home goal error:       ${fmt(cm.averageHomeGoalError)}`);
  console.log(`  Avg away goal error:       ${fmt(cm.averageAwayGoalError)}`);
  console.log(`  Avg predicted goals/game:  ${fmt(cm.averagePredictedGoals)}`);
  console.log(`  Avg actual goals/game:     ${fmt(cm.averageActualGoals)}`);
  console.log(`  Avg predicted xG diff:     ${fmt(cm.averagePredictedGoalDifference)}`);
  console.log(`  Avg actual goal diff:      ${fmt(cm.averageActualGoalDifference)}`);

  console.log("\n--- Scoreline Concentration ---");
  console.log(`  Modal scoreline:           ${sc.modalScoreline ?? "n/a"} (rate: ${fmt(sc.modalScorelineRate)})`);
  console.log(`  1-1 rate:                  ${fmt(sc.oneOneRate)}`);
  console.log(`  Top-2 combined rate:       ${fmt(sc.topTwoScorelinesRate)}`);
  console.log(`  Unique modal scorelines:   ${sc.uniqueModalScorelines}`);
  console.log(`  Draw modal proportion:     ${fmt(sc.modalDrawProportion)}`);
  console.log(`  Compression flag:          ${sc.compressedModalSelectionFlag}`);

  console.log("\n--- Draw Calibration ---");
  console.log(`  Avg predicted draw prob:   ${fmt(dc.averagePredictedDrawProbability)}`);
  console.log(`  Actual draw rate:          ${fmt(dc.actualDrawRate)}`);
  console.log(`  Calibration gap:           ${fmt(dc.predictedDrawCalibrationGap)}`);
  console.log(`  Draw false-positive rate:  ${fmt(dc.drawFalsePositiveRate)}`);
  console.log(`  Draw false-negative rate:  ${fmt(dc.drawFalseNegativeRate)}`);
  console.log(`  Sample below minimum:      ${dc.sampleBelowMinimum}`);

  console.log("\n--- xG Compression ---");
  console.log(`  Avg |xG diff|:             ${fmt(report.xgCompression.averageAbsoluteXgDifference)}`);
  console.log(`  Share below 0.25:          ${fmt(report.xgCompression.shareBelow025)}`);
  console.log(`  Strong-fav low-xG count:   ${report.xgCompression.strongFavoriteLowXgCount}`);
  console.log(`  Compression flag:          ${report.xgCompression.xgCompressionFlag}`);

  console.log("\n--- Favorite Separation ---");
  const fs = report.favoriteSeparation;
  for (const b of fs.buckets) {
    if (b.count === 0) continue;
    console.log(
      `  [${b.strength.padEnd(20)}] n=${b.count}  outcome=${fmt(b.outcomeAccuracy)}  favoriteWin=${fmt(b.actualFavoriteWinRate)}  avgXgAdv=${fmt(b.averagePredictedXgDifferenceForFavorite)}`
    );
  }
  console.log(`  Under-separation flag:     ${fs.underSeparationFlag}`);

  console.log("\n--- Data Quality ---");
  console.log(`  Readiness vote:            ${dq.readinessVote}`);
  console.log(`  pre_match_locked share:    ${fmt(dq.proportionPreMatchLocked)}`);
  console.log(`  Fallback coverage share:   ${fmt(dq.proportionFallbackCoverage)}`);
  console.log(`  Distinct groups:           ${dq.distinctGroupsRepresented}`);
  console.log(`  Distinct matchdays:        ${dq.distinctMatchdaysRepresented}`);
  console.log(`  Duplicate evaluations:     ${dq.duplicateLogicalEvaluations}`);
  if (dq.issues.length > 0) {
    for (const issue of dq.issues) {
      console.log(`  [!] ${issue}`);
    }
  }

  if (report.findings.length > 0) {
    console.log("\n--- Findings ---");
    for (const f of report.findings) {
      const icon = f.severity === "critical" ? "[CRIT]" : f.severity === "warning" ? "[WARN]" : "[INFO]";
      console.log(`  ${icon} [${f.code}] ${f.summary}`);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(`  DECISION: ${report.decision.toUpperCase()}`);
  console.log("=".repeat(72));
  for (const reason of report.decisionReasons) {
    console.log(`  - ${reason}`);
  }
  if (report.blockedReasons.length > 0) {
    console.log("\n  Blocked reasons:");
    for (const r of report.blockedReasons) {
      console.log(`    ! ${r}`);
    }
  }
  console.log(`\n  Next: ${report.nextRecommendedPhase}`);
  console.log("=".repeat(72));
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "null";
  return String(value);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const mode = resolveMode();
  if (mode === null) {
    console.error('LIVE_EVIDENCE_MODE must be "summary" or "write_artifact".');
    process.exitCode = 1;
    return;
  }

  const { provider, databaseUrl } = resolveProvider();

  if (provider !== "memory" && provider !== "postgres") {
    console.error('PERSISTENCE_PROVIDER must be "memory" or "postgres".');
    process.exitCode = 1;
    return;
  }

  // write_artifact mode requires postgres: no silent fallback.
  if (mode === "write_artifact" && provider !== "postgres") {
    console.error(
      'write_artifact mode requires PERSISTENCE_PROVIDER=postgres. ' +
        'Use LIVE_EVIDENCE_MODE=summary to preview with in-memory data.'
    );
    process.exitCode = 1;
    return;
  }

  if (provider === "postgres" && !databaseUrl) {
    console.error("DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres.");
    process.exitCode = 1;
    return;
  }

  const env: Record<string, string | undefined> = {
    PERSISTENCE_PROVIDER: provider,
    ...(databaseUrl !== undefined ? { DATABASE_URL: databaseUrl } : {})
  };

  const resolution = await resolvePredictionHistoryPersistence({ env });

  const [snapshots, evaluations] = await Promise.all([
    resolution.snapshotStore.list({ limit: 5000 }),
    resolution.evaluationStore.list({ limit: 5000 })
  ]);

  const report = runLiveEvidenceGate({
    generatedAt: new Date().toISOString(),
    persistenceMetadata: resolution.metadata,
    snapshots,
    evaluations
  });

  if (mode === "summary") {
    printSummary(report);
    return;
  }

  // write_artifact
  const outputPath = resolveOutputPath();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Live prediction evidence gate artifact written to: ${outputPath}`);
  console.log(`Decision: ${report.decision}`);
  console.log(`Evaluated fixtures: ${report.evidenceCounts.uniqueEvaluatedFixtures}`);
}

main()
  .then(async () => {
    await shutdownPredictionHistoryPersistenceForTests();
  })
  .catch(async (error: unknown) => {
    await shutdownPredictionHistoryPersistenceForTests();
    if (error instanceof PredictionHistoryPersistenceConfigError) {
      console.error(`Live evidence gate configuration failed: ${error.message}`);
    } else {
      console.error("Live evidence gate failed with a sanitized operational error.");
    }
    process.exitCode = 1;
  });
