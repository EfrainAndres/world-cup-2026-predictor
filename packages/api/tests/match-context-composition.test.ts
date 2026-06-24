import { describe, expect, it } from "vitest";
import {
  buildWorldCup2026DailyMatches,
  buildWorldCup2026GroupDetail
} from "../src/index.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026SyncResult
} from "../src/index.js";

function record(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> & {
    providerFixtureId: string;
    homeTeam: string;
    awayTeam: string;
    status: WorldCup2026ExternalFixtureRecord["status"];
  }
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: overrides.providerFixtureId,
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    status: overrides.status,
    ...(overrides.kickoffAt !== undefined ? { kickoffAt: overrides.kickoffAt } : {}),
    ...(overrides.group !== undefined ? { group: overrides.group } : {}),
    ...(overrides.matchday !== undefined ? { matchday: overrides.matchday } : {}),
    ...(overrides.homeScore !== undefined ? { homeScore: overrides.homeScore } : {}),
    ...(overrides.awayScore !== undefined ? { awayScore: overrides.awayScore } : {}),
    ...(overrides.updatedAt !== undefined ? { updatedAt: overrides.updatedAt } : {})
  };
}

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-14T12:00:00Z",
    lastSuccessfulSync: "2026-06-14T12:00:00Z",
    fixtures: [],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

// Mexico vs South Africa is Group A Matchday 1 (canonical fixture)
const MEXICO_SA_RECORD = record({
  providerFixtureId: "p-mx-sa",
  homeTeam: "Mexico",
  awayTeam: "South Africa",
  status: "scheduled",
  kickoffAt: "2026-06-14T00:00:00Z"
});

const COMPLETED_MEXICO_WIN = record({
  providerFixtureId: "p-mx-sa",
  homeTeam: "Mexico",
  awayTeam: "South Africa",
  status: "finished",
  kickoffAt: "2026-06-14T00:00:00Z",
  homeScore: 2,
  awayScore: 1
});

// Canada vs Bosnia-Herzegovina is Group B Matchday 1 (canonical fixture)
const CANADA_BOSNIA_RECORD = record({
  providerFixtureId: "p-ca-bh",
  homeTeam: "Canada",
  awayTeam: "Bosnia-Herzegovina",
  status: "scheduled",
  kickoffAt: "2026-06-20T00:00:00Z"
});

describe("match context composition — daily matches", () => {
  it("attaches matchContext to an entry for a known canonical fixture", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: syncResult({ fixtures: [MEXICO_SA_RECORD] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.find((m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa");
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeDefined();
    expect(match!.matchContext!.fixtureId).toBeTruthy();
    expect(match!.matchContext!.group).toBe("A");
    expect(match!.matchContext!.matchday).toBe(1);
    expect(match!.matchContext!.homeTeam).toBe("Mexico");
    expect(match!.matchContext!.awayTeam).toBe("South Africa");
  });

  it("context is additive — existing entry fields are unchanged", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: syncResult({ fixtures: [MEXICO_SA_RECORD] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.find((m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa");
    expect(match).toBeDefined();
    expect(match!.homeTeam).toBe("Mexico");
    expect(match!.awayTeam).toBe("South Africa");
    expect(match!.state).toBe("upcoming");
    expect(match!.predictionHistory).toBeDefined();
  });

  it("omits matchContext for provider-only fixtures not in canonical list", () => {
    const unknownRecord = record({
      providerFixtureId: "p-unknown-99",
      homeTeam: "Atlantis",
      awayTeam: "Neverland",
      status: "scheduled",
      kickoffAt: "2026-06-14T00:00:00Z"
    });

    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: syncResult({ fixtures: [unknownRecord] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.find((m) => m.homeTeam === "Atlantis");
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeUndefined();
  });

  it("context reflects completed results for qualification state", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [MEXICO_SA_RECORD],
        completedResults: [COMPLETED_MEXICO_WIN]
      })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.find((m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa");
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeDefined();
    expect(match!.matchContext!.qualificationState.status).toBe("provisional");
    expect(match!.matchContext!.standingsContext.home.points).toBe(3);
    expect(match!.matchContext!.standingsContext.away.points).toBe(0);
  });

  it("context uses stale flag when cacheUsed is true", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [MEXICO_SA_RECORD],
        cacheUsed: true
      })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.find((m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa");
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeDefined();
    expect(match!.matchContext!.providerFreshness.stale).toBe(true);
    expect(match!.matchContext!.providerFreshness.cacheUsed).toBe(true);
  });

  it("context uses stale flag when localFallbackUsed is true", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [MEXICO_SA_RECORD],
        localFallbackUsed: true
      })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.find((m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa");
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeDefined();
    expect(match!.matchContext!.providerFreshness.stale).toBe(true);
    expect(match!.matchContext!.providerFreshness.localFallbackUsed).toBe(true);
  });

  it("context does not mutate the syncResult", () => {
    const sr = syncResult({ fixtures: [MEXICO_SA_RECORD] });
    const originalFixtures = [...sr.fixtures];

    buildWorldCup2026DailyMatches({
      date: "2026-06-14",
      timezone: "UTC",
      syncResult: sr
    });

    expect(sr.fixtures).toHaveLength(originalFixtures.length);
    expect(sr.fixtures[0]?.homeTeam).toBe("Mexico");
  });
});

describe("match context composition — group detail", () => {
  it("attaches matchContext to group detail matches for known canonical fixtures", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      syncResult: syncResult({ fixtures: [MEXICO_SA_RECORD] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.upcoming.find(
      (m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa"
    );
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeDefined();
    expect(match!.matchContext!.group).toBe("A");
    expect(match!.matchContext!.fixtureImportance.level).toBe("low");
  });

  it("group detail context is additive — existing match fields are unchanged", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      syncResult: syncResult({ fixtures: [MEXICO_SA_RECORD] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.upcoming.find(
      (m) => m.homeTeam === "Mexico" && m.awayTeam === "South Africa"
    );
    expect(match).toBeDefined();
    expect(match!.homeTeam).toBe("Mexico");
    expect(match!.state).toBe("upcoming");
    expect(match!.predictionHistory).toBeDefined();
    expect(Array.isArray(match!.warnings)).toBe(true);
  });

  it("group detail context works across different groups using Group B fixture", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "B",
      syncResult: syncResult({ fixtures: [CANADA_BOSNIA_RECORD] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.upcoming.find(
      (m) => m.homeTeam === "Canada" && m.awayTeam === "Bosnia-Herzegovina"
    );
    expect(match).toBeDefined();
    expect(match!.matchContext).toBeDefined();
    expect(match!.matchContext!.group).toBe("B");
  });

  it("group detail context omits matchContext for unresolvable fixtures", () => {
    const unknownRecord = record({
      providerFixtureId: "p-ga-x",
      homeTeam: "Testland",
      awayTeam: "Mockovia",
      status: "scheduled",
      kickoffAt: "2026-06-20T18:00:00Z",
      group: "A"
    });

    const result = buildWorldCup2026GroupDetail({
      group: "A",
      syncResult: syncResult({ fixtures: [unknownRecord] })
    });

    if (result.status !== "success") throw new Error("Expected success");

    const match = result.matches.upcoming.find((m) => m.homeTeam === "Testland");
    if (match === undefined) return;
    expect(match.matchContext).toBeUndefined();
  });
});
