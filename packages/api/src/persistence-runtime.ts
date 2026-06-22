import postgres, { type Sql } from "postgres";
import {
  SnapshotStorageError,
  type AsyncPredictionSnapshotStore
} from "./async-snapshot-store.js";
import type { AsyncPredictionEvaluationStore } from "./async-evaluation-store.js";
import {
  createPostgresPredictionSnapshotStore
} from "./postgres-snapshot-store.js";
import {
  createPostgresPredictionEvaluationStore
} from "./postgres-evaluation-store.js";
import {
  defaultSnapshotStore,
  type PredictionSnapshotStore
} from "./snapshot-store.js";
import {
  defaultPredictionEvaluationStore,
  type PredictionEvaluationStore
} from "./prediction-evaluation-store.js";

export type PredictionHistoryPersistenceProvider = "memory" | "postgres";

export type PredictionHistoryPersistenceErrorCode =
  | "invalid_provider"
  | "missing_database_url";

export interface PredictionHistoryPersistenceMetadata {
  provider: PredictionHistoryPersistenceProvider;
  persistent: boolean;
  configuredProvider: string;
}

export interface PredictionHistoryPersistenceResolution {
  provider: PredictionHistoryPersistenceProvider;
  snapshotStore: AsyncPredictionSnapshotStore;
  evaluationStore: AsyncPredictionEvaluationStore;
  metadata: PredictionHistoryPersistenceMetadata;
}

export interface PredictionHistoryPersistenceConfig {
  provider: PredictionHistoryPersistenceProvider;
  databaseUrl?: string;
  configuredProvider: string;
  persistent: boolean;
}

export class PredictionHistoryPersistenceConfigError extends Error {
  readonly code: PredictionHistoryPersistenceErrorCode;

  constructor(code: PredictionHistoryPersistenceErrorCode, message: string) {
    super(message);
    this.name = "PredictionHistoryPersistenceConfigError";
    this.code = code;
  }
}

export interface ResolvePredictionHistoryPersistenceInput {
  env?: Record<string, string | undefined>;
  sqlFactory?: (databaseUrl: string) => Sql;
  snapshotStore?: PredictionSnapshotStore;
  evaluationStore?: PredictionEvaluationStore;
}

interface MemoryResolutionCache {
  snapshotStore: AsyncPredictionSnapshotStore;
  evaluationStore: AsyncPredictionEvaluationStore;
}

interface PostgresResolutionCache {
  sql: Sql;
  snapshotStore: AsyncPredictionSnapshotStore;
  evaluationStore: AsyncPredictionEvaluationStore;
}

let memoryResolutionCache: MemoryResolutionCache | undefined;
let postgresResolutionCache: PostgresResolutionCache | undefined;
let postgresResolutionUrl: string | undefined;

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function adaptPredictionSnapshotStore(
  store: PredictionSnapshotStore
): AsyncPredictionSnapshotStore {
  const snapshotsByIdempotencyKey = new Map<string, string>();

  return {
    async create(snapshot, idempotencyKey) {
      const result = store.create(snapshot, idempotencyKey);
      snapshotsByIdempotencyKey.set(idempotencyKey, result.snapshot.snapshotId);
      return deepCopy(result);
    },

    async getById(snapshotId) {
      return deepCopy(store.getById(snapshotId) ?? null);
    },

    async getByIdempotencyKey(idempotencyKey) {
      const snapshotId = snapshotsByIdempotencyKey.get(idempotencyKey);
      return deepCopy(snapshotId === undefined ? null : store.getById(snapshotId) ?? null);
    },

    async list({ fixtureId, limit } = {}) {
      const snapshots =
        fixtureId === undefined ? store.list() : store.getByFixtureId(fixtureId);
      const bounded =
        limit !== undefined && limit > 0 ? snapshots.slice(0, limit) : snapshots;
      return deepCopy([...bounded]);
    }
  };
}

function adaptPredictionEvaluationStore(
  store: PredictionEvaluationStore
): AsyncPredictionEvaluationStore {
  const evaluationsByIdentity = new Map<string, string>();

  return {
    async create(evaluation, identityKey) {
      const result = store.create(evaluation, identityKey);
      evaluationsByIdentity.set(
        `${evaluation.snapshotId}::${identityKey}::${evaluation.metricVersion}`,
        result.evaluation.evaluationId
      );
      return deepCopy(result);
    },

    async getById(evaluationId) {
      return deepCopy(store.getById(evaluationId) ?? null);
    },

    async getByIdentity({ snapshotId, resultIdentity, metricVersion }) {
      const evaluationId = evaluationsByIdentity.get(
        `${snapshotId}::${resultIdentity}::${metricVersion}`
      );
      return deepCopy(
        evaluationId === undefined ? null : store.getById(evaluationId) ?? null
      );
    },

    async list({ snapshotId, fixtureId, limit } = {}) {
      let evaluations = store.list();

      if (snapshotId !== undefined) {
        evaluations = evaluations.filter((evaluation) => evaluation.snapshotId === snapshotId);
      }

      if (fixtureId !== undefined) {
        evaluations = evaluations.filter((evaluation) => evaluation.fixtureId === fixtureId);
      }

      const bounded =
        limit !== undefined && limit > 0 ? evaluations.slice(0, limit) : evaluations;
      return deepCopy([...bounded]);
    }
  };
}

export function getPredictionHistoryPersistenceConfig(
  env: Record<string, string | undefined> = process.env
): PredictionHistoryPersistenceConfig {
  const configuredProvider = (env.PERSISTENCE_PROVIDER ?? "memory").trim() || "memory";

  if (configuredProvider !== "memory" && configuredProvider !== "postgres") {
    throw new PredictionHistoryPersistenceConfigError(
      "invalid_provider",
      'PERSISTENCE_PROVIDER must be "memory" or "postgres".'
    );
  }

  if (configuredProvider === "postgres") {
    const databaseUrl = env.DATABASE_URL?.trim();

    if (databaseUrl === undefined || databaseUrl === "") {
      throw new PredictionHistoryPersistenceConfigError(
        "missing_database_url",
        "DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres."
      );
    }

    return {
      provider: "postgres",
      databaseUrl,
      configuredProvider,
      persistent: true
    };
  }

  return {
    provider: "memory",
    configuredProvider,
    persistent: false
  };
}

function createDefaultSqlClient(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });
}

export async function resolvePredictionHistoryPersistence(
  input: ResolvePredictionHistoryPersistenceInput = {}
): Promise<PredictionHistoryPersistenceResolution> {
  const config = getPredictionHistoryPersistenceConfig(input.env);

  if (config.provider === "memory") {
    if (memoryResolutionCache === undefined) {
      const snapshotStore = adaptPredictionSnapshotStore(
        input.snapshotStore ?? defaultSnapshotStore
      );
      const evaluationStore = adaptPredictionEvaluationStore(
        input.evaluationStore ?? defaultPredictionEvaluationStore
      );

      memoryResolutionCache = {
        snapshotStore,
        evaluationStore
      };
    }

    return {
      provider: "memory",
      snapshotStore: memoryResolutionCache.snapshotStore,
      evaluationStore: memoryResolutionCache.evaluationStore,
      metadata: {
        provider: "memory",
        persistent: false,
        configuredProvider: config.configuredProvider
      }
    };
  }

  if (
    postgresResolutionCache === undefined ||
    postgresResolutionUrl !== config.databaseUrl
  ) {
    const sql = (input.sqlFactory ?? createDefaultSqlClient)(config.databaseUrl!);

    postgresResolutionCache = {
      sql,
      snapshotStore: createPostgresPredictionSnapshotStore(sql),
      evaluationStore: createPostgresPredictionEvaluationStore(sql)
    };
    postgresResolutionUrl = config.databaseUrl;
  }

  return {
    provider: "postgres",
    snapshotStore: postgresResolutionCache.snapshotStore,
    evaluationStore: postgresResolutionCache.evaluationStore,
    metadata: {
      provider: "postgres",
      persistent: true,
      configuredProvider: config.configuredProvider
    }
  };
}

export async function shutdownPredictionHistoryPersistenceForTests(): Promise<void> {
  memoryResolutionCache = undefined;

  if (postgresResolutionCache !== undefined) {
    await postgresResolutionCache.sql.end({ timeout: 1 });
  }

  postgresResolutionCache = undefined;
  postgresResolutionUrl = undefined;
}

export function isPredictionHistoryPersistenceError(
  error: unknown
): error is PredictionHistoryPersistenceConfigError | SnapshotStorageError {
  return (
    error instanceof PredictionHistoryPersistenceConfigError ||
    error instanceof SnapshotStorageError
  );
}
