import { pathToFileURL } from "node:url";
import { predictMatchFromLiveElo } from "../packages/api/src/routes.ts";
import { createAttackDefenseProductionDependencies } from "../packages/api/src/attack-defense-server-composition.ts";
import { createProductionPredictionDependencies } from "../packages/api/src/statsbomb-server-composition.ts";
import { embeddedAttackDefenseSelectedCandidateArtifact } from "../apps/web/src/lib/attack-defense-embedded-artifact.server.ts";
import { collectAttackDefenseRuntimeEligibilityDiagnostic } from "../packages/api/src/scripts/list-attack-defense-runtime-eligibility.ts";

interface DistributionStats {
  artifact: {
    candidateId: string;
    fingerprint: string;
    fingerprintShort: string;
    profileCount: number;
    sourceFixtureCount: number;
    schemaVersion: string;
    cutoffAt: string;
  };
  eligiblePairCount: number;
  applicationRates: {
    adAppliedCount: number;
    adAppliedRate: number;
    sbAppliedCount: number;
    sbAppliedRate: number;
  };
  xgStats: {
    maxHomeXg: number;
    maxAwayXg: number;
    avgHomeXg: number;
    avgAwayXg: number;
    balancedMatchCount: number;
    balancedMatchRate: number;
  };
  scorelineFrequency: Array<{ score: string; count: number; rate: number }>;
  resultDistribution: {
    homeWinRate: number;
    drawRate: number;
    awayWinRate: number;
  };
  outcomeProbabilityAverages: {
    avgHomeWinPct: number;
    avgDrawPct: number;
    avgAwayWinPct: number;
  };
}

function log(msg = ""): void {
  process.stdout.write(msg + "\n");
}

function isCliEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}

function buildProductionDeps() {
  const adDeps = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
    selectedCandidateArtifact: embeddedAttackDefenseSelectedCandidateArtifact,
  });
  const sbDeps = createProductionPredictionDependencies({
    env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "on" },
  });
  return { ...sbDeps, ...adDeps };
}

function formatMarkdown(stats: DistributionStats): string {
  const lines: string[] = [
    "# Prediction Distribution Report",
    "",
    "## Artifact",
    `- Candidate ID: ${stats.artifact.candidateId}`,
    `- Fingerprint: ${stats.artifact.fingerprint}`,
    `- Profiles: ${stats.artifact.profileCount}`,
    `- Source fixtures: ${stats.artifact.sourceFixtureCount}`,
    `- Schema version: ${stats.artifact.schemaVersion}`,
    `- Cutoff: ${stats.artifact.cutoffAt}`,
    "",
    `## Coverage`,
    `Eligible pairs: ${stats.eligiblePairCount}`,
    "",
    "## Application Rates",
    `- AD applied: ${stats.applicationRates.adAppliedCount}/${stats.eligiblePairCount} (${(stats.applicationRates.adAppliedRate * 100).toFixed(1)}%)`,
    `- SB applied: ${stats.applicationRates.sbAppliedCount}/${stats.eligiblePairCount} (${(stats.applicationRates.sbAppliedRate * 100).toFixed(1)}%)`,
    "",
    "## xG Statistics",
    `- Max home xG: ${stats.xgStats.maxHomeXg.toFixed(4)}`,
    `- Max away xG: ${stats.xgStats.maxAwayXg.toFixed(4)}`,
    `- Avg home xG: ${stats.xgStats.avgHomeXg.toFixed(4)}`,
    `- Avg away xG: ${stats.xgStats.avgAwayXg.toFixed(4)}`,
    `- Balanced matches (|home-away| ≤ 0.5): ${stats.xgStats.balancedMatchCount} (${(stats.xgStats.balancedMatchRate * 100).toFixed(1)}%)`,
    "",
    "## Result Distribution (recommended score outcome)",
    `- Home win: ${(stats.resultDistribution.homeWinRate * 100).toFixed(1)}%`,
    `- Draw: ${(stats.resultDistribution.drawRate * 100).toFixed(1)}%`,
    `- Away win: ${(stats.resultDistribution.awayWinRate * 100).toFixed(1)}%`,
    "",
    "## Outcome Probability Averages",
    `- Avg home win probability: ${stats.outcomeProbabilityAverages.avgHomeWinPct.toFixed(2)}%`,
    `- Avg draw probability: ${stats.outcomeProbabilityAverages.avgDrawPct.toFixed(2)}%`,
    `- Avg away win probability: ${stats.outcomeProbabilityAverages.avgAwayWinPct.toFixed(2)}%`,
    "",
    "## Top Scorelines (by recommended frequency)",
    "| Scoreline | Count | Rate |",
    "| --- | --- | --- |",
    ...stats.scorelineFrequency.slice(0, 15).map(
      (s) => `| ${s.score} | ${s.count} | ${(s.rate * 100).toFixed(1)}% |`
    ),
  ];
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const format = args.includes("--format") ? args[args.indexOf("--format") + 1] : "json";

  const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();
  const deps = buildProductionDeps();
  const pairs = diagnostic.eligiblePairs;

  log(`[prediction:distribution-report] Running ${pairs.length} eligible matchups...`);

  let adAppliedCount = 0;
  let sbAppliedCount = 0;
  let maxHomeXg = 0;
  let maxAwayXg = 0;
  let totalHomeXg = 0;
  let totalAwayXg = 0;
  let balancedCount = 0;
  let homeWinCount = 0;
  let drawCount = 0;
  let awayWinCount = 0;
  let totalHomeWinPct = 0;
  let totalDrawPct = 0;
  let totalAwayWinPct = 0;

  const scorelineCounts = new Map<string, number>();

  for (const pair of pairs) {
    const result = predictMatchFromLiveElo(
      { homeTeam: pair.homeTeam, awayTeam: pair.awayTeam },
      deps
    );
    if (result.status !== "success") continue;

    if (result.attackDefenseGoalModel?.applied === true) adAppliedCount++;
    if (result.statsBombSignal?.applied === true) sbAppliedCount++;

    const homeXg = result.expectedGoals.home;
    const awayXg = result.expectedGoals.away;
    if (homeXg > maxHomeXg) maxHomeXg = homeXg;
    if (awayXg > maxAwayXg) maxAwayXg = awayXg;
    totalHomeXg += homeXg;
    totalAwayXg += awayXg;

    if (Math.abs(homeXg - awayXg) <= 0.5) balancedCount++;

    totalHomeWinPct += result.outcomeProbabilities.homeWinProbability * 100;
    totalDrawPct += result.outcomeProbabilities.drawProbability * 100;
    totalAwayWinPct += result.outcomeProbabilities.awayWinProbability * 100;

    const recommended = result.scorelinePresentation?.recommendedScore ?? result.mostLikelyScorelines[0];
    if (recommended !== undefined) {
      const scoreKey = `${recommended.homeGoals}-${recommended.awayGoals}`;
      scorelineCounts.set(scoreKey, (scorelineCounts.get(scoreKey) ?? 0) + 1);

      const outcome = recommended.outcome;
      if (outcome === "home_win") homeWinCount++;
      else if (outcome === "draw") drawCount++;
      else awayWinCount++;
    }
  }

  const total = pairs.length;
  const scorelineFrequency = [...scorelineCounts.entries()]
    .map(([score, count]) => ({ score, count, rate: count / total }))
    .sort((a, b) => b.count - a.count);

  const stats: DistributionStats = {
    artifact: {
      candidateId: diagnostic.artifact.candidateId,
      fingerprint: diagnostic.artifact.fingerprint,
      fingerprintShort: diagnostic.artifact.fingerprintShort,
      profileCount: diagnostic.artifact.profileCount,
      sourceFixtureCount: diagnostic.artifact.sourceFixtureCount,
      schemaVersion: diagnostic.artifact.schemaVersion,
      cutoffAt: diagnostic.artifact.cutoffAt,
    },
    eligiblePairCount: total,
    applicationRates: {
      adAppliedCount,
      adAppliedRate: total > 0 ? adAppliedCount / total : 0,
      sbAppliedCount,
      sbAppliedRate: total > 0 ? sbAppliedCount / total : 0,
    },
    xgStats: {
      maxHomeXg,
      maxAwayXg,
      avgHomeXg: total > 0 ? totalHomeXg / total : 0,
      avgAwayXg: total > 0 ? totalAwayXg / total : 0,
      balancedMatchCount: balancedCount,
      balancedMatchRate: total > 0 ? balancedCount / total : 0,
    },
    scorelineFrequency,
    resultDistribution: {
      homeWinRate: total > 0 ? homeWinCount / total : 0,
      drawRate: total > 0 ? drawCount / total : 0,
      awayWinRate: total > 0 ? awayWinCount / total : 0,
    },
    outcomeProbabilityAverages: {
      avgHomeWinPct: total > 0 ? totalHomeWinPct / total : 0,
      avgDrawPct: total > 0 ? totalDrawPct / total : 0,
      avgAwayWinPct: total > 0 ? totalAwayWinPct / total : 0,
    },
  };

  log(`[prediction:distribution-report] Complete.`);

  if (format === "markdown") {
    log(formatMarkdown(stats));
  } else {
    log(JSON.stringify(stats, null, 2));
  }
}

if (isCliEntrypoint()) {
  main().catch((error) => {
    process.stderr.write(`[prediction:distribution-report] Fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
