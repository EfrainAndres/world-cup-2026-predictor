import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeBacktestMetrics, computeSignalCoverage, evaluateBacktestFixture } from "./statsbomb-backtesting.js";
import type { BacktestMetricDelta, BacktestMetrics, BacktestResult } from "./statsbomb-backtesting.js";
import { makeStatsBombBacktestDecision } from "./statsbomb-backtesting-decision.js";
import { evaluateScorelineDiversity } from "./statsbomb-scoreline-diversity.js";
import { loadHistoricalScoreLookup } from "./statsbomb-historical-scores.js";
import { createStatsBombOpenDataProvider } from "./providers/statsbomb/statsbomb-open-data-provider.js";
import { teamNameToId } from "./providers/statsbomb/statsbomb-team-mapping.js";
import type { TeamPerformanceProfile } from "./providers/statsbomb/statsbomb-types.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";
import {
  buildHistoricalEloReplayComparison,
  HISTORICAL_ELO_REPLAY_STRATEGIES
} from "./historical-elo-replay.js";
import type {
  HistoricalEloReplayComparison,
  HistoricalEloReplayStrategy,
  HistoricalEloReplayStrategyResult
} from "./historical-elo-replay.js";
import { makeHistoricalEloDataQualityDecision } from "./historical-elo-data-quality-decision.js";
import type { HistoricalEloDataQualityDecisionResult } from "./historical-elo-data-quality-decision.js";
import { summarizeHistoricalEloReplayDiagnostics } from "./historical-elo-replay-diagnostics.js";

const __cliDir = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__cliDir, "../../..");

function getArg(flag: string, defaultValue: string): string {
  const index = process.argv.indexOf(flag);
  return index !== -1 && index + 1 < process.argv.length
    ? (process.argv[index + 1] ?? defaultValue)
    : defaultValue;
}

const dataDir = getArg("--data-dir", join(MONOREPO_ROOT, ".local-data", "statsbomb-open-data"));
const comparisonOutputPath = getArg("--output-comparison", join(
  MONOREPO_ROOT,
  "docs/model-results/artifacts/historical-elo-replay-comparison.json"
));
const statsBombOutputPath = getArg("--output-statsbomb", join(
  MONOREPO_ROOT,
  "docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json"
));

function ensureParentDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function roundOrNull(value: number | null, decimals = 6): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function metricDelta(baseline: BacktestMetrics, enriched: BacktestMetrics): BacktestMetricDelta {
  return {
    brierScore: baseline.brierScore !== null && enriched.brierScore !== null
      ? roundOrNull(enriched.brierScore - baseline.brierScore)
      : null,
    logLoss: baseline.logLoss !== null && enriched.logLoss !== null
      ? roundOrNull(enriched.logLoss - baseline.logLoss)
      : null,
    outcomeAccuracy: baseline.outcomeAccuracy !== null && enriched.outcomeAccuracy !== null
      ? roundOrNull(enriched.outcomeAccuracy - baseline.outcomeAccuracy)
      : null,
    exactScoreAccuracy: baseline.exactScoreAccuracy !== null && enriched.exactScoreAccuracy !== null
      ? roundOrNull(enriched.exactScoreAccuracy - baseline.exactScoreAccuracy)
      : null,
    homeGoalMae: baseline.homeGoalMae !== null && enriched.homeGoalMae !== null
      ? roundOrNull(enriched.homeGoalMae - baseline.homeGoalMae)
      : null,
    awayGoalMae: baseline.awayGoalMae !== null && enriched.awayGoalMae !== null
      ? roundOrNull(enriched.awayGoalMae - baseline.awayGoalMae)
      : null,
    totalGoalMae: baseline.totalGoalMae !== null && enriched.totalGoalMae !== null
      ? roundOrNull(enriched.totalGoalMae - baseline.totalGoalMae)
      : null
  };
}

function makeFixtureProfileSource(
  homeProfile: TeamPerformanceProfile | null,
  awayProfile: TeamPerformanceProfile | null,
  homeTeamId: string,
  awayTeamId: string
): TeamPerformanceProfileSource {
  const available: string[] = [];
  if (homeProfile !== null) available.push(homeTeamId);
  if (awayProfile !== null) available.push(awayTeamId);

  return {
    getProfile: (teamId: string): TeamPerformanceProfile | null => {
      if (teamId === homeTeamId) return homeProfile;
      if (teamId === awayTeamId) return awayProfile;
      return null;
    },
    getAvailableTeamIds: () => available
  };
}

function shouldRunStatsBombForStrategy(
  strategy: HistoricalEloReplayStrategy,
  decision: HistoricalEloDataQualityDecisionResult
): boolean {
  const summary = decision.strategies.find((entry) => entry.strategy === strategy);
  return summary?.ready === true && (
    strategy === "expanded_international_basic" ||
    strategy === "expanded_international_weighted"
  );
}

function buildCompactComparisonArtifact(
  comparison: HistoricalEloReplayComparison,
  dataQualityDecision: HistoricalEloDataQualityDecisionResult
) {
  return {
    schemaVersion: comparison.schemaVersion,
    generatedAt: comparison.generatedAt,
    strategies: comparison.strategies.map((strategy) => ({
      strategy: strategy.strategy,
      dataset: strategy.dataset,
      diagnostics: strategy.diagnostics,
      baselineMetrics: strategy.baselineMetrics,
      fixtures: strategy.fixtures.map((fixture) => ({
        matchId: fixture.matchId,
        kickoffAt: fixture.kickoffAt,
        sourceDataset: fixture.sourceDataset,
        competition: fixture.competition,
        season: fixture.season,
        stage: fixture.stage,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        isNeutralVenue: fixture.isNeutralVenue,
        competitionWeight: fixture.competitionWeight,
        preMatchHomeElo: fixture.homeElo,
        preMatchAwayElo: fixture.awayElo,
        eloGap: fixture.eloGap,
        actualOutcome: fixture.actualOutcome,
        actualHomeGoals: fixture.actualHomeGoals,
        actualAwayGoals: fixture.actualAwayGoals
      })),
      exclusions: strategy.exclusions
    })),
    diagnosticSummary: summarizeHistoricalEloReplayDiagnostics(comparison),
    dataQualityDecision
  };
}

async function runStatsBombBacktestForStrategy(
  strategyResult: HistoricalEloReplayStrategyResult
): Promise<{
  strategy: HistoricalEloReplayStrategy;
  fixtureCount: number;
  profileDiagnostics: {
    uniqueCutoffPairs: number;
    profilesWithData: number;
    profilesFallback: number;
    fixturesWithBothTeamsUnresolved: number;
    hasProviderData: boolean;
  };
  signalCoverage: ReturnType<typeof computeSignalCoverage>;
  baselineMetrics: BacktestMetrics;
  enrichedMetrics: BacktestMetrics;
  metricDelta: BacktestMetricDelta;
  scorelineDiversity: ReturnType<typeof evaluateScorelineDiversity>;
  statsBombDecision: ReturnType<typeof makeStatsBombBacktestDecision>;
}> {
  const provider = createStatsBombOpenDataProvider(dataDir);
  const uniquePairs = new Map<string, { teamId: string; cutoffAt: string }>();

  for (const fixture of strategyResult.fixtures) {
    const homeId = teamNameToId(fixture.homeTeam);
    const awayId = teamNameToId(fixture.awayTeam);
    uniquePairs.set(`${homeId}|${fixture.kickoffAt}`, { teamId: homeId, cutoffAt: fixture.kickoffAt });
    uniquePairs.set(`${awayId}|${fixture.kickoffAt}`, { teamId: awayId, cutoffAt: fixture.kickoffAt });
  }

  const profileCache = new Map<string, TeamPerformanceProfile | null>();
  await Promise.all(
    Array.from(uniquePairs.entries()).map(async ([key, { teamId, cutoffAt }]) => {
      const result = await provider.getTeamPerformanceProfile(teamId, cutoffAt);
      profileCache.set(key, result.profile.coverage === "fallback" ? null : result.profile);
    })
  );

  let profilesWithData = 0;
  let profilesFallback = 0;
  for (const profile of profileCache.values()) {
    if (profile === null) {
      profilesFallback++;
    } else {
      profilesWithData++;
    }
  }

  let fixturesWithBothTeamsUnresolved = 0;
  const results: BacktestResult[] = strategyResult.fixtures.map((fixture) => {
    const homeId = teamNameToId(fixture.homeTeam);
    const awayId = teamNameToId(fixture.awayTeam);
    const homeProfile = profileCache.get(`${homeId}|${fixture.kickoffAt}`) ?? null;
    const awayProfile = profileCache.get(`${awayId}|${fixture.kickoffAt}`) ?? null;
    if (homeProfile === null && awayProfile === null) fixturesWithBothTeamsUnresolved++;
    return evaluateBacktestFixture(
      fixture,
      makeFixtureProfileSource(homeProfile, awayProfile, homeId, awayId)
    );
  });

  const baselineMetrics = computeBacktestMetrics(results, false);
  const enrichedMetrics = computeBacktestMetrics(results, true);
  const signalCoverage = computeSignalCoverage(results);
  const scorelineDiversity = evaluateScorelineDiversity(results);
  const hasProviderData = profilesWithData > 0;
  const decision = makeStatsBombBacktestDecision({
    hasRealProfiles: hasProviderData,
    fixtureCount: results.length,
    signalApplicationCount: signalCoverage.signalApplied,
    baselineMetrics: {
      brierScore: baselineMetrics.brierScore,
      logLoss: baselineMetrics.logLoss,
      totalGoalMae: baselineMetrics.totalGoalMae
    },
    enrichedMetrics: {
      brierScore: enrichedMetrics.brierScore,
      logLoss: enrichedMetrics.logLoss,
      totalGoalMae: enrichedMetrics.totalGoalMae
    },
    hasLookaheadFailure: false,
    hasInvalidProfiles: false,
    uniqueBaselineModalCount: scorelineDiversity.baselineUniqueModalScorelineCount,
    hasProviderData
  });

  return {
    strategy: strategyResult.strategy,
    fixtureCount: results.length,
    profileDiagnostics: {
      uniqueCutoffPairs: uniquePairs.size,
      profilesWithData,
      profilesFallback,
      fixturesWithBothTeamsUnresolved,
      hasProviderData
    },
    signalCoverage,
    baselineMetrics,
    enrichedMetrics,
    metricDelta: metricDelta(baselineMetrics, enrichedMetrics),
    scorelineDiversity,
    statsBombDecision: decision
  };
}

async function run(): Promise<void> {
  console.log("Historical Elo Replay Validation");
  console.log(`StatsBomb data directory: ${dataDir}`);
  console.log(`Comparison output: ${comparisonOutputPath}`);
  console.log(`StatsBomb output: ${statsBombOutputPath}`);
  console.log();

  const scoreLookup = existsSync(dataDir) ? loadHistoricalScoreLookup(dataDir).lookup : undefined;
  const comparison: HistoricalEloReplayComparison = buildHistoricalEloReplayComparison({
    strategies: HISTORICAL_ELO_REPLAY_STRATEGIES,
    ...(scoreLookup === undefined ? {} : { scoreLookup })
  });
  const dataQualityDecision = makeHistoricalEloDataQualityDecision(comparison);

  ensureParentDir(comparisonOutputPath);
  writeFileSync(
    comparisonOutputPath,
    JSON.stringify(buildCompactComparisonArtifact(comparison, dataQualityDecision), null, 2),
    "utf-8"
  );

  for (const summary of summarizeHistoricalEloReplayDiagnostics(comparison)) {
    const oneOne = summary.modalOneOneFrequency === null
      ? "n/a"
      : `${(summary.modalOneOneFrequency * 100).toFixed(1)}%`;
    console.log(
      `${summary.strategy}: fixtures=${summary.acceptedFixtureCount}, ` +
      `eloPairs=${summary.uniquePreMatchEloPairCount}, xgPairs=${summary.uniqueBaselineXgPairCount}, ` +
      `modals=${summary.uniqueModalScorelineCount}, 1-1=${oneOne}, ` +
      `>167=${summary.fixturesAbove167PointGap}`
    );
  }

  console.log(`\nData-quality decision: ${dataQualityDecision.decision}`);
  for (const reason of dataQualityDecision.reasons) console.log(`  - ${reason}`);

  const runnableStrategies = comparison.strategies.filter((strategy) =>
    shouldRunStatsBombForStrategy(strategy.strategy, dataQualityDecision)
  );

  ensureParentDir(statsBombOutputPath);
  if (runnableStrategies.length === 0) {
    writeFileSync(statsBombOutputPath, JSON.stringify({
      schemaVersion: "1.0.0",
      generatedAt: comparison.generatedAt,
      status: "data_quality_blocked",
      reason: "No historical Elo replay strategy produced sufficient rating and scoreline diversity.",
      dataQualityDecision
    }, null, 2), "utf-8");
    console.log("\nStatsBomb expanded backtest skipped: data-quality gate did not pass.");
    console.log(`Artifacts written:\n  ${comparisonOutputPath}\n  ${statsBombOutputPath}`);
    return;
  }

  if (!existsSync(dataDir)) {
    writeFileSync(statsBombOutputPath, JSON.stringify({
      schemaVersion: "1.0.0",
      generatedAt: comparison.generatedAt,
      status: "real_data_evaluation_blocked",
      reason: "StatsBomb Open Data directory was not available for per-fixture historical profiles.",
      dataQualityDecision
    }, null, 2), "utf-8");
    console.log("\nStatsBomb expanded backtest skipped: StatsBomb data directory unavailable.");
    console.log(`Artifacts written:\n  ${comparisonOutputPath}\n  ${statsBombOutputPath}`);
    return;
  }

  const statsBombStrategies = [];
  for (const strategy of runnableStrategies) {
    console.log(`\nRunning fixture-specific StatsBomb backtest for ${strategy.strategy}...`);
    const result = await runStatsBombBacktestForStrategy(strategy);
    statsBombStrategies.push(result);
    console.log(
      `${strategy.strategy}: signal=${result.signalCoverage.signalApplied}/${result.fixtureCount}, ` +
      `baseline1-1=${(result.scorelineDiversity.baseline1_1Frequency * 100).toFixed(1)}%, ` +
      `enriched1-1=${(result.scorelineDiversity.enriched1_1Frequency * 100).toFixed(1)}%, ` +
      `decision=${result.statsBombDecision.decision}`
    );
  }

  writeFileSync(statsBombOutputPath, JSON.stringify({
    schemaVersion: "1.0.0",
    generatedAt: comparison.generatedAt,
    status: "complete",
    dataQualityDecision,
    strategies: statsBombStrategies
  }, null, 2), "utf-8");

  console.log(`\nArtifacts written:\n  ${comparisonOutputPath}\n  ${statsBombOutputPath}`);
}

run().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
