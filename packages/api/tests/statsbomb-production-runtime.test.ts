import { describe, expect, it } from "vitest";
import type { TeamPerformanceProfile } from "../src/providers/statsbomb/index.js";
import { createInMemoryTeamPerformanceProfileSource } from "../src/statsbomb-artifact-profile-source.js";
import type { StatsBombProductionReadiness } from "../src/statsbomb-production-config.js";
import { predictMatchFromLiveElo } from "../src/routes.js";

const READY: StatsBombProductionReadiness = {
  ready: true,
  profileCount: 48,
  cutoffAt: "2026-06-01T00:00:00.000Z",
  generatedAt: "2026-06-29T19:48:39.341Z"
};

function makeProfile(
  overrides: Partial<TeamPerformanceProfile> & { teamId: string; canonicalName: string }
): TeamPerformanceProfile {
  return {
    provider: "statsbomb_open_data",
    cutoffAt: "2026-06-01T00:00:00.000Z",
    latestMatchAt: "2024-07-01",
    matchCount: 15,
    minutesPlayed: 1350,
    shotCountFor: 120,
    shotCountAgainst: 80,
    xgSampleCountFor: 100,
    xgSampleCountAgainst: 70,
    totalXgFor: 18,
    totalXgAgainst: 12,
    xgForPer90: 1.2,
    xgAgainstPer90: 0.8,
    goalsFor: 20,
    goalsAgainst: 10,
    goalsForPer90: 1.33,
    goalsAgainstPer90: 0.67,
    shotQualityFor: 0.15,
    shotQualityAgainst: 0.15,
    uniqueOpponentCount: 10,
    coverage: "full",
    freshness: "fresh",
    sources: [],
    warnings: [],
    ...overrides
  };
}

function profileSource() {
  return createInMemoryTeamPerformanceProfileSource([
    makeProfile({
      teamId: "france",
      canonicalName: "France",
      xgForPer90: 1.7,
      xgAgainstPer90: 0.6
    }),
    makeProfile({
      teamId: "brazil",
      canonicalName: "Brazil",
      xgForPer90: 1.1,
      xgAgainstPer90: 1.3
    })
  ]);
}

describe("StatsBomb controlled production runtime", () => {
  it("keeps off mode baseline-authoritative and does not require a profile source", () => {
    const baseline = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil", preset: "balanced" });
    const controlled = predictMatchFromLiveElo(
      { homeTeam: "France", awayTeam: "Brazil", preset: "balanced" },
      {
        statsBombSignalMode: "off",
        statsBombReadiness: { ready: false, reason: "feature_disabled" },
        statsBombActivationDecision: "disabled"
      }
    );

    expect(baseline.status).toBe("success");
    expect(controlled.status).toBe("success");
    if (baseline.status !== "success" || controlled.status !== "success") return;

    expect(controlled.request.expectedHomeGoals).toBe(baseline.request.expectedHomeGoals);
    expect(controlled.request.expectedAwayGoals).toBe(baseline.request.expectedAwayGoals);
    expect(controlled.statsBombSignal).toMatchObject({
      enabled: false,
      applied: false,
      reason: "disabled",
      rolloutMode: "off",
      authoritative: "baseline"
    });
  });

  it("computes shadow comparison while preserving baseline authoritative output", () => {
    const baseline = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil", preset: "balanced" });
    const shadow = predictMatchFromLiveElo(
      { homeTeam: "France", awayTeam: "Brazil", preset: "balanced" },
      {
        statsBombProfileSource: profileSource(),
        statsBombSignalMode: "shadow",
        statsBombReadiness: READY,
        statsBombActivationDecision: "shadow_ready"
      }
    );

    expect(baseline.status).toBe("success");
    expect(shadow.status).toBe("success");
    if (baseline.status !== "success" || shadow.status !== "success") return;

    expect(shadow.request.expectedHomeGoals).toBe(baseline.request.expectedHomeGoals);
    expect(shadow.request.expectedAwayGoals).toBe(baseline.request.expectedAwayGoals);
    expect(shadow.statsBombSignal?.enabled).toBe(true);
    expect(shadow.statsBombSignal?.applied).toBe(false);
    expect(shadow.statsBombSignal?.reason).toBe("applied");
    expect(shadow.statsBombSignal?.authoritative).toBe("baseline");
    expect(shadow.statsBombSignal?.shadowAdjustedExpectedGoals?.home).not.toBe(baseline.request.expectedHomeGoals);
  });

  it("applies the signal in production-ready on mode", () => {
    const baseline = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil", preset: "balanced" });
    const enriched = predictMatchFromLiveElo(
      { homeTeam: "France", awayTeam: "Brazil", preset: "balanced" },
      {
        statsBombProfileSource: profileSource(),
        statsBombSignalMode: "on",
        statsBombReadiness: READY,
        statsBombActivationDecision: "production_ready"
      }
    );

    expect(baseline.status).toBe("success");
    expect(enriched.status).toBe("success");
    if (baseline.status !== "success" || enriched.status !== "success") return;

    expect(enriched.statsBombSignal).toMatchObject({
      enabled: true,
      applied: true,
      reason: "applied",
      rolloutMode: "on",
      activationDecision: "production_ready",
      authoritative: "statsbomb",
      signalVersion: "statsbomb-signal-v1",
      provider: "statsbomb_open_data"
    });
    expect(enriched.request.expectedHomeGoals).not.toBe(baseline.request.expectedHomeGoals);
    expect(enriched.request.expectedAwayGoals).not.toBe(baseline.request.expectedAwayGoals);
    expect(Number.isFinite(enriched.request.expectedHomeGoals)).toBe(true);
    expect(Number.isFinite(enriched.outcomeProbabilities.homeWinProbability)).toBe(true);
  });

  it("falls back to baseline in on mode when readiness is blocked or a profile is missing", () => {
    const baseline = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil", preset: "balanced" });
    const sourceUnavailable = predictMatchFromLiveElo(
      { homeTeam: "France", awayTeam: "Brazil", preset: "balanced" },
      {
        statsBombSignalMode: "on",
        statsBombReadiness: { ready: false, reason: "artifact_missing" },
        statsBombActivationDecision: "blocked_artifact"
      }
    );
    const missingProfile = predictMatchFromLiveElo(
      { homeTeam: "France", awayTeam: "Brazil", preset: "balanced" },
      {
        statsBombProfileSource: createInMemoryTeamPerformanceProfileSource([
          makeProfile({ teamId: "france", canonicalName: "France" })
        ]),
        statsBombSignalMode: "on",
        statsBombReadiness: READY,
        statsBombActivationDecision: "production_ready"
      }
    );

    expect(baseline.status).toBe("success");
    expect(sourceUnavailable.status).toBe("success");
    expect(missingProfile.status).toBe("success");
    if (baseline.status !== "success" || sourceUnavailable.status !== "success" || missingProfile.status !== "success") return;

    expect(sourceUnavailable.request.expectedHomeGoals).toBe(baseline.request.expectedHomeGoals);
    expect(sourceUnavailable.statsBombSignal?.reason).toBe("source_unavailable");
    expect(sourceUnavailable.statsBombSignal?.applied).toBe(false);

    expect(missingProfile.request.expectedHomeGoals).toBe(baseline.request.expectedHomeGoals);
    expect(missingProfile.statsBombSignal?.reason).toBe("away_profile_missing");
    expect(missingProfile.statsBombSignal?.applied).toBe(false);
  });

  it("preserves the existing request-level opt-in behavior outside server-controlled production mode", () => {
    const baseline = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil", preset: "balanced" });
    const requestOptIn = predictMatchFromLiveElo(
      {
        homeTeam: "France",
        awayTeam: "Brazil",
        preset: "balanced",
        statsBombSignal: { enabled: true, cutoffAt: "2026-06-01T00:00:00.000Z" }
      },
      { statsBombProfileSource: profileSource() }
    );

    expect(baseline.status).toBe("success");
    expect(requestOptIn.status).toBe("success");
    if (baseline.status !== "success" || requestOptIn.status !== "success") return;

    expect(requestOptIn.statsBombSignal?.rolloutMode).toBeUndefined();
    expect(requestOptIn.statsBombSignal?.applied).toBe(true);
    expect(requestOptIn.request.expectedHomeGoals).not.toBe(baseline.request.expectedHomeGoals);
  });
});
