import {
  ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT,
  ATTACK_DEFENSE_NEUTRAL_STRENGTH,
  classifyProfileCoverage,
  computeAttackStrength,
  computeDefenseStrength,
  computeRecencyWeight,
  computeSampleShrinkage,
  computeSosAdjustment,
} from "../../model/src/index.js";
import type {
  AttackDefenseProfileCoverage,
  AttackDefenseProfileStrategy,
  AttackDefenseRecencyStrategy,
  AttackDefenseStrengthDiagnostic,
  CompetitionGoalEnvironment,
  TeamAttackDefenseProfile,
} from "../../model/src/index.js";

export interface HistoricalMatchRecord {
  matchId: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  neutralSite: boolean;
  competition: string;
  stage: string;
}

export interface ProfileBuildInput {
  teamId: string;
  cutoffAt: string;
  historicalMatches: readonly HistoricalMatchRecord[];
  competitionEnv: CompetitionGoalEnvironment;
  teamEloAtDate: Map<string, Map<string, number>> | undefined;
  recencyStrategy: AttackDefenseRecencyStrategy;
  profileStrategy: AttackDefenseProfileStrategy;
}

export interface ProfileBuildResult {
  profile: TeamAttackDefenseProfile;
  diagnostic: AttackDefenseStrengthDiagnostic;
  matchesUsed: number;
  noLookAheadViolations: number;
}

export interface CompetitionGoalEnvironmentBuildInput {
  historicalMatches: readonly HistoricalMatchRecord[];
  cutoffAt: string;
  competitionId: string;
}

interface WeightedGoalStats {
  goalsFor: number;
  goalsAgainst: number;
  totalWeight: number;
  matchCount: number;
  opponentElos: number[];
}

function isoDateString(value: string): string {
  return value.length > 10 ? value.slice(0, 10) : value;
}

function dateBeforeCutoff(matchDate: string, cutoffAt: string): boolean {
  const md = isoDateString(matchDate);
  const cutoff = isoDateString(cutoffAt);
  return md < cutoff;
}

function getTeamEloBeforeMatch(
  teamEloAtDate: Map<string, Map<string, number>> | undefined,
  teamId: string,
  matchDate: string
): number | null {
  if (teamEloAtDate === undefined) return null;
  const teamMap = teamEloAtDate.get(teamId);
  if (teamMap === undefined) return null;

  const dateStr = isoDateString(matchDate);
  // Find the latest entry strictly before matchDate
  let best: number | null = null;
  let bestDate = "";

  for (const [d, elo] of teamMap.entries()) {
    if (d < dateStr && d > bestDate) {
      bestDate = d;
      best = elo;
    }
  }

  return best;
}

/**
 * Builds a CompetitionGoalEnvironment from historical matches before the cutoff.
 * Uses all matches (home and away perspectives combined for average).
 */
export function buildCompetitionGoalEnvironment(
  input: CompetitionGoalEnvironmentBuildInput
): CompetitionGoalEnvironment {
  const cutoffIso = isoDateString(input.cutoffAt);
  const matches = input.historicalMatches.filter(
    (m) => isoDateString(m.matchDate) < cutoffIso
  );

  if (matches.length === 0) {
    return {
      competitionId: input.competitionId,
      averageHomeGoals: 1.25,
      averageAwayGoals: 1.05,
      averageTotalGoals: 2.30,
      sampleSize: 0,
      cutoffAt: input.cutoffAt,
    };
  }

  let totalHomeGoals = 0;
  let totalAwayGoals = 0;

  for (const m of matches) {
    totalHomeGoals += m.homeScore;
    totalAwayGoals += m.awayScore;
  }

  const avgHome = totalHomeGoals / matches.length;
  const avgAway = totalAwayGoals / matches.length;

  return {
    competitionId: input.competitionId,
    averageHomeGoals: Math.max(0.5, avgHome),
    averageAwayGoals: Math.max(0.5, avgAway),
    averageTotalGoals: Math.max(1.0, avgHome + avgAway),
    sampleSize: matches.length,
    cutoffAt: input.cutoffAt,
  };
}

/**
 * Builds an attack/defense profile for a single team from historical matches.
 *
 * Invariant: every match used satisfies match_date < cutoffAt (no look-ahead).
 */
export function buildTeamAttackDefenseProfile(input: ProfileBuildInput): ProfileBuildResult {
  const { teamId, cutoffAt, historicalMatches, competitionEnv, teamEloAtDate, recencyStrategy, profileStrategy } = input;
  const cutoffIso = isoDateString(cutoffAt);

  let noLookAheadViolations = 0;
  const eligibleMatches: Array<{ match: HistoricalMatchRecord; isHome: boolean; weight: number; opponentElo: number | null }> = [];

  for (const match of historicalMatches) {
    const isHome = match.homeTeam === teamId;
    const isAway = match.awayTeam === teamId;
    if (!isHome && !isAway) continue;

    const matchDateIso = isoDateString(match.matchDate);

    // No-look-ahead enforcement
    if (matchDateIso >= cutoffIso) {
      noLookAheadViolations += 1;
      continue;
    }

    const recencyWeight = computeRecencyWeight(matchDateIso, cutoffIso, recencyStrategy);
    if (recencyWeight <= 0) continue;

    const opponentTeam = isHome ? match.awayTeam : match.homeTeam;
    const opponentElo = getTeamEloBeforeMatch(teamEloAtDate, opponentTeam, matchDateIso);

    eligibleMatches.push({ match, isHome, weight: recencyWeight, opponentElo });
  }

  const matchesUsed = eligibleMatches.length;

  // Aggregate weighted goal stats
  const stats: WeightedGoalStats = {
    goalsFor: 0,
    goalsAgainst: 0,
    totalWeight: 0,
    matchCount: matchesUsed,
    opponentElos: [],
  };

  for (const { match, isHome, weight, opponentElo } of eligibleMatches) {
    const gf = isHome ? match.homeScore : match.awayScore;
    const ga = isHome ? match.awayScore : match.homeScore;
    stats.goalsFor += gf * weight;
    stats.goalsAgainst += ga * weight;
    stats.totalWeight += weight;
    if (opponentElo !== null) stats.opponentElos.push(opponentElo);
  }

  const coverage: AttackDefenseProfileCoverage = classifyProfileCoverage(matchesUsed);

  if (matchesUsed === 0) {
    const neutral = buildNeutralProfileFromFallback(teamId, competitionEnv, cutoffAt);
    return {
      profile: neutral,
      diagnostic: buildFallbackDiagnostic(teamId, coverage),
      matchesUsed: 0,
      noLookAheadViolations,
    };
  }

  const shrinkageFactor = computeSampleShrinkage(matchesUsed, ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT);
  const avgGoalsFor = stats.goalsFor / stats.totalWeight;
  const avgGoalsAgainst = stats.goalsAgainst / stats.totalWeight;

  const avgOpponentElo = stats.opponentElos.length > 0
    ? stats.opponentElos.reduce((s, e) => s + e, 0) / stats.opponentElos.length
    : null;

  const shouldApplySos = profileStrategy === "goals_strength_of_schedule_adjusted" ||
    profileStrategy === "goals_plus_statsbomb_xg";

  const attackSosMultiplier = shouldApplySos ? computeSosAdjustment(avgOpponentElo, "attack") : 1.0;
  const defenseSosMultiplier = shouldApplySos ? computeSosAdjustment(avgOpponentElo, "defense") : 1.0;

  const rawAttackStrength =
    competitionEnv.averageHomeGoals > 0
      ? avgGoalsFor / competitionEnv.averageTotalGoals * 2
      : ATTACK_DEFENSE_NEUTRAL_STRENGTH;

  const rawDefenseStrength =
    competitionEnv.averageAwayGoals > 0
      ? avgGoalsAgainst / competitionEnv.averageTotalGoals * 2
      : ATTACK_DEFENSE_NEUTRAL_STRENGTH;

  const attackStrength = computeAttackStrength(
    avgGoalsFor,
    competitionEnv.averageTotalGoals / 2,
    shrinkageFactor,
    attackSosMultiplier
  );

  const defenseStrength = computeDefenseStrength(
    avgGoalsAgainst,
    competitionEnv.averageTotalGoals / 2,
    shrinkageFactor,
    defenseSosMultiplier
  );

  const recencyWeightAvg = matchesUsed > 0
    ? eligibleMatches.reduce((s, e) => s + e.weight, 0) / matchesUsed
    : 0;

  const sosAdjustmentAmount = shouldApplySos
    ? ((attackSosMultiplier + defenseSosMultiplier) / 2 - 1)
    : 0;

  const profile: TeamAttackDefenseProfile = {
    teamId,
    competitionId: competitionEnv.competitionId,
    attackStrength,
    defenseStrength,
    attackSampleSize: matchesUsed,
    defenseSampleSize: matchesUsed,
    goalsForPerMatch: avgGoalsFor,
    goalsAgainstPerMatch: avgGoalsAgainst,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: sosAdjustmentAmount,
    recencyWeight: recencyWeightAvg,
    coverage,
    cutoffAt,
  };

  const diagnostic: AttackDefenseStrengthDiagnostic = {
    teamId,
    rawAttackStrength,
    adjustedAttackStrength: attackStrength,
    rawDefenseStrength,
    adjustedDefenseStrength: defenseStrength,
    averageOpponentElo: avgOpponentElo,
    sosAdjustmentAmount,
    sampleSize: matchesUsed,
    shrinkageFactor,
    coverage,
  };

  return { profile, diagnostic, matchesUsed, noLookAheadViolations };
}

function buildNeutralProfileFromFallback(
  teamId: string,
  competition: CompetitionGoalEnvironment,
  cutoffAt: string
): TeamAttackDefenseProfile {
  return {
    teamId,
    competitionId: competition.competitionId,
    attackStrength: ATTACK_DEFENSE_NEUTRAL_STRENGTH,
    defenseStrength: ATTACK_DEFENSE_NEUTRAL_STRENGTH,
    attackSampleSize: 0,
    defenseSampleSize: 0,
    goalsForPerMatch: null,
    goalsAgainstPerMatch: null,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0,
    recencyWeight: 0,
    coverage: "fallback",
    cutoffAt,
  };
}

function buildFallbackDiagnostic(
  teamId: string,
  coverage: AttackDefenseProfileCoverage
): AttackDefenseStrengthDiagnostic {
  return {
    teamId,
    rawAttackStrength: ATTACK_DEFENSE_NEUTRAL_STRENGTH,
    adjustedAttackStrength: ATTACK_DEFENSE_NEUTRAL_STRENGTH,
    rawDefenseStrength: ATTACK_DEFENSE_NEUTRAL_STRENGTH,
    adjustedDefenseStrength: ATTACK_DEFENSE_NEUTRAL_STRENGTH,
    averageOpponentElo: null,
    sosAdjustmentAmount: 0,
    sampleSize: 0,
    shrinkageFactor: 0,
    coverage,
  };
}

/**
 * Builds profiles for all teams in a set of evaluation fixtures.
 * Returns a map keyed by teamId, built from all historicalMatches BEFORE cutoffAt.
 *
 * No-look-ahead guaranteed: profile cutoff is strictly before any evaluation fixture date.
 */
export function buildProfilesForEvaluationSet(input: {
  teams: readonly string[];
  cutoffAt: string;
  historicalMatches: readonly HistoricalMatchRecord[];
  competitionEnv: CompetitionGoalEnvironment;
  teamEloAtDate?: Map<string, Map<string, number>>;
  recencyStrategy: AttackDefenseRecencyStrategy;
  profileStrategy: AttackDefenseProfileStrategy;
}): {
  profiles: Map<string, TeamAttackDefenseProfile>;
  diagnostics: Map<string, AttackDefenseStrengthDiagnostic>;
  coverageSummary: Record<AttackDefenseProfileCoverage, number>;
  totalNoLookAheadViolations: number;
} {
  const profiles = new Map<string, TeamAttackDefenseProfile>();
  const diagnostics = new Map<string, AttackDefenseStrengthDiagnostic>();
  const coverageSummary: Record<AttackDefenseProfileCoverage, number> = {
    full: 0, partial: 0, sparse: 0, fallback: 0,
  };
  let totalNoLookAheadViolations = 0;

  for (const teamId of input.teams) {
    const result = buildTeamAttackDefenseProfile({
      teamId,
      cutoffAt: input.cutoffAt,
      historicalMatches: input.historicalMatches,
      competitionEnv: input.competitionEnv,
      teamEloAtDate: input.teamEloAtDate,
      recencyStrategy: input.recencyStrategy,
      profileStrategy: input.profileStrategy,
    });

    profiles.set(teamId, result.profile);
    diagnostics.set(teamId, result.diagnostic);
    coverageSummary[result.profile.coverage] += 1;
    totalNoLookAheadViolations += result.noLookAheadViolations;
  }

  return { profiles, diagnostics, coverageSummary, totalNoLookAheadViolations };
}
