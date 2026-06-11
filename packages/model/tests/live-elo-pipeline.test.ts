import { describe, expect, it } from "vitest";
import {
  LIVE_ELO_PIPELINE_FOUNDATION_WARNING,
  LIVE_ELO_PIPELINE_NO_MATCHES_WARNING,
  LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING,
  LIVE_ELO_PIPELINE_VERSION,
  runLiveEloPipeline
} from "../src/live-elo-pipeline.js";
import type { EloMatch } from "../src/index.js";

const MATCH_A_WINS: EloMatch = {
  match_id: "test-001",
  match_date: "2020-01-01",
  home_team: "Alpha",
  away_team: "Beta",
  neutral_site: true,
  result: "home_win"
};

const MATCH_B_WINS: EloMatch = {
  match_id: "test-002",
  match_date: "2020-01-02",
  home_team: "Beta",
  away_team: "Gamma",
  neutral_site: true,
  result: "home_win"
};

const MATCH_DRAW: EloMatch = {
  match_id: "test-003",
  match_date: "2020-01-03",
  home_team: "Alpha",
  away_team: "Gamma",
  neutral_site: true,
  result: "draw"
};

const THREE_MATCH_SET = [MATCH_A_WINS, MATCH_B_WINS, MATCH_DRAW];

describe("runLiveEloPipeline", () => {
  it("returns a success result with expected shape", () => {
    const result = runLiveEloPipeline({
      pipelineId: "test-pipeline",
      matches: THREE_MATCH_SET
    });

    expect(result.pipelineId).toBe("test-pipeline");
    expect(result.pipelineVersion).toBe(LIVE_ELO_PIPELINE_VERSION);
    expect(result.rankedRatings.length).toBeGreaterThan(0);
    expect(result.matchesProcessed).toBe(3);
    expect(result.teamsRated).toBe(3);
    expect(result.dataCoverage).toBe("world_cup_fixtures_only");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("ranks entries by eloRating descending", () => {
    const result = runLiveEloPipeline({
      pipelineId: "rank-test",
      matches: THREE_MATCH_SET
    });

    for (let i = 1; i < result.rankedRatings.length; i += 1) {
      const prev = result.rankedRatings[i - 1];
      const curr = result.rankedRatings[i];

      if (prev !== undefined && curr !== undefined) {
        expect(prev.eloRating).toBeGreaterThanOrEqual(curr.eloRating);
      }
    }
  });

  it("assigns sequential ranks starting at 1", () => {
    const result = runLiveEloPipeline({
      pipelineId: "rank-order-test",
      matches: THREE_MATCH_SET
    });

    result.rankedRatings.forEach((entry, index) => {
      expect(entry.rank).toBe(index + 1);
    });
  });

  it("counts matchesPlayed correctly per team", () => {
    const result = runLiveEloPipeline({
      pipelineId: "match-count-test",
      matches: THREE_MATCH_SET
    });

    const alpha = result.rankedRatings.find((e) => e.team === "Alpha");
    const beta = result.rankedRatings.find((e) => e.team === "Beta");
    const gamma = result.rankedRatings.find((e) => e.team === "Gamma");

    expect(alpha?.matchesPlayed).toBe(2);
    expect(beta?.matchesPlayed).toBe(2);
    expect(gamma?.matchesPlayed).toBe(2);
  });

  it("processes matches in chronological order regardless of input order", () => {
    const reversed = [...THREE_MATCH_SET].reverse();

    const forwardResult = runLiveEloPipeline({ pipelineId: "forward", matches: THREE_MATCH_SET });
    const reversedResult = runLiveEloPipeline({ pipelineId: "reversed", matches: reversed });

    expect(forwardResult.rankedRatings).toEqual(reversedResult.rankedRatings);
  });

  it("produces deterministic output on repeated calls", () => {
    const first = runLiveEloPipeline({ pipelineId: "det-test", matches: THREE_MATCH_SET });
    const second = runLiveEloPipeline({ pipelineId: "det-test", matches: THREE_MATCH_SET });

    expect(first.rankedRatings).toEqual(second.rankedRatings);
    expect(first.matchesProcessed).toBe(second.matchesProcessed);
    expect(first.warnings).toEqual(second.warnings);
  });

  it("winning team receives a higher rating than the team that lost", () => {
    const singleMatch: EloMatch = {
      match_id: "single-001",
      match_date: "2020-05-01",
      home_team: "Winner",
      away_team: "Loser",
      neutral_site: true,
      result: "home_win"
    };

    const result = runLiveEloPipeline({ pipelineId: "winner-test", matches: [singleMatch] });

    const winner = result.rankedRatings.find((e) => e.team === "Winner");
    const loser = result.rankedRatings.find((e) => e.team === "Loser");

    expect(winner).toBeDefined();
    expect(loser).toBeDefined();
    expect(winner!.eloRating).toBeGreaterThan(loser!.eloRating);
    expect(winner!.rank).toBeLessThan(loser!.rank);
  });

  it("uses custom config when supplied", () => {
    const defaultResult = runLiveEloPipeline({ pipelineId: "default", matches: THREE_MATCH_SET });
    const highKResult = runLiveEloPipeline({
      pipelineId: "highk",
      matches: THREE_MATCH_SET,
      config: { kFactor: 40 }
    });

    const defaultTop = defaultResult.rankedRatings[0];
    const highKTop = highKResult.rankedRatings[0];

    if (defaultTop !== undefined && highKTop !== undefined) {
      expect(highKTop.eloRating).not.toBe(defaultTop.eloRating);
      expect(highKTop.team).toBe(defaultTop.team);
    }
  });

  it("sets latestMatchDate to the most recent match date in the input", () => {
    const result = runLiveEloPipeline({ pipelineId: "date-test", matches: THREE_MATCH_SET });

    expect(result.latestMatchDate).toBe("2020-01-03");
  });

  it("returns undefined latestMatchDate when no matches are provided", () => {
    const result = runLiveEloPipeline({ pipelineId: "empty-date", matches: [] });

    expect(result.latestMatchDate).toBeUndefined();
  });

  it("includes foundation warning for world_cup_fixtures_only coverage", () => {
    const result = runLiveEloPipeline({
      pipelineId: "wc-only",
      matches: THREE_MATCH_SET,
      dataCoverage: "world_cup_fixtures_only"
    });

    expect(result.warnings).toContain(LIVE_ELO_PIPELINE_FOUNDATION_WARNING);
  });

  it("omits foundation warning for complete_international_history coverage", () => {
    const result = runLiveEloPipeline({
      pipelineId: "complete",
      matches: THREE_MATCH_SET,
      dataCoverage: "complete_international_history"
    });

    expect(result.warnings).not.toContain(LIVE_ELO_PIPELINE_FOUNDATION_WARNING);
  });

  it("includes no-matches warning when the match list is empty", () => {
    const result = runLiveEloPipeline({ pipelineId: "empty", matches: [] });

    expect(result.warnings).toContain(LIVE_ELO_PIPELINE_NO_MATCHES_WARNING);
    expect(result.teamsRated).toBe(0);
    expect(result.matchesProcessed).toBe(0);
  });

  it("includes sparse-data warning when teams have fewer than 3 matches", () => {
    const result = runLiveEloPipeline({ pipelineId: "sparse", matches: THREE_MATCH_SET });

    expect(result.warnings).toContain(LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING);
  });

  it("omits sparse-data warning when all teams have 3 or more matches", () => {
    const extraMatches: EloMatch[] = [
      { match_id: "e-001", match_date: "2020-02-01", home_team: "Alpha", away_team: "Beta", neutral_site: true, result: "home_win" },
      { match_id: "e-002", match_date: "2020-02-02", home_team: "Beta", away_team: "Gamma", neutral_site: true, result: "draw" },
      { match_id: "e-003", match_date: "2020-02-03", home_team: "Gamma", away_team: "Alpha", neutral_site: true, result: "away_win" }
    ];
    const allMatches = [...THREE_MATCH_SET, ...extraMatches];
    const result = runLiveEloPipeline({ pipelineId: "dense", matches: allMatches });

    expect(result.warnings).not.toContain(LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING);
  });

  it("throws when pipelineId is empty or whitespace", () => {
    expect(() => runLiveEloPipeline({ pipelineId: "", matches: THREE_MATCH_SET })).toThrow("pipelineId is required.");
    expect(() => runLiveEloPipeline({ pipelineId: "   ", matches: THREE_MATCH_SET })).toThrow("pipelineId is required.");
  });

  it("returns correct dataCoverage in result", () => {
    const wc = runLiveEloPipeline({ pipelineId: "p", matches: [], dataCoverage: "world_cup_fixtures_only" });
    const partial = runLiveEloPipeline({ pipelineId: "p", matches: [], dataCoverage: "partial_international_history" });
    const complete = runLiveEloPipeline({ pipelineId: "p", matches: [], dataCoverage: "complete_international_history" });

    expect(wc.dataCoverage).toBe("world_cup_fixtures_only");
    expect(partial.dataCoverage).toBe("partial_international_history");
    expect(complete.dataCoverage).toBe("complete_international_history");
  });
});
