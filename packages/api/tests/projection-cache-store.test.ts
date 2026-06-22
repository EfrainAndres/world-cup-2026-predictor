import { describe, expect, it, beforeEach } from "vitest";
import type { WorldCup2026GroupProjection } from "../src/schemas.js";
import type { GroupProjectionCacheStore } from "../src/async-projection-cache.js";
import {
  PROJECTION_CACHE_SCHEMA_VERSION,
  PROJECTION_CACHE_TTL_MS,
  buildProjectionCacheKey,
  computeProjectionCacheExpiresAt,
  createInMemoryGroupProjectionCacheStore
} from "../src/async-projection-cache.js";
import { SnapshotStorageError } from "../src/async-snapshot-store.js";

// ---------------------------------------------------------------------------
// Deterministic test fixtures
// ---------------------------------------------------------------------------

const GROUP_A = "A";
const GROUP_B = "B";
const TZ_NYC = "America/New_York";
const TZ_LON = "Europe/London";

const BASE_GENERATED_AT = "2026-06-22T10:00:00.000Z";
const BASE_EXPIRES_AT = "2026-06-22T10:15:00.000Z";   // 15 min later
const PAST_EXPIRES_AT = "2026-06-22T09:59:59.999Z";   // before generated_at
const NOW_AFTER_EXPIRY = "2026-06-22T10:16:00.000Z";  // after expires_at
const NOW_BEFORE_EXPIRY = "2026-06-22T10:01:00.000Z"; // before expires_at

function makeProjection(overrides: Partial<WorldCup2026GroupProjection> = {}): WorldCup2026GroupProjection {
  return {
    available: true,
    status: "complete",
    standings: [],
    fixtures: [],
    warnings: [],
    ...overrides
  };
}

function makeSetInput(group = GROUP_A, timezone = TZ_NYC, overrides: Record<string, unknown> = {}) {
  return {
    group,
    timezone,
    projection: makeProjection(),
    inputFingerprint: "model-v1:formula-v2",
    modelVersion: "wc2026-prediction-v1",
    formulaVersion: "v2",
    generatedAt: BASE_GENERATED_AT,
    expiresAt: BASE_EXPIRES_AT,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Shared adapter contract tests
// ---------------------------------------------------------------------------

export function runProjectionCacheStoreContractTests(
  storeName: string,
  makeStore: () => Promise<GroupProjectionCacheStore & { reset?(): void }>
): void {
  describe(`${storeName} — GroupProjectionCacheStore contract`, () => {
    let store: GroupProjectionCacheStore & { reset?(): void };

    beforeEach(async () => {
      store = await makeStore();
      store.reset?.();
    });

    // -----------------------------------------------------------------------
    // set / get round-trip
    // -----------------------------------------------------------------------

    it("set then get returns the stored projection", async () => {
      await store.set(makeSetInput());
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result).not.toBeNull();
      expect(result?.available).toBe(true);
      expect(result?.status).toBe("complete");
    });

    it("get returns null on cache miss", async () => {
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result).toBeNull();
    });

    // -----------------------------------------------------------------------
    // expiry
    // -----------------------------------------------------------------------

    it("get returns null for expired entry", async () => {
      await store.set(makeSetInput());
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_AFTER_EXPIRY });
      expect(result).toBeNull();
    });

    it("get returns the projection for non-expired entry", async () => {
      await store.set(makeSetInput());
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result).not.toBeNull();
    });

    // -----------------------------------------------------------------------
    // overwrite
    // -----------------------------------------------------------------------

    it("set overwrites an existing entry", async () => {
      await store.set(makeSetInput());
      const updated = makeProjection({ status: "partial" });
      await store.set({ ...makeSetInput(), projection: updated });
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result?.status).toBe("partial");
    });

    // -----------------------------------------------------------------------
    // delete
    // -----------------------------------------------------------------------

    it("delete removes a stored entry", async () => {
      await store.set(makeSetInput());
      await store.delete({ group: GROUP_A, timezone: TZ_NYC });
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result).toBeNull();
    });

    it("delete of non-existent entry is not an error", async () => {
      await expect(store.delete({ group: GROUP_A, timezone: TZ_NYC })).resolves.toBeUndefined();
    });

    // -----------------------------------------------------------------------
    // group isolation
    // -----------------------------------------------------------------------

    it("entries for group A and group B are isolated", async () => {
      const projA = makeProjection({ available: true, status: "complete" });
      const projB = makeProjection({ available: false, status: "unavailable" });
      await store.set({ ...makeSetInput(GROUP_A), projection: projA });
      await store.set({ ...makeSetInput(GROUP_B), projection: projB });
      const resultA = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      const resultB = await store.get({ group: GROUP_B, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(resultA?.available).toBe(true);
      expect(resultB?.available).toBe(false);
    });

    // -----------------------------------------------------------------------
    // timezone isolation
    // -----------------------------------------------------------------------

    it("entries for different timezones under the same group are isolated", async () => {
      const projNyc = makeProjection({ status: "complete" });
      const projLon = makeProjection({ status: "partial" });
      await store.set({ ...makeSetInput(GROUP_A, TZ_NYC), projection: projNyc });
      await store.set({ ...makeSetInput(GROUP_A, TZ_LON), projection: projLon });
      const resultNyc = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      const resultLon = await store.get({ group: GROUP_A, timezone: TZ_LON, now: NOW_BEFORE_EXPIRY });
      expect(resultNyc?.status).toBe("complete");
      expect(resultLon?.status).toBe("partial");
    });

    // -----------------------------------------------------------------------
    // uppercase normalization
    // -----------------------------------------------------------------------

    it("lowercase group code is normalized to uppercase on set and get", async () => {
      await store.set({ ...makeSetInput("a"), timezone: TZ_NYC });
      const result = await store.get({ group: "a", timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result).not.toBeNull();
    });

    it("set with lowercase group, get with uppercase returns the same entry", async () => {
      await store.set({ ...makeSetInput("a") });
      const result = await store.get({ group: "A", timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result).not.toBeNull();
    });

    // -----------------------------------------------------------------------
    // defensive copies
    // -----------------------------------------------------------------------

    it("mutating a returned projection does not affect the stored entry", async () => {
      await store.set(makeSetInput());
      const first = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      if (first !== null) {
        (first as unknown as Record<string, unknown>)["status"] = "unavailable";
      }
      const second = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(second?.status).toBe("complete");
    });

    it("mutating the projection after set does not affect the stored entry", async () => {
      const projection = makeProjection({ status: "complete" });
      await store.set({ ...makeSetInput(), projection });
      (projection as unknown as Record<string, unknown>)["status"] = "unavailable";
      const result = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_BEFORE_EXPIRY });
      expect(result?.status).toBe("complete");
    });
  });
}

// ---------------------------------------------------------------------------
// buildProjectionCacheKey unit tests
// ---------------------------------------------------------------------------

describe("buildProjectionCacheKey", () => {
  it("produces a deterministic key from group and timezone", () => {
    const key1 = buildProjectionCacheKey("A", "America/New_York");
    const key2 = buildProjectionCacheKey("A", "America/New_York");
    expect(key1).toBe(key2);
  });

  it("uppercases the group code", () => {
    const key = buildProjectionCacheKey("a", "America/New_York");
    expect(key).toBe("wc2026:A:America/New_York");
  });

  it("uses expected prefix format", () => {
    const key = buildProjectionCacheKey("G", "Europe/London");
    expect(key).toBe("wc2026:G:Europe/London");
  });

  it("throws invalid_cache_key for empty group", () => {
    expect(() => buildProjectionCacheKey("", "America/New_York")).toThrow(
      expect.objectContaining({ code: "invalid_cache_key" })
    );
  });

  it("throws invalid_cache_key for whitespace-only group", () => {
    expect(() => buildProjectionCacheKey("  ", "America/New_York")).toThrow(
      expect.objectContaining({ code: "invalid_cache_key" })
    );
  });

  it("throws invalid_cache_key for empty timezone", () => {
    expect(() => buildProjectionCacheKey("A", "")).toThrow(
      expect.objectContaining({ code: "invalid_cache_key" })
    );
  });

  it("different groups produce different keys", () => {
    expect(buildProjectionCacheKey("A", "UTC")).not.toBe(buildProjectionCacheKey("B", "UTC"));
  });

  it("different timezones produce different keys", () => {
    expect(buildProjectionCacheKey("A", "UTC")).not.toBe(buildProjectionCacheKey("A", "America/New_York"));
  });

  it("key does not contain secrets or credentials", () => {
    const key = buildProjectionCacheKey("A", "America/New_York");
    expect(key).not.toContain("password");
    expect(key).not.toContain("DATABASE_URL");
    expect(key).not.toContain("NEXT_PUBLIC");
  });
});

// ---------------------------------------------------------------------------
// computeProjectionCacheExpiresAt unit tests
// ---------------------------------------------------------------------------

describe("computeProjectionCacheExpiresAt", () => {
  it("returns a timestamp 15 minutes after generatedAt by default", () => {
    const generatedAt = "2026-06-22T10:00:00.000Z";
    const expiresAt = computeProjectionCacheExpiresAt(generatedAt);
    expect(expiresAt).toBe("2026-06-22T10:15:00.000Z");
  });

  it("respects a custom TTL override", () => {
    const generatedAt = "2026-06-22T10:00:00.000Z";
    const expiresAt = computeProjectionCacheExpiresAt(generatedAt, 60_000); // 1 minute
    expect(expiresAt).toBe("2026-06-22T10:01:00.000Z");
  });

  it("is deterministic: same input produces same output", () => {
    const generatedAt = "2026-06-22T10:00:00.000Z";
    expect(computeProjectionCacheExpiresAt(generatedAt)).toBe(computeProjectionCacheExpiresAt(generatedAt));
  });

  it("throws invalid_expiration for unparseable timestamp", () => {
    expect(() => computeProjectionCacheExpiresAt("not-a-date")).toThrow(
      expect.objectContaining({ code: "invalid_expiration" })
    );
  });
});

// ---------------------------------------------------------------------------
// PROJECTION_CACHE_SCHEMA_VERSION
// ---------------------------------------------------------------------------

describe("PROJECTION_CACHE_SCHEMA_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof PROJECTION_CACHE_SCHEMA_VERSION).toBe("string");
    expect(PROJECTION_CACHE_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// PROJECTION_CACHE_TTL_MS
// ---------------------------------------------------------------------------

describe("PROJECTION_CACHE_TTL_MS", () => {
  it("equals 15 minutes in milliseconds", () => {
    expect(PROJECTION_CACHE_TTL_MS).toBe(15 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// SnapshotStorageError cache-specific codes
// ---------------------------------------------------------------------------

describe("SnapshotStorageError cache codes", () => {
  it("supports invalid_cache_key code", () => {
    const err = new SnapshotStorageError("invalid_cache_key", "empty group");
    expect(err.code).toBe("invalid_cache_key");
    expect(err).toBeInstanceOf(SnapshotStorageError);
  });

  it("supports invalid_expiration code", () => {
    const err = new SnapshotStorageError("invalid_expiration", "bad timestamp");
    expect(err.code).toBe("invalid_expiration");
    expect(err).toBeInstanceOf(SnapshotStorageError);
  });
});

// ---------------------------------------------------------------------------
// Run shared contract tests against in-memory adapter
// ---------------------------------------------------------------------------

runProjectionCacheStoreContractTests("in-memory projection cache adapter", async () => {
  return createInMemoryGroupProjectionCacheStore();
});

// ---------------------------------------------------------------------------
// Additional in-memory only: expiry cleans up entry so second get also returns null
// ---------------------------------------------------------------------------

describe("in-memory adapter — expired entry cleanup", () => {
  it("does not return expired entry on a second call after expiry cleanup", async () => {
    const store = createInMemoryGroupProjectionCacheStore();
    await store.set({
      group: GROUP_A,
      timezone: TZ_NYC,
      projection: makeProjection(),
      inputFingerprint: "fp",
      modelVersion: "mv",
      formulaVersion: "fv",
      generatedAt: BASE_GENERATED_AT,
      expiresAt: BASE_EXPIRES_AT
    });
    // First get after expiry — triggers cleanup
    const first = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_AFTER_EXPIRY });
    expect(first).toBeNull();
    // Second get — entry was cleaned up
    const second = await store.get({ group: GROUP_A, timezone: TZ_NYC, now: NOW_AFTER_EXPIRY });
    expect(second).toBeNull();
  });
});
