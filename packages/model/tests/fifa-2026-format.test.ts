import { describe, expect, it } from "vitest";
import {
  FIFA_2026_BEST_THIRD_PLACE_TEAMS,
  FIFA_2026_GROUP_IDS,
  FIFA_2026_KNOCKOUT_TEAMS,
  rankFIFA2026ThirdPlaceTeams,
  selectFIFA2026BestThirdPlaceTeams,
  selectFIFA2026GroupRunnersUp,
  selectFIFA2026GroupWinners,
  selectFIFA2026QualifiedTeams,
  validateFIFA2026Groups
} from "../src/index.js";
import type { FIFA2026Group, FIFA2026GroupId, FIFA2026GroupStanding, FIFA2026Team } from "../src/index.js";

function team(id: string, name = id): FIFA2026Team {
  return {
    id,
    name
  };
}

function validGroups(): FIFA2026Group[] {
  return FIFA_2026_GROUP_IDS.map((groupId, groupIndex) => ({
    id: groupId,
    teams: Array.from({ length: 4 }, (_, teamIndex) => team(`${groupId}${teamIndex + 1}`, `Team ${groupIndex + 1}-${teamIndex + 1}`))
  }));
}

function standing(
  groupId: FIFA2026GroupId,
  position: number,
  overrides: Partial<Omit<FIFA2026GroupStanding, "team" | "groupId" | "position">> = {}
): FIFA2026GroupStanding {
  const basePoints = 13 - position;

  return {
    team: team(`${groupId}${position}`, `${groupId} Team ${position}`),
    groupId,
    position,
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: basePoints,
    goalsAgainst: 0,
    goalDifference: basePoints,
    points: basePoints,
    ...overrides
  };
}

function standingsForAllGroups(): FIFA2026GroupStanding[] {
  return FIFA_2026_GROUP_IDS.flatMap((groupId) => [standing(groupId, 1), standing(groupId, 2), standing(groupId, 3), standing(groupId, 4)]);
}

describe("FIFA 2026 format modeling", () => {
  it("accepts 12 valid groups of 4", () => {
    expect(() => validateFIFA2026Groups(validGroups())).not.toThrow();
  });

  it("rejects fewer than 12 groups", () => {
    expect(() => validateFIFA2026Groups(validGroups().slice(0, 11))).toThrow("exactly 12 groups");
  });

  it("rejects groups with fewer or more than 4 teams", () => {
    const groups = validGroups();
    groups[0] = {
      id: "A",
      teams: groups[0]?.teams.slice(0, 3) ?? []
    };

    expect(() => validateFIFA2026Groups(groups)).toThrow("exactly 4 teams");
  });

  it("rejects duplicate teams", () => {
    const groups = validGroups();
    groups[1] = {
      id: "B",
      teams: [team("A1"), team("B2"), team("B3"), team("B4")]
    };

    expect(() => validateFIFA2026Groups(groups)).toThrow("Duplicate FIFA 2026 team id");
  });

  it("rejects invalid group ids", () => {
    const groups = validGroups();
    groups[0] = {
      id: "Z" as FIFA2026GroupId,
      teams: groups[0]?.teams ?? []
    };

    expect(() => validateFIFA2026Groups(groups)).toThrow("Invalid FIFA 2026 group id");
  });

  it("selects top 2 teams from each group", () => {
    const standings = standingsForAllGroups();

    expect(selectFIFA2026GroupWinners(standings)).toHaveLength(12);
    expect(selectFIFA2026GroupRunnersUp(standings)).toHaveLength(12);
  });

  it("selects the best 8 third-place teams", () => {
    const selected = selectFIFA2026BestThirdPlaceTeams(standingsForAllGroups());

    expect(selected).toHaveLength(FIFA_2026_BEST_THIRD_PLACE_TEAMS);
    expect(selected.every((qualified) => qualified.qualificationSource === "third_place")).toBe(true);
  });

  it("returns exactly 32 qualified teams", () => {
    expect(selectFIFA2026QualifiedTeams(standingsForAllGroups())).toHaveLength(FIFA_2026_KNOCKOUT_TEAMS);
  });

  it("ranks third-place teams by points", () => {
    const ranked = rankFIFA2026ThirdPlaceTeams([
      standing("A", 3, { points: 3 }),
      standing("B", 3, { points: 5 })
    ]);

    expect(ranked.map((entry) => entry.groupId)).toEqual(["B", "A"]);
  });

  it("ranks third-place teams by goal difference", () => {
    const ranked = rankFIFA2026ThirdPlaceTeams([
      standing("A", 3, { points: 4, goalDifference: 1 }),
      standing("B", 3, { points: 4, goalDifference: 2 })
    ]);

    expect(ranked.map((entry) => entry.groupId)).toEqual(["B", "A"]);
  });

  it("ranks third-place teams by goals for", () => {
    const ranked = rankFIFA2026ThirdPlaceTeams([
      standing("A", 3, { points: 4, goalDifference: 1, goalsFor: 2 }),
      standing("B", 3, { points: 4, goalDifference: 1, goalsFor: 3 })
    ]);

    expect(ranked.map((entry) => entry.groupId)).toEqual(["B", "A"]);
  });

  it("ranks third-place teams with deterministic team name fallback", () => {
    const ranked = rankFIFA2026ThirdPlaceTeams([
      {
        ...standing("A", 3, { points: 4, goalDifference: 1, goalsFor: 3 }),
        team: team("A3", "Zulu")
      },
      {
        ...standing("B", 3, { points: 4, goalDifference: 1, goalsFor: 3 }),
        team: team("B3", "Alpha")
      }
    ]);

    expect(ranked.map((entry) => entry.team.name)).toEqual(["Alpha", "Zulu"]);
  });
});
