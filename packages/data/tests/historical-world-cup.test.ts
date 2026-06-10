import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadHistoricalWorldCupMatches,
  normalizeHistoricalWorldCupMatches,
  validateHistoricalWorldCupFixtureFile
} from "../src/index.js";
import type { HistoricalWorldCupFixtureFile, NormalizedMatch } from "../src/index.js";

function readFixture(fileName: string): HistoricalWorldCupFixtureFile {
  const fixtureUrl = new URL(`../fixtures/world-cup/${fileName}`, import.meta.url);

  return JSON.parse(readFileSync(fixtureUrl, "utf8")) as HistoricalWorldCupFixtureFile;
}

function cloneFixture(fixture: HistoricalWorldCupFixtureFile): HistoricalWorldCupFixtureFile {
  return JSON.parse(JSON.stringify(fixture)) as HistoricalWorldCupFixtureFile;
}

function mutableMatches(fixture: HistoricalWorldCupFixtureFile): Record<string, unknown>[] {
  if (!Array.isArray(fixture.matches)) {
    throw new Error("Expected fixture matches array.");
  }

  return fixture.matches as Record<string, unknown>[];
}

function expectModelCompatibleMatch(match: NormalizedMatch): void {
  expect(match.match_id).toMatch(/WC/);
  expect(match.match_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(match.home_team.length).toBeGreaterThan(0);
  expect(match.away_team.length).toBeGreaterThan(0);
  expect(typeof match.neutral_site).toBe("boolean");
  expect(typeof match.home_score).toBe("number");
  expect(typeof match.away_score).toBe("number");
  expect(["home_win", "draw", "away_win"]).toContain(match.result);
}

describe("historical World Cup fixture loading", () => {
  it("loads the 2018 fixture successfully", () => {
    const matches = loadHistoricalWorldCupMatches(readFixture("world-cup-2018-results.json"));

    expect(matches).toHaveLength(4);
    expect(matches.map((match) => match.tournament_year)).toEqual([2018, 2018, 2018, 2018]);
    expect(matches.at(-1)).toMatchObject({
      match_id: "2018-WC-F-001",
      home_team: "France",
      away_team: "Croatia",
      result: "home_win"
    });
  });

  it("loads the 2022 fixture successfully", () => {
    const matches = loadHistoricalWorldCupMatches(readFixture("world-cup-2022-results.json"));

    expect(matches).toHaveLength(4);
    expect(matches.map((match) => match.tournament_year)).toEqual([2022, 2022, 2022, 2022]);
    expect(matches.at(-1)).toMatchObject({
      match_id: "2022-WC-F-001",
      home_team: "Argentina",
      away_team: "France",
      result: "draw"
    });
  });

  it("requires all historical fixture fields", () => {
    const fixture = cloneFixture(readFixture("world-cup-2018-results.json"));
    delete mutableMatches(fixture)[0]?.source_note;
    const result = validateHistoricalWorldCupFixtureFile(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      match_id: "2018-WC-SF-001",
      field: "source_note",
      code: "missing_required_field",
      message: "source_note is required."
    });
  });

  it("rejects invalid scores", () => {
    const fixture = cloneFixture(readFixture("world-cup-2018-results.json"));
    mutableMatches(fixture)[0]!.home_score = -1;

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("home_score must be a non-negative integer");
  });

  it("requires result to match score", () => {
    const fixture = cloneFixture(readFixture("world-cup-2018-results.json"));
    mutableMatches(fixture)[0]!.result = "away_win";

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("result must match home_score and away_score");
  });

  it("rejects invalid stage values", () => {
    const fixture = cloneFixture(readFixture("world-cup-2022-results.json"));
    mutableMatches(fixture)[0]!.stage = "semi";

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("stage must be one of");
  });

  it("rejects duplicate match IDs", () => {
    const fixture = cloneFixture(readFixture("world-cup-2022-results.json"));
    mutableMatches(fixture)[1]!.match_id = mutableMatches(fixture)[0]?.match_id;

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("duplicate match_id");
  });

  it("normalizes historical fixtures into model-compatible match data", () => {
    const historicalMatches = loadHistoricalWorldCupMatches(readFixture("world-cup-2022-results.json"));
    const normalizedMatches = normalizeHistoricalWorldCupMatches(historicalMatches);

    expect(normalizedMatches).toHaveLength(4);
    expect(normalizedMatches[0]).toMatchObject({
      match_id: "2022-WC-SF-001",
      competition: "FIFA World Cup 2022",
      home_team: "Argentina",
      away_team: "Croatia",
      data_source: historicalMatches[0]?.source_note
    });

    for (const match of normalizedMatches) {
      expectModelCompatibleMatch(match);
    }
  });
});
