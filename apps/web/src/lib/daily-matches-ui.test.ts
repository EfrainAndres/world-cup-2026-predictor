import { describe, expect, test } from "vitest";

import {
  DAILY_MATCHES_DISPLAY_TIMEZONE_LABEL,
  DAILY_MATCHES_DISPLAY_TIMEZONE,
  formatDailyMatchProbability,
  formatEvaluationExactScoreLabel,
  formatEvaluationOutcomeLabel,
  formatUtcTimestamp,
  getDailyMatchHistoryState,
  getDailyMatchPredictionLabel,
  getDailyMatchScoreLabel,
  getDailyMatchStateLabel,
  getDailyMatchesProviderWarning,
  getDailyMatchesSourceLabel,
  getTodayDateForTimezone,
  shiftDailyMatchesDate,
  shouldShowDailyMatchScore
} from "./daily-matches-ui";

describe("daily matches UI helpers", () => {
  test("uses Colombia time as the explicit display timezone", () => {
    expect(DAILY_MATCHES_DISPLAY_TIMEZONE).toBe("America/Bogota");
    expect(DAILY_MATCHES_DISPLAY_TIMEZONE_LABEL).toBe("Colombia time (America/Bogota, UTC-5)");
  });

  test("shifts dates deterministically in both directions", () => {
    expect(shiftDailyMatchesDate("2026-06-19", -1)).toBe("2026-06-18");
    expect(shiftDailyMatchesDate("2026-06-19", 1)).toBe("2026-06-20");
  });

  test("derives today's date in the requested timezone", () => {
    expect(getTodayDateForTimezone("UTC", new Date("2026-06-19T05:10:00Z"))).toBe("2026-06-19");
    expect(getTodayDateForTimezone("America/Bogota", new Date("2026-06-19T02:30:00Z"))).toBe("2026-06-18");
  });

  test("derives Colombia today independently of the process timezone", () => {
    expect(getTodayDateForTimezone(DAILY_MATCHES_DISPLAY_TIMEZONE, new Date("2026-06-24T03:30:00Z"))).toBe("2026-06-23");
    expect(getTodayDateForTimezone(DAILY_MATCHES_DISPLAY_TIMEZONE, new Date("2026-06-24T05:00:00Z"))).toBe("2026-06-24");
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

  test("builds provider warnings for stale cache and local fallback states", () => {
    expect(
      getDailyMatchesProviderWarning({
        configuredProvider: "football_data_org",
        activeProvider: "football-data.org",
        externalRequestAttempted: true,
        cacheUsed: true,
        localFallbackUsed: false,
        stale: true
      })
    ).toBe("Showing last successful live data while the provider refreshes.");

    expect(
      getDailyMatchesProviderWarning({
        configuredProvider: "football_data_org",
        activeProvider: "local_static_results_provider",
        externalRequestAttempted: true,
        cacheUsed: false,
        localFallbackUsed: true,
        stale: false
      })
    ).toBe("Live provider synchronization is unavailable. Showing local fallback fixture data.");

    expect(
      getDailyMatchesProviderWarning({
        configuredProvider: "football_data_org",
        activeProvider: "football-data.org",
        externalRequestAttempted: true,
        cacheUsed: false,
        localFallbackUsed: false,
        stale: false
      })
    ).toBeNull();
  });

  test("formats sync timestamps in explicit UTC and handles missing values", () => {
    expect(formatUtcTimestamp(undefined)).toBe("unavailable");
    expect(formatUtcTimestamp("2026-06-19T14:05:00Z")).toContain("UTC");
  });

  test("derives history states for missing prediction, live pre-match, and final evaluation", () => {
    expect(
      getDailyMatchHistoryState({
        state: "upcoming",
        predictionHistory: {
          snapshot: { available: false },
          evaluation: { available: false },
          warnings: []
        }
      })
    ).toBe("no_snapshot");

    expect(
      getDailyMatchHistoryState({
        state: "live",
        predictionHistory: {
          snapshot: { available: true },
          evaluation: { available: false },
          warnings: []
        }
      })
    ).toBe("live_pre_match_prediction");

    expect(
      getDailyMatchHistoryState({
        state: "final",
        predictionHistory: {
          snapshot: { available: true },
          evaluation: { available: true },
          warnings: []
        }
      })
    ).toBe("final_evaluated");
  });

  test("formats prediction and evaluation labels consistently", () => {
    expect(getDailyMatchScoreLabel("final")).toBe("Final result");
    expect(getDailyMatchScoreLabel("live")).toBe("Current score");
    expect(getDailyMatchPredictionLabel("final_evaluation_pending")).toBe("Prediction saved");
    expect(formatDailyMatchProbability(0.4123)).toBe("41.2%");
    expect(formatEvaluationOutcomeLabel(true)).toBe("Correct");
    expect(formatEvaluationOutcomeLabel(false)).toBe("Incorrect");
    expect(formatEvaluationExactScoreLabel(true)).toBe("Correct");
    expect(formatEvaluationExactScoreLabel(false)).toBe("Miss");
  });
});
