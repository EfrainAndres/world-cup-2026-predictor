export type TeamPerformanceCoverage = "full" | "partial" | "sparse" | "fallback";
export type TeamPerformanceFreshness = "fresh" | "aging" | "stale" | "unknown";

export interface TeamPerformanceSource {
  provider: "statsbomb_open_data";
  competitionId: number;
  seasonId: number;
  matchId: number;
  matchDate: string;
}

export interface TeamPerformanceProfile {
  teamId: string;
  canonicalName: string;
  provider: "statsbomb_open_data";
  cutoffAt: string;
  latestMatchAt: string | null;
  matchCount: number;
  minutesPlayed: number;
  shotCountFor: number;
  shotCountAgainst: number;
  xgSampleCountFor: number;
  xgSampleCountAgainst: number;
  totalXgFor: number | null;
  totalXgAgainst: number | null;
  xgForPer90: number | null;
  xgAgainstPer90: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalsForPer90: number | null;
  goalsAgainstPer90: number | null;
  shotQualityFor: number | null;
  shotQualityAgainst: number | null;
  uniqueOpponentCount: number;
  coverage: TeamPerformanceCoverage;
  freshness: TeamPerformanceFreshness;
  sources: TeamPerformanceSource[];
  warnings: string[];
}

export interface TeamPerformanceProfileIssue {
  code: "team_not_found" | "no_data" | "parse_error";
  message: string;
}

export interface TeamPerformanceProfileResult {
  teamId: string;
  canonicalName: string;
  profile: TeamPerformanceProfile;
  issues: TeamPerformanceProfileIssue[];
}

export interface TeamPerformanceDataProvider {
  readonly providerId: string;
  getTeamPerformanceProfile(teamId: string, cutoffAt: string): Promise<TeamPerformanceProfileResult>;
  listTeamPerformanceProfiles(cutoffAt: string): Promise<TeamPerformanceProfileResult[]>;
}

export interface StatsBombMatchRecord {
  match_id: number;
  match_date: string;
  home_team: { home_team_id: number; home_team_name: string };
  away_team: { away_team_id: number; away_team_name: string };
  home_score: number;
  away_score: number;
  competition: { competition_id: number; competition_name: string };
  season: { season_id: number; season_name: string };
}

export interface StatsBombShotData {
  statsbomb_xg?: number;
  outcome: { id: number; name: string };
}

export interface StatsBombEventRecord {
  id: string;
  type: { id: number; name: string };
  period: number;
  timestamp: string;
  team: { id: number; name: string };
  player?: { id: number; name: string };
  shot?: StatsBombShotData;
}

export interface StatsBombSupportedCompetition {
  competitionId: number;
  seasonId: number;
  name: string;
}
