import { beforeEach, describe, expect, it } from "vitest";
import {
  WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
  WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP,
  WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT,
  WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES,
  calculateWorldCup2026TournamentForm,
  getWorldCup2026TournamentFormFoundation,
  predictMatchFromLiveElo
} from "../src/index.js";
import type { WorldCup2026ExternalFixtureRecord } from "../src/index.js";

function makeRecord(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> & {
    providerFixtureId?: string;
    homeTeam: string;
    awayTeam: string;
  }
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: overrides.providerFixtureId ?? "record-1",
    competition: "FIFA World Cup",
    season: "2026",
    status: overrides.status ?? "finished",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    ...(overrides.stage === undefined ? {} : { stage: overrides.stage }),
    ...(overrides.group === undefined ? {} : { group: overrides.group }),
    ...(overrides.matchday === undefined ? {} : { matchday: overrides.matchday }),
    ...(overrides.kickoffAt === undefined ? {} : { kickoffAt: overrides.kickoffAt }),
    ...(overrides.homeScore === undefined ? {} : { homeScore: overrides.homeScore }),
    ...(overrides.awayScore === undefined ? {} : { awayScore: overrides.awayScore }),
    ...(overrides.venue === undefined ? {} : { venue: overrides.venue }),
    ...(overrides.updatedAt === undefined ? {} : { updatedAt: overrides.updatedAt })
  };
}

const BASELINE = new Map<string, number>([
  ["Mexico", 1600],
  ["South Africa", 1450],
  ["Canada", 1550],
  ["Bosnia-Herzegovina", 1480],
  ["Qatar", 1505],
  ["Switzerland", 1620],
  ["Haiti", 1500],
  ["Scotland", 1595]
]);

describe("calculateWorldCup2026TournamentForm", () => {
  beforeEach(() => {
    expect(BASELINE.get("Mexico")).toBe(1600);
  });

  it("returns empty deterministic output for empty input", () => {
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(result.status).toBe("success");
    expect(result.summaries).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.metadata.recordsAccepted).toBe(0);
    expect(result.metadata.teamsSummarized).toBe(0);
    expect(result.metadata.formulaVersion).toBe(
      WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION
    );
  });

  it("builds win, draw, and loss summaries from finished matches", () => {
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        makeRecord({
          providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T18:00:00Z"
        }),
        makeRecord({
          providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
          homeTeam: "Canada",
          awayTeam: "Bosnia and Herzegovina",
          homeScore: 1,
          awayScore: 1,
          kickoffAt: "2026-06-12T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(result.metadata.recordsAccepted).toBe(2);
    expect(result.metadata.teamsSummarized).toBe(4);
    const mexico = result.summaries.find((entry) => entry.team === "Mexico");
    const southAfrica = result.summaries.find(
      (entry) => entry.team === "South Africa"
    );
    const canada = result.summaries.find((entry) => entry.team === "Canada");

    expect(mexico).toMatchObject({
      matchesPlayed: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 3
    });
    expect(mexico?.opponentsFaced).toEqual(["South Africa"]);
    expect(southAfrica).toMatchObject({
      matchesPlayed: 1,
      wins: 0,
      draws: 0,
      losses: 1,
      points: 0
    });
    expect(canada).toMatchObject({
      matchesPlayed: 1,
      wins: 0,
      draws: 1,
      losses: 0,
      points: 1
    });
  });

  it("applies chronological cutoff and ignores future matches", () => {
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        makeRecord({
          providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T18:00:00Z"
        }),
        makeRecord({
          providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
          homeTeam: "Canada",
          awayTeam: "Bosnia-Herzegovina",
          homeScore: 1,
          awayScore: 1,
          kickoffAt: "2026-06-20T18:00:00Z"
        }),
        makeRecord({
          providerFixtureId: "wc2026-group-c-md1-02-haiti-vs-scotland",
          homeTeam: "Haiti",
          awayTeam: "Scotland",
          homeScore: 0,
          awayScore: 1,
          kickoffAt: "2026-07-10T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      cutoffAt: "2026-06-19T00:00:00Z",
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(result.metadata.recordsAccepted).toBe(1);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "cutoff_excluded",
      "future_record_excluded"
    ]);
    expect(result.metadata.futureRecordsExcluded).toBe(1);
  });

  it("skips duplicates and non-finished matches", () => {
    const record = makeRecord({
      providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      homeScore: 2,
      awayScore: 0,
      kickoffAt: "2026-06-11T18:00:00Z"
    });

    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        record,
        record,
        makeRecord({
          providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
          homeTeam: "Canada",
          awayTeam: "Bosnia-Herzegovina",
          status: "live",
          homeScore: 1,
          awayScore: 0,
          kickoffAt: "2026-06-12T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(result.metadata.recordsAccepted).toBe(1);
    expect(result.metadata.duplicateFixturesSkipped).toBe(1);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_fixture_skipped",
      "record_rejected_non_finished"
    ]);
  });

  it("rejects invalid scores and unresolved fixtures without crashing the calculation", () => {
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        makeRecord({
          providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: -1,
          awayScore: 0
        }),
        makeRecord({
          providerFixtureId: "unknown-fixture",
          homeTeam: "Unknown FC",
          awayTeam: "Ghost United",
          homeScore: 1,
          awayScore: 0
        })
      ],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(result.metadata.recordsAccepted).toBe(0);
    expect(result.metadata.recordsRejected).toBe(2);
    expect(result.issues.map((issue) => issue.code).sort()).toEqual([
      "fixture_not_found",
      "invalid_score"
    ]);
  });

  it("keeps one-match recommendations bounded and below the minimum-match threshold", () => {
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        makeRecord({
          providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    const mexico = result.summaries.find((entry) => entry.team === "Mexico");
    expect(mexico?.matchesPlayed).toBe(1);
    expect(mexico?.eloAdjustmentRecommendation).toBe(0);
    expect(
      Math.abs(mexico?.eloAdjustmentRecommendation ?? 0)
    ).toBeLessThanOrEqual(
      WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT
    );
    expect(WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES).toBe(2);
  });

  it("caps large scorelines in the form signal", () => {
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        makeRecord({
          providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 8,
          awayScore: 0,
          kickoffAt: "2026-06-11T18:00:00Z"
        }),
        makeRecord({
          providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
          homeTeam: "Canada",
          awayTeam: "Bosnia-Herzegovina",
          homeScore: 2,
          awayScore: 1,
          kickoffAt: "2026-06-12T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    const mexico = result.summaries.find((entry) => entry.team === "Mexico");
    expect(mexico?.formScore).toBeLessThanOrEqual(1);
    expect(
      Math.abs(mexico?.eloAdjustmentRecommendation ?? 0)
    ).toBeLessThanOrEqual(
      WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT
    );
    expect(WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP).toBe(2);
  });

  it("accumulates multiple matches conservatively and deterministically", () => {
    const completedResults = [
      makeRecord({
        providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
        homeTeam: "Mexico",
        awayTeam: "South Africa",
        homeScore: 2,
        awayScore: 0,
        kickoffAt: "2026-06-11T18:00:00Z"
      }),
      makeRecord({
        providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
        homeTeam: "Canada",
        awayTeam: "Bosnia-Herzegovina",
        homeScore: 1,
        awayScore: 1,
        kickoffAt: "2026-06-12T18:00:00Z"
      }),
      makeRecord({
        providerFixtureId: "wc2026-group-c-md1-02-haiti-vs-scotland",
        homeTeam: "Haiti",
        awayTeam: "Scotland",
        homeScore: 0,
        awayScore: 1,
        kickoffAt: "2026-06-13T18:00:00Z"
      }),
      makeRecord({
        providerFixtureId: "wc2026-group-b-md1-02-qatar-vs-switzerland",
        homeTeam: "Qatar",
        awayTeam: "Switzerland",
        homeScore: 1,
        awayScore: 1,
        kickoffAt: "2026-06-14T18:00:00Z"
      })
    ];

    const first = calculateWorldCup2026TournamentForm({
      completedResults,
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });
    const second = calculateWorldCup2026TournamentForm({
      completedResults,
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(first).toEqual(second);
    expect(
      first.summaries.every(
        (entry) =>
          Number.isFinite(entry.formScore) &&
          Number.isFinite(entry.eloAdjustmentRecommendation)
      )
    ).toBe(true);
  });

  it("normalizes aliases to canonical teams and does not mutate baseline ratings", () => {
    const baselineBefore = new Map(BASELINE);
    const result = calculateWorldCup2026TournamentForm({
      completedResults: [
        makeRecord({
          providerFixtureId: "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina",
          homeTeam: "Canada",
          awayTeam: "Bosnia and Herzegovina",
          homeScore: 1,
          awayScore: 1,
          kickoffAt: "2026-06-12T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(
      result.summaries.find((entry) => entry.team === "Bosnia-Herzegovina")
    ).toBeDefined();
    expect([...BASELINE.entries()]).toEqual([...baselineBefore.entries()]);
  });
});

describe("getWorldCup2026TournamentFormFoundation", () => {
  it("returns deterministic local tournament-form foundation output", () => {
    const first = getWorldCup2026TournamentFormFoundation({
      referenceAt: "2026-07-01T00:00:00Z"
    });
    const second = getWorldCup2026TournamentFormFoundation({
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(first).toEqual(second);
    expect(first.status).toBe("success");
    expect(first.dataScope).toBe("world_cup_2026_tournament_form_foundation");
    expect(first.form.metadata.formulaVersion).toBe(
      WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION
    );
    expect(first.warnings.some((warning) => warning.includes("not integrated"))).toBe(
      true
    );
  });

  it("does not change live prediction outputs", () => {
    const before = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });

    getWorldCup2026TournamentFormFoundation({
      referenceAt: "2026-07-01T00:00:00Z"
    });

    const after = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });

    expect(after).toEqual(before);
  });
});
