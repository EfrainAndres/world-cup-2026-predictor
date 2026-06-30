import type { AttackDefenseProfileCoverage } from "../../model/src/index.js";
import { buildCompetitionGoalEnvironment, buildProfilesForEvaluationSet } from "./attack-defense-profile-builder.js";
import { loadHistoricalInternationalScoredFixtures } from "./historical-international-fixtures.js";
import type { HistoricalMatchRecord } from "./attack-defense-profile-builder.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "./world-cup-2026-teams.js";
import {
  ATTACK_DEFENSE_WC2026_CUTOFF,
} from "./attack-defense-runtime-profile-source.js";
import type {
  AttackDefenseRuntimeCoverageStats,
  AttackDefenseRuntimeProfilesResult,
} from "./attack-defense-runtime-profile-source.js";

const ATTACK_DEFENSE_WC2026_COMPETITION_ID = "world_cup";

let cachedRuntimeProfiles: AttackDefenseRuntimeProfilesResult | null = null;

export function resetAttackDefenseRuntimeProfileCache(): void {
  cachedRuntimeProfiles = null;
}

function buildHistoricalMatchRecordsForRuntime(): HistoricalMatchRecord[] {
  const fixtures = loadHistoricalInternationalScoredFixtures({ mode: "expanded" });
  const cutoff = ATTACK_DEFENSE_WC2026_CUTOFF;

  const kickoffToCutoff = cutoff + "T00:00:00.000Z";
  return fixtures
    .filter((f) => f.kickoffAt < kickoffToCutoff)
    .map((f): HistoricalMatchRecord => ({
      matchId: f.fixtureId,
      matchDate: f.kickoffAt.slice(0, 10),
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      homeScore: f.homeGoals,
      awayScore: f.awayGoals,
      neutralSite: f.neutralVenue,
      competition: f.competitionId,
      stage: f.stage ?? "group",
    }));
}

export function buildAttackDefenseRuntimeProfiles(input: {
  builtAt?: string;
} = {}): AttackDefenseRuntimeProfilesResult {
  if (cachedRuntimeProfiles !== null) return cachedRuntimeProfiles;

  const builtAt = input.builtAt ?? new Date().toISOString();
  const cutoffAt = ATTACK_DEFENSE_WC2026_CUTOFF;
  const historicalMatches = buildHistoricalMatchRecordsForRuntime();

  const competitionEnv = buildCompetitionGoalEnvironment({
    historicalMatches,
    cutoffAt,
    competitionId: ATTACK_DEFENSE_WC2026_COMPETITION_ID,
  });

  const teams = [...WORLD_CUP_2026_TEAM_NAMES];
  const buildResult = buildProfilesForEvaluationSet({
    teams,
    cutoffAt,
    historicalMatches,
    competitionEnv,
    recencyStrategy: "exponential_half_life",
    profileStrategy: "goals_strength_of_schedule_adjusted",
  });

  const coverageSummary = buildResult.coverageSummary as Record<AttackDefenseProfileCoverage, number>;
  const total = teams.length;
  const fallback = coverageSummary["fallback"] ?? 0;

  const coverageStats: AttackDefenseRuntimeCoverageStats = {
    full: coverageSummary["full"] ?? 0,
    partial: coverageSummary["partial"] ?? 0,
    sparse: coverageSummary["sparse"] ?? 0,
    fallback,
    total,
    fallbackRate: total > 0 ? fallback / total : 1,
  };

  const result: AttackDefenseRuntimeProfilesResult = {
    profiles: buildResult.profiles,
    competitionEnv,
    coverageStats,
    cutoffAt,
    builtAt,
  };

  cachedRuntimeProfiles = result;
  return result;
}
