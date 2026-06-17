import { describe, expect, test } from "vitest";
import {
  filterGroupedTeamOptions,
  getGroupedTeamOptions,
  groupFilteredTeamMatches
} from "./grouped-team-options";

describe("grouped team options", () => {
  const options = getGroupedTeamOptions();

  test("includes all 48 canonical World Cup 2026 teams", () => {
    expect(options).toHaveLength(48);
    expect(new Set(options.map((option) => option.canonicalName)).size).toBe(48);
  });

  test("preserves Groups A through L", () => {
    expect([...new Set(options.map((option) => option.group))]).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);
  });

  test("searching by canonical name returns the matching canonical team", () => {
    const matches = filterGroupedTeamOptions(options, "Argentina");

    expect(matches.map((match) => match.option.canonicalName)).toContain("Argentina");
  });

  test("searching by an existing alias returns the canonical team", () => {
    const matches = filterGroupedTeamOptions(options, "USA");

    expect(matches.map((match) => match.option.canonicalName)).toContain("United States");
  });

  test("selected home team is excluded from away options", () => {
    const matches = filterGroupedTeamOptions(options, "", "France");

    expect(matches.map((match) => match.option.canonicalName)).not.toContain("France");
  });

  test("filtered matches stay grouped by World Cup group", () => {
    const groupedMatches = groupFilteredTeamMatches(filterGroupedTeamOptions(options, ""));

    expect(groupedMatches.map((entry) => entry.group)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);
  });
});
