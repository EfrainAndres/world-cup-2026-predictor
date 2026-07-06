import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { GroupDetailMatchCard } from "./GroupDetailMatchCard";
import type { WorldCup2026GroupDetailMatch } from "../lib/api-client";

function makeMatch(overrides: Partial<WorldCup2026GroupDetailMatch> = {}): WorldCup2026GroupDetailMatch {
  return {
    fixtureId: "fixture-1",
    homeTeam: "Mexico",
    awayTeam: "Canada",
    normalizedStatus: "scheduled",
    state: "upcoming",
    predictionHistory: {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    },
    warnings: [],
    ...overrides
  };
}

describe("GroupDetailMatchCard", () => {
  test("renders teams", () => {
    const html = renderToStaticMarkup(<GroupDetailMatchCard match={makeMatch()} />);
    expect(html).toContain("Mexico");
    expect(html).toContain("Canada");
  });

  test("renders upcoming state badge", () => {
    const html = renderToStaticMarkup(<GroupDetailMatchCard match={makeMatch()} />);
    expect(html).toContain("Upcoming");
  });

  test("renders kickoff unavailable when no localizedKickoff", () => {
    const html = renderToStaticMarkup(<GroupDetailMatchCard match={makeMatch()} />);
    expect(html).toContain("Kickoff unavailable");
  });

  test("renders localized kickoff when provided", () => {
    const html = renderToStaticMarkup(
      <GroupDetailMatchCard match={makeMatch({ localizedKickoff: "2026-06-12, 10:00 GMT-5" })} />
    );
    expect(html).toContain("2026-06-12, 10:00 GMT-5");
  });

  test("renders matchday when provided", () => {
    const html = renderToStaticMarkup(<GroupDetailMatchCard match={makeMatch({ matchday: 2 })} />);
    expect(html).toContain("Matchday 2");
  });

  test("renders score for final state", () => {
    const html = renderToStaticMarkup(
      <GroupDetailMatchCard
        match={makeMatch({ state: "final", homeScore: 2, awayScore: 1, normalizedStatus: "finished" })}
      />
    );
    expect(html).toContain("2 – 1");
    expect(html).toContain("Final");
  });

  test("renders penalty shootout note without using penalties as the primary score", () => {
    const html = renderToStaticMarkup(
      <GroupDetailMatchCard
        match={makeMatch({
          state: "final",
          normalizedStatus: "finished",
          homeTeam: "Australia",
          awayTeam: "Egypt",
          homeScore: 1,
          awayScore: 1,
          extraTimeHomeScore: 1,
          extraTimeAwayScore: 1,
          penaltyHomeScore: 3,
          penaltyAwayScore: 5,
          winner: "Egypt",
          decisionMethod: "penalties"
        })}
      />
    );

    expect(html).toContain("1 – 1");
    expect(html).toContain("Egypt wins 5–3 on penalties");
    expect(html).toContain("Australia 3–5 Egypt");
  });

  test("renders live state badge", () => {
    const html = renderToStaticMarkup(
      <GroupDetailMatchCard match={makeMatch({ state: "live", homeScore: 1, awayScore: 0, normalizedStatus: "live" })} />
    );
    expect(html).toContain("Live");
  });

  test("does not show prediction section when no snapshot", () => {
    const html = renderToStaticMarkup(<GroupDetailMatchCard match={makeMatch()} />);
    expect(html).not.toContain("Pre-match prediction");
  });

  test("renders prediction summary when snapshot available", () => {
    const html = renderToStaticMarkup(
      <GroupDetailMatchCard
        match={makeMatch({
          predictionHistory: {
            snapshot: {
              available: true,
              status: "pre_match_locked",
              snapshotId: "snap-1",
              capturedAt: "2026-06-10T12:00:00Z",
              prediction: {
                homeWinProbability: 0.5,
                drawProbability: 0.25,
                awayWinProbability: 0.25,
                homeExpectedGoals: 1.5,
                awayExpectedGoals: 0.9,
                projectedScoreline: { homeGoals: 1, awayGoals: 1 }
              }
            },
            evaluation: { available: false },
            warnings: []
          }
        })}
      />
    );
    expect(html).toContain("Pre-match prediction");
    expect(html).toContain("xG");
    expect(html).toContain("1X2");
  });

  test("renders unscheduled state", () => {
    const html = renderToStaticMarkup(
      <GroupDetailMatchCard match={makeMatch({ state: "upcoming", normalizedStatus: "scheduled" })} />
    );
    expect(html).toContain("Upcoming");
    expect(html).toContain("Kickoff unavailable");
  });
});
