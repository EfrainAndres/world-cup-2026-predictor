import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { HealthResponse, ModelInfoResponse } from "@world-cup-2026-predictor/api";
import type { ProductionRuntimeDiagnostics } from "../lib/server-runtime";
import { ModelStatusCard } from "./ModelStatusCard";

const metadata = {
  apiVersion: "api-foundation-v1",
  mode: "pure_handlers" as const,
  serverEnabled: false,
  databaseEnabled: false,
  externalServicesEnabled: false,
  notes: []
};

const health: HealthResponse = {
  status: "ok",
  service: "world-cup-2026-predictor-api",
  version: "0.1.0",
  metadata
};

const modelInfo: ModelInfoResponse = {
  status: "ok",
  modelPackage: "@world-cup-2026-predictor/model",
  modelScope: [],
  supportedHandlers: [],
  limitations: ["Predictions are not guarantees."],
  metadata
};

const runtimeDiagnostics: ProductionRuntimeDiagnostics = {
  persistenceProviderConfigured: true,
  databaseConnected: true,
  resultsProviderConfigured: true,
  externalProviderActive: true,
  activeProvider: "football_data_org_results_provider",
  localFallbackUsed: false,
  cacheUsed: false,
  fixtureCount: 72,
  fixturesWithKickoff: 72,
  lastSuccessfulSync: "2026-06-10T12:00:00Z",
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
    artifactSourceKind: "unavailable" as const
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

describe("ModelStatusCard", () => {
  test("renders live runtime status from diagnostics instead of static disabled labels", () => {
    const html = renderToStaticMarkup(
      <ModelStatusCard
        health={health}
        modelInfo={modelInfo}
        runtimeDiagnostics={runtimeDiagnostics}
      />
    );

    expect(html).toContain("Live provider active");
    expect(html).toContain("Connected");
    expect(html).toContain("football_data_org_results_provider");
    expect(html).toContain("72 / 72");
    expect(html).not.toContain(">Disabled<");
  });
});
