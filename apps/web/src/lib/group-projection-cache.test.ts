import { describe, expect, test, beforeEach } from "vitest";
import {
  clearGroupProjectionCache,
  getGroupProjectionFromCache,
  getGroupProjectionCacheSize,
  setGroupProjectionInCache,
  GROUP_PROJECTION_CACHE_VERSION
} from "./group-projection-cache";
import type { WorldCup2026GroupProjection } from "./api-client";

const baseProjection: WorldCup2026GroupProjection = {
  available: true,
  status: "complete",
  fixtures: [],
  warnings: []
};

const tz = "UTC";

beforeEach(() => {
  clearGroupProjectionCache();
});

describe("group-projection-cache", () => {
  test("cache miss returns undefined", () => {
    expect(getGroupProjectionFromCache("A", tz)).toBeUndefined();
  });

  test("cache hit returns the stored projection", () => {
    setGroupProjectionInCache("A", tz, baseProjection);
    const result = getGroupProjectionFromCache("A", tz);
    expect(result).toBeDefined();
    expect(result?.available).toBe(true);
    expect(result?.status).toBe("complete");
  });

  test("defensive copy: mutating the returned value does not affect the cache", () => {
    setGroupProjectionInCache("A", tz, baseProjection);
    const result = getGroupProjectionFromCache("A", tz);
    if (result === undefined) throw new Error("Expected cache hit");
    (result as unknown as Record<string, unknown>)["available"] = false;
    const second = getGroupProjectionFromCache("A", tz);
    expect(second?.available).toBe(true);
  });

  test("defensive copy: mutating the stored value before set does not affect the cache", () => {
    const projection: WorldCup2026GroupProjection = { ...baseProjection, status: "partial" };
    setGroupProjectionInCache("A", tz, projection);
    (projection as unknown as Record<string, unknown>)["status"] = "unavailable";
    const result = getGroupProjectionFromCache("A", tz);
    expect(result?.status).toBe("partial");
  });

  test("group/timezone isolation: different groups return independent projections", () => {
    const projA: WorldCup2026GroupProjection = { ...baseProjection, warnings: ["group A"] };
    const projB: WorldCup2026GroupProjection = { ...baseProjection, warnings: ["group B"] };
    setGroupProjectionInCache("A", tz, projA);
    setGroupProjectionInCache("B", tz, projB);
    expect(getGroupProjectionFromCache("A", tz)?.warnings).toEqual(["group A"]);
    expect(getGroupProjectionFromCache("B", tz)?.warnings).toEqual(["group B"]);
  });

  test("timezone isolation: same group with different timezones returns independent projections", () => {
    const projUtc: WorldCup2026GroupProjection = { ...baseProjection, warnings: ["utc"] };
    const projEst: WorldCup2026GroupProjection = { ...baseProjection, warnings: ["est"] };
    setGroupProjectionInCache("A", "UTC", projUtc);
    setGroupProjectionInCache("A", "America/New_York", projEst);
    expect(getGroupProjectionFromCache("A", "UTC")?.warnings).toEqual(["utc"]);
    expect(getGroupProjectionFromCache("A", "America/New_York")?.warnings).toEqual(["est"]);
  });

  test("clearGroupProjectionCache resets all entries", () => {
    setGroupProjectionInCache("A", tz, baseProjection);
    setGroupProjectionInCache("B", tz, baseProjection);
    clearGroupProjectionCache();
    expect(getGroupProjectionFromCache("A", tz)).toBeUndefined();
    expect(getGroupProjectionFromCache("B", tz)).toBeUndefined();
  });

  test("GROUP_PROJECTION_CACHE_VERSION is a non-empty string", () => {
    expect(typeof GROUP_PROJECTION_CACHE_VERSION).toBe("string");
    expect(GROUP_PROJECTION_CACHE_VERSION.length).toBeGreaterThan(0);
  });

  test("cache size tracks entries correctly", () => {
    expect(getGroupProjectionCacheSize()).toBe(0);
    setGroupProjectionInCache("A", tz, baseProjection);
    expect(getGroupProjectionCacheSize()).toBe(1);
    setGroupProjectionInCache("B", tz, baseProjection);
    expect(getGroupProjectionCacheSize()).toBe(2);
    clearGroupProjectionCache();
    expect(getGroupProjectionCacheSize()).toBe(0);
  });

  test("group name is normalized to uppercase (lowercase and uppercase map to same entry)", () => {
    setGroupProjectionInCache("a", tz, baseProjection);
    const result = getGroupProjectionFromCache("A", tz);
    expect(result).toBeDefined();
  });

  test("overwriting the same key updates the cached value", () => {
    setGroupProjectionInCache("A", tz, baseProjection);
    const updated: WorldCup2026GroupProjection = { ...baseProjection, status: "partial" };
    setGroupProjectionInCache("A", tz, updated);
    expect(getGroupProjectionFromCache("A", tz)?.status).toBe("partial");
    expect(getGroupProjectionCacheSize()).toBe(1);
  });
});
