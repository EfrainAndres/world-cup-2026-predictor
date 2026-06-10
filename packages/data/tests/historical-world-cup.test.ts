import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_HISTORICAL_WORLD_CUP_TOTAL_MATCHES,
  loadHistoricalWorldCupDataset,
  loadHistoricalWorldCupMatches,
  normalizeHistoricalWorldCupMatches,
  validateHistoricalWorldCupDataset,
  validateHistoricalWorldCupFixtureFile
} from "../src/index.js";
import type { HistoricalWorldCupFixtureFile, NormalizedMatch } from "../src/index.js";

const fixtureFiles = [
  "world-cup-2010-results.json",
  "world-cup-2014-results.json",
  "world-cup-2018-results.json",
  "world-cup-2022-results.json"
] as const;

function readFixture(fileName: string): HistoricalWorldCupFixtureFile {
  const fixtureUrl = new URL(`../fixtures/world-cup/${fileName}`, import.meta.url);

  return JSON.parse(readFileSync(fixtureUrl, "utf8")) as HistoricalWorldCupFixtureFile;
}

function readAllFixtures(): HistoricalWorldCupFixtureFile[] {
  return fixtureFiles.map((fileName) => readFixture(fileName));
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
  it.each([
    ["2010", "world-cup-2010-results.json"],
    ["2014", "world-cup-2014-results.json"],
    ["2018", "world-cup-2018-results.json"],
    ["2022", "world-cup-2022-results.json"]
  ])("loads the %s fixture successfully with 64 matches", (year, fileName) => {
    const matches = loadHistoricalWorldCupMatches(readFixture(fileName));

    expect(matches).toHaveLength(64);
    expect(matches.every((match) => match.tournament_year === Number(year))).toBe(true);
  });

  it("loads all supported tournaments as a 256-match dataset", () => {
    const fixtures = readAllFixtures();
    const validation = validateHistoricalWorldCupDataset(fixtures);
    const matches = loadHistoricalWorldCupDataset(fixtures);

    expect(validation.valid).toBe(true);
    expect(matches).toHaveLength(EXPECTED_HISTORICAL_WORLD_CUP_TOTAL_MATCHES);
  });

  it("validates stage order for all historical matches", () => {
    const matches = loadHistoricalWorldCupDataset(readAllFixtures());
    const expectedStageOrder = {
      group_stage: 1,
      round_of_16: 2,
      quarter_final: 3,
      semi_final: 4,
      third_place: 5,
      final: 6
    };

    for (const match of matches) {
      expect(match.stage_order).toBe(expectedStageOrder[match.stage]);
    }
  });

  it("requires knockout scoreline draws to have a winner", () => {
    const matches = loadHistoricalWorldCupDataset(readAllFixtures());
    const knockoutDraws = matches.filter((match) => match.stage !== "group_stage" && match.result === "draw");

    expect(knockoutDraws.length).toBeGreaterThan(0);
    expect(knockoutDraws.every((match) => match.winner !== null)).toBe(true);
  });

  it("allows group-stage draws without a winner", () => {
    const matches = loadHistoricalWorldCupDataset(readAllFixtures());
    const groupDraws = matches.filter((match) => match.stage === "group_stage" && match.result === "draw");

    expect(groupDraws.length).toBeGreaterThan(0);
    expect(groupDraws.every((match) => match.winner === null && match.decided_by === "draw")).toBe(true);
  });

  it("requires penalty-decided matches to include penalty scores", () => {
    const matches = loadHistoricalWorldCupDataset(readAllFixtures());
    const penaltyMatches = matches.filter((match) => match.decided_by === "penalties");

    expect(penaltyMatches.length).toBeGreaterThan(0);
    expect(penaltyMatches.every((match) => typeof match.penalty_home_score === "number")).toBe(true);
    expect(penaltyMatches.every((match) => typeof match.penalty_away_score === "number")).toBe(true);
  });

  it("requires all historical fixture fields", () => {
    const fixture = cloneFixture(readFixture("world-cup-2018-results.json"));
    delete mutableMatches(fixture)[0]?.source_note;
    const result = validateHistoricalWorldCupFixtureFile(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      match_id: "2018-WC-001",
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
    mutableMatches(fixture)[0]!.stage = "group";

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("stage must be one of");
  });

  it("rejects invalid decided_by values", () => {
    const fixture = cloneFixture(readFixture("world-cup-2022-results.json"));
    mutableMatches(fixture)[0]!.decided_by = "coin_toss";

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("decided_by must be one of");
  });

  it("rejects duplicate match IDs within a fixture", () => {
    const fixture = cloneFixture(readFixture("world-cup-2022-results.json"));
    mutableMatches(fixture)[1]!.match_id = mutableMatches(fixture)[0]?.match_id;

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("duplicate match_id");
  });

  it("rejects invalid winners", () => {
    const fixture = cloneFixture(readFixture("world-cup-2022-results.json"));
    mutableMatches(fixture)[63]!.winner = "Brazil";

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("winner must match home_team or away_team");
  });

  it("rejects penalty winners that do not match penalty scores", () => {
    const fixture = cloneFixture(readFixture("world-cup-2022-results.json"));
    mutableMatches(fixture)[63]!.winner = "France";

    expect(() => loadHistoricalWorldCupMatches(fixture)).toThrow("winner must match the penalty shootout winner");
  });

  it("normalizes historical fixtures into model-compatible match data", () => {
    const historicalMatches = loadHistoricalWorldCupMatches(readFixture("world-cup-2022-results.json"));
    const normalizedMatches = normalizeHistoricalWorldCupMatches(historicalMatches);

    expect(normalizedMatches).toHaveLength(64);
    expect(normalizedMatches[0]).toMatchObject({
      match_id: "2022-WC-001",
      competition: "FIFA World Cup 2022",
      home_team: "Qatar",
      away_team: "Ecuador",
      data_source: historicalMatches[0]?.source_note
    });

    for (const match of normalizedMatches) {
      expectModelCompatibleMatch(match);
    }
  });
});
