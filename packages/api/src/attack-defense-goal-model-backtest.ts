import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ATTACK_DEFENSE_GOAL_MODEL_VERSION,
  GOAL_MODEL_CANDIDATE_IDS,
  aggregateOutcomeProbabilities,
  buildNeutralAttackDefenseProfile,
  computeAttackDefenseGoalModel,
  generateScoreMatrix,
  getMostLikelyScorelines,
} from "../../model/src/index.js";
import type {
  AttackDefenseGoalModelCandidateId,
  AttackDefenseProfileCoverage,
  AttackDefenseProfileStrategy,
  AttackDefenseRecencyStrategy,
  CompetitionGoalEnvironment,
  TeamAttackDefenseProfile,
} from "../../model/src/index.js";

import { canonicalizeTeamName } from "./team-aliases.js";
import {
  buildCompetitionGoalEnvironment,
  buildProfilesForEvaluationSet,
} from "./attack-defense-profile-builder.js";
import type { HistoricalMatchRecord } from "./attack-defense-profile-builder.js";
import {
  DEFAULT_ELO_CONFIG,
  processMatches,
} from "../../model/src/index.js";
import type { EloMatch } from "../../model/src/index.js";
import { loadHistoricalInternationalScoredFixtures } from "./historical-international-fixtures.js";
import type { HistoricalInternationalScoredFixture } from "./historical-international-fixtures.js";

const LOG_EPSILON = 1e-15;
const MAX_GOALS = 7;

export const ATTACK_DEFENSE_BACKTEST_SCHEMA_VERSION = "1.0.0";
export const BACKTEST_EVALUATION_YEARS: readonly number[] = [2018, 2022];
export const BACKTEST_WC2026_EXCLUDED_PATTERN = /^2026-/;

// ── Goal metric thresholds ────────────────────────────────────────────────────

export const BACKTEST_PROMOTION_MAX_BRIER_REGRESSION = 0.005;
export const BACKTEST_PROMOTION_MAX_LOG_LOSS_REGRESSION = 0.008;
export const BACKTEST_PROMOTION_MAX_GOAL_MAE_REGRESSION = 0.05;
export const BACKTEST_MIN_PROFILE_COVERAGE_RATE = 0.5;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GoalModelEvalFixture {
  matchId: string;
  kickoffDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  actualOutcome: "home_win" | "draw" | "away_win";
  competition: string;
  stage: string;
  neutralSite: boolean;
  tournamentYear: number;
  profileCutoffDate: string;
}

export interface CandidateFixtureResult {
  matchId: string;
  homeXg: number;
  awayXg: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  modalHomeGoals: number;
  modalAwayGoals: number;
  top5Scorelines: ReadonlyArray<{ homeGoals: number; awayGoals: number; probability: number }>;
  homeCoverage: AttackDefenseProfileCoverage;
  awayCoverage: AttackDefenseProfileCoverage;
  candidateWarnings: readonly string[];
}

export interface GoalModelCandidateMetrics {
  candidateId: AttackDefenseGoalModelCandidateId;
  fixtureCount: number;
  brierScore: number | null;
  logLoss: number | null;
  outcomeAccuracy: number | null;
  exactScoreAccuracy: number | null;
  top3ScoreCoverage: number | null;
  top5ScoreCoverage: number | null;
  homeGoalMae: number | null;
  awayGoalMae: number | null;
  totalGoalMae: number | null;
  avgPredictedHomeGoals: number | null;
  avgPredictedAwayGoals: number | null;
  avgActualHomeGoals: number | null;
  avgActualAwayGoals: number | null;
  uniqueXgPairCount: number;
  uniqueModalScorelineCount: number;
  modalOneOneFrequency: number | null;
  recommended10Frequency: number | null;
  recommended20Frequency: number | null;
  recommended21Frequency: number | null;
  recommended30Frequency: number | null;
  recommended31Frequency: number | null;
  top1Concentration: number | null;
  top5CumulativeProbabilityAvg: number | null;
  totalGoalDistribution: Record<string, number>;
}

export interface GoalModelXgDiagnostics {
  candidateId: AttackDefenseGoalModelCandidateId;
  minHomeXg: number | null;
  maxHomeXg: number | null;
  minAwayXg: number | null;
  maxAwayXg: number | null;
  p10HomeXg: number | null;
  p50HomeXg: number | null;
  p90HomeXg: number | null;
  p10AwayXg: number | null;
  p50AwayXg: number | null;
  p90AwayXg: number | null;
  avgTotalXg: number | null;
  countHomeXgAbove15: number;
  countHomeXgAbove20: number;
  countHomeXgAbove25: number;
  countHomeXgBelow05: number;
  countHomeXgBelow08: number;
  extremeFixtures: string[];
}

export interface ProfileCoverageSummary {
  competitionEnvSampleSize: number;
  profileStrategy: AttackDefenseProfileStrategy;
  recencyStrategy: AttackDefenseRecencyStrategy;
  coverageCounts: Record<AttackDefenseProfileCoverage, number>;
  fallbackRate: number;
  fullCoverageRate: number;
  totalNoLookAheadViolations: number;
}

export interface GoalModelBacktestResult {
  schemaVersion: string;
  generatedAt: string;
  modelVersion: string;
  evaluationYears: readonly number[];
  fixtureCount: number;
  profileCoverageSummary: ProfileCoverageSummary;
  candidateMetrics: GoalModelCandidateMetrics[];
  xgDiagnostics: GoalModelXgDiagnostics[];
  fixtures: GoalModelEvalFixture[];
}

// ── Data loading ──────────────────────────────────────────────────────────────

interface WcFixtureFile {
  matches?: unknown[];
}

interface RawWcMatch {
  match_id?: string;
  tournament_year?: number;
  stage?: string;
  match_date?: string;
  home_team?: string;
  away_team?: string;
  home_score?: number;
  away_score?: number;
  result?: string;
  decided_by?: string;
  penalty_home_score?: number | null;
  penalty_away_score?: number | null;
  neutral_site?: boolean;
}

function loadWcFixtureFile(filePath: string, year: number): GoalModelEvalFixture[] {
  if (!existsSync(filePath)) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
  } catch {
    return [];
  }

  const file = raw as WcFixtureFile;
  if (!Array.isArray(file.matches)) return [];

  const fixtures: GoalModelEvalFixture[] = [];

  for (const m of file.matches as RawWcMatch[]) {
    if (
      typeof m.match_id !== "string" ||
      typeof m.match_date !== "string" ||
      typeof m.home_team !== "string" ||
      typeof m.away_team !== "string" ||
      typeof m.home_score !== "number" ||
      typeof m.away_score !== "number" ||
      typeof m.result !== "string"
    ) {
      continue;
    }

    // Exclude penalty shootout matches (scores include extra time but not penalties)
    // decided_by=penalties: the score stored is regulation+ET, which is correct
    // We never add penalty_home_score/away_score to the actual score.
    const outcome =
      m.result === "home_win"
        ? "home_win"
        : m.result === "away_win"
          ? "away_win"
          : ("draw" as "home_win" | "draw" | "away_win");

    // Profile is built from all data strictly before this match's tournament
    // (i.e., cutoff = first day of that year's tournament)
    const profileCutoffDate = `${year}-01-01`;

    fixtures.push({
      matchId: m.match_id,
      kickoffDate: m.match_date,
      homeTeam: canonicalizeTeamName(m.home_team),
      awayTeam: canonicalizeTeamName(m.away_team),
      homeScore: m.home_score,
      awayScore: m.away_score,
      actualOutcome: outcome,
      competition: `FIFA World Cup ${year}`,
      stage: typeof m.stage === "string" ? m.stage : "unknown",
      neutralSite: m.neutral_site === true,
      tournamentYear: year,
      profileCutoffDate,
    });
  }

  return fixtures;
}

function findDataFixturesDir(): string {
  // Resolve relative to this file's location at runtime
  const candidates = [
    join(process.cwd(), "../../packages/data/fixtures/world-cup"),
    join(process.cwd(), "packages/data/fixtures/world-cup"),
    join(import.meta.dirname ?? "", "../../data/fixtures/world-cup"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // fallback: try relative to __dirname equivalent
  return join(process.cwd(), "packages/data/fixtures/world-cup");
}

export function loadEvaluationFixtures(
  fixturesDir?: string
): GoalModelEvalFixture[] {
  const dir = fixturesDir ?? findDataFixturesDir();
  const fixtures: GoalModelEvalFixture[] = [];

  for (const year of BACKTEST_EVALUATION_YEARS) {
    const filePath = join(dir, `world-cup-${year}-results.json`);
    fixtures.push(...loadWcFixtureFile(filePath, year));
  }

  return fixtures.sort((a, b) => a.kickoffDate.localeCompare(b.kickoffDate));
}

// ── Historical match conversion ───────────────────────────────────────────────

function toHistoricalMatchRecord(fixture: HistoricalInternationalScoredFixture): HistoricalMatchRecord {
  return {
    matchId: fixture.fixtureId,
    matchDate: fixture.kickoffAt.slice(0, 10),
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeScore: fixture.homeGoals,
    awayScore: fixture.awayGoals,
    neutralSite: fixture.neutralVenue,
    competition: fixture.competitionId,
    stage: fixture.stage ?? "",
  };
}

function buildHistoricalMatchRecords(fixturesDir?: string): HistoricalMatchRecord[] {
  return loadHistoricalInternationalScoredFixtures({
    mode: "expanded",
    fixturesDir: fixturesDir ?? findDataFixturesDir(),
  })
    .filter((fixture) => fixture.kickoffAt < "2026-01-01")
    .map(toHistoricalMatchRecord);
}

// ── Elo rating replay for SOS ─────────────────────────────────────────────────

function buildEloAtDateMap(
  historicalMatches: HistoricalMatchRecord[]
): Map<string, Map<string, number>> {
  const allEloMatches: EloMatch[] = historicalMatches
    .filter((match) => match.matchDate < "2026-01-01")
    .map((match): EloMatch => {
      const result: EloMatch["result"] =
        match.homeScore > match.awayScore
          ? "home_win"
          : match.homeScore < match.awayScore
            ? "away_win"
            : "draw";
      return {
        match_id: match.matchId,
        match_date: match.matchDate,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        home_score: match.homeScore,
        away_score: match.awayScore,
        neutral_site: match.neutralSite,
        competition: match.competition,
        result,
      };
    })
    .sort((a, b) => a.match_date.localeCompare(b.match_date) || a.match_id.localeCompare(b.match_id));

  const result = processMatches(allEloMatches, DEFAULT_ELO_CONFIG);
  const teamEloAtDate = new Map<string, Map<string, number>>();

  for (const history of result.matchHistory) {
    const homeTeam = canonicalizeTeamName(history.home_team);
    const awayTeam = canonicalizeTeamName(history.away_team);

    if (!teamEloAtDate.has(homeTeam)) teamEloAtDate.set(homeTeam, new Map());
    if (!teamEloAtDate.has(awayTeam)) teamEloAtDate.set(awayTeam, new Map());

    teamEloAtDate.get(homeTeam)!.set(history.match_date, history.home_rating_before);
    teamEloAtDate.get(awayTeam)!.set(history.match_date, history.away_rating_before);
  }

  return teamEloAtDate;
}

// ── Per-fixture prediction ────────────────────────────────────────────────────

function predictFixture(
  fixture: GoalModelEvalFixture,
  homeProfile: TeamAttackDefenseProfile,
  awayProfile: TeamAttackDefenseProfile,
  competition: CompetitionGoalEnvironment,
  candidateId: AttackDefenseGoalModelCandidateId,
  homeElo: number,
  awayElo: number
): CandidateFixtureResult {
  const modelOutput = computeAttackDefenseGoalModel(candidateId, {
    homeTeamId: fixture.homeTeam,
    awayTeamId: fixture.awayTeam,
    competition,
    homeProfile,
    awayProfile,
    homeElo,
    awayElo,
    neutralVenue: fixture.neutralSite,
  });

  const matrix = generateScoreMatrix(
    { expectedHomeGoals: modelOutput.homeXg, expectedAwayGoals: modelOutput.awayXg },
    { maxGoals: MAX_GOALS, normalizeMatrix: true }
  );

  const probs = aggregateOutcomeProbabilities(matrix);
  const top5 = getMostLikelyScorelines(matrix, 5);

  return {
    matchId: fixture.matchId,
    homeXg: modelOutput.homeXg,
    awayXg: modelOutput.awayXg,
    homeWinProb: probs.homeWinProbability,
    drawProb: probs.drawProbability,
    awayWinProb: probs.awayWinProbability,
    modalHomeGoals: top5[0]?.homeGoals ?? 1,
    modalAwayGoals: top5[0]?.awayGoals ?? 1,
    top5Scorelines: top5,
    homeCoverage: homeProfile.coverage,
    awayCoverage: awayProfile.coverage,
    candidateWarnings: modelOutput.warnings,
  };
}

// ── Metrics computation ───────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? null;
  return ((sorted[lo] ?? 0) + (sorted[hi] ?? 0)) / 2;
}

function computeMetrics(
  candidateId: AttackDefenseGoalModelCandidateId,
  fixtures: GoalModelEvalFixture[],
  predictions: CandidateFixtureResult[]
): GoalModelCandidateMetrics {
  const n = fixtures.length;
  if (n === 0) {
    return nullMetrics(candidateId);
  }

  let brierSum = 0;
  let logLossSum = 0;
  let outcomeCorrect = 0;
  let exactCorrect = 0;
  let top3Cover = 0;
  let top5Cover = 0;
  let homeGoalMaeSum = 0;
  let awayGoalMaeSum = 0;
  let totalGoalMaeSum = 0;
  let predictedHomeSum = 0;
  let predictedAwaySum = 0;
  let actualHomeSum = 0;
  let actualAwaySum = 0;
  let top1ConcentrationSum = 0;
  let top5CumulativeSum = 0;

  const xgPairs = new Set<string>();
  const modalScorelines = new Set<string>();
  const totalGoalDistribution: Record<string, number> = {};

  let recommended10 = 0;
  let recommended20 = 0;
  let recommended21 = 0;
  let recommended30 = 0;
  let recommended31 = 0;

  for (let i = 0; i < n; i++) {
    const fixture = fixtures[i]!;
    const pred = predictions[i]!;

    // Outcome probabilities (Brier, Log Loss)
    const pHome = pred.homeWinProb;
    const pDraw = pred.drawProb;
    const pAway = pred.awayWinProb;

    const actualHome = fixture.actualOutcome === "home_win" ? 1 : 0;
    const actualDraw = fixture.actualOutcome === "draw" ? 1 : 0;
    const actualAway = fixture.actualOutcome === "away_win" ? 1 : 0;

    brierSum += (pHome - actualHome) ** 2 + (pDraw - actualDraw) ** 2 + (pAway - actualAway) ** 2;

    const pActual =
      fixture.actualOutcome === "home_win" ? pHome :
      fixture.actualOutcome === "draw" ? pDraw : pAway;
    logLossSum += -Math.log(Math.max(pActual, LOG_EPSILON));

    // Outcome accuracy
    const predictedOutcome =
      pHome >= pDraw && pHome >= pAway ? "home_win" :
      pDraw >= pAway ? "draw" : "away_win";
    if (predictedOutcome === fixture.actualOutcome) outcomeCorrect += 1;

    // Exact score
    const aH = fixture.homeScore;
    const aA = fixture.awayScore;

    const isExact = pred.modalHomeGoals === aH && pred.modalAwayGoals === aA;
    if (isExact) exactCorrect += 1;

    const inTop3 = pred.top5Scorelines.slice(0, 3).some((s) => s.homeGoals === aH && s.awayGoals === aA);
    if (inTop3) top3Cover += 1;
    const inTop5 = pred.top5Scorelines.some((s) => s.homeGoals === aH && s.awayGoals === aA);
    if (inTop5) top5Cover += 1;

    // Goal MAE
    homeGoalMaeSum += Math.abs(pred.homeXg - aH);
    awayGoalMaeSum += Math.abs(pred.awayXg - aA);
    totalGoalMaeSum += Math.abs(pred.homeXg + pred.awayXg - (aH + aA));

    predictedHomeSum += pred.homeXg;
    predictedAwaySum += pred.awayXg;
    actualHomeSum += aH;
    actualAwaySum += aA;

    // Diversity
    xgPairs.add(`${pred.homeXg.toFixed(4)}|${pred.awayXg.toFixed(4)}`);
    modalScorelines.add(`${pred.modalHomeGoals}-${pred.modalAwayGoals}`);

    top1ConcentrationSum += pred.top5Scorelines[0]?.probability ?? 0;
    top5CumulativeSum += pred.top5Scorelines.reduce((s, sc) => s + sc.probability, 0);

    // Scoreline frequencies
    const mH = pred.modalHomeGoals;
    const mA = pred.modalAwayGoals;
    if (mH === 1 && mA === 0) recommended10 += 1;
    if (mH === 2 && mA === 0) recommended20 += 1;
    if (mH === 2 && mA === 1) recommended21 += 1;
    if (mH === 3 && mA === 0) recommended30 += 1;
    if (mH === 3 && mA === 1) recommended31 += 1;

    // Total goal distribution
    const totalActual = aH + aA;
    const key = totalActual >= 4 ? "4+" : String(totalActual);
    totalGoalDistribution[key] = (totalGoalDistribution[key] ?? 0) + 1;
  }

  return {
    candidateId,
    fixtureCount: n,
    brierScore: brierSum / n / 3,
    logLoss: logLossSum / n,
    outcomeAccuracy: outcomeCorrect / n,
    exactScoreAccuracy: exactCorrect / n,
    top3ScoreCoverage: top3Cover / n,
    top5ScoreCoverage: top5Cover / n,
    homeGoalMae: homeGoalMaeSum / n,
    awayGoalMae: awayGoalMaeSum / n,
    totalGoalMae: totalGoalMaeSum / n,
    avgPredictedHomeGoals: predictedHomeSum / n,
    avgPredictedAwayGoals: predictedAwaySum / n,
    avgActualHomeGoals: actualHomeSum / n,
    avgActualAwayGoals: actualAwaySum / n,
    uniqueXgPairCount: xgPairs.size,
    uniqueModalScorelineCount: modalScorelines.size,
    modalOneOneFrequency: countModalOneOne(predictions) / n,
    recommended10Frequency: recommended10 / n,
    recommended20Frequency: recommended20 / n,
    recommended21Frequency: recommended21 / n,
    recommended30Frequency: recommended30 / n,
    recommended31Frequency: recommended31 / n,
    top1Concentration: top1ConcentrationSum / n,
    top5CumulativeProbabilityAvg: top5CumulativeSum / n,
    totalGoalDistribution,
  };
}

function countModalOneOne(predictions: CandidateFixtureResult[]): number {
  return predictions.filter((p) => p.modalHomeGoals === 1 && p.modalAwayGoals === 1).length;
}

function nullMetrics(candidateId: AttackDefenseGoalModelCandidateId): GoalModelCandidateMetrics {
  return {
    candidateId,
    fixtureCount: 0,
    brierScore: null,
    logLoss: null,
    outcomeAccuracy: null,
    exactScoreAccuracy: null,
    top3ScoreCoverage: null,
    top5ScoreCoverage: null,
    homeGoalMae: null,
    awayGoalMae: null,
    totalGoalMae: null,
    avgPredictedHomeGoals: null,
    avgPredictedAwayGoals: null,
    avgActualHomeGoals: null,
    avgActualAwayGoals: null,
    uniqueXgPairCount: 0,
    uniqueModalScorelineCount: 0,
    modalOneOneFrequency: null,
    recommended10Frequency: null,
    recommended20Frequency: null,
    recommended21Frequency: null,
    recommended30Frequency: null,
    recommended31Frequency: null,
    top1Concentration: null,
    top5CumulativeProbabilityAvg: null,
    totalGoalDistribution: {},
  };
}

function computeXgDiagnostics(
  candidateId: AttackDefenseGoalModelCandidateId,
  fixtures: GoalModelEvalFixture[],
  predictions: CandidateFixtureResult[]
): GoalModelXgDiagnostics {
  if (predictions.length === 0) {
    return {
      candidateId,
      minHomeXg: null, maxHomeXg: null, minAwayXg: null, maxAwayXg: null,
      p10HomeXg: null, p50HomeXg: null, p90HomeXg: null,
      p10AwayXg: null, p50AwayXg: null, p90AwayXg: null,
      avgTotalXg: null,
      countHomeXgAbove15: 0, countHomeXgAbove20: 0, countHomeXgAbove25: 0,
      countHomeXgBelow05: 0, countHomeXgBelow08: 0,
      extremeFixtures: [],
    };
  }

  const homeXgs = predictions.map((p) => p.homeXg).sort((a, b) => a - b);
  const awayXgs = predictions.map((p) => p.awayXg).sort((a, b) => a - b);

  const extremeFixtures: string[] = [];
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i]!;
    const fixture = fixtures[i]!;
    if (pred.homeXg > 2.5 || pred.awayXg > 2.5 || pred.homeXg < 0.5 || pred.awayXg < 0.5) {
      extremeFixtures.push(`${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.kickoffDate}): ${pred.homeXg.toFixed(2)}-${pred.awayXg.toFixed(2)}`);
    }
  }

  return {
    candidateId,
    minHomeXg: homeXgs[0] ?? null,
    maxHomeXg: homeXgs[homeXgs.length - 1] ?? null,
    minAwayXg: awayXgs[0] ?? null,
    maxAwayXg: awayXgs[awayXgs.length - 1] ?? null,
    p10HomeXg: percentile(homeXgs, 0.10),
    p50HomeXg: percentile(homeXgs, 0.50),
    p90HomeXg: percentile(homeXgs, 0.90),
    p10AwayXg: percentile(awayXgs, 0.10),
    p50AwayXg: percentile(awayXgs, 0.50),
    p90AwayXg: percentile(awayXgs, 0.90),
    avgTotalXg: predictions.reduce((s, p) => s + p.homeXg + p.awayXg, 0) / predictions.length,
    countHomeXgAbove15: homeXgs.filter((x) => x > 1.5).length,
    countHomeXgAbove20: homeXgs.filter((x) => x > 2.0).length,
    countHomeXgAbove25: homeXgs.filter((x) => x > 2.5).length,
    countHomeXgBelow05: homeXgs.filter((x) => x < 0.5).length,
    countHomeXgBelow08: homeXgs.filter((x) => x < 0.8).length,
    extremeFixtures: extremeFixtures.slice(0, 10),
  };
}

// ── Main backtest runner ──────────────────────────────────────────────────────

export interface RunBacktestInput {
  profileStrategy: AttackDefenseProfileStrategy;
  recencyStrategy: AttackDefenseRecencyStrategy;
  fixturesDir?: string;
  generatedAt?: string;
}

export function runAttackDefenseGoalModelBacktest(
  input: RunBacktestInput
): GoalModelBacktestResult {
  const fixtures = loadEvaluationFixtures(input.fixturesDir);
  const historicalMatchRecords = buildHistoricalMatchRecords(input.fixturesDir);
  const teamEloAtDate = buildEloAtDateMap(historicalMatchRecords);

  // Build per-evaluation-year profiles using only data strictly before each
  // year's cutoff. This prevents look-ahead (WC2022 profiles only use pre-2022
  // data; WC2018 profiles only use pre-2018 data) and eliminates spurious
  // no-look-ahead violation counts that occur when post-cutoff matches are
  // present in the full historical record set.
  const profilesByYear = new Map<number, Map<string, TeamAttackDefenseProfile>>();
  const envByYear = new Map<number, CompetitionGoalEnvironment>();

  const aggregatedCoverage: Record<string, number> = {
    full: 0, partial: 0, sparse: 0, fallback: 0,
  };
  let totalNoLookAheadViolations = 0;
  let totalCompetitionEnvSampleSize = 0;

  for (const year of BACKTEST_EVALUATION_YEARS) {
    const yearCutoff = `${year}-01-01`;

    // Collect teams playing in this evaluation year
    const yearTeams = new Set<string>();
    for (const f of fixtures) {
      if (f.tournamentYear === year) {
        yearTeams.add(f.homeTeam);
        yearTeams.add(f.awayTeam);
      }
    }

    // Pre-filter: only matches strictly before the cutoff reach the builder.
    // This makes violations=0 the expected invariant; any violation > 0
    // indicates a genuine data integrity bug.
    const preFilteredRecords = historicalMatchRecords.filter(
      (r) => r.matchDate < yearCutoff
    );

    const yearEnv = buildCompetitionGoalEnvironment({
      historicalMatches: preFilteredRecords,
      cutoffAt: yearCutoff,
      competitionId: "world_cup",
    });
    envByYear.set(year, yearEnv);
    totalCompetitionEnvSampleSize += yearEnv.sampleSize;

    const yearProfileResult = buildProfilesForEvaluationSet({
      teams: [...yearTeams],
      cutoffAt: yearCutoff,
      historicalMatches: preFilteredRecords,
      competitionEnv: yearEnv,
      teamEloAtDate,
      recencyStrategy: input.recencyStrategy,
      profileStrategy: input.profileStrategy,
    });

    profilesByYear.set(year, yearProfileResult.profiles);

    for (const [coverage, count] of Object.entries(yearProfileResult.coverageSummary)) {
      aggregatedCoverage[coverage] = (aggregatedCoverage[coverage] ?? 0) + (count as number);
    }
    totalNoLookAheadViolations += yearProfileResult.totalNoLookAheadViolations;
  }

  const totalTeams = Object.values(aggregatedCoverage).reduce((s, v) => s + v, 0);
  const globalEnv = envByYear.get(BACKTEST_EVALUATION_YEARS[BACKTEST_EVALUATION_YEARS.length - 1]!)
    ?? envByYear.values().next().value!;

  const coverageSummary: ProfileCoverageSummary = {
    competitionEnvSampleSize: totalCompetitionEnvSampleSize,
    profileStrategy: input.profileStrategy,
    recencyStrategy: input.recencyStrategy,
    coverageCounts: aggregatedCoverage as Record<AttackDefenseProfileCoverage, number>,
    fallbackRate: (aggregatedCoverage["fallback"] ?? 0) / Math.max(1, totalTeams),
    fullCoverageRate: (aggregatedCoverage["full"] ?? 0) / Math.max(1, totalTeams),
    totalNoLookAheadViolations,
  };

  // Predict all fixtures with each candidate and compute metrics
  const candidateMetricsList: GoalModelCandidateMetrics[] = [];
  const xgDiagnosticsList: GoalModelXgDiagnostics[] = [];

  for (const candidateId of GOAL_MODEL_CANDIDATE_IDS) {
    const predictions: CandidateFixtureResult[] = [];

    for (const fixture of fixtures) {
      const yearProfiles = profilesByYear.get(fixture.tournamentYear) ?? new Map<string, TeamAttackDefenseProfile>();
      const yearEnv = envByYear.get(fixture.tournamentYear) ?? globalEnv;

      const homeProfile = yearProfiles.get(fixture.homeTeam)
        ?? buildNeutralAttackDefenseProfile(fixture.homeTeam, yearEnv);
      const awayProfile = yearProfiles.get(fixture.awayTeam)
        ?? buildNeutralAttackDefenseProfile(fixture.awayTeam, yearEnv);

      // Approximate Elo: use 1500 as reference (no fixture-specific Elo in this runner)
      const homeElo = 1500;
      const awayElo = 1500;

      predictions.push(predictFixture(fixture, homeProfile, awayProfile, yearEnv, candidateId, homeElo, awayElo));
    }

    candidateMetricsList.push(computeMetrics(candidateId, fixtures, predictions));
    xgDiagnosticsList.push(computeXgDiagnostics(candidateId, fixtures, predictions));
  }

  return {
    schemaVersion: ATTACK_DEFENSE_BACKTEST_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    modelVersion: ATTACK_DEFENSE_GOAL_MODEL_VERSION,
    evaluationYears: BACKTEST_EVALUATION_YEARS,
    fixtureCount: fixtures.length,
    profileCoverageSummary: coverageSummary,
    candidateMetrics: candidateMetricsList,
    xgDiagnostics: xgDiagnosticsList,
    fixtures,
  };
}
