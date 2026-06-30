import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { runAttackDefenseGoalModelRecalibration } from "./attack-defense-goal-model-recalibration.js";
import type { RecalibrationMetrics } from "./attack-defense-goal-model-recalibration.js";

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function formatNumber(value: number | null, decimals = 4): string {
  if (value === null) return "n/a";
  return value.toFixed(decimals);
}

function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return "n/a";
  return `${(value * 100).toFixed(decimals)}%`;
}

function metricLine(label: string, metrics: RecalibrationMetrics | null): string {
  if (metrics === null) return `  ${label}: none`;
  return [
    `  ${label}:`,
    `Brier ${formatNumber(metrics.brierScore)}`,
    `LogLoss ${formatNumber(metrics.logLoss)}`,
    `GoalMAE ${formatNumber(metrics.totalGoalMae)}`,
    `UniqueXG ${metrics.uniqueXgPairCount}`,
    `Modal ${metrics.uniqueModalScorelineCount}`,
    `1-1 ${formatPercent(metrics.modalOneOneFrequency)}`,
  ].join(" ");
}

async function run(): Promise<void> {
  log("[goal-model:recalibrate] Phase 12.21A3 — Attack/Defense Goal Model Recalibration");
  const result = runAttackDefenseGoalModelRecalibration();

  log(`  Tuning year       : ${result.tuningYear}`);
  log(`  Validation year   : ${result.validationYear}`);
  log(`  Grid size         : ${result.parameterGridSize}`);
  log(`  Selected config   : ${result.selectedConfig?.id ?? "none"}`);
  log(`  Decision          : ${result.decision.decision}`);
  log(metricLine("Tuning baseline   ", result.tuning.baseline));
  log(metricLine("Tuning selected   ", result.tuning.selected));
  log(metricLine("Validation baseline", result.validation.baseline));
  log(metricLine("Validation selected", result.validation.selected));
  if (result.decision.blockers.length > 0) {
    log("  Blockers:");
    for (const blocker of result.decision.blockers) {
      log(`    - ${blocker}`);
    }
  }

  const artifactsDir = fileURLToPath(new URL("../../../docs/model-results/artifacts", import.meta.url));
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }

  const comparisonPath = join(artifactsDir, "attack-defense-recalibration-comparison.json");
  const selectedPath = join(artifactsDir, "attack-defense-recalibration-selected-candidate.json");
  writeFileSync(comparisonPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  writeFileSync(
    selectedPath,
    `${JSON.stringify(
      {
        schemaVersion: result.schemaVersion,
        generatedAt: result.generatedAt,
        selectedConfig: result.selectedConfig,
        tuning: result.tuning.selected,
        validation: result.validation.selected,
        combined: result.combined.selected,
        decision: result.decision,
        productionCompatibility:
          "Offline-only experimental result. No production Elo V2, Poisson, StatsBomb, snapshot, evaluation, persistence, standings, qualification, route, or topology behavior changed.",
      },
      null,
      2
    )}\n`,
    "utf-8"
  );
  log(`[goal-model:recalibrate] Artifact written: ${comparisonPath}`);
  log(`[goal-model:recalibrate] Artifact written: ${selectedPath}`);
  log(`[goal-model:recalibrate] Complete. Decision: ${result.decision.decision}`);
}

run().catch((error) => {
  process.stderr.write(`[goal-model:recalibrate] Fatal error: ${String(error)}\n`);
  process.exit(1);
});
