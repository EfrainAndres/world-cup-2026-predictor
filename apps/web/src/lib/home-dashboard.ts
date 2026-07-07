import type {
  WorldCup2026Fixture,
  WorldCup2026GroupStandings
} from "@world-cup-2026-predictor/api";
import type {
  PredictMatchFromLiveEloSuccessResponse,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026FixtureFoundationResponse,
  WorldCup2026LiveGroupStandingsResponse
} from "./api-client";
import type { EvidenceCountTaxonomy } from "./model-evidence-center";
import type { ProductionRuntimeDiagnostics } from "./server-runtime";

export const HOME_SECTION_IDS = [
  "home-intro",
  "home-todays-matches",
  "home-featured-prediction",
  "home-group-snapshot",
  "home-tournament-outlook",
  "home-model-track-record",
  "home-quick-actions",
  "home-technical-status"
] as const;

export const HOME_SECTION_TITLES = [
  "World Cup 2026 Predictor",
  "Today's matches",
  "Featured prediction",
  "Group snapshot",
  "Tournament outlook",
  "Model track record",
  "Quick actions",
  "Technical status"
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

const MATCH_STATE_PRIORITY: Record<WorldCup2026DailyMatchEntry["state"], number> = {
  live: 0,
  halftime: 0,
  upcoming: 1,
  final: 2,
  postponed: 3,
  cancelled: 4,
  unknown: 5
};

function timestampValue(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function compareHomeMatches(a: WorldCup2026DailyMatchEntry, b: WorldCup2026DailyMatchEntry): number {
  const priority = MATCH_STATE_PRIORITY[a.state] - MATCH_STATE_PRIORITY[b.state];
  if (priority !== 0) return priority;

  if (a.state === "final" && b.state === "final") {
    return timestampValue(b.kickoffAt, 0) - timestampValue(a.kickoffAt, 0);
  }

  return timestampValue(a.kickoffAt, Number.MAX_SAFE_INTEGER) - timestampValue(b.kickoffAt, Number.MAX_SAFE_INTEGER);
}

export function selectHomeMatches(
  dailyMatches: WorldCup2026DailyMatchesSuccessResponse,
  limit = 4
): WorldCup2026DailyMatchEntry[] {
  return [...dailyMatches.matches].sort(compareHomeMatches).slice(0, limit);
}

function normalizeGroupCode(value: string | undefined): string | null {
  if (value === undefined) return null;
  const match = value.trim().match(/^Group\s+([A-L])$/i) ?? value.trim().match(/^([A-L])$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function selectHomeGroups(
  standings: WorldCup2026LiveGroupStandingsResponse,
  dailyMatches: WorldCup2026DailyMatchesSuccessResponse,
  limit = 4
): WorldCup2026GroupStandings[] {
  const liveGroups = new Set(
    dailyMatches.matches
      .filter((match) => match.state === "live" || match.state === "halftime")
      .map((match) => normalizeGroupCode(match.group))
      .filter((group): group is string => group !== null)
  );
  const todayGroups = new Set(
    dailyMatches.matches
      .map((match) => normalizeGroupCode(match.group))
      .filter((group): group is string => group !== null)
  );

  return [...standings.officialGroups]
    .sort((a, b) => {
      const live = Number(liveGroups.has(b.group)) - Number(liveGroups.has(a.group));
      if (live !== 0) return live;
      const today = Number(todayGroups.has(b.group)) - Number(todayGroups.has(a.group));
      if (today !== 0) return today;
      const activity = b.completedFixtureCount - a.completedFixtureCount;
      if (activity !== 0) return activity;
      return a.group.localeCompare(b.group);
    })
    .slice(0, limit);
}

export interface HomeFeaturedPredictionFromStoredSnapshot {
  source: "stored_snapshot";
  fixtureId: string;
  group?: string;
  matchday?: number;
  homeTeam: string;
  awayTeam: string;
  projectedScore: { home: number; away: number } | null;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  confidenceLevel?: string;
  coverageType?: string;
  context: string;
  ctaLabel: "View prediction";
}

export interface HomeFeaturedPredictionFromGeneratedFixture {
  source: "generated_fixture";
  fixtureId: string;
  group: string;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  projectedScore: { home: number; away: number } | null;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  confidenceLevel?: string;
  coverageType?: string;
  context: string;
  ctaLabel: "Create prediction";
}

export type HomeFeaturedPrediction =
  | HomeFeaturedPredictionFromStoredSnapshot
  | HomeFeaturedPredictionFromGeneratedFixture;

export function selectStoredFeaturedPrediction(
  dailyMatches: WorldCup2026DailyMatchesSuccessResponse
): HomeFeaturedPredictionFromStoredSnapshot | null {
  const match = selectHomeMatches(dailyMatches, dailyMatches.matches.length).find(
    (entry) =>
      entry.state === "upcoming" &&
      entry.predictionHistory.snapshot.available &&
      entry.predictionHistory.snapshot.prediction !== undefined
  );

  const prediction = match?.predictionHistory.snapshot.prediction;
  if (match === undefined || prediction === undefined) return null;

  return {
    source: "stored_snapshot",
    fixtureId: match.fixtureId,
    ...(match.group === undefined ? {} : { group: match.group }),
    ...(match.matchday === undefined ? {} : { matchday: match.matchday }),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    projectedScore:
      prediction.projectedScoreline === undefined
        ? null
        : {
            home: prediction.projectedScoreline.homeGoals,
            away: prediction.projectedScoreline.awayGoals
          },
    homeWinProbability: prediction.homeWinProbability,
    drawProbability: prediction.drawProbability,
    awayWinProbability: prediction.awayWinProbability,
    ...(prediction.confidenceLevel === undefined ? {} : { confidenceLevel: prediction.confidenceLevel }),
    ...(prediction.coverageType === undefined ? {} : { coverageType: prediction.coverageType }),
    context: "Stored pre-match prediction for the next relevant official fixture.",
    ctaLabel: "View prediction"
  };
}

export function selectFallbackFeaturedFixture(
  fixtureFoundation: WorldCup2026FixtureFoundationResponse
): WorldCup2026Fixture | null {
  return fixtureFoundation.fixtures.find((fixture) => fixture.status === "scheduled") ?? fixtureFoundation.fixtures[0] ?? null;
}

function selectModalScoreline(prediction: PredictMatchFromLiveEloSuccessResponse): { home: number; away: number } | null {
  const scoreline = prediction.mostLikelyScorelines[0];
  if (scoreline === undefined) return null;
  return { home: scoreline.homeGoals, away: scoreline.awayGoals };
}

export function buildGeneratedFeaturedPrediction(
  fixture: WorldCup2026Fixture,
  prediction: PredictMatchFromLiveEloSuccessResponse
): HomeFeaturedPredictionFromGeneratedFixture {
  return {
    source: "generated_fixture",
    fixtureId: fixture.id,
    group: fixture.group,
    matchday: fixture.matchday,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    projectedScore: selectModalScoreline(prediction),
    homeWinProbability: prediction.outcomeProbabilities.homeWinProbability,
    drawProbability: prediction.outcomeProbabilities.drawProbability,
    awayWinProbability: prediction.outcomeProbabilities.awayWinProbability,
    confidenceLevel: prediction.predictionConfidence.level,
    coverageType: prediction.predictionConfidence.coverageType,
    context: "Generated from the current Elo/xG model without creating a saved snapshot.",
    ctaLabel: "Create prediction"
  };
}

export interface HomeModelTrackRecordMetric {
  label: string;
  value: string;
  detail: string;
}

function formatAccuracy(value: number | null): string {
  return value === null ? "In progress" : `${Math.round(value * 100)}%`;
}

export interface HomeModelTrackRecordInput {
  taxonomy: EvidenceCountTaxonomy;
  outcomeAccuracy: number | null;
}

// Mirrors the /model page's "Evidence counts" naming exactly (see
// getEvidenceCountTaxonomy in model-evidence-center.ts) so Home never shows a
// number that reads as inconsistent with the Model and Evidence Center.
export function buildHomeModelTrackRecordMetrics(
  input: HomeModelTrackRecordInput | null
): HomeModelTrackRecordMetric[] {
  if (input === null) {
    return [
      {
        label: "Evidence status",
        value: "In progress",
        detail: "History evidence is unavailable during this render."
      }
    ];
  }

  const { taxonomy, outcomeAccuracy } = input;

  const evidenceStatus =
    taxonomy.uniqueEvaluatedFixtureCount === 0
      ? "Evidence collection in progress"
      : taxonomy.uniqueEvaluatedFixtureCount < taxonomy.recalibrationReviewThreshold
        ? "Evidence still preliminary"
        : "Evidence sample growing";

  return [
    {
      label: "Evaluation records",
      value: taxonomy.evaluationRecordCount.toString(),
      detail: `${taxonomy.storedSnapshotCount} stored snapshots`
    },
    {
      label: "Unique evaluated fixtures",
      value: taxonomy.uniqueEvaluatedFixtureCount.toString(),
      detail: `Recalibration review at ${taxonomy.recalibrationReviewThreshold}`
    },
    {
      label: "Outcome accuracy",
      value: formatAccuracy(outcomeAccuracy),
      detail: "Winner/draw result"
    },
    {
      label: "Sample status",
      value: evidenceStatus,
      detail: `${taxonomy.pendingEvaluationCount ?? 0} pending evaluations`
    }
  ];
}

export function buildHomeRuntimeStatusLine(runtimeDiagnostics: ProductionRuntimeDiagnostics): string {
  if (runtimeDiagnostics.externalProviderActive) {
    return "Live provider active";
  }

  if (runtimeDiagnostics.localFallbackUsed) {
    return "Local fallback data active";
  }

  if (runtimeDiagnostics.resultsProviderConfigured) {
    return "Live provider configured but unavailable";
  }

  return "Static fixture mode";
}
