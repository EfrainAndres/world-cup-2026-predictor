import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { OfficialKnockoutProjectionResult, WorldCup2026GroupStandings } from "@world-cup-2026-predictor/api";
import type { ProductionRuntimeDiagnostics } from "../lib/server-runtime";
import type {
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesProviderMetadata,
  WorldCup2026DailyMatchesSuccessResponse
} from "../lib/api-client";
import {
  HomeGroupSnapshot,
  HomeTechnicalStatus,
  HomeTodayMatches,
  HomeTournamentOutlook
} from "./HomeDashboardSections";

function match(overrides: Partial<WorldCup2026DailyMatchEntry> = {}): WorldCup2026DailyMatchEntry {
  return {
    fixtureId: "fixture-1",
    homeTeam: "Australia",
    awayTeam: "Egypt",
    normalizedStatus: "scheduled",
    state: "upcoming",
    predictionSnapshot: { available: false },
    predictionHistory: {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    },
    ...overrides
  };
}

function dailyMatches(
  matches: readonly WorldCup2026DailyMatchEntry[],
  providerMetadataOverrides: Partial<WorldCup2026DailyMatchesProviderMetadata> = {}
): WorldCup2026DailyMatchesSuccessResponse {
  return {
    status: "success",
    requestedDate: "2026-06-11",
    timezone: "America/Bogota",
    generatedAt: "2026-06-11T12:00:00Z",
    counts: {
      total: matches.length,
      upcoming: matches.filter((m) => m.state === "upcoming").length,
      live: matches.filter((m) => m.state === "live").length,
      halftime: matches.filter((m) => m.state === "halftime").length,
      final: matches.filter((m) => m.state === "final").length,
      postponed: matches.filter((m) => m.state === "postponed").length,
      cancelled: matches.filter((m) => m.state === "cancelled").length,
      unknown: matches.filter((m) => m.state === "unknown").length,
      unavailableKickoff: 0
    },
    matches,
    unscheduledMatches: [],
    issues: [],
    warnings: [],
    providerMetadata: {
      configuredProvider: "local_static",
      activeProvider: "local_static_results_provider",
      externalRequestAttempted: false,
      cacheUsed: false,
      localFallbackUsed: true,
      stale: false,
      ...providerMetadataOverrides
    },
    metadata: {
      apiVersion: "0.1.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: []
    }
  };
}

describe("HomeTodayMatches", () => {
  test("uses preview wording for upcoming matches and penalty notes for finals", () => {
    const matches = [
      match({ fixtureId: "upcoming", homeTeam: "Mexico", awayTeam: "South Africa" }),
      match({
        fixtureId: "penalties",
        normalizedStatus: "finished",
        state: "final",
        homeScore: 1,
        awayScore: 1,
        penaltyHomeScore: 3,
        penaltyAwayScore: 5,
        winner: "Egypt",
        decisionMethod: "penalties"
      })
    ];
    const html = renderToStaticMarkup(<HomeTodayMatches matches={matches} dailyMatches={dailyMatches(matches)} />);

    expect(html).toContain("Preview");
    expect(html).toContain("vs");
    expect(html).toContain("1 – 1");
    expect(html).toContain("Egypt wins 5–3 on penalties");
  });

  test("renders provider refresh warning when today's matches are served from last known good cache", () => {
    const matches = [
      match({ fixtureId: "cached", homeTeam: "Mexico", awayTeam: "South Africa" })
    ];
    const html = renderToStaticMarkup(
      <HomeTodayMatches
        matches={matches}
        dailyMatches={dailyMatches(matches, {
          configuredProvider: "football_data_org",
          activeProvider: "football_data_org_results_provider",
          externalRequestAttempted: true,
          cacheUsed: true,
          localFallbackUsed: false,
          stale: true
        })}
      />
    );

    expect(html).toContain("Showing last successful live data while the provider refreshes.");
    expect(html).toContain("Mexico");
    expect(html).toContain("South Africa");
  });
});

describe("HomeTechnicalStatus", () => {
  test("renders a concise system-status summary with collapsed runtime details", () => {
    const runtimeDiagnostics: ProductionRuntimeDiagnostics = {
      persistenceProviderConfigured: true,
      databaseConnected: true,
      resultsProviderConfigured: true,
      externalProviderActive: true,
      activeProvider: "football-data.org",
      localFallbackUsed: false,
      cacheUsed: false,
      fixtureCount: 72,
      fixturesWithKickoff: 72,
      lastSuccessfulSync: "2026-06-11T10:00:00Z",
      statsBomb: {
        featureEnabled: false,
        rolloutMode: "off",
        activationDecision: "disabled",
        artifactReady: false,
        readinessReason: "feature_disabled",
        profileCount: null,
        artifactCutoffAt: null,
        artifactGeneratedAt: null,
        lastLoadStatus: "not_attempted",
        artifactSourceKind: "unavailable"
      },
      attackDefense: {
        featureEnabled: false,
        rolloutMode: "off",
        activationDecision: "disabled",
        artifactReady: false,
        readinessReason: "feature_disabled",
        candidateId: null,
        lastLoadStatus: "not_attempted",
        runtimeProfileArtifactReady: false,
        runtimeProfileArtifactReason: "not_attempted",
        runtimeProfileArtifactFingerprint: null,
        runtimeProfileArtifactFingerprintShort: null,
        runtimeProfileArtifactSchemaVersion: null,
        runtimeProfileCount: null,
        runtimeProfileSourceFixtureCount: null
      },
      warnings: []
    };

    const html = renderToStaticMarkup(
      <HomeTechnicalStatus
        runtimeDiagnostics={runtimeDiagnostics}
        dailyMatches={dailyMatches([])}
        modelVersion="wc2026-prediction-v1"
        formulaVersion="v2"
      />
    );

    expect(html).toContain("System status");
    expect(html).toContain("Live data connected · Persistence connected · Model v2 active");
    expect(html).toContain("View runtime details");
    expect(html).not.toContain(" open");
  });
});

function groupStandings(overrides: Partial<WorldCup2026GroupStandings> = {}): WorldCup2026GroupStandings {
  return {
    group: "A",
    groupName: "Group A",
    completedFixtureCount: 6,
    pendingFixtureCount: 0,
    standings: [
      { team: "Mexico", played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9 },
      { team: "South Korea", played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0, points: 4 },
      { team: "South Africa", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 3 }
    ],
    ...overrides
  };
}

describe("HomeGroupSnapshot", () => {
  test("shows Complete for finished groups and links with an unambiguous View group label", () => {
    const html = renderToStaticMarkup(
      <HomeGroupSnapshot groups={[groupStandings({ completedFixtureCount: 6, pendingFixtureCount: 0 })]} />
    );

    expect(html).toContain("Complete");
    expect(html).toContain("View group");
    expect(html).not.toContain(">Open<");
  });

  test("shows In progress while a group still has pending fixtures", () => {
    const html = renderToStaticMarkup(
      <HomeGroupSnapshot groups={[groupStandings({ completedFixtureCount: 2, pendingFixtureCount: 4 })]} />
    );

    expect(html).toContain("In progress");
  });

  test("shows Not started before any group fixture has finished", () => {
    const html = renderToStaticMarkup(
      <HomeGroupSnapshot groups={[groupStandings({ completedFixtureCount: 0, pendingFixtureCount: 6 })]} />
    );

    expect(html).toContain("Not started");
  });
});

// Only the fields HomeTournamentOutlook reads are stubbed; the remaining
// projection sections are irrelevant to this presentation test.
type PodiumEntryStub = { team?: string; resolution: "official" | "projected" | "unresolved" };

function knockoutProjection(podium: {
  champion: PodiumEntryStub;
  runnerUp: PodiumEntryStub;
  thirdPlace: PodiumEntryStub;
}): OfficialKnockoutProjectionResult {
  return {
    podium: { ...podium, fourthPlace: { resolution: "unresolved" } },
    rounds: { round_of_32: [] },
    metadata: { predictorCallCount: 16 }
  } as unknown as OfficialKnockoutProjectionResult;
}

function projected(team: string): PodiumEntryStub {
  return { team, resolution: "projected" };
}

describe("HomeTournamentOutlook", () => {
  test("shows friendly placeholders instead of Unknown Team when the podium is unresolved", () => {
    const html = renderToStaticMarkup(
      <HomeTournamentOutlook
        projection={knockoutProjection({
          champion: { resolution: "unresolved" },
          runnerUp: { resolution: "unresolved" },
          thirdPlace: { resolution: "unresolved" }
        })}
      />
    );

    expect(html).toContain("Awaiting bracket resolution");
    expect(html).toContain("Pending official results");
    expect(html).not.toContain("Unknown Team");
    expect(html).not.toContain("Unavailable");
    expect(html).not.toContain("???");
  });

  test("shows resolved podium teams with their identities when available", () => {
    const html = renderToStaticMarkup(
      <HomeTournamentOutlook
        projection={knockoutProjection({
          champion: projected("Brazil"),
          runnerUp: projected("France"),
          thirdPlace: projected("Argentina")
        })}
      />
    );

    expect(html).toContain("Brazil");
    expect(html).toContain("France");
    expect(html).toContain("Argentina");
    expect(html).toContain("Projected champion");
    expect(html).not.toContain("Awaiting bracket resolution");
    expect(html).not.toContain("Unknown Team");
  });

  test("renders podium teams from the corrected provider-backed knockout path", () => {
    const html = renderToStaticMarkup(
      <HomeTournamentOutlook
        projection={knockoutProjection({
          champion: projected("Morocco"),
          runnerUp: projected("Brazil"),
          thirdPlace: projected("Canada")
        })}
      />
    );

    expect(html).toContain("Morocco");
    expect(html).toContain("Brazil");
    expect(html).toContain("Canada");
    expect(html).not.toContain("Unknown Team");
    expect(html).not.toContain("???");
  });

  test("labels an officially decided champion as official instead of projected", () => {
    const html = renderToStaticMarkup(
      <HomeTournamentOutlook
        projection={knockoutProjection({
          champion: { team: "Brazil", resolution: "official" },
          runnerUp: { team: "France", resolution: "official" },
          thirdPlace: projected("Argentina")
        })}
      />
    );

    expect(html).toContain("Official champion");
    expect(html).toContain("Official runner-up");
    expect(html).toContain("Projected third place");
  });
});
