import { describe, expect, it } from "vitest";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/index.js";
import {
  canonicalizeTeamName,
  getAvailableTeamCoverage,
  normalizeTeamSearchText,
  resolveTeamAlias,
  suggestAvailableTeams
} from "../src/team-aliases.js";

const availableTeams = [...WORLD_CUP_2026_TEAM_NAMES].sort((a, b) => a.localeCompare(b));

describe("team aliases", () => {
  it("normalizes case, whitespace, and accents", () => {
    expect(normalizeTeamSearchText("  CÔTE   D’IVOIRE  ")).toBe("cote d'ivoire");
  });

  it.each(WORLD_CUP_2026_TEAM_NAMES)("resolves canonical World Cup 2026 team %s", (team) => {
    const result = resolveTeamAlias(team, availableTeams);

    expect(result.canonicalName).toBe(team);
    expect(result.matchedBy).not.toBe("none");
  });

  it.each([
    ["Haiti", "Haiti"],
    ["Curacao", "Curacao"],
    ["Curaçao", "Curacao"],
    ["DR Congo", "DR Congo"],
    ["Congo DR", "DR Congo"],
    ["Democratic Republic of the Congo", "DR Congo"],
    ["Cape Verde", "Cape Verde"],
    ["Turkey", "Turkey"],
    ["Türkiye", "Turkey"],
    ["Bosnia-Herzegovina", "Bosnia-Herzegovina"],
    ["Bosnia and Herzegovina", "Bosnia-Herzegovina"],
    ["Czech Republic", "Czechia"],
    ["Korea Republic", "South Korea"],
    ["South Korea", "South Korea"],
    ["USA", "United States"],
    ["United States", "United States"],
    ["USMNT", "United States"],
    ["IR Iran", "Iran"],
    ["Ivory Coast", "Ivory Coast"],
    ["Côte d'Ivoire", "Ivory Coast"],
    ["Cote d'Ivoire", "Ivory Coast"],
    ["Netherlands", "Netherlands"],
    ["Holland", "Netherlands"]
  ])("resolves %s to %s", (input, expected) => {
    const result = resolveTeamAlias(input, availableTeams);

    expect(result.canonicalName).toBe(expected);
    expect(result.matchedBy).not.toBe("none");
  });

  it("canonicalizes raw dataset names when aliases define a preferred name", () => {
    expect(canonicalizeTeamName("USA")).toBe("United States");
    expect(canonicalizeTeamName("Czech Republic")).toBe("Czechia");
    expect(canonicalizeTeamName("Côte d'Ivoire")).toBe("Ivory Coast");
  });

  it("matches canonical names case-insensitively", () => {
    const result = resolveTeamAlias("  france ", availableTeams);

    expect(result.canonicalName).toBe("France");
    expect(result.matchedBy).toBe("canonical");
  });

  it("returns none for unavailable names", () => {
    const result = resolveTeamAlias("Atlantis", availableTeams);

    expect(result.canonicalName).toBeUndefined();
    expect(result.matchedBy).toBe("none");
  });

  it("returns available coverage sorted by team name", () => {
    const coverage = getAvailableTeamCoverage([
      { team: "France", rank: 1, eloRating: 1600, matchesPlayed: 10 },
      { team: "Argentina", rank: 2, eloRating: 1590, matchesPlayed: 9 },
      { team: "USA", rank: 3, eloRating: 1580, matchesPlayed: 8 },
      { team: "Côte d'Ivoire", rank: 4, eloRating: 1570, matchesPlayed: 7 }
    ]);

    expect(coverage).toEqual(["Argentina", "France", "Ivory Coast", "United States"]);
  });

  it("suggests available teams for close input", () => {
    const suggestions = suggestAvailableTeams("arg", availableTeams, 3);

    expect(suggestions[0]).toBe("Argentina");
    expect(suggestions).toHaveLength(3);
  });
});
