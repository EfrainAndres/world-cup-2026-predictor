import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type { TeamCoverageEntry } from "./team-aliases.js";
import type {
  WorldCup2026Fixture,
  WorldCup2026FixtureResult,
  WorldCup2026Group,
  WorldCup2026GroupStandingEntry,
  WorldCup2026GroupStandings,
  WorldCup2026ResultProviderMetadata
} from "./schemas.js";

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

export interface WorldCup2026ResultProvider {
  getMetadata: () => WorldCup2026ResultProviderMetadata;
  getResults: () => readonly WorldCup2026FixtureResult[];
}

export interface BuildWorldCup2026GroupStandingsInput {
  fixtures?: readonly WorldCup2026Fixture[];
  results?: readonly WorldCup2026FixtureResult[];
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
        status: "scheduled" as const,
        dateStatus: "deferred" as const,
        venueStatus: "deferred" as const
      };
    })
  );
}

export const WORLD_CUP_2026_FIXTURE_GROUPS: readonly WorldCup2026Group[] = buildWorldCup2026FixtureGroups();
export const WORLD_CUP_2026_GROUP_STAGE_FIXTURES: readonly WorldCup2026Fixture[] = buildWorldCup2026GroupFixtures();

export const WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT = "2026-06-14";

export const WORLD_CUP_2026_LOCAL_STATIC_RESULTS: readonly WorldCup2026FixtureResult[] = [
  {
    fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    status: "completed",
    homeScore: 2,
    awayScore: 0,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-a-md1-02-south-korea-vs-czechia",
    status: "completed",
    homeScore: 2,
    awayScore: 1,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
    status: "completed",
    homeScore: 1,
    awayScore: 1,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-d-md1-01-united-states-vs-paraguay",
    status: "completed",
    homeScore: 4,
    awayScore: 1,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-b-md1-02-qatar-vs-switzerland",
    status: "completed",
    homeScore: 1,
    awayScore: 1,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-c-md1-01-brazil-vs-morocco",
    status: "completed",
    homeScore: 1,
    awayScore: 1,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-c-md1-02-haiti-vs-scotland",
    status: "completed",
    homeScore: 0,
    awayScore: 1,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  },
  {
    fixtureId: "wc2026-group-d-md1-02-australia-vs-turkey",
    status: "completed",
    homeScore: 2,
    awayScore: 0,
    resultSource: "local_static",
    updatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT
  }
] as const;

export const WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA: WorldCup2026ResultProviderMetadata = {
  providerName: "local static provider",
  resultSource: "local_static",
  externalProviderEnabled: false,
  localOverridesEnabled: true,
  resultsCount: WORLD_CUP_2026_LOCAL_STATIC_RESULTS.length,
  dataUpdatedAt: WORLD_CUP_2026_LOCAL_STATIC_RESULTS_UPDATED_AT,
  warnings: [
    "World Cup 2026 standings are based on local normalized results until an external provider is added.",
    "No external result provider, live score service, or network call is enabled."
  ]
};

export const WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER: WorldCup2026ResultProvider = {
  getMetadata: () => WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER_METADATA,
  getResults: () => WORLD_CUP_2026_LOCAL_STATIC_RESULTS
};

function createZeroStanding(team: string): WorldCup2026GroupStandingEntry {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  };
}

function isCompletedResultWithScore(result: WorldCup2026FixtureResult | undefined): result is WorldCup2026FixtureResult & {
  homeScore: number;
  awayScore: number;
} {
  return result?.status === "completed" && result.homeScore !== undefined && result.awayScore !== undefined;
}

function buildResultLookup(results: readonly WorldCup2026FixtureResult[]): Map<string, WorldCup2026FixtureResult> {
  return new Map(results.map((result) => [result.fixtureId, result]));
}

function applyCompletedFixtureResult(
  standingsByTeam: Map<string, WorldCup2026GroupStandingEntry>,
  fixture: WorldCup2026Fixture,
  result: WorldCup2026FixtureResult | undefined
): void {
  if (!isCompletedResultWithScore(result)) {
    return;
  }

  const homeStanding = standingsByTeam.get(fixture.homeTeam);
  const awayStanding = standingsByTeam.get(fixture.awayTeam);

  if (homeStanding === undefined || awayStanding === undefined) {
    return;
  }

  homeStanding.played += 1;
  awayStanding.played += 1;
  homeStanding.goalsFor += result.homeScore;
  homeStanding.goalsAgainst += result.awayScore;
  awayStanding.goalsFor += result.awayScore;
  awayStanding.goalsAgainst += result.homeScore;
  homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
  awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;

  if (result.homeScore > result.awayScore) {
    homeStanding.wins += 1;
    homeStanding.points += 3;
    awayStanding.losses += 1;
    return;
  }

  if (result.homeScore < result.awayScore) {
    awayStanding.wins += 1;
    awayStanding.points += 3;
    homeStanding.losses += 1;
    return;
  }

  homeStanding.draws += 1;
  awayStanding.draws += 1;
  homeStanding.points += 1;
  awayStanding.points += 1;
}

function sortStandings(standings: readonly WorldCup2026GroupStandingEntry[]): WorldCup2026GroupStandingEntry[] {
  return [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team)
  );
}

export function buildWorldCup2026GroupStandings(
  input: BuildWorldCup2026GroupStandingsInput = {}
): WorldCup2026GroupStandings[] {
  const fixtures = input.fixtures ?? WORLD_CUP_2026_GROUP_STAGE_FIXTURES;
  const results = input.results ?? WORLD_CUP_2026_LOCAL_STATIC_RESULT_PROVIDER.getResults();
  const resultByFixtureId = buildResultLookup(results);

  return WORLD_CUP_2026_FIXTURE_GROUPS.map((group) => {
    const standingsByTeam = new Map(group.teams.map((team) => [team, createZeroStanding(team)]));
    const groupFixtures = fixtures.filter((fixture) => fixture.group === group.group);

    for (const fixture of groupFixtures) {
      applyCompletedFixtureResult(standingsByTeam, fixture, resultByFixtureId.get(fixture.id));
    }

    const completedFixtureCount = groupFixtures.filter((fixture) => isCompletedResultWithScore(resultByFixtureId.get(fixture.id))).length;

    return {
      group: group.group,
      groupName: group.groupName,
      completedFixtureCount,
      pendingFixtureCount: groupFixtures.length - completedFixtureCount,
      standings: sortStandings([...standingsByTeam.values()])
    };
  });
}

export const WORLD_CUP_2026_GROUP_STANDINGS: readonly WorldCup2026GroupStandings[] = buildWorldCup2026GroupStandings();

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
