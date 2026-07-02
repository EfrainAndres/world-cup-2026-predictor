import { describe, test, expect, beforeEach } from "vitest";
import { buildPredictionTelemetryPayload } from "../src/prediction-telemetry.js";
import { predictMatchFromLiveElo } from "../src/routes.js";
import { createAttackDefenseProductionDependencies } from "../src/attack-defense-server-composition.js";
import { resetAttackDefenseRuntimeProfileCache } from "../src/attack-defense-runtime-profile-source.server.js";
import { findFirstEligibleAttackDefenseRuntimeMatchup } from "../src/attack-defense-runtime-profile-source.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(
  __dir,
  "../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json"
);

function loadRealArtifact(): unknown {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

function findEligibleFixture(): { homeTeam: string; awayTeam: string } {
  const deps = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
    selectedCandidateArtifact: loadRealArtifact(),
  });
  if (deps.attackDefenseProfiles === undefined) throw new Error("Expected AD profiles");
  const fixture = findFirstEligibleAttackDefenseRuntimeMatchup(deps.attackDefenseProfiles.profiles);
  if (fixture === null) throw new Error("Expected at least one eligible matchup");
  return fixture;
}

const TIMESTAMP = "2026-06-26T00:00:00.000Z";

beforeEach(() => {
  resetAttackDefenseRuntimeProfileCache();
});

describe("buildPredictionTelemetryPayload — baseline only", () => {
  test("builds a complete payload with null AD and SB sections", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);

    expect(payload.timestamp).toBe(TIMESTAMP);
    expect(payload.matchup.homeTeam).toBe("Brazil");
    expect(payload.matchup.awayTeam).toBe("Argentina");
    expect(payload.pipeline.eloBaselineXg.home).toBeGreaterThan(0);
    expect(payload.pipeline.eloBaselineXg.away).toBeGreaterThan(0);
    expect(payload.pipeline.finalXg.home).toBeGreaterThan(0);
    expect(payload.pipeline.finalXg.away).toBeGreaterThan(0);
    expect(payload.pipeline.attackDefense).toBeNull();
    expect(payload.pipeline.statsBomb).toBeNull();
  });

  test("outcomes sum to approximately 1.0", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    const sum =
      payload.outcomes.homeWinProbability + payload.outcomes.drawProbability + payload.outcomes.awayWinProbability;
    expect(sum).toBeCloseTo(1.0, 3);
  });

  test("recommendation contains non-negative goal counts", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    expect(payload.recommendation.recommendedScore.homeGoals).toBeGreaterThanOrEqual(0);
    expect(payload.recommendation.recommendedScore.awayGoals).toBeGreaterThanOrEqual(0);
    expect(payload.recommendation.modalScore.homeGoals).toBeGreaterThanOrEqual(0);
    expect(payload.recommendation.modalScore.awayGoals).toBeGreaterThanOrEqual(0);
  });
});

describe("buildPredictionTelemetryPayload — AD section authority", () => {
  test("AD on + SB off: AD is stage-authoritative and final-authoritative", () => {
    const fixture = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    const result = predictMatchFromLiveElo({ homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam }, deps);
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    const ad = payload.pipeline.attackDefense;
    expect(ad).not.toBeNull();
    if (ad === null) return;

    expect(ad.applied).toBe(true);
    expect(ad.stageAuthoritative).toBe(true);
    expect(ad.finalAuthoritative).toBe(true);
  });

  test("AD shadow: applied=false, stageAuthoritative=false, finalAuthoritative=false", () => {
    const fixture = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    const result = predictMatchFromLiveElo({ homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam }, deps);
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    const ad = payload.pipeline.attackDefense;
    expect(ad).not.toBeNull();
    if (ad === null) return;

    expect(ad.applied).toBe(false);
    expect(ad.stageAuthoritative).toBe(false);
    expect(ad.finalAuthoritative).toBe(false);
  });
});

describe("buildPredictionTelemetryPayload — artifact diagnostics", () => {
  test("artifact diagnostics are included when provided", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const diagnostics = {
      adFingerprint: "sha256:testfingerprint",
      adFingerprintShort: "testfp",
      adCandidateId: "test_candidate_id",
      adProfileCount: 32,
      adSourceFixtureCount: 1200,
    };

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP, diagnostics);
    expect(payload.artifact.adFingerprint).toBe("sha256:testfingerprint");
    expect(payload.artifact.adFingerprintShort).toBe("testfp");
    expect(payload.artifact.adCandidateId).toBe("test_candidate_id");
    expect(payload.artifact.adProfileCount).toBe(32);
    expect(payload.artifact.adSourceFixtureCount).toBe(1200);
  });

  test("artifact section is empty when no diagnostics and no AD", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    expect(payload.artifact.adFingerprint).toBeUndefined();
    expect(payload.artifact.adCandidateId).toBeUndefined();
    expect(payload.artifact.sbSignalVersion).toBeUndefined();
  });
});

describe("buildPredictionTelemetryPayload — privacy constraints", () => {
  test("payload does not contain filesystem paths", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    const json = JSON.stringify(payload);

    expect(json).not.toMatch(/\/Users\//);
    expect(json).not.toMatch(/\/home\//);
    expect(json).not.toMatch(/node_modules/);
    expect(json).not.toMatch(/\.json/);
  });

  test("payload does not contain raw fixture arrays or credentials", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    if (result.status !== "success") throw new Error("Expected success");

    const payload = buildPredictionTelemetryPayload(result, TIMESTAMP);
    const json = JSON.stringify(payload);

    expect(json).not.toMatch(/password/i);
    expect(json).not.toMatch(/secret/i);
    expect(json).not.toMatch(/token/i);
    expect(json).not.toMatch(/"fixtures"/);
    expect(json).not.toMatch(/"profiles"\s*:/);
  });
});
