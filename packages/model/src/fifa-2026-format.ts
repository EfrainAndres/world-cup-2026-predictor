import type {
  FIFA2026Group,
  FIFA2026GroupId,
  FIFA2026GroupStanding,
  FIFA2026QualifiedTeam,
  FIFA2026TournamentFormat
} from "./types.js";

export const FIFA_2026_TOTAL_TEAMS = 48;
export const FIFA_2026_GROUP_COUNT = 12;
export const FIFA_2026_TEAMS_PER_GROUP = 4;
export const FIFA_2026_TOP_TEAMS_PER_GROUP = 2;
export const FIFA_2026_BEST_THIRD_PLACE_TEAMS = 8;
export const FIFA_2026_KNOCKOUT_TEAMS = 32;
export const FIFA_2026_GROUP_IDS: readonly FIFA2026GroupId[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export const FIFA_2026_TOURNAMENT_FORMAT: FIFA2026TournamentFormat = {
  totalTeams: FIFA_2026_TOTAL_TEAMS,
  groupCount: FIFA_2026_GROUP_COUNT,
  teamsPerGroup: FIFA_2026_TEAMS_PER_GROUP,
  topTeamsPerGroup: FIFA_2026_TOP_TEAMS_PER_GROUP,
  bestThirdPlaceTeams: FIFA_2026_BEST_THIRD_PLACE_TEAMS,
  knockoutTeams: FIFA_2026_KNOCKOUT_TEAMS,
  groupIds: FIFA_2026_GROUP_IDS
};

const VALID_GROUP_IDS = new Set<FIFA2026GroupId>(FIFA_2026_GROUP_IDS);

function assertValidGroupId(groupId: string): asserts groupId is FIFA2026GroupId {
  if (!VALID_GROUP_IDS.has(groupId as FIFA2026GroupId)) {
    throw new Error(`Invalid FIFA 2026 group id: ${groupId}`);
  }
}

function validateTeamFields(group: FIFA2026Group): void {
  for (const team of group.teams) {
    if (team.id.trim().length === 0) {
      throw new Error("FIFA 2026 team id is required.");
    }

    if (team.name.trim().length === 0) {
      throw new Error("FIFA 2026 team name is required.");
    }
  }
}

export function validateFIFA2026Groups(groups: readonly FIFA2026Group[]): void {
  if (groups.length !== FIFA_2026_GROUP_COUNT) {
    throw new Error(`FIFA 2026 requires exactly ${FIFA_2026_GROUP_COUNT} groups.`);
  }

  const seenGroupIds = new Set<FIFA2026GroupId>();
  const seenTeamIds = new Set<string>();

  for (const group of groups) {
    assertValidGroupId(group.id);

    if (seenGroupIds.has(group.id)) {
      throw new Error(`Duplicate FIFA 2026 group id: ${group.id}`);
    }

    seenGroupIds.add(group.id);

    if (group.teams.length !== FIFA_2026_TEAMS_PER_GROUP) {
      throw new Error(`FIFA 2026 group ${group.id} must include exactly ${FIFA_2026_TEAMS_PER_GROUP} teams.`);
    }

    validateTeamFields(group);

    for (const team of group.teams) {
      if (seenTeamIds.has(team.id)) {
        throw new Error(`Duplicate FIFA 2026 team id: ${team.id}`);
      }

      seenTeamIds.add(team.id);
    }
  }

  if (seenTeamIds.size !== FIFA_2026_TOTAL_TEAMS) {
    throw new Error(`FIFA 2026 requires exactly ${FIFA_2026_TOTAL_TEAMS} unique teams.`);
  }
}

function sortGroupStandings(standings: readonly FIFA2026GroupStanding[]): FIFA2026GroupStanding[] {
  return [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name)
  );
}

export function rankFIFA2026ThirdPlaceTeams(standings: readonly FIFA2026GroupStanding[]): FIFA2026GroupStanding[] {
  const thirdPlaceTeams = standings.filter((standing) => standing.position === 3);

  return sortGroupStandings(thirdPlaceTeams);
}

export function selectFIFA2026GroupWinners(standings: readonly FIFA2026GroupStanding[]): FIFA2026QualifiedTeam[] {
  return standings
    .filter((standing) => standing.position === 1)
    .sort((a, b) => FIFA_2026_GROUP_IDS.indexOf(a.groupId) - FIFA_2026_GROUP_IDS.indexOf(b.groupId))
    .map((standing) => ({
      ...standing,
      qualificationSource: "group_winner"
    }));
}

export function selectFIFA2026GroupRunnersUp(standings: readonly FIFA2026GroupStanding[]): FIFA2026QualifiedTeam[] {
  return standings
    .filter((standing) => standing.position === 2)
    .sort((a, b) => FIFA_2026_GROUP_IDS.indexOf(a.groupId) - FIFA_2026_GROUP_IDS.indexOf(b.groupId))
    .map((standing) => ({
      ...standing,
      qualificationSource: "group_runner_up"
    }));
}

export function selectFIFA2026BestThirdPlaceTeams(standings: readonly FIFA2026GroupStanding[]): FIFA2026QualifiedTeam[] {
  return rankFIFA2026ThirdPlaceTeams(standings)
    .slice(0, FIFA_2026_BEST_THIRD_PLACE_TEAMS)
    .map((standing) => ({
      ...standing,
      qualificationSource: "third_place"
    }));
}

export function selectFIFA2026QualifiedTeams(standings: readonly FIFA2026GroupStanding[]): FIFA2026QualifiedTeam[] {
  const qualifiedTeams = [
    ...selectFIFA2026GroupWinners(standings),
    ...selectFIFA2026GroupRunnersUp(standings),
    ...selectFIFA2026BestThirdPlaceTeams(standings)
  ];

  if (qualifiedTeams.length !== FIFA_2026_KNOCKOUT_TEAMS) {
    throw new Error(`FIFA 2026 qualification must produce exactly ${FIFA_2026_KNOCKOUT_TEAMS} teams.`);
  }

  return qualifiedTeams;
}
