import { describe, expect, it } from "vitest";
import {
  FIFA_2026_GROUP_IDS,
  buildSimpleFIFA2026RoundOf32Fixtures,
  selectFIFA2026QualifiedTeams,
  validateFIFA2026RoundOf32Fixtures
} from "../src/index.js";
import type { FIFA2026GroupId, FIFA2026GroupStanding, FIFA2026QualifiedTeam, FIFA2026Team } from "../src/index.js";

function team(id: string, name = id): FIFA2026Team {
  return {
    id,
    name
  };
}

function standing(groupId: FIFA2026GroupId, position: number): FIFA2026GroupStanding {
  const points = 13 - position;

  return {
    team: team(`${groupId}${position}`, `${groupId} Team ${position}`),
    groupId,
    position,
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points
  };
}

function qualifiedTeams(): FIFA2026QualifiedTeam[] {
  return selectFIFA2026QualifiedTeams(
    FIFA_2026_GROUP_IDS.flatMap((groupId) => [standing(groupId, 1), standing(groupId, 2), standing(groupId, 3), standing(groupId, 4)])
  );
}

describe("FIFA 2026 Round of 32 fixture modeling", () => {
  it("builds 16 Round of 32 fixtures", () => {
    const fixtures = buildSimpleFIFA2026RoundOf32Fixtures(qualifiedTeams());

    expect(fixtures).toHaveLength(16);
  });

  it("validates a complete Round of 32 bracket", () => {
    const teams = qualifiedTeams();
    const fixtures = buildSimpleFIFA2026RoundOf32Fixtures(teams);

    expect(() => validateFIFA2026RoundOf32Fixtures(fixtures, teams)).not.toThrow();
  });

  it("rejects duplicate teams in bracket fixtures", () => {
    const teams = qualifiedTeams();
    const fixtures = buildSimpleFIFA2026RoundOf32Fixtures(teams);
    const duplicateFixture = fixtures[0];

    if (duplicateFixture === undefined) {
      throw new Error("test fixture missing");
    }

    fixtures[1] = {
      fixtureId: "R32-02",
      homeSlot: {
        slotId: "R32-02-H",
        team: duplicateFixture.homeSlot.team
      },
      awaySlot: fixtures[1]?.awaySlot ?? duplicateFixture.awaySlot
    };

    expect(() => validateFIFA2026RoundOf32Fixtures(fixtures, teams)).toThrow("Duplicate Round of 32 team usage");
  });

  it("rejects missing teams in bracket fixtures", () => {
    const teams = qualifiedTeams();
    const fixtures = buildSimpleFIFA2026RoundOf32Fixtures(teams).slice(0, 15);

    expect(() => validateFIFA2026RoundOf32Fixtures(fixtures, teams)).toThrow("exactly 16 fixtures");
  });
});
