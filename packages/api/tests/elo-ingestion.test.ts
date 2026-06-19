import { describe, expect, it } from "vitest";
import { isBeforeCutoff, ingestWorldCup2026ResultsIntoLiveElo } from "../src/elo-ingestion.js";
import { getWorldCup2026EloIngestionFoundation, apiRoutes } from "../src/index.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026EloIngestionRecord
} from "../src/index.js";

interface RecordOverrides {
  homeTeam: string;
  awayTeam: string;
  status?: WorldCup2026ExternalFixtureRecord["status"];
  homeScore?: number;
  awayScore?: number;
  kickoffAt?: string | null;
  providerFixtureId?: string;
  group?: string;
  matchday?: number;
}

function makeRecord(overrides: RecordOverrides): WorldCup2026ExternalFixtureRecord {
  const base: WorldCup2026ExternalFixtureRecord = {
    providerFixtureId: overrides.providerFixtureId ?? "test-record",
    competition: "FIFA World Cup",
    season: "2026",
    status: overrides.status ?? "finished",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    homeScore: overrides.homeScore ?? 1,
    awayScore: overrides.awayScore ?? 0
  };

  if (overrides.kickoffAt !== null) {
    base.kickoffAt = overrides.kickoffAt ?? "2026-06-11T18:00:00Z";
  }

  if (overrides.group !== undefined) {
    base.group = overrides.group;
  }

  if (overrides.matchday !== undefined) {
    base.matchday = overrides.matchday;
  }

  return base;
}

const BASELINE: ReadonlyMap<string, number> = new Map([
  ["Mexico", 1600],
  ["South Africa", 1450],
  ["Canada", 1550],
  ["Bosnia & Herzegovina", 1480],
  ["Brazil", 1700],
  ["Morocco", 1560]
]);

const PIPELINE_META = {
  pipelineVersion: "test-pipeline-v1",
  combinedMatchCount: 312
};

describe("isBeforeCutoff", () => {
  it("returns true when cutoffAt is undefined", () => {
    expect(isBeforeCutoff("2026-06-11T18:00:00Z", undefined)).toBe(true);
  });

  it("returns true when kickoffAt is undefined", () => {
    expect(isBeforeCutoff(undefined, "2026-06-15T00:00:00Z")).toBe(true);
  });

  it("returns true when kickoffAt is before cutoffAt", () => {
    expect(isBeforeCutoff("2026-06-11T18:00:00Z", "2026-06-15T00:00:00Z")).toBe(true);
  });

  it("returns false when kickoffAt equals cutoffAt", () => {
    expect(isBeforeCutoff("2026-06-15T00:00:00Z", "2026-06-15T00:00:00Z")).toBe(false);
  });

  it("returns false when kickoffAt is after cutoffAt", () => {
    expect(isBeforeCutoff("2026-06-16T00:00:00Z", "2026-06-15T00:00:00Z")).toBe(false);
  });
});

describe("ingestWorldCup2026ResultsIntoLiveElo", () => {
  it("returns success with empty output when no records provided", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.status).toBe("success");
    expect(result.processedRecords).toHaveLength(0);
    expect(result.adjustedRatings).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
    expect(result.metadata.totalRecordsReceived).toBe(0);
    expect(result.metadata.eligibleRecords).toBe(0);
    expect(result.metadata.processedCount).toBe(0);
    expect(result.metadata.skippedCount).toBe(0);
  });

  it("processes a valid finished record and returns a processed entry", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.status).toBe("success");
    expect(result.processedRecords).toHaveLength(1);
    expect(result.processedRecords[0]?.fixtureId).toBe("wc2026-group-a-md1-01-mexico-vs-south-africa");
    expect(result.processedRecords[0]?.homeTeam).toBe("Mexico");
    expect(result.processedRecords[0]?.awayTeam).toBe("South Africa");
    expect(result.processedRecords[0]?.homeScore).toBe(2);
    expect(result.processedRecords[0]?.awayScore).toBe(0);
    expect(result.metadata.processedCount).toBe(1);
    expect(result.metadata.totalRecordsReceived).toBe(1);
    expect(result.metadata.eligibleRecords).toBe(1);
  });

  it("includes adjusted rating entries for teams in processed matches", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.adjustedRatings).toHaveLength(2);
    const teams = result.adjustedRatings.map((e) => e.team);
    expect(teams).toContain("Mexico");
    expect(teams).toContain("South Africa");

    const mexicoEntry = result.adjustedRatings.find((e) => e.team === "Mexico");
    expect(mexicoEntry?.baselineEloRating).toBe(1600);
    expect(mexicoEntry?.adjustedEloRating).toBeGreaterThan(1600);
    expect(mexicoEntry?.ratingChange).toBeGreaterThan(0);

    const saEntry = result.adjustedRatings.find((e) => e.team === "South Africa");
    expect(saEntry?.baselineEloRating).toBe(1450);
    expect(saEntry?.adjustedEloRating).toBeLessThan(1450);
    expect(saEntry?.ratingChange).toBeLessThan(0);
  });

  it("rejects non-finished records and emits record_rejected_non_finished issues", () => {
    const statuses = ["scheduled", "live", "halftime", "postponed", "cancelled", "unknown"] as const;

    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: statuses.map((status) =>
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", status })
      ),
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(0);
    expect(result.issues).toHaveLength(statuses.length);
    for (const issue of result.issues) {
      expect(issue.code).toBe("record_rejected_non_finished");
    }
    expect(result.metadata.eligibleRecords).toBe(0);
  });

  it("skips records with missing scores and emits score_missing issue", () => {
    const recordWithNoScore: WorldCup2026ExternalFixtureRecord = {
      providerFixtureId: "test-no-score",
      competition: "FIFA World Cup",
      season: "2026",
      status: "finished",
      homeTeam: "Mexico",
      awayTeam: "South Africa"
    };
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [recordWithNoScore],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("score_missing");
  });

  it("skips records that exceed the cutoff and emits cutoff_exceeded issue", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-20T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      cutoffAt: "2026-06-15T00:00:00Z",
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("cutoff_exceeded");
    expect(result.metadata.cutoffAt).toBe("2026-06-15T00:00:00Z");
  });

  it("accepts records without kickoffAt when cutoff is set (undated records bypass cutoff)", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: null
        })
      ],
      baselineRatings: BASELINE,
      cutoffAt: "2026-06-15T00:00:00Z",
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
  });

  it("emits fixture_not_found for records that cannot be resolved to a WC2026 fixture", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Unknown FC", awayTeam: "Ghost United", homeScore: 1, awayScore: 0 })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("fixture_not_found");
  });

  it("is idempotent: processing the same fixture twice only applies it once", () => {
    const record = makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 });

    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [record, record],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("duplicate_skipped");
  });

  it("respects previouslyProcessed ledger and skips already-processed fixtures", () => {
    const alreadyDone: WorldCup2026EloIngestionRecord = {
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      processedAt: "2026-06-12T00:00:00Z",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      homeScore: 2,
      awayScore: 0
    };

    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 })
      ],
      baselineRatings: BASELINE,
      previouslyProcessed: [alreadyDone],
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("duplicate_skipped");
  });

  it("sorts records chronologically before processing", () => {
    const fixtureAId = "wc2026-group-a-md1-01-mexico-vs-south-africa";
    const fixtureBId = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";
    const extendedBaseline = new Map([
      ...BASELINE,
      ["Canada", 1550],
      ["Bosnia-Herzegovina", 1480]
    ]);

    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Canada",
          awayTeam: "Bosnia-Herzegovina",
          homeScore: 1,
          awayScore: 1,
          kickoffAt: "2026-06-12T18:00:00Z"
        }),
        makeRecord({
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T18:00:00Z"
        })
      ],
      baselineRatings: extendedBaseline,
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(2);
    expect(result.processedRecords[0]?.fixtureId).toBe(fixtureAId);
    expect(result.processedRecords[1]?.fixtureId).toBe(fixtureBId);
  });

  it("includes kickoffAt on processed records when present", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T18:00:00Z"
        })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords[0]?.kickoffAt).toBe("2026-06-11T18:00:00Z");
  });

  it("omits kickoffAt on processed records when record has none", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: null
        })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords[0]?.kickoffAt).toBeUndefined();
  });

  it("stores providerFixtureId on processed record when provided", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 2,
          awayScore: 0,
          providerFixtureId: "ext-12345"
        })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords[0]?.providerFixtureId).toBe("ext-12345");
  });

  it("resolves fixture by providerFixtureId when it matches an internal fixture id", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "Unknown",
          awayTeam: "Teams",
          homeScore: 2,
          awayScore: 0,
          providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa"
        })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords).toHaveLength(1);
    expect(result.processedRecords[0]?.fixtureId).toBe("wc2026-group-a-md1-01-mexico-vs-south-africa");
    expect(result.processedRecords[0]?.homeTeam).toBe("Mexico");
    expect(result.processedRecords[0]?.awayTeam).toBe("South Africa");
  });

  it("uses canonical fixture team names on processed records (not the provider names)", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({
          homeTeam: "mexico",
          awayTeam: "south africa",
          homeScore: 2,
          awayScore: 0
        })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.processedRecords[0]?.homeTeam).toBe("Mexico");
    expect(result.processedRecords[0]?.awayTeam).toBe("South Africa");
  });

  it("propagates pipelineVersion and combinedMatchCount to metadata", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [],
      baselineRatings: BASELINE,
      pipelineVersion: "custom-v2",
      combinedMatchCount: 999
    });

    expect(result.metadata.pipelineVersion).toBe("custom-v2");
    expect(result.metadata.combinedMatchCount).toBe(999);
  });

  it("omits cutoffAt from metadata when not provided", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.metadata.cutoffAt).toBeUndefined();
  });

  it("includes cutoffAt in metadata when provided", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [],
      baselineRatings: BASELINE,
      cutoffAt: "2026-06-20T00:00:00Z",
      ...PIPELINE_META
    });

    expect(result.metadata.cutoffAt).toBe("2026-06-20T00:00:00Z");
  });

  it("adjustedRatings are sorted descending by adjustedEloRating", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Brazil", awayTeam: "Morocco", homeScore: 3, awayScore: 0, kickoffAt: "2026-06-11T12:00:00Z" }),
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0, kickoffAt: "2026-06-11T18:00:00Z" })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    const ratings = result.adjustedRatings.map((e) => e.adjustedEloRating);
    for (let i = 0; i < ratings.length - 1; i++) {
      expect(ratings[i]!).toBeGreaterThanOrEqual(ratings[i + 1]!);
    }
  });

  it("uses baseline fallback rating when team is not in baselineRatings", () => {
    const baselineWithoutSA: ReadonlyMap<string, number> = new Map([["Mexico", 1600]]);

    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 })
      ],
      baselineRatings: baselineWithoutSA,
      ...PIPELINE_META
    });

    const saEntry = result.adjustedRatings.find((e) => e.team === "South Africa");
    expect(saEntry?.baselineEloRating).toBe(1500);
  });

  it("skippedCount equals finishedRecords minus processedCount", () => {
    const result = ingestWorldCup2026ResultsIntoLiveElo({
      completedResults: [
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 }),
        makeRecord({ homeTeam: "Unknown FC", awayTeam: "Ghost United", homeScore: 1, awayScore: 0 }),
        makeRecord({ homeTeam: "Mexico", awayTeam: "South Africa", status: "live" })
      ],
      baselineRatings: BASELINE,
      ...PIPELINE_META
    });

    expect(result.metadata.totalRecordsReceived).toBe(3);
    expect(result.metadata.eligibleRecords).toBe(2);
    expect(result.metadata.processedCount).toBe(1);
    expect(result.metadata.skippedCount).toBe(1);
  });
});

describe("getWorldCup2026EloIngestionFoundation", () => {
  it("returns the expected response shape", () => {
    const result = getWorldCup2026EloIngestionFoundation();

    expect(result.status).toBe("success");
    expect(result.tournamentName).toBe("FIFA World Cup 2026");
    expect(result.dataScope).toBe("world_cup_2026_elo_ingestion_foundation");
    expect(result.ingestion.status).toBe("success");
    expect(Array.isArray(result.ingestion.processedRecords)).toBe(true);
    expect(Array.isArray(result.ingestion.adjustedRatings)).toBe(true);
    expect(Array.isArray(result.ingestion.issues)).toBe(true);
    expect(result.ingestion.metadata.pipelineVersion).toBeTruthy();
    expect(result.ingestion.metadata.combinedMatchCount).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.metadata.mode).toBe("pure_handlers");
  });

  it("processes local static results producing ingestion records", () => {
    const result = getWorldCup2026EloIngestionFoundation();

    expect(result.ingestion.processedRecords.length).toBeGreaterThan(0);
    expect(result.ingestion.metadata.processedCount).toBe(result.ingestion.processedRecords.length);
  });

  it("returns adjusted ratings for teams in processed matches", () => {
    const result = getWorldCup2026EloIngestionFoundation();

    expect(result.ingestion.adjustedRatings.length).toBeGreaterThan(0);
    for (const entry of result.ingestion.adjustedRatings) {
      expect(entry.team.length).toBeGreaterThan(0);
      expect(typeof entry.baselineEloRating).toBe("number");
      expect(typeof entry.adjustedEloRating).toBe("number");
      expect(typeof entry.ratingChange).toBe("number");
    }
  });

  it("is exposed on apiRoutes", () => {
    expect(typeof apiRoutes.getWorldCup2026EloIngestionFoundation).toBe("function");
    const result = apiRoutes.getWorldCup2026EloIngestionFoundation();
    expect(result.status).toBe("success");
  });
});

describe("predictMatchFromLiveElo with tournamentResultsAdjustment", () => {
  it("returns without tournamentAdjustment when not requested", () => {
    const result = apiRoutes.predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "France" });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.tournamentAdjustment).toBeUndefined();
  });

  it("returns tournamentAdjustment when enabled", () => {
    const result = apiRoutes.predictMatchFromLiveElo({
      homeTeam: "Brazil",
      awayTeam: "France",
      tournamentResultsAdjustment: { enabled: true }
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.tournamentAdjustment).toBeDefined();
    expect(result.tournamentAdjustment?.applied).toBe(true);
    expect(typeof result.tournamentAdjustment?.matchesIncluded).toBe("number");
  });

  it("does not apply adjustment when enabled is false", () => {
    const result = apiRoutes.predictMatchFromLiveElo({
      homeTeam: "Brazil",
      awayTeam: "France",
      tournamentResultsAdjustment: { enabled: false }
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.tournamentAdjustment).toBeUndefined();
  });

  it("respects cutoffAt when tournament adjustment is enabled", () => {
    const withCutoff = apiRoutes.predictMatchFromLiveElo({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      tournamentResultsAdjustment: { enabled: true, cutoffAt: "2026-06-12T00:00:00Z" }
    });
    const withLateCutoff = apiRoutes.predictMatchFromLiveElo({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      tournamentResultsAdjustment: { enabled: true }
    });

    expect(withCutoff.status).toBe("success");
    expect(withLateCutoff.status).toBe("success");
    if (withCutoff.status !== "success" || withLateCutoff.status !== "success") return;

    expect(withCutoff.tournamentAdjustment?.matchesIncluded).toBeLessThanOrEqual(
      withLateCutoff.tournamentAdjustment?.matchesIncluded ?? 0
    );
  });

  it("tournament adjustment influences Elo ratings used for prediction", () => {
    const baseline = apiRoutes.predictMatchFromLiveElo({
      homeTeam: "Mexico",
      awayTeam: "South Africa"
    });
    const adjusted = apiRoutes.predictMatchFromLiveElo({
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      tournamentResultsAdjustment: { enabled: true }
    });

    expect(baseline.status).toBe("success");
    expect(adjusted.status).toBe("success");
    if (baseline.status !== "success" || adjusted.status !== "success") return;

    if (adjusted.tournamentAdjustment?.matchesIncluded ?? 0 > 0) {
      expect(adjusted.liveElo.homeEloRating).not.toBe(baseline.liveElo.homeEloRating);
    }
  });
});
