import { describe, expect, it } from "vitest";
import {
  canonicalizeTeamName,
  getAvailableTeamCoverage,
  normalizeTeamSearchText,
  resolveTeamAlias,
  suggestAvailableTeams
} from "../src/team-aliases.js";

const availableTeams = [
  "Argentina",
  "Côte d'Ivoire",
  "Czechia",
  "France",
  "Iran",
  "Netherlands",
  "South Korea",
  "United States"
];

describe("team aliases", () => {
  it("normalizes case, whitespace, and accents", () => {
    expect(normalizeTeamSearchText("  CÔTE   D’IVOIRE  ")).toBe("cote d'ivoire");
  });

  it.each([
    ["Czech Republic", "Czechia"],
    ["Korea Republic", "South Korea"],
    ["South Korea", "South Korea"],
    ["USA", "United States"],
    ["USMNT", "United States"],
    ["IR Iran", "Iran"],
    ["Ivory Coast", "Côte d'Ivoire"],
    ["Cote d'Ivoire", "Côte d'Ivoire"],
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
      { team: "USA", rank: 3, eloRating: 1580, matchesPlayed: 8 }
    ]);

    expect(coverage).toEqual(["Argentina", "France", "United States"]);
  });

  it("suggests available teams for close input", () => {
    const suggestions = suggestAvailableTeams("arg", availableTeams, 3);

    expect(suggestions[0]).toBe("Argentina");
    expect(suggestions).toHaveLength(3);
  });
});
