import type { WorldCup2026PredictionSnapshot, WorldCup2026PredictionSnapshotCreateResult } from "./schemas.js";

export const SNAPSHOT_SCHEMA_VERSION = "1" as const;

export type SnapshotStorageErrorCode =
  | "connection_unavailable"
  | "migration_missing"
  | "duplicate_conflict"
  | "foreign_key_violation"
  | "invalid_stored_record"
  | "unsupported_schema_version"
  | "query_failed";

export class SnapshotStorageError extends Error {
  readonly code: SnapshotStorageErrorCode;

  constructor(code: SnapshotStorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "SnapshotStorageError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export interface AsyncPredictionSnapshotStore {
  create(
    snapshot: WorldCup2026PredictionSnapshot,
    idempotencyKey: string
  ): Promise<WorldCup2026PredictionSnapshotCreateResult>;

  getById(snapshotId: string): Promise<WorldCup2026PredictionSnapshot | null>;

  getByIdempotencyKey(idempotencyKey: string): Promise<WorldCup2026PredictionSnapshot | null>;

  list(input?: {
    fixtureId?: string;
    limit?: number;
  }): Promise<WorldCup2026PredictionSnapshot[]>;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compareByCapture(a: WorldCup2026PredictionSnapshot, b: WorldCup2026PredictionSnapshot): number {
  const dateCmp = a.capturedAt.localeCompare(b.capturedAt);
  return dateCmp !== 0 ? dateCmp : a.snapshotId.localeCompare(b.snapshotId);
}

export function createAsyncInMemorySnapshotStore(): AsyncPredictionSnapshotStore & { reset(): void } {
  const byId = new Map<string, WorldCup2026PredictionSnapshot>();
  const byIdempotency = new Map<string, WorldCup2026PredictionSnapshot>();

  return {
    async create(snapshot, idempotencyKey) {
      const existing = byIdempotency.get(idempotencyKey);
      if (existing !== undefined) {
        if (existing.contentHash !== snapshot.contentHash) {
          throw new SnapshotStorageError(
            "duplicate_conflict",
            `Idempotency key conflict with differing content hash for snapshot ${snapshot.snapshotId}`
          );
        }
        return {
          result: "existing",
          snapshot: deepCopy(existing),
          idempotencyKey,
          duplicate: true
        };
      }
      const stored = deepCopy(snapshot);
      byId.set(snapshot.snapshotId, stored);
      byIdempotency.set(idempotencyKey, stored);
      return {
        result: "created",
        snapshot: deepCopy(stored),
        idempotencyKey,
        duplicate: false
      };
    },

    async getById(snapshotId) {
      const s = byId.get(snapshotId);
      return s !== undefined ? deepCopy(s) : null;
    },

    async getByIdempotencyKey(idempotencyKey) {
      const s = byIdempotency.get(idempotencyKey);
      return s !== undefined ? deepCopy(s) : null;
    },

    async list({ fixtureId, limit } = {}) {
      let results = [...byId.values()].sort(compareByCapture);
      if (fixtureId !== undefined) {
        results = results.filter((s) => s.fixtureId === fixtureId);
      }
      if (limit !== undefined && limit > 0) {
        results = results.slice(0, limit);
      }
      return results.map(deepCopy);
    },

    reset() {
      byId.clear();
      byIdempotency.clear();
    }
  };
}
