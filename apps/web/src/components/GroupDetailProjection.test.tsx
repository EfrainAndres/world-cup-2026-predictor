import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { GroupDetailProjection } from "./GroupDetailProjection";
import type {
  WorldCup2026GroupProjection,
  WorldCup2026GroupStandingEntry
} from "../lib/api-client";

const standings: WorldCup2026GroupStandingEntry[] = [
  { team: "Mexico", points: 9, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: 6 },
  { team: "South Korea", points: 4, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0 },
  { team: "South Africa", points: 3, played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3 },
  { team: "Czechia", points: 2, played: 3, wins: 0, draws: 2, losses: 1, goalsFor: 2, goalsAgainst: 5, goalDifference: -3 }
];

const completeProjection: WorldCup2026GroupProjection = {
  available: true,
  status: "complete",
  standings,
  qualification: {
    projectedFirstPlace: "Mexico",
    projectedSecondPlace: "South Korea",
    projectedThirdPlace: "South Africa",
    projectedThirdPlaceQualifying: true
  },
  fixtures: [
    {
      fixtureId: "wc2026-group-a-md2-03-mexico-vs-south-korea",
      homeTeam: "Mexico",
      awayTeam: "South Korea",
      source: "stored_snapshot",
      projectedScoreline: { homeGoals: 1, awayGoals: 0 },
      homeWinProbability: 0.55,
      drawProbability: 0.25,
      awayWinProbability: 0.2,
      confidenceLevel: "medium",
      coverageType: "partial",
      warnings: []
    }
  ],
  warnings: []
};

const unavailableProjection: WorldCup2026GroupProjection = {
  available: false,
  status: "unavailable",
  fixtures: [],
  warnings: ["Projection unavailable: no predictor configured."]
};

const partialProjection: WorldCup2026GroupProjection = {
  available: true,
  status: "partial",
  standings,
  qualification: {
    projectedFirstPlace: "Mexico",
    projectedSecondPlace: "South Korea"
  },
  fixtures: [
    {
      fixtureId: "wc2026-group-a-md2-03-mexico-vs-south-korea",
      homeTeam: "Mexico",
      awayTeam: "South Korea",
      source: "auto_predict",
      projectedScoreline: { homeGoals: 2, awayGoals: 0 },
      homeWinProbability: 0.6,
      drawProbability: 0.2,
      awayWinProbability: 0.2,
      warnings: ["Auto Predict used fallback seed rating."]
    },
    {
      fixtureId: "wc2026-group-a-md2-04-south-africa-vs-czechia",
      homeTeam: "South Africa",
      awayTeam: "Czechia",
      source: "unavailable",
      warnings: ["Projection unavailable for South Africa vs Czechia."]
    }
  ],
  warnings: ["One fixture could not be projected."]
};

describe("GroupDetailProjection", () => {
  test("renders projected standings heading when projection is available", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={completeProjection} />);
    expect(html).toContain("Projected standings");
  });

  test("renders unavailable message when projection is not available", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={unavailableProjection} />);
    expect(html).toContain("not available");
    expect(html).toContain("Projection unavailable: no predictor configured.");
  });

  test("renders complete projection badge for complete status", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={completeProjection} />);
    expect(html).toContain("Complete projection");
  });

  test("renders partial projection badge for partial status", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={partialProjection} />);
    expect(html).toContain("Partial projection");
  });

  test("renders projected qualification section with team names", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={completeProjection} />);
    expect(html).toContain("Projected 1st");
    expect(html).toContain("Mexico");
    expect(html).toContain("Projected 2nd");
    expect(html).toContain("South Korea");
    expect(html).toContain("Projected 3rd");
    expect(html).toContain("South Africa");
  });

  test("renders third place qualifying note when available", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={completeProjection} />);
    expect(html).toContain("Projected to qualify as best third");
  });

  test("renders per-fixture source label for stored_snapshot", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={completeProjection} />);
    expect(html).toContain("Stored prediction");
    expect(html).toContain("Mexico");
    expect(html).toContain("South Korea");
  });

  test("renders projected scoreline for fixtures that have one", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={completeProjection} />);
    expect(html).toContain("1–0");
  });

  test("renders auto_predict source label", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={partialProjection} />);
    expect(html).toContain("Auto Predict");
  });

  test("renders unavailable source label for unprojectable fixture", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={partialProjection} />);
    expect(html).toContain("Unavailable");
  });

  test("renders fixture-level warnings", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={partialProjection} />);
    expect(html).toContain("Auto Predict used fallback seed rating.");
  });

  test("renders projection-level warnings section", () => {
    const html = renderToStaticMarkup(<GroupDetailProjection projection={partialProjection} />);
    expect(html).toContain("One fixture could not be projected.");
    expect(html).toContain("Projection notes");
  });
});
