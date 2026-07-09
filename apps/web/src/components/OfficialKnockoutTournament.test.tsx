import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type {
  OfficialKnockoutFixtureProjection,
  OfficialKnockoutPodium,
  OfficialKnockoutProjectionResult
} from "@world-cup-2026-predictor/api";
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
