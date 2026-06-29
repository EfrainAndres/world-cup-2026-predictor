import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  processMatches,
  runLiveEloPipeline
} from "../../model/src/index.js";
import type { EloMatchRatingHistory } from "../../model/src/index.js";
import {
  LIVE_ELO_FOUNDATION_MATCH_COUNT,
  LIVE_ELO_FOUNDATION_MATCHES,
  loadLiveEloInternationalSupplement
} from "./live-elo-data.js";
import { mergeEloMatchSources } from "./international-elo-adapter.js";
import { WORLD_CUP_2026_ROUND_OF_32_FIXTURES } from "./world-cup-2026-teams.js";
import { canonicalizeTeamName } from "./team-aliases.js";
import { createArtifactTeamPerformanceProfileSource } from "./statsbomb-artifact-profile-source.js";
import {
  buildBacktestCohorts,
  computeBacktestMetrics,
  computeSignalCoverage,
  evaluateBacktestFixture
} from "./statsbomb-backtesting.js";
import type { BacktestFixture, BacktestResult } from "./statsbomb-backtesting.js";
import { makeStatsBombBacktestDecision } from "./statsbomb-backtesting-decision.js";
import { evaluateScorelineDiversity } from "./statsbomb-scoreline-diversity.js";

const __cliDir = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__cliDir, "../../..");

function getArg(flag: string, defaultValue: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length
    ? (process.argv[idx + 1] ?? defaultValue)
    : defaultValue;
}

const profilesPath = getArg("--profiles-path", join(
  MONOREPO_ROOT,
  "docs/model-results/artifacts/statsbomb-team-performance-profiles.json"
));
const summaryOutputPath = getArg("--output-summary", join(
  MONOREPO_ROOT,
  "docs/model-results/artifacts/statsbomb-backtesting-summary.json"
));
const r32OutputPath = getArg("--output-r32", join(
  MONOREPO_ROOT,
  "docs/model-results/artifacts/statsbomb-round-of-32-comparison.json"
));

interface ProfilesArtifact {
  generatedAt: string | null;
  profiles: Array<{ teamId: string; cutoffAt: string }>;
}

function loadProfilesArtifact(path: string): ProfilesArtifact | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as ProfilesArtifact;
    return parsed;
  } catch {
    return null;
  }
}

function isRealProfiles(artifact: ProfilesArtifact | null): boolean {
  return artifact !== null && Array.isArray(artifact.profiles) && artifact.profiles.length > 0;
}

function buildHistoricalBacktestFixtures(
  matchHistory: EloMatchRatingHistory[]
): BacktestFixture[] {
  const fixtures: BacktestFixture[] = [];
  const seenIds = new Set<string>();

  for (const match of matchHistory) {
    if (seenIds.has(match.match_id)) continue;
    seenIds.add(match.match_id);

    if (match.result === undefined) continue;

    const outcome: BacktestFixture["actualOutcome"] =
      match.result === "home_win" ? "home_win" :
      match.result === "away_win" ? "away_win" : "draw";

    const matchIdUpper = match.match_id.toUpperCase();
    const isWC2022 = matchIdUpper.startsWith("2022-WC");
    const isWC2018 = matchIdUpper.startsWith("2018-WC");
    if (!isWC2022 && !isWC2018) continue;

    const competition = isWC2022 ? "FIFA World Cup 2022" : "FIFA World Cup 2018";
    const stage = match.match_id.includes("KO") || parseInt(match.match_id.split("-").pop() ?? "0", 10) > 48
      ? "knockout"
      : "group";

    fixtures.push({
      matchId: match.match_id,
      kickoffAt: `${match.match_date}T12:00:00.000Z`,
      homeTeam: canonicalizeTeamName(match.home_team),
      awayTeam: canonicalizeTeamName(match.away_team),
      homeElo: match.home_rating_before,
      awayElo: match.away_rating_before,
      actualOutcome: outcome,
      actualHomeGoals: null,
      actualAwayGoals: null,
      isNeutralVenue: true,
      competition,
      stage,
    });
  }

  return fixtures;
}

interface R32ComparisonEntry {
  homeTeam: string;
  awayTeam: string;
  baselineHomeXg: number;
  baselineAwayXg: number;
  enrichedHomeXg: number;
  enrichedAwayXg: number;
  homeXgDelta: number;
  awayXgDelta: number;
  baselineHomeWinProb: number;
  baselineDrawProb: number;
  baselineAwayWinProb: number;
  enrichedHomeWinProb: number;
  enrichedDrawProb: number;
  enrichedAwayWinProb: number;
  baselineModalScore: string;
  enrichedModalScore: string;
  modalScoreChanged: boolean;
  signalApplied: boolean;
  signalReason: string;
  homeCoverage: string | null;
  awayCoverage: string | null;
  homeFreshness: string | null;
  awayFreshness: string | null;
  signalWeight: number;
  warnings: string[];
}

async function run(): Promise<void> {
  console.log("StatsBomb Backtesting CLI");
  console.log(`Profiles: ${profilesPath}`);
  console.log(`Summary output: ${summaryOutputPath}`);
  console.log(`R32 output: ${r32OutputPath}`);
  console.log();

  const artifact = loadProfilesArtifact(profilesPath);
  const hasRealProfiles = isRealProfiles(artifact);

  if (!hasRealProfiles) {
    console.error("ERROR: StatsBomb profiles artifact is empty or unavailable.");
    console.error("Run: pnpm statsbomb:download && pnpm statsbomb:build-profiles");

    const blocked = {
      status: "real_data_evaluation_blocked",
      reason: "StatsBomb profiles artifact is empty or unavailable.",
      schemaVersion: "1.0.0",
      generatedAt: null,
    };
    writeFileSync(summaryOutputPath, JSON.stringify(blocked, null, 2), "utf-8");
    writeFileSync(r32OutputPath, JSON.stringify({ ...blocked, fixtures: [] }, null, 2), "utf-8");
    console.log("Wrote placeholder artifacts.");
    process.exit(1);
  }

  const profileSource = createArtifactTeamPerformanceProfileSource(profilesPath);

  // Build live Elo pipeline
  console.log("Building live Elo pipeline...");
  const internationalSupplement = loadLiveEloInternationalSupplement();
  const mergedMatches = mergeEloMatchSources(LIVE_ELO_FOUNDATION_MATCHES, internationalSupplement.matches);
  const totalMatchCount = LIVE_ELO_FOUNDATION_MATCH_COUNT + internationalSupplement.metadata.matchCount;

  const pipeline = runLiveEloPipeline({
    pipelineId: "world-cup-2010-2022-international-supplement",
    matches: mergedMatches,
    dataCoverage: "partial_international_history",
  });

  console.log(`Pipeline: ${totalMatchCount} matches, ${pipeline.rankedRatings.length} teams rated.`);

  // Build historical backtest dataset from WC2022/WC2018
  // processMatches replays matches sequentially to produce per-match pre-match Elo ratings
  const { matchHistory } = processMatches(mergedMatches);
  const historicalFixtures = buildHistoricalBacktestFixtures(matchHistory);
  console.log(`Historical fixtures (WC2022+WC2018): ${historicalFixtures.length}`);

  // Run backtest
  const backtestResults: BacktestResult[] = historicalFixtures.map(f =>
    evaluateBacktestFixture(f, profileSource)
  );

  const baselineMetrics = computeBacktestMetrics(backtestResults, false);
  const enrichedMetrics = computeBacktestMetrics(backtestResults, true);
  const coverage = computeSignalCoverage(backtestResults);
  const diversity = evaluateScorelineDiversity(backtestResults);
  const cohorts = buildBacktestCohorts(backtestResults);

  const decision = makeStatsBombBacktestDecision({
    hasRealProfiles,
    fixtureCount: backtestResults.length,
    signalApplicationCount: coverage.signalApplied,
    baselineMetrics: {
      brierScore: baselineMetrics.brierScore,
      logLoss: baselineMetrics.logLoss,
      totalGoalMae: baselineMetrics.totalGoalMae,
    },
    enrichedMetrics: {
      brierScore: enrichedMetrics.brierScore,
      logLoss: enrichedMetrics.logLoss,
      totalGoalMae: enrichedMetrics.totalGoalMae,
    },
    hasLookaheadFailure: false,
    hasInvalidProfiles: false,
  });

  // Round-of-32 comparison
  console.log("\nBuilding Round-of-32 comparison...");
  const ratingMap = new Map<string, number>();
  for (const entry of pipeline.rankedRatings) {
    ratingMap.set(canonicalizeTeamName(entry.team).toLowerCase(), entry.eloRating);
  }

  const FALLBACK_ELO = 1500;
  const r32Entries: R32ComparisonEntry[] = [];

  for (const fixture of WORLD_CUP_2026_ROUND_OF_32_FIXTURES) {
    const homeKey = fixture.homeTeam.toLowerCase();
    const awayKey = fixture.awayTeam.toLowerCase();
    const homeElo = ratingMap.get(homeKey) ?? FALLBACK_ELO;
    const awayElo = ratingMap.get(awayKey) ?? FALLBACK_ELO;

    const syntheticFixture: BacktestFixture = {
      matchId: `r32-${fixture.homeTeam}-vs-${fixture.awayTeam}`.toLowerCase().replace(/\s+/g, "-"),
      kickoffAt: "2026-07-01T00:00:00.000Z",
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeElo,
      awayElo,
      actualOutcome: "draw",
      actualHomeGoals: null,
      actualAwayGoals: null,
      isNeutralVenue: true,
      competition: "FIFA World Cup 2026",
      stage: "round_of_32",
    };

    const result = evaluateBacktestFixture(syntheticFixture, profileSource);

    r32Entries.push({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      baselineHomeXg: result.baseline.homeXg,
      baselineAwayXg: result.baseline.awayXg,
      enrichedHomeXg: result.enriched.homeXg,
      enrichedAwayXg: result.enriched.awayXg,
      homeXgDelta: result.enriched.homeXg - result.baseline.homeXg,
      awayXgDelta: result.enriched.awayXg - result.baseline.awayXg,
      baselineHomeWinProb: result.baseline.homeWinProb,
      baselineDrawProb: result.baseline.drawProb,
      baselineAwayWinProb: result.baseline.awayWinProb,
      enrichedHomeWinProb: result.enriched.homeWinProb,
      enrichedDrawProb: result.enriched.drawProb,
      enrichedAwayWinProb: result.enriched.awayWinProb,
      baselineModalScore: `${result.baseline.modalHomeGoals}-${result.baseline.modalAwayGoals}`,
      enrichedModalScore: `${result.enriched.modalHomeGoals}-${result.enriched.modalAwayGoals}`,
      modalScoreChanged: result.baseline.modalHomeGoals !== result.enriched.modalHomeGoals || result.baseline.modalAwayGoals !== result.enriched.modalAwayGoals,
      signalApplied: result.signalApplied,
      signalReason: result.signalReason,
      homeCoverage: result.homeCoverage,
      awayCoverage: result.awayCoverage,
      homeFreshness: result.homeFreshness,
      awayFreshness: result.awayFreshness,
      signalWeight: result.signalWeight,
      warnings: result.warnings,
    });
  }

  const r32Applied = r32Entries.filter(e => e.signalApplied).length;
  const r32ModalChanged = r32Entries.filter(e => e.modalScoreChanged).length;
  const r32Baseline1_1 = r32Entries.filter(e => e.baselineModalScore === "1-1").length;
  const r32Enriched1_1 = r32Entries.filter(e => e.enrichedModalScore === "1-1").length;

  // Print summary
  console.log("\n=== Backtest Summary ===");
  console.log(`Historical fixtures evaluated: ${backtestResults.length}`);
  console.log(`Signal applied: ${coverage.signalApplied} (${(coverage.signalApplicationRate * 100).toFixed(1)}%)`);
  console.log(`Baseline Brier: ${baselineMetrics.brierScore?.toFixed(4) ?? "n/a"}`);
  console.log(`Enriched Brier: ${enrichedMetrics.brierScore?.toFixed(4) ?? "n/a"}`);
  console.log(`Baseline LogLoss: ${baselineMetrics.logLoss?.toFixed(4) ?? "n/a"}`);
  console.log(`Enriched LogLoss: ${enrichedMetrics.logLoss?.toFixed(4) ?? "n/a"}`);
  console.log(`Baseline modal 1-1: ${(diversity.baseline1_1Frequency * 100).toFixed(1)}%`);
  console.log(`Enriched modal 1-1: ${(diversity.enriched1_1Frequency * 100).toFixed(1)}%`);
  console.log(`Modal score changed: ${(diversity.pctModalScoreChanged * 100).toFixed(1)}%`);
  console.log(`\nDecision: ${decision.decision}`);
  for (const reason of decision.reasons) {
    console.log(`  - ${reason}`);
  }
  console.log(`\nR32: ${r32Applied}/${r32Entries.length} signal applied, ${r32ModalChanged} modal scores changed`);
  console.log(`R32 baseline 1-1: ${r32Baseline1_1}, enriched 1-1: ${r32Enriched1_1}`);

  // Write artifacts
  const cohortSummaries = cohorts.map(c => ({
    name: c.name,
    fixtureCount: c.results.length,
    sampleSizeLabel: c.metrics.baseline.sampleSizeLabel,
    baseline: { brierScore: c.metrics.baseline.brierScore, logLoss: c.metrics.baseline.logLoss, outcomeAccuracy: c.metrics.baseline.outcomeAccuracy },
    enriched: { brierScore: c.metrics.enriched.brierScore, logLoss: c.metrics.enriched.logLoss, outcomeAccuracy: c.metrics.enriched.outcomeAccuracy },
    delta: c.metrics.delta,
  }));

  const summaryArtifact = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    status: decision.decision,
    decision: decision.decision,
    decisionReasons: decision.reasons,
    profilesArtifactPath: profilesPath,
    profilesCutoff: artifact?.generatedAt ?? null,
    historicalFixtureCount: backtestResults.length,
    signalCoverage: coverage,
    baselineMetrics,
    enrichedMetrics,
    scorelineDiversity: diversity,
    cohorts: cohortSummaries,
    roundOf32Summary: {
      fixtureCount: r32Entries.length,
      signalApplied: r32Applied,
      modalScoreChanged: r32ModalChanged,
      baseline1_1Count: r32Baseline1_1,
      enriched1_1Count: r32Enriched1_1,
    },
  };

  const r32Artifact = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    status: "complete",
    fixtureCount: r32Entries.length,
    signalAppliedCount: r32Applied,
    modalScoreChangedCount: r32ModalChanged,
    baseline1_1Count: r32Baseline1_1,
    enriched1_1Count: r32Enriched1_1,
    fixtures: r32Entries,
  };

  writeFileSync(summaryOutputPath, JSON.stringify(summaryArtifact, null, 2), "utf-8");
  writeFileSync(r32OutputPath, JSON.stringify(r32Artifact, null, 2), "utf-8");

  console.log(`\nArtifacts written:`);
  console.log(`  ${summaryOutputPath}`);
  console.log(`  ${r32OutputPath}`);
}

run().catch((e: unknown) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
