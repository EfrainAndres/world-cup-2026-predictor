import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AttackDefenseProfileStrategy, AttackDefenseRecencyStrategy } from "../../model/src/index.js";
import {
  runAttackDefenseGoalModelBacktest,
} from "./attack-defense-goal-model-backtest.js";
import { evaluateGoalModelDecision } from "./attack-defense-goal-model-decision.js";

function log(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function formatPct(value: number | null, decimals = 2): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatNum(value: number | null, decimals = 4): string {
  if (value === null) return "—";
  return value.toFixed(decimals);
}

function header(title: string): void {
  log(`\n${"─".repeat(70)}`);
  log(`  ${title}`);
  log("─".repeat(70));
}

async function run(): Promise<void> {
  const profileStrategy: AttackDefenseProfileStrategy = "goals_strength_of_schedule_adjusted";
  const recencyStrategy: AttackDefenseRecencyStrategy = "exponential_half_life";

  log("[goal-model:compare] Phase 12.21A — Attack/Defense Goal Model Comparison");
  log(`  Profile strategy : ${profileStrategy}`);
  log(`  Recency strategy : ${recencyStrategy}`);
  log("  Running backtest...");

  const result = runAttackDefenseGoalModelBacktest({
    profileStrategy,
    recencyStrategy,
  });

  const decision = evaluateGoalModelDecision(result);

  // ── Console output ──────────────────────────────────────────────────────────

  header("Evaluation summary");
  log(`  Fixtures evaluated : ${result.fixtureCount}`);
  log(`  Evaluation years   : ${result.evaluationYears.join(", ")}`);
  log(`  Model version      : ${result.modelVersion}`);

  header("Profile coverage");
  const cov = result.profileCoverageSummary;
  log(`  Profile strategy  : ${cov.profileStrategy}`);
  log(`  Recency strategy  : ${cov.recencyStrategy}`);
  log(`  Competition env   : n=${cov.competitionEnvSampleSize}`);
  log(`  Full coverage     : ${cov.coverageCounts.full} teams (${formatPct(cov.fullCoverageRate)})`);
  log(`  Partial coverage  : ${cov.coverageCounts.partial} teams`);
  log(`  Sparse coverage   : ${cov.coverageCounts.sparse} teams`);
  log(`  Fallback          : ${cov.coverageCounts.fallback} teams (${formatPct(cov.fallbackRate)})`);
  log(`  No-look-ahead viol: ${cov.totalNoLookAheadViolations}`);

  header("Candidate metrics");
  const colW = 32;
  const header2 = [
    "Candidate".padEnd(colW),
    "Brier".padStart(8),
    "LogLoss".padStart(9),
    "OutAcc".padStart(8),
    "GoalMAE".padStart(9),
    "UniqueXG".padStart(9),
    "Modal1-1".padStart(9),
  ].join(" ");
  log(`  ${header2}`);

  for (const m of result.candidateMetrics) {
    const row = [
      m.candidateId.padEnd(colW),
      formatNum(m.brierScore).padStart(8),
      formatNum(m.logLoss).padStart(9),
      formatPct(m.outcomeAccuracy).padStart(8),
      formatNum(m.totalGoalMae).padStart(9),
      String(m.uniqueXgPairCount).padStart(9),
      formatPct(m.modalOneOneFrequency).padStart(9),
    ].join(" ");
    log(`  ${row}`);
  }

  header("Scoreline diversity (modal frequencies)");
  const divHeader = [
    "Candidate".padEnd(colW),
    "1-0".padStart(7),
    "2-0".padStart(7),
    "2-1".padStart(7),
    "3-0".padStart(7),
    "3-1".padStart(7),
  ].join(" ");
  log(`  ${divHeader}`);
  for (const m of result.candidateMetrics) {
    const row = [
      m.candidateId.padEnd(colW),
      formatPct(m.recommended10Frequency).padStart(7),
      formatPct(m.recommended20Frequency).padStart(7),
      formatPct(m.recommended21Frequency).padStart(7),
      formatPct(m.recommended30Frequency).padStart(7),
      formatPct(m.recommended31Frequency).padStart(7),
    ].join(" ");
    log(`  ${row}`);
  }

  header("xG diagnostics");
  for (const d of result.xgDiagnostics) {
    log(`\n  [${d.candidateId}]`);
    log(`    Home xG  p10/p50/p90: ${formatNum(d.p10HomeXg, 2)} / ${formatNum(d.p50HomeXg, 2)} / ${formatNum(d.p90HomeXg, 2)}`);
    log(`    Away xG  p10/p50/p90: ${formatNum(d.p10AwayXg, 2)} / ${formatNum(d.p50AwayXg, 2)} / ${formatNum(d.p90AwayXg, 2)}`);
    log(`    Avg total xG        : ${formatNum(d.avgTotalXg, 3)}`);
    log(`    Home xG > 1.5/2.0/2.5: ${d.countHomeXgAbove15} / ${d.countHomeXgAbove20} / ${d.countHomeXgAbove25}`);
    log(`    Home xG < 0.5/0.8   : ${d.countHomeXgBelow05} / ${d.countHomeXgBelow08}`);
    if (d.extremeFixtures.length > 0) {
      log(`    Extreme fixtures    :`);
      for (const ef of d.extremeFixtures.slice(0, 5)) {
        log(`      ${ef}`);
      }
    }
  }

  header("Decision");
  log(`  Decision         : ${decision.decision}`);
  log(`  Selected         : ${decision.selectedCandidateId ?? "none"}`);
  if (decision.brierDelta !== null) log(`  Brier delta      : ${decision.brierDelta > 0 ? "+" : ""}${decision.brierDelta.toFixed(5)}`);
  if (decision.logLossDelta !== null) log(`  Log Loss delta   : ${decision.logLossDelta > 0 ? "+" : ""}${decision.logLossDelta.toFixed(5)}`);
  if (decision.reasons.length > 0) {
    log("  Reasons:");
    for (const r of decision.reasons) log(`    - ${r}`);
  }
  if (decision.blockers.length > 0) {
    log("  Blockers:");
    for (const b of decision.blockers) log(`    ! ${b}`);
  }

  // ── Write artifacts ─────────────────────────────────────────────────────────

  // Resolve relative to this file's location so artifacts always land in the
  // project root's docs/model-results/artifacts/ regardless of cwd.
  const artifactsDir = fileURLToPath(new URL("../../../docs/model-results/artifacts", import.meta.url));
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }

  const comparisonPath = join(artifactsDir, "attack-defense-goal-model-comparison.json");
  const profilesPath = join(artifactsDir, "attack-defense-team-profiles.json");

  const comparisonArtifact = {
    schemaVersion: result.schemaVersion,
    generatedAt: result.generatedAt,
    modelVersion: result.modelVersion,
    evaluationYears: result.evaluationYears,
    fixtureCount: result.fixtureCount,
    profileCoverageSummary: result.profileCoverageSummary,
    candidateMetrics: result.candidateMetrics,
    xgDiagnostics: result.xgDiagnostics,
    decision: {
      decision: decision.decision,
      selectedCandidateId: decision.selectedCandidateId,
      brierDelta: decision.brierDelta,
      logLossDelta: decision.logLossDelta,
      totalGoalMaeDelta: decision.totalGoalMaeDelta,
      reasons: decision.reasons,
      blockers: decision.blockers,
    },
  };

  writeFileSync(comparisonPath, JSON.stringify(comparisonArtifact, null, 2), "utf-8");
  log(`\n[goal-model:compare] Artifact written: ${comparisonPath}`);

  // Team profiles artifact (compact: no raw event data)
  const profilesArtifact = {
    generatedAt: result.generatedAt,
    profileStrategy,
    recencyStrategy,
    coverageSummary: result.profileCoverageSummary.coverageCounts,
    note: "Team profiles computed from available historical scored match data before cutoff. See coverage summary for data quality.",
  };

  writeFileSync(profilesPath, JSON.stringify(profilesArtifact, null, 2), "utf-8");
  log(`[goal-model:compare] Artifact written: ${profilesPath}`);

  log(`\n[goal-model:compare] Complete. Decision: ${decision.decision}\n`);

  if (decision.decision === "data_quality_blocked" || decision.decision === "insufficient_profile_coverage") {
    process.exit(0); // Non-error: expected given limited historical data
  }
}

run().catch((err) => {
  process.stderr.write(`[goal-model:compare] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
