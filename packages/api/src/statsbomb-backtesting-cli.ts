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
import { createStatsBombOpenDataProvider } from "./providers/statsbomb/statsbomb-open-data-provider.js";
import { teamNameToId } from "./providers/statsbomb/statsbomb-team-mapping.js";
import type { TeamPerformanceProfile } from "./providers/statsbomb/statsbomb-types.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";
import {
  buildBacktestCohorts,
  computeBacktestMetrics,
  computeSignalCoverage,
  evaluateBacktestFixture
} from "./statsbomb-backtesting.js";
import type { BacktestFixture, BacktestResult } from "./statsbomb-backtesting.js";
import { makeStatsBombBacktestDecision } from "./statsbomb-backtesting-decision.js";
import { evaluateScorelineDiversity } from "./statsbomb-scoreline-diversity.js";
import { loadHistoricalScoreLookup, lookupHistoricalScore } from "./statsbomb-historical-scores.js";
import type { HistoricalScoreLookup } from "./statsbomb-historical-scores.js";

const __cliDir = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__cliDir, "../../..");

function getArg(flag: string, defaultValue: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length
    ? (process.argv[idx + 1] ?? defaultValue)
    : defaultValue;
}

const dataDir = getArg("--data-dir", join(MONOREPO_ROOT, ".local-data", "statsbomb-open-data"));
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
  cutoffAt?: string | null;
  profiles: Array<{ teamId: string; cutoffAt: string }>;
}

function loadProfilesArtifact(path: string): ProfilesArtifact | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ProfilesArtifact;
  } catch {
    return null;
  }
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
    getAvailableTeamIds: () => available,
  };
}

function buildHistoricalBacktestFixtures(
  matchHistory: EloMatchRatingHistory[],
  scoreLookup: HistoricalScoreLookup
): BacktestFixture[] {
  const fixtures: BacktestFixture[] = [];
  const seenIds = new Set<string>();

  for (const match of matchHistory) {
    if (seenIds.has(match.match_id)) continue;
    seenIds.add(match.match_id);

    if (match.result === undefined) continue;

    const matchIdUpper = match.match_id.toUpperCase();
    const isWC2022 = matchIdUpper.startsWith("2022-WC");
    const isWC2018 = matchIdUpper.startsWith("2018-WC");
    if (!isWC2022 && !isWC2018) continue;

    const outcome: BacktestFixture["actualOutcome"] =
      match.result === "home_win" ? "home_win" :
      match.result === "away_win" ? "away_win" : "draw";

    const competition = isWC2022 ? "FIFA World Cup 2022" : "FIFA World Cup 2018";

    // Stage: matches 49–64 in the WC are knockout (by sequential numbering in the ID)
    const seqNum = parseInt(match.match_id.split("-").pop() ?? "0", 10);
    const stage = seqNum > 48 ? "knockout" : "group";

    const canonHome = canonicalizeTeamName(match.home_team);
    const canonAway = canonicalizeTeamName(match.away_team);
    const matchDate = match.match_date;
    const kickoffAt = `${matchDate}T12:00:00.000Z`;

    // Populate actual scores from StatsBomb match records
    const score = lookupHistoricalScore(scoreLookup, canonHome, canonAway, matchDate);

    fixtures.push({
      matchId: match.match_id,
      kickoffAt,
      homeTeam: canonHome,
      awayTeam: canonAway,
      homeElo: match.home_rating_before,
      awayElo: match.away_rating_before,
      actualOutcome: outcome,
      actualHomeGoals: score !== null ? score.homeGoals : null,
      actualAwayGoals: score !== null ? score.awayGoals : null,
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
  console.log(`Data directory: ${dataDir}`);
  console.log(`Profiles artifact: ${profilesPath}`);
  console.log(`Summary output: ${summaryOutputPath}`);
  console.log(`R32 output: ${r32OutputPath}`);
  console.log();

  const dataDirExists = existsSync(dataDir);

  if (!dataDirExists) {
    console.error(`ERROR: StatsBomb data directory not found: ${dataDir}`);
    console.error("Run: pnpm statsbomb:download && pnpm statsbomb:build-profiles");
    const blocked = {
      status: "real_data_evaluation_blocked",
      reason: "StatsBomb data directory not found.",
      schemaVersion: "2.0.0",
      generatedAt: null,
    };
    writeFileSync(summaryOutputPath, JSON.stringify(blocked, null, 2), "utf-8");
    writeFileSync(r32OutputPath, JSON.stringify({ ...blocked, fixtures: [] }, null, 2), "utf-8");
    console.log("Wrote placeholder artifacts.");
    process.exit(1);
  }

  // 1. Load historical score lookup from StatsBomb WC2022/WC2018 match files
  const { lookup: scoreLookup, matchesLoaded, competitionsLoaded, errors: scoreErrors } =
    loadHistoricalScoreLookup(dataDir);
  console.log(`Historical score lookup: ${matchesLoaded} matches (${competitionsLoaded.join(", ")})`);
  if (scoreErrors.length > 0) {
    for (const e of scoreErrors) console.warn(`  Score lookup warning: ${e}`);
  }

  // 2. Build Elo history
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

  const { matchHistory } = processMatches(mergedMatches);

  // 3. Build historical fixtures with actual scores populated
  const historicalFixtures = buildHistoricalBacktestFixtures(matchHistory, scoreLookup);
  const scoredFixtures = historicalFixtures.filter(
    f => f.actualHomeGoals !== null && f.actualAwayGoals !== null
  );
  console.log(`Historical fixtures (WC2022+WC2018): ${historicalFixtures.length} (${scoredFixtures.length} with scores)`);

  // 4. Per-fixture profile pre-fetch via StatsBomb provider
  console.log("Creating StatsBomb Open Data provider...");
  const provider = createStatsBombOpenDataProvider(dataDir);

  const uniquePairs = new Map<string, { teamId: string; cutoffAt: string }>();
  for (const f of historicalFixtures) {
    const homeId = teamNameToId(f.homeTeam);
    const awayId = teamNameToId(f.awayTeam);
    uniquePairs.set(`${homeId}|${f.kickoffAt}`, { teamId: homeId, cutoffAt: f.kickoffAt });
    uniquePairs.set(`${awayId}|${f.kickoffAt}`, { teamId: awayId, cutoffAt: f.kickoffAt });
  }

  console.log(`Pre-fetching ${uniquePairs.size} (team, cutoff) profile pairs...`);
  const profileCache = new Map<string, TeamPerformanceProfile | null>();

  await Promise.all(
    Array.from(uniquePairs.entries()).map(async ([key, { teamId, cutoffAt }]) => {
      const result = await provider.getTeamPerformanceProfile(teamId, cutoffAt);
      // null = fallback (no data for this team at this cutoff)
      profileCache.set(key, result.profile.coverage === "fallback" ? null : result.profile);
    })
  );

  // 5. Profile diagnostics
  let profilesWithData = 0;
  let profilesFallback = 0;
  let profilesUnresolved = 0;
  for (const [, profile] of profileCache) {
    if (profile === null) {
      profilesFallback++;
    } else {
      profilesWithData++;
    }
  }
  // Count fixture-level unresolved (both home and away fallback)
  for (const f of historicalFixtures) {
    const homeId = teamNameToId(f.homeTeam);
    const awayId = teamNameToId(f.awayTeam);
    const home = profileCache.get(`${homeId}|${f.kickoffAt}`);
    const away = profileCache.get(`${awayId}|${f.kickoffAt}`);
    if (home === null && away === null) profilesUnresolved++;
  }
  const hasProviderData = profilesWithData > 0;
  console.log(`Profiles: ${profilesWithData} with data, ${profilesFallback} fallback, ${profilesUnresolved} fixtures with both teams unresolved`);

  // 6. Evaluate with per-fixture profiles
  const backtestResults: BacktestResult[] = historicalFixtures.map(f => {
    const homeId = teamNameToId(f.homeTeam);
    const awayId = teamNameToId(f.awayTeam);
    const homeProfile = profileCache.get(`${homeId}|${f.kickoffAt}`) ?? null;
    const awayProfile = profileCache.get(`${awayId}|${f.kickoffAt}`) ?? null;
    const fixtureSource = makeFixtureProfileSource(homeProfile, awayProfile, homeId, awayId);
    return evaluateBacktestFixture(f, fixtureSource);
  });

  // 7. Elo diagnostics
  const eloGaps = historicalFixtures.map(f => Math.abs(f.homeElo - f.awayElo));
  const eloGapMean = eloGaps.length > 0 ? eloGaps.reduce((a, b) => a + b, 0) / eloGaps.length : 0;
  const eloGapMin = eloGaps.length > 0 ? Math.min(...eloGaps) : 0;
  const eloGapMax = eloGaps.length > 0 ? Math.max(...eloGaps) : 0;
  const uniqueEloPairs = new Set(historicalFixtures.map(f => `${f.homeElo.toFixed(1)}|${f.awayElo.toFixed(1)}`));
  const uniqueBaselineXgPairs = new Set(
    backtestResults.map(r => `${r.baseline.homeXg.toFixed(4)}|${r.baseline.awayXg.toFixed(4)}`)
  );
  const uniqueBaselineModals = new Set(
    backtestResults.map(r => `${r.baseline.modalHomeGoals}-${r.baseline.modalAwayGoals}`)
  );
  const uniqueBaselineModalCount = uniqueBaselineModals.size;

  const baselineMetrics = computeBacktestMetrics(backtestResults, false);
  const enrichedMetrics = computeBacktestMetrics(backtestResults, true);
  const coverage = computeSignalCoverage(backtestResults);
  const diversity = evaluateScorelineDiversity(backtestResults);
  const cohorts = buildBacktestCohorts(backtestResults);

  const eloDiagnostics = {
    fixtureCount: historicalFixtures.length,
    uniqueEloPairs: uniqueEloPairs.size,
    eloGapMin: Math.round(eloGapMin * 10) / 10,
    eloGapMax: Math.round(eloGapMax * 10) / 10,
    eloGapMean: Math.round(eloGapMean * 10) / 10,
    uniqueBaselineXgPairs: uniqueBaselineXgPairs.size,
    uniqueBaselineModalCount,
    uniqueBaselineModals: Array.from(uniqueBaselineModals).sort(),
  };

  const decision = makeStatsBombBacktestDecision({
    hasRealProfiles: hasProviderData,
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
    uniqueBaselineModalCount,
    hasProviderData,
  });

  // 8. Round-of-32 uses the static artifact (2026 cutoff, passes no-look-ahead for R32 kickoffs)
  console.log("\nBuilding Round-of-32 comparison...");
  const r32ProfileArtifact = loadProfilesArtifact(profilesPath);
  const r32ProfileSource = r32ProfileArtifact !== null
    ? createArtifactTeamPerformanceProfileSource(profilesPath)
    : null;

  const ratingMap = new Map<string, number>();
  for (const entry of pipeline.rankedRatings) {
    ratingMap.set(canonicalizeTeamName(entry.team).toLowerCase(), entry.eloRating);
  }

  const FALLBACK_ELO = 1500;
  const r32Entries: R32ComparisonEntry[] = [];

  for (const fixture of WORLD_CUP_2026_ROUND_OF_32_FIXTURES) {
    const homeElo = ratingMap.get(fixture.homeTeam.toLowerCase()) ?? FALLBACK_ELO;
    const awayElo = ratingMap.get(fixture.awayTeam.toLowerCase()) ?? FALLBACK_ELO;

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

    const fallbackSource: TeamPerformanceProfileSource = {
      getProfile: () => null,
      getAvailableTeamIds: () => [],
    };

    const result = evaluateBacktestFixture(
      syntheticFixture,
      r32ProfileSource ?? fallbackSource
    );

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

  // 9. Print summary
  console.log("\n=== Backtest Summary ===");
  console.log(`Historical fixtures evaluated: ${backtestResults.length}`);
  console.log(`Signal applied: ${coverage.signalApplied} (${(coverage.signalApplicationRate * 100).toFixed(1)}%)`);
  console.log(`Scores available: ${scoredFixtures.length}/${historicalFixtures.length}`);
  console.log(`Elo diagnostics:`);
  console.log(`  Unique Elo pairs: ${eloDiagnostics.uniqueEloPairs}`);
  console.log(`  Elo gap mean/min/max: ${eloDiagnostics.eloGapMean}/${eloDiagnostics.eloGapMin}/${eloDiagnostics.eloGapMax}`);
  console.log(`  Unique baseline xG pairs: ${eloDiagnostics.uniqueBaselineXgPairs}`);
  console.log(`  Unique baseline modals: ${uniqueBaselineModalCount} → [${eloDiagnostics.uniqueBaselineModals.join(", ")}]`);
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

  // 10. Write artifacts
  const cohortSummaries = cohorts.map(c => ({
    name: c.name,
    fixtureCount: c.results.length,
    sampleSizeLabel: c.metrics.baseline.sampleSizeLabel,
    baseline: {
      brierScore: c.metrics.baseline.brierScore,
      logLoss: c.metrics.baseline.logLoss,
      outcomeAccuracy: c.metrics.baseline.outcomeAccuracy
    },
    enriched: {
      brierScore: c.metrics.enriched.brierScore,
      logLoss: c.metrics.enriched.logLoss,
      outcomeAccuracy: c.metrics.enriched.outcomeAccuracy
    },
    delta: c.metrics.delta,
  }));

  const summaryArtifact = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    status: decision.decision,
    decision: decision.decision,
    decisionReasons: decision.reasons,
    dataDirPath: dataDir,
    profilesArtifactPath: profilesPath,
    profilesCutoffAt: r32ProfileArtifact?.cutoffAt ?? r32ProfileArtifact?.generatedAt ?? null,
    historicalFixtureCount: backtestResults.length,
    scoredFixtureCount: scoredFixtures.length,
    profileDiagnostics: {
      uniqueCutoffPairs: uniquePairs.size,
      profilesWithData,
      profilesFallback,
      fixturesWithBothTeamsUnresolved: profilesUnresolved,
      hasProviderData,
    },
    eloDiagnostics,
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
    schemaVersion: "2.0.0",
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
