import type { Sql } from "postgres";
import type {
  LiveSyncCacheEntry,
  LiveSyncCacheGetInput,
  LiveSyncCacheSetInput,
  LiveSyncCacheDeleteInput,
  LiveSyncCacheStore
} from "./live-sync-cache.js";
import {
  LIVE_SYNC_CACHE_SCHEMA_VERSION,
  parseLiveSyncCachePayload
} from "./live-sync-cache.js";
import { SnapshotStorageError } from "./async-snapshot-store.js";

interface LiveSyncCacheRow {
  cache_key: string;
  payload: unknown;
  provider: string;
  synced_at: Date;
  expires_at: Date;
  schema_version: string;
  created_at: Date;
  updated_at: Date;
}

function rowToEntry(row: LiveSyncCacheRow): LiveSyncCacheEntry | null {
  if (row.schema_version !== LIVE_SYNC_CACHE_SCHEMA_VERSION) return null;
  const payload = parseLiveSyncCachePayload(row.payload);
  if (payload === null) return null;
  return {
    cacheKey: row.cache_key,
    payload,
    provider: row.provider,
    syncedAt: row.synced_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    schemaVersion: row.schema_version
  };
}

function isExpiredRow(row: LiveSyncCacheRow, nowIso?: string): boolean {
  const now = nowIso !== undefined ? Date.parse(nowIso) : Date.now();
  return row.expires_at.getTime() <= now;
}

export function createPostgresLiveSyncCacheStore(sql: Sql): LiveSyncCacheStore {
  return {
    async get({ cacheKey, now }: LiveSyncCacheGetInput) {
      try {
        const rows = await sql<LiveSyncCacheRow[]>`
          SELECT * FROM live_sync_cache
          WHERE cache_key = ${cacheKey}
          LIMIT 1
        `;
        const row = rows[0];
        if (row === undefined) return null;

        if (isExpiredRow(row, now)) {
          sql`DELETE FROM live_sync_cache WHERE cache_key = ${cacheKey}`.catch(() => {
            // intentionally ignored
          });
          return null;
        }

        return rowToEntry(row);
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to read live sync cache", err);
      }
    },

    async set({ cacheKey, payload, provider, syncedAt, expiresAt }: LiveSyncCacheSetInput) {
      const parsedPayload = parseLiveSyncCachePayload(payload);
      if (parsedPayload === null) {
        throw new SnapshotStorageError("invalid_stored_record", "Live sync cache payload is invalid");
      }

      try {
        await sql`
          INSERT INTO live_sync_cache (
            cache_key,
            payload,
            provider,
            synced_at,
            expires_at,
            schema_version,
            updated_at
          ) VALUES (
            ${cacheKey},
            ${sql.json(parsedPayload as unknown as Parameters<typeof sql.json>[0])},
            ${provider},
            ${syncedAt},
            ${expiresAt},
            ${LIVE_SYNC_CACHE_SCHEMA_VERSION},
            now()
          )
          ON CONFLICT (cache_key) DO UPDATE SET
            payload        = EXCLUDED.payload,
            provider       = EXCLUDED.provider,
            synced_at      = EXCLUDED.synced_at,
            expires_at     = EXCLUDED.expires_at,
            schema_version = EXCLUDED.schema_version,
            updated_at     = now()
        `;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to write live sync cache", err);
      }
    },

    async delete({ cacheKey }: LiveSyncCacheDeleteInput) {
      try {
        await sql`DELETE FROM live_sync_cache WHERE cache_key = ${cacheKey}`;
      } catch (err) {
        if (err instanceof SnapshotStorageError) throw err;
        throw new SnapshotStorageError("query_failed", "Failed to delete live sync cache entry", err);
      }
    }
  };
}
