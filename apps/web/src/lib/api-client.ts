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
  SimulateMatchSuccessResponse,
  SupportedHistoricalTournamentYear
} from "@world-cup-2026-predictor/api";

export const HISTORICAL_TOURNAMENT_YEARS = [2010, 2014, 2018, 2022] as const satisfies readonly SupportedHistoricalTournamentYear[];

export interface DashboardSnapshot {
  health: HealthResponse;
  modelInfo: ModelInfoResponse;
  matchPreview: SimulateMatchSuccessResponse;
  historicalReplayAudit: HistoricalReplayAuditResponse;
  historicalTournaments: HistoricalTournamentSummary[];
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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
    historicalTournaments
  };
}
