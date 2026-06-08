import type {
  EloConfig,
  EloMatch,
  EloMatchRatingHistory,
  EloProcessResult,
  EloRatingEntry,
  EloRatingMap,
  EloResult
} from "./types.js";

export const DEFAULT_ELO_CONFIG: EloConfig = {
  initialRating: 1500,
  kFactor: 20
};

const VALID_RESULTS = new Set<EloResult>(["home_win", "draw", "away_win"]);

export function calculateExpectedScore(teamRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - teamRating) / 400));
}

export function resultToScore(result: EloResult, teamSide: "home" | "away"): number {
  if (result === "draw") {
    return 0.5;
  }

  if (result === "home_win") {
    return teamSide === "home" ? 1 : 0;
  }

  return teamSide === "away" ? 1 : 0;
}

export function calculateRatingDelta(actualScore: number, expectedScore: number, config: EloConfig = DEFAULT_ELO_CONFIG): number {
  return config.kFactor * (actualScore - expectedScore);
}

export function initializeTeamRatings(teams: Iterable<string>, config: EloConfig = DEFAULT_ELO_CONFIG): Map<string, number> {
  const ratings = new Map<string, number>();

  for (const team of teams) {
    if (!ratings.has(team)) {
      ratings.set(team, config.initialRating);
    }
  }

  return ratings;
}

export function getCurrentTeamRatings(ratings: EloRatingMap): EloRatingEntry[] {
  return [...ratings.entries()]
    .map(([team, rating]) => ({ team, rating }))
    .sort((a, b) => b.rating - a.rating || a.team.localeCompare(b.team));
}

export function getRatingHistoryByTeam(history: readonly EloMatchRatingHistory[], team: string): EloMatchRatingHistory[] {
  return history.filter((entry) => entry.home_team === team || entry.away_team === team);
}

export function deriveEloResult(match: EloMatch): EloResult {
  if (match.result !== undefined) {
    if (!VALID_RESULTS.has(match.result)) {
      throw new Error(`Invalid Elo result for match ${match.match_id}: ${String(match.result)}`);
    }

    return match.result;
  }

  if (match.home_score === undefined || match.away_score === undefined) {
    throw new Error(`Match ${match.match_id} needs a result or both scores for Elo processing.`);
  }

  if (!Number.isInteger(match.home_score) || !Number.isInteger(match.away_score) || match.home_score < 0 || match.away_score < 0) {
    throw new Error(`Match ${match.match_id} has invalid scores for Elo processing.`);
  }

  if (match.home_score > match.away_score) {
    return "home_win";
  }

  if (match.home_score < match.away_score) {
    return "away_win";
  }

  return "draw";
}

export function updateRatingsAfterMatch(
  ratings: EloRatingMap,
  match: EloMatch,
  config: EloConfig = DEFAULT_ELO_CONFIG
): { ratings: Map<string, number>; history: EloMatchRatingHistory } {
  const nextRatings = new Map(ratings);
  const result = deriveEloResult(match);
  const homeRatingBefore = nextRatings.get(match.home_team) ?? config.initialRating;
  const awayRatingBefore = nextRatings.get(match.away_team) ?? config.initialRating;
  const homeExpectedScore = calculateExpectedScore(homeRatingBefore, awayRatingBefore);
  const awayExpectedScore = calculateExpectedScore(awayRatingBefore, homeRatingBefore);
  const homeActualScore = resultToScore(result, "home");
  const awayActualScore = resultToScore(result, "away");
  const homeRatingDelta = calculateRatingDelta(homeActualScore, homeExpectedScore, config);
  const awayRatingDelta = calculateRatingDelta(awayActualScore, awayExpectedScore, config);
  const homeRatingAfter = homeRatingBefore + homeRatingDelta;
  const awayRatingAfter = awayRatingBefore + awayRatingDelta;

  nextRatings.set(match.home_team, homeRatingAfter);
  nextRatings.set(match.away_team, awayRatingAfter);

  return {
    ratings: nextRatings,
    history: {
      match_id: match.match_id,
      match_date: match.match_date,
      home_team: match.home_team,
      away_team: match.away_team,
      home_rating_before: homeRatingBefore,
      away_rating_before: awayRatingBefore,
      home_rating_after: homeRatingAfter,
      away_rating_after: awayRatingAfter,
      home_rating_delta: homeRatingDelta,
      away_rating_delta: awayRatingDelta,
      result
    }
  };
}

export function processMatches(matches: readonly EloMatch[], config: EloConfig = DEFAULT_ELO_CONFIG): EloProcessResult {
  let ratings = new Map<string, number>();
  const matchHistory: EloMatchRatingHistory[] = [];

  for (const match of matches) {
    const update = updateRatingsAfterMatch(ratings, match, config);
    ratings = update.ratings;
    matchHistory.push(update.history);
  }

  return {
    ratings,
    matchHistory
  };
}
