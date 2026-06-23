/**
 * Phase 12.18A2 — Pre-Match Capture Activation Preflight tests.
 *
 * Tests focus on configuration checks, provider readiness, and the preflight
 * orchestration. They do NOT duplicate the capture contract tests from
 * prematch-snapshot-capture.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  assessProviderReadiness,
  runPreMatchCaptureActivationPreflight,
  type DatabaseConnectivityResult,
  type ProviderReadinessReport
} from "../src/prematch-capture-preflight.js";
import type { WorldCup2026SyncResult } from "../src/schemas.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const INSIDE_WINDOW = "2026-06-18T12:00:00.000Z";
const KICKOFF = "2026-06-18T20:00:00.000Z";
const TOO_EARLY = "2026-05-01T00:00:00.000Z";

function makeSyncResult(
  overrides: Partial<WorldCup2026SyncResult> = {}
): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: INSIDE_WINDOW,
    fixtures: [],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

type FixtureRecord = WorldCup2026SyncResult["fixtures"][number];

type FixtureOverrides = {
  homeTeam?: string;
  awayTeam?: string;
  kickoffAt?: string | null; // null = omit the field (no kickoffAt on record)
  status?: FixtureRecord["status"];
};

function makeFixture(overrides: FixtureOverrides = {}): FixtureRecord {
  const { kickoffAt: koOverride, homeTeam, awayTeam, status } = overrides;
  const kickoffAt = koOverride === null ? undefined : (koOverride ?? KICKOFF);
  return {
    providerFixtureId: "test-fixture-01",
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: homeTeam ?? "Mexico",
    awayTeam: awayTeam ?? "South Africa",
    status: status ?? "scheduled",
    ...(kickoffAt !== undefined ? { kickoffAt } : {})
  };
}

const VALID_ENV: Record<string, string> = {
  PERSISTENCE_PROVIDER: "postgres",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
  RESULTS_PROVIDER: "football_data_org",
  FOOTBALL_DATA_API_TOKEN: "test-token-abc"
};

const CONNECTED: DatabaseConnectivityResult = { connected: true };
const DISCONNECTED: DatabaseConnectivityResult = { connected: false, error: "connection_failed" };

// ---------------------------------------------------------------------------
// Configuration checks
// ---------------------------------------------------------------------------

describe("configuration checks", () => {
  it("returns blocked_configuration when PERSISTENCE_PROVIDER is not postgres", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: { ...VALID_ENV, PERSISTENCE_PROVIDER: "memory" }
    });
    expect(result.status).toBe("blocked_configuration");
    expect(result.checks.persistenceProviderConfigured).toBe(false);
    expect(result.issues.some((i) => i.includes("PERSISTENCE_PROVIDER"))).toBe(true);
  });

  it("returns blocked_configuration when DATABASE_URL is absent", async () => {
    const env: Record<string, string | undefined> = { ...VALID_ENV, DATABASE_URL: undefined };
    const result = await runPreMatchCaptureActivationPreflight({ env });
    expect(result.status).toBe("blocked_configuration");
    expect(result.checks.databaseUrlConfigured).toBe(false);
    expect(result.issues.some((i) => i.includes("DATABASE_URL"))).toBe(true);
  });

  it("returns blocked_configuration when RESULTS_PROVIDER is not football_data_org", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: { ...VALID_ENV, RESULTS_PROVIDER: "local" }
    });
    expect(result.status).toBe("blocked_configuration");
    expect(result.checks.providerConfigured).toBe(false);
    expect(result.issues.some((i) => i.includes("RESULTS_PROVIDER"))).toBe(true);
  });

  it("returns blocked_configuration when FOOTBALL_DATA_API_TOKEN is absent", async () => {
    const env: Record<string, string | undefined> = { ...VALID_ENV, FOOTBALL_DATA_API_TOKEN: undefined };
    const result = await runPreMatchCaptureActivationPreflight({ env });
    expect(result.status).toBe("blocked_configuration");
    expect(result.checks.providerConfigured).toBe(false);
    expect(result.issues.some((i) => i.includes("FOOTBALL_DATA_API_TOKEN"))).toBe(true);
  });

  it("sets all configuration checks true when env is valid (before IO)", async () => {
    // Will fail at DB step since we don't provide checkDatabaseConnectivity
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () => makeSyncResult({ localFallbackUsed: true })
    });
    expect(result.checks.persistenceProviderConfigured).toBe(true);
    expect(result.checks.databaseUrlConfigured).toBe(true);
    expect(result.checks.providerConfigured).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Database connectivity
// ---------------------------------------------------------------------------

describe("database connectivity", () => {
  it("returns blocked_database when DB connectivity fails", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => DISCONNECTED
    });
    expect(result.status).toBe("blocked_database");
    expect(result.checks.databaseConnectivity).toBe(false);
    expect(result.issues.some((i) => i.includes("Database connectivity"))).toBe(true);
  });

  it("does not expose DATABASE_URL in issues", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => DISCONNECTED
    });
    const issueText = result.issues.join(" ");
    expect(issueText).not.toContain("postgresql://");
    expect(issueText).not.toContain("password");
    expect(issueText).not.toContain(VALID_ENV["DATABASE_URL"]!);
  });

  it("marks database_connectivity as unchecked-but-passing when no checker provided", async () => {
    // No checkDatabaseConnectivity provided → passes through to provider step.
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      synchronize: async () => makeSyncResult({ localFallbackUsed: true })
    });
    expect(result.checks.databaseConnectivity).toBe(true);
    // Fails at provider step.
    expect(result.status).toBe("blocked_provider");
  });
});

// ---------------------------------------------------------------------------
// Provider connectivity
// ---------------------------------------------------------------------------

describe("provider connectivity", () => {
  it("returns blocked_provider when sync fails (status=error)", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () =>
        makeSyncResult({
          status: "error",
          error: {
            code: "provider_unavailable",
            providerId: "football_data_org_results_provider",
            operation: "bundle",
            message: "Unauthorized"
          }
        })
    });
    expect(result.status).toBe("blocked_provider");
    expect(result.checks.providerConnectivity).toBe(false);
  });

  it("returns blocked_provider when sync falls back to local static", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () => makeSyncResult({ localFallbackUsed: true })
    });
    expect(result.status).toBe("blocked_provider");
    expect(result.checks.providerConnectivity).toBe(false);
    expect(result.issues.some((i) => i.includes("local static"))).toBe(true);
  });

  it("returns blocked_provider when synchronize throws", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () => { throw new Error("Network timeout"); }
    });
    expect(result.status).toBe("blocked_provider");
    expect(result.checks.providerConnectivity).toBe(false);
  });

  it("returns blocked_provider when provider returns no fixtures with kickoff", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () =>
        makeSyncResult({ fixtures: [makeFixture({ kickoffAt: null })] })
    });
    expect(result.status).toBe("blocked_provider");
    expect(result.checks.fixturesHaveKickoff).toBe(false);
    expect(result.issues.some((i) => i.includes("kickoff"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ready states
// ---------------------------------------------------------------------------

describe("ready states", () => {
  it("returns ready_no_currently_eligible_fixture when fixtures exist but none in window", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      now: TOO_EARLY,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () => makeSyncResult({ fixtures: [makeFixture()] })
    });
    expect(result.status).toBe("ready_no_currently_eligible_fixture");
    expect(result.checks.captureWindowEvaluable).toBe(true);
    expect(result.providerReadiness?.fixturesInCurrentCaptureWindow).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it("returns ready when at least one fixture is in the capture window", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      now: INSIDE_WINDOW,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () =>
        makeSyncResult({ fixtures: [makeFixture({ kickoffAt: KICKOFF })] })
    });
    expect(result.status).toBe("ready");
    expect(result.providerReadiness?.fixturesInCurrentCaptureWindow).toBeGreaterThan(0);
    expect(result.issues).toHaveLength(0);
  });

  it("does not include FOOTBALL_DATA_API_TOKEN in the result for any status", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: VALID_ENV,
      now: INSIDE_WINDOW,
      checkDatabaseConnectivity: async () => CONNECTED,
      synchronize: async () => makeSyncResult({ fixtures: [makeFixture()] })
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("test-token-abc");
    expect(serialized).not.toContain("postgresql://");
  });
});

// ---------------------------------------------------------------------------
// assessProviderReadiness
// ---------------------------------------------------------------------------

describe("assessProviderReadiness", () => {
  it("counts total fixtures correctly", () => {
    const sync = makeSyncResult({ fixtures: [makeFixture(), makeFixture()] });
    const r = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r.totalFixtures).toBe(2);
  });

  it("counts fixtures with kickoff", () => {
    const withKickoff = makeFixture({ kickoffAt: KICKOFF });
    const noKickoff = makeFixture({ kickoffAt: null });
    const sync = makeSyncResult({ fixtures: [withKickoff, noKickoff] });
    const r = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r.fixturesWithKickoff).toBe(1);
  });

  it("counts upcoming fixtures (scheduled + kickoff in future)", () => {
    const upcoming = makeFixture({ kickoffAt: KICKOFF, status: "scheduled" });
    const finished = makeFixture({ kickoffAt: "2026-06-10T12:00:00.000Z", status: "finished" });
    const sync = makeSyncResult({ fixtures: [upcoming, finished] });
    const r = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r.upcomingFixtures).toBe(1);
  });

  it("counts fixtures in current capture window", () => {
    const inWindow = makeFixture({ kickoffAt: KICKOFF });
    const sync = makeSyncResult({ fixtures: [inWindow] });
    const r = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r.fixturesInCurrentCaptureWindow).toBe(1);
  });

  it("counts fixtures NOT in window as 0 when now is too early", () => {
    const notYetInWindow = makeFixture({ kickoffAt: KICKOFF });
    const sync = makeSyncResult({ fixtures: [notYetInWindow] });
    const r = assessProviderReadiness(sync, TOO_EARLY);
    expect(r.fixturesInCurrentCaptureWindow).toBe(0);
  });

  it("counts unresolved teams when names are not canonical WC2026 names", () => {
    const badFixture = makeFixture({ homeTeam: "Unknown FC", awayTeam: "Mystery United" });
    const sync = makeSyncResult({ fixtures: [badFixture] });
    const r = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r.unresolvedTeams).toBe(1);
  });

  it("counts invalid fixtures (scheduled with missing kickoff)", () => {
    const noKickoff = makeFixture({ kickoffAt: null });
    const sync = makeSyncResult({ fixtures: [noKickoff] });
    const r: ProviderReadinessReport = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r.invalidFixtures).toBeGreaterThan(0);
  });

  it("returns zero counts for empty fixture list", () => {
    const sync = makeSyncResult({ fixtures: [] });
    const r = assessProviderReadiness(sync, INSIDE_WINDOW);
    expect(r).toEqual({
      totalFixtures: 0,
      fixturesWithKickoff: 0,
      upcomingFixtures: 0,
      unresolvedTeams: 0,
      invalidFixtures: 0,
      fixturesInCurrentCaptureWindow: 0
    });
  });
});

// ---------------------------------------------------------------------------
// Security: summary never exposes secrets
// ---------------------------------------------------------------------------

describe("security", () => {
  it("blocked_configuration result contains no secret values", async () => {
    const result = await runPreMatchCaptureActivationPreflight({
      env: {
        PERSISTENCE_PROVIDER: "memory",
        DATABASE_URL: "postgresql://secret-user:secret-pass@db.prod/wc",
        RESULTS_PROVIDER: "football_data_org",
        FOOTBALL_DATA_API_TOKEN: "super-secret-token"
      }
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret-pass");
    expect(serialized).not.toContain("super-secret-token");
    expect(serialized).not.toContain("postgresql://");
  });
});
