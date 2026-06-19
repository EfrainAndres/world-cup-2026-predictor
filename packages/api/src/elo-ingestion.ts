import { updateRatingsAfterMatch, DEFAULT_ELO_CONFIG } from "../../model/src/index.js";
import type { EloMatch } from "../../model/src/index.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type { WorldCup2026Fixture } from "./schemas.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026EloIngestionResult,
  WorldCup2026EloIngestionIssue,
  WorldCup2026EloIngestionRecord,
  WorldCup2026TournamentAdjustedEloEntry
} from "./schemas.js";

export interface IngestWorldCup2026ResultsIntoLiveEloInput {
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  baselineRatings: ReadonlyMap<string, number>;
  pipelineVersion: string;
  combinedMatchCount: number;
  cutoffAt?: string;
  processedAt?: string;
  previouslyProcessed?: readonly WorldCup2026EloIngestionRecord[];
}

export function isBeforeCutoff(kickoffAt: string | undefined, cutoffAt: string | undefined): boolean {
  if (cutoffAt === undefined) return true;
  if (kickoffAt === undefined) return true;
  return kickoffAt < cutoffAt;
}

function normalizeForIndex(name: string): string {
  return normalizeTeamSearchText(canonicalizeTeamName(name));
}

function buildFixtureIndex(): {
  byId: Map<string, WorldCup2026Fixture>;
  byTeams: Map<string, WorldCup2026Fixture>;
} {
  const byId = new Map<string, WorldCup2026Fixture>();
  const byTeams = new Map<string, WorldCup2026Fixture>();

  for (const fixture of WORLD_CUP_2026_GROUP_STAGE_FIXTURES) {
    byId.set(fixture.id, fixture);
    const normHome = normalizeForIndex(fixture.homeTeam);
    const normAway = normalizeForIndex(fixture.awayTeam);
    byTeams.set(`${normHome}|${normAway}`, fixture);
    byTeams.set(`${normAway}|${normHome}`, fixture);
  }

  return { byId, byTeams };
}

function resolveIngestionFixture(
  record: WorldCup2026ExternalFixtureRecord,
  fixtureIndex: { byId: Map<string, WorldCup2026Fixture>; byTeams: Map<string, WorldCup2026Fixture> }
): WorldCup2026Fixture | undefined {
  if (record.providerFixtureId !== undefined) {
    const byId = fixtureIndex.byId.get(record.providerFixtureId);
    if (byId !== undefined) return byId;
  }

  const normHome = normalizeForIndex(record.homeTeam);
  const normAway = normalizeForIndex(record.awayTeam);
  return fixtureIndex.byTeams.get(`${normHome}|${normAway}`);
}

function extractMatchDate(kickoffAt: string | undefined): string {
  if (kickoffAt === undefined) return "2026-06-11";
  return kickoffAt.substring(0, 10);
}

function compareForSort(a: WorldCup2026ExternalFixtureRecord, b: WorldCup2026ExternalFixtureRecord): number {
  const aHasDate = a.kickoffAt !== undefined;
  const bHasDate = b.kickoffAt !== undefined;

  if (aHasDate && bHasDate) {
    const dateCmp = a.kickoffAt!.localeCompare(b.kickoffAt!);
    if (dateCmp !== 0) return dateCmp;
    const aId = a.providerFixtureId ?? "";
    const bId = b.providerFixtureId ?? "";
    return aId.localeCompare(bId);
  }

  if (aHasDate && !bHasDate) return -1;
  if (!aHasDate && bHasDate) return 1;
  return (a.providerFixtureId ?? "").localeCompare(b.providerFixtureId ?? "");
}

export function ingestWorldCup2026ResultsIntoLiveElo(
  input: IngestWorldCup2026ResultsIntoLiveEloInput
): WorldCup2026EloIngestionResult {
  const {
    completedResults,
    baselineRatings,
    pipelineVersion,
    combinedMatchCount,
    cutoffAt,
    processedAt = new Date().toISOString(),
    previouslyProcessed = []
  } = input;

  const fixtureIndex = buildFixtureIndex();
  const issues: WorldCup2026EloIngestionIssue[] = [];
  const processedRecords: WorldCup2026EloIngestionRecord[] = [];

  const alreadyProcessed = new Set<string>(previouslyProcessed.map((r) => r.fixtureId));

  const finishedRecords = completedResults.filter((r) => {
    if (r.status !== "finished") {
      issues.push({
        code: "record_rejected_non_finished",
        providerFixtureId: r.providerFixtureId,
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        message: `Record rejected: status is "${r.status}", only "finished" records are accepted.`
      });
      return false;
    }
    return true;
  });

  const sorted = [...finishedRecords].sort(compareForSort);

  let currentRatings: Map<string, number> = new Map(baselineRatings);
  const adjustedTeams = new Set<string>();

  for (const record of sorted) {
    const { homeScore, awayScore, providerFixtureId, kickoffAt: recordKickoff } = record;

    if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
      issues.push({
        code: "score_missing",
        providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record skipped: missing score data for ${record.homeTeam} vs ${record.awayTeam}.`
      });
      continue;
    }

    if (!isBeforeCutoff(recordKickoff, cutoffAt)) {
      issues.push({
        code: "cutoff_exceeded",
        providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record skipped: kickoffAt "${recordKickoff}" is at or after cutoff "${cutoffAt}".`
      });
      continue;
    }

    const fixture = resolveIngestionFixture(record, fixtureIndex);

    if (fixture === undefined) {
      issues.push({
        code: "fixture_not_found",
        providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record skipped: could not resolve a WC2026 fixture for ${record.homeTeam} vs ${record.awayTeam}.`
      });
      continue;
    }

    if (alreadyProcessed.has(fixture.id)) {
      issues.push({
        code: "duplicate_skipped",
        providerFixtureId,
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        message: `Record skipped: fixture "${fixture.id}" was already processed (idempotency).`
      });
      continue;
    }

    alreadyProcessed.add(fixture.id);

    const eloMatch: EloMatch = {
      match_id: fixture.id,
      match_date: extractMatchDate(recordKickoff),
      home_team: fixture.homeTeam,
      away_team: fixture.awayTeam,
      home_score: homeScore,
      away_score: awayScore,
      competition: "FIFA World Cup",
      neutralSite: true
    };

    const result = updateRatingsAfterMatch(currentRatings, eloMatch, DEFAULT_ELO_CONFIG);
    currentRatings = result.ratings;
    adjustedTeams.add(fixture.homeTeam);
    adjustedTeams.add(fixture.awayTeam);

    const ingestionRecord: WorldCup2026EloIngestionRecord = {
      fixtureId: fixture.id,
      processedAt,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeScore,
      awayScore
    };

    if (providerFixtureId !== undefined) {
      ingestionRecord.providerFixtureId = providerFixtureId;
    }

    if (recordKickoff !== undefined) {
      ingestionRecord.kickoffAt = recordKickoff;
    }

    processedRecords.push(ingestionRecord);
  }

  const adjustedRatings: WorldCup2026TournamentAdjustedEloEntry[] = [];

  for (const team of adjustedTeams) {
    const baseline = baselineRatings.get(team) ?? DEFAULT_ELO_CONFIG.initialRating;
    const adjusted = currentRatings.get(team) ?? baseline;
    adjustedRatings.push({
      team,
      baselineEloRating: Math.round(baseline * 10) / 10,
      adjustedEloRating: Math.round(adjusted * 10) / 10,
      ratingChange: Math.round((adjusted - baseline) * 10) / 10
    });
  }

  adjustedRatings.sort((a, b) => b.adjustedEloRating - a.adjustedEloRating);

  return {
    status: "success",
    processedRecords,
    adjustedRatings,
    issues,
    metadata: {
      totalRecordsReceived: completedResults.length,
      eligibleRecords: finishedRecords.length,
      processedCount: processedRecords.length,
      skippedCount: finishedRecords.length - processedRecords.length,
      ...(cutoffAt !== undefined ? { cutoffAt } : {}),
      processedAt,
      pipelineVersion,
      combinedMatchCount
    }
  };
}
