import { describe, expect, test } from "vitest";
import {
  buildPredictionHistoryQueryString,
  formatPredictionHistoryMetric,
  formatPredictionHistoryProbability,
  getPersistenceSourceLabel,
  getSnapshotStatusLabel,
  toPredictionHistoryQuery
} from "./prediction-history-ui";

describe("prediction history ui helpers", () => {
  test("formats probabilities and metrics consistently", () => {
    expect(formatPredictionHistoryProbability(0.4123)).toBe("41.2%");
    expect(formatPredictionHistoryMetric(0.3421)).toBe("0.342");
    expect(formatPredictionHistoryMetric(1.5, 2)).toBe("1.50");
    expect(formatPredictionHistoryMetric(null)).toBe("Unavailable");
  });

  test("maps snapshot status and persistence labels", () => {
    expect(getSnapshotStatusLabel("pre_match_locked")).toBe("Pre-match locked");
    expect(getSnapshotStatusLabel("foundation_unverified")).toBe("Foundation-unverified");
    expect(
      getPersistenceSourceLabel({
        provider: "memory",
        persistent: false,
        configuredProvider: "memory"
      })
    ).toBe("In-memory history");
    expect(
      getPersistenceSourceLabel({
        provider: "postgres",
        persistent: true,
        configuredProvider: "postgres"
      })
    ).toBe("Persistent PostgreSQL history");
  });

  test("builds query strings deterministically", () => {
    expect(
      buildPredictionHistoryQueryString(
        {
          group: "A",
          team: null,
          fixtureId: null,
          status: null,
          evaluationState: "all",
          sort: "captured_desc"
        },
        { page: 2, pageSize: 10 }
      )
    ).toBe("/prediction-history?group=A&evaluationState=all&sort=captured_desc&pageSize=10&page=2");
  });

  test("converts search params into api query input", () => {
    expect(
      toPredictionHistoryQuery({
        group: "A",
        team: "Mexico",
        fixtureId: "fixture-1",
        status: "pre_match_locked",
        evaluationState: "evaluated",
        sort: "kickoff_asc",
        page: "2",
        pageSize: "50"
      })
    ).toEqual({
      group: "A",
      team: "Mexico",
      fixtureId: "fixture-1",
      status: "pre_match_locked",
      evaluationState: "evaluated",
      sort: "kickoff_asc",
      page: 2,
      pageSize: 50
    });
  });
});
