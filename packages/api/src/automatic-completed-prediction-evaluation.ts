import { SnapshotStorageError } from "./async-snapshot-store.js";
import type { AsyncPredictionEvaluationStore } from "./async-evaluation-store.js";
import { buildApiMetadata } from "./schemas.js";
import {
  evaluateWorldCup2026PredictionSnapshotAsync,
  summarizeWorldCup2026ModelReality
} from "./prediction-evaluation-service.js";
import {
  resolvePredictionHistoryPersistence,
  type PredictionHistoryPersistenceResolution
} from "./persistence-runtime.js";
import type {
  ApiMetadata,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ModelRealitySummary,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionEvaluationIssue,
  WorldCup2026PredictionSnapshot,
  WorldCup2026SyncResult
} from "./schemas.js";

export type AutomaticCompletedPredictionEvaluationMode = "dry_run" | "evaluate";

export type AutomaticCompletedPredictionEvaluationAction =
  | "evaluated"
  | "would_evaluate"
  | "already_evaluated"
  | "pending_result"
  | "unresolved_fixture"
  | "invalid_result"
  | "ineligible_snapshot"
  | "conflict"
  | "failed";

export interface AutomaticCompletedPredictionEvaluationResult {
  snapshotId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  action: AutomaticCompletedPredictionEvaluationAction;
  evaluationId?: string;
  issueCode?: string;
  message?: string;
}

export interface AutomaticCompletedPredictionEvaluationSummary {
  snapshotsScanned: number;
  eligible: number;
  evaluated: number;
  alreadyEvaluated: number;
  pendingResult: number;
  unresolvedFixture: number;
  invalidResult: number;
  ineligibleSnapshot: number;
  conflicts: number;
  failures: number;
}

export interface AutomaticCompletedPredictionEvaluationReport {
  status: "success" | "partial_failure";
  generatedAt: string;
  mode: AutomaticCompletedPredictionEvaluationMode;
  dryRun: boolean;
  persistenceProvider: PredictionHistoryPersistenceResolution["metadata"]["provider"];
  resultSource: string;
  completedResultCount: number;
  summary: AutomaticCompletedPredictionEvaluationSummary;
  results: readonly AutomaticCompletedPredictionEvaluationResult[];
  modelRealitySummary: WorldCup2026ModelRealitySummary;
  metadata: ApiMetadata;
}

export interface EvaluateCompletedPredictionsInput {
  persistence?: PredictionHistoryPersistenceResolution;
  syncResult?: WorldCup2026SyncResult;
  completedResults?: readonly WorldCup2026ExternalFixtureRecord[];
  evaluatedAt?: string;
  dryRun?: boolean;
  snapshotLimit?: number;
  env?: Record<string, string | undefined>;
}

export type AutomaticCompletedPredictionEvaluationConfigErrorCode = "requires_postgres";

export class AutomaticCompletedPredictionEvaluationConfigError extends Error {
  readonly code: AutomaticCompletedPredictionEvaluationConfigErrorCode;

  constructor(code: AutomaticCompletedPredictionEvaluationConfigErrorCode, message: string) {
    super(message);
    this.name = "AutomaticCompletedPredictionEvaluationConfigError";
    this.code = code;
  }
}

export interface RunScheduledAutomaticCompletedPredictionEvaluationInput extends EvaluateCompletedPredictionsInput {
  lock?: AutomaticCompletedPredictionEvaluationLock;
}

export interface ScheduledAutomaticCompletedPredictionEvaluationReport
  extends AutomaticCompletedPredictionEvaluationReport {
  alreadyRunning: boolean;
}

export interface AutomaticCompletedPredictionEvaluationLock {
  acquire(): Promise<boolean>;
  release(): Promise<void>;
}

let processLocalEvaluationLockHeld = false;

function createDryRunEvaluationStore(): AsyncPredictionEvaluationStore {
  const evaluations: WorldCup2026PredictionEvaluation[] = [];
  return {
    async create(evaluation, identityKey) {
      evaluations.push(JSON.parse(JSON.stringify(evaluation)) as WorldCup2026PredictionEvaluation);
      return {
        result: "created",
        evaluation,
        identityKey,
        duplicate: false
      };
    },
    async getById(evaluationId) {
      return evaluations.find((evaluation) => evaluation.evaluationId === evaluationId) ?? null;
    },
    async getByIdentity() {
      return null;
    },
    async list(input = {}) {
      return evaluations.filter((evaluation) => {
        if (input.snapshotId !== undefined && evaluation.snapshotId !== input.snapshotId) return false;
        if (input.fixtureId !== undefined && evaluation.fixtureId !== input.fixtureId) return false;
        return true;
      });
    }
  };
}

function emptySummary(): AutomaticCompletedPredictionEvaluationSummary {
  return {
    snapshotsScanned: 0,
    eligible: 0,
    evaluated: 0,
    alreadyEvaluated: 0,
    pendingResult: 0,
    unresolvedFixture: 0,
    invalidResult: 0,
    ineligibleSnapshot: 0,
    conflicts: 0,
    failures: 0
  };
}

function classifyNotEligibleIssue(
  issue: WorldCup2026PredictionEvaluationIssue | undefined
): AutomaticCompletedPredictionEvaluationAction {
  switch (issue?.code) {
    case "missing_completed_result":
    case "live_or_scheduled_status":
      return "pending_result";
    case "fixture_mismatch":
    case "team_order_mismatch":
    case "invalid_fixture_identity":
      return "unresolved_fixture";
    case "incomplete_score":
    case "duplicate_completed_result":
      return "invalid_result";
    case "unsupported_snapshot_state":
    case "snapshot_after_kickoff":
    case "invalid_snapshot_probabilities":
    case "missing_snapshot":
    default:
      return "ineligible_snapshot";
  }
}

function incrementSummary(summary: AutomaticCompletedPredictionEvaluationSummary, action: AutomaticCompletedPredictionEvaluationAction): void {
  switch (action) {
    case "evaluated":
    case "would_evaluate":
      summary.eligible += 1;
      if (action === "evaluated") summary.evaluated += 1;
      return;
    case "already_evaluated":
      summary.alreadyEvaluated += 1;
      return;
    case "pending_result":
      summary.pendingResult += 1;
      return;
    case "unresolved_fixture":
      summary.unresolvedFixture += 1;
      return;
    case "invalid_result":
      summary.invalidResult += 1;
      return;
    case "ineligible_snapshot":
      summary.ineligibleSnapshot += 1;
      return;
    case "conflict":
      summary.conflicts += 1;
      return;
    case "failed":
      summary.failures += 1;
      return;
  }
}

function resultBase(snapshot: WorldCup2026PredictionSnapshot): Omit<AutomaticCompletedPredictionEvaluationResult, "action"> {
  return {
    snapshotId: snapshot.snapshotId,
    fixtureId: snapshot.fixtureId,
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam
  };
}

function evaluationInput(input: {
  snapshot: WorldCup2026PredictionSnapshot;
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  evaluationStore: AsyncPredictionEvaluationStore;
  resultSource: string;
  syncResult?: WorldCup2026SyncResult;
  evaluatedAt: string;
}) {
  return {
    snapshot: input.snapshot,
    completedResults: input.completedResults,
    evaluationStore: input.evaluationStore,
    resultSource: input.resultSource,
    ...(input.syncResult?.cacheUsed === undefined ? {} : { cacheUsed: input.syncResult.cacheUsed }),
    ...(input.syncResult?.localFallbackUsed === undefined
      ? {}
      : { localFallbackUsed: input.syncResult.localFallbackUsed }),
    evaluatedAt: input.evaluatedAt
  };
}

function isSameEvaluation(
  existing: WorldCup2026PredictionEvaluation,
  candidate: WorldCup2026PredictionEvaluation
): boolean {
  return (
    existing.evaluationId === candidate.evaluationId ||
    (
      existing.snapshotId === candidate.snapshotId &&
      existing.fixtureId === candidate.fixtureId &&
      existing.metricVersion === candidate.metricVersion &&
      existing.actual.homeGoals === candidate.actual.homeGoals &&
      existing.actual.awayGoals === candidate.actual.awayGoals &&
      existing.actual.outcome === candidate.actual.outcome
    )
  );
}

export async function evaluateCompletedWorldCup2026PredictionSnapshots(
  input: EvaluateCompletedPredictionsInput = {}
): Promise<AutomaticCompletedPredictionEvaluationReport> {
  const generatedAt = input.evaluatedAt ?? new Date().toISOString();
  const dryRun = input.dryRun ?? false;
  const mode: AutomaticCompletedPredictionEvaluationMode = dryRun ? "dry_run" : "evaluate";
  const persistence =
    input.persistence ?? (await resolvePredictionHistoryPersistence({ ...(input.env ? { env: input.env } : {}) }));
  const completedResults = input.completedResults ?? input.syncResult?.completedResults ?? [];
  const resultSource = input.syncResult?.activeProvider ?? "injected_completed_results";
  const summary = emptySummary();
  const results: AutomaticCompletedPredictionEvaluationResult[] = [];

  const snapshots = await persistence.snapshotStore.list({
    limit: input.snapshotLimit ?? 1000
  });
  summary.snapshotsScanned = snapshots.length;

  for (const snapshot of snapshots) {
    const existingEvaluations = await persistence.evaluationStore.list({
      snapshotId: snapshot.snapshotId,
      limit: 2
    });

    const candidate = await evaluateWorldCup2026PredictionSnapshotAsync({
      ...evaluationInput({
        snapshot,
        completedResults,
        evaluationStore: createDryRunEvaluationStore(),
        resultSource,
        ...(input.syncResult === undefined ? {} : { syncResult: input.syncResult }),
        evaluatedAt: generatedAt
      })
    });

    if (existingEvaluations.length > 0) {
      if (candidate.evaluation !== undefined && !existingEvaluations.some((existing) => isSameEvaluation(existing, candidate.evaluation!))) {
        const action: AutomaticCompletedPredictionEvaluationAction = "conflict";
        incrementSummary(summary, action);
        results.push({
          ...resultBase(snapshot),
          action,
          ...(existingEvaluations[0]?.evaluationId === undefined
            ? {}
            : { evaluationId: existingEvaluations[0].evaluationId }),
          issueCode: "evaluation_identity_conflict",
          message: "Snapshot already has an evaluation that differs from the current completed-result identity."
        });
        continue;
      }

      const action: AutomaticCompletedPredictionEvaluationAction = "already_evaluated";
      incrementSummary(summary, action);
      results.push({
        ...resultBase(snapshot),
        action,
        ...(existingEvaluations[0]?.evaluationId === undefined
          ? {}
          : { evaluationId: existingEvaluations[0].evaluationId }),
        message: "Existing immutable evaluation found for this snapshot."
      });
      continue;
    }

    if (candidate.status === "not_eligible" || candidate.evaluation === undefined) {
      const issue = candidate.issues[0];
      const action = classifyNotEligibleIssue(issue);
      incrementSummary(summary, action);
      results.push({
        ...resultBase(snapshot),
        action,
        ...(issue?.code === undefined ? {} : { issueCode: issue.code }),
        ...(issue?.message === undefined ? {} : { message: issue.message })
      });
      continue;
    }

    if (dryRun) {
      const action: AutomaticCompletedPredictionEvaluationAction = "would_evaluate";
      incrementSummary(summary, action);
      results.push({
        ...resultBase(snapshot),
        action,
        evaluationId: candidate.evaluation.evaluationId,
        message: "Dry run: eligible evaluation was not written."
      });
      continue;
    }

    try {
      const persisted = await evaluateWorldCup2026PredictionSnapshotAsync({
        ...evaluationInput({
          snapshot,
          completedResults,
          evaluationStore: persistence.evaluationStore,
          resultSource,
          ...(input.syncResult === undefined ? {} : { syncResult: input.syncResult }),
          evaluatedAt: generatedAt
        })
      });

      const action: AutomaticCompletedPredictionEvaluationAction =
        persisted.status === "duplicate" ? "already_evaluated" : "evaluated";
      incrementSummary(summary, action);
      results.push({
        ...resultBase(snapshot),
        action,
        ...(persisted.evaluation?.evaluationId === undefined
          ? {}
          : { evaluationId: persisted.evaluation.evaluationId }),
        message:
          action === "already_evaluated"
            ? "Existing immutable evaluation returned for this snapshot/result identity."
            : "Immutable evaluation created for completed official result."
      });
    } catch (error) {
      const action: AutomaticCompletedPredictionEvaluationAction =
        error instanceof SnapshotStorageError && error.code === "duplicate_conflict" ? "conflict" : "failed";
      incrementSummary(summary, action);
      results.push({
        ...resultBase(snapshot),
        action,
        issueCode: error instanceof SnapshotStorageError ? error.code : "evaluation_failed",
        message:
          action === "conflict"
            ? "Evaluation identity conflict detected; no record was overwritten."
            : "Evaluation failed with a sanitized persistence error."
      });
    }
  }

  const evaluations = await persistence.evaluationStore.list({ limit: 1000 });
  return {
    status: summary.failures > 0 || summary.conflicts > 0 ? "partial_failure" : "success",
    generatedAt,
    mode,
    dryRun,
    persistenceProvider: persistence.metadata.provider,
    resultSource,
    completedResultCount: completedResults.length,
    summary,
    results,
    modelRealitySummary: summarizeWorldCup2026ModelReality(evaluations),
    metadata: buildApiMetadata(
      [
        dryRun
          ? "Dry run: eligible completed-result evaluations were identified but not written."
          : "Eligible completed-result evaluations were persisted through the configured store.",
        "Evaluations use immutable stored prediction snapshots only. No prediction was regenerated.",
        persistence.metadata.persistent
          ? "Evaluations persisted through the configured PostgreSQL adapter."
          : "In-memory storage only. Evaluations do not persist across serverless invocations or restarts."
      ],
      { databaseEnabled: persistence.metadata.persistent }
    )
  };
}

export function createProcessLocalCompletedEvaluationLock(): AutomaticCompletedPredictionEvaluationLock {
  let owned = false;
  return {
    async acquire() {
      if (processLocalEvaluationLockHeld) return false;
      processLocalEvaluationLockHeld = true;
      owned = true;
      return true;
    },
    async release() {
      if (owned) {
        processLocalEvaluationLockHeld = false;
        owned = false;
      }
    }
  };
}

export async function runScheduledCompletedPredictionEvaluation(
  input: RunScheduledAutomaticCompletedPredictionEvaluationInput = {}
): Promise<ScheduledAutomaticCompletedPredictionEvaluationReport> {
  const dryRun = input.dryRun ?? false;
  const persistence =
    input.persistence ?? (await resolvePredictionHistoryPersistence({ ...(input.env ? { env: input.env } : {}) }));

  if (!dryRun && persistence.metadata.provider !== "postgres") {
    throw new AutomaticCompletedPredictionEvaluationConfigError(
      "requires_postgres",
      "Scheduled completed-prediction evaluation requires PERSISTENCE_PROVIDER=postgres. Use dryRun for memory-mode validation."
    );
  }

  const lock = input.lock ?? createProcessLocalCompletedEvaluationLock();
  const acquired = await lock.acquire();
  if (!acquired) {
    const generatedAt = input.evaluatedAt ?? new Date().toISOString();
    const summary = emptySummary();
    return {
      status: "success",
      generatedAt,
      mode: dryRun ? "dry_run" : "evaluate",
      dryRun,
      persistenceProvider: persistence.metadata.provider,
      resultSource: input.syncResult?.activeProvider ?? "injected_completed_results",
      completedResultCount: input.completedResults?.length ?? input.syncResult?.completedResults.length ?? 0,
      summary,
      results: [],
      modelRealitySummary: summarizeWorldCup2026ModelReality([]),
      metadata: buildApiMetadata(["Another completed-prediction evaluation run is already in progress. This run was skipped."], {
        databaseEnabled: persistence.metadata.persistent
      }),
      alreadyRunning: true
    };
  }

  try {
    const report = await evaluateCompletedWorldCup2026PredictionSnapshots({
      ...input,
      persistence,
      dryRun
    });
    return { ...report, alreadyRunning: false };
  } finally {
    await lock.release();
  }
}

export function __resetCompletedPredictionEvaluationRuntimeForTests(): void {
  processLocalEvaluationLockHeld = false;
}
