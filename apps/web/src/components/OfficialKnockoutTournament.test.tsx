import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type {
  OfficialKnockoutFixtureProjection,
  OfficialKnockoutPodium,
  OfficialKnockoutProjectionResult,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  PredictMatchFromLiveEloSuccessResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026SyncResult
} from "@world-cup-2026-predictor/api";
import { buildOfficialWorldCup2026KnockoutProjection } from "@world-cup-2026-predictor/api";
import { OfficialKnockoutTournament } from "./OfficialKnockoutTournament";

// Only the fields OfficialKnockoutTournament reads are stubbed; the service
// contract itself is covered by the API knockout tests.
function fixture(overrides: Partial<OfficialKnockoutFixtureProjection> = {}): OfficialKnockoutFixtureProjection {
  return {
    fixtureId: "wc2026-match-73-south-africa-vs-canada",
    officialMatchNumber: 73,
    stage: "round_of_32",
    bracketSlot: 1,
    home: {
      team: "South Africa",
      source: { kind: "official_team", team: "South Africa" },
      state: "official_participant",
      path: []
    },
    away: {
      team: "Canada",
      source: { kind: "official_team", team: "Canada" },
      state: "official_participant",
      path: []
    },
    sourceState: "official_result",
    status: "finished",
    sourceClassification: "provider_official_result",
    upstreamSources: {
      home: { kind: "official_team", team: "South Africa" },
      away: { kind: "official_team", team: "Canada" }
    },
    downstream: [],
    warnings: [],
    ...overrides
  };
}

function projection(
  matches: readonly OfficialKnockoutFixtureProjection[],
  podium?: Partial<OfficialKnockoutPodium>
): OfficialKnockoutProjectionResult {
  const fullPodium: OfficialKnockoutPodium = {
    champion: { team: "Brazil", resolution: "projected" },
    runnerUp: { team: "France", resolution: "projected" },
    thirdPlace: { team: "Argentina", resolution: "projected" },
    fourthPlace: { team: "Spain", resolution: "projected" },
    ...podium
  };

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_official_knockout_projection",
    matches,
    rounds: {
      round_of_32: matches.filter((match) => match.stage === "round_of_32"),
      round_of_16: matches.filter((match) => match.stage === "round_of_16"),
      quarterfinal: matches.filter((match) => match.stage === "quarterfinal"),
      semifinal: matches.filter((match) => match.stage === "semifinal"),
      third_place: matches.filter((match) => match.stage === "third_place"),
      final: matches.filter((match) => match.stage === "final")
    },
    podium: fullPodium,
    warnings: [],
    validationWarnings: [],
    matchingIssues: [],
    metadata: {
      generatedAt: "2026-06-28T12:00:00.000Z",
      canonicalFixtureAsOf: "2026-06-28T00:00:00.000Z",
      modelVersion: "test-model",
      formulaVersion: "v2",
      providerFallbackUsed: false,
      predictorCallCount: 0,
      metadata: { apiVersion: "test", notes: [] }
    }
  } as unknown as OfficialKnockoutProjectionResult;
}

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

function providerRecord(input: {
  id: string;
  matchday: number;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  status?: WorldCup2026ExternalFixtureRecord["status"];
  homeScore?: number;
  awayScore?: number;
  winner?: string;
}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: input.id,
    competition: "FIFA World Cup",
    season: "2026",
    stage: input.stage,
    matchday: input.matchday,
    kickoffAt: "2026-06-28T16:00:00.000Z",
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    status: input.status ?? "scheduled",
    ...(input.homeScore === undefined ? {} : { homeScore: input.homeScore }),
    ...(input.awayScore === undefined ? {} : { awayScore: input.awayScore }),
    ...(input.winner === undefined ? {} : { winner: input.winner }),
    updatedAt: "2026-06-28T18:00:00.000Z"
  };
}

function fakePrediction(input: {
  homeGoals?: number;
  awayGoals?: number;
  homeWin?: number;
  awayWin?: number;
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
      homeEloRating: 1600,
      awayEloRating: 1500,
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
      homeWinProbability: input.homeWin ?? 0.7,
      drawProbability: 0.15,
      awayWinProbability: input.awayWin ?? 0.15,
      totalProbability: 1
    },
    mostLikelyScorelines: [
      {
        homeGoals: input.homeGoals ?? 2,
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
    metadata: {
      apiVersion: "test",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: ["test"]
    }
  };
}

function predictorFavoring(favoredTeams: readonly string[]) {
  const favoredKeys = new Set(favoredTeams.map((team) => team.toLowerCase()));
  return (request: PredictMatchFromLiveEloRequest): PredictMatchFromLiveEloResponse => {
    const awayFavored = favoredKeys.has(request.awayTeam.toLowerCase());
    const homeFavored = favoredKeys.has(request.homeTeam.toLowerCase());
    if (awayFavored && !homeFavored) {
      return fakePrediction({ homeGoals: 0, awayGoals: 2, homeWin: 0.15, awayWin: 0.7 });
    }
    return fakePrediction();
  };
}

describe("OfficialKnockoutTournament", () => {
  test("shows the official penalty winner separately from the tied main score", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([
          fixture({
            officialScore: { homeGoals: 1, awayGoals: 1 },
            officialPenaltyScore: { homeGoals: 4, awayGoals: 2 },
            winner: {
              team: "South Africa",
              source: { kind: "official_team", team: "South Africa" },
              state: "official_winner",
              path: []
            },
            advancementMethod: "official_penalties"
          })
        ])}
      />
    );

    expect(html).toContain("1-1");
    expect(html).toContain("South Africa wins 4–2 on penalties");
    expect(html).toContain("Official result");
    expect(html).toContain("Official winner");
    expect(html).not.toContain("4-2</div>");
  });

  test("shows an official extra-time winner explanation", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([
          fixture({
            officialScore: { homeGoals: 2, awayGoals: 1 },
            winner: {
              team: "South Africa",
              source: { kind: "official_team", team: "South Africa" },
              state: "official_winner",
              path: []
            },
            advancementMethod: "official_extra_time"
          })
        ])}
      />
    );

    expect(html).toContain("South Africa wins after extra time");
  });

  test("labels projected results distinctly from official results", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([
          fixture({
            sourceState: "projected_result",
            status: "scheduled",
            sourceClassification: "canonical_static_official_fixture",
            projectedScore: { homeGoals: 2, awayGoals: 1 },
            winner: {
              team: "South Africa",
              source: { kind: "official_team", team: "South Africa" },
              state: "projected_winner",
              path: []
            },
            advancementMethod: "projected_regulation"
          })
        ])}
      />
    );

    const card = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    expect(card).toContain("Projected result");
    expect(card).toContain("Projected to advance");
    expect(card).not.toContain("Official result");
    expect(card).not.toContain("Official winner");
  });

  test("labels provider-backed later-round fixtures as official fixtures with projected results", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([
          fixture({
            fixtureId: "wc2026-match-89",
            officialMatchNumber: 89,
            stage: "round_of_16",
            sourceState: "projected_result",
            status: "scheduled",
            sourceClassification: "provider_official_fixture",
            providerFixtureId: "provider-89",
            home: {
              team: "Canada",
              source: { kind: "official_team", team: "Canada" },
              state: "official_participant",
              path: []
            },
            away: {
              team: "Morocco",
              source: { kind: "official_team", team: "Morocco" },
              state: "official_participant",
              path: []
            },
            projectedScore: { homeGoals: 2, awayGoals: 1 },
            winner: {
              team: "Canada",
              source: { kind: "official_team", team: "Canada" },
              state: "projected_winner",
              path: []
            },
            advancementMethod: "projected_regulation"
          })
        ])}
      />
    );

    const card = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    expect(card).toContain("Official fixture");
    expect(card).toContain("Projected result");
    expect(card).toContain("Canada");
    expect(card).toContain("Morocco");
    expect(card).not.toContain("Projected participant");
  });

  test("labels provider-backed live fixtures as official fixtures without official results", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([
          fixture({
            fixtureId: "wc2026-match-97",
            officialMatchNumber: 97,
            stage: "quarterfinal",
            sourceState: "projected_result",
            status: "live",
            sourceClassification: "provider_official_fixture",
            providerFixtureId: "provider-qf-live",
            home: {
              team: "France",
              source: { kind: "official_team", team: "France" },
              state: "official_participant",
              path: []
            },
            away: {
              team: "Morocco",
              source: { kind: "official_team", team: "Morocco" },
              state: "official_participant",
              path: []
            },
            projectedScore: { homeGoals: 1, awayGoals: 0 },
            winner: {
              team: "France",
              source: { kind: "official_team", team: "France" },
              state: "projected_winner",
              path: []
            },
            advancementMethod: "projected_regulation"
          })
        ])}
      />
    );

    const card = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    expect(card).toContain("Official fixture");
    expect(card).toContain("Live");
    expect(card).toContain("France");
    expect(card).toContain("Morocco");
    expect(card).toContain("Projected to advance");
    expect(card).not.toContain("Official result");
    expect(card).not.toContain("Official winner");
  });

  test("renders the provider-first graph without stale Canada matchups", () => {
    const providerProjection = buildOfficialWorldCup2026KnockoutProjection({
      syncResult: syncResult([
        providerRecord({
          id: "provider-r16-canada-morocco",
          matchday: 5001,
          stage: "LAST_16",
          homeTeam: "Canada",
          awayTeam: "Morocco"
        }),
        providerRecord({
          id: "provider-r16-brazil-norway",
          matchday: 5002,
          stage: "LAST_16",
          homeTeam: "Brazil",
          awayTeam: "Norway"
        }),
        providerRecord({
          id: "provider-qf-france-morocco",
          matchday: 5003,
          stage: "QUARTER_FINALS",
          homeTeam: "France",
          awayTeam: "Morocco",
          status: "live",
          homeScore: 1,
          awayScore: 0
        })
      ]),
      predictMatch: predictorFavoring(["Morocco", "Norway", "France"]),
      generatedAt: "2026-06-28T12:00:00.000Z"
    });
    const html = renderToStaticMarkup(<OfficialKnockoutTournament projection={providerProjection} />);

    expect(html).toContain("Match 89: Canada vs Morocco");
    expect(html).toContain("Match 90: Brazil vs Norway");
    expect(html).toContain("Match 97: France vs Morocco");
    expect(html).toContain("Official fixture");
    expect(html).toContain("Live");
    expect(html).not.toContain("Match 89: Canada vs Paraguay");
    expect(html).not.toContain("Match 97: Canada vs Norway");
    expect(html).not.toContain("Unknown Team");
    expect(html).not.toContain("Unavailable");
    expect(html).not.toContain("???");
  });

  test("shows Awaiting official confirmation for an unresolved fixture and Cancelled for a cancelled one", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([
          fixture({ sourceState: "unresolved", status: "scheduled" }),
          fixture({
            officialMatchNumber: 74,
            fixtureId: "wc2026-match-74",
            sourceState: "unresolved",
            status: "cancelled"
          })
        ])}
      />
    );

    expect(html).toContain("Awaiting official confirmation");
    expect(html).toContain("Cancelled");
    expect(html).not.toContain("Unavailable");
  });

  test("labels podium entries with their official or projected resolution", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([fixture()], {
          champion: { team: "Brazil", resolution: "official" }
        })}
      />
    );

    expect(html).toContain("Official");
    expect(html).toContain("Projected");
    expect(html).toContain("Brazil");
  });

  test("renders friendly placeholders for unresolved podium entries without sentinels", () => {
    const html = renderToStaticMarkup(
      <OfficialKnockoutTournament
        projection={projection([fixture()], {
          champion: { resolution: "unresolved" },
          runnerUp: { resolution: "unresolved" },
          thirdPlace: { resolution: "unresolved" },
          fourthPlace: { resolution: "unresolved" }
        })}
      />
    );

    expect(html).toContain("Awaiting bracket resolution");
    expect(html).not.toContain("Unavailable");
    expect(html).not.toContain("Unknown Team");
    expect(html).not.toContain("???");
  });
});
