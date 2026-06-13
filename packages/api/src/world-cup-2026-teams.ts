import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type { TeamCoverageEntry } from "./team-aliases.js";

export type WorldCup2026GroupName =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type WorldCup2026RatingSource = "live_elo_pipeline" | "fallback_seed";

export interface WorldCup2026TeamEntry {
  group: WorldCup2026GroupName;
  team: string;
}

export interface WorldCup2026CoverageEntry extends TeamCoverageEntry {
  group: WorldCup2026GroupName;
  ratingSource: WorldCup2026RatingSource;
}

export const WORLD_CUP_2026_FALLBACK_SEED_RATING = 1500;

export const WORLD_CUP_2026_FALLBACK_RATING_WARNING =
  "World Cup 2026 full-team coverage uses uncalibrated fallback seed ratings only for teams missing from the current Live Elo pipeline.";

export const WORLD_CUP_2026_GROUPS: readonly {
  group: WorldCup2026GroupName;
  teams: readonly string[];
}[] = [
  { group: "A", teams: ["Mexico", "South Africa", "South Korea", "Czechia"] },
  { group: "B", teams: ["Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland"] },
  { group: "C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  { group: "D", teams: ["United States", "Paraguay", "Australia", "Turkey"] },
  { group: "E", teams: ["Germany", "Curacao", "Ivory Coast", "Ecuador"] },
  { group: "F", teams: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
  { group: "G", teams: ["Belgium", "Egypt", "Iran", "New Zealand"] },
  { group: "H", teams: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"] },
  { group: "I", teams: ["France", "Senegal", "Iraq", "Norway"] },
  { group: "J", teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
  { group: "K", teams: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"] },
  { group: "L", teams: ["England", "Croatia", "Ghana", "Panama"] }
] as const;

export const WORLD_CUP_2026_TEAMS: readonly WorldCup2026TeamEntry[] = WORLD_CUP_2026_GROUPS.flatMap((group) =>
  group.teams.map((team) => ({ group: group.group, team }))
);

export const WORLD_CUP_2026_TEAM_NAMES: readonly string[] = WORLD_CUP_2026_TEAMS.map((entry) => entry.team);

function buildLiveRatingLookup(rankedRatings: readonly TeamCoverageEntry[]): Map<string, TeamCoverageEntry> {
  const ratingsByCanonicalTeam = new Map<string, TeamCoverageEntry>();

  for (const entry of rankedRatings) {
    const canonicalTeam = canonicalizeTeamName(entry.team);
    const key = normalizeTeamSearchText(canonicalTeam);
    const existing = ratingsByCanonicalTeam.get(key);

    if (existing === undefined || entry.rank < existing.rank) {
      ratingsByCanonicalTeam.set(key, entry);
    }
  }

  return ratingsByCanonicalTeam;
}

export function buildWorldCup2026CoverageEntries(
  rankedRatings: readonly TeamCoverageEntry[]
): WorldCup2026CoverageEntry[] {
  const liveRatingsByTeam = buildLiveRatingLookup(rankedRatings);
  const fallbackRankStart = Math.max(0, ...rankedRatings.map((entry) => entry.rank)) + 1;
  let fallbackOffset = 0;

  return WORLD_CUP_2026_TEAMS.map((teamEntry) => {
    const liveRating = liveRatingsByTeam.get(normalizeTeamSearchText(teamEntry.team));

    if (liveRating !== undefined) {
      return {
        group: teamEntry.group,
        team: teamEntry.team,
        rank: liveRating.rank,
        eloRating: liveRating.eloRating,
        matchesPlayed: liveRating.matchesPlayed,
        ratingSource: "live_elo_pipeline" as const
      };
    }

    const fallbackEntry: WorldCup2026CoverageEntry = {
      group: teamEntry.group,
      team: teamEntry.team,
      rank: fallbackRankStart + fallbackOffset,
      eloRating: WORLD_CUP_2026_FALLBACK_SEED_RATING,
      matchesPlayed: 0,
      ratingSource: "fallback_seed"
    };
    fallbackOffset += 1;

    return fallbackEntry;
  });
}

