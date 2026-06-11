import {
  DEFAULT_POISSON_CONFIG,
  HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION,
  HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING,
  aggregateOutcomeProbabilities,
  generateScoreMatrix,
  getMostLikelyScorelines,
  runMatchSimulations
} from "../../model/src/index.js";
import { getHealth } from "./health.js";
import { getModelInfo } from "./model-info.js";
import { buildApiMetadata } from "./schemas.js";
import type {
  ApiRoutes,
  ApiValidationIssue,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  HistoricalTournamentSummaryResponse,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SupportedHistoricalTournamentYear
} from "./schemas.js";

const MAX_API_MONTE_CARLO_SIMULATIONS = 10_000;
const SUPPORTED_HISTORICAL_YEARS = [2010, 2014, 2018, 2022] as const;

const HISTORICAL_TOURNAMENT_SUMMARIES: Record<SupportedHistoricalTournamentYear, HistoricalTournamentSummary> = {
  2010: {
    year: 2010,
    tournamentName: "FIFA World Cup 2010",
    matchCount: 64,
    expectedMatchCount: 64,
    groupStageMatchCount: 48,
    knockoutAndPlacementMatchCount: 16,
    champion: "Spain",
    runnerUp: "Netherlands",
    thirdPlace: "Germany",
    datasetStatus: "complete_curated_fixture_foundation",
    warnings: ["Historical tournament summary is local curated fixture metadata, not a live data service."]
  },
  2014: {
    year: 2014,
    tournamentName: "FIFA World Cup 2014",
    matchCount: 64,
    expectedMatchCount: 64,
    groupStageMatchCount: 48,
    knockoutAndPlacementMatchCount: 16,
    champion: "Germany",
    runnerUp: "Argentina",
    thirdPlace: "Netherlands",
    datasetStatus: "complete_curated_fixture_foundation",
    warnings: ["Historical tournament summary is local curated fixture metadata, not a live data service."]
  },
  2018: {
    year: 2018,
    tournamentName: "FIFA World Cup 2018",
    matchCount: 64,
    expectedMatchCount: 64,
    groupStageMatchCount: 48,
    knockoutAndPlacementMatchCount: 16,
    champion: "France",
    runnerUp: "Croatia",
    thirdPlace: "Belgium",
    datasetStatus: "complete_curated_fixture_foundation",
    warnings: ["Historical tournament summary is local curated fixture metadata, not a live data service."]
  },
  2022: {
    year: 2022,
    tournamentName: "FIFA World Cup 2022",
    matchCount: 64,
    expectedMatchCount: 64,
    groupStageMatchCount: 48,
    knockoutAndPlacementMatchCount: 16,
    champion: "Argentina",
    runnerUp: "France",
    thirdPlace: "Croatia",
    datasetStatus: "complete_curated_fixture_foundation",
    warnings: ["Historical tournament summary is local curated fixture metadata, not a live data service."]
  }
};

function isSupportedHistoricalYear(year: number): year is SupportedHistoricalTournamentYear {
  return SUPPORTED_HISTORICAL_YEARS.includes(year as SupportedHistoricalTournamentYear);
}

function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

function validateFiniteNonNegativeNumber(value: number, field: string): ApiValidationIssue[] {
  if (!Number.isFinite(value) || value < 0) {
    return [{ field, message: `${field} must be a finite number greater than or equal to 0.` }];
  }

  return [];
}

function validatePositiveInteger(value: number, field: string, maxValue?: number): ApiValidationIssue[] {
  if (!Number.isInteger(value) || value < 1) {
    return [{ field, message: `${field} must be a positive integer.` }];
  }

  if (maxValue !== undefined && value > maxValue) {
    return [{ field, message: `${field} must be ${maxValue} or less.` }];
  }

  return [];
}

function validateSimulateMatchRequest(request: SimulateMatchRequest): ApiValidationIssue[] {
  const issues: ApiValidationIssue[] = [];

  if (!isNonEmptyText(request.homeTeam)) {
    issues.push({ field: "homeTeam", message: "homeTeam is required." });
  }

  if (!isNonEmptyText(request.awayTeam)) {
    issues.push({ field: "awayTeam", message: "awayTeam is required." });
  }

  if (isNonEmptyText(request.homeTeam) && isNonEmptyText(request.awayTeam) && request.homeTeam.trim() === request.awayTeam.trim()) {
    issues.push({ field: "awayTeam", message: "awayTeam must be different from homeTeam." });
  }

  issues.push(...validateFiniteNonNegativeNumber(request.expectedHomeGoals, "expectedHomeGoals"));
  issues.push(...validateFiniteNonNegativeNumber(request.expectedAwayGoals, "expectedAwayGoals"));

  if (request.maxGoals !== undefined) {
    issues.push(...validatePositiveInteger(request.maxGoals, "maxGoals", 20));
  }

  if (request.mostLikelyScorelineLimit !== undefined) {
    issues.push(...validatePositiveInteger(request.mostLikelyScorelineLimit, "mostLikelyScorelineLimit"));
  }

  if (request.monteCarlo !== undefined) {
    issues.push(...validatePositiveInteger(request.monteCarlo.simulationCount, "monteCarlo.simulationCount", MAX_API_MONTE_CARLO_SIMULATIONS));

    if (request.monteCarlo.seed !== undefined && (!Number.isFinite(request.monteCarlo.seed) || !Number.isInteger(request.monteCarlo.seed))) {
      issues.push({ field: "monteCarlo.seed", message: "monteCarlo.seed must be a finite integer." });
    }

    if (request.monteCarlo.mostCommonScorelineLimit !== undefined) {
      issues.push(...validatePositiveInteger(request.monteCarlo.mostCommonScorelineLimit, "monteCarlo.mostCommonScorelineLimit"));
    }
  }

  return issues;
}

export function simulateMatch(request: SimulateMatchRequest): SimulateMatchResponse {
  const issues = validateSimulateMatchRequest(request);

  if (issues.length > 0) {
    return {
      status: "validation_error",
      issues,
      metadata: buildApiMetadata(["Request failed validation before model helpers were called."])
    };
  }

  const maxGoals = request.maxGoals ?? DEFAULT_POISSON_CONFIG.maxGoals;
  const normalizeMatrix = request.normalizeMatrix ?? DEFAULT_POISSON_CONFIG.normalizeMatrix;
  const scoreMatrix = generateScoreMatrix(
    {
      expectedHomeGoals: request.expectedHomeGoals,
      expectedAwayGoals: request.expectedAwayGoals
    },
    {
      maxGoals,
      normalizeMatrix
    }
  );
  const mostLikelyLimit = request.mostLikelyScorelineLimit ?? 5;
  const response = {
    status: "success" as const,
    request: {
      homeTeam: request.homeTeam.trim(),
      awayTeam: request.awayTeam.trim(),
      expectedHomeGoals: request.expectedHomeGoals,
      expectedAwayGoals: request.expectedAwayGoals,
      maxGoals,
      normalizeMatrix
    },
    outcomeProbabilities: aggregateOutcomeProbabilities(scoreMatrix),
    mostLikelyScorelines: getMostLikelyScorelines(scoreMatrix, mostLikelyLimit),
    warnings: ["Expected-goals inputs are caller supplied; this handler does not calibrate team strength."],
    metadata: buildApiMetadata(["Match simulation uses deterministic model helpers when a Monte Carlo seed is supplied."])
  };

  if (request.monteCarlo === undefined) {
    return response;
  }

  return {
    ...response,
    monteCarloSimulation: runMatchSimulations(scoreMatrix, {
      simulationCount: request.monteCarlo.simulationCount,
      ...(request.monteCarlo.seed === undefined ? {} : { seed: request.monteCarlo.seed }),
      ...(request.monteCarlo.mostCommonScorelineLimit === undefined
        ? {}
        : { mostCommonScorelineLimit: request.monteCarlo.mostCommonScorelineLimit })
    })
  };
}

export function getHistoricalTournamentSummary(year: number): HistoricalTournamentSummaryResponse {
  if (!isSupportedHistoricalYear(year)) {
    return {
      status: "validation_error",
      issues: [{ field: "year", message: `year must be one of: ${SUPPORTED_HISTORICAL_YEARS.join(", ")}.` }],
      supportedYears: SUPPORTED_HISTORICAL_YEARS,
      metadata: buildApiMetadata(["Historical tournament summaries are available only for curated complete fixture years."])
    };
  }

  return {
    status: "success",
    summary: HISTORICAL_TOURNAMENT_SUMMARIES[year],
    metadata: buildApiMetadata(["Historical tournament summary is a static API foundation response over curated local fixture facts."])
  };
}

export function getHistoricalReplayAudit(): HistoricalReplayAuditResponse {
  return {
    status: "success",
    auditVersion: HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION,
    apiReadiness: "ready_with_warnings",
    supportedYears: SUPPORTED_HISTORICAL_YEARS,
    metricAvailability: {
      brierScore: true,
      logLoss: true,
      top1Hit: true,
      top3Hit: true,
      top5Hit: true
    },
    componentAvailability: {
      datasetCompleteness: true,
      bracketReconstruction: true,
      eloSnapshotReplay: true,
      monteCarloReplay: true,
      replayValidation: true
    },
    warnings: [HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING],
    knownGaps: [
      "Full pre-tournament international match history is not guaranteed for historical Elo snapshots.",
      "Elo-to-expected-goals mapping is not calibrated.",
      "Replay outputs are validation evidence, not public predictive accuracy."
    ],
    metadata: buildApiMetadata(["Historical replay audit response exposes readiness metadata without recomputing model reports."])
  };
}

export const apiRoutes: ApiRoutes = {
  getHealth,
  getModelInfo,
  simulateMatch,
  getHistoricalTournamentSummary,
  getHistoricalReplayAudit
};
