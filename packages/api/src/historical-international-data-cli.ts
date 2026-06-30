import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEvaluationFixtures } from "./attack-defense-goal-model-backtest.js";
import {
  loadHistoricalInternationalScoredFixtures,
  type HistoricalInternationalFixtureMode,
} from "./historical-international-fixtures.js";
import {
  validateHistoricalInternationalData,
  type HistoricalInternationalDataValidationReport,
} from "./historical-international-data-validation.js";

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function formatPct(value: number | null, decimals = 1): string {
  if (value === null) return "n/a";
  return `${(value * 100).toFixed(decimals)}%`;
}

function evaluationContext(): {
  evaluationTeamsByYear: Record<string, string[]>;
  evaluationFixtureIdsByYear: Record<string, string[]>;
} {
  const fixtures = loadEvaluationFixtures();
  const teamsByYear: Record<string, Set<string>> = {};
  const fixtureIdsByYear: Record<string, string[]> = {};

  for (const fixture of fixtures) {
    const year = String(fixture.tournamentYear);
    teamsByYear[year] ??= new Set<string>();
    teamsByYear[year].add(fixture.homeTeam);
    teamsByYear[year].add(fixture.awayTeam);
    fixtureIdsByYear[year] ??= [];
    fixtureIdsByYear[year]!.push(fixture.matchId);
  }

  const evaluationTeamsByYear: Record<string, string[]> = {};
  for (const [year, teams] of Object.entries(teamsByYear)) {
    evaluationTeamsByYear[year] = [...teams].sort();
  }

  return {
    evaluationTeamsByYear,
    evaluationFixtureIdsByYear: fixtureIdsByYear,
  };
}

function runMode(mode: HistoricalInternationalFixtureMode): HistoricalInternationalDataValidationReport {
  const context = evaluationContext();
  const fixtures = loadHistoricalInternationalScoredFixtures({ mode });
  return validateHistoricalInternationalData({
    fixtures,
    mode,
    evaluationTeamsByYear: context.evaluationTeamsByYear,
    evaluationFixtureIdsByYear: context.evaluationFixtureIdsByYear,
  });
}

function compactReport(report: HistoricalInternationalDataValidationReport): Omit<
  HistoricalInternationalDataValidationReport,
  "accepted" | "issues" | "leakageDiagnostics"
> & {
  issueSample: HistoricalInternationalDataValidationReport["issues"];
  leakageDiagnosticCount: number;
} {
  const { accepted: _accepted, issues, leakageDiagnostics, ...rest } = report;
  return {
    ...rest,
    issueSample: issues.slice(0, 10),
    leakageDiagnosticCount: leakageDiagnostics.length,
  };
}

function printReport(label: string, report: HistoricalInternationalDataValidationReport): void {
  const wc2018 = report.evaluationCoverage.wc2018;
  const wc2022 = report.evaluationCoverage.wc2022;

  log(`\n[${label}]`);
  log(`  Decision              : ${report.decision.decision}`);
  log(`  Fixtures accepted     : ${report.acceptedFixtures}/${report.totalFixtures}`);
  log(`  Date range            : ${report.earliestKickoffAt ?? "n/a"} → ${report.latestKickoffAt ?? "n/a"}`);
  log(`  Unique teams          : ${report.uniqueTeams}`);
  log(`  Neutral fixtures      : ${report.neutralFixtureCount}`);
  log(`  Duplicate fixtures    : ${report.duplicateFixtureCount}`);
  log(`  Conflicting duplicates: ${report.conflictingDuplicateCount}`);
  log(`  Unknown weight maps   : ${report.competitionWeightFallbackCount}`);
  log(`  No-look-ahead viol.   : ${report.noLookAheadViolationCount}`);
  if (wc2018 !== null) {
    log(
      `  WC2018 fallback       : ${formatPct(wc2018.fallbackTeamRate)}; median prior matches ${wc2018.medianPriorMatchCount ?? "n/a"}`
    );
  }
  if (wc2022 !== null) {
    log(
      `  WC2022 fallback       : ${formatPct(wc2022.fallbackTeamRate)}; median prior matches ${wc2022.medianPriorMatchCount ?? "n/a"}`
    );
  }
  log(`  Combined fallback     : ${formatPct(report.evaluationCoverage.combinedFallbackTeamRate)}`);
  if (report.decision.blockingReasons.length > 0) {
    log(`  Blocking reasons      : ${report.decision.blockingReasons.join(", ")}`);
  }
}

async function run(): Promise<void> {
  log("[historical-data:validate] Phase 12.21A2 — Historical International Match Data Validation");

  const before = runMode("legacy_phase_12_21a");
  const after = runMode("expanded");

  printReport("before: legacy_phase_12_21a", before);
  printReport("after: expanded", after);

  const artifactsDir = fileURLToPath(new URL("../../../docs/model-results/artifacts", import.meta.url));
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }

  const artifactPath = join(artifactsDir, "historical-international-data-coverage.json");
  const artifact = {
    schemaVersion: after.schemaVersion,
    generatedAt: after.generatedAt,
    phase: "12.21A2",
    before: compactReport(before),
    after: compactReport(after),
    sourcePolicy: {
      rawVsDerived:
        "Uses committed normalized scored fixture artifacts only. No runtime downloads, provider credentials, snapshots, or evaluations.",
      extraTimePolicy:
        "Stored World Cup scores include regulation plus extra time where applicable; penalty shootout goals are not folded into goals.",
      wc2026Policy: "WC2026 fixtures are excluded from historical profile construction and validation.",
    },
  };

  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf-8");
  log(`\n[historical-data:validate] Artifact written: ${artifactPath}`);

  const structurallyInvalid = after.decision.blockingReasons.some((reason) =>
    ["structural_data_invalid", "unresolved_evaluation_teams", "no_look_ahead_failure"].includes(reason)
  );
  if (structurallyInvalid) {
    process.exit(1);
  }
}

run().catch((err) => {
  process.stderr.write(`[historical-data:validate] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
