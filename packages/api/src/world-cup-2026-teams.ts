import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type { TeamCoverageEntry } from "./team-aliases.js";
import type { WorldCup2026Fixture, WorldCup2026Group } from "./schemas.js";

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

const WORLD_CUP_2026_GROUP_FIXTURE_PAIR_INDICES = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2]
] as const;

function slugifyFixtureTeam(team: string): string {
  return normalizeTeamSearchText(team).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildWorldCup2026FixtureGroups(): WorldCup2026Group[] {
  return WORLD_CUP_2026_GROUPS.map((group) => ({
    group: group.group,
    groupName: `Group ${group.group}`,
    teams: group.teams,
    fixtureCount: WORLD_CUP_2026_GROUP_FIXTURE_PAIR_INDICES.length
  }));
}

export function buildWorldCup2026GroupFixtures(): WorldCup2026Fixture[] {
  return WORLD_CUP_2026_GROUPS.flatMap((group, groupIndex) =>
    WORLD_CUP_2026_GROUP_FIXTURE_PAIR_INDICES.map(([homeIndex, awayIndex], pairIndex) => {
      const homeTeam = group.teams[homeIndex];
      const awayTeam = group.teams[awayIndex];
      const groupFixtureOrder = pairIndex + 1;
      const matchday = Math.floor(pairIndex / 2) + 1;
      const order = groupIndex * WORLD_CUP_2026_GROUP_FIXTURE_PAIR_INDICES.length + groupFixtureOrder;

      if (homeTeam === undefined || awayTeam === undefined) {
        throw new Error(`World Cup 2026 Group ${group.group} fixture template references a missing team.`);
      }

      return {
        id: `wc2026-group-${group.group.toLowerCase()}-md${matchday}-${String(groupFixtureOrder).padStart(
          2,
          "0"
        )}-${slugifyFixtureTeam(homeTeam)}-vs-${slugifyFixtureTeam(awayTeam)}`,
        group: group.group,
        matchday,
        order,
        groupFixtureOrder,
        homeTeam,
        awayTeam,
        dateStatus: "deferred" as const,
        venueStatus: "deferred" as const
      };
    })
  );
}

export const WORLD_CUP_2026_FIXTURE_GROUPS: readonly WorldCup2026Group[] = buildWorldCup2026FixtureGroups();
export const WORLD_CUP_2026_GROUP_STAGE_FIXTURES: readonly WorldCup2026Fixture[] = buildWorldCup2026GroupFixtures();

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
