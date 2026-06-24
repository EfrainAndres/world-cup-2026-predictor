import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { MatchContextDisplay } from "./MatchContextDisplay";
import type { WorldCup2026MatchContext } from "../lib/api-client";

function makeContext(overrides: Partial<WorldCup2026MatchContext> = {}): WorldCup2026MatchContext {
  return {
    fixtureId: "wc2026-group-b-md1-01",
    group: "B",
    matchday: 1,
    homeTeam: "Mexico",
    awayTeam: "Canada",
    standingsContext: {
      mode: "official",
      home: {
        team: "Mexico",
        groupPosition: null,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      },
      away: {
        team: "Canada",
        groupPosition: null,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      },
      groupComplete: false
    },
    qualificationState: {
      status: "foundation_only"
    },
    fixtureImportance: {
      level: "low",
      reasons: ["Opening fixture: qualification stakes are minimal at this stage."]
    },
    providerFreshness: {
      activeProvider: "football_data_org_results_provider",
      cacheUsed: false,
      localFallbackUsed: false,
      stale: false
    },
    fallbackState: {
      externalProviderEnabled: true,
      localFallbackUsed: false,
      unresolvedFixture: false,
      warnings: []
    },
    ...overrides
  };
}

describe("MatchContextDisplay", () => {
  test("renders team names", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).toContain("Mexico");
    expect(html).toContain("Canada");
  });

  test("renders 'not used as a model input' label", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).toContain("Not used as a model input");
  });

  test("renders 'Match context' section header", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).toContain("Match context");
  });

  test("renders official standings mode badge", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).toContain("Official");
  });

  test("renders live provisional standings mode badge", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          standingsContext: {
            mode: "live_provisional",
            home: makeContext().standingsContext.home,
            away: makeContext().standingsContext.away,
            groupComplete: false
          }
        })}
      />
    );
    expect(html).toContain("Live (provisional)");
  });

  test("renders Fresh badge when not stale", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).toContain("Fresh");
    expect(html).not.toContain("Stale");
  });

  test("renders Stale badge when cacheUsed is true", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          providerFreshness: {
            activeProvider: "test_provider",
            cacheUsed: true,
            localFallbackUsed: false,
            stale: true
          }
        })}
      />
    );
    expect(html).toContain("Stale");
  });

  test("renders Stale badge when localFallbackUsed is true", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          providerFreshness: {
            activeProvider: "local_static",
            cacheUsed: false,
            localFallbackUsed: true,
            stale: true
          }
        })}
      />
    );
    expect(html).toContain("Stale");
  });

  test("renders fallback warnings when present", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          fallbackState: {
            externalProviderEnabled: false,
            localFallbackUsed: true,
            unresolvedFixture: false,
            warnings: ["Local static fallback is active."]
          }
        })}
      />
    );
    expect(html).toContain("Local static fallback is active.");
  });

  test("does not render fallback warnings section when no warnings", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).not.toContain("Local static fallback is active.");
  });

  test("renders importance badge with correct level", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          fixtureImportance: { level: "high", reasons: ["Matchday 3 is decisive."] }
        })}
      />
    );
    expect(html).toContain("High importance");
  });

  test("renders medium importance badge", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          fixtureImportance: { level: "medium", reasons: ["Matchday 2 shapes standings."] }
        })}
      />
    );
    expect(html).toContain("Medium importance");
  });

  test("shows dash for groupPosition when null (no games played)", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).toContain("Pos: —");
  });

  test("shows numeric position when played > 0", () => {
    const baseCtx = makeContext();
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={{
          ...baseCtx,
          standingsContext: {
            ...baseCtx.standingsContext,
            home: { ...baseCtx.standingsContext.home, groupPosition: 1, played: 1, points: 3 }
          }
        }}
      />
    );
    expect(html).toContain("Pos: 1");
    expect(html).toContain("Pts: 3");
  });

  test("renders positive goal difference with + prefix", () => {
    const baseCtx = makeContext();
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={{
          ...baseCtx,
          standingsContext: {
            ...baseCtx.standingsContext,
            home: { ...baseCtx.standingsContext.home, goalDifference: 2, groupPosition: 1, played: 1, points: 3 }
          }
        }}
      />
    );
    expect(html).toContain("GD: +2");
  });

  test("renders negative goal difference without extra prefix", () => {
    const baseCtx = makeContext();
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={{
          ...baseCtx,
          standingsContext: {
            ...baseCtx.standingsContext,
            away: { ...baseCtx.standingsContext.away, goalDifference: -1, groupPosition: 2, played: 1, points: 0 }
          }
        }}
      />
    );
    expect(html).toContain("GD: -1");
  });

  test("does not show qualification table for foundation_only status", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).not.toContain("Qualification (No games played)");
  });

  test("shows provisional qualification state with team names", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          qualificationState: {
            status: "provisional",
            firstPlace: "Mexico",
            secondPlace: "Canada",
            thirdPlace: "Uruguay"
          }
        })}
      />
    );
    expect(html).toContain("Qualification (Provisional)");
    expect(html).toContain("Mexico");
    expect(html).toContain("Canada");
    expect(html).toContain("Uruguay");
  });

  test("shows official qualification state", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          qualificationState: {
            status: "official",
            firstPlace: "Mexico",
            secondPlace: "Canada"
          }
        })}
      />
    );
    expect(html).toContain("Qualification (Official)");
  });

  test("renders provenance section with provider and no-look-ahead text", () => {
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={makeContext({
          providerFreshness: {
            activeProvider: "football_data_org_results_provider",
            cacheUsed: false,
            localFallbackUsed: false,
            stale: false,
            lastSuccessfulSync: "2026-06-14T12:00:00Z"
          }
        })}
      />
    );
    expect(html).toContain("Provenance");
    expect(html).toContain("football_data_org_results_provider");
    expect(html).toContain("2026-06-14T12:00:00Z");
    expect(html).toContain("No-look-ahead");
    expect(html).toContain("Confirmed");
  });

  test("omits last sync line when lastSuccessfulSync is absent", () => {
    const html = renderToStaticMarkup(<MatchContextDisplay context={makeContext()} />);
    expect(html).not.toContain("Last sync");
  });

  test("renders group complete: Yes when groupComplete is true", () => {
    const baseCtx = makeContext();
    const html = renderToStaticMarkup(
      <MatchContextDisplay
        context={{
          ...baseCtx,
          standingsContext: { ...baseCtx.standingsContext, groupComplete: true }
        }}
      />
    );
    expect(html).toContain("Yes");
  });
});
