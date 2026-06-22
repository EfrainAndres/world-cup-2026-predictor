import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { GroupDetailProjection } from "./GroupDetailProjection";
import type {
  WorldCup2026GroupProjection,
  WorldCup2026GroupProjectionFixture,
  WorldCup2026GroupStandingEntry,
  ProjectionRefreshAssessment,
  ProjectionRefreshExecution
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

function makeAssessment(state: ProjectionRefreshAssessment["state"]): ProjectionRefreshAssessment {
  return {
    state,
    shouldRefresh: state === "stale",
    evaluatedAt: "2026-06-21T10:00:00Z",
    reasons: [`Test reason for ${state}`],
    triggers: {
      providerDataChanged: false,
      completedResultAdded: state === "stale",
      liveStatusChanged: false,
      eloInputChanged: false,
      tournamentFormChanged: false,
      formulaVersionChanged: false,
      fixtureStatusChanged: false,
      snapshotAvailable: false
    },
    sourceVersions: {
      formulaVersion: "v2",
      modelVersion: "wc2026-prediction-v1"
    }
  };
}

function makeExecution(partial: Partial<ProjectionRefreshExecution> = {}): ProjectionRefreshExecution {
  return {
    attempted: partial.attempted ?? false,
    completed: partial.completed ?? false,
    reasonCodes: partial.reasonCodes ?? [],
    warnings: partial.warnings ?? []
  };
}

function makeFixtureWithRefresh(
  source: "stored_snapshot" | "auto_predict" | "unavailable",
  state: ProjectionRefreshAssessment["state"],
  execution: Partial<ProjectionRefreshExecution> = {}
): WorldCup2026GroupProjectionFixture {
  return {
    fixtureId: "test-fixture-id",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    source,
    warnings: [],
    refreshAssessment: makeAssessment(state),
    refreshExecution: makeExecution(execution)
  };
}

function wrapInProjection(fixture: WorldCup2026GroupProjectionFixture): WorldCup2026GroupProjection {
  return {
    available: true,
    status: "complete",
    standings,
    fixtures: [fixture],
    warnings: []
  };
}

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

  // ── Refresh status UI ───────────────────────────────────────────────────────

  test("renders Current badge for state 'current'", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(makeFixtureWithRefresh("auto_predict", "current"))} />
    );
    expect(html).toContain("Current");
    expect(html).toContain("Projection status: Current");
  });

  test("renders Stale badge for state 'stale'", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(makeFixtureWithRefresh("auto_predict", "stale"))} />
    );
    expect(html).toContain("Stale");
    expect(html).toContain("Projection status: Stale");
  });

  test("renders Invalidated badge for state 'invalidated'", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(makeFixtureWithRefresh("auto_predict", "invalidated"))} />
    );
    expect(html).toContain("Invalidated");
    expect(html).toContain("Projection status: Invalidated");
  });

  test("renders Unavailable badge for state 'unavailable'", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(makeFixtureWithRefresh("unavailable", "unavailable"))} />
    );
    expect(html).toContain("Unavailable");
    expect(html).toContain("Projection status: Unavailable");
  });

  test("renders refresh description when attempted and completed", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection
        projection={wrapInProjection(
          makeFixtureWithRefresh("auto_predict", "current", { attempted: true, completed: true })
        )}
      />
    );
    expect(html).toContain("Projection refreshed from updated model inputs.");
  });

  test("renders failure warning and description when attempted but not completed", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection
        projection={wrapInProjection(
          makeFixtureWithRefresh("auto_predict", "stale", { attempted: true, completed: false })
        )}
      />
    );
    expect(html).toContain("Projection refresh failed. Previous projection preserved.");
    expect(html).toContain("Refresh failed: previous projection preserved.");
  });

  test("renders Immutable pre-match snapshot label for stored_snapshot source", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(makeFixtureWithRefresh("stored_snapshot", "current"))} />
    );
    expect(html).toContain("Immutable pre-match snapshot");
    expect(html).toContain("Projection source type: Immutable pre-match snapshot");
    expect(html).not.toContain("Projection status: Current");
  });

  test("does not render refresh status when refreshAssessment is undefined", () => {
    const fixture: WorldCup2026GroupProjectionFixture = {
      fixtureId: "no-refresh",
      homeTeam: "Mexico",
      awayTeam: "Canada",
      source: "auto_predict",
      warnings: []
    };
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(fixture)} />
    );
    expect(html).not.toContain("Projection status:");
    expect(html).not.toContain("Immutable pre-match snapshot");
  });

  test("badge has aria-label containing state name", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection projection={wrapInProjection(makeFixtureWithRefresh("auto_predict", "stale"))} />
    );
    expect(html).toContain('aria-label="Projection status: Stale"');
  });

  test("renders formula version detail when refresh succeeded", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProjection
        projection={wrapInProjection(
          makeFixtureWithRefresh("auto_predict", "current", { attempted: true, completed: true })
        )}
      />
    );
    expect(html).toContain("Formula: v2");
    expect(html).toContain("wc2026-prediction-v1");
  });
});
