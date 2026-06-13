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
import { buildApiMetadata } from "./schemas.js";
import { canonicalizeTeamName, getAvailableTeamCoverage, normalizeTeamSearchText, resolveTeamAlias, suggestAvailableTeams } from "./team-aliases.js";
import {
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_FALLBACK_RATING_WARNING,
  WORLD_CUP_2026_FALLBACK_SEED_RATING,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_TEAM_NAMES,
  buildWorldCup2026CoverageEntries
} from "./world-cup-2026-teams.js";
import type { WorldCup2026CoverageEntry } from "./world-cup-2026-teams.js";
import type {
  ApiRoutes,
  ApiValidationIssue,
  HistoricalReplayAuditResponse,
  HistoricalTournamentSummary,
  HistoricalTournamentSummaryResponse,
  LiveEloRatingsFoundationOptions,
  LiveEloRatedTeamEntry,
  LiveEloRatingsFoundationResponse,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  SimulateMatchRequest,
  SimulateMatchResponse,
  SupportedHistoricalTournamentYear,
  TeamRatingFoundationEntry,
  TeamRatingsFoundationResponse,
  TournamentSimulationSuccessResponse,
  TournamentSimulationTeamResult,
  WorldCup2026FixtureFoundationResponse
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

export function predictMatchFromLiveElo(request: PredictMatchFromLiveEloRequest): PredictMatchFromLiveEloResponse {
  const issues = validatePredictMatchFromLiveEloRequest(request);

  if (issues.length > 0) {
    return {
      status: "validation_error",
      issues,
      metadata: buildApiMetadata(["Request failed validation before live Elo ratings were loaded."])
    };
  }

  const { internationalSupplement, combinedMatchCount, pipeline } = buildLiveEloPipelineFoundation();
  const worldCupCoverageEntries = buildWorldCup2026CoverageEntries(pipeline.rankedRatings);
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

  const xgResult = eloToExpectedGoals({
    homeEloRating: homeEntry.eloRating,
    awayEloRating: awayEntry.eloRating,
    ...(request.preset === undefined ? {} : { preset: request.preset })
  });
  const maxGoals = request.maxGoals ?? DEFAULT_POISSON_CONFIG.maxGoals;
  const normalizeMatrix = request.normalizeMatrix ?? DEFAULT_POISSON_CONFIG.normalizeMatrix;
  const scoreMatrix = generateScoreMatrix(
    {
      expectedHomeGoals: xgResult.homeExpectedGoals,
      expectedAwayGoals: xgResult.awayExpectedGoals
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
      expectedHomeGoals: xgResult.homeExpectedGoals,
      expectedAwayGoals: xgResult.awayExpectedGoals,
      maxGoals,
      normalizeMatrix
    },
    expectedGoals: {
      home: xgResult.homeExpectedGoals,
      away: xgResult.awayExpectedGoals,
      eloDifference: xgResult.eloDifference,
      baseExpectedGoals: xgResult.baseGoals,
      goalsAdjustment: xgResult.eloAdjustment,
      preset: xgResult.preset,
      presetDescription: xgResult.presetDescription
    },
    liveElo: {
      homeTeam: homeResolution.canonicalName ?? homeEntry.team,
      awayTeam: awayResolution.canonicalName ?? awayEntry.team,
      homeEloRating: homeEntry.eloRating,
      awayEloRating: awayEntry.eloRating,
      homeRank: homeEntry.rank,
      awayRank: awayEntry.rank,
      homeMatchesPlayed: homeEntry.matchesPlayed,
      awayMatchesPlayed: awayEntry.matchesPlayed,
      homeGroup: homeEntry.group,
      awayGroup: awayEntry.group,
      homeRatingSource: homeEntry.ratingSource,
      awayRatingSource: awayEntry.ratingSource,
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
    warnings: [
      ...pipeline.warnings,
      ...internationalSupplement.loadWarnings,
      LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING,
      ...internationalSupplement.metadata.foundationWarnings,
      ...fallbackWarnings,
      ...xgResult.warnings,
      `Live Elo prediction uses ${combinedMatchCount} curated local matches and is not a public accuracy claim.`
    ],
    metadata: buildApiMetadata([
      "Match prediction loaded live Elo ratings, converted Elo difference to expected goals, then reused Poisson scoreline probabilities.",
      WORLD_CUP_2026_AUTO_PREDICT_COVERAGE_NOTE,
      `Fallback seed ratings used: ${fallbackTeamsUsed.length === 0 ? "none" : fallbackTeamsUsed.join(", ")}.`,
      `Prediction preset: ${xgResult.preset}.`,
      "Optional Monte Carlo output is deterministic when a seed is supplied.",
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

export function getAvailableLiveEloTeams(): string[] {
  const { pipeline } = buildLiveEloPipelineFoundation();

  return getAvailableTeamCoverage(buildWorldCup2026CoverageEntries(pipeline.rankedRatings));
}

export const apiRoutes: ApiRoutes = {
  getHealth,
  getModelInfo,
  simulateMatch,
  predictMatchFromLiveElo,
  getHistoricalTournamentSummary,
  getHistoricalReplayAudit,
  getWorldCup2026FixtureFoundation
};
