import type { CompetitionGoalEnvironment, TeamAttackDefenseProfile } from "../../model/src/index.js";

export const ATTACK_DEFENSE_WC2026_CUTOFF = "2026-06-11";

export interface AttackDefenseRuntimeCoverageStats {
  full: number;
  partial: number;
  sparse: number;
  fallback: number;
  total: number;
  fallbackRate: number;
}

export interface AttackDefenseRuntimeProfilesResult {
  profiles: Map<string, TeamAttackDefenseProfile>;
  competitionEnv: CompetitionGoalEnvironment;
  coverageStats: AttackDefenseRuntimeCoverageStats;
  cutoffAt: string;
  builtAt: string;
}

export type AttackDefenseRuntimeEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export function assessAttackDefenseRuntimeEligibility(
  homeTeam: string,
  awayTeam: string,
  profiles: Map<string, TeamAttackDefenseProfile>
): AttackDefenseRuntimeEligibility {
  const homeProfile = profiles.get(homeTeam);
  const awayProfile = profiles.get(awayTeam);

  if (homeProfile === undefined || awayProfile === undefined) {
    return {
      eligible: false,
      reason: `Profile missing for ${homeProfile === undefined ? homeTeam : awayTeam}.`,
    };
  }

  return { eligible: true };
}
