import { SnapshotStorageError } from "./async-snapshot-store.js";
import type { WorldCup2026GroupProjection } from "./schemas.js";

export { SnapshotStorageError };

export const PROJECTION_CACHE_SCHEMA_VERSION = "1" as const;

// Default TTL: 15 minutes. Server-side only; never exposed to browser.
export const PROJECTION_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Builds a deterministic canonical cache key from group code and timezone.
 * Format: "wc2026:<UPPERCASE_GROUP>:<timezone>"
 * No secrets, no timestamp, no random component.
 */
export function buildProjectionCacheKey(group: string, timezone: string): string {
  if (group.trim() === "") {
    throw new SnapshotStorageError("invalid_cache_key", "Group code must not be empty");
  }
  if (timezone.trim() === "") {
    throw new SnapshotStorageError("invalid_cache_key", "Timezone must not be empty");
  }
  return `wc2026:${group.toUpperCase()}:${timezone}`;
}

/** Computes expiry timestamp given a generated-at ISO string and optional TTL override. */
export function computeProjectionCacheExpiresAt(generatedAt: string, ttlMs = PROJECTION_CACHE_TTL_MS): string {
  const ts = Date.parse(generatedAt);
  if (Number.isNaN(ts)) {
    throw new SnapshotStorageError("invalid_expiration", `Cannot parse generatedAt: ${generatedAt}`);
  }
  return new Date(ts + ttlMs).toISOString();
}

export interface GroupProjectionCacheGetInput {
  group: string;
  timezone: string;
  /** ISO timestamp used as "now" for expiry checks. Defaults to real clock when absent. */
  now?: string;
}

export interface GroupProjectionCacheSetInput {
  group: string;
  timezone: string;
  projection: WorldCup2026GroupProjection;
  inputFingerprint: string;
  modelVersion: string;
  formulaVersion: string;
  generatedAt: string;
  expiresAt: string;
}

export interface GroupProjectionCacheDeleteInput {
  group: string;
  timezone: string;
}

export interface GroupProjectionCacheStore {
  get(input: GroupProjectionCacheGetInput): Promise<WorldCup2026GroupProjection | null>;
  set(input: GroupProjectionCacheSetInput): Promise<void>;
  delete(input: GroupProjectionCacheDeleteInput): Promise<void>;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface InMemoryCacheEntry {
  projection: WorldCup2026GroupProjection;
  inputFingerprint: string;
  modelVersion: string;
  formulaVersion: string;
  generatedAt: string;
  expiresAt: string;
  schemaVersion: string;
}

function isExpired(entry: InMemoryCacheEntry, nowIso?: string): boolean {
  const now = nowIso !== undefined ? Date.parse(nowIso) : Date.now();
  return Date.parse(entry.expiresAt) <= now;
}

export function createInMemoryGroupProjectionCacheStore(): GroupProjectionCacheStore & { reset(): void } {
  const entries = new Map<string, InMemoryCacheEntry>();

  return {
    async get({ group, timezone, now }) {
      const key = buildProjectionCacheKey(group, timezone);
      const entry = entries.get(key);
      if (entry === undefined) return null;
      if (entry.schemaVersion !== PROJECTION_CACHE_SCHEMA_VERSION) return null;
      if (isExpired(entry, now)) {
        entries.delete(key);
        return null;
      }
      return deepCopy(entry.projection);
    },

    async set({ group, timezone, projection, inputFingerprint, modelVersion, formulaVersion, generatedAt, expiresAt }) {
      const key = buildProjectionCacheKey(group, timezone);
      entries.set(key, {
        projection: deepCopy(projection),
        inputFingerprint,
        modelVersion,
        formulaVersion,
        generatedAt,
        expiresAt,
        schemaVersion: PROJECTION_CACHE_SCHEMA_VERSION
      });
    },

    async delete({ group, timezone }) {
      const key = buildProjectionCacheKey(group, timezone);
      entries.delete(key);
    },

    reset() {
      entries.clear();
    }
  };
}
