import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  INTERNATIONAL_MATCH_CURATED_SAMPLE_WARNING,
  INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING,
  INTERNATIONAL_MATCH_EXPANDED_DATASET_ID,
  INTERNATIONAL_MATCH_NOT_COMPLETE_GLOBAL_HISTORY_WARNING,
  INTERNATIONAL_MATCH_PARTIAL_HISTORY_WARNING,
  INTERNATIONAL_MATCH_SAMPLE_DATASET_ID,
  INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING,
  loadInternationalMatchDataset,
  normalizeInternationalMatch,
  normalizeInternationalMatches,
  validateInternationalMatchDataset
} from "../src/international-matches.js";
import type { InternationalMatch, InternationalMatchFixtureFile } from "../src/international-matches.js";

const rawSampleFixtureFile = JSON.parse(
  readFileSync(new URL("../fixtures/international/sample-international-matches.json", import.meta.url), "utf-8")
) as InternationalMatchFixtureFile;

const rawExpandedFixtureFile = JSON.parse(
  readFileSync(new URL("../fixtures/international/expanded-international-matches.json", import.meta.url), "utf-8")
) as InternationalMatchFixtureFile;

function makeValidMatch(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    match_id: "TEST-001",
    match_date: "2023-01-01",
    competition: "International Friendly",
    stage: "friendly",
    home_team: "Team A",
    away_team: "Team B",
    home_score: 1,
    away_score: 0,
    result: "home_win",
    neutral_site: false,
    source_note: "Test match.",
    ...overrides
  };
}

function makeFixture(matches: unknown[]): Record<string, unknown> {
  return {
    dataset_id: "test-fixture-v1",
    description: "Test fixture",
    is_sample_only: true,
    created_at: "2026-06-11T00:00:00.000Z",
    matches
  };
}

describe("validateInternationalMatchDataset", () => {
  it("returns valid for the sample fixture file", () => {
    const result = validateInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns invalid for null input", () => {
    const result = validateInternationalMatchDataset(null);

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("invalid_fixture_file");
  });

  it("returns invalid when the input is not an object with a matches array", () => {
    const result = validateInternationalMatchDataset("not-an-object");

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("invalid_fixture_file");
  });

  it("returns valid for an empty matches array", () => {
    const result = validateInternationalMatchDataset(makeFixture([]));

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns invalid for a duplicate match_id", () => {
    const fixture = makeFixture([makeValidMatch({ match_id: "DUP-001" }), makeValidMatch({ match_id: "DUP-001", home_team: "Team C", away_team: "Team D" })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "duplicate_match_id")).toBe(true);
  });

  it("returns invalid when a required field is missing", () => {
    const fixture = makeFixture([makeValidMatch({ source_note: undefined })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "source_note" && issue.code === "missing_required_field")).toBe(true);
  });

  it("returns invalid when result is inconsistent with scores", () => {
    const fixture = makeFixture([makeValidMatch({ home_score: 2, away_score: 0, result: "draw" })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "result" && issue.code === "invalid_result")).toBe(true);
  });

  it("returns invalid when home_team equals away_team", () => {
    const fixture = makeFixture([makeValidMatch({ home_team: "France", away_team: "France" })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "away_team" && issue.code === "invalid_team")).toBe(true);
  });

  it("returns invalid when home_score is a negative number", () => {
    const fixture = makeFixture([makeValidMatch({ home_score: -1 })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "home_score" && issue.code === "invalid_score")).toBe(true);
  });

  it("returns invalid when match_date is not a valid date string", () => {
    const fixture = makeFixture([makeValidMatch({ match_date: "not-a-date" })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "match_date" && issue.code === "invalid_date")).toBe(true);
  });

  it("returns invalid when neutral_site is not a boolean", () => {
    const fixture = makeFixture([makeValidMatch({ neutral_site: "yes" })]);
    const result = validateInternationalMatchDataset(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "neutral_site" && issue.code === "invalid_neutral_site")).toBe(true);
  });
});

describe("loadInternationalMatchDataset", () => {
  it("loads the sample fixture successfully", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.matches).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it("loads exactly 15 matches from the sample fixture", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.matches).toHaveLength(15);
  });

  it("returns the correct datasetId from the fixture file header", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.datasetId).toBe(INTERNATIONAL_MATCH_SAMPLE_DATASET_ID);
  });

  it("returns matchCount equal to the number of loaded matches", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.matchCount).toBe(result.matches.length);
  });

  it("returns 5 unique competitions sorted alphabetically", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.competitions).toHaveLength(5);
    expect(result.metadata.competitions[0]).toBe("Copa America 2024");
    expect(result.metadata.competitions[1]).toBe("FIFA World Cup 2022");
    expect(result.metadata.competitions[2]).toBe("FIFA World Cup 2026 Qualifier");
    expect(result.metadata.competitions[3]).toBe("International Friendly");
    expect(result.metadata.competitions[4]).toBe("UEFA Euro 2024");
  });

  it("returns the correct earliest match date", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.earliestMatchDate).toBe("2022-11-22");
  });

  it("returns the correct latest match date", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.latestMatchDate).toBe("2024-09-07");
  });

  it("marks the sample dataset as isSampleOnly true", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.isSampleOnly).toBe(true);
  });

  it("includes the foundation warning in metadata", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING);
  });

  it("includes the sample-only warning when isSampleOnly is true", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING);
  });

  it("includes explicit partial-history warning codes in metadata", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);

    expect(result.metadata.warningCodes).toContain("partial_international_history");
    expect(result.metadata.warningCodes).toContain("curated_sample_only");
    expect(result.metadata.warningCodes).toContain("not_complete_global_match_history");
    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_PARTIAL_HISTORY_WARNING);
    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_CURATED_SAMPLE_WARNING);
    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_NOT_COMPLETE_GLOBAL_HISTORY_WARNING);
  });

  it("omits the sample-only warning when is_sample_only is false", () => {
    const fixture = { ...rawSampleFixtureFile, is_sample_only: false };
    const result = loadInternationalMatchDataset(fixture);

    expect(result.metadata.foundationWarnings).not.toContain(INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING);
  });

  it("loads an empty matches array without error", () => {
    const fixture = makeFixture([]);
    const result = loadInternationalMatchDataset(fixture);

    expect(result.matches).toHaveLength(0);
    expect(result.metadata.matchCount).toBe(0);
    expect(result.metadata.earliestMatchDate).toBeUndefined();
    expect(result.metadata.latestMatchDate).toBeUndefined();
    expect(result.metadata.competitions).toHaveLength(0);
  });

  it("throws when the fixture file is invalid", () => {
    expect(() => loadInternationalMatchDataset(null)).toThrow("International match dataset validation failed");
  });

  it("throws when a required field is missing", () => {
    const fixture = makeFixture([makeValidMatch({ match_id: undefined })]);

    expect(() => loadInternationalMatchDataset(fixture)).toThrow("International match dataset validation failed");
  });

  it("parses match fields to their correct types", () => {
    const result = loadInternationalMatchDataset(rawSampleFixtureFile);
    const firstMatch = result.matches[0];

    expect(firstMatch).toBeDefined();

    if (firstMatch !== undefined) {
      expect(typeof firstMatch.match_id).toBe("string");
      expect(typeof firstMatch.match_date).toBe("string");
      expect(typeof firstMatch.competition).toBe("string");
      expect(typeof firstMatch.stage).toBe("string");
      expect(typeof firstMatch.home_team).toBe("string");
      expect(typeof firstMatch.away_team).toBe("string");
      expect(typeof firstMatch.home_score).toBe("number");
      expect(typeof firstMatch.away_score).toBe("number");
      expect(["home_win", "draw", "away_win"]).toContain(firstMatch.result);
      expect(typeof firstMatch.neutral_site).toBe("boolean");
      expect(typeof firstMatch.source_note).toBe("string");
    }
  });

  it("loads the expanded fixture successfully", () => {
    const result = loadInternationalMatchDataset(rawExpandedFixtureFile);

    expect(result.metadata.datasetId).toBe(INTERNATIONAL_MATCH_EXPANDED_DATASET_ID);
    expect(result.matches).toHaveLength(56);
    expect(result.metadata.matchCount).toBe(56);
  });

  it("expanded fixture has the expected minimum match count", () => {
    const result = loadInternationalMatchDataset(rawExpandedFixtureFile);

    expect(result.matches.length).toBeGreaterThanOrEqual(50);
    expect(result.matches.length).toBeLessThanOrEqual(100);
  });

  it("expanded fixture includes the required competition metadata", () => {
    const result = loadInternationalMatchDataset(rawExpandedFixtureFile);

    expect(result.metadata.competitions).toEqual([
      "Copa America 2024",
      "FIFA World Cup 2022",
      "FIFA World Cup 2026 Qualifier",
      "International Friendly",
      "UEFA Euro 2024"
    ]);
    expect(result.metadata.earliestMatchDate).toBe("2022-11-20");
    expect(result.metadata.latestMatchDate).toBe("2024-07-14");
  });

  it("expanded fixture includes partial dataset warnings", () => {
    const result = loadInternationalMatchDataset(rawExpandedFixtureFile);

    expect(result.metadata.warningCodes).toEqual([
      "partial_international_history",
      "not_complete_global_match_history",
      "curated_sample_only"
    ]);
    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_PARTIAL_HISTORY_WARNING);
    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_CURATED_SAMPLE_WARNING);
    expect(result.metadata.foundationWarnings).toContain(INTERNATIONAL_MATCH_NOT_COMPLETE_GLOBAL_HISTORY_WARNING);
  });

  it("validation catches duplicate match ids in expanded-style fixtures", () => {
    const duplicateFixture = {
      ...rawExpandedFixtureFile,
      matches: [
        ...(rawExpandedFixtureFile.matches as unknown[]),
        {
          ...((rawExpandedFixtureFile.matches as Record<string, unknown>[])[0] ?? makeValidMatch()),
          home_team: "Duplicate Team A",
          away_team: "Duplicate Team B"
        }
      ]
    };
    const result = validateInternationalMatchDataset(duplicateFixture);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "duplicate_match_id")).toBe(true);
  });
});

describe("normalizeInternationalMatch", () => {
  const CREATED_AT = "2026-06-11T00:00:00.000Z";

  const sampleMatch: InternationalMatch = {
    match_id: "INT-WC22-001",
    match_date: "2022-11-22",
    competition: "FIFA World Cup 2022",
    stage: "group_stage",
    home_team: "France",
    away_team: "Australia",
    home_score: 4,
    away_score: 1,
    result: "home_win",
    neutral_site: true,
    source_note: "Sample curated data — FIFA World Cup 2022 group stage."
  };

  it("returns a NormalizedMatch with correct fields", () => {
    const normalized = normalizeInternationalMatch(sampleMatch, CREATED_AT);

    expect(normalized.match_id).toBe("INT-WC22-001");
    expect(normalized.match_date).toBe("2022-11-22");
    expect(normalized.competition).toBe("FIFA World Cup 2022");
    expect(normalized.home_team).toBe("France");
    expect(normalized.away_team).toBe("Australia");
    expect(normalized.home_score).toBe(4);
    expect(normalized.away_score).toBe(1);
    expect(normalized.result).toBe("home_win");
    expect(normalized.neutral_site).toBe(true);
    expect(normalized.data_source).toBe(sampleMatch.source_note);
  });

  it("maps source_note to data_source", () => {
    const normalized = normalizeInternationalMatch(sampleMatch, CREATED_AT);

    expect(normalized.data_source).toBe(sampleMatch.source_note);
  });

  it("preserves competition string as-is in NormalizedMatch", () => {
    const match: InternationalMatch = { ...sampleMatch, competition: "Copa America 2024" };
    const normalized = normalizeInternationalMatch(match, CREATED_AT);

    expect(normalized.competition).toBe("Copa America 2024");
  });
});

describe("normalizeInternationalMatches", () => {
  const CREATED_AT = "2026-06-11T00:00:00.000Z";

  it("normalizes all 15 sample matches without error", () => {
    const { matches } = loadInternationalMatchDataset(rawSampleFixtureFile);
    const normalized = normalizeInternationalMatches(matches, CREATED_AT);

    expect(normalized).toHaveLength(15);
  });

  it("returns NormalizedMatch objects with required fields for each match", () => {
    const { matches } = loadInternationalMatchDataset(rawSampleFixtureFile);
    const normalized = normalizeInternationalMatches(matches, CREATED_AT);

    for (const match of normalized) {
      expect(match.match_id.length).toBeGreaterThan(0);
      expect(match.match_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(match.home_team.length).toBeGreaterThan(0);
      expect(match.away_team.length).toBeGreaterThan(0);
      expect(typeof match.neutral_site).toBe("boolean");
      expect(match.data_source.length).toBeGreaterThan(0);
    }
  });

  it("returns an empty array for an empty matches input", () => {
    const normalized = normalizeInternationalMatches([], CREATED_AT);

    expect(normalized).toHaveLength(0);
  });

  it("normalizes the expanded fixture to Elo-compatible match fields", () => {
    const { matches } = loadInternationalMatchDataset(rawExpandedFixtureFile);
    const normalized = normalizeInternationalMatches(matches, CREATED_AT);

    expect(normalized).toHaveLength(56);
    expect(normalized[0]).toMatchObject({
      match_id: "EXP-WC22-001",
      match_date: "2022-11-20",
      home_team: "Qatar",
      away_team: "Ecuador",
      neutral_site: true,
      home_score: 0,
      away_score: 2,
      result: "away_win"
    });
  });
});
