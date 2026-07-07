import { describe, expect, test } from "vitest";
import type { ModelInfoResponse } from "@world-cup-2026-predictor/api";
import {
  buildHomeSystemStatusSummary,
  buildModelDisclosureSummary,
  summarizeProviderWarnings,
  summarizeRepeatedProjectionWarnings
} from "./technical-disclosure";
import type { ProductionRuntimeDiagnostics } from "./server-runtime";

function makeRuntimeDiagnostics(overrides: Partial<ProductionRuntimeDiagnostics> = {}): ProductionRuntimeDiagnostics {
  return {
    persistenceProviderConfigured: true,
    databaseConnected: true,
    resultsProviderConfigured: true,
    externalProviderActive: true,
    activeProvider: "football-data.org",
    localFallbackUsed: false,
    cacheUsed: false,
    fixtureCount: 72,
    fixturesWithKickoff: 72,
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
    warnings: [],
    ...overrides
  };
}

function makeModelInfo(overrides: Partial<ModelInfoResponse> = {}): ModelInfoResponse {
  return {
    status: "ok",
    modelPackage: "@world-cup-2026-predictor/model",
    modelScope: [],
    supportedHandlers: [],
    limitations: [],
    metadata: {
      apiVersion: "0.1.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: true,
      externalServicesEnabled: false,
      notes: []
    },
    ...overrides
  };
}

describe("technical-disclosure helpers", () => {
  test("groups repeated provider warnings into concise summary items", () => {
    const warnings = [
      "Fixture '537417' is missing a provider group label.",
      "Fixture '537423' is missing a provider group label.",
      "Fixture '537417' could not be resolved to a canonical World Cup 2026 group-stage fixture.",
      "Fixture '537423' could not be resolved to a canonical World Cup 2026 group-stage fixture.",
      "Provider standings include ungrouped rows and were not used as grouped standings truth."
    ];

    const result = summarizeProviderWarnings(warnings, {
      cacheUsed: false,
      localFallbackUsed: false,
      stale: false
    });

    expect(result.notice).toContain("could not be mapped");
    expect(result.summaryItems).toContain("2 provider fixtures are missing group labels.");
    expect(result.summaryItems).toContain("2 provider fixtures could not be mapped to canonical WC2026 fixtures.");
    expect(result.summaryItems).toContain("Provider standings included ungrouped rows.");
    expect(result.summaryItems).toContain("Grouped standings were derived from validated match records.");
    expect(result.summaryItems).toContain("No local fallback was used.");
    expect(result.rawWarnings).toEqual(warnings);
  });

  test("builds a compact home system-status line", () => {
    const result = buildHomeSystemStatusSummary(makeRuntimeDiagnostics(), "v2");
    expect(result).toBe("Live data connected · Persistence connected · Model v2 active");
  });

  test("builds model disclosure summary labels", () => {
    const result = buildModelDisclosureSummary(makeModelInfo());
    expect(result.scopeSummary).toContain("Live Elo + Elo-to-xG V2");
    expect(result.limitationSummary).toContain("PostgreSQL required for persistent evidence");
  });

  test("promotes repeated projection warnings to a shared section and removes per-fixture duplicates", () => {
    const result = summarizeRepeatedProjectionWarnings([
      {
        fixtureId: "one",
        warnings: ["Auto Predict used fallback seed rating.", "Fixture-specific warning."]
      },
      {
        fixtureId: "two",
        warnings: ["Auto Predict used fallback seed rating."]
      }
    ]);

    expect(result.sharedWarnings).toEqual([
      { warning: "Auto Predict used fallback seed rating.", fixtureCount: 2 }
    ]);
    expect(result.fixtureWarningsById.get("one")).toEqual(["Fixture-specific warning."]);
    expect(result.fixtureWarningsById.get("two")).toEqual([]);
  });
});
