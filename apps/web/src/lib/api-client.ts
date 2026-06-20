import {
  getAvailableLiveEloTeams,
  getHealth,
  getWorldCup2026GroupDetail,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getLiveEloRatingsFoundation,
  getModelInfo,
  getTeamRatingsFoundation,
  getWorldCup2026DailyMatches,
  getWorldCup2026FixtureFoundation,
  getWorldCup2026GroupStandingsFoundation,
  getWorldCup2026LiveGroupStandings,
  getWorldCup2026KnockoutBracketFoundation,
  getWorldCup2026RoundOf32Foundation,
  predictMatchFromLiveElo,
  simulateMatch,
  simulateTournamentFoundation,
  simulateWorldCup2026KnockoutFixturesFoundation,
  simulateWorldCup2026RoundOf16Foundation,
  simulateWorldCup2026RoundOf16MatchesFoundation,
  simulateWorldCup2026QuarterfinalFoundation,
  simulateWorldCup2026QuarterfinalMatchesFoundation,
  simulateWorldCup2026FinalFoundation,
  simulateWorldCup2026FinalMatchFoundation,
  simulateWorldCup2026SemifinalFoundation,
  simulateWorldCup2026SemifinalMatchesFoundation,
  resolveWorldCup2026KnockoutWinnersFoundation,
  getWorldCup2026ThirdPlaceMatchFoundation,
  simulateWorldCup2026ThirdPlaceMatchFoundation
} from "@world-cup-2026-predictor/api";
import type {
  EloXgPreset,
  GetWorldCup2026GroupDetailInput,
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
  TournamentSimulationSuccessResponse,
  GetWorldCup2026DailyMatchesInput,
  WorldCup2026DailyMatchesResponse,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026DailyMatchState,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesProviderMetadata,
  WorldCup2026FixtureFoundationResponse,
  WorldCup2026GroupStandingsFoundationResponse,
  WorldCup2026LiveGroupStandingsResponse,
  WorldCup2026StandingsMode,
  WorldCup2026LiveStandingsSyncMetadata,
  WorldCup2026KnockoutBracketFoundationResponse,
  WorldCup2026KnockoutSimulationFoundationResponse,
  WorldCup2026QuarterfinalFoundationResponse,
  WorldCup2026QuarterfinalMatchSimulationFoundationResponse,
  WorldCup2026FinalFoundationResponse,
  WorldCup2026FinalMatchSimulationFoundationResponse,
  WorldCup2026SemifinalFoundationResponse,
  WorldCup2026SemifinalMatchSimulationFoundationResponse,
  WorldCup2026RoundOf16FoundationResponse,
  WorldCup2026RoundOf16MatchSimulationFoundationResponse,
  WorldCup2026RoundOf32FoundationResponse,
  WorldCup2026KnockoutWinnerResolutionResponse,
  WorldCup2026ThirdPlaceMatchFoundationResponse,
  WorldCup2026ThirdPlaceMatchSimulationFoundationResponse,
  WorldCup2026GroupDetailResponse,
  WorldCup2026GroupDetailSuccessResponse,
  WorldCup2026GroupDetailMatch,
  WorldCup2026GroupDetailTeamEntry,
  WorldCup2026GroupDetailQualificationSummary,
  WorldCup2026GroupDetailProviderMetadata,
  WorldCup2026GroupDetailValidationErrorResponse,
  WorldCup2026GroupStandingEntry,
  WorldCup2026GroupProjection,
  WorldCup2026GroupProjectionFixture,
  WorldCup2026GroupProjectionQualification,
  WorldCup2026GroupProjectionSource,
  WorldCup2026GroupProjectionStatus
} from "@world-cup-2026-predictor/api";

export type { EloXgPreset };
export type { TeamRatingFoundationEntry, TeamRatingTier, TeamRatingsFoundationResponse };
export type { LiveEloRatedTeamEntry, LiveEloRatingsFoundationResponse };
export type { PredictMatchFromLiveEloRequest, PredictMatchFromLiveEloResponse, PredictMatchFromLiveEloSuccessResponse };
export type {
  GetWorldCup2026DailyMatchesInput,
  WorldCup2026DailyMatchesResponse,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026DailyMatchState,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesProviderMetadata
};
export type { WorldCup2026FixtureFoundationResponse };
export type { WorldCup2026GroupStandingsFoundationResponse };
export type { WorldCup2026LiveGroupStandingsResponse, WorldCup2026StandingsMode, WorldCup2026LiveStandingsSyncMetadata };
export type { WorldCup2026RoundOf32FoundationResponse };
export type { WorldCup2026KnockoutBracketFoundationResponse };
export type { WorldCup2026KnockoutSimulationFoundationResponse };
export type { WorldCup2026RoundOf16FoundationResponse };
export type { WorldCup2026RoundOf16MatchSimulationFoundationResponse };
export type { WorldCup2026QuarterfinalFoundationResponse };
export type { WorldCup2026QuarterfinalMatchSimulationFoundationResponse };
export type { WorldCup2026FinalFoundationResponse };
export type { WorldCup2026FinalMatchSimulationFoundationResponse };
export type { WorldCup2026SemifinalFoundationResponse };
export type { WorldCup2026SemifinalMatchSimulationFoundationResponse };
export type { WorldCup2026KnockoutWinnerResolutionResponse };
export type { WorldCup2026ThirdPlaceMatchFoundationResponse };
export type { WorldCup2026ThirdPlaceMatchSimulationFoundationResponse };
export type {
  GetWorldCup2026GroupDetailInput,
  WorldCup2026GroupDetailResponse,
  WorldCup2026GroupDetailSuccessResponse,
  WorldCup2026GroupDetailMatch,
  WorldCup2026GroupDetailTeamEntry,
  WorldCup2026GroupDetailQualificationSummary,
  WorldCup2026GroupDetailProviderMetadata,
  WorldCup2026GroupDetailValidationErrorResponse,
  WorldCup2026GroupStandingEntry,
  WorldCup2026GroupProjection,
  WorldCup2026GroupProjectionFixture,
  WorldCup2026GroupProjectionQualification,
  WorldCup2026GroupProjectionSource,
  WorldCup2026GroupProjectionStatus
};

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
  worldCup2026Fixtures: WorldCup2026FixtureFoundationResponse;
  worldCup2026Standings: WorldCup2026LiveGroupStandingsResponse;
  worldCup2026RoundOf32: WorldCup2026RoundOf32FoundationResponse;
  worldCup2026KnockoutBracket: WorldCup2026KnockoutBracketFoundationResponse;
  worldCup2026KnockoutSimulation: WorldCup2026KnockoutSimulationFoundationResponse;
  worldCup2026RoundOf16: WorldCup2026RoundOf16FoundationResponse;
  worldCup2026RoundOf16MatchSimulation: WorldCup2026RoundOf16MatchSimulationFoundationResponse;
  worldCup2026Quarterfinal: WorldCup2026QuarterfinalFoundationResponse;
  worldCup2026QuarterfinalMatchSimulation: WorldCup2026QuarterfinalMatchSimulationFoundationResponse;
  worldCup2026Final: WorldCup2026FinalFoundationResponse;
  worldCup2026FinalMatchSimulation: WorldCup2026FinalMatchSimulationFoundationResponse;
  worldCup2026Semifinal: WorldCup2026SemifinalFoundationResponse;
  worldCup2026SemifinalMatchSimulation: WorldCup2026SemifinalMatchSimulationFoundationResponse;
  worldCup2026KnockoutWinnerResolution: WorldCup2026KnockoutWinnerResolutionResponse;
  worldCup2026ThirdPlaceMatch: WorldCup2026ThirdPlaceMatchFoundationResponse;
  worldCup2026ThirdPlaceMatchSimulation: WorldCup2026ThirdPlaceMatchSimulationFoundationResponse;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatElo(value: number): string {
  return Math.round(value).toString();
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

export async function getDashboardDailyMatches(
  input?: GetWorldCup2026DailyMatchesInput
): Promise<WorldCup2026DailyMatchesSuccessResponse> {
  const response = await getWorldCup2026DailyMatches(input);

  if (response.status !== "success") {
    throw new Error("Dashboard daily matches request must remain valid.");
  }

  return response;
}

export function getDashboardSnapshot(): DashboardSnapshot {
  const worldCup2026Fixtures = getWorldCup2026FixtureFoundation();
  const defaultScheduledFixture = worldCup2026Fixtures.fixtures[0];

  if (defaultScheduledFixture === undefined) {
    throw new Error("World Cup 2026 fixture foundation must expose at least one group-stage fixture.");
  }

  const matchPreview = simulateMatch({
    homeTeam: defaultScheduledFixture.homeTeam,
    awayTeam: defaultScheduledFixture.awayTeam,
    expectedHomeGoals: 1.25,
    expectedAwayGoals: 0.85,
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
    liveEloRatings: getLiveEloRatingsFoundation(),
    worldCup2026Fixtures,
    worldCup2026Standings: getWorldCup2026LiveGroupStandings(),
    worldCup2026RoundOf32: getWorldCup2026RoundOf32Foundation(),
    worldCup2026KnockoutBracket: getWorldCup2026KnockoutBracketFoundation(),
    worldCup2026KnockoutSimulation: simulateWorldCup2026KnockoutFixturesFoundation(),
    worldCup2026RoundOf16: simulateWorldCup2026RoundOf16Foundation(),
    worldCup2026RoundOf16MatchSimulation: simulateWorldCup2026RoundOf16MatchesFoundation(),
    worldCup2026Quarterfinal: simulateWorldCup2026QuarterfinalFoundation(),
    worldCup2026QuarterfinalMatchSimulation: simulateWorldCup2026QuarterfinalMatchesFoundation(),
    worldCup2026Final: simulateWorldCup2026FinalFoundation(),
    worldCup2026FinalMatchSimulation: simulateWorldCup2026FinalMatchFoundation(),
    worldCup2026Semifinal: simulateWorldCup2026SemifinalFoundation(),
    worldCup2026SemifinalMatchSimulation: simulateWorldCup2026SemifinalMatchesFoundation(),
    worldCup2026KnockoutWinnerResolution: resolveWorldCup2026KnockoutWinnersFoundation(),
    worldCup2026ThirdPlaceMatch: getWorldCup2026ThirdPlaceMatchFoundation(),
    worldCup2026ThirdPlaceMatchSimulation: simulateWorldCup2026ThirdPlaceMatchFoundation()
  };
}

export async function getDashboardGroupDetail(
  input: GetWorldCup2026GroupDetailInput
): Promise<WorldCup2026GroupDetailSuccessResponse> {
  const response = await getWorldCup2026GroupDetail(input);
  if (response.status !== "success") {
    throw new Error(`Group detail request failed for group ${input.group}.`);
  }
  return response;
}
