import { FIFA_2026_KNOCKOUT_TEAMS } from "./fifa-2026-format.js";
import type { FIFA2026BracketSlot, FIFA2026QualifiedTeam, FIFA2026RoundOf32Fixture } from "./types.js";

export const FIFA_2026_ROUND_OF_32_FIXTURE_COUNT = 16;

function createTeamKey(team: FIFA2026QualifiedTeam): string {
  return team.team.id;
}

function validateQualifiedTeams(qualifiedTeams: readonly FIFA2026QualifiedTeam[]): void {
  if (qualifiedTeams.length !== FIFA_2026_KNOCKOUT_TEAMS) {
    throw new Error(`Round of 32 requires exactly ${FIFA_2026_KNOCKOUT_TEAMS} qualified teams.`);
  }

  const seenTeamIds = new Set<string>();

  for (const qualifiedTeam of qualifiedTeams) {
    const teamId = createTeamKey(qualifiedTeam);

    if (seenTeamIds.has(teamId)) {
      throw new Error(`Duplicate qualified team id: ${teamId}`);
    }

    seenTeamIds.add(teamId);
  }
}

export function buildSimpleFIFA2026RoundOf32Fixtures(qualifiedTeams: readonly FIFA2026QualifiedTeam[]): FIFA2026RoundOf32Fixture[] {
  validateQualifiedTeams(qualifiedTeams);

  const fixtures: FIFA2026RoundOf32Fixture[] = [];

  for (let index = 0; index < FIFA_2026_ROUND_OF_32_FIXTURE_COUNT; index += 1) {
    const homeTeam = qualifiedTeams[index];
    const awayTeam = qualifiedTeams[FIFA_2026_KNOCKOUT_TEAMS - 1 - index];

    if (homeTeam === undefined || awayTeam === undefined) {
      throw new Error("Qualified team is missing for Round of 32 fixture creation.");
    }

    fixtures.push({
      fixtureId: `R32-${String(index + 1).padStart(2, "0")}`,
      homeSlot: {
        slotId: `R32-${String(index + 1).padStart(2, "0")}-H`,
        team: homeTeam
      },
      awaySlot: {
        slotId: `R32-${String(index + 1).padStart(2, "0")}-A`,
        team: awayTeam
      }
    });
  }

  return fixtures;
}

export function validateFIFA2026RoundOf32Fixtures(
  fixtures: readonly FIFA2026RoundOf32Fixture[],
  qualifiedTeams: readonly FIFA2026QualifiedTeam[]
): void {
  validateQualifiedTeams(qualifiedTeams);

  if (fixtures.length !== FIFA_2026_ROUND_OF_32_FIXTURE_COUNT) {
    throw new Error(`Round of 32 must include exactly ${FIFA_2026_ROUND_OF_32_FIXTURE_COUNT} fixtures.`);
  }

  const expectedTeamIds = new Set(qualifiedTeams.map((team) => createTeamKey(team)));
  const usedTeamIds = new Set<string>();
  const fixtureIds = new Set<string>();

  for (const fixture of fixtures) {
    if (fixture.fixtureId.trim().length === 0) {
      throw new Error("Round of 32 fixture id is required.");
    }

    if (fixtureIds.has(fixture.fixtureId)) {
      throw new Error(`Duplicate Round of 32 fixture id: ${fixture.fixtureId}`);
    }

    fixtureIds.add(fixture.fixtureId);

    const homeTeamId = createTeamKey(fixture.homeSlot.team);
    const awayTeamId = createTeamKey(fixture.awaySlot.team);

    if (homeTeamId === awayTeamId) {
      throw new Error("Round of 32 fixture must contain two different teams.");
    }

    for (const teamId of [homeTeamId, awayTeamId]) {
      if (!expectedTeamIds.has(teamId)) {
        throw new Error(`Round of 32 fixture uses a team that did not qualify: ${teamId}`);
      }

      if (usedTeamIds.has(teamId)) {
        throw new Error(`Duplicate Round of 32 team usage: ${teamId}`);
      }

      usedTeamIds.add(teamId);
    }
  }

  if (usedTeamIds.size !== FIFA_2026_KNOCKOUT_TEAMS) {
    throw new Error("Round of 32 fixtures must use every qualified team exactly once.");
  }
}
