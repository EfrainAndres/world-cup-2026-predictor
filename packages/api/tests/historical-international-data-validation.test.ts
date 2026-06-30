import { describe, expect, it } from "vitest";
import { classifyProfileCoverage } from "../../model/src/index.js";
import { canonicalizeTeamName } from "../src/team-aliases.js";
import {
  loadHistoricalInternationalScoredFixtures,
  mapHistoricalCompetitionToWeightKey,
  type HistoricalInternationalScoredFixture,
} from "../src/historical-international-fixtures.js";
import { validateHistoricalInternationalData } from "../src/historical-international-data-validation.js";

function fixture(
  fixtureId: string,
  overrides: Partial<HistoricalInternationalScoredFixture> = {}
): HistoricalInternationalScoredFixture {
  return {
    fixtureId,
    kickoffAt: "2017-06-01T12:00:00.000Z",
    competitionId: "FIFA World Cup",
    season: "2017",
    homeTeam: "Brazil",
    awayTeam: "Japan",
    homeGoals: 2,
    awayGoals: 1,
    neutralVenue: true,
    competitionWeightKey: "fifa_world_cup",
    sourceId: "test_source",
    ...overrides,
  };
}

const EVALUATION_TEAMS = {
  "2018": ["Brazil", "Japan", "Germany", "Canada"],
  "2022": ["Brazil", "Japan", "Germany", "Canada"],
};

describe("historical international data validation", () => {
  it("accepts valid scored fixtures and preserves neutral venue state", () => {
    const report = validateHistoricalInternationalData({
      fixtures: [fixture("valid-1", { neutralVenue: true })],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(report.acceptedFixtures).toBe(1);
    expect(report.neutralFixtureCount).toBe(1);
    expect(report.fixturesByYear["2017"]).toBe(1);
    expect(report.fixturesByCompetition["FIFA World Cup"]).toBe(1);
  });

  it("excludes invalid kickoff and invalid scores without emitting NaN", () => {
    const report = validateHistoricalInternationalData({
      fixtures: [
        fixture("bad-date", { kickoffAt: "not-a-date" }),
        fixture("negative-score", { homeGoals: -1 }),
        fixture("missing-score", { awayGoals: undefined as unknown as number }),
      ],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(report.acceptedFixtures).toBe(0);
    expect(report.issuesByReason.invalid_kickoff).toBe(1);
    expect(report.issuesByReason.invalid_score).toBe(2);
    expect(JSON.stringify(report)).not.toMatch(/NaN|Infinity/);
  });

  it("excludes exact duplicates and reports conflicting duplicate scores", () => {
    const report = validateHistoricalInternationalData({
      fixtures: [
        fixture("preferred"),
        fixture("z-duplicate", { fixtureId: "z-duplicate" }),
        fixture("z-conflict", { fixtureId: "z-conflict", awayGoals: 3 }),
      ],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(report.acceptedFixtures).toBe(1);
    expect(report.duplicateFixtureCount).toBe(1);
    expect(report.conflictingDuplicateCount).toBe(1);
  });

  it("reports unresolved empty teams and unknown competition-weight fallback", () => {
    const report = validateHistoricalInternationalData({
      fixtures: [
        fixture("unresolved-home", { homeTeam: "" }),
        fixture("unknown-weight", {
          competitionId: "Unknown Cup",
          competitionWeightKey: "unknown",
        }),
      ],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(report.issuesByReason.unresolved_home_team).toBe(1);
    expect(report.issuesByReason.unknown_competition_weight).toBe(1);
    expect(report.competitionWeightFallbackCount).toBe(1);
  });

  it("excludes WC2026 and future fixtures", () => {
    const report = validateHistoricalInternationalData({
      fixtures: [fixture("wc2026", { kickoffAt: "2026-06-01T12:00:00.000Z" })],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(report.acceptedFixtures).toBe(0);
    expect(report.issuesByReason.wc2026_fixture_excluded).toBe(1);
  });

  it("uses strict-before cutoff semantics and reports zero leakage", () => {
    const report = validateHistoricalInternationalData({
      fixtures: [
        fixture("pre-cutoff", { homeTeam: "Brazil", awayTeam: "Japan", kickoffAt: "2017-12-31T12:00:00.000Z" }),
        fixture("at-cutoff", { homeTeam: "Brazil", awayTeam: "Japan", kickoffAt: "2018-01-01T00:00:00.000Z" }),
        fixture("post-cutoff", { homeTeam: "Brazil", awayTeam: "Japan", kickoffAt: "2018-06-01T12:00:00.000Z" }),
      ],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
      evaluationFixtureIdsByYear: { "2018": ["eval-2018"] },
    });

    expect(report.evaluationCoverage.wc2018?.priorMatchCounts.Brazil).toBe(1);
    expect(report.noLookAheadViolationCount).toBe(0);
    expect(report.leakageDiagnostics.every((diagnostic) => diagnostic.violation === false)).toBe(true);
  });

  it("produces deterministic reports for identical input", () => {
    const fixtures = [
      fixture("b", { kickoffAt: "2017-06-02T12:00:00.000Z" }),
      fixture("a", { kickoffAt: "2017-06-01T12:00:00.000Z" }),
    ];

    const first = validateHistoricalInternationalData({
      fixtures,
      mode: "expanded",
      generatedAt: "2026-06-01T00:00:00.000Z",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });
    const second = validateHistoricalInternationalData({
      fixtures: [...fixtures].reverse(),
      mode: "expanded",
      generatedAt: "2026-06-01T00:00:00.000Z",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(first.accepted.map((item) => item.fixtureId)).toEqual(second.accepted.map((item) => item.fixtureId));
    expect(first.decision).toEqual(second.decision);
  });

  it("classifies ready, partial, and structurally blocked data decisions", () => {
    const readyFixtures: HistoricalInternationalScoredFixture[] = [];
    for (const team of EVALUATION_TEAMS["2018"]) {
      for (let i = 0; i < 12; i++) {
        readyFixtures.push(
          fixture(`2017-${team}-${i}`, {
            kickoffAt: `2017-${String((i % 12) + 1).padStart(2, "0")}-01T12:00:00.000Z`,
            homeTeam: team,
            awayTeam: "Opponent",
          })
        );
      }
    }
    for (const team of EVALUATION_TEAMS["2022"]) {
      for (let i = 0; i < 14; i++) {
        readyFixtures.push(
          fixture(`2021-${team}-${i}`, {
            kickoffAt: `2021-${String((i % 12) + 1).padStart(2, "0")}-01T12:00:00.000Z`,
            homeTeam: team,
            awayTeam: "Opponent",
          })
        );
      }
    }

    const ready = validateHistoricalInternationalData({
      fixtures: readyFixtures,
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });
    const partial = validateHistoricalInternationalData({
      fixtures: [fixture("too-small")],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });
    const blocked = validateHistoricalInternationalData({
      fixtures: [fixture("bad", { homeGoals: -1 })],
      mode: "expanded",
      evaluationTeamsByYear: EVALUATION_TEAMS,
    });

    expect(ready.decision.decision).toBe("historical_data_ready");
    expect(partial.decision.decision).toBe("historical_data_partial");
    expect(blocked.decision.decision).toBe("historical_data_blocked");
  });
});

describe("historical team canonicalization and source integration", () => {
  it("resolves historical aliases used by international data sources", () => {
    const aliases = new Map([
      ["Korea Republic", "South Korea"],
      ["Republic of Korea", "South Korea"],
      ["IR Iran", "Iran"],
      ["Côte d'Ivoire", "Ivory Coast"],
      ["Cote d'Ivoire", "Ivory Coast"],
      ["USA", "United States"],
      ["United States of America", "United States"],
      ["Congo DR", "DR Congo"],
      ["Korea DPR", "North Korea"],
      ["Türkiye", "Turkey"],
      ["Czech Republic", "Czechia"],
      ["Curaçao", "Curacao"],
      ["Cape Verde Islands", "Cape Verde"],
    ]);

    for (const [alias, expected] of aliases) {
      expect(canonicalizeTeamName(alias)).toBe(expected);
    }
  });

  it("maps known historical competitions to existing weight keys", () => {
    expect(mapHistoricalCompetitionToWeightKey("FIFA World Cup")).toBe("fifa_world_cup");
    expect(mapHistoricalCompetitionToWeightKey("World Cup Qualification")).toBe("world_cup_qualifier");
    expect(mapHistoricalCompetitionToWeightKey("UEFA Nations League")).toBe("nations_league");
    expect(mapHistoricalCompetitionToWeightKey("International Friendly")).toBe("international_friendly");
    expect(mapHistoricalCompetitionToWeightKey("International match", "EXP-WC22-001")).toBe("fifa_world_cup");
    expect(mapHistoricalCompetitionToWeightKey("International match", "EXP-WCQ26-001")).toBe("world_cup_qualifier");
    expect(mapHistoricalCompetitionToWeightKey("International match", "EXP-COPA24-001")).toBe("continental_championship");
    expect(mapHistoricalCompetitionToWeightKey("International match", "EXP-FRI-001")).toBe("international_friendly");
  });

  it("loads expanded scored World Cup history before WC2018", () => {
    const legacy = loadHistoricalInternationalScoredFixtures({ mode: "legacy_phase_12_21a" });
    const expanded = loadHistoricalInternationalScoredFixtures({ mode: "expanded" });

    expect(legacy.some((item) => item.season === "2010")).toBe(false);
    expect(expanded.some((item) => item.season === "2010")).toBe(true);
    expect(expanded.some((item) => item.season === "2014")).toBe(true);
    expect(expanded.length).toBeGreaterThan(legacy.length);
  });

  it("keeps profile coverage classification constants unchanged", () => {
    expect(classifyProfileCoverage(0)).toBe("fallback");
    expect(classifyProfileCoverage(3)).toBe("sparse");
    expect(classifyProfileCoverage(4)).toBe("partial");
    expect(classifyProfileCoverage(10)).toBe("full");
  });
});
