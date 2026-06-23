// ---------------------------------------------------------------------------
// Phase 12.18A — Prediction Usefulness Audit CLI
//
// Deterministic, read-only command that gathers stored snapshots + evaluations
// and completed World Cup 2026 results, runs the pure audit service, and writes
// a JSON artifact. This file performs I/O (fs + persistence) and is therefore
// kept OUT of `index.ts` so it never enters the web client bundle (same pattern
// as `db-migrate.ts`).
//
// Invoke: pnpm --filter @world-cup-2026-predictor/api audit:prediction-usefulness
//
// Persistence source:
//   - PERSISTENCE_PROVIDER=memory (default): reads the in-process memory stores
//     (usually empty outside a long-running server; the audit then reports
//     `insufficient_evidence`, which is the honest result).
//   - PERSISTENCE_PROVIDER=postgres: requires an explicit database URL via
//     AUDIT_DATABASE_URL, TEST_DATABASE_URL, or DATABASE_URL. The command never
//     falls back to memory silently. No URL or secret is ever printed.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolvePredictionHistoryPersistence } from "./persistence-runtime.js";
import {
  buildAuditCompletedFixtures,
  runWorldCup2026PredictionUsefulnessAudit
} from "./prediction-usefulness-audit.js";
import {
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_LOCAL_STATIC_RESULTS
} from "./world-cup-2026-teams.js";

const ARTIFACT_URL = new URL(
  "../../../docs/model-results/artifacts/world-cup-2026-prediction-usefulness-audit.json",
  import.meta.url
);

function resolveProvider(): { provider: "memory" | "postgres"; databaseUrl?: string } {
  const provider = (process.env["PERSISTENCE_PROVIDER"]?.trim() ?? "memory").toLowerCase();

  if (provider === "postgres") {
    const databaseUrl =
      process.env["AUDIT_DATABASE_URL"]?.trim() ||
      process.env["TEST_DATABASE_URL"]?.trim() ||
      process.env["DATABASE_URL"]?.trim();

    if (databaseUrl === undefined || databaseUrl === "") {
      throw new Error(
        "PERSISTENCE_PROVIDER=postgres requires AUDIT_DATABASE_URL, TEST_DATABASE_URL, or DATABASE_URL. " +
          "The audit will not fall back to memory silently."
      );
    }

    return { provider: "postgres", databaseUrl };
  }

  return { provider: "memory" };
}

async function main(): Promise<void> {
  const { provider, databaseUrl } = resolveProvider();

  const resolution = await resolvePredictionHistoryPersistence(
    provider === "postgres"
      ? { env: { PERSISTENCE_PROVIDER: "postgres", DATABASE_URL: databaseUrl } }
      : { env: { PERSISTENCE_PROVIDER: "memory" } }
  );

  const [snapshots, evaluations] = await Promise.all([
    resolution.snapshotStore.list(),
    resolution.evaluationStore.list()
  ]);

  const completedFixtures = buildAuditCompletedFixtures(
    WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
    WORLD_CUP_2026_LOCAL_STATIC_RESULTS
  );

  const report = runWorldCup2026PredictionUsefulnessAudit({
    generatedAt: new Date().toISOString(),
    completedFixtures,
    snapshots,
    evaluations
  });

  const artifactPath = fileURLToPath(ARTIFACT_URL);
  mkdirSync(fileURLToPath(new URL(".", ARTIFACT_URL)), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  // Console summary only — no secrets, no database URL.
  console.log("Prediction usefulness audit complete.");
  console.log(`  provider:             ${resolution.metadata.provider}`);
  console.log(`  completed fixtures:   ${report.dataset.completedFixtures}`);
  console.log(`  eligible predictions: ${report.dataset.eligiblePredictions}`);
  console.log(`  coverage rate:        ${report.dataset.coverageRate ?? "null"}`);
  console.log(`  outcome accuracy:     ${report.usefulness.outcomeAccuracy ?? "null"}`);
  console.log(`  exact score accuracy: ${report.usefulness.exactScorelineAccuracy ?? "null"}`);
  console.log(`  1-1 modal rate:       ${report.oneOneScoreline.modalRate ?? "null"}`);
  console.log(`  recommendation:       ${report.recommendation}`);
  console.log(`  artifact:             ${artifactPath}`);
}

main()
  .then(async () => {
    const { shutdownPredictionHistoryPersistenceForTests } = await import("./persistence-runtime.js");
    await shutdownPredictionHistoryPersistenceForTests();
  })
  .catch((error: unknown) => {
    console.error(`Prediction usefulness audit failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
