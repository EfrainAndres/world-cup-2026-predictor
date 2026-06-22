/**
 * Server-side in-memory cache for generated group projections.
 *
 * Non-durable in serverless deployments: each cold start resets the cache.
 * Kept intentionally minimal — no framework, no Redis, no database.
 * Never stores secrets, raw provider payloads, or snapshot store state.
 */
import type { WorldCup2026GroupProjection } from "./api-client";

const CACHE_VERSION = "1";

interface GroupProjectionCacheEntry {
  projection: WorldCup2026GroupProjection;
  version: string;
}

const projectionCache = new Map<string, GroupProjectionCacheEntry>();

function buildCacheKey(group: string, timezone: string): string {
  return `${group.toUpperCase()}:${timezone}`;
}

export const GROUP_PROJECTION_CACHE_VERSION = CACHE_VERSION;

/** Returns a defensive deep copy of the cached projection, or undefined on miss/version mismatch. */
export function getGroupProjectionFromCache(
  group: string,
  timezone: string
): WorldCup2026GroupProjection | undefined {
  const entry = projectionCache.get(buildCacheKey(group, timezone));
  if (entry === undefined || entry.version !== CACHE_VERSION) return undefined;
  return JSON.parse(JSON.stringify(entry.projection)) as WorldCup2026GroupProjection;
}

/** Stores a defensive deep copy of the projection. Does not store secrets or raw provider payloads. */
export function setGroupProjectionInCache(
  group: string,
  timezone: string,
  projection: WorldCup2026GroupProjection
): void {
  projectionCache.set(buildCacheKey(group, timezone), {
    projection: JSON.parse(JSON.stringify(projection)) as WorldCup2026GroupProjection,
    version: CACHE_VERSION
  });
}

/** Clears all cached projections. Safe to call at any time. */
export function clearGroupProjectionCache(): void {
  projectionCache.clear();
}

/** Returns the number of cached entries. */
export function getGroupProjectionCacheSize(): number {
  return projectionCache.size;
}
