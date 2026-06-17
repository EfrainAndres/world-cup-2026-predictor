import { describe, expect, it } from "vitest";
import { assessPredictionConfidence } from "../src/prediction-confidence.js";

function buildInput(overrides: Partial<Parameters<typeof assessPredictionConfidence>[0]> = {}) {
  return {
    homeTeam: "England",
    awayTeam: "Croatia",
    homeRatingSource: "live_elo_pipeline" as const,
    awayRatingSource: "live_elo_pipeline" as const,
    homeMatchesPlayed: 18,
    awayMatchesPlayed: 16,
    matchesProcessed: 412,
    latestMatchDate: "2026-06-14",
    currentTournamentMatchesIncluded: 0,
    fallbackSeedRating: 1500,
    dataCoverage: "complete international history",
    attackDefenseAvailable: true,
    ...overrides
  };
}

describe("prediction confidence assessment", () => {
  it("returns high confidence for full non-fallback coverage with supporting metadata", () => {
    const assessment = assessPredictionConfidence(buildInput());

    expect(assessment.level).toBe("high");
    expect(assessment.coverageType).toBe("full");
    expect(assessment.manualXgRecommended).toBe(false);
    expect(assessment.reasons).toEqual([
      "Both teams use computed Live Elo ratings.",
      "Both teams have rating coverage with supporting metadata available.",
      "No current World Cup 2026 matches are included yet."
    ]);
  });

  it("downgrades to medium when the dataset is partial and attack-defense context is unavailable", () => {
    const assessment = assessPredictionConfidence(
      buildInput({
        dataCoverage: "partial international history",
        attackDefenseAvailable: false
      })
    );

    expect(assessment.level).toBe("medium");
    expect(assessment.coverageType).toBe("partial");
    expect(assessment.manualXgRecommended).toBe(false);
    expect(assessment.reasons).toEqual([
      "Both teams use computed Live Elo ratings.",
      "The international dataset is partial and curated.",
      "No current World Cup 2026 matches are included yet.",
      "Attack and defense ratings are unavailable."
    ]);
  });

  it("classifies exactly one fallback team as low confidence", () => {
    const assessment = assessPredictionConfidence(
      buildInput({
        awayTeam: "DR Congo",
        awayRatingSource: "fallback_seed",
        awayMatchesPlayed: 0,
        dataCoverage: "partial international history",
        attackDefenseAvailable: false
      })
    );

    expect(assessment.level).toBe("low");
    expect(assessment.coverageType).toBe("fallback");
    expect(assessment.manualXgRecommended).toBe(true);
    expect(assessment.reasons).toEqual([
      "DR Congo uses the fallback rating of 1500.",
      "The international dataset is partial and curated.",
      "No current World Cup 2026 matches are included yet.",
      "Attack and defense ratings are unavailable.",
      "Manual xG review is recommended."
    ]);
  });

  it("classifies two fallback teams as very low confidence", () => {
    const assessment = assessPredictionConfidence(
      buildInput({
        homeTeam: "Haiti",
        awayTeam: "Curacao",
        homeRatingSource: "fallback_seed",
        awayRatingSource: "fallback_seed",
        homeMatchesPlayed: 0,
        awayMatchesPlayed: 0,
        dataCoverage: "partial international history",
        attackDefenseAvailable: false
      })
    );

    expect(assessment.level).toBe("very_low");
    expect(assessment.coverageType).toBe("fallback_only");
    expect(assessment.manualXgRecommended).toBe(true);
    expect(assessment.reasons).toEqual([
      "Both teams use the fallback rating of 1500.",
      "The international dataset is partial and curated.",
      "No current World Cup 2026 matches are included yet.",
      "Attack and defense ratings are unavailable.",
      "Manual xG review is recommended."
    ]);
  });

  it("treats very sparse non-fallback team coverage as very low confidence", () => {
    const assessment = assessPredictionConfidence(
      buildInput({
        homeMatchesPlayed: 1,
        awayMatchesPlayed: 2,
        dataCoverage: "partial international history",
        attackDefenseAvailable: false
      })
    );

    expect(assessment.level).toBe("very_low");
    expect(assessment.coverageType).toBe("partial");
    expect(assessment.reasons).toContain("Both teams have very limited direct match coverage in the current dataset.");
  });

  it("keeps reason ordering deterministic and avoids duplicates when metadata is missing", () => {
    const assessment = assessPredictionConfidence(
      buildInput({
        dataCoverage: "partial international history",
        latestMatchDate: undefined,
        attackDefenseAvailable: false
      })
    );

    expect(assessment.reasons).toEqual([
      "Both teams use computed Live Elo ratings.",
      "The international dataset is partial and curated.",
      "No current World Cup 2026 matches are included yet.",
      "Attack and defense ratings are unavailable."
    ]);
    expect(new Set(assessment.reasons).size).toBe(assessment.reasons.length);
    expect(assessment.dataPoints.latestMatchDate).toBeUndefined();
  });
});
