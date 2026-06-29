import { canonicalizeTeamName } from "../../team-aliases.js";
import type { StatsBombEventRecord, StatsBombMatchRecord } from "./statsbomb-types.js";

export interface MatchEventAggregation {
  matchId: number;
  matchDate: string;
  opponentCanonicalName: string | null;
  minutesPlayed: number;
  shotCountFor: number;
  shotCountAgainst: number;
  xgSampleCountFor: number;
  xgSampleCountAgainst: number;
  totalXgFor: number;
  totalXgAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
  hasExtraTime: boolean;
  warnings: string[];
}

export function aggregateMatchForTeam(
  teamCanonicalName: string,
  events: StatsBombEventRecord[],
  matchRecord: StatsBombMatchRecord
): MatchEventAggregation {
  const homeCanonical = canonicalizeTeamName(matchRecord.home_team.home_team_name);
  const awayCanonical = canonicalizeTeamName(matchRecord.away_team.away_team_name);

  const warnings: string[] = [];
  let isHome: boolean;
  let opponentCanonicalName: string | null;

  if (homeCanonical === teamCanonicalName) {
    isHome = true;
    opponentCanonicalName = awayCanonical;
  } else if (awayCanonical === teamCanonicalName) {
    isHome = false;
    opponentCanonicalName = homeCanonical;
  } else {
    warnings.push(
      `Team '${teamCanonicalName}' not found in match ${matchRecord.match_id} (home: '${homeCanonical}', away: '${awayCanonical}')`
    );
    return {
      matchId: matchRecord.match_id,
      matchDate: matchRecord.match_date,
      opponentCanonicalName: null,
      minutesPlayed: 90,
      shotCountFor: 0,
      shotCountAgainst: 0,
      xgSampleCountFor: 0,
      xgSampleCountAgainst: 0,
      totalXgFor: 0,
      totalXgAgainst: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      hasExtraTime: false,
      warnings,
    };
  }

  const goalsFor = isHome ? matchRecord.home_score : matchRecord.away_score;
  const goalsAgainst = isHome ? matchRecord.away_score : matchRecord.home_score;

  const hasExtraTime = events.some((e) => e.period >= 3);
  const minutesPlayed = hasExtraTime ? 120 : 90;

  let shotCountFor = 0;
  let shotCountAgainst = 0;
  let xgSampleCountFor = 0;
  let xgSampleCountAgainst = 0;
  let totalXgFor = 0;
  let totalXgAgainst = 0;

  for (const event of events) {
    if (event.type.name !== "Shot") continue;
    if (event.period > 4) continue;

    const isOwnGoal = event.shot?.outcome.name === "Own Goal For";
    if (isOwnGoal) continue;

    const eventTeamCanonical = canonicalizeTeamName(event.team.name);
    const isForTeam = eventTeamCanonical === teamCanonicalName;

    if (isForTeam) {
      shotCountFor++;
      const xg = event.shot?.statsbomb_xg;
      if (xg !== undefined && isFinite(xg)) {
        xgSampleCountFor++;
        totalXgFor += xg;
      }
    } else {
      shotCountAgainst++;
      const xg = event.shot?.statsbomb_xg;
      if (xg !== undefined && isFinite(xg)) {
        xgSampleCountAgainst++;
        totalXgAgainst += xg;
      }
    }
  }

  return {
    matchId: matchRecord.match_id,
    matchDate: matchRecord.match_date,
    opponentCanonicalName,
    minutesPlayed,
    shotCountFor,
    shotCountAgainst,
    xgSampleCountFor,
    xgSampleCountAgainst,
    totalXgFor,
    totalXgAgainst,
    goalsFor,
    goalsAgainst,
    hasExtraTime,
    warnings,
  };
}
