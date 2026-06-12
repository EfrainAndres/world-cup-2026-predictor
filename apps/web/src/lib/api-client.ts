import {
  getAvailableLiveEloTeams,
  getHealth,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getLiveEloRatingsFoundation,
  getModelInfo,
  getTeamRatingsFoundation,
  predictMatchFromLiveElo,
  simulateMatch,
  simulateTournamentFoundation
} from "@world-cup-2026-predictor/api";
import type {
  EloXgPreset,
  HealthResponse,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  LiveEloRatedTeamEntry,
  LiveEloRatingsFoundationResponse,
  ModelInfoResponse,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  PredictMatchFromLiveEloSuccessResponse,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SimulateMatchSuccessResponse,
  SupportedHistoricalTournamentYear,
  TeamRatingFoundationEntry,
  TeamRatingTier,
  TeamRatingsFoundationResponse,
  TournamentSimulationSuccessResponse
} from "@world-cup-2026-predictor/api";

export type { EloXgPreset };
export type { TeamRatingFoundationEntry, TeamRatingTier, TeamRatingsFoundationResponse };
export type { LiveEloRatedTeamEntry, LiveEloRatingsFoundationResponse };
export type { PredictMatchFromLiveEloRequest, PredictMatchFromLiveEloResponse, PredictMatchFromLiveEloSuccessResponse };

export const HISTORICAL_TOURNAMENT_YEARS = [2010, 2014, 2018, 2022] as const satisfies readonly SupportedHistoricalTournamentYear[];

export interface DashboardSnapshot {
  health: HealthResponse;
  modelInfo: ModelInfoResponse;
  matchPreview: SimulateMatchSuccessResponse;
  historicalReplayAudit: HistoricalReplayAuditResponse;
  historicalTournaments: HistoricalTournamentSummary[];
  tournamentSimulation: TournamentSimulationSuccessResponse;
  teamRatings: TeamRatingsFoundationResponse;
  liveEloRatings: LiveEloRatingsFoundationResponse;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function simulateDashboardMatch(request: SimulateMatchRequest): SimulateMatchResponse {
  return simulateMatch(request);
}

export function predictDashboardMatchFromLiveElo(request: PredictMatchFromLiveEloRequest): PredictMatchFromLiveEloResponse {
  return predictMatchFromLiveElo(request);
}

export function getDashboardAvailableLiveEloTeams(): string[] {
  return getAvailableLiveEloTeams();
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
    teamRatings: getTeamRatingsFoundation(),
    liveEloRatings: getLiveEloRatingsFoundation()
  };
}
