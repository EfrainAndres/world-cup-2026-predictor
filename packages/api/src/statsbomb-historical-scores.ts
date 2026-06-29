import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeTeamName } from "./team-aliases.js";
import { parseMatchRecords } from "./providers/statsbomb/statsbomb-normalization.js";

// WC2022 = competition 43, season 106
// WC2018 = competition 43, season 3
// Scores are regulation + extra-time goals; penalty shootout goals are NOT included.
const SCORE_COMPETITIONS = [
  { competitionId: 43, seasonId: 106, label: "WC2022" },
  { competitionId: 43, seasonId: 3, label: "WC2018" },
] as const;

export interface HistoricalScore {
  homeGoals: number;
  awayGoals: number;
}

export type HistoricalScoreLookup = Map<string, HistoricalScore>;

// Key: canonical(homeTeam) + "|" + canonical(awayTeam) + "|" + YYYY-MM-DD
export function buildScoreLookupKey(
  homeTeam: string,
  awayTeam: string,
  matchDateOrKickoff: string
): string {
  const date = matchDateOrKickoff.length > 10 ? matchDateOrKickoff.slice(0, 10) : matchDateOrKickoff;
  return `${canonicalizeTeamName(homeTeam)}|${canonicalizeTeamName(awayTeam)}|${date}`;
}

export interface ScoreLookupLoadResult {
  lookup: HistoricalScoreLookup;
  matchesLoaded: number;
  competitionsLoaded: string[];
  errors: string[];
}

export function loadHistoricalScoreLookup(dataDir: string): ScoreLookupLoadResult {
  const lookup: HistoricalScoreLookup = new Map();
  const errors: string[] = [];
  const competitionsLoaded: string[] = [];
  let matchesLoaded = 0;

  for (const { competitionId, seasonId, label } of SCORE_COMPETITIONS) {
    const filePath = join(dataDir, "data", "matches", String(competitionId), `${seasonId}.json`);
    if (!existsSync(filePath)) {
      errors.push(`${label} match file not found: ${filePath}`);
      continue;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
    } catch (e) {
      errors.push(`${label}: failed to parse ${filePath}: ${String(e)}`);
      continue;
    }

    const { records, errors: parseErrors } = parseMatchRecords(raw);
    for (const e of parseErrors) errors.push(`${label}: ${e}`);

    for (const record of records) {
      const key = buildScoreLookupKey(
        record.home_team.home_team_name,
        record.away_team.away_team_name,
        record.match_date
      );
      lookup.set(key, { homeGoals: record.home_score, awayGoals: record.away_score });
      matchesLoaded++;
    }
    competitionsLoaded.push(label);
  }

  return { lookup, matchesLoaded, competitionsLoaded, errors };
}

export function lookupHistoricalScore(
  lookup: HistoricalScoreLookup,
  homeTeam: string,
  awayTeam: string,
  matchDateOrKickoff: string
): HistoricalScore | null {
  const key = buildScoreLookupKey(homeTeam, awayTeam, matchDateOrKickoff);
  return lookup.get(key) ?? null;
}
