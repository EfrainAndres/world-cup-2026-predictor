// ---------------------------------------------------------------------------
// Phase 12.18A1 — Automated Pre-Match Snapshot Capture
//
// Pure-ish orchestration boundary that discovers eligible upcoming World Cup
// 2026 fixtures, generates one deterministic prediction per fixture, and
// persists an immutable pre-match snapshot before kickoff.
//
// Design guarantees:
//   - No look-ahead: `capturedAt < kickoffAt` is enforced inside a pure window
//     evaluation and re-asserted by a final guard immediately before persistence.
//     The wall clock is read exactly once at the orchestration boundary and the
//     resolved `now` is threaded through all pure logic (never `Date.now()`).
//   - Idempotent: the capture identity reuses the existing snapshot idempotency
//     key with a STABLE, fixture-derived `cutoffAt` (= kickoff). Repeated runs
//     therefore resolve to the same snapshot and never create duplicates.
//   - No fabrication: prediction/persistence failures are reported with a
//     sanitized issue code; no raw provider or database error is ever surfaced.
//   - No mutation: this module never updates or deletes snapshots, never runs a
//     migration, and never alters the production prediction formula.
//
// This module is intentionally import-light and free of route/HTTP/IO concerns
// so it stays deterministic and bundle-safe. The prediction function is injected
// (`predictor`) to avoid a circular import with `routes.ts`; the CLI and
// scheduler entry points wire `predictMatchFromLiveElo`.
// ---------------------------------------------------------------------------

import type { Sql } from "postgres";
import { DEFAULT_POISSON_CONFIG, type EloXgPreset } from "../../model/src/index.js";
import {
  buildSnapshotIdempotencyKey,
  buildWorldCup2026PredictionSnapshot,
  WORLD_CUP_2026_PREDICTION_MODEL_VERSION
} from "./snapshot-service.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import { SnapshotStorageError } from "./async-snapshot-store.js";
import {
  resolvePredictionHistoryPersistence,
  type PredictionHistoryPersistenceResolution
} from "./persistence-runtime.js";
import { buildApiMetadata } from "./schemas.js";
import type {
  ApiMetadata,
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026Fixture
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/** Bumped only when the capture identity semantics change. */
export const PREMATCH_SNAPSHOT_CAPTURE_POLICY_VERSION = "wc2026-prematch-capture-policy-v1";

export const PREMATCH_SNAPSHOT_CAPTURE_WINDOW_START_BEFORE_KICKOFF_MINUTES = 24 * 60;
export const PREMATCH_SNAPSHOT_CAPTURE_WINDOW_END_BEFORE_KICKOFF_MINUTES = 15;
export const PREMATCH_SNAPSHOT_CAPTURE_MAX_FIXTURES_PER_RUN = 32;
export const PREMATCH_SNAPSHOT_CAPTURE_DEFAULT_PRESET: EloXgPreset = "balanced";
export const PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS = DEFAULT_POISSON_CONFIG.maxGoals;

export interface PreMatchSnapshotCapturePolicy {
  enabled: boolean;
  captureWindowStartsBeforeKickoffMinutes: number;
  captureWindowEndsBeforeKickoffMinutes: number;
  maxFixturesPerRun: number;
  preset: EloXgPreset;
  tournamentResultsAdjustmentEnabled: boolean;
  tournamentFormAdjustmentEnabled: boolean;
}

export const DEFAULT_PREMATCH_SNAPSHOT_CAPTURE_POLICY: PreMatchSnapshotCapturePolicy = {
  enabled: true,
  captureWindowStartsBeforeKickoffMinutes: PREMATCH_SNAPSHOT_CAPTURE_WINDOW_START_BEFORE_KICKOFF_MINUTES,
  captureWindowEndsBeforeKickoffMinutes: PREMATCH_SNAPSHOT_CAPTURE_WINDOW_END_BEFORE_KICKOFF_MINUTES,
  maxFixturesPerRun: PREMATCH_SNAPSHOT_CAPTURE_MAX_FIXTURES_PER_RUN,
  preset: PREMATCH_SNAPSHOT_CAPTURE_DEFAULT_PRESET,
  // Disabled by default: matches the production snapshot handler and the
  // production prediction default, and keeps the capture identity deterministic.
  tournamentResultsAdjustmentEnabled: false,
  // Kept at the production default; secondary form signal stays off unless
  // explicitly enabled by evidence.
  tournamentFormAdjustmentEnabled: false
};

export interface ResolvedPreMatchSnapshotCapturePolicy extends PreMatchSnapshotCapturePolicy {
  policyVersion: string;
  modelVersion: string;
  maxGoals: number;
}

export type PreMatchSnapshotCaptureConfigErrorCode =
  | "invalid_policy"
  | "predictor_required"
  | "requires_postgres";

export class PreMatchSnapshotCaptureConfigError extends Error {
  readonly code: PreMatchSnapshotCaptureConfigErrorCode;

  constructor(code: PreMatchSnapshotCaptureConfigErrorCode, message: string) {
    super(message);
    this.name = "PreMatchSnapshotCaptureConfigError";
    this.code = code;
  }
}

const VALID_PRESETS: readonly EloXgPreset[] = ["conservative", "balanced", "aggressive"];

export function resolvePreMatchSnapshotCapturePolicy(
  partial?: Partial<PreMatchSnapshotCapturePolicy>
): ResolvedPreMatchSnapshotCapturePolicy {
  const merged: PreMatchSnapshotCapturePolicy = {
    ...DEFAULT_PREMATCH_SNAPSHOT_CAPTURE_POLICY,
    ...(partial ?? {})
  };

  if (!VALID_PRESETS.includes(merged.preset)) {
    throw new PreMatchSnapshotCaptureConfigError(
      "invalid_policy",
      `preset must be one of ${VALID_PRESETS.join(", ")}.`
    );
  }

  if (
    !Number.isFinite(merged.captureWindowStartsBeforeKickoffMinutes) ||
    !Number.isFinite(merged.captureWindowEndsBeforeKickoffMinutes) ||
    merged.captureWindowStartsBeforeKickoffMinutes <= merged.captureWindowEndsBeforeKickoffMinutes
  ) {
    throw new PreMatchSnapshotCaptureConfigError(
      "invalid_policy",
      "captureWindowStartsBeforeKickoffMinutes must be a finite number strictly greater than captureWindowEndsBeforeKickoffMinutes."
    );
  }

  if (merged.captureWindowEndsBeforeKickoffMinutes < 0) {
    throw new PreMatchSnapshotCaptureConfigError(
      "invalid_policy",
      "captureWindowEndsBeforeKickoffMinutes must be greater than or equal to zero so capture always ends before kickoff."
    );
  }

  if (!Number.isInteger(merged.maxFixturesPerRun) || merged.maxFixturesPerRun < 1) {
    throw new PreMatchSnapshotCaptureConfigError(
      "invalid_policy",
      "maxFixturesPerRun must be a positive integer."
    );
  }

  return {
    ...merged,
    policyVersion: PREMATCH_SNAPSHOT_CAPTURE_POLICY_VERSION,
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    maxGoals: PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS
  };
}

// ---------------------------------------------------------------------------
// Timing states and eligibility (pure)
// ---------------------------------------------------------------------------

export type PreMatchCaptureEligibility =
  | "eligible"
  | "too_early"
  | "window_closed"
  | "already_started"
  | "missing_kickoff"
  | "unsupported_fixture"
  | "unresolved_teams"
  | "already_captured"
  | "provider_invalid";

export type PreMatchCaptureAction =
  | "captured"
  | "would_capture"
  | "already_captured"
  | "skipped"
  | "failed";

export interface PreMatchCaptureEligibilityInput {
  now: string;
  kickoffAt: string | undefined;
  status: WorldCup2026ExternalFixtureRecord["status"];
  providerInvalid: boolean;
  policy: ResolvedPreMatchSnapshotCapturePolicy;
}

export interface PreMatchCaptureEligibilityResult {
  eligibility: PreMatchCaptureEligibility;
  issueCode?: string;
}

/**
 * Deterministic boundary behaviour (window relative to kickoff):
 *   - at window start            -> eligible
 *   - 1ms before window start    -> too_early
 *   - at window end              -> eligible
 *   - 1ms after window end       -> window_closed
 *   - exactly at kickoff         -> already_started (ineligible)
 * All comparisons are numeric (epoch ms) so millisecond boundaries are exact.
 */
export function evaluatePreMatchCaptureEligibility(
  input: PreMatchCaptureEligibilityInput
): PreMatchCaptureEligibilityResult {
  if (input.providerInvalid) {
    return { eligibility: "provider_invalid", issueCode: "provider_data_invalid" };
  }

  switch (input.status) {
    case "finished":
      return { eligibility: "already_started", issueCode: "fixture_completed" };
    case "live":
      return { eligibility: "already_started", issueCode: "fixture_live" };
    case "halftime":
      return { eligibility: "already_started", issueCode: "fixture_halftime" };
    case "postponed":
      return { eligibility: "unsupported_fixture", issueCode: "fixture_postponed" };
    case "cancelled":
      return { eligibility: "unsupported_fixture", issueCode: "fixture_cancelled" };
    case "unknown":
      return { eligibility: "unsupported_fixture", issueCode: "fixture_status_unknown" };
    case "scheduled":
      break;
    default:
      return { eligibility: "unsupported_fixture", issueCode: "fixture_status_unsupported" };
  }

  if (input.kickoffAt === undefined) {
    return { eligibility: "missing_kickoff", issueCode: "missing_kickoff" };
  }

  const nowMs = Date.parse(input.now);
  const kickoffMs = Date.parse(input.kickoffAt);

  if (!Number.isFinite(nowMs) || !Number.isFinite(kickoffMs)) {
    return { eligibility: "missing_kickoff", issueCode: "invalid_kickoff_timestamp" };
  }

  if (nowMs >= kickoffMs) {
    return { eligibility: "already_started", issueCode: "kickoff_reached" };
  }

  const windowStartMs = kickoffMs - input.policy.captureWindowStartsBeforeKickoffMinutes * 60_000;
  const windowEndMs = kickoffMs - input.policy.captureWindowEndsBeforeKickoffMinutes * 60_000;

  if (nowMs < windowStartMs) {
    return { eligibility: "too_early", issueCode: "before_capture_window" };
  }

  if (nowMs > windowEndMs) {
    return { eligibility: "window_closed", issueCode: "after_capture_window" };
  }

  return { eligibility: "eligible" };
}

// ---------------------------------------------------------------------------
// Capture service contract
// ---------------------------------------------------------------------------

export type PreMatchSnapshotPredictor = (
  request: PredictMatchFromLiveEloRequest
) => PredictMatchFromLiveEloResponse;

export interface PreMatchSnapshotCaptureResult {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string | null;
  group?: string;
  matchday?: number;
  eligibility: PreMatchCaptureEligibility;
  action: PreMatchCaptureAction;
  snapshotId?: string;
  inputFingerprint?: string;
  issueCode?: string;
}

export interface CapturePreMatchSnapshotsReport {
  generatedAt: string;
  dryRun: boolean;
  policy: ResolvedPreMatchSnapshotCapturePolicy;
  persistenceProvider: PredictionHistoryPersistenceResolution["metadata"]["provider"];
  discoveredFixtures: number;
  eligibleFixtures: number;
  captured: number;
  alreadyCaptured: number;
  skipped: number;
  failed: number;
  results: PreMatchSnapshotCaptureResult[];
  metadata: ApiMetadata;
}

export interface CapturePreMatchSnapshotsInput {
  now?: string;
  policy?: Partial<PreMatchSnapshotCapturePolicy>;
  dryRun?: boolean;
  fixtureIds?: readonly string[];
  persistence?: PredictionHistoryPersistenceResolution;
  /** Discovery source: normalized external fixture records (kickoff + status). */
  fixtureRecords?: readonly WorldCup2026ExternalFixtureRecord[];
  /** Set when the upstream sync/provider reported an error or invalid data. */
  providerInvalid?: boolean;
  /** Injected production prediction path; required for non-dry-run capture. */
  predictor?: PreMatchSnapshotPredictor;
  env?: Record<string, string | undefined>;
}

interface DiscoveredFixture {
  fixture: WorldCup2026Fixture;
  kickoffAt: string | undefined;
  status: WorldCup2026ExternalFixtureRecord["status"];
}

function buildFixtureLookup(): {
  byId: Map<string, WorldCup2026Fixture>;
  byTeams: Map<string, WorldCup2026Fixture>;
} {
  return {
    byId: new Map(WORLD_CUP_2026_GROUP_STAGE_FIXTURES.map((fixture) => [fixture.id, fixture])),
    byTeams: new Map(
      WORLD_CUP_2026_GROUP_STAGE_FIXTURES.map((fixture) => [
        `${fixture.homeTeam}|${fixture.awayTeam}`,
        fixture
      ])
    )
  };
}

function discoverFixtures(
  records: readonly WorldCup2026ExternalFixtureRecord[],
  fixtureIds: readonly string[] | undefined
): { discovered: DiscoveredFixture[]; unsupported: WorldCup2026ExternalFixtureRecord[] } {
  const lookup = buildFixtureLookup();
  const allowList = fixtureIds === undefined ? undefined : new Set(fixtureIds);
  const seen = new Set<string>();
  const discovered: DiscoveredFixture[] = [];
  const unsupported: WorldCup2026ExternalFixtureRecord[] = [];

  for (const record of records) {
    const fixture =
      lookup.byId.get(record.providerFixtureId) ??
      lookup.byTeams.get(`${record.homeTeam}|${record.awayTeam}`);

    if (fixture === undefined) {
      unsupported.push(record);
      continue;
    }

    if (allowList !== undefined && !allowList.has(fixture.id)) {
      continue;
    }

    if (seen.has(fixture.id)) {
      continue;
    }
    seen.add(fixture.id);

    discovered.push({
      fixture,
      kickoffAt: record.kickoffAt,
      status: record.status
    });
  }

  // Deterministic ordering: earliest kickoff first (missing kickoff sorts last),
  // then fixture id ascending.
  discovered.sort((a, b) => {
    const aMs = a.kickoffAt === undefined ? Number.POSITIVE_INFINITY : Date.parse(a.kickoffAt);
    const bMs = b.kickoffAt === undefined ? Number.POSITIVE_INFINITY : Date.parse(b.kickoffAt);
    const safeA = Number.isFinite(aMs) ? aMs : Number.POSITIVE_INFINITY;
    const safeB = Number.isFinite(bMs) ? bMs : Number.POSITIVE_INFINITY;
    if (safeA !== safeB) return safeA - safeB;
    return a.fixture.id.localeCompare(b.fixture.id);
  });

  return { discovered, unsupported };
}

function predictorTeamIssue(prediction: PredictMatchFromLiveEloResponse): boolean {
  if (prediction.status === "success") return false;
  return prediction.issues.some((issue) => issue.field === "homeTeam" || issue.field === "awayTeam");
}

// ---------------------------------------------------------------------------
// Operational status (runtime metadata only — no persistent run-status store)
// ---------------------------------------------------------------------------

interface PreMatchSnapshotCaptureRunStatus {
  lastAttemptedRunAt: string | null;
  lastSuccessfulRunAt: string | null;
  discoveredFixtures: number | null;
  captured: number | null;
  alreadyCaptured: number | null;
  skipped: number | null;
  failed: number | null;
  persistenceProvider: string | null;
}

let lastRunStatus: PreMatchSnapshotCaptureRunStatus = {
  lastAttemptedRunAt: null,
  lastSuccessfulRunAt: null,
  discoveredFixtures: null,
  captured: null,
  alreadyCaptured: null,
  skipped: null,
  failed: null,
  persistenceProvider: null
};

export interface PreMatchSnapshotCaptureStatus {
  lastAttemptedRunAt: string | null;
  lastSuccessfulRunAt: string | null;
  discoveredFixtures: number | null;
  captured: number | null;
  alreadyCaptured: number | null;
  skipped: number | null;
  failed: number | null;
  nextEligibleFixture: { fixtureId: string; kickoffAt: string } | null;
  persistenceProvider: string | null;
  schedulerConfigured: boolean;
}

export interface GetPreMatchSnapshotCaptureStatusInput {
  now?: string;
  fixtureRecords?: readonly WorldCup2026ExternalFixtureRecord[];
  schedulerConfigured?: boolean;
}

export function getPreMatchSnapshotCaptureStatus(
  input?: GetPreMatchSnapshotCaptureStatusInput
): PreMatchSnapshotCaptureStatus {
  let nextEligibleFixture: { fixtureId: string; kickoffAt: string } | null = null;

  if (input?.fixtureRecords !== undefined && input.now !== undefined) {
    const nowMs = Date.parse(input.now);
    const { discovered } = discoverFixtures(input.fixtureRecords, undefined);
    for (const candidate of discovered) {
      if (candidate.status !== "scheduled" || candidate.kickoffAt === undefined) continue;
      const kickoffMs = Date.parse(candidate.kickoffAt);
      if (!Number.isFinite(kickoffMs) || kickoffMs <= nowMs) continue;
      // discovered is sorted by kickoff ascending; first future fixture wins.
      nextEligibleFixture = { fixtureId: candidate.fixture.id, kickoffAt: candidate.kickoffAt };
      break;
    }
  }

  return {
    lastAttemptedRunAt: lastRunStatus.lastAttemptedRunAt,
    lastSuccessfulRunAt: lastRunStatus.lastSuccessfulRunAt,
    discoveredFixtures: lastRunStatus.discoveredFixtures,
    captured: lastRunStatus.captured,
    alreadyCaptured: lastRunStatus.alreadyCaptured,
    skipped: lastRunStatus.skipped,
    failed: lastRunStatus.failed,
    nextEligibleFixture,
    persistenceProvider: lastRunStatus.persistenceProvider,
    schedulerConfigured: input?.schedulerConfigured ?? false
  };
}

// ---------------------------------------------------------------------------
// Core capture service
// ---------------------------------------------------------------------------

export async function captureWorldCup2026PreMatchSnapshots(
  input: CapturePreMatchSnapshotsInput
): Promise<CapturePreMatchSnapshotsReport> {
  // Read the wall clock exactly once at the boundary; pure logic uses `now`.
  const now = input.now ?? new Date().toISOString();
  const dryRun = input.dryRun ?? false;
  const policy = resolvePreMatchSnapshotCapturePolicy(input.policy);
  const records = input.fixtureRecords ?? [];
  const providerInvalid = input.providerInvalid ?? false;

  const persistence =
    input.persistence ?? (await resolvePredictionHistoryPersistence({ ...(input.env ? { env: input.env } : {}) }));

  lastRunStatus = { ...lastRunStatus, lastAttemptedRunAt: now, persistenceProvider: persistence.metadata.provider };

  const { discovered, unsupported } = discoverFixtures(records, input.fixtureIds);
  const results: PreMatchSnapshotCaptureResult[] = [];

  let captured = 0;
  let alreadyCaptured = 0;
  let skipped = 0;
  let failed = 0;
  let eligibleFixtures = 0;
  let captureBudgetUsed = 0;

  for (const item of discovered) {
    const { fixture } = item;
    const base: PreMatchSnapshotCaptureResult = {
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      kickoffAt: item.kickoffAt ?? null,
      ...(fixture.group !== undefined ? { group: fixture.group } : {}),
      ...(fixture.matchday !== undefined ? { matchday: fixture.matchday } : {}),
      eligibility: "eligible",
      action: "skipped"
    };

    const evaluation = evaluatePreMatchCaptureEligibility({
      now,
      kickoffAt: item.kickoffAt,
      status: item.status,
      providerInvalid,
      policy
    });

    if (evaluation.eligibility !== "eligible") {
      results.push({
        ...base,
        eligibility: evaluation.eligibility,
        action: "skipped",
        ...(evaluation.issueCode !== undefined ? { issueCode: evaluation.issueCode } : {})
      });
      skipped += 1;
      continue;
    }

    eligibleFixtures += 1;

    // Deterministic, stable capture identity: cutoff is derived from kickoff,
    // never from the wall clock, so repeated runs share the same idempotency key.
    const cutoffAt = item.kickoffAt as string;
    const idempotencyKey = buildSnapshotIdempotencyKey({
      fixtureId: fixture.id,
      cutoffAt,
      modelVersion: policy.modelVersion,
      eloPreset: policy.preset,
      maxGoals: policy.maxGoals,
      tournamentResultsAdjustmentEnabled: policy.tournamentResultsAdjustmentEnabled
    });

    // Query existing snapshots before generating a prediction (cheap pre-check).
    let existingSnapshotId: string | undefined;
    try {
      const existing = await persistence.snapshotStore.getByIdempotencyKey(idempotencyKey);
      existingSnapshotId = existing?.snapshotId;
    } catch {
      existingSnapshotId = undefined;
    }

    if (existingSnapshotId !== undefined) {
      results.push({
        ...base,
        eligibility: "already_captured",
        action: "already_captured",
        snapshotId: existingSnapshotId,
        issueCode: "equivalent_snapshot_exists"
      });
      alreadyCaptured += 1;
      continue;
    }

    if (!policy.enabled) {
      results.push({ ...base, action: "skipped", issueCode: "capture_disabled" });
      skipped += 1;
      continue;
    }

    if (captureBudgetUsed >= policy.maxFixturesPerRun) {
      results.push({ ...base, action: "skipped", issueCode: "max_fixtures_per_run_reached" });
      skipped += 1;
      continue;
    }

    if (dryRun) {
      results.push({ ...base, action: "would_capture" });
      captured += 1;
      captureBudgetUsed += 1;
      continue;
    }

    if (input.predictor === undefined) {
      throw new PreMatchSnapshotCaptureConfigError(
        "predictor_required",
        "A predictor must be injected for non-dry-run capture."
      );
    }

    captureBudgetUsed += 1;

    const prediction = input.predictor({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      preset: policy.preset,
      ...(policy.tournamentResultsAdjustmentEnabled
        ? { tournamentResultsAdjustment: { enabled: true, cutoffAt } }
        : {}),
      ...(policy.tournamentFormAdjustmentEnabled
        ? { tournamentFormAdjustment: { enabled: true, cutoffAt } }
        : {})
    });

    if (prediction.status !== "success") {
      const teamIssue = predictorTeamIssue(prediction);
      results.push({
        ...base,
        eligibility: teamIssue ? "unresolved_teams" : "eligible",
        action: "failed",
        issueCode: teamIssue ? "unresolved_teams" : "prediction_failed"
      });
      failed += 1;
      continue;
    }

    const { snapshot, idempotencyKey: builtKey } = buildWorldCup2026PredictionSnapshot({
      fixture,
      prediction,
      capturedAt: now,
      cutoffAt,
      kickoffAt: cutoffAt,
      tournamentResultsAdjustmentEnabled: policy.tournamentResultsAdjustmentEnabled
    });

    // Final no-look-ahead guard immediately before persistence. The snapshot
    // must be a verified pre-match lock and captured strictly before kickoff.
    if (snapshot.status !== "pre_match_locked" || Date.parse(now) >= Date.parse(cutoffAt)) {
      results.push({ ...base, action: "failed", issueCode: "look_ahead_guard" });
      failed += 1;
      continue;
    }

    try {
      const storeResult = await persistence.snapshotStore.create(snapshot, builtKey);
      if (storeResult.duplicate) {
        results.push({
          ...base,
          eligibility: "already_captured",
          action: "already_captured",
          snapshotId: storeResult.snapshot.snapshotId,
          inputFingerprint: storeResult.snapshot.contentHash,
          issueCode: "equivalent_snapshot_exists"
        });
        alreadyCaptured += 1;
      } else {
        results.push({
          ...base,
          action: "captured",
          snapshotId: storeResult.snapshot.snapshotId,
          inputFingerprint: storeResult.snapshot.contentHash
        });
        captured += 1;
      }
    } catch (error) {
      const issueCode =
        error instanceof SnapshotStorageError && error.code === "duplicate_conflict"
          ? "snapshot_identity_conflict"
          : "persistence_failed";
      results.push({ ...base, action: "failed", issueCode });
      failed += 1;
    }
  }

  // Unsupported provider records (not official WC2026 fixtures) are reported but
  // never silently dropped.
  for (const record of unsupported) {
    results.push({
      fixtureId: record.providerFixtureId,
      homeTeam: record.homeTeam,
      awayTeam: record.awayTeam,
      kickoffAt: record.kickoffAt ?? null,
      eligibility: "unsupported_fixture",
      action: "skipped",
      issueCode: "not_official_fixture"
    });
    skipped += 1;
  }

  lastRunStatus = {
    lastAttemptedRunAt: now,
    lastSuccessfulRunAt: now,
    discoveredFixtures: discovered.length + unsupported.length,
    captured,
    alreadyCaptured,
    skipped,
    failed,
    persistenceProvider: persistence.metadata.provider
  };

  return {
    generatedAt: now,
    dryRun,
    policy,
    persistenceProvider: persistence.metadata.provider,
    discoveredFixtures: discovered.length + unsupported.length,
    eligibleFixtures,
    captured,
    alreadyCaptured,
    skipped,
    failed,
    results,
    metadata: buildApiMetadata(
      [
        `Pre-match snapshot capture policy version: ${policy.policyVersion}.`,
        `Model version: ${policy.modelVersion}.`,
        dryRun
          ? "Dry run: no snapshots were written. 'captured' reflects what would be captured."
          : "Capture persisted eligible pre-match snapshots through the configured store.",
        persistence.metadata.persistent
          ? "Snapshots persisted through the configured server-side PostgreSQL adapter."
          : "In-memory storage only. Snapshots do not persist across serverless invocations or restarts."
      ],
      { databaseEnabled: persistence.metadata.persistent }
    )
  };
}

// ---------------------------------------------------------------------------
// Scheduler safety — locking
// ---------------------------------------------------------------------------

export interface PreMatchSnapshotCaptureLock {
  acquire(): Promise<boolean>;
  release(): Promise<void>;
}

let processLocalLockHeld = false;

/**
 * Process-local mutex preventing overlapping runs within a single process.
 * All locks from this factory share module state, so a second concurrent
 * acquire returns `false` until the first releases.
 */
export function createProcessLocalCaptureLock(): PreMatchSnapshotCaptureLock {
  let owned = false;
  return {
    async acquire() {
      if (processLocalLockHeld) return false;
      processLocalLockHeld = true;
      owned = true;
      return true;
    },
    async release() {
      if (owned) {
        processLocalLockHeld = false;
        owned = false;
      }
    }
  };
}

/** Deterministic 32-bit advisory-lock key derived from "wc26-prematch". */
export const PREMATCH_SNAPSHOT_CAPTURE_ADVISORY_LOCK_KEY = 0x77_63_32_36;

/**
 * PostgreSQL advisory lock for scheduled PostgreSQL mode. Uses
 * `pg_try_advisory_lock` (non-blocking, bounded) and releases in `release()`.
 * No table locks are taken, avoiding deadlock-prone behaviour.
 */
export function createPostgresAdvisoryCaptureLock(
  sql: Sql,
  key: number = PREMATCH_SNAPSHOT_CAPTURE_ADVISORY_LOCK_KEY
): PreMatchSnapshotCaptureLock {
  let acquired = false;
  return {
    async acquire() {
      const rows = (await sql`SELECT pg_try_advisory_lock(${key}) AS locked`) as unknown as Array<{
        locked: boolean;
      }>;
      acquired = rows[0]?.locked === true;
      return acquired;
    },
    async release() {
      if (acquired) {
        await sql`SELECT pg_advisory_unlock(${key})`;
        acquired = false;
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Scheduler-compatible entry point
// ---------------------------------------------------------------------------

export interface RunScheduledPreMatchSnapshotCaptureInput extends CapturePreMatchSnapshotsInput {
  lock?: PreMatchSnapshotCaptureLock;
}

export interface ScheduledPreMatchSnapshotCaptureReport extends CapturePreMatchSnapshotsReport {
  alreadyRunning: boolean;
}

export async function runScheduledPreMatchSnapshotCapture(
  input: RunScheduledPreMatchSnapshotCaptureInput
): Promise<ScheduledPreMatchSnapshotCaptureReport> {
  const now = input.now ?? new Date().toISOString();
  const dryRun = input.dryRun ?? false;
  const policy = resolvePreMatchSnapshotCapturePolicy(input.policy);

  const persistence =
    input.persistence ?? (await resolvePredictionHistoryPersistence({ ...(input.env ? { env: input.env } : {}) }));

  // Scheduled production mode requires PostgreSQL and must never silently fall
  // back to memory. Dry runs are allowed against any provider.
  if (!dryRun && persistence.metadata.provider !== "postgres") {
    throw new PreMatchSnapshotCaptureConfigError(
      "requires_postgres",
      "Scheduled pre-match snapshot capture requires PERSISTENCE_PROVIDER=postgres. Use dryRun for memory-mode validation."
    );
  }

  const lock = input.lock ?? createProcessLocalCaptureLock();
  const acquired = await lock.acquire();

  if (!acquired) {
    return {
      generatedAt: now,
      dryRun,
      policy,
      persistenceProvider: persistence.metadata.provider,
      discoveredFixtures: 0,
      eligibleFixtures: 0,
      captured: 0,
      alreadyCaptured: 0,
      skipped: 0,
      failed: 0,
      results: [],
      metadata: buildApiMetadata(["Another capture run is already in progress. This run was skipped."], {
        databaseEnabled: persistence.metadata.persistent
      }),
      alreadyRunning: true
    };
  }

  try {
    const report = await captureWorldCup2026PreMatchSnapshots({
      ...input,
      now,
      persistence,
      dryRun
    });
    return { ...report, alreadyRunning: false };
  } finally {
    await lock.release();
  }
}

// ---------------------------------------------------------------------------
// Test-only runtime reset (module-level lock + status are process-global).
// ---------------------------------------------------------------------------

export function __resetPreMatchSnapshotCaptureRuntimeForTests(): void {
  processLocalLockHeld = false;
  lastRunStatus = {
    lastAttemptedRunAt: null,
    lastSuccessfulRunAt: null,
    discoveredFixtures: null,
    captured: null,
    alreadyCaptured: null,
    skipped: null,
    failed: null,
    persistenceProvider: null
  };
}
