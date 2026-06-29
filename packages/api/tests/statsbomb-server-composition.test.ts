import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamPerformanceProfile } from "../src/providers/statsbomb/index.js";
import { teamNameToId } from "../src/providers/statsbomb/statsbomb-team-mapping.js";
import {
  createProductionPredictionDependencies,
  resetStatsBombProductionCache,
  STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH,
  STATSBOMB_PROFILES_ARTIFACT_PATH
} from "../src/statsbomb-server-composition.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/world-cup-2026-teams.js";

function makeProfile(team: string): TeamPerformanceProfile {
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
    warnings: []
  };
}

function profileArtifact() {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-06-29T19:48:39.341Z",
    cutoffAt: "2026-06-01T00:00:00.000Z",
    profiles: WORLD_CUP_2026_TEAM_NAMES.map((team) => makeProfile(team))
  };
}

function backtestArtifact(overrides: Record<string, unknown> = {}) {
  return {
    dataQualityDecision: { decision: "weighted_replay_ready" },
    strategies: [
      {
        strategy: "expanded_international_weighted",
        statsBombDecision: { decision: "promote_signal_candidate" }
      }
    ],
    ...overrides
  };
}

function makeReadFile(input: { profile?: unknown; backtest?: unknown } = {}) {
  return vi.fn((path: string) => {
    if (path.includes("statsbomb-team-performance-profiles")) {
      return JSON.stringify(input.profile ?? profileArtifact());
    }
    if (path.includes("statsbomb-backtesting-expanded-elo")) {
      return JSON.stringify(input.backtest ?? backtestArtifact());
    }
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  });
}

describe("StatsBomb artifact path constants", () => {
  it("STATSBOMB_PROFILES_ARTIFACT_PATH is absolute and ends with the compact profile filename", () => {
    expect(isAbsolute(STATSBOMB_PROFILES_ARTIFACT_PATH)).toBe(true);
    expect(STATSBOMB_PROFILES_ARTIFACT_PATH).toMatch(/statsbomb-team-performance-profiles\.json$/);
  });

  it("STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH is absolute and ends with the backtesting filename", () => {
    expect(isAbsolute(STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH)).toBe(true);
    expect(STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH).toMatch(/statsbomb-backtesting-expanded-elo\.json$/);
  });

  it("both artifact paths resolve to files that are tracked in the repository", () => {
    expect(existsSync(STATSBOMB_PROFILES_ARTIFACT_PATH)).toBe(true);
    expect(existsSync(STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH)).toBe(true);
  });

  it("both artifact paths share the same docs/model-results/artifacts directory", () => {
    const profileDir = STATSBOMB_PROFILES_ARTIFACT_PATH.replace(/[^/\\]+$/, "");
    const backtestDir = STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH.replace(/[^/\\]+$/, "");
    expect(profileDir).toBe(backtestDir);
    expect(profileDir).toMatch(/docs[/\\]model-results[/\\]artifacts[/\\]$/);
  });

  it("artifact path is deterministic — calling the module twice yields the same constant", async () => {
    const { STATSBOMB_PROFILES_ARTIFACT_PATH: path2 } = await import("../src/statsbomb-server-composition.js");
    expect(path2).toBe(STATSBOMB_PROFILES_ARTIFACT_PATH);
  });
});

describe("StatsBomb production server composition", () => {
  beforeEach(() => {
    resetStatsBombProductionCache();
  });

  it("does not load the artifact in off mode", () => {
    const readFile = makeReadFile();
    const deps = createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "off" },
      now: "2026-07-01T00:00:00.000Z",
      readFile
    });

    expect(deps.statsBombSignalMode).toBe("off");
    expect(deps.statsBombActivationDecision).toBe("disabled");
    expect(deps.statsBombDiagnostics.lastLoadStatus).toBe("not_attempted");
    expect(deps.statsBombProfileSource).toBeUndefined();
    expect(readFile).not.toHaveBeenCalled();
  });

  it("loads a ready artifact in shadow mode and keeps shadow authoritative mode", () => {
    const readFile = makeReadFile();
    const deps = createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "shadow" },
      now: "2026-07-01T00:00:00.000Z",
      readFile
    });

    expect(deps.statsBombSignalMode).toBe("shadow");
    expect(deps.statsBombActivationDecision).toBe("shadow_ready");
    expect(deps.statsBombReadiness.ready).toBe(true);
    expect(deps.statsBombDiagnostics.artifactReady).toBe(true);
    expect(deps.statsBombProfileSource?.getAvailableTeamIds()).toHaveLength(48);
  });

  it("requires validated backtest evidence before production on mode", () => {
    const readFile = makeReadFile({
      backtest: backtestArtifact({
        strategies: [
          {
            strategy: "expanded_international_weighted",
            statsBombDecision: { decision: "data_quality_blocked" }
          }
        ]
      })
    });
    const deps = createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "on" },
      now: "2026-07-01T00:00:00.000Z",
      readFile
    });

    expect(deps.statsBombSignalMode).toBe("on");
    expect(deps.statsBombActivationDecision).toBe("blocked_validation");
    expect(deps.statsBombReadiness.ready).toBe(true);
  });

  it("enters production-ready on mode when artifact and backtest gates pass", () => {
    const deps = createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "on" },
      now: "2026-07-01T00:00:00.000Z",
      readFile: makeReadFile()
    });

    expect(deps.statsBombSignalMode).toBe("on");
    expect(deps.statsBombActivationDecision).toBe("production_ready");
    expect(deps.statsBombProfileSource?.getAvailableTeamIds()).toHaveLength(48);
  });

  it("falls back safely when the artifact is missing or unreadable", () => {
    const missingReadFile = vi.fn((path: string) => {
      if (path.includes("statsbomb-team-performance-profiles")) {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }
      return JSON.stringify(backtestArtifact());
    });
    const missing = createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "on" },
      now: "2026-07-01T00:00:00.000Z",
      readFile: missingReadFile
    });
    expect(missing.statsBombReadiness).toEqual({ ready: false, reason: "artifact_missing" });
    expect(missing.statsBombActivationDecision).toBe("blocked_artifact");
    expect(missing.statsBombProfileSource).toBeUndefined();

    resetStatsBombProductionCache();
    const unreadable = createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "on" },
      now: "2026-07-01T00:00:00.000Z",
      readFile: makeReadFile({ profile: "not-json" })
    });
    expect(unreadable.statsBombReadiness).toEqual({ ready: false, reason: "artifact_unreadable" });
    expect(unreadable.statsBombProfileSource).toBeUndefined();
  });

  it("caches successful artifact loads and reset clears the cache", () => {
    const readFile = makeReadFile();

    createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "shadow" },
      now: "2026-07-01T00:00:00.000Z",
      readFile
    });
    createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "shadow" },
      now: "2026-07-01T00:00:01.000Z",
      readFile
    });

    const profileReadsBeforeReset = readFile.mock.calls.filter(([path]) =>
      path.includes("statsbomb-team-performance-profiles")
    );
    expect(profileReadsBeforeReset).toHaveLength(1);

    resetStatsBombProductionCache();
    createProductionPredictionDependencies({
      env: { STATSBOMB_PREDICTION_SIGNAL_MODE: "shadow" },
      now: "2026-07-01T00:00:02.000Z",
      readFile
    });
    const profileReadsAfterReset = readFile.mock.calls.filter(([path]) =>
      path.includes("statsbomb-team-performance-profiles")
    );
    expect(profileReadsAfterReset).toHaveLength(2);
  });
});
