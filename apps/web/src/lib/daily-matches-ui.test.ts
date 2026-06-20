import { describe, expect, test } from "vitest";

import {
  DAILY_MATCHES_DISPLAY_TIMEZONE,
  formatUtcTimestamp,
  getDailyMatchStateLabel,
  getDailyMatchesSourceLabel,
  getTodayDateForTimezone,
  shiftDailyMatchesDate,
  shouldShowDailyMatchScore
} from "./daily-matches-ui";

describe("daily matches UI helpers", () => {
  test("uses UTC as the explicit display timezone", () => {
    expect(DAILY_MATCHES_DISPLAY_TIMEZONE).toBe("UTC");
  });

  test("shifts dates deterministically in both directions", () => {
    expect(shiftDailyMatchesDate("2026-06-19", -1)).toBe("2026-06-18");
    expect(shiftDailyMatchesDate("2026-06-19", 1)).toBe("2026-06-20");
  });

  test("derives today's date in the requested timezone", () => {
    expect(getTodayDateForTimezone("UTC", new Date("2026-06-19T05:10:00Z"))).toBe("2026-06-19");
    expect(getTodayDateForTimezone("America/Bogota", new Date("2026-06-19T02:30:00Z"))).toBe("2026-06-18");
  });

  test("maps normalized daily states to UI labels", () => {
    expect(getDailyMatchStateLabel("upcoming")).toBe("Upcoming");
    expect(getDailyMatchStateLabel("live")).toBe("Live");
    expect(getDailyMatchStateLabel("halftime")).toBe("Halftime");
    expect(getDailyMatchStateLabel("final")).toBe("Final");
    expect(getDailyMatchStateLabel("postponed")).toBe("Postponed");
    expect(getDailyMatchStateLabel("cancelled")).toBe("Cancelled");
    expect(getDailyMatchStateLabel("unknown")).toBe("Unknown");
  });

  test("shows scores only for live halftime and final matches with valid scores", () => {
    expect(shouldShowDailyMatchScore({ state: "upcoming", homeScore: undefined, awayScore: undefined })).toBe(false);
    expect(shouldShowDailyMatchScore({ state: "live", homeScore: 1, awayScore: 0 })).toBe(true);
    expect(shouldShowDailyMatchScore({ state: "halftime", homeScore: 2, awayScore: 2 })).toBe(true);
    expect(shouldShowDailyMatchScore({ state: "final", homeScore: 3, awayScore: 1 })).toBe(true);
    expect(shouldShowDailyMatchScore({ state: "final", homeScore: 1, awayScore: undefined })).toBe(false);
  });

  test("builds provider source labels for live provider, cache, and fallback", () => {
    expect(
      getDailyMatchesSourceLabel({
        configuredProvider: "football_data_org",
        activeProvider: "football-data.org",
        externalRequestAttempted: true,
        cacheUsed: false,
        localFallbackUsed: false,
        stale: false
      })
    ).toBe("football-data.org");

    expect(
      getDailyMatchesSourceLabel({
        configuredProvider: "football_data_org",
        activeProvider: "football-data.org",
        externalRequestAttempted: true,
        cacheUsed: true,
        localFallbackUsed: false,
        stale: true
      })
    ).toBe("Cached provider data");

    expect(
      getDailyMatchesSourceLabel({
        configuredProvider: "local_static",
        activeProvider: "local_static_provider",
        externalRequestAttempted: false,
        cacheUsed: false,
        localFallbackUsed: true,
        stale: false
      })
    ).toBe("Local static fallback");
  });

  test("formats sync timestamps in explicit UTC and handles missing values", () => {
    expect(formatUtcTimestamp(undefined)).toBe("unavailable");
    expect(formatUtcTimestamp("2026-06-19T14:05:00Z")).toContain("UTC");
  });
});
