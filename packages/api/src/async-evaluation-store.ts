import { SnapshotStorageError } from "./async-snapshot-store.js";
import type {
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionEvaluationCreateResult
} from "./schemas.js";

export const EVALUATION_SCHEMA_VERSION = "1" as const;

export interface AsyncPredictionEvaluationStore {
  create(
    evaluation: WorldCup2026PredictionEvaluation,
    identityKey: string
  ): Promise<WorldCup2026PredictionEvaluationCreateResult>;

  getById(evaluationId: string): Promise<WorldCup2026PredictionEvaluation | null>;

  getByIdentity(input: {
    snapshotId: string;
    resultIdentity: string;
    metricVersion: string;
  }): Promise<WorldCup2026PredictionEvaluation | null>;

  list(input?: {
    snapshotId?: string;
    fixtureId?: string;
    limit?: number;
  }): Promise<WorldCup2026PredictionEvaluation[]>;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compareEvaluations(
  a: WorldCup2026PredictionEvaluation,
  b: WorldCup2026PredictionEvaluation
): number {
  const cmp = a.evaluatedAt.localeCompare(b.evaluatedAt);
  return cmp !== 0 ? cmp : a.evaluationId.localeCompare(b.evaluationId);
}

export interface AsyncInMemoryEvaluationStoreOptions {
  snapshotExists?: (snapshotId: string) => Promise<boolean>;
}

export function createAsyncInMemoryEvaluationStore(
  options: AsyncInMemoryEvaluationStoreOptions = {}
): AsyncPredictionEvaluationStore & { reset(): void } {
  const byId = new Map<string, WorldCup2026PredictionEvaluation>();
  const byIdentity = new Map<string, WorldCup2026PredictionEvaluation>();

  function identityKey(snapshotId: string, resultIdentity: string, metricVersion: string): string {
    return `${snapshotId}::${resultIdentity}::${metricVersion}`;
  }

  return {
    async create(evaluation, evalIdentityKey) {
      if (options.snapshotExists !== undefined) {
        const exists = await options.snapshotExists(evaluation.snapshotId);
        if (!exists) {
          throw new SnapshotStorageError(
            "foreign_key_violation",
            `Snapshot not found: ${evaluation.snapshotId}`
          );
        }
      }

      const lookupKey = identityKey(evaluation.snapshotId, evalIdentityKey, evaluation.metricVersion);
      const existing = byIdentity.get(lookupKey);

      if (existing !== undefined) {
        if (existing.evaluationId !== evaluation.evaluationId) {
          throw new SnapshotStorageError(
            "duplicate_conflict",
            `Identity conflict for evaluation ${evaluation.evaluationId}`
          );
        }
        return {
          result: "existing",
          evaluation: deepCopy(existing),
          identityKey: evalIdentityKey,
          duplicate: true
        };
      }

      const stored = deepCopy(evaluation);
      byId.set(evaluation.evaluationId, stored);
      byIdentity.set(lookupKey, stored);

      return {
        result: "created",
        evaluation: deepCopy(stored),
        identityKey: evalIdentityKey,
        duplicate: false
      };
    },

    async getById(evaluationId) {
      const e = byId.get(evaluationId);
      return e !== undefined ? deepCopy(e) : null;
    },

    async getByIdentity({ snapshotId, resultIdentity, metricVersion }) {
      const key = identityKey(snapshotId, resultIdentity, metricVersion);
      const e = byIdentity.get(key);
      return e !== undefined ? deepCopy(e) : null;
    },

    async list({ snapshotId, fixtureId, limit } = {}) {
      let results = [...byId.values()].sort(compareEvaluations);
      if (snapshotId !== undefined) {
        results = results.filter((e) => e.snapshotId === snapshotId);
      }
      if (fixtureId !== undefined) {
        results = results.filter((e) => e.fixtureId === fixtureId);
      }
      if (limit !== undefined && limit > 0) {
        results = results.slice(0, limit);
      }
      return results.map(deepCopy);
    },

    reset() {
      byId.clear();
      byIdentity.clear();
    }
  };
}
