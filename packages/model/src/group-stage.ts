import { simulateOneMatch, validateProbabilityMatrix } from "./simulation.js";
import type {
  GroupInput,
  GroupMatchInput,
  GroupStanding,
  RandomFunction,
  SimulatedGroupMatch,
  SimulatedGroupResult,
  TournamentTeamInput
} from "./types.js";

const DEFAULT_GROUP_QUALIFIERS_COUNT = 2;

function validateTeamName(teamName: string, label: string): void {
  if (teamName.trim().length === 0) {
    throw new Error(`${label} must be a non-empty team name.`);
  }
}

function validateUniqueTeams(teams: readonly TournamentTeamInput[]): void {
  if (teams.length < 2) {
    throw new Error("group must include at least two teams.");
  }

  const seenTeams = new Set<string>();

  for (const team of teams) {
    validateTeamName(team.name, "team.name");

    if (seenTeams.has(team.name)) {
      throw new Error(`group contains duplicate team: ${team.name}`);
    }

    seenTeams.add(team.name);
  }
}

function validateGroupMatch(match: GroupMatchInput, teamNames: ReadonlySet<string>): void {
  validateTeamName(match.homeTeam, "homeTeam");
  validateTeamName(match.awayTeam, "awayTeam");

  if (match.homeTeam === match.awayTeam) {
    throw new Error("group match teams must be different.");
  }

  if (!teamNames.has(match.homeTeam) || !teamNames.has(match.awayTeam)) {
    throw new Error("group match teams must belong to the group.");
  }

  validateProbabilityMatrix(match.scoreMatrix);
}

function validateQualifiersCount(qualifiersCount: number, teamCount: number): void {
  if (!Number.isInteger(qualifiersCount) || qualifiersCount < 1) {
    throw new Error("qualifiersCount must be a positive integer.");
  }

  if (qualifiersCount >= teamCount) {
    throw new Error("qualifiersCount must be less than the number of teams in the group.");
  }
}

export function validateGroupInput(group: GroupInput, defaultQualifiersCount = DEFAULT_GROUP_QUALIFIERS_COUNT): void {
  if (group.name.trim().length === 0) {
    throw new Error("group name must be non-empty.");
  }

  validateUniqueTeams(group.teams);

  if (group.matches.length === 0) {
    throw new Error("group must include at least one match.");
  }

  const teamNames = new Set(group.teams.map((team) => team.name));

  for (const match of group.matches) {
    validateGroupMatch(match, teamNames);
  }

  validateQualifiersCount(group.qualifiersCount ?? defaultQualifiersCount, group.teams.length);
}

export function createInitialStandings(teams: readonly TournamentTeamInput[]): Map<string, GroupStanding> {
  validateUniqueTeams(teams);

  return new Map(
    teams.map((team) => [
      team.name,
      {
        team: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      }
    ])
  );
}

function applyGroupMatchToStandings(standings: Map<string, GroupStanding>, match: SimulatedGroupMatch): void {
  const homeStanding = standings.get(match.homeTeam);
  const awayStanding = standings.get(match.awayTeam);

  if (homeStanding === undefined || awayStanding === undefined) {
    throw new Error("group match standings are missing a team.");
  }

  homeStanding.played += 1;
  awayStanding.played += 1;
  homeStanding.goalsFor += match.homeGoals;
  homeStanding.goalsAgainst += match.awayGoals;
  awayStanding.goalsFor += match.awayGoals;
  awayStanding.goalsAgainst += match.homeGoals;
  homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
  awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;

  if (match.homeGoals > match.awayGoals) {
    homeStanding.wins += 1;
    homeStanding.points += 3;
    awayStanding.losses += 1;
  } else if (match.homeGoals < match.awayGoals) {
    awayStanding.wins += 1;
    awayStanding.points += 3;
    homeStanding.losses += 1;
  } else {
    homeStanding.draws += 1;
    awayStanding.draws += 1;
    homeStanding.points += 1;
    awayStanding.points += 1;
  }
}

export function sortGroupStandings(standings: readonly GroupStanding[]): GroupStanding[] {
  return [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team)
  );
}

export function simulateGroup(group: GroupInput, random: RandomFunction, defaultQualifiersCount = DEFAULT_GROUP_QUALIFIERS_COUNT): SimulatedGroupResult {
  validateGroupInput(group, defaultQualifiersCount);

  const standings = createInitialStandings(group.teams);
  const matches = group.matches.map((match) => {
    const scoreline = simulateOneMatch(match.scoreMatrix, { random });
    const simulatedMatch: SimulatedGroupMatch = {
      ...match,
      homeGoals: scoreline.homeGoals,
      awayGoals: scoreline.awayGoals
    };

    applyGroupMatchToStandings(standings, simulatedMatch);

    return simulatedMatch;
  });
  const sortedStandings = sortGroupStandings([...standings.values()]);
  const qualifiersCount = group.qualifiersCount ?? defaultQualifiersCount;

  return {
    groupName: group.name,
    matches,
    standings: sortedStandings,
    qualifiers: sortedStandings.slice(0, qualifiersCount)
  };
}
