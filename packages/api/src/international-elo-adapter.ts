import type { EloMatch, EloResult } from "../../model/src/index.js";

export const LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING =
  "International match supplement is a small curated sample. It extends the World Cup dataset but does not represent complete international match history for all rated teams.";

export interface EloCompatibleMatch {
  match_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  neutral_site: boolean;
  home_score?: number;
  away_score?: number;
  result?: EloResult;
}

export function toEloMatch(match: EloCompatibleMatch): EloMatch {
  const elo: EloMatch = {
    match_id: match.match_id,
    match_date: match.match_date,
    home_team: match.home_team,
    away_team: match.away_team,
    neutral_site: match.neutral_site
  };

  if (match.home_score !== undefined) {
    elo.home_score = match.home_score;
  }

  if (match.away_score !== undefined) {
    elo.away_score = match.away_score;
  }

  if (match.result !== undefined) {
    elo.result = match.result;
  }

  return elo;
}

export function mergeEloMatchSources(
  foundation: readonly EloMatch[],
  supplement: readonly EloCompatibleMatch[]
): readonly EloMatch[] {
  if (supplement.length === 0) {
    return foundation;
  }

  const foundationIds = new Set(foundation.map((m) => m.match_id));
  const newMatches = supplement.filter((m) => !foundationIds.has(m.match_id)).map((m) => toEloMatch(m));

  return [...foundation, ...newMatches];
}
