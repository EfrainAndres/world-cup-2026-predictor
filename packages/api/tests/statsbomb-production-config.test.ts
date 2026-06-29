import { describe, expect, it } from "vitest";
import type { TeamPerformanceProfile } from "../src/providers/statsbomb/index.js";
import { teamNameToId } from "../src/providers/statsbomb/statsbomb-team-mapping.js";
import {
  evaluateStatsBombProductionActivationGate,
  parseStatsBombPredictionSignalEnabled,
  parseStatsBombRolloutMode,
  validateStatsBombProductionArtifact
} from "../src/statsbomb-production-config.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/world-cup-2026-teams.js";

function makeProfile(team: string, overrides: Partial<TeamPerformanceProfile> = {}): TeamPerformanceProfile {
  return {
    provider: "statsbomb_open_data",
    teamId: teamNameToId(team),
    canonicalName: team,
    cutoffAt: "2026-06-01T00:00:00.000Z",
    latestMatchAt: "2024-07-01",
    matchCount: 15,
    minutesPlayed: 1350,
    shotCountFor: 120,
    shotCountAgainst: 90,
    xgSampleCountFor: 120,
    xgSampleCountAgainst: 90,
    totalXgFor: 18,
    totalXgAgainst: 12,
    xgForPer90: 1.2,
    xgAgainstPer90: 0.8,
    goalsFor: 16,
    goalsAgainst: 10,
    goalsForPer90: 1.07,
    goalsAgainstPer90: 0.67,
    shotQualityFor: 0.15,
    shotQualityAgainst: 0.13,
    uniqueOpponentCount: 10,
    coverage: "full",
    freshness: "fresh",
    sources: [],
    warnings: [],
    ...overrides
  };
}

function makeArtifact(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-06-29T19:48:39.341Z",
    cutoffAt: "2026-06-01T00:00:00.000Z",
    profiles: WORLD_CUP_2026_TEAM_NAMES.map((team) => makeProfile(team)),
    ...overrides
  };
}

describe("StatsBomb production configuration", () => {
  it("enables the legacy boolean only for explicit true values", () => {
    expect(parseStatsBombPredictionSignalEnabled("true")).toBe(true);
    expect(parseStatsBombPredictionSignalEnabled("1")).toBe(true);
    expect(parseStatsBombPredictionSignalEnabled(" TRUE ")).toBe(true);
    expect(parseStatsBombPredictionSignalEnabled(undefined)).toBe(false);
    expect(parseStatsBombPredictionSignalEnabled("false")).toBe(false);
    expect(parseStatsBombPredictionSignalEnabled("0")).toBe(false);
    expect(parseStatsBombPredictionSignalEnabled("yes")).toBe(false);
  });

  it("uses rollout mode as authoritative and falls back to the legacy boolean", () => {
    expect(parseStatsBombRolloutMode(undefined, undefined)).toBe("off");
    expect(parseStatsBombRolloutMode(undefined, "true")).toBe("on");
    expect(parseStatsBombRolloutMode("shadow", "false")).toBe("shadow");
    expect(parseStatsBombRolloutMode("on", "false")).toBe("on");
    expect(parseStatsBombRolloutMode("off", "true")).toBe("off");
    expect(parseStatsBombRolloutMode("invalid", "true")).toBe("off");
  });

  it("marks a valid 48-profile artifact ready", () => {
    const result = validateStatsBombProductionArtifact(makeArtifact(), "2026-07-01T00:00:00.000Z");

    expect(result.readiness).toEqual({
      ready: true,
      profileCount: 48,
      cutoffAt: "2026-06-01T00:00:00.000Z",
      generatedAt: "2026-06-29T19:48:39.341Z"
    });
    expect(result.profiles).toHaveLength(48);
  });

  it("blocks invalid production artifacts with typed reasons", () => {
    expect(validateStatsBombProductionArtifact(null).readiness).toEqual({ ready: false, reason: "artifact_unreadable" });
    expect(validateStatsBombProductionArtifact(makeArtifact({ status: "placeholder" })).readiness).toEqual({
      ready: false,
      reason: "artifact_placeholder"
    });
    expect(validateStatsBombProductionArtifact(makeArtifact({ schemaVersion: "2.0.0" })).readiness).toEqual({
      ready: false,
      reason: "schema_unsupported"
    });
    expect(validateStatsBombProductionArtifact(makeArtifact({ profiles: [] })).readiness).toEqual({
      ready: false,
      reason: "profile_count_invalid"
    });

    const duplicateProfiles = WORLD_CUP_2026_TEAM_NAMES.map((team) => makeProfile(team));
    const duplicateTeamId = duplicateProfiles[0]?.teamId;
    if (duplicateTeamId === undefined) throw new Error("Expected first profile");
    duplicateProfiles[1] = makeProfile(WORLD_CUP_2026_TEAM_NAMES[1] ?? "Canada", { teamId: duplicateTeamId });
    expect(validateStatsBombProductionArtifact(makeArtifact({ profiles: duplicateProfiles })).readiness).toEqual({
      ready: false,
      reason: "duplicate_team_id"
    });

    const invalidMetricProfiles = WORLD_CUP_2026_TEAM_NAMES.map((team) => makeProfile(team));
    invalidMetricProfiles[0] = makeProfile(WORLD_CUP_2026_TEAM_NAMES[0] ?? "Mexico", { matchCount: -1 });
    expect(validateStatsBombProductionArtifact(makeArtifact({ profiles: invalidMetricProfiles })).readiness).toEqual({
      ready: false,
      reason: "invalid_metric"
    });

    expect(validateStatsBombProductionArtifact(makeArtifact(), "2026-10-01T00:00:00.000Z").readiness).toEqual({
      ready: false,
      reason: "artifact_stale"
    });
  });

  it("evaluates activation gates without trusting environment mode alone", () => {
    const readiness = {
      ready: true,
      profileCount: 48,
      cutoffAt: "2026-06-01T00:00:00.000Z",
      generatedAt: "2026-06-29T19:48:39.341Z"
    } as const;

    expect(evaluateStatsBombProductionActivationGate({ mode: "off", readiness })).toBe("disabled");
    expect(evaluateStatsBombProductionActivationGate({ mode: "shadow", readiness })).toBe("shadow_ready");
    expect(
      evaluateStatsBombProductionActivationGate({
        mode: "on",
        readiness,
        backtestDecision: "data_quality_blocked",
        dataQualityDecision: "weighted_replay_ready"
      })
    ).toBe("blocked_validation");
    expect(
      evaluateStatsBombProductionActivationGate({
        mode: "on",
        readiness,
        backtestDecision: "promote_signal_candidate",
        dataQualityDecision: "replay_still_compressed"
      })
    ).toBe("blocked_validation");
    expect(
      evaluateStatsBombProductionActivationGate({
        mode: "on",
        readiness,
        backtestDecision: "promote_signal_candidate",
        dataQualityDecision: "weighted_replay_ready"
      })
    ).toBe("production_ready");
    expect(
      evaluateStatsBombProductionActivationGate({
        mode: "on",
        readiness: { ready: false, reason: "artifact_missing" }
      })
    ).toBe("blocked_artifact");
  });
});
