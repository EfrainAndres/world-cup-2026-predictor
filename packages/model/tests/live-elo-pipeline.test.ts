import { describe, expect, it } from "vitest";
import { getCurrentTeamRatings, processMatches } from "../src/elo.js";
import {
  calculateLiveEloCompetitionWeight,
  calculateLiveEloRecencyWeight,
  classifyLiveEloCompetition,
  LIVE_ELO_PIPELINE_COMPETITION_WEIGHTING_WARNING,
  LIVE_ELO_PIPELINE_FOUNDATION_WARNING,
  LIVE_ELO_PIPELINE_MISSING_COMPETITION_METADATA_WARNING,
  LIVE_ELO_PIPELINE_NO_MATCHES_WARNING,
  LIVE_ELO_PIPELINE_RECENCY_WEIGHTING_WARNING,
  LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING,
  LIVE_ELO_PIPELINE_UNKNOWN_COMPETITION_WARNING,
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

  it("keeps default pipeline ratings unchanged when recency weighting is not enabled", () => {
    const result = runLiveEloPipeline({ pipelineId: "default-recency-off", matches: THREE_MATCH_SET });
    const baseline = getCurrentTeamRatings(processMatches(THREE_MATCH_SET).ratings).map((entry, index) => ({
      rank: index + 1,
      team: entry.team,
      eloRating: entry.rating,
      matchesPlayed: THREE_MATCH_SET.filter((match) => match.home_team === entry.team || match.away_team === entry.team).length
    }));

    expect(result.rankedRatings).toEqual(baseline);
    expect(result.recencyWeighting).toEqual({
      enabled: false,
      referenceDate: undefined,
      matchesWeighted: 0,
      bucketWeights: {
        within12Months: 1,
        months12To24: 0.75,
        months24To48: 0.5,
        olderThan48Months: 0.25
      }
    });
    expect(result.competitionWeighting).toEqual({
      enabled: false,
      matchesWeighted: 0,
      weights: {
        fifa_world_cup: 4,
        continental_championship: 3,
        world_cup_qualifier: 2,
        nations_league: 1.5,
        international_friendly: 1,
        unknown: 1
      },
      missingCompetitionMetadataCount: 0,
      unknownCompetitionCount: 0
    });
  });

  it("assigns full recency weight to matches within 12 months", () => {
    expect(calculateLiveEloRecencyWeight("2024-07-01", "2025-06-30")).toBe(1);
  });

  it("assigns reduced recency weight to matches between 12 and 24 months old", () => {
    expect(calculateLiveEloRecencyWeight("2023-05-31", "2025-06-30")).toBe(0.75);
  });

  it("assigns reduced recency weight to matches between 24 and 48 months old", () => {
    expect(calculateLiveEloRecencyWeight("2021-06-30", "2025-06-30")).toBe(0.5);
  });

  it("assigns minimum recency weight to matches older than 48 months", () => {
    expect(calculateLiveEloRecencyWeight("2020-06-29", "2025-06-30")).toBe(0.25);
  });

  it("changes ratings when recency weighting is enabled", () => {
    const matches: EloMatch[] = [
      {
        match_id: "old-001",
        match_date: "2020-01-01",
        home_team: "Alpha",
        away_team: "Beta",
        neutral_site: true,
        result: "home_win"
      },
      {
        match_id: "recent-001",
        match_date: "2024-06-01",
        home_team: "Beta",
        away_team: "Alpha",
        neutral_site: true,
        result: "home_win"
      }
    ];
    const defaultResult = runLiveEloPipeline({ pipelineId: "unweighted", matches });
    const weightedResult = runLiveEloPipeline({
      pipelineId: "weighted",
      matches,
      recencyWeighting: { enabled: true, referenceDate: "2024-07-01" }
    });

    expect(weightedResult.rankedRatings).not.toEqual(defaultResult.rankedRatings);
    expect(weightedResult.recencyWeighting.enabled).toBe(true);
    expect(weightedResult.recencyWeighting.matchesWeighted).toBe(2);
    expect(weightedResult.warnings).toContain(LIVE_ELO_PIPELINE_RECENCY_WEIGHTING_WARNING);
  });

  it("is deterministic when recency weighting uses a fixed reference date", () => {
    const first = runLiveEloPipeline({
      pipelineId: "weighted-det",
      matches: THREE_MATCH_SET,
      recencyWeighting: { enabled: true, referenceDate: "2024-07-01" }
    });
    const second = runLiveEloPipeline({
      pipelineId: "weighted-det",
      matches: THREE_MATCH_SET,
      recencyWeighting: { enabled: true, referenceDate: "2024-07-01" }
    });

    expect(first).toEqual(second);
  });

  it("uses latest match date as deterministic reference date when enabled without an explicit reference date", () => {
    const result = runLiveEloPipeline({
      pipelineId: "weighted-latest-date",
      matches: THREE_MATCH_SET,
      recencyWeighting: { enabled: true }
    });

    expect(result.recencyWeighting.referenceDate).toBe("2020-01-03");
    expect(result.recencyWeighting.matchesWeighted).toBe(3);
  });

  it("rejects invalid recency weighting reference dates", () => {
    expect(() =>
      runLiveEloPipeline({
        pipelineId: "invalid-reference-date",
        matches: THREE_MATCH_SET,
        recencyWeighting: { enabled: true, referenceDate: "2024-99-01" }
      })
    ).toThrow("referenceDate must be a valid ISO date in YYYY-MM-DD format.");
  });

  it("rejects enabled recency weighting without matches or a reference date", () => {
    expect(() =>
      runLiveEloPipeline({
        pipelineId: "empty-weighted",
        matches: [],
        recencyWeighting: { enabled: true }
      })
    ).toThrow("referenceDate is required when recency weighting is enabled and no matches are available.");
  });

  it("assigns higher competition weight to World Cup matches than friendlies", () => {
    const worldCupMatch: EloMatch = { ...MATCH_A_WINS, competition: "FIFA World Cup 2022" };
    const friendlyMatch: EloMatch = { ...MATCH_A_WINS, competition: "International Friendly" };

    expect(classifyLiveEloCompetition(worldCupMatch)).toBe("fifa_world_cup");
    expect(calculateLiveEloCompetitionWeight(worldCupMatch)).toBe(4);
    expect(calculateLiveEloCompetitionWeight(worldCupMatch)).toBeGreaterThan(calculateLiveEloCompetitionWeight(friendlyMatch));
  });

  it("assigns continental championship competition weight", () => {
    const match: EloMatch = { ...MATCH_A_WINS, competition: "UEFA Euro 2024" };

    expect(classifyLiveEloCompetition(match)).toBe("continental_championship");
    expect(calculateLiveEloCompetitionWeight(match)).toBe(3);
  });

  it("assigns World Cup qualifier competition weight", () => {
    const match: EloMatch = { ...MATCH_A_WINS, competition: "FIFA World Cup 2026 Qualifier" };

    expect(classifyLiveEloCompetition(match)).toBe("world_cup_qualifier");
    expect(calculateLiveEloCompetitionWeight(match)).toBe(2);
  });

  it("uses unknown fallback weight for unknown competition metadata", () => {
    const match: EloMatch = { ...MATCH_A_WINS, competition: "Test Invitational" };

    expect(classifyLiveEloCompetition(match)).toBe("unknown");
    expect(calculateLiveEloCompetitionWeight(match)).toBe(1);
  });

  it("warns when competition metadata is missing while weighting is enabled", () => {
    const result = runLiveEloPipeline({
      pipelineId: "missing-competition-metadata",
      matches: [MATCH_A_WINS],
      competitionWeighting: { enabled: true }
    });

    expect(result.competitionWeighting.enabled).toBe(true);
    expect(result.competitionWeighting.matchesWeighted).toBe(1);
    expect(result.competitionWeighting.missingCompetitionMetadataCount).toBe(1);
    expect(result.warnings).toContain(LIVE_ELO_PIPELINE_COMPETITION_WEIGHTING_WARNING);
    expect(result.warnings).toContain(LIVE_ELO_PIPELINE_MISSING_COMPETITION_METADATA_WARNING);
  });

  it("warns when competition metadata is unknown while weighting is enabled", () => {
    const result = runLiveEloPipeline({
      pipelineId: "unknown-competition-metadata",
      matches: [{ ...MATCH_A_WINS, competition: "Test Invitational" }],
      competitionWeighting: { enabled: true }
    });

    expect(result.competitionWeighting.unknownCompetitionCount).toBe(1);
    expect(result.warnings).toContain(LIVE_ELO_PIPELINE_UNKNOWN_COMPETITION_WARNING);
  });

  it("combines recency and competition weighting into one Elo update multiplier", () => {
    const match: EloMatch = {
      ...MATCH_A_WINS,
      match_date: "2021-06-30",
      competition: "FIFA World Cup 2022"
    };
    const result = runLiveEloPipeline({
      pipelineId: "combined-weighting",
      matches: [match],
      recencyWeighting: { enabled: true, referenceDate: "2025-06-30" },
      competitionWeighting: { enabled: true }
    });
    const alpha = result.rankedRatings.find((entry) => entry.team === "Alpha");
    const beta = result.rankedRatings.find((entry) => entry.team === "Beta");

    expect(alpha?.eloRating).toBe(1520);
    expect(beta?.eloRating).toBe(1480);
  });

  it("changes ratings when competition weighting is enabled", () => {
    const matches: EloMatch[] = [
      { ...MATCH_A_WINS, competition: "FIFA World Cup 2022" },
      { ...MATCH_B_WINS, competition: "International Friendly" }
    ];
    const defaultResult = runLiveEloPipeline({ pipelineId: "competition-unweighted", matches });
    const weightedResult = runLiveEloPipeline({
      pipelineId: "competition-weighted",
      matches,
      competitionWeighting: { enabled: true }
    });

    expect(weightedResult.rankedRatings).not.toEqual(defaultResult.rankedRatings);
    expect(weightedResult.competitionWeighting.enabled).toBe(true);
    expect(weightedResult.competitionWeighting.matchesWeighted).toBe(2);
  });

  it("is deterministic when competition weighting is enabled", () => {
    const matches: EloMatch[] = [
      { ...MATCH_A_WINS, competition: "FIFA World Cup 2022" },
      { ...MATCH_B_WINS, competition: "FIFA World Cup 2026 Qualifier" },
      { ...MATCH_DRAW, competition: "International Friendly" }
    ];
    const first = runLiveEloPipeline({ pipelineId: "competition-det", matches, competitionWeighting: { enabled: true } });
    const second = runLiveEloPipeline({ pipelineId: "competition-det", matches, competitionWeighting: { enabled: true } });

    expect(first).toEqual(second);
  });
});
