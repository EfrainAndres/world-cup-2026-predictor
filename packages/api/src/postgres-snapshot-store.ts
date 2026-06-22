import type { Sql } from "postgres";
import {
  AsyncPredictionSnapshotStore,
  SNAPSHOT_SCHEMA_VERSION,
  SnapshotStorageError
} from "./async-snapshot-store.js";
import { CURRENT_FORMULA_VERSION } from "./projection-refresh-policy.js";
import type {
  PredictionConfidenceAssessment,
  PredictionSnapshotStatus,
  WorldCup2026PredictionSnapshot,
  WorldCup2026PredictionSnapshotCreateResult,
  WorldCup2026PredictionSnapshotInputs,
  WorldCup2026PredictionSnapshotModelConfig,
  WorldCup2026PredictionSnapshotPrediction,
  WorldCup2026PredictionSnapshotProvenance
} from "./schemas.js";

// --------------------------------------------------------------------------
// Row types — these stay internal to this module.
// --------------------------------------------------------------------------

interface SnapshotRow {
  snapshot_id: string;
  fixture_id: string;
  provider_fixture_id: string | null;
  snapshot_status: string;
  captured_at: Date;
  cutoff_at: Date;
  kickoff_at: Date | null;
  group_code: string | null;
  matchday: number | null;
  home_team: string;
  away_team: string;
  model_version: string;
  formula_version: string;
  snapshot_schema_version: string;
  idempotency_key: string;
  content_hash: string;
  prediction_payload: unknown;
  confidence_payload: unknown;
  provenance_payload: unknown;
  created_at: Date;
}

// --------------------------------------------------------------------------
// Payload shapes stored in JSONB columns.
// --------------------------------------------------------------------------

interface PredictionPayload {
  schemaVersion: string;
  modelConfiguration: WorldCup2026PredictionSnapshotModelConfig;
  inputs: WorldCup2026PredictionSnapshotInputs;
  prediction: WorldCup2026PredictionSnapshotPrediction;
}

interface ConfidencePayload {
  schemaVersion: string;
  confidence: PredictionConfidenceAssessment;
}

interface ProvenancePayload {
  schemaVersion: string;
  provenance: WorldCup2026PredictionSnapshotProvenance;
}

// --------------------------------------------------------------------------
// Row mapping helpers (pure functions — no SQL, no I/O).
// --------------------------------------------------------------------------

export interface SnapshotInsertParams {
  snapshot_id: string;
  fixture_id: string;
  provider_fixture_id: null;
  snapshot_status: string;
  captured_at: string;
  cutoff_at: string;
  kickoff_at: string | null;
  group_code: string | null;
  matchday: number | null;
  home_team: string;
  away_team: string;
  model_version: string;
  formula_version: string;
  snapshot_schema_version: string;
  idempotency_key: string;
  content_hash: string;
  prediction_payload: string;
  confidence_payload: string;
  provenance_payload: string;
}

export function snapshotToInsertParams(
  snapshot: WorldCup2026PredictionSnapshot,
  idempotencyKey: string
): SnapshotInsertParams {
  const predictionPayload: PredictionPayload = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    modelConfiguration: snapshot.modelConfiguration,
    inputs: snapshot.inputs,
    prediction: snapshot.prediction
  };

  const confidencePayload: ConfidencePayload = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    confidence: snapshot.confidence
  };

  const provenancePayload: ProvenancePayload = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    provenance: snapshot.provenance
  };

  return {
    snapshot_id: snapshot.snapshotId,
    fixture_id: snapshot.fixtureId,
    provider_fixture_id: null,
    snapshot_status: snapshot.status,
    captured_at: snapshot.capturedAt,
    cutoff_at: snapshot.cutoffAt,
    kickoff_at: snapshot.kickoffAt !== undefined ? snapshot.kickoffAt : null,
    group_code: snapshot.group !== undefined ? snapshot.group : null,
    matchday: snapshot.matchday !== undefined ? snapshot.matchday : null,
    home_team: snapshot.homeTeam,
    away_team: snapshot.awayTeam,
    model_version: snapshot.modelVersion,
    formula_version: CURRENT_FORMULA_VERSION,
    snapshot_schema_version: SNAPSHOT_SCHEMA_VERSION,
    idempotency_key: idempotencyKey,
    content_hash: snapshot.contentHash,
    prediction_payload: JSON.stringify(predictionPayload),
    confidence_payload: JSON.stringify(confidencePayload),
    provenance_payload: JSON.stringify(provenancePayload)
  };
}

function parsePredictionPayload(raw: unknown): PredictionPayload {
  if (raw === null || typeof raw !== "object") {
    throw new SnapshotStorageError("invalid_stored_record", "prediction_payload is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["schemaVersion"] !== "string") {
    throw new SnapshotStorageError("invalid_stored_record", "prediction_payload missing schemaVersion");
  }
  if (obj["schemaVersion"] !== SNAPSHOT_SCHEMA_VERSION) {
    throw new SnapshotStorageError(
      "unsupported_schema_version",
      `Unsupported prediction_payload schemaVersion: ${String(obj["schemaVersion"])}`
    );
  }
  return obj as unknown as PredictionPayload;
}

function parseConfidencePayload(raw: unknown): ConfidencePayload {
  if (raw === null || typeof raw !== "object") {
    throw new SnapshotStorageError("invalid_stored_record", "confidence_payload is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["schemaVersion"] !== "string") {
    throw new SnapshotStorageError("invalid_stored_record", "confidence_payload missing schemaVersion");
  }
  if (obj["schemaVersion"] !== SNAPSHOT_SCHEMA_VERSION) {
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
  if (obj["schemaVersion"] !== SNAPSHOT_SCHEMA_VERSION) {
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

export function rowToSnapshot(row: SnapshotRow): WorldCup2026PredictionSnapshot {
  if (row.snapshot_schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    throw new SnapshotStorageError(
      "unsupported_schema_version",
      `Unsupported snapshot_schema_version: ${row.snapshot_schema_version}`
    );
  }

  const predictionPayload = parsePredictionPayload(row.prediction_payload);
  const confidencePayload = parseConfidencePayload(row.confidence_payload);
  const provenancePayload = parseProvenancePayload(row.provenance_payload);

  if (row.fixture_id === "" || row.home_team === "" || row.away_team === "" || row.model_version === "") {
    throw new SnapshotStorageError("invalid_stored_record", "Required identifier field is empty");
  }

  const status = row.snapshot_status as PredictionSnapshotStatus;
  if (status !== "pre_match_locked" && status !== "foundation_unverified") {
    throw new SnapshotStorageError("invalid_stored_record", `Unknown snapshot_status: ${row.snapshot_status}`);
  }

  const snapshot: WorldCup2026PredictionSnapshot = {
    snapshotId: row.snapshot_id,
    fixtureId: row.fixture_id,
    status,
    capturedAt: timestampToIso(row.captured_at),
    cutoffAt: timestampToIso(row.cutoff_at),
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    modelVersion: row.model_version,
    modelConfiguration: predictionPayload.modelConfiguration,
    inputs: predictionPayload.inputs,
    prediction: predictionPayload.prediction,
    confidence: confidencePayload.confidence,
    provenance: provenancePayload.provenance,
    contentHash: row.content_hash,
    ...(row.kickoff_at !== null ? { kickoffAt: timestampToIso(row.kickoff_at) } : {}),
    ...(row.group_code !== null ? { group: row.group_code } : {}),
    ...(row.matchday !== null ? { matchday: row.matchday } : {})
  };

  return snapshot;
}

// --------------------------------------------------------------------------
// PostgreSQL adapter factory.
//
// Accept an injected sql client — no global connection created here.
// The caller is responsible for creating and managing the client lifecycle.
// --------------------------------------------------------------------------

const DEFAULT_LIST_LIMIT = 1000;

export function createPostgresPredictionSnapshotStore(sql: Sql): AsyncPredictionSnapshotStore {
  async function fetchByIdempotencyKey(key: string): Promise<WorldCup2026PredictionSnapshot | null> {
    try {
      const rows = await sql<SnapshotRow[]>`
        SELECT * FROM prediction_snapshots
        WHERE idempotency_key = ${key}
        LIMIT 1
      `;
      const row = rows[0];
      if (row === undefined) return null;
      return rowToSnapshot(row);
    } catch (err) {
      if (err instanceof SnapshotStorageError) throw err;
      throw new SnapshotStorageError("query_failed", "Failed to fetch snapshot by idempotency key", err);
    }
  }

  return {
    async create(snapshot, idempotencyKey) {
      const params = snapshotToInsertParams(snapshot, idempotencyKey);

      let rows: SnapshotRow[];
      try {
        rows = await sql<SnapshotRow[]>`
          INSERT INTO prediction_snapshots (
            snapshot_id, fixture_id, provider_fixture_id, snapshot_status,
            captured_at, cutoff_at, kickoff_at, group_code, matchday,
            home_team, away_team, model_version, formula_version,
            snapshot_schema_version, idempotency_key, content_hash,
            prediction_payload, confidence_payload, provenance_payload
          ) VALUES (
            ${params.snapshot_id}, ${params.fixture_id}, ${params.provider_fixture_id},
            ${params.snapshot_status}, ${params.captured_at}, ${params.cutoff_at},
            ${params.kickoff_at}, ${params.group_code}, ${params.matchday},
            ${params.home_team}, ${params.away_team}, ${params.model_version},
            ${params.formula_version}, ${params.snapshot_schema_version},
            ${params.idempotency_key}, ${params.content_hash},
            ${params.prediction_payload}::jsonb,
            ${params.confidence_payload}::jsonb,
            ${params.provenance_payload}::jsonb
          )
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING *
        `;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to insert prediction snapshot", err);
      }

      if (rows.length > 0) {
        const row = rows[0];
        if (row === undefined) throw new SnapshotStorageError("query_failed", "Insert returned empty row");
        return {
          result: "created",
          snapshot: rowToSnapshot(row),
          idempotencyKey,
          duplicate: false
        };
      }

      // Conflict — fetch existing record.
      const existing = await fetchByIdempotencyKey(idempotencyKey);
      if (existing === null) {
        throw new SnapshotStorageError(
          "query_failed",
          "Insert conflict but existing record not found"
        );
      }

      // Idempotent duplicate: same content hash → safe to return existing.
      if (existing.contentHash === snapshot.contentHash) {
        return {
          result: "existing",
          snapshot: existing,
          idempotencyKey,
          duplicate: true
        };
      }

      // Conflicting duplicate: same idempotency key but different content.
      // This indicates an integrity problem — do not silently overwrite.
      throw new SnapshotStorageError(
        "duplicate_conflict",
        `Idempotency key conflict with differing content hash for snapshot ${snapshot.snapshotId}`
      );
    },

    async getById(snapshotId) {
      try {
        const rows = await sql<SnapshotRow[]>`
          SELECT * FROM prediction_snapshots
          WHERE snapshot_id = ${snapshotId}
          LIMIT 1
        `;
        const row = rows[0];
        if (row === undefined) return null;
        return rowToSnapshot(row);
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to fetch snapshot by id", err);
      }
    },

    getByIdempotencyKey: fetchByIdempotencyKey,

    async list({ fixtureId, limit } = {}) {
      const effectiveLimit = Math.min(limit ?? DEFAULT_LIST_LIMIT, DEFAULT_LIST_LIMIT);

      try {
        let rows: SnapshotRow[];
        if (fixtureId !== undefined) {
          rows = await sql<SnapshotRow[]>`
            SELECT * FROM prediction_snapshots
            WHERE fixture_id = ${fixtureId}
            ORDER BY captured_at ASC, snapshot_id ASC
            LIMIT ${effectiveLimit}
          `;
        } else {
          rows = await sql<SnapshotRow[]>`
            SELECT * FROM prediction_snapshots
            ORDER BY captured_at ASC, snapshot_id ASC
            LIMIT ${effectiveLimit}
          `;
        }
        return rows.map(rowToSnapshot);
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to list prediction snapshots", err);
      }
    }
  };
}
