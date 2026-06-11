import {
  getHealth,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getModelInfo,
  simulateMatch
} from "@world-cup-2026-predictor/api";
import type {
  HealthResponse,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  ModelInfoResponse,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SimulateMatchSuccessResponse,
  SupportedHistoricalTournamentYear
} from "@world-cup-2026-predictor/api";

export const HISTORICAL_TOURNAMENT_YEARS = [2010, 2014, 2018, 2022] as const satisfies readonly SupportedHistoricalTournamentYear[];

export interface TournamentProbabilityEntry {
  rank: number;
  team: string;
  championProbability: number;
  runnerUpProbability: number;
}

export interface TournamentSimulationFoundation {
  simulationCount: number;
  simulationEngine: string;
  dataScope: string;
  foundationWarning: string;
  apiNote: string;
  entries: TournamentProbabilityEntry[];
}

export const FOUNDATION_TOURNAMENT_SIMULATION: TournamentSimulationFoundation = {
  simulationCount: 1000,
  simulationEngine: "Monte Carlo — Poisson/Dixon-Coles, simplified bracket",
  dataScope: "Illustrative baseline seed ratings — not calibrated from real pre-tournament data",
  foundationWarning:
    "Foundation scenario only. These probabilities are illustrative estimates from uncalibrated seed ratings, not published model predictions.",
  apiNote:
    "A tournament simulation API handler is planned. Until then, this section shows a static foundation preview. Use match simulation above for current model output.",
  entries: [
    { rank: 1, team: "Brazil", championProbability: 0.142, runnerUpProbability: 0.108 },
    { rank: 2, team: "France", championProbability: 0.118, runnerUpProbability: 0.096 },
    { rank: 3, team: "Argentina", championProbability: 0.114, runnerUpProbability: 0.092 },
    { rank: 4, team: "England", championProbability: 0.098, runnerUpProbability: 0.078 },
    { rank: 5, team: "Spain", championProbability: 0.094, runnerUpProbability: 0.074 }
  ]
};

export interface DashboardSnapshot {
  health: HealthResponse;
  modelInfo: ModelInfoResponse;
  matchPreview: SimulateMatchSuccessResponse;
  historicalReplayAudit: HistoricalReplayAuditResponse;
  historicalTournaments: HistoricalTournamentSummary[];
  tournamentSimulation: TournamentSimulationFoundation;
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
    tournamentSimulation: FOUNDATION_TOURNAMENT_SIMULATION
  };
}
