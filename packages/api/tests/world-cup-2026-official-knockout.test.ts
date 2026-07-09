import { describe, expect, it } from "vitest";
import {
  WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY,
  WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES,
  buildOfficialWorldCup2026KnockoutProjection,
  validateOfficialKnockoutTopology,
  validateOfficialRoundOf32Fixtures
} from "../src/world-cup-2026-official-knockout.js";
import type {
  OfficialRoundOf32FixtureFoundation,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  PredictMatchFromLiveEloSuccessResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026SyncResult
} from "../src/index.js";
import { buildApiMetadata } from "../src/schemas.js";

function syncResult(records: readonly WorldCup2026ExternalFixtureRecord[] = []): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "local_static",
    activeProvider: "test_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-28T12:00:00.000Z",
    fixtures: [],
    liveMatches: [],
    completedResults: records,
    standings: [],
    normalizationIssues: [],
    warnings: []
  };
}

function record(input: {
  id: string;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  status?: WorldCup2026ExternalFixtureRecord["status"];
  homeScore?: number;
  awayScore?: number;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  winner?: string;
  decisionMethod?: WorldCup2026ExternalFixtureRecord["decisionMethod"];
  updatedAt?: string;
}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: input.id,
    competition: "FIFA World Cup",
    season: "2026",
    stage: "KNOCKOUT_STAGE",
    matchday: input.matchday,
    kickoffAt: "2026-06-28T16:00:00.000Z",
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    status: input.status ?? "finished",
    ...(input.homeScore === undefined ? {} : { homeScore: input.homeScore }),
    ...(input.awayScore === undefined ? {} : { awayScore: input.awayScore }),
    ...(input.penaltyHomeScore === undefined ? {} : { penaltyHomeScore: input.penaltyHomeScore }),
    ...(input.penaltyAwayScore === undefined ? {} : { penaltyAwayScore: input.penaltyAwayScore }),
    ...(input.winner === undefined ? {} : { winner: input.winner }),
    ...(input.decisionMethod === undefined ? {} : { decisionMethod: input.decisionMethod }),
    updatedAt: input.updatedAt ?? "2026-06-28T18:00:00.000Z"
  };
}

function fakePrediction(input: {
  homeGoals?: number;
  awayGoals?: number;
  homeWin?: number;
  draw?: number;
  awayWin?: number;
  homeElo?: number;
  awayElo?: number;
} = {}): PredictMatchFromLiveEloSuccessResponse {
  return {
    status: "success",
    request: {
      homeTeam: "Home",
      awayTeam: "Away",
      expectedHomeGoals: 1.4,
      expectedAwayGoals: 1.1,
      maxGoals: 6,
      normalizeMatrix: true
    },
    expectedGoals: {
      home: 1.4,
      away: 1.1,
      eloDifference: 30,
      baseExpectedGoals: 1.2,
      goalsAdjustment: 0.2,
      preset: "balanced",
      presetDescription: "Balanced",
      formulaVersion: "v2",
      adjustmentPer100: 0.1,
      maxAdjustment: 0.5,
      v1RollbackAvailable: true
    },
    liveElo: {
      homeTeam: "Home",
      awayTeam: "Away",
      homeEloRating: input.homeElo ?? 1600,
      awayEloRating: input.awayElo ?? 1500,
      homeRank: 1,
      awayRank: 2,
      homeMatchesPlayed: 10,
      awayMatchesPlayed: 10,
      homeGroup: "A",
      awayGroup: "B",
      homeRatingSource: "live_elo_pipeline",
      awayRatingSource: "live_elo_pipeline",
      fallbackSeedRating: 1500,
      matchesProcessed: 100,
      latestMatchDate: "2026-06-01",
      dataCoverage: "test",
      homeInput: "Home",
      awayInput: "Away",
      homeMatchedBy: "canonical",
      awayMatchedBy: "canonical"
    },
    outcomeProbabilities: {
      homeWinProbability: input.homeWin ?? 0.52,
      drawProbability: input.draw ?? 0.24,
      awayWinProbability: input.awayWin ?? 0.24,
      totalProbability: 1
    },
    mostLikelyScorelines: [
      {
        homeGoals: input.homeGoals ?? 1,
        awayGoals: input.awayGoals ?? 0,
        probability: 0.12
      }
    ],
    predictionConfidence: {
      level: "medium",
      coverageType: "full",
      reasons: ["test"],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: false,
        homeMatchesPlayed: 10,
        awayMatchesPlayed: 10,
        historicalMatchesAvailable: 100
      },
      manualXgRecommended: false
    },
    warnings: [],
    metadata: buildApiMetadata(["test"])
  };
}

function makePredictor(response: PredictMatchFromLiveEloSuccessResponse) {
  const calls: PredictMatchFromLiveEloRequest[] = [];
  const predict = (request: PredictMatchFromLiveEloRequest): PredictMatchFromLiveEloResponse => {
    calls.push(request);
    return response;
  };
  return { predict, calls };
}

const EXPECTED_OFFICIAL_ROUND_OF_32_FIXTURES = [
  [73, "South Africa", "Canada"],
  [74, "Brazil", "Japan"],
  [75, "Germany", "Paraguay"],
  [76, "Netherlands", "Morocco"],
  [77, "Ivory Coast", "Norway"],
  [78, "France", "Sweden"],
  [79, "Mexico", "Ecuador"],
  [80, "England", "DR Congo"],
  [81, "Belgium", "Senegal"],
  [82, "United States", "Bosnia-Herzegovina"],
  [83, "Spain", "Austria"],
  [84, "Portugal", "Croatia"],
  [85, "Switzerland", "Algeria"],
  [86, "Australia", "Egypt"],
  [87, "Argentina", "Cape Verde"],
  [88, "Colombia", "Ghana"]
] as const;

const officialRoundOf32Fixtures: readonly OfficialRoundOf32FixtureFoundation[] = WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES;

describe("official World Cup 2026 knockout bracket", () => {
  it("encodes matches 73-104 with the fixed topology", () => {
    expect(validateOfficialKnockoutTopology()).toEqual([]);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY).toHaveLength(32);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.filter((m) => m.stage === "round_of_32")).toHaveLength(16);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.filter((m) => m.stage === "round_of_16")).toHaveLength(8);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.filter((m) => m.stage === "quarterfinal")).toHaveLength(4);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.filter((m) => m.stage === "semifinal")).toHaveLength(2);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.filter((m) => m.stage === "third_place")).toHaveLength(1);
    expect(WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.filter((m) => m.stage === "final")).toHaveLength(1);

    const match89 = WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.find((m) => m.matchNumber === 89);
    const match104 = WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.find((m) => m.matchNumber === 104);
    const match103 = WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY.find((m) => m.matchNumber === 103);

    expect(match89?.homeSource).toEqual({ kind: "winner_of", matchNumber: 73 });
    expect(match89?.awaySource).toEqual({ kind: "winner_of", matchNumber: 75 });
    expect(match104?.homeSource).toEqual({ kind: "winner_of", matchNumber: 101 });
    expect(match104?.awaySource).toEqual({ kind: "winner_of", matchNumber: 102 });
    expect(match103?.homeSource).toEqual({ kind: "loser_of", matchNumber: 101 });
    expect(match103?.awaySource).toEqual({ kind: "loser_of", matchNumber: 102 });
  });

  it("contains 16 official Round-of-32 fixtures with 32 unique teams", () => {
    expect(validateOfficialRoundOf32Fixtures()).toEqual([]);
    expect(officialRoundOf32Fixtures).toHaveLength(16);

    const teams = officialRoundOf32Fixtures.flatMap((fixture) => [
      fixture.homeTeam,
      fixture.awayTeam
    ]);
    expect(new Set(teams).size).toBe(32);
    expect(officialRoundOf32Fixtures.map((fixture) => fixture.officialMatchNumber)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 73)
    );
    for (const [matchNumber, homeTeam, awayTeam] of EXPECTED_OFFICIAL_ROUND_OF_32_FIXTURES) {
      const fixture = officialRoundOf32Fixtures.find((entry) => entry.officialMatchNumber === matchNumber);
      expect(fixture).toMatchObject({
        homeTeam,
        awayTeam,
        provenance: {
          participantSource: "canonical_official_fixture",
          asOf: expect.any(String),
          sourceName: expect.any(String)
        }
      });
      expect(fixture?.kickoffAt).toBeUndefined();
      expect(fixture?.venue).toBeUndefined();
      expect(fixture?.providerFixtureId).toBeUndefined();
    }
  });

  it("does not include legacy projected teams or matchups as official fixtures", () => {
    const teams = new Set(
      officialRoundOf32Fixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam])
    );
    for (const legacyTeam of ["Iran", "Curacao", "Iraq", "Saudi Arabia", "Qatar", "Scotland"]) {
      expect(teams.has(legacyTeam)).toBe(false);
    }

    expect(officialRoundOf32Fixtures).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ homeTeam: "Mexico", awayTeam: "Portugal" }),
        expect.objectContaining({ homeTeam: "Bosnia-Herzegovina", awayTeam: "Norway" }),
        expect.objectContaining({ homeTeam: "South Korea", awayTeam: "Iraq" })
      ])
    );
  });

  it("uses official completed results before projections and does not call the predictor for that match", () => {
    const predictor = makePredictor(fakePrediction());
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 0
        })
      ]),
      predictMatch: predictor.predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.sourceState).toBe("official_result");
    expect(match73?.winner?.team).toBe("South Africa");
    expect(match73?.officialScore).toEqual({ homeGoals: 2, awayGoals: 0 });
    expect(match73?.projectedScore).toBeUndefined();
    expect(result.metadata.predictorCallCount).toBe(31);
    expect(predictor.calls.some((call) => call.homeTeam === "South Africa" && call.awayTeam === "Canada")).toBe(false);
  });

  it("preserves provider orientation before advancing an official winner", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "Canada",
          awayTeam: "South Africa",
          homeScore: 1,
          awayScore: 3
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.home.team).toBe("Canada");
    expect(match73?.away.team).toBe("South Africa");
    expect(match73?.officialScore).toEqual({ homeGoals: 1, awayGoals: 3 });
    expect(match73?.winner?.team).toBe("South Africa");
    expect(match73?.warnings.join(" ")).toContain("provider_fixture_participants_override_internal_topology");
  });

  it("uses provider-backed official fixture participants when a match-number record conflicts with internal topology", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "legacy-provider-73",
          matchday: 73,
          homeTeam: "Mexico",
          awayTeam: "Portugal",
          homeScore: 2,
          awayScore: 0
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.home.team).toBe("Mexico");
    expect(match73?.away.team).toBe("Portugal");
    expect(match73?.sourceState).toBe("official_result");
    expect(match73?.officialScore).toEqual({ homeGoals: 2, awayGoals: 0 });
    expect(match73?.winner?.team).toBe("Mexico");
    expect(result.matchingIssues.join(" ")).toContain("provider_fixture_participants_override_internal_topology");
  });

  it("projects unresolved fixtures through the production predictor contract", () => {
    const predictor = makePredictor(fakePrediction({ homeGoals: 2, awayGoals: 1 }));
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: predictor.predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.sourceState).toBe("projected_result");
    expect(match73?.home).toMatchObject({
      team: "South Africa",
      state: "official_participant",
      source: { kind: "official_team", team: "South Africa" }
    });
    expect(match73?.away).toMatchObject({
      team: "Canada",
      state: "official_participant",
      source: { kind: "official_team", team: "Canada" }
    });
    expect(match73?.provenance).toMatchObject({
      participantSource: "canonical_official_fixture",
      asOf: expect.any(String),
      sourceName: expect.any(String)
    });
    expect(match73?.projectedScore).toEqual({ homeGoals: 2, awayGoals: 1 });
    expect(match73?.advancementMethod).toBe("projected_regulation");
    expect(predictor.calls[0]).toMatchObject({
      homeTeam: "South Africa",
      awayTeam: "Canada",
      preset: "balanced",
      tournamentResultsAdjustment: { enabled: false },
      tournamentFormAdjustment: { enabled: false }
    });
  });

  it("uses conditional non-draw probability when the modal scoreline is tied", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction({ homeGoals: 1, awayGoals: 1, homeWin: 0.35, draw: 0.4, awayWin: 0.25 })).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.advancementMethod).toBe("projected_extra_time");
    expect(match73?.winner?.team).toBe("South Africa");
  });

  it("uses Elo and then stable identity when projected tie-breakers remain tied", () => {
    const eloResult = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction({ homeGoals: 1, awayGoals: 1, homeWin: 0.3, draw: 0.4, awayWin: 0.3, homeElo: 1400, awayElo: 1500 })).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });
    const identityResult = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction({ homeGoals: 1, awayGoals: 1, homeWin: 0.3, draw: 0.4, awayWin: 0.3, homeElo: 1500, awayElo: 1500 })).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    expect(eloResult.matches.find((match) => match.officialMatchNumber === 73)?.winner?.team).toBe("Canada");
    expect(identityResult.matches.find((match) => match.officialMatchNumber === 73)?.winner?.team).toBe("Canada");
  });

  it("feeds official semifinal losers into the third-place match", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-101", matchday: 101, homeTeam: "South Africa", awayTeam: "Spain", homeScore: 0, awayScore: 1 }),
        record({ id: "provider-102", matchday: 102, homeTeam: "Netherlands", awayTeam: "Switzerland", homeScore: 2, awayScore: 0 })
      ]),
      predictMatch: makePredictor(fakePrediction({ homeGoals: 1, awayGoals: 0 })).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const thirdPlace = result.matches.find((match) => match.officialMatchNumber === 103);
    expect(thirdPlace?.home.source).toEqual({ kind: "loser_of", matchNumber: 101 });
    expect(thirdPlace?.away.source).toEqual({ kind: "loser_of", matchNumber: 102 });
  });

  it("produces a deterministic complete podium without duplicate teams", () => {
    const first = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });
    const second = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    expect(first).toEqual(second);
    expect(first.matches).toHaveLength(32);
    const podiumTeams = Object.values(first.podium).map((entry) => entry.team);
    expect(podiumTeams.every((team) => team !== undefined)).toBe(true);
    expect(new Set(podiumTeams).size).toBe(4);
    expect(Object.values(first.podium).every((entry) => entry.resolution === "projected")).toBe(true);
    expect(first.validationWarnings).toEqual([]);

    const roundOf16 = first.matches.find((match) => match.officialMatchNumber === 89);
    expect(roundOf16?.home.state).toBe("projected_winner");
    expect(roundOf16?.away.state).toBe("projected_winner");
  });
});

describe("official extra-time and penalty winner resolution", () => {
  it("advances the official penalty winner despite a tied aggregate score", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 1,
          awayScore: 1,
          penaltyHomeScore: 4,
          penaltyAwayScore: 2,
          decisionMethod: "penalties"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.sourceState).toBe("official_result");
    expect(match73?.winner?.team).toBe("South Africa");
    expect(match73?.winner?.state).toBe("official_winner");
    expect(match73?.advancementMethod).toBe("official_penalties");
    expect(match73?.officialScore).toEqual({ homeGoals: 1, awayGoals: 1 });
    expect(match73?.officialPenaltyScore).toEqual({ homeGoals: 4, awayGoals: 2 });

    const match89 = result.matches.find((match) => match.officialMatchNumber === 89);
    expect(match89?.home.team).toBe("South Africa");
    expect(match89?.home.state).toBe("official_winner");
  });

  it("advances a tied official result using provider winner metadata alone", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 2,
          winner: "Canada"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.winner?.team).toBe("Canada");
    expect(match73?.advancementMethod).toBe("official_penalties");
    expect(match73?.sourceState).toBe("official_result");
  });

  it("labels a tied official result decided in extra time when the provider says so", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 1,
          awayScore: 1,
          winner: "South Africa",
          decisionMethod: "extra_time"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.winner?.team).toBe("South Africa");
    expect(match73?.advancementMethod).toBe("official_extra_time");
  });

  it("labels a decisive extra-time-inclusive score as an official extra-time win", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 1,
          decisionMethod: "extra_time"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.winner?.team).toBe("South Africa");
    expect(match73?.advancementMethod).toBe("official_extra_time");
  });

  it("keeps penalty score orientation aligned to provider-backed participants", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "Canada",
          awayTeam: "South Africa",
          homeScore: 1,
          awayScore: 1,
          penaltyHomeScore: 3,
          penaltyAwayScore: 5,
          winner: "South Africa",
          decisionMethod: "penalties"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.officialScore).toEqual({ homeGoals: 1, awayGoals: 1 });
    expect(match73?.officialPenaltyScore).toEqual({ homeGoals: 3, awayGoals: 5 });
    expect(match73?.winner?.team).toBe("South Africa");
    expect(match73?.advancementMethod).toBe("official_penalties");
    expect(match73?.warnings.join(" ")).toContain("provider_fixture_participants_override_internal_topology");
  });

  it("canonicalizes the provider winner name before comparing it to participants", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-77",
          matchday: 77,
          homeTeam: "Côte d'Ivoire",
          awayTeam: "Norway",
          homeScore: 0,
          awayScore: 0,
          penaltyHomeScore: 4,
          penaltyAwayScore: 3,
          winner: "Côte d'Ivoire",
          decisionMethod: "penalties"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match77 = result.matches.find((match) => match.officialMatchNumber === 77);
    expect(match77?.winner?.team).toBe("Ivory Coast");
    expect(match77?.advancementMethod).toBe("official_penalties");
  });

  it("rejects an official result whose declared winner conflicts with a decisive score", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 0,
          winner: "Canada"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.winner).toBeUndefined();
    expect(match73?.sourceState).toBe("unresolved");
    expect(match73?.warnings.join(" ")).toContain("conflicts with the provider-declared winner");
  });

  it("keeps a tied official result without winner metadata unresolved", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 1,
          awayScore: 1
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.winner).toBeUndefined();
    expect(match73?.sourceState).toBe("unresolved");
    expect(match73?.warnings.join(" ")).toContain("did not include extra-time or penalty winner metadata");
  });
});

describe("elimination integrity", () => {
  it("replaces a projected winner with the official winner and keeps the official loser out of every later round", () => {
    const predictor = makePredictor(fakePrediction({ homeGoals: 0, awayGoals: 2 }));
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 3,
          awayScore: 1
        })
      ]),
      predictMatch: predictor.predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match89 = result.matches.find((match) => match.officialMatchNumber === 89);
    expect(match89?.home.team).toBe("South Africa");
    expect(match89?.home.state).toBe("official_winner");

    for (const match of result.matches) {
      if (match.officialMatchNumber === 73) continue;
      expect(match.home.team).not.toBe("Canada");
      expect(match.away.team).not.toBe("Canada");
    }
    expect(result.validationWarnings).toEqual([]);
  });

  it("never lets any projected loser reappear later except semifinal losers in the third-place match", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    for (const match of result.matches) {
      const loser = match.loser?.team;
      if (loser === undefined) continue;
      for (const later of result.matches) {
        if (later.officialMatchNumber <= match.officialMatchNumber) continue;
        if (later.officialMatchNumber === 103 && match.stage === "semifinal") continue;
        expect([later.home.team, later.away.team]).not.toContain(loser);
      }
    }
    expect(result.validationWarnings).toEqual([]);
  });
});

describe("duplicate provider record precedence", () => {
  it("prefers a finished record over a stale live record for the same official match", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73-live",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          status: "live",
          homeScore: 1,
          awayScore: 1,
          updatedAt: "2026-06-28T17:00:00.000Z"
        }),
        record({
          id: "provider-73-final",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 0,
          updatedAt: "2026-06-28T18:00:00.000Z"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.sourceState).toBe("official_result");
    expect(match73?.officialScore).toEqual({ homeGoals: 2, awayGoals: 0 });
    expect(match73?.winner?.team).toBe("South Africa");
    expect(result.matchingIssues.some((issue) => issue.includes("official match 73"))).toBe(false);
  });

  it("rejects conflicting equal-authority duplicate records as ambiguous with a first-class warning", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73-a",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 0
        }),
        record({
          id: "provider-73-b",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 0,
          awayScore: 2
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.officialScore).toBeUndefined();
    expect(match73?.sourceState).toBe("projected_result");
    expect(
      result.matchingIssues.some((issue) =>
        issue.includes("Conflicting equal-authority provider records for official match 73")
      )
    ).toBe(true);
  });

  it("deterministically selects the newest of identical equal-authority duplicates", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({
          id: "provider-73-early",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 0,
          updatedAt: "2026-06-28T17:00:00.000Z"
        }),
        record({
          id: "provider-73-late",
          matchday: 73,
          homeTeam: "South Africa",
          awayTeam: "Canada",
          homeScore: 2,
          awayScore: 0,
          updatedAt: "2026-06-28T18:00:00.000Z"
        })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match73 = result.matches.find((match) => match.officialMatchNumber === 73);
    expect(match73?.sourceState).toBe("official_result");
    expect(match73?.providerFixtureId).toBe("provider-73-late");
  });
});

describe("provider-backed knockout participant reconciliation", () => {
  it("provider-backed R16 participants override internal derived participants and drive prediction input", () => {
    const predictor = makePredictor(fakePrediction({ homeGoals: 2, awayGoals: 1 }));
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-73", matchday: 73, homeTeam: "South Africa", awayTeam: "Canada", homeScore: 0, awayScore: 1 }),
        record({ id: "provider-75", matchday: 75, homeTeam: "Germany", awayTeam: "Paraguay", homeScore: 0, awayScore: 1 }),
        record({
          id: "provider-89-official-fixture",
          matchday: 89,
          homeTeam: "Canada",
          awayTeam: "Morocco",
          status: "scheduled"
        })
      ]),
      predictMatch: predictor.predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match89 = result.matches.find((match) => match.officialMatchNumber === 89);
    expect(match89?.home.team).toBe("Canada");
    expect(match89?.away.team).toBe("Morocco");
    expect(match89?.sourceClassification).toBe("provider_official_fixture");
    expect(match89?.sourceState).toBe("projected_result");
    expect(match89?.projectedScore).toEqual({ homeGoals: 2, awayGoals: 1 });
    expect(predictor.calls.some((call) => call.homeTeam === "Canada" && call.awayTeam === "Morocco")).toBe(true);
    expect(predictor.calls.some((call) => call.homeTeam === "Canada" && call.awayTeam === "Paraguay")).toBe(false);
    expect(match89?.warnings.join(" ")).toContain("provider_fixture_participants_override_internal_topology");
  });

  it("provider-backed QF participants override internal derived participants", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-89", matchday: 89, homeTeam: "Canada", awayTeam: "Paraguay", homeScore: 1, awayScore: 0 }),
        record({ id: "provider-90", matchday: 90, homeTeam: "Norway", awayTeam: "Brazil", homeScore: 1, awayScore: 0 }),
        record({
          id: "provider-97-qf",
          matchday: 97,
          homeTeam: "Canada",
          awayTeam: "Morocco",
          status: "scheduled"
        })
      ]),
      predictMatch: makePredictor(fakePrediction({ homeGoals: 1, awayGoals: 0 })).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match97 = result.matches.find((match) => match.officialMatchNumber === 97);
    expect(match97?.home.team).toBe("Canada");
    expect(match97?.away.team).toBe("Morocco");
    expect(match97?.sourceClassification).toBe("provider_official_fixture");
    expect(match97?.warnings.join(" ")).toContain("provider_fixture_participants_override_internal_topology");
  });

  it("runs prediction against provider participants when a provider-backed fixture is unresolved", () => {
    const predictor = makePredictor(fakePrediction({ homeGoals: 0, awayGoals: 2 }));
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-89", matchday: 89, homeTeam: "Brazil", awayTeam: "Norway", status: "scheduled" })
      ]),
      predictMatch: predictor.predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match89 = result.matches.find((match) => match.officialMatchNumber === 89);
    expect(match89?.home.team).toBe("Brazil");
    expect(match89?.away.team).toBe("Norway");
    expect(match89?.sourceState).toBe("projected_result");
    expect(match89?.winner?.team).toBe("Norway");
    expect(predictor.calls.some((call) => call.homeTeam === "Brazil" && call.awayTeam === "Norway")).toBe(true);
  });

  it("advances the official winner from a completed provider-backed later-round fixture", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-89", matchday: 89, homeTeam: "Canada", awayTeam: "Morocco", homeScore: 0, awayScore: 2 })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match89 = result.matches.find((match) => match.officialMatchNumber === 89);
    const match97 = result.matches.find((match) => match.officialMatchNumber === 97);
    expect(match89?.sourceState).toBe("official_result");
    expect(match89?.winner?.team).toBe("Morocco");
    expect(match89?.loser?.team).toBe("Canada");
    expect(match97?.home.team).toBe("Morocco");
  });

  it("uses internal topology when provider participants are missing or unresolved", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-73", matchday: 73, homeTeam: "South Africa", awayTeam: "Canada", homeScore: 0, awayScore: 1 }),
        record({ id: "provider-75", matchday: 75, homeTeam: "Germany", awayTeam: "Paraguay", homeScore: 0, awayScore: 1 }),
        record({ id: "provider-89-tbd", matchday: 89, homeTeam: "TBD", awayTeam: "Morocco", status: "scheduled" })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const match89 = result.matches.find((match) => match.officialMatchNumber === 89);
    expect(match89?.home.team).toBe("Canada");
    expect(match89?.away.team).toBe("Paraguay");
    expect(match89?.sourceClassification).toBe("projected");
    expect(match89?.warnings.join(" ")).toContain("provider_fixture_participants_unresolved");
  });

  it("does not allow a provider-eliminated team to reappear downstream", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-89", matchday: 89, homeTeam: "Canada", awayTeam: "Morocco", homeScore: 1, awayScore: 2 })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    for (const match of result.matches) {
      if (match.officialMatchNumber <= 89) continue;
      expect([match.home.team, match.away.team]).not.toContain("Canada");
    }
    expect(result.validationWarnings).toEqual([]);
  });

  it("does not regress to Canada vs Norway when provider path is Canada vs Morocco and Brazil vs Norway", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        record({ id: "provider-89", matchday: 89, homeTeam: "Canada", awayTeam: "Morocco", status: "scheduled" }),
        record({ id: "provider-90", matchday: 90, homeTeam: "Brazil", awayTeam: "Norway", status: "scheduled" }),
        record({ id: "provider-97", matchday: 97, homeTeam: "Canada", awayTeam: "Morocco", status: "scheduled" }),
        record({ id: "provider-98", matchday: 98, homeTeam: "Norway", awayTeam: "Brazil", status: "scheduled" })
      ]),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const qf97 = result.matches.find((match) => match.officialMatchNumber === 97);
    const qf98 = result.matches.find((match) => match.officialMatchNumber === 98);
    expect(qf97?.home.team).toBe("Canada");
    expect(qf97?.away.team).toBe("Morocco");
    expect(qf98?.home.team).toBe("Norway");
    expect(qf98?.away.team).toBe("Brazil");
    expect(
      result.matches.some(
        (match) => match.stage === "quarterfinal" && match.home.team === "Canada" && match.away.team === "Norway"
      )
    ).toBe(false);
  });

  it("is deterministic for the same provider-backed participant input", () => {
    const records = [
      record({ id: "provider-89", matchday: 89, homeTeam: "Canada", awayTeam: "Morocco", status: "scheduled" }),
      record({ id: "provider-90", matchday: 90, homeTeam: "Brazil", awayTeam: "Norway", status: "scheduled" })
    ];
    const first = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(records),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });
    const second = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(records),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    expect(first).toEqual(second);
  });
});

describe("knockout view model sentinel safety", () => {
  it("emits no Unavailable or Unknown Team sentinel anywhere in a fully projected result", () => {
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: makePredictor(fakePrediction()).predict,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Unavailable");
    expect(serialized).not.toContain("Unknown Team");
    expect(serialized).not.toContain("???");
  });

  it("returns unresolved podium entries without sentinel team names when every prediction fails", () => {
    const failingPredictor = (): PredictMatchFromLiveEloResponse => ({
      status: "validation_error",
      issues: [{ field: "homeTeam", message: "No Elo coverage." }],
      metadata: buildApiMetadata(["test"])
    });
    const result = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult(),
      predictMatch: failingPredictor,
      generatedAt: "2026-06-28T12:00:00.000Z"
    });

    for (const entry of Object.values(result.podium)) {
      expect(entry.team).toBeUndefined();
      expect(entry.resolution).toBe("unresolved");
    }
    expect(JSON.stringify(result)).not.toContain("Unavailable");
  });
});
