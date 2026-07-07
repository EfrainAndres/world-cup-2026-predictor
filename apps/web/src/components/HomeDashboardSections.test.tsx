import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { ProductionRuntimeDiagnostics } from "../lib/server-runtime";
import type {
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesProviderMetadata,
  WorldCup2026DailyMatchesSuccessResponse
} from "../lib/api-client";
import { HomeTechnicalStatus, HomeTodayMatches } from "./HomeDashboardSections";

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
