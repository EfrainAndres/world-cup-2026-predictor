import {
  getHealth,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getModelInfo,
  simulateMatch,
  simulateTournamentFoundation
} from "@world-cup-2026-predictor/api";
import type {
  HealthResponse,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  ModelInfoResponse,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SimulateMatchSuccessResponse,
  SupportedHistoricalTournamentYear,
  TournamentSimulationSuccessResponse
} from "@world-cup-2026-predictor/api";

export const HISTORICAL_TOURNAMENT_YEARS = [2010, 2014, 2018, 2022] as const satisfies readonly SupportedHistoricalTournamentYear[];

export type TeamRatingTier = "Elite" | "Strong" | "Competitive";

export interface TeamRatingEntry {
  rank: number;
  team: string;
  eloRating: number;
  tier: TeamRatingTier;
  offenseStrength: number;
  defenseStrength: number;
  summary: string;
}

export interface TeamRatingsFoundation {
  teams: readonly TeamRatingEntry[];
  ratingSource: string;
  foundationWarning: string;
  strongestOffenseTeam: string;
  strongestOffenseScore: number;
  strongestDefenseTeam: string;
  strongestDefenseScore: number;
  averageEloRating: number;
  topEloRating: number;
}

export const FOUNDATION_TEAM_RATINGS: TeamRatingsFoundation = {
  teams: [
    {
      rank: 1,
      team: "Argentina",
      eloRating: 1870,
      tier: "Elite",
      offenseStrength: 88,
      defenseStrength: 82,
      summary: "2022 World Cup champions. Elite individual quality and tactical versatility across all lines."
    },
    {
      rank: 2,
      team: "France",
      eloRating: 1855,
      tier: "Elite",
      offenseStrength: 85,
      defenseStrength: 90,
      summary: "2018 World Cup winners. Exceptional squad depth with one of the strongest defensive records in international football."
    },
    {
      rank: 3,
      team: "Spain",
      eloRating: 1840,
      tier: "Elite",
      offenseStrength: 88,
      defenseStrength: 84,
      summary: "Euro 2024 champions. Dominant possession-based style with technical depth throughout the squad."
    },
    {
      rank: 4,
      team: "England",
      eloRating: 1825,
      tier: "Elite",
      offenseStrength: 84,
      defenseStrength: 80,
      summary: "Consistent top-five European side. Strong Premier League pipeline and improving tournament record."
    },
    {
      rank: 5,
      team: "Brazil",
      eloRating: 1818,
      tier: "Elite",
      offenseStrength: 90,
      defenseStrength: 78,
      summary: "South America's most decorated side. Historically dominant attacking output and strong qualification record."
    },
    {
      rank: 6,
      team: "Portugal",
      eloRating: 1800,
      tier: "Elite",
      offenseStrength: 84,
      defenseStrength: 76,
      summary: "Consistent qualifier with elite individual talent. Strong Champions League pedigree across the squad."
    },
    {
      rank: 7,
      team: "Germany",
      eloRating: 1786,
      tier: "Strong",
      offenseStrength: 82,
      defenseStrength: 80,
      summary: "One of football's most consistent international programs. Rebuilding post-2018 with a young technical core."
    },
    {
      rank: 8,
      team: "Netherlands",
      eloRating: 1772,
      tier: "Strong",
      offenseStrength: 80,
      defenseStrength: 78,
      summary: "Consistent European contender. Strong pipeline from Ajax and major European clubs."
    },
    {
      rank: 9,
      team: "Belgium",
      eloRating: 1758,
      tier: "Strong",
      offenseStrength: 82,
      defenseStrength: 76,
      summary: "Golden generation peak. World-class attacking options with Champions League experience throughout the squad."
    },
    {
      rank: 10,
      team: "Italy",
      eloRating: 1742,
      tier: "Strong",
      offenseStrength: 74,
      defenseStrength: 88,
      summary: "Euro 2020 winners. Historically one of the strongest defensive structures in international football."
    }
  ],
  ratingSource: "Approximate seed ratings derived from historical World Cup results. Not calibrated from live data.",
  foundationWarning:
    "These ratings are a static foundation for dashboard preview. They are not derived from a live model, official FIFA rankings, or recent match data.",
  strongestOffenseTeam: "Brazil",
  strongestOffenseScore: 90,
  strongestDefenseTeam: "France",
  strongestDefenseScore: 90,
  averageEloRating: 1807,
  topEloRating: 1870
};

export interface DashboardSnapshot {
  health: HealthResponse;
  modelInfo: ModelInfoResponse;
  matchPreview: SimulateMatchSuccessResponse;
  historicalReplayAudit: HistoricalReplayAuditResponse;
  historicalTournaments: HistoricalTournamentSummary[];
  tournamentSimulation: TournamentSimulationSuccessResponse;
  teamRatings: TeamRatingsFoundation;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function simulateDashboardMatch(request: SimulateMatchRequest): SimulateMatchResponse {
  return simulateMatch(request);
}

export function getDashboardSnapshot(): DashboardSnapshot {
  const matchPreview = simulateMatch({
    homeTeam: "Canada",
    awayTeam: "Mexico",
    expectedHomeGoals: 1.15,
    expectedAwayGoals: 1.25,
    maxGoals: 6,
    mostLikelyScorelineLimit: 4,
    monteCarlo: {
      simulationCount: 100,
      seed: 2026,
      mostCommonScorelineLimit: 3
    }
  });

  if (matchPreview.status !== "success") {
    throw new Error("Dashboard match preview fixture must remain valid.");
  }

  const historicalTournaments = HISTORICAL_TOURNAMENT_YEARS.map((year) => {
    const result = getHistoricalTournamentSummary(year);

    if (result.status !== "success") {
      throw new Error(`Dashboard historical summary fixture must remain valid for ${year}.`);
    }

    return result.summary;
  });

  return {
    health: getHealth(),
    modelInfo: getModelInfo(),
    matchPreview,
    historicalReplayAudit: getHistoricalReplayAudit(),
    historicalTournaments,
    tournamentSimulation: simulateTournamentFoundation(),
    teamRatings: FOUNDATION_TEAM_RATINGS
  };
}
