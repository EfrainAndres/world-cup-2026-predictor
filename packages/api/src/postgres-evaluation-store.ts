import type { Sql } from "postgres";
import type { AsyncPredictionEvaluationStore } from "./async-evaluation-store.js";
import { EVALUATION_SCHEMA_VERSION } from "./async-evaluation-store.js";
import { SnapshotStorageError } from "./async-snapshot-store.js";
import type {
  PredictionConfidenceLevel,
  PredictionCoverageType,
  PredictionOutcome,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionEvaluationActual,
  WorldCup2026PredictionEvaluationConfidence,
  WorldCup2026PredictionEvaluationCreateResult,
  WorldCup2026PredictionEvaluationMetrics,
  WorldCup2026PredictionEvaluationPredicted,
  WorldCup2026PredictionEvaluationProvenance
} from "./schemas.js";

// --------------------------------------------------------------------------
// Internal row type — never escapes this module.
// --------------------------------------------------------------------------

interface EvaluationRow {
  evaluation_id: string;
  snapshot_id: string;
  fixture_id: string;
  provider_fixture_id: string | null;
  model_version: string;
  metric_version: string;
  evaluation_schema_version: string;
  result_identity: string;
  evaluated_at: Date;
  actual_home_goals: number;
  actual_away_goals: number;
  actual_outcome: string;
  metrics_payload: unknown;
  confidence_payload: unknown;
  provenance_payload: unknown;
  created_at: Date;
}

// --------------------------------------------------------------------------
// JSONB payload shapes.
// --------------------------------------------------------------------------

interface MetricsPayload {
  schemaVersion: string;
  modelVersion: string;
  predicted: WorldCup2026PredictionEvaluationPredicted;
  metrics: WorldCup2026PredictionEvaluationMetrics;
}

interface ConfidencePayload {
  schemaVersion: string;
  confidence: WorldCup2026PredictionEvaluationConfidence;
}

interface ProvenancePayload {
  schemaVersion: string;
  provenance: WorldCup2026PredictionEvaluationProvenance;
}

// --------------------------------------------------------------------------
// Pure row-mapping helpers (no SQL, no I/O).
// --------------------------------------------------------------------------

export interface EvaluationInsertParams {
  evaluation_id: string;
  snapshot_id: string;
  fixture_id: string;
  provider_fixture_id: string | null;
  model_version: string;
  metric_version: string;
  evaluation_schema_version: string;
  result_identity: string;
  evaluated_at: string;
  actual_home_goals: number;
  actual_away_goals: number;
  actual_outcome: string;
  metrics_payload: string;
  confidence_payload: string;
  provenance_payload: string;
}

export function evaluationToInsertParams(
  evaluation: WorldCup2026PredictionEvaluation,
  identityKey: string
): EvaluationInsertParams {
  const metricsPayload: MetricsPayload = {
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    modelVersion: evaluation.modelVersion,
    predicted: evaluation.predicted,
    metrics: evaluation.metrics
  };

  const confidencePayload: ConfidencePayload = {
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    confidence: evaluation.confidence
  };

  const provenancePayload: ProvenancePayload = {
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    provenance: evaluation.provenance
  };

  return {
    evaluation_id: evaluation.evaluationId,
    snapshot_id: evaluation.snapshotId,
    fixture_id: evaluation.fixtureId,
    provider_fixture_id: evaluation.providerFixtureId !== undefined ? evaluation.providerFixtureId : null,
    model_version: evaluation.modelVersion,
    metric_version: evaluation.metricVersion,
    evaluation_schema_version: EVALUATION_SCHEMA_VERSION,
    result_identity: identityKey,
    evaluated_at: evaluation.evaluatedAt,
    actual_home_goals: evaluation.actual.homeGoals,
    actual_away_goals: evaluation.actual.awayGoals,
    actual_outcome: evaluation.actual.outcome,
    metrics_payload: JSON.stringify(metricsPayload),
    confidence_payload: JSON.stringify(confidencePayload),
    provenance_payload: JSON.stringify(provenancePayload)
  };
}

function parseMetricsPayload(raw: unknown): MetricsPayload {
  if (raw === null || typeof raw !== "object") {
    throw new SnapshotStorageError("invalid_stored_record", "metrics_payload is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["schemaVersion"] !== "string") {
    throw new SnapshotStorageError("invalid_stored_record", "metrics_payload missing schemaVersion");
  }
  if (obj["schemaVersion"] !== EVALUATION_SCHEMA_VERSION) {
    throw new SnapshotStorageError(
      "unsupported_schema_version",
      `Unsupported metrics_payload schemaVersion: ${String(obj["schemaVersion"])}`
    );
  }
  return obj as unknown as MetricsPayload;
}

function parseConfidencePayload(raw: unknown): ConfidencePayload {
  if (raw === null || typeof raw !== "object") {
    throw new SnapshotStorageError("invalid_stored_record", "confidence_payload is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["schemaVersion"] !== "string") {
    throw new SnapshotStorageError("invalid_stored_record", "confidence_payload missing schemaVersion");
  }
  if (obj["schemaVersion"] !== EVALUATION_SCHEMA_VERSION) {
    throw new SnapshotStorageError(
      "unsupported_schema_version",
      `Unsupported confidence_payload schemaVersion: ${String(obj["schemaVersion"])}`
    );
  }
  return obj as unknown as ConfidencePayload;
}

function parseProvenancePayload(raw: unknown): ProvenancePayload {
  if (raw === null || typeof raw !== "object") {
    throw new SnapshotStorageError("invalid_stored_record", "provenance_payload is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["schemaVersion"] !== "string") {
    throw new SnapshotStorageError("invalid_stored_record", "provenance_payload missing schemaVersion");
  }
  if (obj["schemaVersion"] !== EVALUATION_SCHEMA_VERSION) {
    throw new SnapshotStorageError(
      "unsupported_schema_version",
      `Unsupported provenance_payload schemaVersion: ${String(obj["schemaVersion"])}`
    );
  }
  return obj as unknown as ProvenancePayload;
}

function timestampToIso(ts: Date | string): string {
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) {
      throw new SnapshotStorageError("invalid_stored_record", `Unparseable timestamp: ${ts}`);
    }
    return d.toISOString();
  }
  throw new SnapshotStorageError("invalid_stored_record", "Unexpected timestamp type");
}

function validateOutcome(value: string): PredictionOutcome {
  if (value === "home_win" || value === "draw" || value === "away_win") {
    return value;
  }
  throw new SnapshotStorageError("invalid_stored_record", `Unknown actual_outcome: ${value}`);
}

function validateNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new SnapshotStorageError("invalid_stored_record", `${field} must be non-negative`);
  }
  return value;
}

function validateFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new SnapshotStorageError("invalid_stored_record", `${field} must be finite`);
  }
  return value;
}

function validateConfidenceLevel(value: string): PredictionConfidenceLevel {
  if (value === "high" || value === "medium" || value === "low" || value === "very_low") {
    return value;
  }
  throw new SnapshotStorageError("invalid_stored_record", `Unknown confidence level: ${value}`);
}

function validateCoverageType(value: string): PredictionCoverageType {
  if (value === "full" || value === "partial" || value === "fallback" || value === "fallback_only") {
    return value;
  }
  throw new SnapshotStorageError("invalid_stored_record", `Unknown coverage type: ${value}`);
}

export function rowToEvaluation(row: EvaluationRow): WorldCup2026PredictionEvaluation {
  if (row.evaluation_schema_version !== EVALUATION_SCHEMA_VERSION) {
    throw new SnapshotStorageError(
      "unsupported_schema_version",
      `Unsupported evaluation_schema_version: ${row.evaluation_schema_version}`
    );
  }

  const mp = parseMetricsPayload(row.metrics_payload);
  const cp = parseConfidencePayload(row.confidence_payload);
  const pp = parseProvenancePayload(row.provenance_payload);

  if (row.fixture_id === "" || row.model_version === "" || row.metric_version === "") {
    throw new SnapshotStorageError("invalid_stored_record", "Required identifier field is empty");
  }

  const actualOutcome = validateOutcome(row.actual_outcome);
  const actual: WorldCup2026PredictionEvaluationActual = {
    homeGoals: row.actual_home_goals,
    awayGoals: row.actual_away_goals,
    outcome: actualOutcome
  };

  // Validate metric finiteness
  const m = mp.metrics;
  validateNonNegative(m.homeGoalAbsoluteError, "homeGoalAbsoluteError");
  validateNonNegative(m.awayGoalAbsoluteError, "awayGoalAbsoluteError");
  validateNonNegative(m.totalGoalAbsoluteError, "totalGoalAbsoluteError");
  validateNonNegative(m.goalDifferenceAbsoluteError, "goalDifferenceAbsoluteError");
  validateFinite(m.brierScore, "brierScore");
  validateFinite(m.logLoss, "logLoss");
  validateFinite(m.predictedOutcomeProbability, "predictedOutcomeProbability");
  validateFinite(m.actualOutcomeProbability, "actualOutcomeProbability");

  // Validate confidence
  const c = cp.confidence;
  validateConfidenceLevel(c.level);
  validateCoverageType(c.coverageType);

  const evaluation: WorldCup2026PredictionEvaluation = {
    evaluationId: row.evaluation_id,
    snapshotId: row.snapshot_id,
    fixtureId: row.fixture_id,
    evaluatedAt: timestampToIso(row.evaluated_at),
    modelVersion: row.model_version,
    metricVersion: row.metric_version,
    predicted: mp.predicted,
    actual,
    metrics: mp.metrics,
    confidence: cp.confidence,
    provenance: pp.provenance,
    ...(row.provider_fixture_id !== null ? { providerFixtureId: row.provider_fixture_id } : {})
  };

  return evaluation;
}

// --------------------------------------------------------------------------
// PostgreSQL adapter factory.
// --------------------------------------------------------------------------

const DEFAULT_LIST_LIMIT = 1000;

// Postgres error codes
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_UNIQUE_VIOLATION = "23505";

function isForeignKeyError(err: unknown): boolean {
  if (err !== null && typeof err === "object") {
    const pgErr = err as Record<string, unknown>;
    return pgErr["code"] === PG_FOREIGN_KEY_VIOLATION;
  }
  return false;
}

function isUniqueViolation(err: unknown): boolean {
  if (err !== null && typeof err === "object") {
    const pgErr = err as Record<string, unknown>;
    return pgErr["code"] === PG_UNIQUE_VIOLATION;
  }
  return false;
}

export function createPostgresPredictionEvaluationStore(sql: Sql): AsyncPredictionEvaluationStore {
  async function fetchByIdentity(
    snapshotId: string,
    resultIdentity: string,
    metricVersion: string
  ): Promise<WorldCup2026PredictionEvaluation | null> {
    try {
      const rows = await sql<EvaluationRow[]>`
        SELECT * FROM prediction_evaluations
        WHERE snapshot_id = ${snapshotId}
          AND result_identity = ${resultIdentity}
          AND metric_version = ${metricVersion}
        LIMIT 1
      `;
      const row = rows[0];
      return row !== undefined ? rowToEvaluation(row) : null;
    } catch (err) {
      if (err instanceof SnapshotStorageError) throw err;
      throw new SnapshotStorageError("query_failed", "Failed to fetch evaluation by identity", err);
    }
  }

  return {
    async create(evaluation, identityKey) {
      const params = evaluationToInsertParams(evaluation, identityKey);

      let rows: EvaluationRow[];
      try {
        rows = await sql<EvaluationRow[]>`
          INSERT INTO prediction_evaluations (
            evaluation_id, snapshot_id, fixture_id, provider_fixture_id,
            model_version, metric_version, evaluation_schema_version,
            result_identity, evaluated_at,
            actual_home_goals, actual_away_goals, actual_outcome,
            metrics_payload, confidence_payload, provenance_payload
          ) VALUES (
            ${params.evaluation_id}, ${params.snapshot_id}, ${params.fixture_id},
            ${params.provider_fixture_id}, ${params.model_version},
            ${params.metric_version}, ${params.evaluation_schema_version},
            ${params.result_identity}, ${params.evaluated_at},
            ${params.actual_home_goals}, ${params.actual_away_goals}, ${params.actual_outcome},
            ${params.metrics_payload}::jsonb,
            ${params.confidence_payload}::jsonb,
            ${params.provenance_payload}::jsonb
          )
          ON CONFLICT (snapshot_id, result_identity, metric_version) DO NOTHING
          RETURNING *
        `;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        if (isForeignKeyError(err)) {
          throw new SnapshotStorageError(
            "foreign_key_violation",
            `Snapshot not found: ${evaluation.snapshotId}`
          );
        }
        if (isUniqueViolation(err)) {
          // Fall through to fetch-and-compare below.
          rows = [];
        } else {
          throw new SnapshotStorageError("query_failed", "Failed to insert prediction evaluation", err);
        }
      }

      if (rows.length > 0) {
        const row = rows[0];
        if (row === undefined) throw new SnapshotStorageError("query_failed", "Insert returned empty row");
        return {
          result: "created",
          evaluation: rowToEvaluation(row),
          identityKey,
          duplicate: false
        };
      }

      // Conflict — fetch existing record.
      const existing = await fetchByIdentity(evaluation.snapshotId, identityKey, evaluation.metricVersion);
      if (existing === null) {
        throw new SnapshotStorageError("query_failed", "Insert conflict but existing record not found");
      }

      // Same evaluation ID → idempotent duplicate.
      if (existing.evaluationId === evaluation.evaluationId) {
        return {
          result: "existing",
          evaluation: existing,
          identityKey,
          duplicate: true
        };
      }

      // Different evaluation ID under the same identity → integrity violation.
      throw new SnapshotStorageError(
        "duplicate_conflict",
        `Identity conflict for evaluation ${evaluation.evaluationId}`
      );
    },

    async getById(evaluationId) {
      try {
        const rows = await sql<EvaluationRow[]>`
          SELECT * FROM prediction_evaluations
          WHERE evaluation_id = ${evaluationId}
          LIMIT 1
        `;
        const row = rows[0];
        return row !== undefined ? rowToEvaluation(row) : null;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to fetch evaluation by id", err);
      }
    },

    getByIdentity: ({ snapshotId, resultIdentity, metricVersion }) =>
      fetchByIdentity(snapshotId, resultIdentity, metricVersion),

    async list({ snapshotId, fixtureId, limit } = {}) {
      const effectiveLimit = Math.min(limit ?? DEFAULT_LIST_LIMIT, DEFAULT_LIST_LIMIT);

      try {
        let rows: EvaluationRow[];
        if (snapshotId !== undefined && fixtureId !== undefined) {
          rows = await sql<EvaluationRow[]>`
            SELECT * FROM prediction_evaluations
            WHERE snapshot_id = ${snapshotId} AND fixture_id = ${fixtureId}
            ORDER BY evaluated_at ASC, evaluation_id ASC
            LIMIT ${effectiveLimit}
          `;
        } else if (snapshotId !== undefined) {
          rows = await sql<EvaluationRow[]>`
            SELECT * FROM prediction_evaluations
            WHERE snapshot_id = ${snapshotId}
            ORDER BY evaluated_at ASC, evaluation_id ASC
            LIMIT ${effectiveLimit}
          `;
        } else if (fixtureId !== undefined) {
          rows = await sql<EvaluationRow[]>`
            SELECT * FROM prediction_evaluations
            WHERE fixture_id = ${fixtureId}
            ORDER BY evaluated_at ASC, evaluation_id ASC
            LIMIT ${effectiveLimit}
          `;
        } else {
          rows = await sql<EvaluationRow[]>`
            SELECT * FROM prediction_evaluations
            ORDER BY evaluated_at ASC, evaluation_id ASC
            LIMIT ${effectiveLimit}
          `;
        }
        return rows.map(rowToEvaluation);
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to list prediction evaluations", err);
      }
    }
  };
}
