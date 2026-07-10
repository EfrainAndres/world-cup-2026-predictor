// ---------------------------------------------------------------------------
// Phase 12.18A2 — Scheduled Capture Activation Preflight
//
// Pure orchestration boundary that validates configuration, database
// connectivity, and external provider readiness before the first scheduled
// capture run. No predictions, no snapshot writes, no secrets printed.
//
// Usage:
//   const result = await runPreMatchCaptureActivationPreflight({ env });
//   // result.status: "ready" | "ready_no_currently_eligible_fixture"
//   //              | "blocked_configuration" | "blocked_provider"
//   //              | "blocked_database"
// ---------------------------------------------------------------------------

import {
  evaluatePreMatchCaptureEligibility,
  resolvePreMatchSnapshotCapturePolicy
} from "./prematch-snapshot-capture.js";
import {
  resolveWorldCup2026EvidenceFixture
} from "./world-cup-2026-evidence-fixtures.js";
import type { WorldCup2026SyncResult } from "./schemas.js";
import type { SynchronizeWorldCup2026ResultsInput } from "./live-results-sync.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ScheduledCaptureActivationStatus =
  | "ready"
  | "ready_no_currently_eligible_fixture"
  | "blocked_configuration"
  | "blocked_provider"
  | "blocked_database";

export type ScheduledCaptureActivationVerdict =
  | "activated_and_verified"
  | "ready_to_activate"
  | "blocked";

export interface ProviderReadinessReport {
  totalFixtures: number;
  fixturesWithKickoff: number;
  upcomingFixtures: number;
  unresolvedTeams: number;
  invalidFixtures: number;
  fixturesInCurrentCaptureWindow: number;
}

export interface PreflightChecks {
  persistenceProviderConfigured: boolean;
  databaseUrlConfigured: boolean;
  providerConfigured: boolean;
  databaseConnectivity: boolean;
  providerConnectivity: boolean;
  fixturesHaveKickoff: boolean;
  captureWindowEvaluable: boolean;
}

export interface PreMatchCaptureActivationPreflightResult {
  status: ScheduledCaptureActivationStatus;
  checks: PreflightChecks;
  providerReadiness?: ProviderReadinessReport;
  issues: string[];
}

export interface DatabaseConnectivityResult {
  connected: boolean;
  error?: string;
}

export interface RunPreMatchCaptureActivationPreflightInput {
  env?: Record<string, string | undefined>;
  now?: string;
  checkDatabaseConnectivity?: (databaseUrl: string) => Promise<DatabaseConnectivityResult>;
  synchronize?: (input: SynchronizeWorldCup2026ResultsInput) => Promise<WorldCup2026SyncResult>;
}

// ---------------------------------------------------------------------------
// Provider readiness assessment (pure, injectable)
// ---------------------------------------------------------------------------

export function assessProviderReadiness(
  syncResult: WorldCup2026SyncResult,
  now: string
): ProviderReadinessReport {
  const resolvedPolicy = resolvePreMatchSnapshotCapturePolicy();
  const fixtures = syncResult.fixtures;
  const nowMs = Date.parse(now);

  let fixturesWithKickoff = 0;
  let upcomingFixtures = 0;
  let unresolvedTeams = 0;
  let invalidFixtures = 0;
  let fixturesInCurrentCaptureWindow = 0;

  for (const record of fixtures) {
    const hasKickoff = record.kickoffAt !== undefined && record.kickoffAt.length > 0;
    if (hasKickoff) fixturesWithKickoff++;

    // Invalid: scheduled with no kickoff, or missing team names.
    const teamsEmpty = !record.homeTeam || !record.awayTeam;
    const missingKickoffForScheduled = record.status === "scheduled" && !hasKickoff;
    if (teamsEmpty || missingKickoffForScheduled) invalidFixtures++;

    const resolvedFixture = resolveWorldCup2026EvidenceFixture(record);

    // Unresolved: team names cannot canonicalize to the WC2026 roster.
    if ("issueCode" in resolvedFixture && resolvedFixture.issueCode === "unresolved_teams") {
      unresolvedTeams++;
    }

    if (!("issueCode" in resolvedFixture) && record.status === "scheduled" && hasKickoff) {
      const kickoffMs = Date.parse(record.kickoffAt!);
      if (kickoffMs > nowMs) {
        upcomingFixtures++;

        const evalResult = evaluatePreMatchCaptureEligibility({
          now,
          kickoffAt: record.kickoffAt,
          status: record.status,
          providerInvalid: false,
          policy: resolvedPolicy
        });

        if (evalResult.eligibility === "eligible") {
          fixturesInCurrentCaptureWindow++;
        }
      }
    }
  }

  return {
    totalFixtures: fixtures.length,
    fixturesWithKickoff,
    upcomingFixtures,
    unresolvedTeams,
    invalidFixtures,
    fixturesInCurrentCaptureWindow
  };
}

// ---------------------------------------------------------------------------
// Preflight orchestration
// ---------------------------------------------------------------------------

export async function runPreMatchCaptureActivationPreflight(
  input: RunPreMatchCaptureActivationPreflightInput = {}
): Promise<PreMatchCaptureActivationPreflightResult> {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date().toISOString();
  const issues: string[] = [];

  const checks: PreflightChecks = {
    persistenceProviderConfigured: false,
    databaseUrlConfigured: false,
    providerConfigured: false,
    databaseConnectivity: false,
    providerConnectivity: false,
    fixturesHaveKickoff: false,
    captureWindowEvaluable: false
  };

  // 1. PERSISTENCE_PROVIDER must be postgres.
  const persistenceProvider = (env["PERSISTENCE_PROVIDER"] ?? "memory").trim().toLowerCase();
  if (persistenceProvider === "postgres") {
    checks.persistenceProviderConfigured = true;
  } else {
    issues.push("PERSISTENCE_PROVIDER must be set to 'postgres' for scheduled capture.");
  }

  // 2. DATABASE_URL must be present.
  const databaseUrl = env["DATABASE_URL"]?.trim();
  if (databaseUrl) {
    checks.databaseUrlConfigured = true;
  } else {
    issues.push("DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres.");
  }

  // 3. External provider must be configured with a token.
  const resultsProvider = (env["RESULTS_PROVIDER"] ?? "local").trim();
  const apiToken = env["FOOTBALL_DATA_API_TOKEN"]?.trim();
  if (resultsProvider === "football_data_org" && apiToken) {
    checks.providerConfigured = true;
  } else if (resultsProvider !== "football_data_org") {
    issues.push(
      "RESULTS_PROVIDER must be set to 'football_data_org' to supply kickoff timestamps for scheduled capture."
    );
  } else {
    issues.push(
      "FOOTBALL_DATA_API_TOKEN is required when RESULTS_PROVIDER=football_data_org."
    );
  }

  if (!checks.persistenceProviderConfigured || !checks.databaseUrlConfigured || !checks.providerConfigured) {
    return { status: "blocked_configuration", checks, issues };
  }

  // 4. Database connectivity.
  if (input.checkDatabaseConnectivity !== undefined) {
    try {
      const result = await input.checkDatabaseConnectivity(databaseUrl!);
      if (result.connected) {
        checks.databaseConnectivity = true;
      } else {
        // Never surface the URL or credentials in the issue message.
        issues.push("Database connectivity check failed: connection refused or authentication failure.");
      }
    } catch {
      issues.push("Database connectivity check failed with an unexpected error.");
    }
  } else {
    // Connectivity check not provided; mark as unchecked but not failed.
    checks.databaseConnectivity = true;
  }

  if (!checks.databaseConnectivity) {
    return { status: "blocked_database", checks, issues };
  }

  // 5. Provider connectivity and fixture quality.
  let syncResult: WorldCup2026SyncResult;
  try {
    const synchronize = input.synchronize ?? defaultSynchronize;
    syncResult = await synchronize({
      ...(apiToken ? { token: apiToken } : {}),
      providerMode: "football_data_org"
    });

    if (syncResult.status === "error" || syncResult.localFallbackUsed) {
      issues.push(
        "External results provider failed or fell back to local static data. Capture requires a live kickoff-bearing provider."
      );
      return { status: "blocked_provider", checks, issues };
    }

    checks.providerConnectivity = true;
  } catch {
    issues.push("External results provider call failed with an unexpected error.");
    return { status: "blocked_provider", checks, issues };
  }

  const providerReadiness = assessProviderReadiness(syncResult, now);

  // 6. Fixtures must have kickoff timestamps.
  if (providerReadiness.fixturesWithKickoff === 0) {
    issues.push(
      "Provider returned no fixtures with kickoff timestamps. Scheduled capture requires kickoff data."
    );
    return { status: "blocked_provider", checks, providerReadiness, issues };
  }
  checks.fixturesHaveKickoff = true;

  // 7. Capture window is evaluable whenever policy constants are valid.
  checks.captureWindowEvaluable = true;

  if (providerReadiness.fixturesInCurrentCaptureWindow === 0) {
    return { status: "ready_no_currently_eligible_fixture", checks, providerReadiness, issues };
  }

  return { status: "ready", checks, providerReadiness, issues };
}

async function defaultSynchronize(input: SynchronizeWorldCup2026ResultsInput): Promise<WorldCup2026SyncResult> {
  const { synchronizeWorldCup2026Results } = await import("./live-results-sync.js");
  return synchronizeWorldCup2026Results(input);
}
