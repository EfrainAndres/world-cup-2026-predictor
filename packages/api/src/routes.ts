import {
  DEFAULT_ELO_CONFIG,
  DEFAULT_POISSON_CONFIG,
  ELO_XG_PRESETS,
  HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION,
  HISTORICAL_REPLAY_ACCURACY_AUDIT_WARNING,
  aggregateOutcomeProbabilities,
  eloToExpectedGoals,
  generateScoreMatrix,
  getMostLikelyScorelines,
  runLiveEloPipeline,
  runMatchSimulations,
  runTournamentRepeatedRuns
} from "../../model/src/index.js";
import {
  LIVE_ELO_FOUNDATION_DATA_SCOPE,
  LIVE_ELO_FOUNDATION_LATEST_MATCH_DATE,
  LIVE_ELO_FOUNDATION_MATCH_COUNT,
  LIVE_ELO_FOUNDATION_MATCHES,
  LIVE_ELO_INTERNATIONAL_SUPPLEMENT_DATA_SCOPE,
  LIVE_ELO_INTERNATIONAL_SUPPLEMENT_LATEST_MATCH_DATE,
  loadLiveEloInternationalSupplement
} from "./live-elo-data.js";
import { LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING, mergeEloMatchSources } from "./international-elo-adapter.js";
import { getHealth } from "./health.js";
import { getModelInfo } from "./model-info.js";
import { assessPredictionConfidence } from "./prediction-confidence.js";
import {
  createLocalStaticResultsProvider,
  resolveWorldCup2026ResultsProviderFoundation
} from "./results-provider-foundation.js";
import { getWorldCup2026LiveGroupStandings } from "./live-group-standings.js";
import { buildWorldCup2026GroupDetail } from "./group-detail.js";
import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import { ingestWorldCup2026ResultsIntoLiveElo } from "./elo-ingestion.js";
import { getWorldCup2026DailyMatches as getWorldCup2026DailyMatchesHandler } from "./daily-matches.js";
import { buildWorldCup2026PredictionSnapshot, WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "./snapshot-service.js";
import {
  validatePredictionHistoryListQuery
} from "./prediction-history.js";
import {
  evaluateWorldCup2026PredictionSnapshotAsync,
  evaluateWorldCup2026PredictionSnapshot,
  summarizeWorldCup2026ModelReality
} from "./prediction-evaluation-service.js";
import {
  PredictionHistoryPersistenceConfigError,
  isPredictionHistoryPersistenceError,
  resolvePredictionHistoryPersistence
} from "./persistence-runtime.js";
import type { PredictionHistoryPersistenceResolution } from "./persistence-runtime.js";
import { calculateWorldCup2026TournamentForm } from "./tournament-form.js";
import { resolveTournamentFormPredictionAdjustment } from "./tournament-form-prediction-integration.js";
import { buildApiMetadata } from "./schemas.js";
import { canonicalizeTeamName, getAvailableTeamCoverage, normalizeTeamSearchText, resolveTeamAlias, suggestAvailableTeams } from "./team-aliases.js";
import {
  STATSBOMB_SIGNAL_VERSION,
  STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90,
  STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90,
  calculateStatsBombPredictionAdjustment
} from "./statsbomb-prediction-signal.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";
import { teamNameToId } from "./providers/statsbomb/statsbomb-team-mapping.js";
import {
  WORLD_CUP_2026_BEST_THIRD_PLACE_RANKING,
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_FALLBACK_RATING_WARNING,
  WORLD_CUP_2026_FALLBACK_SEED_RATING,
  WORLD_CUP_2026_GROUP_STANDINGS,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_KNOCKOUT_BRACKET,
  WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER,
  WORLD_CUP_2026_QUALIFIED_TEAMS,
  WORLD_CUP_2026_ROUND_OF_32_FIXTURES,
  WORLD_CUP_2026_TEAM_NAMES,
  buildWorldCup2026CoverageEntries
} from "./world-cup-2026-teams.js";
import type { WorldCup2026CoverageEntry } from "./world-cup-2026-teams.js";
import type {
  ApiRoutes,
  CreateWorldCup2026PredictionEvaluationResponse,
  ApiValidationIssue,
  CreateWorldCup2026PredictionSnapshotResponse,
  GetWorldCup2026ModelRealitySummaryResponse,
  GetWorldCup2026PredictionEvaluationResponse,
  GetWorldCup2026PredictionSnapshotResponse,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  HistoricalTournamentSummaryResponse,
  ListWorldCup2026PredictionEvaluationsResponse,
  PredictionHistoryListQuery,
  PredictionHistoryListResponse,
  ListWorldCup2026PredictionSnapshotsResponse,
  LiveEloRatingSource,
  LiveEloRatingsFoundationOptions,
  LiveEloRatedTeamEntry,
  LiveEloRatingsFoundationResponse,
  PredictionHistoryPersistenceErrorCode,
  PredictionHistoryPersistenceErrorResponse,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  PredictMatchFromLiveEloSuccessResponse,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SupportedHistoricalTournamentYear,
  TeamRatingFoundationEntry,
  TeamRatingsFoundationResponse,
  TournamentSimulationSuccessResponse,
  TournamentSimulationTeamResult,
  WorldCup2026FixtureFoundationResponse,
  WorldCup2026ResultsProviderFoundationResponse,
  WorldCup2026GroupStandingsFoundationResponse,
  WorldCup2026KnockoutBracketFoundationResponse,
  WorldCup2026KnockoutSimulationFixture,
  WorldCup2026KnockoutSimulationFoundationResponse,
  WorldCup2026ProjectedQualifier,
  WorldCup2026RoundOf16Fixture,
  WorldCup2026RoundOf16FoundationResponse,
  WorldCup2026RoundOf16MatchSimulationFixture,
  WorldCup2026RoundOf16MatchSimulationFoundationResponse,
  WorldCup2026QuarterfinalFoundationResponse,
  WorldCup2026QuarterfinalFixture,
  WorldCup2026QuarterfinalMatchSimulationFixture,
  WorldCup2026QuarterfinalMatchSimulationFoundationResponse,
  WorldCup2026QuarterfinalQualifier,
  WorldCup2026FinalFixture,
  WorldCup2026FinalFoundationResponse,
  WorldCup2026FinalMatchSimulationFixture,
  WorldCup2026FinalMatchSimulationFoundationResponse,
  WorldCup2026FinalQualifier,
  WorldCup2026KnockoutWinnerResolutionResponse,
  WorldCup2026ResolvedKnockoutWinner,
  WorldCup2026ThirdPlaceMatchFoundationResponse,
  WorldCup2026ThirdPlaceMatchFixture,
  WorldCup2026ThirdPlaceParticipant,
  WorldCup2026ThirdPlaceMatchSimulationFixture,
  WorldCup2026ThirdPlaceMatchSimulationFoundationResponse,
  WorldCup2026SemifinalFixture,
  WorldCup2026SemifinalFoundationResponse,
  WorldCup2026SemifinalMatchSimulationFixture,
  WorldCup2026SemifinalMatchSimulationFoundationResponse,
  WorldCup2026SemifinalQualifier,
  WorldCup2026RoundOf32FoundationResponse,
  WorldCup2026EloIngestionFoundationResponse,
  CreateWorldCup2026PredictionSnapshotRequest,
  CreateWorldCup2026PredictionEvaluationRequest,
  GetWorldCup2026TournamentFormFoundationInput,
  WorldCup2026TournamentFormFoundationResponse,
  GetWorldCup2026GroupDetailInput,
  WorldCup2026GroupDetailResponse
} from "./schemas.js";

const MAX_API_MONTE_CARLO_SIMULATIONS = 10_000;
const SUPPORTED_HISTORICAL_YEARS = [2010, 2014, 2018, 2022] as const;

const NULL_PROFILE_SOURCE: TeamPerformanceProfileSource = {
  getProfile(_teamId: string) { return null; },
  getAvailableTeamIds() { return []; },
};

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

  if (
    isNonEmptyText(request.homeTeam) &&
    isNonEmptyText(request.awayTeam) &&
    request.homeTeam.trim().toLocaleLowerCase() === request.awayTeam.trim().toLocaleLowerCase()
  ) {
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

function validatePredictMatchFromLiveEloRequest(request: PredictMatchFromLiveEloRequest): ApiValidationIssue[] {
  const issues: ApiValidationIssue[] = [];

  if (!isNonEmptyText(request.homeTeam)) {
    issues.push({ field: "homeTeam", message: "homeTeam is required." });
  }

  if (!isNonEmptyText(request.awayTeam)) {
    issues.push({ field: "awayTeam", message: "awayTeam is required." });
  }

  if (
    isNonEmptyText(request.homeTeam) &&
    isNonEmptyText(request.awayTeam) &&
    request.homeTeam.trim().toLocaleLowerCase() === request.awayTeam.trim().toLocaleLowerCase()
  ) {
    issues.push({ field: "awayTeam", message: "awayTeam must be different from homeTeam." });
  }

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

  if (request.preset !== undefined && !VALID_PREDICTION_PRESETS.has(request.preset)) {
    issues.push({
      field: "preset",
      message: `preset must be one of: ${[...VALID_PREDICTION_PRESETS].join(", ")}.`
    });
  }

  if (
    request.tournamentResultsAdjustment !== undefined &&
    typeof request.tournamentResultsAdjustment.enabled !== "boolean"
  ) {
    issues.push({
      field: "tournamentResultsAdjustment.enabled",
      message: "tournamentResultsAdjustment.enabled must be a boolean."
    });
  }

  if (
    request.tournamentResultsAdjustment?.cutoffAt !== undefined &&
    Number.isNaN(Date.parse(request.tournamentResultsAdjustment.cutoffAt))
  ) {
    issues.push({
      field: "tournamentResultsAdjustment.cutoffAt",
      message: "tournamentResultsAdjustment.cutoffAt must be a valid timestamp."
    });
  }

  if (
    request.tournamentFormAdjustment !== undefined &&
    typeof request.tournamentFormAdjustment.enabled !== "boolean"
  ) {
    issues.push({
      field: "tournamentFormAdjustment.enabled",
      message: "tournamentFormAdjustment.enabled must be a boolean."
    });
  }

  if (
    request.tournamentFormAdjustment?.cutoffAt !== undefined &&
    Number.isNaN(Date.parse(request.tournamentFormAdjustment.cutoffAt))
  ) {
    issues.push({
      field: "tournamentFormAdjustment.cutoffAt",
      message: "tournamentFormAdjustment.cutoffAt must be a valid timestamp."
    });
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

const SAMPLE_TOURNAMENT_SEED = 2026;
const SAMPLE_TOURNAMENT_RUN_COUNT = 1000;
const SAMPLE_SCORE_MATRIX_MAX_GOALS = 5;

const SAMPLE_GROUP_A_TEAMS = ["Brazil", "France", "Germany", "Portugal"] as const;
const SAMPLE_GROUP_B_TEAMS = ["Argentina", "England", "Spain", "Netherlands"] as const;

function buildRoundRobinMatches(
  teams: readonly string[],
  scoreMatrix: ReturnType<typeof generateScoreMatrix>
): { homeTeam: string; awayTeam: string; scoreMatrix: ReturnType<typeof generateScoreMatrix> }[] {
  const matches: { homeTeam: string; awayTeam: string; scoreMatrix: ReturnType<typeof generateScoreMatrix> }[] = [];

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      const homeTeam = teams[i];
      const awayTeam = teams[j];

      if (homeTeam !== undefined && awayTeam !== undefined) {
        matches.push({ homeTeam, awayTeam, scoreMatrix });
      }
    }
  }

  return matches;
}

export function simulateTournamentFoundation(): TournamentSimulationSuccessResponse {
  const groupScoreMatrix = generateScoreMatrix(
    { expectedHomeGoals: 1.1, expectedAwayGoals: 1.1 },
    { maxGoals: SAMPLE_SCORE_MATRIX_MAX_GOALS, normalizeMatrix: true }
  );

  const knockoutScoreMatrix = generateScoreMatrix(
    { expectedHomeGoals: 1.0, expectedAwayGoals: 1.0 },
    { maxGoals: SAMPLE_SCORE_MATRIX_MAX_GOALS, normalizeMatrix: true }
  );

  const input = {
    name: "Sample Foundation Tournament",
    groups: [
      {
        name: "Group A",
        teams: SAMPLE_GROUP_A_TEAMS.map((name) => ({ name })),
        matches: buildRoundRobinMatches(SAMPLE_GROUP_A_TEAMS, groupScoreMatrix)
      },
      {
        name: "Group B",
        teams: SAMPLE_GROUP_B_TEAMS.map((name) => ({ name })),
        matches: buildRoundRobinMatches(SAMPLE_GROUP_B_TEAMS, groupScoreMatrix)
      }
    ],
    knockoutScoreMatrix,
    groupQualifiersCount: 2
  };

  const result = runTournamentRepeatedRuns(input, {
    runCount: SAMPLE_TOURNAMENT_RUN_COUNT,
    seed: SAMPLE_TOURNAMENT_SEED
  });

  const runnerUpMap = new Map(result.runnerUpProbabilities.map((r) => [r.team, r.probability]));

  const teamResults: TournamentSimulationTeamResult[] = result.championProbabilities.map((entry, index) => ({
    rank: index + 1,
    team: entry.team,
    championProbability: entry.probability,
    runnerUpProbability: runnerUpMap.get(entry.team) ?? 0
  }));

  return {
    status: "success",
    simulationCount: result.totalRuns,
    tournamentName: input.name,
    dataScope: "sample_foundation_8_team_tournament",
    teamResults,
    warnings: [
      "Sample foundation tournament uses a simplified 8-team input with equal expected goals.",
      "These probabilities are not calibrated from real match data or official FIFA 2026 fixtures.",
      "Live local simulation foundation, not a public forecast."
    ],
    metadata: buildApiMetadata([
      "Tournament simulation uses runTournamentRepeatedRuns with a seeded deterministic 8-team sample input.",
      "No network calls, database, or external services are used."
    ])
  };
}

export function getWorldCup2026FixtureFoundation(): WorldCup2026FixtureFoundationResponse {
  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_group_stage_fixture_foundation",
    groupCount: WORLD_CUP_2026_FIXTURE_GROUPS.length,
    teamCount: WORLD_CUP_2026_TEAM_NAMES.length,
    fixtureCount: WORLD_CUP_2026_GROUP_STAGE_FIXTURES.length,
    fixturesPerGroup: 6,
    matchesPerTeam: 3,
    groups: WORLD_CUP_2026_FIXTURE_GROUPS,
    fixtures: WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
    warnings: [
      "This section shows local curated tournament structure data. Standings and full tournament simulation are planned next.",
      "Group-stage fixture dates and venues are deferred in this foundation response.",
      "Fixture data is static local structure data, not real-time scores or an external feed."
    ],
    metadata: buildApiMetadata([
      "World Cup 2026 fixture foundation exposes Groups A-L and deterministic group-stage pairings only.",
      "Each group contains 4 teams, 6 fixtures, and 3 fixtures per team.",
      "No standings, knockout bracket simulation, real-time scores, network calls, database, or external services are used."
    ])
  };
}

export const getWorldCup2026DailyMatches = getWorldCup2026DailyMatchesHandler;

export async function getWorldCup2026GroupDetail(
  input: GetWorldCup2026GroupDetailInput
): Promise<WorldCup2026GroupDetailResponse> {
  const syncResult = await synchronizeWorldCup2026Results({});
  return buildWorldCup2026GroupDetail({
    ...input,
    syncResult,
    predictorFn: (homeTeam, awayTeam) =>
      predictMatchFromLiveElo({ homeTeam, awayTeam, preset: "balanced" })
  });
}

export function getWorldCup2026GroupStandingsFoundation(): WorldCup2026GroupStandingsFoundationResponse {
  const completedFixtureCount = WORLD_CUP_2026_GROUP_STANDINGS.reduce((sum, group) => sum + group.completedFixtureCount, 0);
  const pendingFixtureCount = WORLD_CUP_2026_GROUP_STANDINGS.reduce((sum, group) => sum + group.pendingFixtureCount, 0);
  const resultProvider = WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER.getMetadata();

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_group_standings_foundation",
    groupCount: WORLD_CUP_2026_GROUP_STANDINGS.length,
    teamCount: WORLD_CUP_2026_TEAM_NAMES.length,
    completedFixtureCount,
    pendingFixtureCount,
    resultProvider,
    groups: WORLD_CUP_2026_GROUP_STANDINGS,
    warnings: [
      "Standings are calculated from local normalized fixture results. Scheduled matches are ignored.",
      "This is a foundation standings view, not a live scores service or external provider integration.",
      ...resultProvider.warnings,
      "Tie-breaking is limited to points, goal difference, goals for, and team name until full FIFA rules are modeled."
    ],
    metadata: buildApiMetadata([
      "World Cup 2026 group standings foundation calculates tables from normalized result provider records.",
      "The current result provider is local_static with externalProviderEnabled=false.",
      "No live score service, external API, knockout bracket, database, or prediction formula changes are used."
    ])
  };
}

export function getWorldCup2026ResultsProviderFoundation(): WorldCup2026ResultsProviderFoundationResponse {
  return resolveWorldCup2026ResultsProviderFoundation();
}

export function getWorldCup2026RoundOf32Foundation(): WorldCup2026RoundOf32FoundationResponse {
  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_round_of_32_foundation",
    totalQualifiedTeams: WORLD_CUP_2026_QUALIFIED_TEAMS.length,
    groupWinners: WORLD_CUP_2026_QUALIFIED_TEAMS.filter((entry) => entry.qualificationSource === "group_winner").length,
    groupRunnersUp: WORLD_CUP_2026_QUALIFIED_TEAMS.filter((entry) => entry.qualificationSource === "group_runner_up").length,
    bestThirdPlaceTeams: WORLD_CUP_2026_BEST_THIRD_PLACE_RANKING.slice(0, 8).length,
    fixturesCount: WORLD_CUP_2026_ROUND_OF_32_FIXTURES.length,
    source: "current_local_standings_foundation",
    qualifiedTeams: WORLD_CUP_2026_QUALIFIED_TEAMS,
    fixtures: WORLD_CUP_2026_ROUND_OF_32_FIXTURES,
    warnings: [
      "Projected Round of 32 foundation based on current local standings. Official third-place pairing rules may differ and pending fixtures can change qualification.",
      "This phase does not simulate knockout winners, generate the Round of 16, or add champion probabilities."
    ],
    metadata: buildApiMetadata([
      "World Cup 2026 Round of 32 foundation derives 12 group winners, 12 runners-up, and 8 best third-place teams from current local standings.",
      "Round of 32 fixtures are deterministic projected foundation slots, not an official knockout bracket.",
      "No external API calls, live score service, knockout simulation, or prediction formula changes are used."
    ])
  };
}

export function getWorldCup2026KnockoutBracketFoundation(): WorldCup2026KnockoutBracketFoundationResponse {
  const { roundOf32, roundOf16, quarterfinals, semifinals, thirdPlaceMatch, final } = WORLD_CUP_2026_KNOCKOUT_BRACKET;
  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_knockout_bracket_foundation",
    roundOf32,
    roundOf16,
    quarterfinals,
    semifinals,
    thirdPlaceMatch,
    final,
    warnings: [
      "Projected bracket only. Round of 32 is derived from current local standings; rounds beyond R32 use placeholder progression slots.",
      "Winners are not simulated. No champion probabilities. No external API calls. No prediction formula changes."
    ],
    metadata: buildApiMetadata([
      "Knockout bracket foundation: R32 from local standings, R16 through Final are deterministic placeholder slots.",
      "Placeholder team names (Winner R32-01, Winner R16-1, etc.) do not represent predictions or simulations.",
      "This phase is bracket structure only — no bracket auto-advancement, no winner logic, no Elo or xG formula changes."
    ])
  };
}

export function simulateWorldCup2026KnockoutFixturesFoundation(): WorldCup2026KnockoutSimulationFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const fixtures: WorldCup2026KnockoutSimulationFixture[] = WORLD_CUP_2026_ROUND_OF_32_FIXTURES.map((fixture) => {
    const homeEntry = ratingsByTeam.get(normalizeTeamLookupKey(fixture.homeTeam));
    const awayEntry = ratingsByTeam.get(normalizeTeamLookupKey(fixture.awayTeam));

    const homeElo = homeEntry !== undefined ? homeEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = awayEntry !== undefined ? awayEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const homeRatingSource = homeEntry !== undefined ? homeEntry.ratingSource : ("fallback_seed" as const);
    const awayRatingSource = awayEntry !== undefined ? awayEntry.ratingSource : ("fallback_seed" as const);

    const xgResult = eloToExpectedGoals({ homeEloRating: homeElo, awayEloRating: awayElo });
    const scoreMatrix = generateScoreMatrix(
      { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
      { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
    );
    const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
    const scorelines = getMostLikelyScorelines(scoreMatrix, 3);

    const fallbackTeams: string[] = [];
    if (homeRatingSource === "fallback_seed") fallbackTeams.push(fixture.homeTeam);
    if (awayRatingSource === "fallback_seed") fallbackTeams.push(fixture.awayTeam);
    const fixtureWarnings: string[] =
      fallbackTeams.length === 0
        ? []
        : [`${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams: ${fallbackTeams.join(", ")}.`];

    return {
      fixtureId: fixture.fixtureId,
      round: "round_of_32" as const,
      slot: fixture.slot,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeExpectedGoals: xgResult.homeExpectedGoals,
      awayExpectedGoals: xgResult.awayExpectedGoals,
      homeWinProbability: outcomes.homeWinProbability,
      drawProbability: outcomes.drawProbability,
      awayWinProbability: outcomes.awayWinProbability,
      mostLikelyScorelines: scorelines,
      homeRatingSource,
      awayRatingSource,
      warnings: fixtureWarnings
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_knockout_simulation_foundation",
    simulatedFixturesCount: fixtures.length,
    round: "round_of_32",
    simulationType: "match_level_foundation",
    source: "projected_round_of_32",
    fixtures,
    warnings: [
      "Projected bracket only. Round of 32 teams are derived from current local standings.",
      "Advancement after extra time/penalties is not modeled in this phase.",
      "Winners are not selected. No bracket advancement. No champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Knockout simulation foundation: match probabilities computed per fixture using Live Elo ratings and Poisson score matrix.",
      "This phase simulates match-level probabilities only — no winner selection, no bracket progression, no penalty shootout modeling.",
      "No external API calls, live score service, winner selection, or prediction formula changes are used."
    ])
  };
}

function deriveProjectedQualifier(
  fixture: WorldCup2026KnockoutSimulationFixture,
  ratingsByTeam: Map<string, WorldCup2026CoverageEntry>
): WorldCup2026ProjectedQualifier {
  const { homeTeam, awayTeam, homeWinProbability, awayWinProbability, drawProbability, fixtureId, slot, homeRatingSource, awayRatingSource } = fixture;

  let winner: string;
  let advancementReason: string;

  if (homeWinProbability > awayWinProbability) {
    winner = homeTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else if (awayWinProbability > homeWinProbability) {
    winner = awayTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else {
    const homeElo = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;

    if (homeElo > awayElo) {
      winner = homeTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else if (awayElo > homeElo) {
      winner = awayTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else {
      winner = homeTeam;
      advancementReason = "advanced as home team (equal win probability and equal Elo)";
    }
  }

  return {
    team: winner,
    qualificationSource: "round_of_32",
    sourceFixtureId: fixtureId,
    sourceSlot: slot,
    advancementReason,
    sourceHomeTeam: homeTeam,
    sourceAwayTeam: awayTeam,
    sourceHomeWinProbability: homeWinProbability,
    sourceDrawProbability: drawProbability,
    sourceAwayWinProbability: awayWinProbability,
    homeRatingSource,
    awayRatingSource
  };
}

export function simulateWorldCup2026RoundOf16Foundation(): WorldCup2026RoundOf16FoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const r32Simulation = simulateWorldCup2026KnockoutFixturesFoundation();

  const projectedRoundOf16Teams: WorldCup2026ProjectedQualifier[] = r32Simulation.fixtures.map((fixture) =>
    deriveProjectedQualifier(fixture, ratingsByTeam)
  );

  const projectedRoundOf16Fixtures: WorldCup2026RoundOf16Fixture[] = Array.from({ length: 8 }, (_, i) => {
    const slot = i + 1;
    const homeQualifier = projectedRoundOf16Teams[i * 2];
    const awayQualifier = projectedRoundOf16Teams[i * 2 + 1];

    if (homeQualifier === undefined || awayQualifier === undefined) {
      throw new Error("simulateWorldCup2026RoundOf16Foundation: expected 16 R32 qualifiers to build 8 R16 fixtures.");
    }

    return {
      fixtureId: `wc2026-r16-${slot.toString().padStart(2, "0")}`,
      round: "round_of_16" as const,
      slot,
      homeTeam: homeQualifier.team,
      awayTeam: awayQualifier.team,
      homeQualifier,
      awayQualifier,
      status: "projected" as const
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_round_of_16_foundation",
    round: "round_of_16",
    projectedQualifiersCount: projectedRoundOf16Teams.length,
    fixturesCount: projectedRoundOf16Fixtures.length,
    simulationType: "deterministic_winner_selection",
    source: "round_of_32_simulation_foundation",
    projectedRoundOf16Teams,
    projectedRoundOf16Fixtures,
    warnings: [
      "Round of 16 participants are projected from pre-match probabilities. Real match outcomes are not yet simulated.",
      "Winner selection is deterministic: highest win probability advances. Elo is the tie-breaker; home team wins if both are equal.",
      "No penalties, no randomization, no quarterfinal generation, no champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Round of 16 foundation derives 16 projected qualifiers from R32 match probabilities using a deterministic winner-selection rule.",
      "Winner selection: highest win probability wins; Elo tie-break if equal; home team wins if both are equal.",
      "This phase projects R16 participants only — no R16 match simulation, no quarterfinal generation, no bracket auto-advancement.",
      "No external API calls, live score service, randomization, or prediction formula changes are used."
    ])
  };
}

const TEAM_RATINGS_FOUNDATION_DATA: readonly TeamRatingFoundationEntry[] = [
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
];

export function getTeamRatingsFoundation(): TeamRatingsFoundationResponse {
  return {
    status: "success",
    teams: TEAM_RATINGS_FOUNDATION_DATA,
    ratingSource: "Approximate seed ratings derived from historical World Cup results. Not calibrated from live data.",
    foundationWarning:
      "These ratings are a static foundation for dashboard preview. They are not derived from a live model, official FIFA rankings, or recent match data.",
    strongestOffenseTeam: "Brazil",
    strongestOffenseScore: 90,
    strongestDefenseTeam: "France",
    strongestDefenseScore: 90,
    averageEloRating: 1807,
    topEloRating: 1870,
    warnings: [
      "Team ratings are curated seed values, not outputs of a calibrated model.",
      "Offense and defense strength scores are approximate and not derived from historical match statistics."
    ],
    metadata: buildApiMetadata([
      "Team ratings foundation uses static curated seed data, not a live model or external data service.",
      "No network calls, database, or external services are used."
    ])
  };
}

const LIVE_ELO_PIPELINE_ID = "world-cup-2010-2022-international-supplement";
const LIVE_ELO_TOP_TEAMS_LIMIT = 15;
const VALID_PREDICTION_PRESETS = new Set<string>(Object.keys(ELO_XG_PRESETS));
const WORLD_CUP_2026_AUTO_PREDICT_COVERAGE_NOTE = `Auto Predict From Elo supports all ${WORLD_CUP_2026_TEAM_NAMES.length} expected World Cup 2026 teams across Groups A-L.`;

function buildLiveEloPipelineFoundation(options: LiveEloRatingsFoundationOptions = {}) {
  const internationalSupplement = loadLiveEloInternationalSupplement();
  const mergedMatches = mergeEloMatchSources(LIVE_ELO_FOUNDATION_MATCHES, internationalSupplement.matches);
  const combinedMatchCount = LIVE_ELO_FOUNDATION_MATCH_COUNT + internationalSupplement.metadata.matchCount;
  const pipeline = runLiveEloPipeline({
    pipelineId: LIVE_ELO_PIPELINE_ID,
    matches: mergedMatches,
    dataCoverage: "partial_international_history",
    ...(options.recencyWeighting === undefined ? {} : { recencyWeighting: options.recencyWeighting }),
    ...(options.competitionWeighting === undefined ? {} : { competitionWeighting: options.competitionWeighting }),
    ...(options.homeAdvantage === undefined ? {} : { homeAdvantage: options.homeAdvantage }),
    ...(options.attackDefense === undefined ? {} : { attackDefense: options.attackDefense })
  });

  return {
    internationalSupplement,
    combinedMatchCount,
    pipeline
  };
}

export function getLiveEloRatingsFoundation(options: LiveEloRatingsFoundationOptions = {}): LiveEloRatingsFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation(options);

  const topTeams: LiveEloRatedTeamEntry[] = pipeline.rankedRatings.slice(0, LIVE_ELO_TOP_TEAMS_LIMIT).map((entry) => {
    const teamEntry: LiveEloRatedTeamEntry = {
      rank: entry.rank,
      team: entry.team,
      eloRating: entry.eloRating,
      matchesPlayed: entry.matchesPlayed
    };

    if (entry.attackScore !== undefined) {
      teamEntry.attackScore = entry.attackScore;
    }

    if (entry.defenseScore !== undefined) {
      teamEntry.defenseScore = entry.defenseScore;
    }

    return teamEntry;
  });

  const topEloRating = pipeline.rankedRatings[0]?.eloRating ?? DEFAULT_ELO_CONFIG.initialRating;

  const averageEloRating =
    pipeline.rankedRatings.length > 0
      ? Math.round((pipeline.rankedRatings.reduce((sum, t) => sum + t.eloRating, 0) / pipeline.rankedRatings.length) * 10) / 10
      : DEFAULT_ELO_CONFIG.initialRating;

  return {
    status: "success",
    teams: topTeams,
    matchesProcessed: pipeline.matchesProcessed,
    teamsRatedTotal: pipeline.teamsRated,
    dataCoverage:
      "World Cup 2010, 2014, 2018, and 2022 curated fixture results supplemented with an expanded partial international sample covering FIFA World Cup 2022, Copa America 2024, UEFA Euro 2024, World Cup 2026 Qualifiers, and International Friendlies.",
    dataScope: `${LIVE_ELO_FOUNDATION_DATA_SCOPE}+${LIVE_ELO_INTERNATIONAL_SUPPLEMENT_DATA_SCOPE}`,
    pipelineVersion: pipeline.pipelineVersion,
    topEloRating,
    averageEloRating,
    latestMatchDate: pipeline.latestMatchDate ?? LIVE_ELO_INTERNATIONAL_SUPPLEMENT_LATEST_MATCH_DATE,
    recencyWeighting: pipeline.recencyWeighting,
    competitionWeighting: pipeline.competitionWeighting,
    homeAdvantage: pipeline.homeAdvantage,
    attackDefense: pipeline.attackDefense,
    warnings: [
      ...pipeline.warnings,
      ...internationalSupplement.loadWarnings,
      LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING,
      ...internationalSupplement.metadata.foundationWarnings,
      "Teams are initialized at the default Elo rating (1500) before pipeline processing.",
      "Only teams that appeared in World Cup 2010–2022 or the expanded international supplement are rated.",
      WORLD_CUP_2026_FALLBACK_RATING_WARNING
    ],
    metadata: buildApiMetadata([
      `Live Elo pipeline processes ${combinedMatchCount} matches: 256 curated World Cup fixtures (2010–2022) plus ${internationalSupplement.metadata.matchCount} expanded international supplement matches from ${internationalSupplement.metadata.datasetId}.`,
      WORLD_CUP_2026_AUTO_PREDICT_COVERAGE_NOTE,
      `Recency weighting enabled: ${pipeline.recencyWeighting.enabled}.`,
      `Competition weighting enabled: ${pipeline.competitionWeighting.enabled}.`,
      `Home advantage enabled: ${pipeline.homeAdvantage.enabled}.`,
      `Attack/defense ratings enabled: ${pipeline.attackDefense.enabled}.`,
      `Supplement warning codes: ${internationalSupplement.metadata.warningCodes.join(", ")}.`,
      "No network calls, database, or external services are used."
    ])
  };
}

function normalizeTeamLookupKey(team: string): string {
  return normalizeTeamSearchText(team);
}

function buildCoverageLookup(coverageEntries: readonly WorldCup2026CoverageEntry[]): Map<string, WorldCup2026CoverageEntry> {
  const ratingsByTeam = new Map<string, WorldCup2026CoverageEntry>();

  for (const entry of coverageEntries) {
    ratingsByTeam.set(normalizeTeamLookupKey(entry.team), entry);
    ratingsByTeam.set(normalizeTeamLookupKey(canonicalizeTeamName(entry.team)), entry);
  }

  return ratingsByTeam;
}

function getFallbackTeamsUsed(entries: readonly WorldCup2026CoverageEntry[]): string[] {
  return entries.filter((entry) => entry.ratingSource === "fallback_seed").map((entry) => entry.team);
}

export function predictMatchFromLiveElo(
  request: PredictMatchFromLiveEloRequest,
  deps?: { statsBombProfileSource?: TeamPerformanceProfileSource }
): PredictMatchFromLiveEloResponse {
  const issues = validatePredictMatchFromLiveEloRequest(request);

  if (issues.length > 0) {
    return {
      status: "validation_error",
      issues,
      metadata: buildApiMetadata(["Request failed validation before live Elo ratings were loaded."])
    };
  }

  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const baseWorldCupCoverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  let worldCupCoverageEntries = baseWorldCupCoverageEntries;

  let tournamentMatchesIncluded = 0;
  const completedResults = resolveWorldCup2026ResultsProviderFoundation();
  const completedRecords = completedResults.status === "success" ? completedResults.completedResults : [];

  if (request.tournamentResultsAdjustment?.enabled === true) {
    const baselineRatings = new Map<string, number>(
      worldCupCoverageEntries.map((e) => [e.team, e.eloRating])
    );
    const ingestion = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: completedRecords,
      baselineRatings,
      pipelineVersion: pipeline.pipelineVersion,
      combinedMatchCount,
      ...(request.tournamentResultsAdjustment.cutoffAt !== undefined
        ? { cutoffAt: request.tournamentResultsAdjustment.cutoffAt }
        : {})
    });
    tournamentMatchesIncluded = ingestion.metadata.processedCount;
    const adjustedRatingMap = new Map<string, number>(
      ingestion.adjustedRatings.map((e) => [e.team, e.adjustedEloRating])
    );
    worldCupCoverageEntries = worldCupCoverageEntries.map((entry) => {
      const adjusted = adjustedRatingMap.get(entry.team);
      if (adjusted !== undefined) {
        return { ...entry, eloRating: adjusted };
      }
      return entry;
    });
  }

  const availableTeams = getAvailableTeamCoverage(worldCupCoverageEntries);
  const ratingsByTeam = buildCoverageLookup(worldCupCoverageEntries);
  const homeTeam = request.homeTeam.trim();
  const awayTeam = request.awayTeam.trim();
  const homeResolution = resolveTeamAlias(homeTeam, availableTeams);
  const awayResolution = resolveTeamAlias(awayTeam, availableTeams);
  const homeEntry =
    homeResolution.canonicalName === undefined ? undefined : ratingsByTeam.get(normalizeTeamLookupKey(homeResolution.canonicalName));
  const awayEntry =
    awayResolution.canonicalName === undefined ? undefined : ratingsByTeam.get(normalizeTeamLookupKey(awayResolution.canonicalName));
  const teamIssues: ApiValidationIssue[] = [];

  if (homeEntry === undefined) {
    teamIssues.push({
      field: "homeTeam",
      message: `${homeTeam} is not available in the World Cup 2026 Auto Predict coverage list.`,
      suggestions: suggestAvailableTeams(homeTeam, availableTeams)
    });
  }

  if (awayEntry === undefined) {
    teamIssues.push({
      field: "awayTeam",
      message: `${awayTeam} is not available in the World Cup 2026 Auto Predict coverage list.`,
      suggestions: suggestAvailableTeams(awayTeam, availableTeams)
    });
  }

  if (homeEntry === undefined || awayEntry === undefined) {
    return {
      status: "validation_error",
      issues: teamIssues,
      availableTeams,
      metadata: buildApiMetadata([
        "Live Elo prediction requires both teams to appear in the World Cup 2026 Auto Predict coverage list.",
        WORLD_CUP_2026_AUTO_PREDICT_COVERAGE_NOTE,
        `Pipeline currently rates ${pipeline.teamsRated} teams from ${pipeline.matchesProcessed} matches before fallback coverage is applied.`
      ])
    };
  }

  const fallbackTeamsUsed = getFallbackTeamsUsed([homeEntry, awayEntry]);
  const fallbackWarnings =
    fallbackTeamsUsed.length === 0
      ? []
      : [
          `${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams in this prediction: ${fallbackTeamsUsed.join(
            ", "
          )}.`
        ];

  let tournamentFormAdjustment:
    | NonNullable<PredictMatchFromLiveEloSuccessResponse["tournamentFormAdjustment"]>
    | undefined;

  if (request.tournamentFormAdjustment?.enabled === true) {
    tournamentFormAdjustment = resolveTournamentFormPredictionAdjustment({
      homeTeam: homeResolution.canonicalName ?? homeEntry.team,
      awayTeam: awayResolution.canonicalName ?? awayEntry.team,
      baselineRatingsForForm: new Map(
        baseWorldCupCoverageEntries.map((entry) => [entry.team, entry.eloRating])
      ),
      effectiveRatingsBeforeTournamentForm: new Map(
        worldCupCoverageEntries.map((entry) => [entry.team, entry.eloRating])
      ),
      completedResults: completedRecords,
      ...(request.tournamentFormAdjustment.cutoffAt === undefined
        ? {}
        : { cutoffAt: request.tournamentFormAdjustment.cutoffAt })
    });

    worldCupCoverageEntries = worldCupCoverageEntries.map((entry) => {
      if (entry.team === (homeResolution.canonicalName ?? homeEntry.team)) {
        return {
          ...entry,
          eloRating: tournamentFormAdjustment?.home.effectiveElo ?? entry.eloRating
        };
      }

      if (entry.team === (awayResolution.canonicalName ?? awayEntry.team)) {
        return {
          ...entry,
          eloRating: tournamentFormAdjustment?.away.effectiveElo ?? entry.eloRating
        };
      }

      return entry;
    });
  }

  const effectiveRatingsByTeam = buildCoverageLookup(worldCupCoverageEntries);
  const effectiveHomeEntry =
    homeResolution.canonicalName === undefined
      ? undefined
      : effectiveRatingsByTeam.get(normalizeTeamLookupKey(homeResolution.canonicalName));
  const effectiveAwayEntry =
    awayResolution.canonicalName === undefined
      ? undefined
      : effectiveRatingsByTeam.get(normalizeTeamLookupKey(awayResolution.canonicalName));

  if (effectiveHomeEntry === undefined || effectiveAwayEntry === undefined) {
    return {
      status: "validation_error",
      issues: [
        {
          field: "tournamentFormAdjustment",
          message: "Tournament form adjustment could not resolve effective Elo coverage for the requested teams."
        }
      ],
      metadata: buildApiMetadata([
        "Tournament form prediction integration could not resolve effective Elo coverage."
      ])
    };
  }

  const xgResult = eloToExpectedGoals({
    homeEloRating: effectiveHomeEntry.eloRating,
    awayEloRating: effectiveAwayEntry.eloRating,
    ...(request.preset === undefined ? {} : { preset: request.preset })
  });

  // StatsBomb experimental signal — opt-in, additive, baseline unchanged when disabled/missing
  const statsBombEnabled = request.statsBombSignal?.enabled === true;
  let statsBombSignalMeta: NonNullable<PredictMatchFromLiveEloSuccessResponse["statsBombSignal"]> | undefined;
  let effectiveHomeXg = xgResult.homeExpectedGoals;
  let effectiveAwayXg = xgResult.awayExpectedGoals;

  if (statsBombEnabled) {
    const profileSource = deps?.statsBombProfileSource ?? NULL_PROFILE_SOURCE;

    const cutoffAt = request.statsBombSignal?.cutoffAt ?? new Date().toISOString();
    const homeCanonical = homeResolution.canonicalName ?? homeEntry.team;
    const awayCanonical = awayResolution.canonicalName ?? awayEntry.team;
    const homeTeamId = teamNameToId(homeCanonical);
    const awayTeamId = teamNameToId(awayCanonical);

    const homeProfileRaw = profileSource.getProfile(homeTeamId);
    const awayProfileRaw = profileSource.getProfile(awayTeamId);

    const homeProfile =
      homeProfileRaw !== null && homeProfileRaw.cutoffAt <= cutoffAt ? homeProfileRaw : null;
    const awayProfile =
      awayProfileRaw !== null && awayProfileRaw.cutoffAt <= cutoffAt ? awayProfileRaw : null;

    const adjustment = calculateStatsBombPredictionAdjustment({
      homeProfile,
      awayProfile,
      baselineHomeXg: xgResult.homeExpectedGoals,
      baselineAwayXg: xgResult.awayExpectedGoals,
      globalPriorXgForPer90: STATSBOMB_GLOBAL_PRIOR_XG_FOR_PER_90,
      globalPriorXgAgainstPer90: STATSBOMB_GLOBAL_PRIOR_XG_AGAINST_PER_90,
      ...(request.statsBombSignal?.maxWeight !== undefined
        ? { maxWeight: request.statsBombSignal.maxWeight }
        : {})
    });

    effectiveHomeXg = adjustment.adjustedHomeXg;
    effectiveAwayXg = adjustment.adjustedAwayXg;

    statsBombSignalMeta = {
      enabled: true,
      applied: adjustment.applied,
      reason: adjustment.reason,
      provider: "statsbomb_open_data",
      cutoffAt,
      signalVersion: STATSBOMB_SIGNAL_VERSION,
      baselineExpectedGoals: {
        home: xgResult.homeExpectedGoals,
        away: xgResult.awayExpectedGoals
      },
      adjustedExpectedGoals: {
        home: effectiveHomeXg,
        away: effectiveAwayXg
      },
      homeProfile:
        homeProfile !== null && adjustment.homeCoverage !== null && adjustment.homeFreshness !== null
          ? {
              coverage: adjustment.homeCoverage,
              freshness: adjustment.homeFreshness,
              matchCount: homeProfile.matchCount,
              latestMatchAt: homeProfile.latestMatchAt,
              weight: adjustment.homeWeight
            }
          : null,
      awayProfile:
        awayProfile !== null && adjustment.awayCoverage !== null && adjustment.awayFreshness !== null
          ? {
              coverage: adjustment.awayCoverage,
              freshness: adjustment.awayFreshness,
              matchCount: awayProfile.matchCount,
              latestMatchAt: awayProfile.latestMatchAt,
              weight: adjustment.awayWeight
            }
          : null,
      warnings: adjustment.warnings
    };
  }

  const maxGoals = request.maxGoals ?? DEFAULT_POISSON_CONFIG.maxGoals;
  const normalizeMatrix = request.normalizeMatrix ?? DEFAULT_POISSON_CONFIG.normalizeMatrix;
  const scoreMatrix = generateScoreMatrix(
    {
      expectedHomeGoals: effectiveHomeXg,
      expectedAwayGoals: effectiveAwayXg
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
      homeTeam: homeResolution.canonicalName ?? homeEntry.team,
      awayTeam: awayResolution.canonicalName ?? awayEntry.team,
      expectedHomeGoals: effectiveHomeXg,
      expectedAwayGoals: effectiveAwayXg,
      maxGoals,
      normalizeMatrix
    },
    expectedGoals: {
      home: effectiveHomeXg,
      away: effectiveAwayXg,
      eloDifference: xgResult.eloDifference,
      baseExpectedGoals: xgResult.baseGoals,
      goalsAdjustment: xgResult.eloAdjustment,
      preset: xgResult.preset,
      presetDescription: xgResult.presetDescription,
      formulaVersion: xgResult.formulaVersion,
      adjustmentPer100: xgResult.adjustmentPer100,
      maxAdjustment: xgResult.maxAdjustment,
      v1RollbackAvailable: xgResult.v1RollbackAvailable
    },
    liveElo: {
      homeTeam: homeResolution.canonicalName ?? homeEntry.team,
      awayTeam: awayResolution.canonicalName ?? awayEntry.team,
      homeEloRating: effectiveHomeEntry.eloRating,
      awayEloRating: effectiveAwayEntry.eloRating,
      homeRank: effectiveHomeEntry.rank,
      awayRank: effectiveAwayEntry.rank,
      homeMatchesPlayed: effectiveHomeEntry.matchesPlayed,
      awayMatchesPlayed: effectiveAwayEntry.matchesPlayed,
      homeGroup: effectiveHomeEntry.group,
      awayGroup: effectiveAwayEntry.group,
      homeRatingSource: effectiveHomeEntry.ratingSource,
      awayRatingSource: effectiveAwayEntry.ratingSource,
      fallbackSeedRating: WORLD_CUP_2026_FALLBACK_SEED_RATING,
      matchesProcessed: pipeline.matchesProcessed,
      latestMatchDate: pipeline.latestMatchDate ?? LIVE_ELO_FOUNDATION_LATEST_MATCH_DATE,
      dataCoverage:
        "World Cup 2010, 2014, 2018, and 2022 curated fixture results supplemented with an expanded partial international sample and World Cup 2026 fallback coverage.",
      homeInput: homeTeam,
      awayInput: awayTeam,
      homeMatchedBy: homeResolution.matchedBy === "none" ? "canonical" : homeResolution.matchedBy,
      awayMatchedBy: awayResolution.matchedBy === "none" ? "canonical" : awayResolution.matchedBy
    },
    outcomeProbabilities: aggregateOutcomeProbabilities(scoreMatrix),
    mostLikelyScorelines: getMostLikelyScorelines(scoreMatrix, mostLikelyLimit),
    predictionConfidence: assessPredictionConfidence({
      homeTeam: homeResolution.canonicalName ?? homeEntry.team,
      awayTeam: awayResolution.canonicalName ?? awayEntry.team,
      homeRatingSource: effectiveHomeEntry.ratingSource,
      awayRatingSource: effectiveAwayEntry.ratingSource,
      homeMatchesPlayed: effectiveHomeEntry.matchesPlayed,
      awayMatchesPlayed: effectiveAwayEntry.matchesPlayed,
      matchesProcessed: pipeline.matchesProcessed,
      latestMatchDate: pipeline.latestMatchDate ?? LIVE_ELO_FOUNDATION_LATEST_MATCH_DATE,
      currentTournamentMatchesIncluded: tournamentMatchesIncluded,
      fallbackSeedRating: WORLD_CUP_2026_FALLBACK_SEED_RATING,
      dataCoverage:
        "World Cup 2010, 2014, 2018, and 2022 curated fixture results supplemented with an expanded partial international sample and World Cup 2026 fallback coverage.",
      attackDefenseAvailable: false,
      ...(request.tournamentFormAdjustment?.enabled === true
        ? {
            tournamentFormEnabled: true,
            tournamentFormApplied: tournamentFormAdjustment?.applied,
            homeTournamentFormMatchesIncluded: tournamentFormAdjustment?.home.matchesIncluded,
            awayTournamentFormMatchesIncluded: tournamentFormAdjustment?.away.matchesIncluded,
            tournamentFormFormulaVersion: tournamentFormAdjustment?.formulaVersion
          }
        : {})
    }),
    ...(request.tournamentResultsAdjustment?.enabled === true
      ? { tournamentAdjustment: { applied: true, matchesIncluded: tournamentMatchesIncluded } }
      : {}),
    ...(tournamentFormAdjustment === undefined ? {} : { tournamentFormAdjustment }),
    ...(statsBombSignalMeta === undefined ? {} : { statsBombSignal: statsBombSignalMeta }),
    warnings: [
      ...pipeline.warnings,
      ...internationalSupplement.loadWarnings,
      LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING,
      ...internationalSupplement.metadata.foundationWarnings,
      ...fallbackWarnings,
      ...(tournamentFormAdjustment?.warnings ?? []),
      ...xgResult.warnings,
      ...(statsBombSignalMeta?.warnings ?? []),
      `Live Elo prediction uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`
    ],
    metadata: buildApiMetadata([
      request.tournamentFormAdjustment?.enabled === true
        ? "Match prediction loaded live Elo ratings, applied optional tournament-result Elo ingestion, then optional tournament-form secondary adjustment, then converted the effective Elo difference to expected goals and reused Poisson scoreline probabilities."
        : "Match prediction loaded live Elo ratings, converted Elo difference to expected goals, then reused Poisson scoreline probabilities.",
      WORLD_CUP_2026_AUTO_PREDICT_COVERAGE_NOTE,
      `Fallback seed ratings used: ${fallbackTeamsUsed.length === 0 ? "none" : fallbackTeamsUsed.join(", ")}.`,
      `Prediction preset: ${xgResult.preset}.`,
      "Optional Monte Carlo output is deterministic when a seed is supplied.",
      statsBombEnabled
        ? `StatsBomb experimental signal: ${statsBombSignalMeta?.applied === true ? "applied" : "not applied"} (reason: ${statsBombSignalMeta?.reason ?? "disabled"}).`
        : "StatsBomb experimental signal: disabled.",
      "No network calls, database, or external services are used."
    ])
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

export function getWorldCup2026EloIngestionFoundation(): WorldCup2026EloIngestionFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const worldCupCoverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);

  const baselineRatings = new Map<string, number>(
    worldCupCoverageEntries.map((e) => [e.team, e.eloRating])
  );

  const completedResults = resolveWorldCup2026ResultsProviderFoundation();
  const completedRecords = completedResults.status === "success" ? completedResults.completedResults : [];

  const ingestion = ingestWorldCup2026ResultsIntoLiveElo({
    completedResults: completedRecords,
    baselineRatings,
    pipelineVersion: pipeline.pipelineVersion,
    combinedMatchCount
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_elo_ingestion_foundation",
    ingestion,
    warnings: [
      ...pipeline.warnings,
      ...internationalSupplement.loadWarnings,
      LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING,
      ...internationalSupplement.metadata.foundationWarnings,
      "Elo ingestion uses local static results only. No live provider data is fetched in this foundation handler.",
      WORLD_CUP_2026_FALLBACK_RATING_WARNING
    ],
    metadata: buildApiMetadata([
      `Baseline pipeline processes ${combinedMatchCount} historical matches before WC2026 tournament adjustment.`,
      `WC2026 completed matches ingested: ${ingestion.metadata.processedCount} of ${ingestion.metadata.eligibleRecords} eligible.`,
      "Ingestion is deterministic, chronological, idempotent, and look-ahead-free.",
      "No network calls, database, or external services are used."
    ])
  };
}

export function getWorldCup2026TournamentFormFoundation(
  input: GetWorldCup2026TournamentFormFoundationInput = {}
): WorldCup2026TournamentFormFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const worldCupCoverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const baselineRatings = new Map<string, number>(
    worldCupCoverageEntries.map((entry) => [entry.team, entry.eloRating])
  );
  const completedResults = createLocalStaticResultsProvider().getCompletedResults();
  const form = calculateWorldCup2026TournamentForm({
    completedResults: completedResults.status === "success" ? completedResults.records : [],
    baselineRatings,
    ...(input.cutoffAt === undefined ? {} : { cutoffAt: input.cutoffAt }),
    ...(input.referenceAt === undefined ? {} : { referenceAt: input.referenceAt })
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_tournament_form_foundation",
    form,
    warnings: [
      ...form.metadata.warnings,
      ...pipeline.warnings,
      ...internationalSupplement.loadWarnings,
      LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING,
      ...internationalSupplement.metadata.foundationWarnings,
      `Tournament form uses ${combinedMatchCount} historical matches only for opponent-strength context.`,
      "Tournament form is not integrated into live predictions in this phase."
    ],
    metadata: buildApiMetadata([
      `Tournament form was calculated from ${form.metadata.recordsAccepted} accepted completed World Cup 2026 records.`,
      `Teams summarized: ${form.metadata.teamsSummarized}.`,
      "This handler is deterministic and does not mutate Elo ratings or recalculate predictions.",
      "No network calls, database, or external services are used."
    ])
  };
}

export function simulateWorldCup2026RoundOf16MatchesFoundation(): WorldCup2026RoundOf16MatchSimulationFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const r16Foundation = simulateWorldCup2026RoundOf16Foundation();
  const r16Fixtures = r16Foundation.projectedRoundOf16Fixtures;

  const fixtures: WorldCup2026RoundOf16MatchSimulationFixture[] = r16Fixtures.map((fixture) => {
    const { slot, homeTeam, awayTeam } = fixture;
    const fixtureId = `wc2026-r16-sim-${slot.toString().padStart(2, "0")}`;

    const homeEntry = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam));
    const awayEntry = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam));
    const homeElo = homeEntry !== undefined ? homeEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = awayEntry !== undefined ? awayEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const homeRatingSource = homeEntry !== undefined ? homeEntry.ratingSource : ("fallback_seed" as const);
    const awayRatingSource = awayEntry !== undefined ? awayEntry.ratingSource : ("fallback_seed" as const);

    const xgResult = eloToExpectedGoals({ homeEloRating: homeElo, awayEloRating: awayElo });
    const scoreMatrix = generateScoreMatrix(
      { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
      { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
    );
    const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
    const scorelines = getMostLikelyScorelines(scoreMatrix, 3);

    const fallbackTeams: string[] = [];
    if (homeRatingSource === "fallback_seed") fallbackTeams.push(homeTeam);
    if (awayRatingSource === "fallback_seed") fallbackTeams.push(awayTeam);
    const fixtureWarnings: string[] =
      fallbackTeams.length === 0
        ? []
        : [`${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams: ${fallbackTeams.join(", ")}.`];

    return {
      fixtureId,
      round: "round_of_16" as const,
      slot,
      homeTeam,
      awayTeam,
      homeExpectedGoals: xgResult.homeExpectedGoals,
      awayExpectedGoals: xgResult.awayExpectedGoals,
      homeWinProbability: outcomes.homeWinProbability,
      drawProbability: outcomes.drawProbability,
      awayWinProbability: outcomes.awayWinProbability,
      mostLikelyScorelines: scorelines,
      homeRatingSource,
      awayRatingSource,
      warnings: fixtureWarnings
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_round_of_16_match_simulation_foundation",
    simulatedFixturesCount: fixtures.length,
    round: "round_of_16",
    simulationType: "match_level_foundation",
    source: "projected_round_of_16",
    fixtures,
    warnings: [
      "Advancement after extra time/penalties is not modeled in this phase.",
      "Round of 16 participants are projected from pre-match probabilities. Real match outcomes are not yet simulated.",
      "Winners are not selected. No bracket advancement. No champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Round of 16 match simulation foundation: match probabilities computed per fixture using Live Elo ratings and Poisson score matrix.",
      "Participants are projected from the Round of 32 simulation foundation via deterministic winner selection.",
      "This phase simulates match-level probabilities only — no winner selection, no bracket progression, no penalty shootout modeling.",
      "No external API calls, live score service, winner selection, or prediction formula changes are used."
    ])
  };
}

function deriveQuarterfinalQualifier(
  fixture: WorldCup2026RoundOf16MatchSimulationFixture,
  ratingsByTeam: Map<string, WorldCup2026CoverageEntry>
): WorldCup2026QuarterfinalQualifier {
  const { homeTeam, awayTeam, homeWinProbability, awayWinProbability, drawProbability, fixtureId, slot, homeRatingSource, awayRatingSource } = fixture;

  let winner: string;
  let advancementReason: string;

  if (homeWinProbability > awayWinProbability) {
    winner = homeTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else if (awayWinProbability > homeWinProbability) {
    winner = awayTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else {
    const homeElo = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;

    if (homeElo > awayElo) {
      winner = homeTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else if (awayElo > homeElo) {
      winner = awayTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else {
      winner = homeTeam;
      advancementReason = "advanced as home team (equal win probability and equal Elo)";
    }
  }

  return {
    team: winner,
    qualificationSource: "round_of_16",
    sourceFixtureId: fixtureId,
    sourceSlot: slot,
    advancementReason,
    sourceHomeTeam: homeTeam,
    sourceAwayTeam: awayTeam,
    sourceHomeWinProbability: homeWinProbability,
    sourceDrawProbability: drawProbability,
    sourceAwayWinProbability: awayWinProbability,
    homeRatingSource,
    awayRatingSource
  };
}

export function simulateWorldCup2026QuarterfinalFoundation(): WorldCup2026QuarterfinalFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const r16MatchSimulation = simulateWorldCup2026RoundOf16MatchesFoundation();

  const projectedQuarterfinalTeams: WorldCup2026QuarterfinalQualifier[] = r16MatchSimulation.fixtures.map((fixture) =>
    deriveQuarterfinalQualifier(fixture, ratingsByTeam)
  );

  const projectedQuarterfinalFixtures: WorldCup2026QuarterfinalFixture[] = Array.from({ length: 4 }, (_, i) => {
    const slot = i + 1;
    const homeQualifier = projectedQuarterfinalTeams[i * 2];
    const awayQualifier = projectedQuarterfinalTeams[i * 2 + 1];

    if (homeQualifier === undefined || awayQualifier === undefined) {
      throw new Error("simulateWorldCup2026QuarterfinalFoundation: expected 8 R16 qualifiers to build 4 QF fixtures.");
    }

    return {
      fixtureId: `wc2026-qf-${slot.toString().padStart(2, "0")}`,
      round: "quarterfinals" as const,
      slot,
      homeTeam: homeQualifier.team,
      awayTeam: awayQualifier.team,
      homeQualifier,
      awayQualifier,
      status: "projected" as const
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_quarterfinal_foundation",
    round: "quarterfinals",
    projectedQualifiersCount: projectedQuarterfinalTeams.length,
    fixturesCount: projectedQuarterfinalFixtures.length,
    simulationType: "deterministic_winner_selection",
    source: "round_of_16_match_simulation_foundation",
    projectedQuarterfinalTeams,
    projectedQuarterfinalFixtures,
    warnings: [
      "Quarterfinal participants are projected from Round of 16 pre-match probabilities. Real match outcomes, extra time, and penalties are not modeled yet.",
      "Winner selection is deterministic: highest win probability advances. Elo is the tie-breaker; home team wins if both are equal.",
      "No penalties, no randomization, no semifinal generation, no champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Quarterfinal foundation derives 8 projected qualifiers from R16 match probabilities using a deterministic winner-selection rule.",
      "Winner selection: highest win probability wins; Elo tie-break if equal; home team wins if both are equal.",
      "This phase projects QF participants only — no QF match simulation, no semifinal generation, no bracket auto-advancement.",
      "No external API calls, live score service, randomization, or prediction formula changes are used."
    ])
  };
}

export function simulateWorldCup2026QuarterfinalMatchesFoundation(): WorldCup2026QuarterfinalMatchSimulationFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const qfFoundation = simulateWorldCup2026QuarterfinalFoundation();
  const qfFixtures = qfFoundation.projectedQuarterfinalFixtures;

  const fixtures: WorldCup2026QuarterfinalMatchSimulationFixture[] = qfFixtures.map((fixture) => {
    const { slot, homeTeam, awayTeam } = fixture;
    const fixtureId = `wc2026-qf-sim-${slot.toString().padStart(2, "0")}`;

    const homeEntry = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam));
    const awayEntry = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam));
    const homeElo = homeEntry !== undefined ? homeEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = awayEntry !== undefined ? awayEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const homeRatingSource = homeEntry !== undefined ? homeEntry.ratingSource : ("fallback_seed" as const);
    const awayRatingSource = awayEntry !== undefined ? awayEntry.ratingSource : ("fallback_seed" as const);

    const xgResult = eloToExpectedGoals({ homeEloRating: homeElo, awayEloRating: awayElo });
    const scoreMatrix = generateScoreMatrix(
      { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
      { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
    );
    const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
    const scorelines = getMostLikelyScorelines(scoreMatrix, 3);

    const fallbackTeams: string[] = [];
    if (homeRatingSource === "fallback_seed") fallbackTeams.push(homeTeam);
    if (awayRatingSource === "fallback_seed") fallbackTeams.push(awayTeam);
    const fixtureWarnings: string[] =
      fallbackTeams.length === 0
        ? []
        : [`${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams: ${fallbackTeams.join(", ")}.`];

    return {
      fixtureId,
      round: "quarterfinal" as const,
      slot,
      homeTeam,
      awayTeam,
      homeExpectedGoals: xgResult.homeExpectedGoals,
      awayExpectedGoals: xgResult.awayExpectedGoals,
      homeWinProbability: outcomes.homeWinProbability,
      drawProbability: outcomes.drawProbability,
      awayWinProbability: outcomes.awayWinProbability,
      mostLikelyScorelines: scorelines,
      homeRatingSource,
      awayRatingSource,
      warnings: fixtureWarnings
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_quarterfinal_match_simulation_foundation",
    simulatedFixturesCount: fixtures.length,
    round: "quarterfinal",
    simulationType: "match_level_foundation",
    source: "projected_quarterfinals",
    fixtures,
    warnings: [
      "Advancement after extra time/penalties is not modeled in this phase.",
      "Quarterfinal participants are projected from Round of 16 pre-match probabilities. Real match outcomes are not yet simulated.",
      "Winners are not selected. No semifinal generation. No champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Quarterfinal match simulation foundation: match probabilities computed per fixture using Live Elo ratings and Poisson score matrix.",
      "Participants are projected from the Round of 16 match simulation foundation via deterministic winner selection.",
      "This phase simulates match-level probabilities only — no winner selection, no semifinal progression, no penalty shootout modeling.",
      "No external API calls, live score service, winner selection, or prediction formula changes are used."
    ])
  };
}

function deriveSemifinalQualifier(
  fixture: WorldCup2026QuarterfinalMatchSimulationFixture,
  ratingsByTeam: Map<string, WorldCup2026CoverageEntry>
): WorldCup2026SemifinalQualifier {
  const {
    homeTeam,
    awayTeam,
    homeWinProbability,
    awayWinProbability,
    drawProbability,
    fixtureId,
    slot,
    homeRatingSource,
    awayRatingSource
  } = fixture;

  let winner: string;
  let advancementReason: string;

  if (homeWinProbability > awayWinProbability) {
    winner = homeTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else if (awayWinProbability > homeWinProbability) {
    winner = awayTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else {
    const homeElo = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;

    if (homeElo > awayElo) {
      winner = homeTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else if (awayElo > homeElo) {
      winner = awayTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else {
      winner = homeTeam;
      advancementReason = "advanced as home team (equal win probability and equal Elo)";
    }
  }

  return {
    team: winner,
    qualificationSource: "quarterfinal",
    sourceFixtureId: fixtureId,
    sourceSlot: slot,
    advancementReason,
    probabilitySnapshot: {
      homeWinProbability,
      drawProbability,
      awayWinProbability
    },
    sourceHomeTeam: homeTeam,
    sourceAwayTeam: awayTeam,
    homeRatingSource,
    awayRatingSource
  };
}

export function simulateWorldCup2026SemifinalFoundation(): WorldCup2026SemifinalFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const qfMatchSimulation = simulateWorldCup2026QuarterfinalMatchesFoundation();

  const projectedSemifinalTeams: WorldCup2026SemifinalQualifier[] = qfMatchSimulation.fixtures.map((fixture) =>
    deriveSemifinalQualifier(fixture, ratingsByTeam)
  );

  const projectedSemifinalFixtures: WorldCup2026SemifinalFixture[] = Array.from({ length: 2 }, (_, i) => {
    const slot = i + 1;
    const homeQualifier = projectedSemifinalTeams[i * 2];
    const awayQualifier = projectedSemifinalTeams[i * 2 + 1];

    if (homeQualifier === undefined || awayQualifier === undefined) {
      throw new Error("simulateWorldCup2026SemifinalFoundation: expected 4 QF qualifiers to build 2 SF fixtures.");
    }

    return {
      fixtureId: `wc2026-sf-${slot.toString().padStart(2, "0")}`,
      round: "semifinal" as const,
      slot,
      homeTeam: homeQualifier.team,
      awayTeam: awayQualifier.team,
      homeQualifier,
      awayQualifier,
      status: "projected" as const
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_semifinal_foundation",
    round: "semifinal",
    projectedSemifinalTeamsCount: projectedSemifinalTeams.length,
    fixturesCount: projectedSemifinalFixtures.length,
    simulationType: "deterministic_winner_selection",
    source: "quarterfinal_match_simulation_foundation",
    projectedSemifinalTeams,
    projectedSemifinalFixtures,
    warnings: [
      "Semifinal participants are projected from quarterfinal pre-match probabilities. Real match outcomes, extra time, and penalties are not modeled yet.",
      "Winner selection is deterministic: highest win probability advances. Elo is the tie-breaker; home team wins if both are equal.",
      "No penalties, no randomization, no semifinal match simulation, no final generation, no champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Semifinal foundation derives 4 projected qualifiers from quarterfinal match probabilities using a deterministic winner-selection rule.",
      "Winner selection: highest win probability wins; Elo tie-break if equal; home team wins if both are equal.",
      "This phase projects semifinal participants and fixtures only — no semifinal match simulation, no finalist generation, no penalty shootout modeling.",
      "No external API calls, live score service, randomization, or prediction formula changes are used."
    ])
  };
}

export function simulateWorldCup2026SemifinalMatchesFoundation(): WorldCup2026SemifinalMatchSimulationFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const sfFoundation = simulateWorldCup2026SemifinalFoundation();
  const sfFixtures = sfFoundation.projectedSemifinalFixtures;

  const fixtures: WorldCup2026SemifinalMatchSimulationFixture[] = sfFixtures.map((fixture) => {
    const { slot, homeTeam, awayTeam } = fixture;
    const fixtureId = `wc2026-sf-sim-${slot.toString().padStart(2, "0")}`;

    const homeEntry = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam));
    const awayEntry = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam));
    const homeElo = homeEntry !== undefined ? homeEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = awayEntry !== undefined ? awayEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const homeRatingSource = homeEntry !== undefined ? homeEntry.ratingSource : ("fallback_seed" as const);
    const awayRatingSource = awayEntry !== undefined ? awayEntry.ratingSource : ("fallback_seed" as const);

    const xgResult = eloToExpectedGoals({ homeEloRating: homeElo, awayEloRating: awayElo });
    const scoreMatrix = generateScoreMatrix(
      { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
      { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
    );
    const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
    const scorelines = getMostLikelyScorelines(scoreMatrix, 3);

    const fallbackTeams: string[] = [];
    if (homeRatingSource === "fallback_seed") fallbackTeams.push(homeTeam);
    if (awayRatingSource === "fallback_seed") fallbackTeams.push(awayTeam);
    const fixtureWarnings: string[] =
      fallbackTeams.length === 0
        ? []
        : [`${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams: ${fallbackTeams.join(", ")}.`];

    return {
      fixtureId,
      round: "semifinal" as const,
      slot,
      homeTeam,
      awayTeam,
      homeExpectedGoals: xgResult.homeExpectedGoals,
      awayExpectedGoals: xgResult.awayExpectedGoals,
      homeWinProbability: outcomes.homeWinProbability,
      drawProbability: outcomes.drawProbability,
      awayWinProbability: outcomes.awayWinProbability,
      mostLikelyScorelines: scorelines,
      homeRatingSource,
      awayRatingSource,
      warnings: fixtureWarnings
    };
  });

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_semifinal_match_simulation_foundation",
    simulatedFixturesCount: fixtures.length,
    round: "semifinal",
    simulationType: "match_level_foundation",
    source: "projected_semifinals",
    fixtures,
    warnings: [
      "Advancement after extra time/penalties is not modeled in this phase.",
      "Semifinal participants are projected from quarterfinal pre-match probabilities. Real match outcomes are not yet simulated.",
      "Winners are not selected. No final advancement. No champion probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Semifinal match simulation foundation: match probabilities computed per fixture using Live Elo ratings and Poisson score matrix.",
      "Participants are projected from the quarterfinal match simulation foundation via deterministic winner selection.",
      "This phase simulates match-level probabilities only — no winner selection, no final progression, no penalty shootout modeling.",
      "No external API calls, live score service, winner selection, or prediction formula changes are used."
    ])
  };
}

function deriveFinalQualifier(
  fixture: WorldCup2026SemifinalMatchSimulationFixture,
  ratingsByTeam: Map<string, WorldCup2026CoverageEntry>
): WorldCup2026FinalQualifier {
  const {
    homeTeam,
    awayTeam,
    homeWinProbability,
    awayWinProbability,
    drawProbability,
    fixtureId,
    slot,
    homeRatingSource,
    awayRatingSource
  } = fixture;

  let winner: string;
  let advancementReason: string;

  if (homeWinProbability > awayWinProbability) {
    winner = homeTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else if (awayWinProbability > homeWinProbability) {
    winner = awayTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else {
    const homeElo = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;

    if (homeElo > awayElo) {
      winner = homeTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else if (awayElo > homeElo) {
      winner = awayTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else {
      winner = homeTeam;
      advancementReason = "advanced as home team (equal win probability and equal Elo)";
    }
  }

  return {
    team: winner,
    qualificationSource: "semifinal",
    semifinalSourceFixtureId: fixtureId,
    sourceSlot: slot,
    advancementReason,
    probabilitySnapshot: {
      homeWinProbability,
      drawProbability,
      awayWinProbability
    },
    sourceHomeTeam: homeTeam,
    sourceAwayTeam: awayTeam,
    homeRatingSource,
    awayRatingSource
  };
}

export function simulateWorldCup2026FinalFoundation(): WorldCup2026FinalFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const sfMatchSimulation = simulateWorldCup2026SemifinalMatchesFoundation();
  const projectedFinalists: WorldCup2026FinalQualifier[] = sfMatchSimulation.fixtures.map((fixture) =>
    deriveFinalQualifier(fixture, ratingsByTeam)
  );

  const homeQualifier = projectedFinalists[0];
  const awayQualifier = projectedFinalists[1];

  if (homeQualifier === undefined || awayQualifier === undefined) {
    throw new Error("simulateWorldCup2026FinalFoundation: expected 2 semifinal qualifiers to build 1 final fixture.");
  }

  const projectedFinalFixture: WorldCup2026FinalFixture = {
    fixtureId: "wc2026-final-01",
    round: "final",
    slot: 1,
    homeTeam: homeQualifier.team,
    awayTeam: awayQualifier.team,
    homeQualifier,
    awayQualifier,
    status: "projected"
  };

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_final_foundation",
    round: "final",
    projectedFinalistsCount: projectedFinalists.length,
    fixturesCount: 1,
    simulationType: "deterministic_winner_selection",
    source: "projected_semifinals",
    projectedFinalists,
    projectedFinalFixtures: [projectedFinalFixture],
    warnings: [
      "Projected Final foundation based on semifinal pre-match probabilities. Real match outcomes, extra time, and penalties are not modeled yet.",
      "Winner selection is deterministic: highest win probability advances. Elo is the tie-breaker; home team wins if both are equal.",
      "No final match simulation, no penalties, no randomization, no champion output, no title probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Final foundation derives 2 projected finalists from semifinal match probabilities using a deterministic winner-selection rule.",
      "Winner selection: highest win probability wins; Elo tie-break if equal; home team wins if both are equal.",
      "This phase projects Final participants only — no Final match simulation, no champion selection, no penalty shootout modeling.",
      "No external API calls, live score service, randomization, or prediction formula changes are used."
    ])
  };
}

export function simulateWorldCup2026FinalMatchFoundation(): WorldCup2026FinalMatchSimulationFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const finalFoundation = simulateWorldCup2026FinalFoundation();
  const projectedFixture = finalFoundation.projectedFinalFixtures[0];

  if (projectedFixture === undefined) {
    throw new Error("simulateWorldCup2026FinalMatchFoundation: expected 1 projected final fixture.");
  }

  const homeEntry = ratingsByTeam.get(normalizeTeamLookupKey(projectedFixture.homeTeam));
  const awayEntry = ratingsByTeam.get(normalizeTeamLookupKey(projectedFixture.awayTeam));
  const homeElo = homeEntry !== undefined ? homeEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
  const awayElo = awayEntry !== undefined ? awayEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
  const homeRatingSource = homeEntry !== undefined ? homeEntry.ratingSource : ("fallback_seed" as const);
  const awayRatingSource = awayEntry !== undefined ? awayEntry.ratingSource : ("fallback_seed" as const);

  const xgResult = eloToExpectedGoals({ homeEloRating: homeElo, awayEloRating: awayElo });
  const scoreMatrix = generateScoreMatrix(
    { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
    { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
  );
  const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
  const scorelines = getMostLikelyScorelines(scoreMatrix, 3);

  const fallbackTeams: string[] = [];
  if (homeRatingSource === "fallback_seed") fallbackTeams.push(projectedFixture.homeTeam);
  if (awayRatingSource === "fallback_seed") fallbackTeams.push(projectedFixture.awayTeam);
  const fixtureWarnings: string[] =
    fallbackTeams.length === 0
      ? []
      : [`${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams: ${fallbackTeams.join(", ")}.`];

  const fixture: WorldCup2026FinalMatchSimulationFixture = {
    fixtureId: "wc2026-final-sim-01",
    round: "final",
    slot: 1,
    homeTeam: projectedFixture.homeTeam,
    awayTeam: projectedFixture.awayTeam,
    homeExpectedGoals: xgResult.homeExpectedGoals,
    awayExpectedGoals: xgResult.awayExpectedGoals,
    homeWinProbability: outcomes.homeWinProbability,
    drawProbability: outcomes.drawProbability,
    awayWinProbability: outcomes.awayWinProbability,
    mostLikelyScorelines: scorelines,
    homeRatingSource,
    awayRatingSource,
    warnings: fixtureWarnings
  };

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_final_match_simulation_foundation",
    simulatedFixturesCount: 1,
    round: "final",
    simulationType: "match_level_foundation",
    source: "projected_final",
    fixtures: [fixture],
    warnings: [
      "Champion selection after extra time/penalties is not modeled in this phase.",
      "Final participants are projected from semifinal pre-match probabilities. Real match outcomes are not yet simulated.",
      "Champion is not selected. No title probabilities.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Final match simulation foundation: match probabilities computed for the projected Final fixture using Live Elo ratings and Poisson score matrix.",
      "Participants are projected from the semifinal match simulation foundation via deterministic winner selection.",
      "This phase simulates Final match-level probabilities only — no champion selection, no title probabilities, no penalty shootout modeling.",
      "No external API calls, live score service, winner selection, or prediction formula changes are used."
    ])
  };
}

function resolveKnockoutWinnerFromFixture(
  fixture: {
    fixtureId: string;
    slot: number;
    homeTeam: string;
    awayTeam: string;
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
    homeRatingSource: LiveEloRatingSource;
    awayRatingSource: LiveEloRatingSource;
  },
  round: WorldCup2026ResolvedKnockoutWinner["round"],
  ratingsByTeam: Map<string, WorldCup2026CoverageEntry>
): WorldCup2026ResolvedKnockoutWinner {
  const { fixtureId, slot, homeTeam, awayTeam, homeWinProbability, awayWinProbability, drawProbability, homeRatingSource, awayRatingSource } = fixture;
  let winner: string;
  let loser: string;
  let advancementReason: string;

  if (homeWinProbability > awayWinProbability) {
    winner = homeTeam;
    loser = awayTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else if (awayWinProbability > homeWinProbability) {
    winner = awayTeam;
    loser = homeTeam;
    advancementReason = "advanced via highest pre-match win probability";
  } else {
    const homeElo = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;
    const awayElo = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;

    if (homeElo > awayElo) {
      winner = homeTeam;
      loser = awayTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else if (awayElo > homeElo) {
      winner = awayTeam;
      loser = homeTeam;
      advancementReason = "advanced via Elo tie-break (equal win probability)";
    } else {
      winner = homeTeam;
      loser = awayTeam;
      advancementReason = "advanced as home team (equal win probability and equal Elo)";
    }
  }

  return {
    team: winner,
    round,
    sourceFixtureId: fixtureId,
    slot,
    opponent: loser,
    advancementReason,
    probabilitySnapshot: { homeWinProbability, drawProbability, awayWinProbability },
    homeRatingSource,
    awayRatingSource
  };
}

export function resolveWorldCup2026KnockoutWinnersFoundation(): WorldCup2026KnockoutWinnerResolutionResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const r32Sim = simulateWorldCup2026KnockoutFixturesFoundation();
  const r16Sim = simulateWorldCup2026RoundOf16MatchesFoundation();
  const qfSim = simulateWorldCup2026QuarterfinalMatchesFoundation();
  const sfSim = simulateWorldCup2026SemifinalMatchesFoundation();
  const finalSim = simulateWorldCup2026FinalMatchFoundation();

  const finalFixture = finalSim.fixtures[0];
  if (finalFixture === undefined) {
    throw new Error("resolveWorldCup2026KnockoutWinnersFoundation: expected 1 projected final fixture.");
  }

  const roundOf32Winners = r32Sim.fixtures.map((f) => resolveKnockoutWinnerFromFixture(f, "round_of_32", ratingsByTeam));
  const roundOf16Winners = r16Sim.fixtures.map((f) => resolveKnockoutWinnerFromFixture(f, "round_of_16", ratingsByTeam));
  const quarterfinalWinners = qfSim.fixtures.map((f) => resolveKnockoutWinnerFromFixture(f, "quarterfinal", ratingsByTeam));
  const semifinalWinners = sfSim.fixtures.map((f) => resolveKnockoutWinnerFromFixture(f, "semifinal", ratingsByTeam));
  const champion = resolveKnockoutWinnerFromFixture(finalFixture, "final", ratingsByTeam);

  const runnerUpTeam = champion.team === finalFixture.homeTeam ? finalFixture.awayTeam : finalFixture.homeTeam;
  const runnerUp: WorldCup2026ResolvedKnockoutWinner = {
    team: runnerUpTeam,
    round: "final",
    sourceFixtureId: finalFixture.fixtureId,
    slot: finalFixture.slot,
    opponent: champion.team,
    advancementReason: "reached the final",
    probabilitySnapshot: {
      homeWinProbability: finalFixture.homeWinProbability,
      drawProbability: finalFixture.drawProbability,
      awayWinProbability: finalFixture.awayWinProbability
    },
    homeRatingSource: finalFixture.homeRatingSource,
    awayRatingSource: finalFixture.awayRatingSource
  };

  const totalResolvedFixtures = roundOf32Winners.length + roundOf16Winners.length + quarterfinalWinners.length + semifinalWinners.length + 1;

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_knockout_winner_resolution_foundation",
    resolutionType: "deterministic_foundation",
    resolvedRounds: ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"],
    totalResolvedFixtures,
    championSelected: true,
    roundOf32Winners,
    roundOf16Winners,
    quarterfinalWinners,
    semifinalWinners,
    champion,
    runnerUp,
    finalFixtureId: finalFixture.fixtureId,
    warnings: [
      "Champion is selected by deterministic pre-match probabilities only. Extra time, penalties, and live results are not modeled.",
      "No extra time modeled. No penalty shootout modeled. This is a deterministic projection only.",
      "Projected bracket is based on local curated match data. Not a live or official source.",
      "Winner selection: highest win probability advances. Elo is the tie-breaker; home team wins if both are equal.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Knockout winner resolution foundation: deterministic winners derived from all simulated knockout match probabilities.",
      "Winner selection: highest win probability wins; Elo tie-break if equal; home team wins if both are equal.",
      "No extra time, penalties, or randomization. No champion probability distribution.",
      "No external API calls, live score service, or prediction formula changes are used."
    ])
  };
}

export function getWorldCup2026ThirdPlaceMatchFoundation(): WorldCup2026ThirdPlaceMatchFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const sfSim = simulateWorldCup2026SemifinalMatchesFoundation();
  const sfFixtures = sfSim.fixtures;

  if (sfFixtures.length < 2) {
    throw new Error("getWorldCup2026ThirdPlaceMatchFoundation: expected 2 semifinal simulated fixtures.");
  }

  const participants: WorldCup2026ThirdPlaceParticipant[] = sfFixtures.map((fixture) => {
    const { homeTeam, awayTeam, homeWinProbability, awayWinProbability, drawProbability, fixtureId, homeRatingSource, awayRatingSource } = fixture;

    let loser: string;
    let winner: string;
    let eliminationReason: string;

    if (homeWinProbability > awayWinProbability) {
      winner = homeTeam;
      loser = awayTeam;
      eliminationReason = "eliminated — opponent had higher pre-match win probability";
    } else if (awayWinProbability > homeWinProbability) {
      winner = awayTeam;
      loser = homeTeam;
      eliminationReason = "eliminated — opponent had higher pre-match win probability";
    } else {
      const homeElo = ratingsByTeam.get(normalizeTeamLookupKey(homeTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;
      const awayElo = ratingsByTeam.get(normalizeTeamLookupKey(awayTeam))?.eloRating ?? WORLD_CUP_2026_FALLBACK_SEED_RATING;

      if (homeElo > awayElo) {
        winner = homeTeam;
        loser = awayTeam;
        eliminationReason = "eliminated via Elo tie-break (equal win probability)";
      } else if (awayElo > homeElo) {
        winner = awayTeam;
        loser = homeTeam;
        eliminationReason = "eliminated via Elo tie-break (equal win probability)";
      } else {
        winner = homeTeam;
        loser = awayTeam;
        eliminationReason = "eliminated as away team (equal win probability and equal Elo)";
      }
    }

    return {
      team: loser,
      semifinalSourceFixtureId: fixtureId,
      lostTo: winner,
      eliminationReason,
      probabilitySnapshot: { homeWinProbability, drawProbability, awayWinProbability },
      homeRatingSource,
      awayRatingSource
    };
  });

  const homeParticipant = participants[0];
  const awayParticipant = participants[1];

  if (homeParticipant === undefined || awayParticipant === undefined) {
    throw new Error("getWorldCup2026ThirdPlaceMatchFoundation: expected 2 semifinal losers.");
  }

  const fixture: WorldCup2026ThirdPlaceMatchFixture = {
    fixtureId: "wc2026-3rd-place-01",
    round: "third_place",
    homeTeam: homeParticipant.team,
    awayTeam: awayParticipant.team,
    homeParticipant,
    awayParticipant,
    status: "projected",
    source: "projected_semifinal_losers"
  };

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_third_place_match_foundation",
    round: "third_place",
    participantsCount: 2,
    fixturesCount: 1,
    simulationType: "fixture_foundation",
    source: "projected_semifinal_losers",
    projectedParticipants: [homeParticipant, awayParticipant],
    thirdPlaceMatchFixture: fixture,
    warnings: [
      "This section projects the Third Place Match participants only. The match is not simulated yet.",
      "Participants are the projected semifinal losers from deterministic pre-match probability resolution.",
      "No third-place match simulation, no third-place winner selection, no penalty logic.",
      "No extra time or penalty modeling. Deterministic semifinal loser selection only.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Third Place Match foundation: participants derived from projected semifinal losers using deterministic winner selection.",
      "Loser selection: lower win probability is eliminated; Elo tie-break if equal; away team eliminated if both equal.",
      "This phase generates the Third Place Match fixture only — no match simulation, no winner selection, no penalty shootout modeling.",
      "No external API calls, live score service, randomization, or prediction formula changes are used."
    ])
  };
}

export function simulateWorldCup2026ThirdPlaceMatchFoundation(): WorldCup2026ThirdPlaceMatchSimulationFoundationResponse {
  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const coverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
  const ratingsByTeam = buildCoverageLookup(coverageEntries);

  const thirdPlaceFoundation = getWorldCup2026ThirdPlaceMatchFoundation();
  const projectedFixture = thirdPlaceFoundation.thirdPlaceMatchFixture;

  const homeEntry = ratingsByTeam.get(normalizeTeamLookupKey(projectedFixture.homeTeam));
  const awayEntry = ratingsByTeam.get(normalizeTeamLookupKey(projectedFixture.awayTeam));
  const homeElo = homeEntry !== undefined ? homeEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
  const awayElo = awayEntry !== undefined ? awayEntry.eloRating : WORLD_CUP_2026_FALLBACK_SEED_RATING;
  const homeRatingSource = homeEntry !== undefined ? homeEntry.ratingSource : ("fallback_seed" as const);
  const awayRatingSource = awayEntry !== undefined ? awayEntry.ratingSource : ("fallback_seed" as const);

  const xgResult = eloToExpectedGoals({ homeEloRating: homeElo, awayEloRating: awayElo });
  const scoreMatrix = generateScoreMatrix(
    { expectedHomeGoals: xgResult.homeExpectedGoals, expectedAwayGoals: xgResult.awayExpectedGoals },
    { maxGoals: DEFAULT_POISSON_CONFIG.maxGoals, normalizeMatrix: DEFAULT_POISSON_CONFIG.normalizeMatrix }
  );
  const outcomes = aggregateOutcomeProbabilities(scoreMatrix);
  const scorelines = getMostLikelyScorelines(scoreMatrix, 3);

  const fallbackTeams: string[] = [];
  if (homeRatingSource === "fallback_seed") fallbackTeams.push(projectedFixture.homeTeam);
  if (awayRatingSource === "fallback_seed") fallbackTeams.push(projectedFixture.awayTeam);
  const fixtureWarnings: string[] =
    fallbackTeams.length === 0
      ? []
      : [`${WORLD_CUP_2026_FALLBACK_RATING_WARNING} Fallback teams: ${fallbackTeams.join(", ")}.`];

  const fixture: WorldCup2026ThirdPlaceMatchSimulationFixture = {
    fixtureId: "wc2026-3rd-place-sim-01",
    round: "third_place",
    homeTeam: projectedFixture.homeTeam,
    awayTeam: projectedFixture.awayTeam,
    homeExpectedGoals: xgResult.homeExpectedGoals,
    awayExpectedGoals: xgResult.awayExpectedGoals,
    homeWinProbability: outcomes.homeWinProbability,
    drawProbability: outcomes.drawProbability,
    awayWinProbability: outcomes.awayWinProbability,
    mostLikelyScorelines: scorelines,
    homeRatingSource,
    awayRatingSource,
    warnings: fixtureWarnings
  };

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_third_place_match_simulation_foundation",
    simulatedFixturesCount: 1,
    round: "third_place",
    simulationType: "match_level_foundation",
    source: "projected_third_place_match",
    fixtures: [fixture],
    warnings: [
      "Third-place winner selection is not modeled in this phase.",
      "Third Place Match participants are projected from semifinal pre-match probabilities. Real match outcomes are not yet simulated.",
      "Third-place winner is not selected. No extra time or penalty modeling.",
      `Live Elo simulation uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`,
      ...internationalSupplement.metadata.foundationWarnings
    ],
    metadata: buildApiMetadata([
      "Third Place Match simulation foundation: match probabilities computed for the projected Third Place Match fixture using Live Elo ratings and Poisson score matrix.",
      "Participants are projected semifinal losers from deterministic loser selection.",
      "This phase simulates Third Place Match-level probabilities only — no winner selection, no title probabilities, no extra time or penalty shootout modeling.",
      "No external API calls, live score service, winner selection, or prediction formula changes are used."
    ])
  };
}

export function getAvailableLiveEloTeams(): string[] {
  const { pipeline } = buildLiveEloPipelineFoundation();

  return getAvailableTeamCoverage(buildWorldCup2026CoverageEntries(pipeline.rankedRatings));
}

function buildPredictionHistoryMetadata(
  resolution: PredictionHistoryPersistenceResolution,
  notes: readonly string[]
) {
  return buildApiMetadata(notes, {
    databaseEnabled: resolution.metadata.persistent
  });
}

function mapPredictionHistoryErrorCode(
  error: unknown
): PredictionHistoryPersistenceErrorCode {
  if (error instanceof PredictionHistoryPersistenceConfigError) {
    return error.code;
  }

  if (isPredictionHistoryPersistenceError(error)) {
    return error.code;
  }

  return "query_failed";
}

function mapPredictionHistoryErrorMessage(
  code: PredictionHistoryPersistenceErrorCode
): string {
  switch (code) {
    case "invalid_provider":
      return 'PERSISTENCE_PROVIDER must be "memory" or "postgres".';
    case "missing_database_url":
      return "A server-side database connection string is required when prediction history persistence uses postgres.";
    case "connection_unavailable":
      return "Prediction history persistence is currently unavailable.";
    case "migration_missing":
      return "Prediction history persistence schema is missing or out of date.";
    case "duplicate_conflict":
      return "Prediction history record conflicts with an existing immutable record.";
    case "foreign_key_violation":
      return "Referenced prediction snapshot was not found.";
    case "invalid_stored_record":
      return "Stored prediction history record is invalid.";
    case "unsupported_schema_version":
      return "Stored prediction history schema version is not supported.";
    case "query_failed":
      return "Prediction history storage query failed.";
    case "invalid_cache_key":
      return "Projection cache key is invalid.";
    case "invalid_expiration":
      return "Projection cache expiration timestamp is invalid.";
  }
}

function buildPredictionHistoryErrorResponse(
  error: unknown,
  notes: readonly string[],
  resolution?: PredictionHistoryPersistenceResolution
): PredictionHistoryPersistenceErrorResponse {
  const code = mapPredictionHistoryErrorCode(error);

  return {
    status: "error",
    error: {
      code,
      message: mapPredictionHistoryErrorMessage(code)
    },
    metadata: buildApiMetadata(notes, {
      databaseEnabled: resolution?.metadata.persistent ?? false
    }),
    ...(resolution === undefined
      ? {}
      : { persistenceMetadata: resolution.metadata })
  };
}

export async function createWorldCup2026PredictionSnapshot(
  request: CreateWorldCup2026PredictionSnapshotRequest
): Promise<CreateWorldCup2026PredictionSnapshotResponse> {
  const { fixtureId, capturedAt: rawCapturedAt, cutoffAt: rawCutoffAt, kickoffAt, tournamentResultsAdjustmentEnabled = false } = request;
  const issues: import("./schemas.js").ApiValidationIssue[] = [];

  if (typeof fixtureId !== "string" || fixtureId.trim() === "") {
    issues.push({ field: "fixtureId", message: "fixtureId is required." });
  }

  if (issues.length > 0) {
    return {
      status: "validation_error",
      issues,
      metadata: buildApiMetadata(["Snapshot creation failed validation."])
    };
  }

  const fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.id === fixtureId);

  if (fixture === undefined) {
    return {
      status: "validation_error",
      issues: [{ field: "fixtureId", message: `fixtureId "${fixtureId}" does not match any official World Cup 2026 group-stage fixture.` }],
      metadata: buildApiMetadata(["Only official scheduled WC2026 fixtures may have pre-match prediction snapshots."])
    };
  }

  const capturedAt = rawCapturedAt ?? new Date().toISOString();
  const cutoffAt = rawCutoffAt ?? capturedAt;

  if (kickoffAt !== undefined && capturedAt >= kickoffAt) {
    return {
      status: "validation_error",
      issues: [{ field: "capturedAt", message: `Cannot create a pre-match snapshot after kickoff. capturedAt "${capturedAt}" is at or after kickoffAt "${kickoffAt}".` }],
      metadata: buildApiMetadata(["Snapshot creation rejected: match has already started or the capture time is past kickoff."])
    };
  }

  const predictionResult = predictMatchFromLiveElo({
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    ...(tournamentResultsAdjustmentEnabled ? { tournamentResultsAdjustment: { enabled: true, cutoffAt } } : {})
  });

  if (predictionResult.status !== "success") {
    return {
      status: "validation_error",
      issues: predictionResult.issues,
      metadata: buildApiMetadata(["Prediction could not be generated for the requested fixture."])
    };
  }

  const { snapshot, idempotencyKey } = buildWorldCup2026PredictionSnapshot({
    fixture,
    prediction: predictionResult,
    capturedAt,
    cutoffAt,
    ...(kickoffAt !== undefined ? { kickoffAt } : {}),
    tournamentResultsAdjustmentEnabled
  });

  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction snapshot persistence configuration failed before the snapshot could be stored."
    ]);
  }

  let storeResult;

  try {
    storeResult = await persistence.snapshotStore.create(snapshot, idempotencyKey);
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction snapshot persistence failed and the snapshot was not stored."
    ], persistence);
  }

  const warnings: string[] = [];

  if (snapshot.status === "foundation_unverified") {
    warnings.push(
      "This snapshot has status 'foundation_unverified' because no kickoff time was available to confirm pre-match capture. It should not be treated as a verified pre-match lock."
    );
  }

  return {
    status: "success",
    result: storeResult.result,
    duplicate: storeResult.duplicate,
    snapshot: storeResult.snapshot,
    warnings,
    metadata: buildApiMetadata([
      `Snapshot model version: ${WORLD_CUP_2026_PREDICTION_MODEL_VERSION}.`,
      `Snapshot status: ${storeResult.snapshot.status}.`,
      storeResult.duplicate ? "Idempotency key matched an existing snapshot. Returned existing record." : "New snapshot created and stored.",
      persistence.metadata.persistent
        ? "Snapshot persisted through the configured server-side PostgreSQL adapter."
        : "In-memory storage only. Snapshots do not persist across serverless invocations or restarts."
    ], {
      databaseEnabled: persistence.metadata.persistent
    }),
    persistenceMetadata: persistence.metadata
  };
}

export async function getWorldCup2026PredictionSnapshot(
  snapshotId: string
): Promise<GetWorldCup2026PredictionSnapshotResponse> {
  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      `Prediction snapshot "${snapshotId}" could not be loaded because persistence configuration is invalid.`
    ]);
  }

  let snapshot;

  try {
    snapshot = await persistence.snapshotStore.getById(snapshotId);
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      `Prediction snapshot "${snapshotId}" could not be read from persistent storage.`
    ], persistence);
  }

  if (snapshot === null) {
    return {
      status: "not_found",
      snapshotId,
      metadata: buildPredictionHistoryMetadata(persistence, [
        `No snapshot found with id "${snapshotId}".`
      ])
    };
  }

  return {
    status: "success",
    snapshot,
    metadata: buildPredictionHistoryMetadata(persistence, [
      persistence.metadata.persistent
        ? `Snapshot "${snapshotId}" retrieved from PostgreSQL-backed persistent storage.`
        : `Snapshot "${snapshotId}" retrieved from in-memory store.`
    ]),
    persistenceMetadata: persistence.metadata
  };
}

export async function listWorldCup2026PredictionSnapshots(
  fixtureId?: string
): Promise<ListWorldCup2026PredictionSnapshotsResponse | PredictionHistoryPersistenceErrorResponse> {
  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction snapshot listing could not start because persistence configuration is invalid."
    ]);
  }

  let snapshots;

  try {
    snapshots = await persistence.snapshotStore.list({
      ...(fixtureId === undefined ? {} : { fixtureId }),
      limit: 1000
    });
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction snapshot listing failed while reading persistent storage."
    ], persistence);
  }

  return {
    status: "success",
    snapshots,
    totalCount: snapshots.length,
    ...(fixtureId !== undefined ? { fixtureId } : {}),
    metadata: buildPredictionHistoryMetadata(persistence, [
      fixtureId !== undefined
        ? `Listed ${snapshots.length} snapshot(s) for fixture "${fixtureId}".`
        : `Listed all ${snapshots.length} snapshot(s).`,
      "Snapshots are ordered by capturedAt ascending, then snapshotId ascending.",
      persistence.metadata.persistent
        ? "Snapshots were read from the configured PostgreSQL-backed store."
        : "In-memory storage only. Snapshots do not persist across serverless invocations or restarts."
    ]),
    persistenceMetadata: persistence.metadata
  };
}

export async function createWorldCup2026PredictionEvaluation(
  request: CreateWorldCup2026PredictionEvaluationRequest
): Promise<CreateWorldCup2026PredictionEvaluationResponse> {
  if (typeof request.snapshotId !== "string" || request.snapshotId.trim() === "") {
    return {
      status: "not_eligible",
      issues: [
        {
          code: "missing_snapshot",
          message: "snapshotId is required."
        }
      ],
      metadata: buildApiMetadata([
        "Prediction evaluation creation failed validation."
      ])
    };
  }

  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction evaluation persistence configuration failed before the snapshot could be loaded."
    ]);
  }

  let snapshot;

  try {
    snapshot = await persistence.snapshotStore.getById(request.snapshotId.trim());
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      `Prediction snapshot "${request.snapshotId.trim()}" could not be loaded for evaluation.`
    ], persistence);
  }

  if (snapshot === null) {
    return {
      status: "not_eligible",
      issues: [
        {
          code: "missing_snapshot",
          message: `No prediction snapshot exists with id "${request.snapshotId.trim()}".`,
          snapshotId: request.snapshotId.trim()
        }
      ],
      metadata: buildApiMetadata([
        "Prediction evaluation rejected because the referenced snapshot does not exist."
      ])
    };
  }

  const localResults = createLocalStaticResultsProvider().getCompletedResults();

  let evaluationResult;

  try {
    evaluationResult = await evaluateWorldCup2026PredictionSnapshotAsync({
      snapshot,
      completedResults:
        localResults.status === "success" ? localResults.records : [],
      evaluationStore: persistence.evaluationStore,
      resultSource: "local_static",
      cacheUsed: false,
      localFallbackUsed: true,
      ...(request.evaluatedAt === undefined ? {} : { evaluatedAt: request.evaluatedAt })
    });
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction evaluation persistence failed and the immutable evaluation was not stored."
    ], persistence);
  }

  if (evaluationResult.status === "not_eligible") {
    return {
      status: "not_eligible",
      issues: evaluationResult.issues,
      metadata: buildApiMetadata([
        "Prediction snapshot was not eligible for model-vs-reality evaluation."
      ])
    };
  }

  return {
    status: evaluationResult.status,
    evaluation: evaluationResult.evaluation!,
    issues: evaluationResult.issues,
    metadata: buildApiMetadata([
      evaluationResult.status === "duplicate"
        ? "Existing immutable evaluation returned for the same snapshot/result identity."
        : "Immutable model-vs-reality evaluation created from stored pre-match snapshot and completed local result.",
      "Evaluation uses stored snapshot probabilities only. No prediction was regenerated.",
      persistence.metadata.persistent
        ? "Evaluation persisted through the configured server-side PostgreSQL adapter."
        : "In-memory storage only. Evaluations do not persist across serverless invocations or restarts."
    ], {
      databaseEnabled: persistence.metadata.persistent
    }),
    persistenceMetadata: persistence.metadata
  };
}

export async function getWorldCup2026PredictionEvaluation(
  evaluationId: string
): Promise<GetWorldCup2026PredictionEvaluationResponse> {
  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      `Prediction evaluation "${evaluationId}" could not be loaded because persistence configuration is invalid.`
    ]);
  }

  let evaluation;

  try {
    evaluation = await persistence.evaluationStore.getById(evaluationId);
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      `Prediction evaluation "${evaluationId}" could not be read from persistent storage.`
    ], persistence);
  }

  if (evaluation === null) {
    return {
      status: "not_found",
      evaluationId,
      metadata: buildPredictionHistoryMetadata(persistence, [
        `No model-vs-reality evaluation found with id "${evaluationId}".`
      ])
    };
  }

  return {
    status: "success",
    evaluation,
    metadata: buildPredictionHistoryMetadata(persistence, [
      persistence.metadata.persistent
        ? `Model-vs-reality evaluation "${evaluationId}" retrieved from PostgreSQL-backed persistent storage.`
        : `Model-vs-reality evaluation "${evaluationId}" retrieved from in-memory store.`
    ]),
    persistenceMetadata: persistence.metadata
  };
}

export async function listWorldCup2026PredictionEvaluations(
  fixtureId?: string
): Promise<ListWorldCup2026PredictionEvaluationsResponse | PredictionHistoryPersistenceErrorResponse> {
  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction evaluation listing could not start because persistence configuration is invalid."
    ]);
  }

  let evaluations;

  try {
    evaluations = await persistence.evaluationStore.list({
      ...(fixtureId === undefined ? {} : { fixtureId }),
      limit: 1000
    });
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction evaluation listing failed while reading persistent storage."
    ], persistence);
  }

  return {
    status: "success",
    evaluations,
    totalCount: evaluations.length,
    ...(fixtureId !== undefined ? { fixtureId } : {}),
    metadata: buildPredictionHistoryMetadata(persistence, [
      fixtureId !== undefined
        ? `Listed ${evaluations.length} evaluation(s) for fixture "${fixtureId}".`
        : `Listed all ${evaluations.length} model-vs-reality evaluation(s).`,
      "Evaluations are ordered by evaluatedAt ascending, then evaluationId ascending.",
      persistence.metadata.persistent
        ? "Evaluations were read from the configured PostgreSQL-backed store."
        : "In-memory storage only. Evaluations do not persist across serverless invocations or restarts."
    ]),
    persistenceMetadata: persistence.metadata
  };
}

export async function getWorldCup2026ModelRealitySummary(): Promise<GetWorldCup2026ModelRealitySummaryResponse | PredictionHistoryPersistenceErrorResponse> {
  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Model-vs-reality summary could not start because persistence configuration is invalid."
    ]);
  }

  let evaluations;

  try {
    evaluations = await persistence.evaluationStore.list({ limit: 1000 });
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Model-vs-reality summary could not load stored evaluations."
    ], persistence);
  }

  return {
    status: "success",
    summary: summarizeWorldCup2026ModelReality(evaluations),
    metadata: buildPredictionHistoryMetadata(persistence, [
      `Model-vs-reality summary computed from ${evaluations.length} immutable evaluation(s).`,
      "Aggregate metrics are descriptive only and do not guarantee future predictive performance.",
      "Small samples should be treated cautiously."
    ]),
    persistenceMetadata: persistence.metadata
  };
}

export async function listWorldCup2026PredictionHistory(
  query: PredictionHistoryListQuery = {}
): Promise<PredictionHistoryListResponse> {
  const validation = validatePredictionHistoryListQuery(query);

  if (validation.issues.length > 0 || validation.value === undefined) {
    return {
      status: "validation_error",
      issues: validation.issues,
      metadata: buildApiMetadata([
        "Prediction history list query failed validation."
      ])
    };
  }

  let persistence: PredictionHistoryPersistenceResolution;

  try {
    persistence = await resolvePredictionHistoryPersistence();
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction history list could not start because persistence configuration is invalid."
    ]);
  }

  let result;

  try {
    result = await persistence.historyStore.list(validation.value);
  } catch (error) {
    return buildPredictionHistoryErrorResponse(error, [
      "Prediction history list failed while reading persistent storage."
    ], persistence);
  }

  return {
    status: "success",
    items: result.items,
    summary: result.summary,
    pagination: result.pagination,
    filters: result.filters,
    metadata: buildPredictionHistoryMetadata(persistence, [
      `Prediction history list returned ${result.items.length} item(s) on page ${result.pagination.page} of ${result.pagination.totalPages}.`,
      result.summary.evaluatedSnapshots === 0
        ? "No evaluations matched the current filter set."
        : `Prediction history summary is based on ${result.summary.evaluatedSnapshots} evaluated snapshot(s) within the current filter scope.`,
      persistence.metadata.persistent
        ? "Prediction history was read from the configured PostgreSQL-backed store."
        : "In-memory storage only. Prediction history does not persist across serverless invocations or restarts."
    ]),
    persistenceMetadata: persistence.metadata
  };
}

export const apiRoutes: ApiRoutes = {
  getHealth,
  getModelInfo,
  simulateMatch,
  predictMatchFromLiveElo,
  getHistoricalTournamentSummary,
  getHistoricalReplayAudit,
  getWorldCup2026FixtureFoundation,
  getWorldCup2026DailyMatches,
  getWorldCup2026GroupDetail,
  getWorldCup2026ResultsProviderFoundation,
  getWorldCup2026GroupStandingsFoundation,
  getWorldCup2026RoundOf32Foundation,
  getWorldCup2026KnockoutBracketFoundation,
  simulateWorldCup2026KnockoutFixturesFoundation,
  simulateWorldCup2026RoundOf16Foundation,
  simulateWorldCup2026RoundOf16MatchesFoundation,
  simulateWorldCup2026QuarterfinalFoundation,
  simulateWorldCup2026QuarterfinalMatchesFoundation,
  simulateWorldCup2026SemifinalFoundation,
  simulateWorldCup2026SemifinalMatchesFoundation,
  simulateWorldCup2026FinalFoundation,
  simulateWorldCup2026FinalMatchFoundation,
  resolveWorldCup2026KnockoutWinnersFoundation,
  getWorldCup2026ThirdPlaceMatchFoundation,
  simulateWorldCup2026ThirdPlaceMatchFoundation,
  getWorldCup2026LiveGroupStandings,
  getWorldCup2026EloIngestionFoundation,
  getWorldCup2026TournamentFormFoundation,
  createWorldCup2026PredictionSnapshot,
  getWorldCup2026PredictionSnapshot,
  listWorldCup2026PredictionSnapshots,
  createWorldCup2026PredictionEvaluation,
  getWorldCup2026PredictionEvaluation,
  listWorldCup2026PredictionEvaluations,
  getWorldCup2026ModelRealitySummary,
  listWorldCup2026PredictionHistory
};
