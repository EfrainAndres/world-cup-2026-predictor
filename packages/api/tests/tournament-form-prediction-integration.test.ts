import { describe, expect, it } from "vitest";
import {
  WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
  predictMatchFromLiveElo,
  resolveTournamentFormPredictionAdjustment
} from "../src/index.js";
import type { WorldCup2026ExternalFixtureRecord } from "../src/index.js";
import { eloToExpectedGoals } from "../../model/src/index.js";

function makeRecord(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> & {
    providerFixtureId: string;
    homeTeam: string;
    awayTeam: string;
  }
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: overrides.providerFixtureId,
    competition: "FIFA World Cup",
    season: "2026",
    status: overrides.status ?? "finished",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    ...(overrides.kickoffAt === undefined ? {} : { kickoffAt: overrides.kickoffAt }),
    ...(overrides.homeScore === undefined ? {} : { homeScore: overrides.homeScore }),
    ...(overrides.awayScore === undefined ? {} : { awayScore: overrides.awayScore }),
    ...(overrides.group === undefined ? {} : { group: overrides.group }),
    ...(overrides.matchday === undefined ? {} : { matchday: overrides.matchday }),
    ...(overrides.updatedAt === undefined ? {} : { updatedAt: overrides.updatedAt })
  };
}

const BASELINE = new Map<string, number>([
  ["Mexico", 1600],
  ["South Africa", 1450],
  ["South Korea", 1570],
  ["Czechia", 1540]
]);

const FORM_RECORDS = [
  makeRecord({
    providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    homeScore: 2,
    awayScore: 0,
    kickoffAt: "2026-06-11T18:00:00Z"
  }),
  makeRecord({
    providerFixtureId: "wc2026-group-a-md2-03-mexico-vs-south-korea",
    homeTeam: "Mexico",
    awayTeam: "South Korea",
    homeScore: 1,
    awayScore: 0,
    kickoffAt: "2026-06-15T18:00:00Z"
  }),
  makeRecord({
    providerFixtureId: "wc2026-group-a-md2-04-south-africa-vs-czechia",
    homeTeam: "South Africa",
    awayTeam: "Czechia",
    homeScore: 0,
    awayScore: 1,
    kickoffAt: "2026-06-16T18:00:00Z"
  }),
  makeRecord({
    providerFixtureId: "wc2026-group-a-md3-05-mexico-vs-czechia",
    homeTeam: "Mexico",
    awayTeam: "Czechia",
    homeScore: 3,
    awayScore: 1,
    kickoffAt: "2026-06-20T18:00:00Z"
  })
] as const;

describe("predictMatchFromLiveElo tournamentFormAdjustment", () => {
  it("preserves exact output when tournament form adjustment is absent or disabled", () => {
    const baseline = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });
    const disabled = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia",
      tournamentFormAdjustment: { enabled: false }
    });

    expect(disabled).toEqual(baseline);
  });

  it("reports tournament-form provenance when enabled but the local sample is insufficient", () => {
    const result = predictMatchFromLiveElo({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      tournamentFormAdjustment: { enabled: true }
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.tournamentFormAdjustment).toEqual({
      enabled: true,
      applied: false,
      home: {
        baselineElo: result.tournamentFormAdjustment?.home.baselineElo,
        adjustment: 0,
        effectiveElo: result.tournamentFormAdjustment?.home.baselineElo,
        matchesIncluded: 1,
        formScore: expect.any(Number)
      },
      away: {
        baselineElo: result.tournamentFormAdjustment?.away.baselineElo,
        adjustment: 0,
        effectiveElo: result.tournamentFormAdjustment?.away.baselineElo,
        matchesIncluded: 1,
        formScore: expect.any(Number)
      },
      formulaVersion: WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
      warnings: expect.arrayContaining([
        "Tournament form is an optional bounded secondary Elo adjustment and is not empirically calibrated.",
        "Mexico has only 1 eligible completed tournament match; at least 2 are required for a non-zero adjustment.",
        "South Africa has only 1 eligible completed tournament match; at least 2 are required for a non-zero adjustment."
      ])
    });
    expect(result.predictionConfidence.reasons).toContain(
      "Tournament form did not apply because at least one team lacks the minimum completed tournament sample."
    );
    expect(result.predictionConfidence.dataPoints).toMatchObject({
      tournamentFormEnabled: true,
      tournamentFormApplied: false,
      homeTournamentFormMatchesIncluded: 1,
      awayTournamentFormMatchesIncluded: 1,
      tournamentFormFormulaVersion: WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION
    });
    expect(result.outcomeProbabilities.totalProbability).toBeCloseTo(1, 10);
  });

  it("returns validation errors for malformed tournament form configuration", () => {
    const result = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia",
      tournamentFormAdjustment: {
        enabled: true,
        cutoffAt: "not-a-timestamp"
      }
    });

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;
    expect(result.issues).toEqual([
      {
        field: "tournamentFormAdjustment.cutoffAt",
        message: "tournamentFormAdjustment.cutoffAt must be a valid timestamp."
      }
    ]);
  });
});

describe("resolveTournamentFormPredictionAdjustment", () => {
  it("applies positive and negative adjustments independently when both teams have sufficient form data", () => {
    const adjustment = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: BASELINE,
      completedResults: FORM_RECORDS,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(adjustment.enabled).toBe(true);
    expect(adjustment.applied).toBe(true);
    expect(adjustment.home.adjustment).toBeGreaterThan(0);
    expect(adjustment.away.adjustment).toBeLessThan(0);
    expect(adjustment.home.effectiveElo).toBeCloseTo(
      adjustment.home.baselineElo + adjustment.home.adjustment,
      10
    );
    expect(adjustment.away.effectiveElo).toBeCloseTo(
      adjustment.away.baselineElo + adjustment.away.adjustment,
      10
    );
  });

  it("does not apply a non-zero adjustment when a team has fewer than the minimum matches", () => {
    const adjustment = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: BASELINE,
      completedResults: [FORM_RECORDS[0]],
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(adjustment.applied).toBe(false);
    expect(adjustment.home.adjustment).toBe(0);
    expect(adjustment.away.adjustment).toBe(0);
  });

  it("respects cutoff protection when calculating tournament form", () => {
    const withCutoff = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: BASELINE,
      completedResults: FORM_RECORDS,
      cutoffAt: "2026-06-19T00:00:00Z",
      referenceAt: "2026-07-01T00:00:00Z"
    });
    const withoutCutoff = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: BASELINE,
      completedResults: FORM_RECORDS,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(withCutoff.home.matchesIncluded).toBeLessThan(withoutCutoff.home.matchesIncluded);
    expect(withCutoff.warnings).toContain(
      "Tournament form excluded completed matches at or after the supplied cutoff."
    );
  });

  it("composes after tournament-results Elo ingestion without mutating baseline ratings", () => {
    const baselineBefore = new Map(BASELINE);
    const postIngestionRatings = new Map<string, number>([
      ["Mexico", 1608],
      ["South Africa", 1442],
      ["South Korea", 1570],
      ["Czechia", 1540]
    ]);

    const adjustment = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: postIngestionRatings,
      completedResults: FORM_RECORDS,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(adjustment.home.baselineElo).toBe(1608);
    expect(adjustment.away.baselineElo).toBe(1442);
    expect(adjustment.home.effectiveElo).toBeCloseTo(
      1608 + adjustment.home.adjustment,
      10
    );
    expect(adjustment.away.effectiveElo).toBeCloseTo(
      1442 + adjustment.away.adjustment,
      10
    );
    expect([...BASELINE.entries()]).toEqual([...baselineBefore.entries()]);
  });

  it("is deterministic and feeds the existing Elo-to-xG helper through effective Elo values", () => {
    const first = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: BASELINE,
      completedResults: FORM_RECORDS,
      referenceAt: "2026-07-01T00:00:00Z"
    });
    const second = resolveTournamentFormPredictionAdjustment({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      baselineRatingsForForm: BASELINE,
      effectiveRatingsBeforeTournamentForm: BASELINE,
      completedResults: FORM_RECORDS,
      referenceAt: "2026-07-01T00:00:00Z"
    });

    expect(second).toEqual(first);

    const xg = eloToExpectedGoals({
      homeEloRating: first.home.effectiveElo,
      awayEloRating: first.away.effectiveElo
    });

    expect(Number.isFinite(xg.homeExpectedGoals)).toBe(true);
    expect(Number.isFinite(xg.awayExpectedGoals)).toBe(true);
    expect(xg.eloDifference).toBeCloseTo(
      first.home.effectiveElo - first.away.effectiveElo,
      10
    );
  });
});
