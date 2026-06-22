import type { Sql } from "postgres";
import type {
  GroupProjectionCacheStore,
  GroupProjectionCacheGetInput,
  GroupProjectionCacheSetInput,
  GroupProjectionCacheDeleteInput
} from "./async-projection-cache.js";
import { PROJECTION_CACHE_SCHEMA_VERSION, buildProjectionCacheKey } from "./async-projection-cache.js";
import { SnapshotStorageError } from "./async-snapshot-store.js";
import type { WorldCup2026GroupProjection } from "./schemas.js";

// --------------------------------------------------------------------------
// Internal row type — never escapes this module.
// --------------------------------------------------------------------------

interface ProjectionCacheRow {
  cache_key: string;
  group_code: string;
  timezone: string;
  projection_payload: unknown;
  input_fingerprint: string;
  model_version: string;
  formula_version: string;
  projection_cache_schema_version: string;
  generated_at: Date;
  expires_at: Date;
  updated_at: Date;
}

// --------------------------------------------------------------------------
// JSONB payload shape.
// --------------------------------------------------------------------------

interface ProjectionPayload {
  schemaVersion: string;
  projection: WorldCup2026GroupProjection;
}

// --------------------------------------------------------------------------
// Pure helpers.
// --------------------------------------------------------------------------

function parseProjectionPayload(raw: unknown): ProjectionPayload | null {
  if (raw === null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj["schemaVersion"] !== "string") return null;
  if (obj["schemaVersion"] !== PROJECTION_CACHE_SCHEMA_VERSION) return null;
  if (typeof obj["projection"] !== "object" || obj["projection"] === null) return null;
  return obj as unknown as ProjectionPayload;
}

function rowToProjection(row: ProjectionCacheRow): WorldCup2026GroupProjection | null {
  if (row.projection_cache_schema_version !== PROJECTION_CACHE_SCHEMA_VERSION) return null;
  const payload = parseProjectionPayload(row.projection_payload);
  if (payload === null) return null;
  return JSON.parse(JSON.stringify(payload.projection)) as WorldCup2026GroupProjection;
}

function isExpiredRow(row: ProjectionCacheRow, nowIso?: string): boolean {
  const now = nowIso !== undefined ? Date.parse(nowIso) : Date.now();
  return row.expires_at.getTime() <= now;
}

// --------------------------------------------------------------------------
// PostgreSQL adapter factory.
// --------------------------------------------------------------------------

export function createPostgresGroupProjectionCacheStore(sql: Sql): GroupProjectionCacheStore {
  return {
    async get({ group, timezone, now }: GroupProjectionCacheGetInput) {
      const cacheKey = buildProjectionCacheKey(group, timezone);
      try {
        const rows = await sql<ProjectionCacheRow[]>`
          SELECT * FROM projection_cache
          WHERE cache_key = ${cacheKey}
          LIMIT 1
        `;
        const row = rows[0];
        if (row === undefined) return null;

        if (isExpiredRow(row, now)) {
          // Lazy delete of expired row — best effort, non-blocking; never throws.
          sql`DELETE FROM projection_cache WHERE cache_key = ${cacheKey}`.catch(() => {
            // intentionally ignored
          });
          return null;
        }

        return rowToProjection(row);
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to read projection cache", err);
      }
    },

    async set({ group, timezone, projection, inputFingerprint, modelVersion, formulaVersion, generatedAt, expiresAt }: GroupProjectionCacheSetInput) {
      const cacheKey = buildProjectionCacheKey(group, timezone);
      const upperGroup = group.toUpperCase();
      const payload: ProjectionPayload = {
        schemaVersion: PROJECTION_CACHE_SCHEMA_VERSION,
        projection
      };
      try {
        await sql`
          INSERT INTO projection_cache (
            cache_key, group_code, timezone,
            projection_payload, input_fingerprint,
            model_version, formula_version,
            projection_cache_schema_version,
            generated_at, expires_at, updated_at
          ) VALUES (
            ${cacheKey}, ${upperGroup}, ${timezone},
            ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])}, ${inputFingerprint},
            ${modelVersion}, ${formulaVersion},
            ${PROJECTION_CACHE_SCHEMA_VERSION},
            ${generatedAt}, ${expiresAt}, now()
          )
          ON CONFLICT (group_code, timezone) DO UPDATE SET
            cache_key                       = EXCLUDED.cache_key,
            projection_payload              = EXCLUDED.projection_payload,
            input_fingerprint               = EXCLUDED.input_fingerprint,
            model_version                   = EXCLUDED.model_version,
            formula_version                 = EXCLUDED.formula_version,
            projection_cache_schema_version = EXCLUDED.projection_cache_schema_version,
            generated_at                    = EXCLUDED.generated_at,
            expires_at                      = EXCLUDED.expires_at,
            updated_at                      = now()
        `;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to write projection cache", err);
      }
    },

    async delete({ group, timezone }: GroupProjectionCacheDeleteInput) {
      const cacheKey = buildProjectionCacheKey(group, timezone);
      try {
        await sql`DELETE FROM projection_cache WHERE cache_key = ${cacheKey}`;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to delete projection cache entry", err);
      }
    }
  };
}
