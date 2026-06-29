import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeTeamName } from "../../team-aliases.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../../world-cup-2026-teams.js";
import type {
  TeamPerformanceDataProvider,
  TeamPerformanceProfileResult,
  TeamPerformanceSource,
  StatsBombMatchRecord,
} from "./statsbomb-types.js";
import { STATSBOMB_SUPPORTED_COMPETITIONS, resolveStatsBombTeamName, teamNameToId } from "./statsbomb-team-mapping.js";
import { parseMatchRecords, parseEventRecords } from "./statsbomb-normalization.js";
import { aggregateMatchForTeam } from "./statsbomb-event-aggregation.js";
import type { MatchEventAggregation } from "./statsbomb-event-aggregation.js";
import { buildFallbackProfile, buildProfileFromAggregations } from "./statsbomb-performance-profile.js";

interface MatchEntry {
  matchRecord: StatsBombMatchRecord;
  competitionId: number;
  seasonId: number;
}

export function createStatsBombOpenDataProvider(
  dataDir: string,
  readFileFn?: (path: string) => string
): TeamPerformanceDataProvider {
  const readFn: (path: string) => string =
    readFileFn !== undefined ? readFileFn : (p: string) => readFileSync(p, "utf-8");

  const canonicalNameSet = new Set<string>(WORLD_CUP_2026_TEAM_NAMES);

  const idToCanonical = new Map<string, string>();
  for (const name of WORLD_CUP_2026_TEAM_NAMES) {
    idToCanonical.set(teamNameToId(name), name);
  }

  function resolveTeamIdToCanonical(teamId: string): string | null {
    if (canonicalNameSet.has(teamId)) return teamId;
    const fromId = idToCanonical.get(teamId.toLowerCase());
    if (fromId !== undefined) return fromId;
    const canonicalized = canonicalizeTeamName(teamId);
    if (canonicalNameSet.has(canonicalized)) return canonicalized;
    return null;
  }

  const teamMatchMap = new Map<string, MatchEntry[]>();

  for (const comp of STATSBOMB_SUPPORTED_COMPETITIONS) {
    const matchFilePath = join(
      dataDir,
      "data",
      "matches",
      String(comp.competitionId),
      `${comp.seasonId}.json`
    );
    try {
      const raw = JSON.parse(readFn(matchFilePath)) as unknown;
      const { records } = parseMatchRecords(raw);
      for (const matchRecord of records) {
        const homeCanonical = resolveStatsBombTeamName(matchRecord.home_team.home_team_name);
        const awayCanonical = resolveStatsBombTeamName(matchRecord.away_team.away_team_name);

        const entry: MatchEntry = { matchRecord, competitionId: comp.competitionId, seasonId: comp.seasonId };

        if (homeCanonical !== null) {
          const existing = teamMatchMap.get(homeCanonical) ?? [];
          existing.push(entry);
          teamMatchMap.set(homeCanonical, existing);
        }
        if (awayCanonical !== null) {
          const existing = teamMatchMap.get(awayCanonical) ?? [];
          existing.push(entry);
          teamMatchMap.set(awayCanonical, existing);
        }
      }
    } catch {
      // File not found or parse error — skip this competition (data not downloaded yet)
    }
  }

  async function getTeamPerformanceProfile(
    teamId: string,
    cutoffAt: string
  ): Promise<TeamPerformanceProfileResult> {
    const canonicalName = resolveTeamIdToCanonical(teamId);

    if (canonicalName === null) {
      const fallback = buildFallbackProfile(teamId, teamId, cutoffAt);
      return {
        teamId,
        canonicalName: teamId,
        profile: fallback,
        issues: [{ code: "team_not_found", message: `Team '${teamId}' not found in WC2026 canonical teams` }],
      };
    }

    const tId = teamNameToId(canonicalName);
    const allMatches = teamMatchMap.get(canonicalName) ?? [];
    const eligibleMatches = allMatches.filter(({ matchRecord }) => matchRecord.match_date < cutoffAt);

    if (eligibleMatches.length === 0) {
      return {
        teamId: tId,
        canonicalName,
        profile: buildFallbackProfile(canonicalName, tId, cutoffAt),
        issues: [],
      };
    }

    const aggregations: MatchEventAggregation[] = [];
    const sources: TeamPerformanceSource[] = [];
    const warnings: string[] = [];

    for (const { matchRecord, competitionId, seasonId } of eligibleMatches) {
      const eventsPath = join(dataDir, "data", "events", `${matchRecord.match_id}.json`);
      try {
        const eventsRaw = JSON.parse(readFn(eventsPath)) as unknown;
        const { records: events, errors: evtErrors } = parseEventRecords(eventsRaw);
        for (const e of evtErrors) warnings.push(e);

        const agg = aggregateMatchForTeam(canonicalName, events, matchRecord);
        for (const w of agg.warnings) warnings.push(w);
        aggregations.push(agg);

        sources.push({
          provider: "statsbomb_open_data",
          competitionId,
          seasonId,
          matchId: matchRecord.match_id,
          matchDate: matchRecord.match_date,
        });
      } catch (e) {
        warnings.push(`Failed to load events for match ${matchRecord.match_id}: ${String(e)}`);
      }
    }

    const profile = buildProfileFromAggregations(canonicalName, tId, aggregations, sources, cutoffAt, warnings);
    return { teamId: tId, canonicalName, profile, issues: [] };
  }

  async function listTeamPerformanceProfiles(cutoffAt: string): Promise<TeamPerformanceProfileResult[]> {
    const results: TeamPerformanceProfileResult[] = [];
    for (const name of WORLD_CUP_2026_TEAM_NAMES) {
      const result = await getTeamPerformanceProfile(name, cutoffAt);
      results.push(result);
    }
    return results;
  }

  return {
    providerId: "statsbomb_open_data",
    getTeamPerformanceProfile,
    listTeamPerformanceProfiles,
  };
}
