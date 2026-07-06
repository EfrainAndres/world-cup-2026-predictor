import { SnapshotStorageError } from "./async-snapshot-store.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026ExternalStandingRecord,
  WorldCup2026ResultsProviderError,
  WorldCup2026SyncProviderMode,
  WorldCup2026SyncResult
} from "./schemas.js";

export { SnapshotStorageError };

export const LIVE_SYNC_CACHE_SCHEMA_VERSION = "1" as const;
export const LIVE_SYNC_LKG_CACHE_KEY = "world_cup_2026_live_results_lkg" as const;

// Default TTL: 15 minutes. Server-side only; stale data is always surfaced as cache-used.
export const LIVE_SYNC_LKG_CACHE_TTL_MS = 15 * 60 * 1000;

export interface LiveSyncCacheEntry {
  cacheKey: string;
  payload: WorldCup2026SyncResult;
  provider: string;
  syncedAt: string;
  expiresAt: string;
  schemaVersion: string;
}

export interface LiveSyncCacheGetInput {
  cacheKey: string;
  now?: string;
}

export interface LiveSyncCacheSetInput {
  cacheKey: string;
  payload: WorldCup2026SyncResult;
  provider: string;
  syncedAt: string;
  expiresAt: string;
}

export interface LiveSyncCacheDeleteInput {
  cacheKey: string;
}

export interface LiveSyncCacheStore {
  get(input: LiveSyncCacheGetInput): Promise<LiveSyncCacheEntry | null>;
  set(input: LiveSyncCacheSetInput): Promise<void>;
  delete(input: LiveSyncCacheDeleteInput): Promise<void>;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function hasOptionalString(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || typeof record[key] === "string";
}

function hasOptionalNonNegativeInteger(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || isNonNegativeInteger(record[key]);
}

const MATCH_STATUSES: readonly WorldCup2026ExternalMatchStatus[] = [
  "scheduled",
  "live",
  "halftime",
  "finished",
  "postponed",
  "cancelled",
  "unknown"
];

const PROVIDER_MODES: readonly WorldCup2026SyncProviderMode[] = [
  "football_data_org",
  "local_static"
];

function isExternalFixtureRecord(value: unknown): value is WorldCup2026ExternalFixtureRecord {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value["providerFixtureId"])) return false;
  if (!isNonEmptyString(value["competition"])) return false;
  if (!isNonEmptyString(value["season"])) return false;
  if (!isNonEmptyString(value["homeTeam"])) return false;
  if (!isNonEmptyString(value["awayTeam"])) return false;
  if (!MATCH_STATUSES.includes(value["status"] as WorldCup2026ExternalMatchStatus)) return false;

  return (
    hasOptionalString(value, "stage") &&
    hasOptionalString(value, "group") &&
    hasOptionalString(value, "kickoffAt") &&
    hasOptionalString(value, "winner") &&
    hasOptionalString(value, "decisionMethod") &&
    hasOptionalString(value, "venue") &&
    hasOptionalString(value, "updatedAt") &&
    hasOptionalNonNegativeInteger(value, "matchday") &&
    hasOptionalNonNegativeInteger(value, "homeScore") &&
    hasOptionalNonNegativeInteger(value, "awayScore") &&
    hasOptionalNonNegativeInteger(value, "regularTimeHomeScore") &&
    hasOptionalNonNegativeInteger(value, "regularTimeAwayScore") &&
    hasOptionalNonNegativeInteger(value, "extraTimeHomeScore") &&
    hasOptionalNonNegativeInteger(value, "extraTimeAwayScore") &&
    hasOptionalNonNegativeInteger(value, "penaltyHomeScore") &&
    hasOptionalNonNegativeInteger(value, "penaltyAwayScore")
  );
}

function isExternalStandingRecord(value: unknown): value is WorldCup2026ExternalStandingRecord {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value["team"])) return false;
  if (!hasOptionalString(value, "group")) return false;
  return [
    "position",
    "played",
    "wins",
    "draws",
    "losses",
    "goalsFor",
    "goalsAgainst",
    "goalDifference",
    "points"
  ].every((key) => Number.isInteger(value[key]));
}

function isProviderError(value: unknown): value is WorldCup2026ResultsProviderError {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value["code"]) &&
    isNonEmptyString(value["providerId"]) &&
    isNonEmptyString(value["operation"]) &&
    isNonEmptyString(value["message"]) &&
    (value["details"] === undefined ||
      (Array.isArray(value["details"]) && value["details"].every((detail) => typeof detail === "string")))
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isFixtureArray(value: unknown): value is readonly WorldCup2026ExternalFixtureRecord[] {
  return Array.isArray(value) && value.every(isExternalFixtureRecord);
}

function isStandingArray(value: unknown): value is readonly WorldCup2026ExternalStandingRecord[] {
  return Array.isArray(value) && value.every(isExternalStandingRecord);
}

function isProviderErrorArray(value: unknown): value is readonly WorldCup2026ResultsProviderError[] {
  return Array.isArray(value) && value.every(isProviderError);
}

export function isWorldCup2026SyncResult(value: unknown): value is WorldCup2026SyncResult {
  if (!isRecord(value)) return false;
  if (value["status"] !== "success" && value["status"] !== "error") return false;
  if (!PROVIDER_MODES.includes(value["providerMode"] as WorldCup2026SyncProviderMode)) return false;
  if (!isNonEmptyString(value["activeProvider"])) return false;
  if (!isBoolean(value["cacheUsed"])) return false;
  if (!isBoolean(value["localFallbackUsed"])) return false;
  if (!isBoolean(value["externalProviderEnabled"])) return false;
  if (!isNonEmptyString(value["syncedAt"]) || Number.isNaN(Date.parse(value["syncedAt"]))) return false;
  if (value["lastSuccessfulSync"] !== undefined && typeof value["lastSuccessfulSync"] !== "string") return false;
  if (!isFixtureArray(value["fixtures"])) return false;
  if (!isFixtureArray(value["liveMatches"])) return false;
  if (!isFixtureArray(value["completedResults"])) return false;
  if (!isStandingArray(value["standings"])) return false;
  if (!isProviderErrorArray(value["normalizationIssues"])) return false;
  if (!isStringArray(value["warnings"])) return false;
  if (value["error"] !== undefined && !isProviderError(value["error"])) return false;
  return true;
}

export function parseLiveSyncCachePayload(raw: unknown): WorldCup2026SyncResult | null {
  if (!isWorldCup2026SyncResult(raw)) return null;
  return deepCopy(raw);
}

function assertValidCacheKey(cacheKey: string): void {
  if (cacheKey.trim() === "") {
    throw new SnapshotStorageError("invalid_cache_key", "Live sync cache key must not be empty");
  }
}

function isExpired(expiresAt: string, nowIso?: string): boolean {
  const now = nowIso !== undefined ? Date.parse(nowIso) : Date.now();
  return Date.parse(expiresAt) <= now;
}

function assertValidCacheTimes(syncedAt: string, expiresAt: string): void {
  const syncedAtMs = Date.parse(syncedAt);
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(syncedAtMs)) {
    throw new SnapshotStorageError("invalid_expiration", `Cannot parse syncedAt: ${syncedAt}`);
  }
  if (Number.isNaN(expiresAtMs)) {
    throw new SnapshotStorageError("invalid_expiration", `Cannot parse expiresAt: ${expiresAt}`);
  }
  if (expiresAtMs <= syncedAtMs) {
    throw new SnapshotStorageError("invalid_expiration", "Live sync cache expiry must be after syncedAt");
  }
}

export function computeLiveSyncCacheExpiresAt(
  syncedAt: string,
  ttlMs = LIVE_SYNC_LKG_CACHE_TTL_MS
): string {
  const syncedAtMs = Date.parse(syncedAt);
  if (Number.isNaN(syncedAtMs)) {
    throw new SnapshotStorageError("invalid_expiration", `Cannot parse syncedAt: ${syncedAt}`);
  }
  return new Date(syncedAtMs + ttlMs).toISOString();
}

export function createNoopLiveSyncCacheStore(): LiveSyncCacheStore {
  return {
    async get() {
      return null;
    },
    async set() {
      return undefined;
    },
    async delete() {
      return undefined;
    }
  };
}

export function createInMemoryLiveSyncCacheStore(): LiveSyncCacheStore & { reset(): void } {
  const entries = new Map<string, LiveSyncCacheEntry>();

  return {
    async get({ cacheKey, now }) {
      assertValidCacheKey(cacheKey);
      const entry = entries.get(cacheKey);
      if (entry === undefined) return null;
      if (entry.schemaVersion !== LIVE_SYNC_CACHE_SCHEMA_VERSION) return null;
      if (isExpired(entry.expiresAt, now)) {
        entries.delete(cacheKey);
        return null;
      }
      const payload = parseLiveSyncCachePayload(entry.payload);
      if (payload === null) return null;
      return deepCopy({ ...entry, payload });
    },

    async set({ cacheKey, payload, provider, syncedAt, expiresAt }) {
      assertValidCacheKey(cacheKey);
      assertValidCacheTimes(syncedAt, expiresAt);
      const parsed = parseLiveSyncCachePayload(payload);
      if (parsed === null) {
        throw new SnapshotStorageError("invalid_stored_record", "Live sync cache payload is invalid");
      }
      entries.set(cacheKey, {
        cacheKey,
        payload: parsed,
        provider,
        syncedAt,
        expiresAt,
        schemaVersion: LIVE_SYNC_CACHE_SCHEMA_VERSION
      });
    },

    async delete({ cacheKey }) {
      assertValidCacheKey(cacheKey);
      entries.delete(cacheKey);
    },

    reset() {
      entries.clear();
    }
  };
}
