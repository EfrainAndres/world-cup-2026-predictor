import type { StatsBombMatchRecord, StatsBombEventRecord, StatsBombShotData } from "./statsbomb-types.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractNestedString(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key];
  return typeof val === "string" ? val : undefined;
}

function extractNestedNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const val = obj[key];
  return typeof val === "number" ? val : undefined;
}

function parseMatchItem(item: unknown, index: number): StatsBombMatchRecord | string {
  if (!isRecord(item)) return `Record at index ${index}: expected object`;

  const matchId = extractNestedNumber(item, "match_id");
  if (matchId === undefined) return `Record at index ${index}: missing or invalid match_id`;

  const matchDate = extractNestedString(item, "match_date");
  if (matchDate === undefined) return `Record at index ${index}: missing or invalid match_date`;

  const homeScore = extractNestedNumber(item, "home_score");
  if (homeScore === undefined) return `Record at index ${index}: missing or invalid home_score`;

  const awayScore = extractNestedNumber(item, "away_score");
  if (awayScore === undefined) return `Record at index ${index}: missing or invalid away_score`;

  const homeTeamRaw = item["home_team"];
  if (!isRecord(homeTeamRaw)) return `Record at index ${index}: missing or invalid home_team`;
  const homeTeamName = extractNestedString(homeTeamRaw, "home_team_name");
  if (homeTeamName === undefined) return `Record at index ${index}: missing home_team.home_team_name`;

  const awayTeamRaw = item["away_team"];
  if (!isRecord(awayTeamRaw)) return `Record at index ${index}: missing or invalid away_team`;
  const awayTeamName = extractNestedString(awayTeamRaw, "away_team_name");
  if (awayTeamName === undefined) return `Record at index ${index}: missing away_team.away_team_name`;

  const competitionRaw = item["competition"];
  const competition = isRecord(competitionRaw)
    ? {
        competition_id: extractNestedNumber(competitionRaw, "competition_id") ?? 0,
        competition_name: extractNestedString(competitionRaw, "competition_name") ?? "",
      }
    : { competition_id: 0, competition_name: "" };

  const seasonRaw = item["season"];
  const season = isRecord(seasonRaw)
    ? {
        season_id: extractNestedNumber(seasonRaw, "season_id") ?? 0,
        season_name: extractNestedString(seasonRaw, "season_name") ?? "",
      }
    : { season_id: 0, season_name: "" };

  return {
    match_id: matchId,
    match_date: matchDate,
    home_team: {
      home_team_id: extractNestedNumber(homeTeamRaw, "home_team_id") ?? 0,
      home_team_name: homeTeamName,
    },
    away_team: {
      away_team_id: extractNestedNumber(awayTeamRaw, "away_team_id") ?? 0,
      away_team_name: awayTeamName,
    },
    home_score: homeScore,
    away_score: awayScore,
    competition,
    season,
  };
}

export function parseMatchRecords(raw: unknown): { records: StatsBombMatchRecord[]; errors: string[] } {
  if (!Array.isArray(raw)) {
    return { records: [], errors: ["Expected an array of match records, got non-array input"] };
  }

  const records: StatsBombMatchRecord[] = [];
  const errors: string[] = [];
  let index = 0;

  for (const item of raw) {
    const result = parseMatchItem(item, index);
    if (typeof result === "string") {
      errors.push(result);
    } else {
      records.push(result);
    }
    index++;
  }

  return { records, errors };
}

function parseShotData(shotRaw: unknown): StatsBombShotData | undefined {
  if (!isRecord(shotRaw)) return undefined;
  const outcomeRaw = shotRaw["outcome"];
  if (!isRecord(outcomeRaw)) return undefined;

  const outcome = {
    id: extractNestedNumber(outcomeRaw, "id") ?? 0,
    name: extractNestedString(outcomeRaw, "name") ?? "",
  };

  const xgRaw = shotRaw["statsbomb_xg"];
  if (typeof xgRaw === "number" && isFinite(xgRaw)) {
    return { statsbomb_xg: xgRaw, outcome };
  }
  return { outcome };
}

function parseEventItem(item: unknown, index: number): StatsBombEventRecord | string {
  if (!isRecord(item)) return `Event at index ${index}: expected object`;

  const id = extractNestedString(item, "id");
  if (id === undefined) return `Event at index ${index}: missing or invalid id`;

  const typeRaw = item["type"];
  if (!isRecord(typeRaw)) return `Event at index ${index}: missing or invalid type`;
  const typeName = extractNestedString(typeRaw, "name");
  if (typeName === undefined) return `Event at index ${index}: missing type.name`;

  const period = extractNestedNumber(item, "period");
  if (period === undefined || period < 1 || period > 5) {
    return `Event at index ${index}: missing or invalid period (expected 1-5)`;
  }

  const teamRaw = item["team"];
  if (!isRecord(teamRaw)) return `Event at index ${index}: missing or invalid team`;
  const teamName = extractNestedString(teamRaw, "name");
  if (teamName === undefined) return `Event at index ${index}: missing team.name`;

  const timestamp = extractNestedString(item, "timestamp") ?? "00:00:00.000";

  const result: StatsBombEventRecord = {
    id,
    type: {
      id: extractNestedNumber(typeRaw, "id") ?? 0,
      name: typeName,
    },
    period,
    timestamp,
    team: {
      id: extractNestedNumber(teamRaw, "id") ?? 0,
      name: teamName,
    },
  };

  const playerRaw = item["player"];
  if (isRecord(playerRaw)) {
    const playerName = extractNestedString(playerRaw, "name");
    if (playerName !== undefined) {
      result.player = {
        id: extractNestedNumber(playerRaw, "id") ?? 0,
        name: playerName,
      };
    }
  }

  const shotRaw = item["shot"];
  if (shotRaw !== undefined) {
    const parsedShot = parseShotData(shotRaw);
    if (parsedShot !== undefined) {
      result.shot = parsedShot;
    }
  }

  return result;
}

export function parseEventRecords(raw: unknown): { records: StatsBombEventRecord[]; errors: string[] } {
  if (!Array.isArray(raw)) {
    return { records: [], errors: ["Expected an array of event records, got non-array input"] };
  }

  const records: StatsBombEventRecord[] = [];
  const errors: string[] = [];
  let index = 0;

  for (const item of raw) {
    const result = parseEventItem(item, index);
    if (typeof result === "string") {
      errors.push(result);
    } else {
      records.push(result);
    }
    index++;
  }

  return { records, errors };
}
