import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_HISTORICAL_BRACKET_MATCHES,
  EXPECTED_HISTORICAL_GROUP_STAGE_MATCHES,
  EXPECTED_HISTORICAL_KNOCKOUT_AND_PLACEMENT_MATCHES,
  EXPECTED_HISTORICAL_QUARTER_FINAL_MATCHES,
  EXPECTED_HISTORICAL_ROUND_OF_16_MATCHES,
  EXPECTED_HISTORICAL_SEMI_FINAL_MATCHES,
  EXPECTED_HISTORICAL_THIRD_PLACE_MATCHES,
  HISTORICAL_32_TEAM_WORLD_CUP_FORMAT,
  groupHistoricalFixturesByYear,
  reconstructHistoricalBracket,
  separateHistoricalFixturesByStage,
  validateHistoricalBracketInput
} from "../src/index.js";
import type { HistoricalGroupName, HistoricalGroupTable, HistoricalTournamentBracketFixtureInput } from "../src/index.js";

const fixtureFiles = [
  ["2010", 2010, "world-cup-2010-results.json", "Spain", "Netherlands", "Germany"],
  ["2014", 2014, "world-cup-2014-results.json", "Germany", "Argentina", "Netherlands"],
  ["2018", 2018, "world-cup-2018-results.json", "France", "Croatia", "Belgium"],
  ["2022", 2022, "world-cup-2022-results.json", "Argentina", "France", "Croatia"]
] as const;

interface FixtureFile {
  matches: HistoricalTournamentBracketFixtureInput[];
}

function readFixture(fileName: string): FixtureFile {
  const fixtureUrl = new URL(`../../data/fixtures/world-cup/${fileName}`, import.meta.url);

  return JSON.parse(readFileSync(fixtureUrl, "utf8")) as FixtureFile;
}

function readMatches(fileName: string): HistoricalTournamentBracketFixtureInput[] {
  return readFixture(fileName).matches;
}

function cloneMatches(matches: readonly HistoricalTournamentBracketFixtureInput[]): HistoricalTournamentBracketFixtureInput[] {
  return JSON.parse(JSON.stringify(matches)) as HistoricalTournamentBracketFixtureInput[];
}

function getGroupTable(tables: readonly HistoricalGroupTable[], groupName: HistoricalGroupName): HistoricalGroupTable {
  const table = tables.find((candidate) => candidate.groupName === groupName);

  if (table === undefined) {
    throw new Error(`Missing group ${groupName}.`);
  }

  return table;
}

describe("historical tournament bracket reconstruction", () => {
  it.each(fixtureFiles)("reconstructs the %s historical bracket", (_label, year, fileName, champion, runnerUp, thirdPlace) => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: year,
      fixtures: readMatches(fileName)
    });

    expect(bracket.validation.valid).toBe(true);
    expect(bracket.tournamentYear).toBe(year);
    expect(bracket.champion).toBe(champion);
    expect(bracket.runnerUp).toBe(runnerUp);
    expect(bracket.thirdPlace).toBe(thirdPlace);
  });

  it.each(fixtureFiles)("validates that %s has 64 matches", (_label, year, fileName) => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: year,
      fixtures: readMatches(fileName)
    });

    expect(bracket.metadata.actualMatchCount).toBe(EXPECTED_HISTORICAL_BRACKET_MATCHES);
    expect(bracket.metadata.expectedMatchCount).toBe(EXPECTED_HISTORICAL_BRACKET_MATCHES);
  });

  it.each(fixtureFiles)("separates %s into 48 group-stage matches", (_label, _year, fileName) => {
    const separated = separateHistoricalFixturesByStage(readMatches(fileName));

    expect(separated.groupStage).toHaveLength(EXPECTED_HISTORICAL_GROUP_STAGE_MATCHES);
  });

  it.each(fixtureFiles)("separates %s into 16 knockout and placement matches", (_label, _year, fileName) => {
    const separated = separateHistoricalFixturesByStage(readMatches(fileName));
    const knockoutAndPlacementCount =
      separated.roundOf16.length + separated.quarterFinals.length + separated.semiFinals.length + separated.thirdPlace.length + separated.final.length;

    expect(knockoutAndPlacementCount).toBe(EXPECTED_HISTORICAL_KNOCKOUT_AND_PLACEMENT_MATCHES);
  });

  it("calculates group standings correctly", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2022,
      fixtures: readMatches("world-cup-2022-results.json")
    });
    const groupC = getGroupTable(bracket.groupTables, "C");

    expect(groupC.rows.map((row) => row.team)).toEqual(["Argentina", "Poland", "Mexico", "Saudi Arabia"]);
    expect(groupC.rows[0]).toMatchObject({
      team: "Argentina",
      played: 3,
      wins: 2,
      losses: 1,
      goalsFor: 5,
      goalsAgainst: 2,
      goalDifference: 3,
      points: 6
    });
  });

  it("identifies group winners and runners-up", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2022,
      fixtures: readMatches("world-cup-2022-results.json")
    });

    expect(bracket.qualifiers.groupWinners).toHaveLength(8);
    expect(bracket.qualifiers.groupRunnersUp).toHaveLength(8);
    expect(getGroupTable(bracket.groupTables, "A").winner.team).toBe("Netherlands");
    expect(getGroupTable(bracket.groupTables, "A").runnerUp.team).toBe("Senegal");
    expect(getGroupTable(bracket.groupTables, "B").winner.team).toBe("England");
    expect(getGroupTable(bracket.groupTables, "B").runnerUp.team).toBe("USA");
  });

  it("returns knockout round fixture counts", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2018,
      fixtures: readMatches("world-cup-2018-results.json")
    });

    expect(bracket.knockoutRounds.roundOf16).toHaveLength(EXPECTED_HISTORICAL_ROUND_OF_16_MATCHES);
    expect(bracket.knockoutRounds.quarterFinals).toHaveLength(EXPECTED_HISTORICAL_QUARTER_FINAL_MATCHES);
    expect(bracket.knockoutRounds.semiFinals).toHaveLength(EXPECTED_HISTORICAL_SEMI_FINAL_MATCHES);
    expect(bracket.knockoutRounds.thirdPlace).not.toBeNull();
    expect(bracket.metadata.thirdPlaceMatchCount).toBe(EXPECTED_HISTORICAL_THIRD_PLACE_MATCHES);
    expect(bracket.knockoutRounds.final).not.toBeNull();
  });

  it("matches the final winner to the champion", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2014,
      fixtures: readMatches("world-cup-2014-results.json")
    });

    expect(bracket.knockoutRounds.final?.winner).toBe(bracket.champion);
    expect(bracket.champion).toBe("Germany");
  });

  it("matches the final loser to the runner-up", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2014,
      fixtures: readMatches("world-cup-2014-results.json")
    });

    expect(bracket.knockoutRounds.final?.loser).toBe(bracket.runnerUp);
    expect(bracket.runnerUp).toBe("Argentina");
  });

  it("identifies the third-place winner", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2010,
      fixtures: readMatches("world-cup-2010-results.json")
    });

    expect(bracket.knockoutRounds.thirdPlace?.winner).toBe("Germany");
    expect(bracket.thirdPlace).toBe("Germany");
  });

  it("rejects knockout fixtures without a winner", () => {
    const matches = cloneMatches(readMatches("world-cup-2022-results.json"));
    matches[63]!.winner = null;

    expect(() =>
      reconstructHistoricalBracket({
        tournamentYear: 2022,
        fixtures: matches
      })
    ).toThrow("Knockout and placement fixtures must include a winner");
  });

  it("rejects invalid match counts", () => {
    const matches = cloneMatches(readMatches("world-cup-2018-results.json")).slice(1);
    const validation = validateHistoricalBracketInput({
      tournamentYear: 2018,
      fixtures: matches
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain("invalid_match_count");
    expect(() =>
      reconstructHistoricalBracket({
        tournamentYear: 2018,
        fixtures: matches
      })
    ).toThrow("must contain 64 matches");
  });

  it("keeps historical 32-team format separate from FIFA 2026 format", () => {
    const bracket = reconstructHistoricalBracket({
      tournamentYear: 2022,
      fixtures: readMatches("world-cup-2022-results.json")
    });

    expect(bracket.tournamentFormat).toBe(HISTORICAL_32_TEAM_WORLD_CUP_FORMAT);
    expect(bracket.metadata.tournamentFormat).toBe(HISTORICAL_32_TEAM_WORLD_CUP_FORMAT);
    expect(bracket.metadata.tournamentFormat).not.toBe("fifa_2026_48_team_world_cup");
    expect(bracket.groups).toHaveLength(8);
    expect(bracket.metadata.teamsCount).toBe(32);
  });

  it("groups historical fixtures by tournament year", () => {
    const fixtures = fixtureFiles.flatMap(([, , fileName]) => readMatches(fileName));
    const grouped = groupHistoricalFixturesByYear(fixtures);

    expect(Object.keys(grouped).sort()).toEqual(["2010", "2014", "2018", "2022"]);
    expect(grouped[2010]).toHaveLength(64);
    expect(grouped[2022]).toHaveLength(64);
  });
});
