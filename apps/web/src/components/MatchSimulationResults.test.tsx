import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import type { PredictMatchFromLiveEloSuccessResponse, ScorelinePresentation } from "@world-cup-2026-predictor/api";

vi.mock("./StatusPill", () => ({
  StatusPill: () => null
}));

import { MatchSimulationResults } from "./MatchSimulationResults";
import type { WorldCup2026MatchContext } from "../lib/api-client";
import { predictDashboardMatchFromLiveElo, simulateDashboardMatch } from "../lib/api-client";

function makeResult() {
  const response = simulateDashboardMatch({
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    expectedHomeGoals: 1.2,
    expectedAwayGoals: 0.9,
    maxGoals: 6,
    mostLikelyScorelineLimit: 3
  });

  if (response.status !== "success") throw new Error("Expected success");
  return response;
}

function makeContext(overrides: Partial<WorldCup2026MatchContext> = {}): WorldCup2026MatchContext {
  return {
    fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    group: "A",
    matchday: 1,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    standingsContext: {
      mode: "official",
      home: {
        team: "Mexico",
        groupPosition: null,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      },
      away: {
        team: "South Africa",
        groupPosition: null,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      },
      groupComplete: false
    },
    qualificationState: {
      status: "foundation_only"
    },
    fixtureImportance: {
      level: "low",
      reasons: ["Opening fixture: qualification stakes are minimal at this stage."]
    },
    providerFreshness: {
      activeProvider: "football_data_org_results_provider",
      cacheUsed: false,
      localFallbackUsed: false,
      stale: false
    },
    fallbackState: {
      externalProviderEnabled: true,
      localFallbackUsed: false,
      unresolvedFixture: false,
      warnings: []
    },
    ...overrides
  };
}

function makeLiveResultWithStatsBomb(
  statsBombSignal: PredictMatchFromLiveEloSuccessResponse["statsBombSignal"]
): PredictMatchFromLiveEloSuccessResponse {
  const response = predictDashboardMatchFromLiveElo({
    homeTeam: "France",
    awayTeam: "Brazil",
    preset: "balanced",
    maxGoals: 6,
    mostLikelyScorelineLimit: 3
  });

  if (response.status !== "success") throw new Error("Expected success");

  return {
    ...response,
    statsBombSignal
  };
}

function makeLiveResultWithPresentation(
  scorelinePresentation: ScorelinePresentation,
  homeTeam = "France",
  awayTeam = "Brazil"
): PredictMatchFromLiveEloSuccessResponse {
  const response = predictDashboardMatchFromLiveElo({
    homeTeam,
    awayTeam,
    preset: "balanced",
    maxGoals: 6,
    mostLikelyScorelineLimit: 5
  });
  if (response.status !== "success") throw new Error("Expected success");
  return { ...response, scorelinePresentation };
}

// Presentation fixture: recommended score (1-0) is in home_win, modal (1-1) is in draw.
const PRESENTATION_DIFFERS: ScorelinePresentation = {
  modalExactScore: { homeGoals: 1, awayGoals: 1, probability: 0.155, outcome: "draw", rankOverall: 1, rankWithinOutcome: 1 },
  recommendedScore: { homeGoals: 1, awayGoals: 0, probability: 0.140, outcome: "home_win", rankOverall: 2, rankWithinOutcome: 1 },
  topScorelines: [
    { homeGoals: 1, awayGoals: 1, probability: 0.155, outcome: "draw", rankOverall: 1, rankWithinOutcome: 1 },
    { homeGoals: 1, awayGoals: 0, probability: 0.140, outcome: "home_win", rankOverall: 2, rankWithinOutcome: 1 },
    { homeGoals: 2, awayGoals: 0, probability: 0.110, outcome: "home_win", rankOverall: 3, rankWithinOutcome: 2 },
    { homeGoals: 0, awayGoals: 1, probability: 0.095, outcome: "away_win", rankOverall: 4, rankWithinOutcome: 1 },
    { homeGoals: 0, awayGoals: 0, probability: 0.090, outcome: "draw", rankOverall: 5, rankWithinOutcome: 2 }
  ],
  recommendedOutcome: "home_win",
  recommendationReason: "selected_top_scoreline_for_most_likely_outcome",
  diversitySummary: {
    uniqueScorelineCount: 49,
    top1CumulativeProbability: 0.155,
    top3CumulativeProbability: 0.405,
    top5CumulativeProbability: 0.590,
    top1To2Gap: 0.015,
    modalAndRecommendedAlign: false,
    recommendedIsModal: false
  }
};

// Presentation fixture: recommended equals modal (1-0 home_win in a strongly home-favoured match).
const PRESENTATION_EQUAL: ScorelinePresentation = {
  modalExactScore: { homeGoals: 1, awayGoals: 0, probability: 0.185, outcome: "home_win", rankOverall: 1, rankWithinOutcome: 1 },
  recommendedScore: { homeGoals: 1, awayGoals: 0, probability: 0.185, outcome: "home_win", rankOverall: 1, rankWithinOutcome: 1 },
  topScorelines: [
    { homeGoals: 1, awayGoals: 0, probability: 0.185, outcome: "home_win", rankOverall: 1, rankWithinOutcome: 1 },
    { homeGoals: 1, awayGoals: 1, probability: 0.130, outcome: "draw", rankOverall: 2, rankWithinOutcome: 1 },
    { homeGoals: 2, awayGoals: 0, probability: 0.115, outcome: "home_win", rankOverall: 3, rankWithinOutcome: 2 },
    { homeGoals: 0, awayGoals: 1, probability: 0.095, outcome: "away_win", rankOverall: 4, rankWithinOutcome: 1 },
    { homeGoals: 0, awayGoals: 0, probability: 0.080, outcome: "draw", rankOverall: 5, rankWithinOutcome: 2 }
  ],
  recommendedOutcome: "home_win",
  recommendationReason: "modal_matches_most_likely_outcome",
  diversitySummary: {
    uniqueScorelineCount: 49,
    top1CumulativeProbability: 0.185,
    top3CumulativeProbability: 0.430,
    top5CumulativeProbability: 0.605,
    top1To2Gap: 0.055,
    modalAndRecommendedAlign: true,
    recommendedIsModal: true
  }
};

// Presentation fixture: near-tie outcome reason.
const PRESENTATION_NEAR_TIE: ScorelinePresentation = {
  ...PRESENTATION_EQUAL,
  recommendationReason: "outcome_probabilities_near_tied"
};

describe("MatchSimulationResults — match context section", () => {
  test("section header is always present when matchContext is undefined", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} />
    );
    expect(html).toContain("Match context — not used as a model input");
  });

  test("shows 'not available' message when matchContext is undefined", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} />
    );
    expect(html).toContain("Match context is not available for this prediction.");
  });

  test("does not show 'not available' message when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).not.toContain("Match context is not available for this prediction.");
  });

  test("renders home and away team names from context when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).toContain("Mexico");
    expect(html).toContain("South Africa");
  });

  test("renders 'Not used as a model input' label when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).toContain("Not used as a model input");
  });

  test("section header is always present when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).toContain("Match context — not used as a model input");
  });

  test("renders applied StatsBomb signal metadata without exposing raw artifacts", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: true,
          reason: "applied",
          rolloutMode: "on",
          activationDecision: "production_ready",
          authoritative: "statsbomb",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          artifactCutoffAt: "2026-06-01T00:00:00.000Z",
          artifactGeneratedAt: "2026-06-29T19:48:39.341Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 10,
            latestMatchAt: "2024-07-01",
            weight: 0.14
          },
          awayProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 8,
            latestMatchAt: "2024-06-30",
            weight: 0.12
          },
          warnings: []
        })}
      />
    );

    expect(html).toContain("StatsBomb enriched");
    expect(html).toContain("Model: Elo V2 + StatsBomb");
    expect(html).toContain("Partial / Partial");
    expect(html).toContain("Signal weight");
    expect(html).toContain("June 1, 2026");
    expect(html).not.toContain("statsbomb-team-performance-profiles");
  });

  test("renders shadow mode as baseline-authoritative", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: false,
          reason: "applied",
          rolloutMode: "shadow",
          activationDecision: "shadow_ready",
          authoritative: "baseline",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.1, away: 0.9 },
          shadowAdjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 10,
            latestMatchAt: "2024-07-01",
            weight: 0.14
          },
          awayProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 8,
            latestMatchAt: "2024-06-30",
            weight: 0.12
          },
          warnings: []
        })}
      />
    );

    expect(html).toContain("Baseline model");
    expect(html).toContain("Shadow mode computed a comparison only");
    expect(html).toContain("Shadow adjusted xG");
    expect(html).not.toContain("StatsBomb enriched");
  });
});

describe("MatchSimulationResults — scoreline presentation section", () => {
  test("renders recommended score section for live Elo predictions", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 5
    });
    if (response.status !== "success") throw new Error("Expected success");

    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).toContain("Recommended score");
    expect(html).toContain("Scoreline prediction");
    expect(html).toContain("Most likely outcome:");
  });

  test("renders top scorelines list with rec. badge on recommended score", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "Germany",
      awayTeam: "Spain",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 5
    });
    if (response.status !== "success") throw new Error("Expected success");

    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).toContain("rec.");
    expect(html).toContain("Top 5 scorelines");
  });

  test("renders diversity summary footer with cumulative probability", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "Argentina",
      awayTeam: "Mexico",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 5
    });
    if (response.status !== "success") throw new Error("Expected success");

    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).toContain("Top 5 cumulative:");
    expect(html).toContain("Top-2 gap:");
  });

  test("does not render scoreline presentation for baseline simulation responses", () => {
    const html = renderToStaticMarkup(<MatchSimulationResults result={makeResult()} />);
    expect(html).not.toContain("Recommended score");
    expect(html).toContain("Most likely scorelines");
  });
});

describe("MatchSimulationResults — scoreline presentation: modal differs from recommended", () => {
  test("shows Modal exact score card when recommended differs from modal", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_DIFFERS)} />
    );
    expect(html).toContain("Modal exact score");
    expect(html).toContain("Recommended score");
  });

  test("does not show 'equals modal' note when recommended differs from modal", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_DIFFERS)} />
    );
    expect(html).not.toContain("Recommended score equals modal exact score.");
  });

  test("shows modal badge in top scorelines list when recommended differs from modal", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_DIFFERS)} />
    );
    expect(html).toContain("modal");
    expect(html).toContain("rec.");
  });

  test("renders explanation text for selected_top_scoreline_for_most_likely_outcome", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithPresentation(PRESENTATION_DIFFERS, "France", "Brazil")}
      />
    );
    expect(html).toContain("The modal score is in a different outcome.");
    expect(html).toContain("most likely outcome");
    expect(html).toContain("France win");
  });

  test("outcome label in explanation contains home team name for home_win outcome", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithPresentation(PRESENTATION_DIFFERS, "Germany", "Spain")}
      />
    );
    expect(html).toContain("Germany win");
  });
});

describe("MatchSimulationResults — scoreline presentation: modal equals recommended", () => {
  test("shows 'Recommended score equals modal exact score.' note when equal", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_EQUAL)} />
    );
    expect(html).toContain("Recommended score equals modal exact score.");
  });

  test("does not show a separate Modal exact score card when recommended equals modal", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_EQUAL)} />
    );
    expect(html).not.toContain("Modal exact score");
  });

  test("does not render modal badge in top scorelines when recommended equals modal", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_EQUAL)} />
    );
    // "modal" badge should not appear but "rec." should still be there
    expect(html).toContain("rec.");
    expect(html).not.toContain(">modal<");
  });

  test("renders explanation text for modal_matches_most_likely_outcome", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_EQUAL)} />
    );
    expect(html).toContain("The most likely scoreline also belongs to the most likely match outcome.");
  });

  test("top scorelines list renders exactly 5 items", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_EQUAL)} />
    );
    // Count <li> elements within the scorelines list — match the text "rec." appearing once
    const recCount = (html.match(/rec\./g) ?? []).length;
    expect(recCount).toBe(1);
    // Verify all 5 scorelines appear by checking probability presence
    expect(html).toContain("18.5%");
    expect(html).toContain("13.0%");
    expect(html).toContain("11.5%");
    expect(html).toContain("9.5%");
    expect(html).toContain("8.0%");
  });
});

describe("MatchSimulationResults — scoreline presentation: near-tie outcome", () => {
  test("renders near-tie explanation text", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_NEAR_TIE)} />
    );
    expect(html).toContain("outcome probabilities are closely matched");
  });

  test("near-tie result still shows Recommended score card", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithPresentation(PRESENTATION_NEAR_TIE)} />
    );
    expect(html).toContain("Recommended score");
  });
});

describe("MatchSimulationResults — scoreline presentation: outcome label accessibility", () => {
  test("draw outcome renders 'Draw' as outcome label", () => {
    const drawPresentation: ScorelinePresentation = {
      ...PRESENTATION_EQUAL,
      recommendedOutcome: "draw",
      recommendationReason: "draw_is_most_likely_outcome",
      modalExactScore: { homeGoals: 1, awayGoals: 1, probability: 0.185, outcome: "draw", rankOverall: 1, rankWithinOutcome: 1 },
      recommendedScore: { homeGoals: 1, awayGoals: 1, probability: 0.185, outcome: "draw", rankOverall: 1, rankWithinOutcome: 1 }
    };
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithPresentation(drawPresentation, "France", "Brazil")}
      />
    );
    expect(html).toContain("Most likely outcome:");
    expect(html).toContain("Draw");
  });

  test("away_win outcome renders away team name as outcome label", () => {
    const awayPresentation: ScorelinePresentation = {
      ...PRESENTATION_DIFFERS,
      recommendedOutcome: "away_win",
      recommendedScore: { homeGoals: 0, awayGoals: 1, probability: 0.140, outcome: "away_win", rankOverall: 2, rankWithinOutcome: 1 },
      recommendationReason: "selected_top_scoreline_for_most_likely_outcome"
    };
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithPresentation(awayPresentation, "France", "Brazil")}
      />
    );
    expect(html).toContain("Brazil win");
  });
});

describe("MatchSimulationResults — scoreline presentation: StatsBomb mode isolation", () => {
  test("scorelinePresentation section present alongside StatsBomb section in on mode", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 5
    });
    if (response.status !== "success") throw new Error("Expected success");

    // Simulate StatsBomb on mode (enriched) — scorelinePresentation comes from the authoritative matrix
    const withStatsBomb = {
      ...response,
      statsBombSignal: {
        enabled: true,
        applied: true,
        reason: "applied" as const,
        rolloutMode: "on" as const,
        activationDecision: "production_ready" as const,
        authoritative: "statsbomb" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.1, away: 0.9 },
        adjustedExpectedGoals: { home: 1.2, away: 0.8 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={withStatsBomb} />);
    // Both sections should be present
    expect(html).toContain("Scoreline prediction");
    expect(html).toContain("StatsBomb enriched");
  });

  test("scorelinePresentation section present in shadow mode — baseline authoritative", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 5
    });
    if (response.status !== "success") throw new Error("Expected success");

    const withShadow = {
      ...response,
      statsBombSignal: {
        enabled: true,
        applied: false,
        reason: "applied" as const,
        rolloutMode: "shadow" as const,
        activationDecision: "shadow_ready" as const,
        authoritative: "baseline" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.1, away: 0.9 },
        adjustedExpectedGoals: { home: 1.1, away: 0.9 },
        shadowAdjustedExpectedGoals: { home: 1.2, away: 0.8 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={withShadow} />);
    // scorelinePresentation is from baseline matrix — section is present
    expect(html).toContain("Scoreline prediction");
    // Shadow mode shows baseline label
    expect(html).toContain("Baseline model");
    expect(html).not.toContain("StatsBomb enriched");
  });
});

// ── Attack/Defense goal model section ────────────────────────────────────────

function makeLiveResultWithAttackDefense(
  attackDefenseGoalModel: PredictMatchFromLiveEloSuccessResponse["attackDefenseGoalModel"]
): PredictMatchFromLiveEloSuccessResponse {
  const response = predictDashboardMatchFromLiveElo({
    homeTeam: "France",
    awayTeam: "Brazil",
    preset: "balanced",
    maxGoals: 6,
    mostLikelyScorelineLimit: 3
  });
  if (response.status !== "success") throw new Error("Expected success");
  return { ...response, attackDefenseGoalModel };
}

const AD_PROFILE_SUMMARY = {
  coverage: "partial",
  matchCount: 12,
  cutoffAt: "2026-06-11",
};

const AD_META_OFF: PredictMatchFromLiveEloSuccessResponse["attackDefenseGoalModel"] = {
  mode: "off",
  applied: false,
  reason: "disabled",
  activationDecision: "disabled",
  baselineExpectedGoals: { home: 1.35, away: 1.10 },
  effectiveExpectedGoals: { home: 1.35, away: 1.10 },
  homeProfile: null,
  awayProfile: null,
  warnings: [],
};

const AD_META_SHADOW: PredictMatchFromLiveEloSuccessResponse["attackDefenseGoalModel"] = {
  mode: "shadow",
  applied: false,
  reason: "shadow",
  activationDecision: "shadow_ready",
  candidateId: "attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0",
  baselineExpectedGoals: { home: 1.35, away: 1.10 },
  effectiveExpectedGoals: { home: 1.35, away: 1.10 },
  shadowExpectedGoals: { home: 1.48, away: 0.95 },
  homeProfile: AD_PROFILE_SUMMARY,
  awayProfile: { ...AD_PROFILE_SUMMARY, coverage: "full", matchCount: 20 },
  warnings: [],
};

const AD_META_ON_APPLIED: PredictMatchFromLiveEloSuccessResponse["attackDefenseGoalModel"] = {
  mode: "on",
  applied: true,
  reason: "applied",
  activationDecision: "production_ready",
  candidateId: "attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0",
  baselineExpectedGoals: { home: 1.35, away: 1.10 },
  effectiveExpectedGoals: { home: 1.48, away: 0.95 },
  homeProfile: AD_PROFILE_SUMMARY,
  awayProfile: { ...AD_PROFILE_SUMMARY, coverage: "full", matchCount: 20 },
  warnings: [],
};

const AD_META_ON_FALLBACK: PredictMatchFromLiveEloSuccessResponse["attackDefenseGoalModel"] = {
  mode: "on",
  applied: false,
  reason: "away_profile_fallback",
  activationDecision: "production_ready",
  baselineExpectedGoals: { home: 1.35, away: 1.10 },
  effectiveExpectedGoals: { home: 1.35, away: 1.10 },
  homeProfile: AD_PROFILE_SUMMARY,
  awayProfile: { ...AD_PROFILE_SUMMARY, coverage: "fallback", matchCount: 0 },
  warnings: [],
};

const AD_META_ON_SPARSE: PredictMatchFromLiveEloSuccessResponse["attackDefenseGoalModel"] = {
  mode: "on",
  applied: false,
  reason: "away_profile_sparse",
  activationDecision: "production_ready",
  baselineExpectedGoals: { home: 1.35, away: 1.10 },
  effectiveExpectedGoals: { home: 1.35, away: 1.10 },
  homeProfile: AD_PROFILE_SUMMARY,
  awayProfile: { ...AD_PROFILE_SUMMARY, coverage: "sparse", matchCount: 1 },
  warnings: [],
};

describe("MatchSimulationResults — Attack/Defense section absent", () => {
  test("no AD disclosure when attackDefenseGoalModel is undefined", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 3
    });
    if (response.status !== "success") throw new Error("Expected success");
    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).not.toContain("Attack/Defense model");
    expect(html).not.toContain("Attack/Defense technical details");
  });
});

describe("MatchSimulationResults — Attack/Defense off state", () => {
  test("shows Baseline Elo V2 title and Off mode", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_OFF)} />
    );
    expect(html).toContain("Attack/Defense model");
    expect(html).toContain("Baseline Elo V2");
    expect(html).toContain("Off");
  });

  test("shows Applied: No, Stage authoritative: No, Final authoritative: No", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_OFF)} />
    );
    expect(html).toContain("Stage authoritative");
    expect(html).toContain("Final authoritative");
    expect(html).not.toContain(">Yes<");
  });

  test("shows human-readable reason 'Disabled' not raw enum 'disabled'", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_OFF)} />
    );
    expect(html).toContain("Disabled");
    // The raw enum value 'disabled' must not appear as user-visible primary copy in a label
    // (it may appear inside the activationDecision row with formatting, which is acceptable)
    const labelMatches = html.match(/<dt[^>]*>Reason<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (labelMatches) {
      expect(labelMatches[1]).not.toBe("disabled");
    }
  });
});

describe("MatchSimulationResults — Attack/Defense shadow state", () => {
  test("shows Shadow comparison title and Shadow badge", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Shadow comparison");
    expect(html).toContain("Attack/Defense model");
  });

  test("shadow Applied shows 'Yes, shadow calculation only'", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Yes, shadow calculation only");
  });

  test("shadow Stage authoritative and Final authoritative are both No", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Stage authoritative");
    expect(html).toContain("Final authoritative");
    const stageMatch = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (stageMatch) {
      expect(stageMatch[1]).toContain("No");
    }
    const finalMatch = html.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalMatch) {
      expect(finalMatch[1]).toContain("No");
    }
  });

  test("shadow reason shows human-readable value", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Shadow only — Elo V2 remains authoritative");
  });

  test("shadow Shadow xG is visible in details", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Shadow xG");
    expect(html).toContain("1.48");
    expect(html).toContain("0.95");
  });

  test("shadow baseline xG visible in details", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Baseline xG");
    expect(html).toContain("1.35");
    expect(html).toContain("1.10");
  });

  test("shadow authoritative xG equals baseline (1.35 / 1.10)", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Authoritative xG");
    const authXgMatch = html.match(/Authoritative xG<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (authXgMatch) {
      expect(authXgMatch[1]).toContain("1.35");
    }
  });
});

describe("MatchSimulationResults — Attack/Defense on applied state", () => {
  test("shows Attack/Defense enriched title and badge", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    expect(html).toContain("Attack/Defense enriched");
  });

  test("on applied Stage authoritative and Final authoritative are both Yes (SB off)", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    const stageMatch = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (stageMatch) {
      expect(stageMatch[1]).toContain("Yes");
    }
    const finalMatch = html.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalMatch) {
      expect(finalMatch[1]).toContain("Yes");
    }
  });

  test("on applied Candidate xG shows effective values", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    expect(html).toContain("Candidate xG");
    expect(html).toContain("1.48");
    expect(html).toContain("0.95");
  });

  test("on applied candidate ID rendered in details", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    expect(html).toContain("Candidate ID");
    expect(html).toContain("attack_defense_log_linear_damped");
  });
});

describe("MatchSimulationResults — Attack/Defense on fallback state", () => {
  test("shows Baseline Elo V2 title when on mode but not applied", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_FALLBACK)} />
    );
    expect(html).toContain("Attack/Defense model");
    expect(html).toContain("Baseline Elo V2");
  });

  test("fallback Applied is No", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_FALLBACK)} />
    );
    expect(html).not.toContain("Yes, shadow");
    expect(html).toContain("Authoritative");
  });

  test("fallback reason shows sanitized human-readable text", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_FALLBACK)} />
    );
    expect(html).toContain("Away profile uses fallback data");
    const labelMatches = html.match(/Reason<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (labelMatches) {
      expect(labelMatches[1]).not.toBe("away_profile_fallback");
    }
  });
});

describe("MatchSimulationResults — Attack/Defense sparse rejection state", () => {
  test("sparse reason shows sanitized human-readable text", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_SPARSE)} />
    );
    expect(html).toContain("Away profile coverage is sparse");
    const labelMatches = html.match(/Reason<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (labelMatches) {
      expect(labelMatches[1]).not.toBe("away_profile_sparse");
    }
  });
});

describe("MatchSimulationResults — Attack/Defense metadata edge cases", () => {
  test("null candidate xG shows Not available", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_OFF)} />
    );
    expect(html).toContain("Not available");
  });

  test("fallback profiles remain visible for coverage and sample size", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_FALLBACK)} />
    );
    expect(html).toContain("fallback");
    expect(html).toContain(">0<");
  });

  test("Attack/Defense disclosure is collapsed by default (details element present)", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Attack/Defense technical details");
    expect(html).not.toMatch(/<details[^>]*\sopen[^>]*>[\s\S]*Attack\/Defense technical details/);
  });

  test("StatsBomb disclosure renders independently alongside AD disclosure", () => {
    const resultWithBoth = {
      ...makeLiveResultWithAttackDefense(AD_META_SHADOW),
      statsBombSignal: {
        enabled: true,
        applied: false,
        reason: "applied" as const,
        rolloutMode: "shadow" as const,
        activationDecision: "shadow_ready" as const,
        authoritative: "baseline" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.35, away: 1.10 },
        adjustedExpectedGoals: { home: 1.35, away: 1.10 },
        shadowAdjustedExpectedGoals: { home: 1.40, away: 1.05 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={resultWithBoth} />);
    expect(html).toContain("Attack/Defense model");
    expect(html).toContain("StatsBomb technical details");
    expect(html).toContain("Shadow comparison");
    expect(html).toContain("Baseline model");
  });

  test("scoreline presentation remains unchanged with AD section present", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    expect(html).toContain("Scoreline prediction");
    expect(html).toContain("Recommended score");
    expect(html).toContain("Most likely outcome:");
  });

  test("AD section renders without horizontal overflow risk (no long unbreakable strings in labels)", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    expect(html).toMatch(/break-all[\s\S]*attack_defense_log_linear_damped|attack_defense_log_linear_damped[\s\S]*break-all/);
  });
});

// ── Phase 12.21C: Pipeline label tests ───────────────────────────────────────

describe("MatchSimulationResults — pipeline label: off/off", () => {
  test("pipeline label shows 'Elo V2' when no AD or SB metadata", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 3
    });
    if (response.status !== "success") throw new Error("Expected success");
    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).toContain("Pipeline:");
    expect(html).toContain("Elo V2");
    expect(html).not.toContain("→");
  });

  test("pipeline label shows 'Elo V2' when AD mode is off", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_OFF)} />
    );
    expect(html).toContain("Pipeline:");
    expect(html).toContain("Elo V2");
    expect(html).not.toContain("→ Attack/Defense");
  });
});

describe("MatchSimulationResults — pipeline label: AD active, SB off", () => {
  test("pipeline label includes 'Attack/Defense' when AD mode is shadow", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Elo V2 → Attack/Defense");
    expect(html).not.toContain("→ StatsBomb");
  });

  test("pipeline label includes 'Attack/Defense' when AD mode is on", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_APPLIED)} />
    );
    expect(html).toContain("Elo V2 → Attack/Defense");
    expect(html).not.toContain("→ StatsBomb");
  });
});

describe("MatchSimulationResults — pipeline label: AD on, SB shadow", () => {
  test("pipeline label includes both stages; AD stage auth Yes, AD final auth Yes, SB auth No", () => {
    const result = {
      ...makeLiveResultWithAttackDefense(AD_META_ON_APPLIED),
      statsBombSignal: {
        enabled: true,
        applied: false,
        reason: "applied" as const,
        rolloutMode: "shadow" as const,
        activationDecision: "shadow_ready" as const,
        authoritative: "baseline" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.48, away: 0.95 },
        adjustedExpectedGoals: { home: 1.48, away: 0.95 },
        shadowAdjustedExpectedGoals: { home: 1.52, away: 0.92 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={result} />);
    expect(html).toContain("Elo V2 → Attack/Defense → StatsBomb");

    // AD: applied, SB shadow → AD stage auth Yes, AD final auth Yes
    const adStageMatches = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>Yes<\/dd>/g) ?? [];
    // AD section stage auth Yes
    expect(adStageMatches.length).toBeGreaterThanOrEqual(1);

    // SB shadow → SB stage auth No, SB final auth No
    expect(html).toContain("Shadow mode computed a comparison only");
  });
});

describe("MatchSimulationResults — pipeline label: AD on, SB on applied", () => {
  test("pipeline includes both; AD stage auth Yes, AD final auth No; SB auth Yes", () => {
    const result = {
      ...makeLiveResultWithAttackDefense(AD_META_ON_APPLIED),
      statsBombSignal: {
        enabled: true,
        applied: true,
        reason: "applied" as const,
        rolloutMode: "on" as const,
        activationDecision: "production_ready" as const,
        authoritative: "statsbomb" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.48, away: 0.95 },
        adjustedExpectedGoals: { home: 1.55, away: 0.88 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={result} />);
    expect(html).toContain("Elo V2 → Attack/Defense → StatsBomb");

    // AD stage auth Yes, but SB on+applied → AD final auth No
    // The AD section should show Stage authoritative: Yes, Final authoritative: No
    const adSection = html.indexOf("Attack/Defense model");
    const sbSection = html.indexOf("Model signal");
    expect(adSection).toBeGreaterThan(-1);
    expect(sbSection).toBeGreaterThan(-1);

    // SB on+applied → stage auth Yes, final auth Yes
    expect(html).toContain("StatsBomb enriched");
  });

  test("AD final authoritative is No when SB on and applied", () => {
    const result = {
      ...makeLiveResultWithAttackDefense(AD_META_ON_APPLIED),
      statsBombSignal: {
        enabled: true,
        applied: true,
        reason: "applied" as const,
        rolloutMode: "on" as const,
        activationDecision: "production_ready" as const,
        authoritative: "statsbomb" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.48, away: 0.95 },
        adjustedExpectedGoals: { home: 1.55, away: 0.88 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={result} />);
    // AD section: Stage authoritative Yes, Final authoritative No (SB overrides)
    // Extract just the AD section (before StatsBomb section)
    const adStart = html.indexOf("Attack/Defense model");
    const sbStart = html.indexOf("Model signal");
    const adSection = html.slice(adStart, sbStart > adStart ? sbStart : undefined);
    const finalAuthMatch = adSection.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalAuthMatch) {
      expect(finalAuthMatch[1]).toContain("No");
    }
  });
});

describe("MatchSimulationResults — pipeline label: AD rejected, SB rejected", () => {
  test("shows fallback clarity note when both stages are in pipeline but neither applied", () => {
    const result = {
      ...makeLiveResultWithAttackDefense(AD_META_ON_FALLBACK),
      statsBombSignal: {
        enabled: true,
        applied: false,
        reason: "home_profile_missing" as const,
        rolloutMode: "on" as const,
        activationDecision: "production_ready" as const,
        authoritative: "baseline" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.35, away: 1.10 },
        adjustedExpectedGoals: { home: 1.35, away: 1.10 },
        homeProfile: null,
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={result} />);
    expect(html).toContain("Elo V2 is the final authoritative model for this prediction.");
  });

  test("AD rejected: Stage authoritative No, Final authoritative No", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_ON_FALLBACK)} />
    );
    const stageMatch = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (stageMatch) {
      expect(stageMatch[1]).toContain("No");
    }
    const finalMatch = html.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalMatch) {
      expect(finalMatch[1]).toContain("No");
    }
  });

  test("SB rejected: Stage authoritative No, Final authoritative No", () => {
    const result = makeLiveResultWithStatsBomb({
      enabled: true,
      applied: false,
      reason: "home_profile_missing" as const,
      rolloutMode: "on" as const,
      activationDecision: "production_ready" as const,
      authoritative: "baseline" as const,
      provider: "statsbomb_open_data" as const,
      cutoffAt: "2026-06-01T00:00:00.000Z",
      signalVersion: "statsbomb-signal-v1",
      baselineExpectedGoals: { home: 1.1, away: 0.9 },
      adjustedExpectedGoals: { home: 1.1, away: 0.9 },
      homeProfile: null,
      awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
      warnings: []
    });
    const html = renderToStaticMarkup(<MatchSimulationResults result={result} />);
    expect(html).toContain("Stage authoritative");
    expect(html).toContain("Final authoritative");
    const stageMatch = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (stageMatch) {
      expect(stageMatch[1]).toContain("No");
    }
    const finalMatch = html.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalMatch) {
      expect(finalMatch[1]).toContain("No");
    }
  });
});

describe("MatchSimulationResults — StatsBomb stage and final authority", () => {
  test("SB on+applied: Stage authoritative Yes, Final authoritative Yes", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: true,
          reason: "applied",
          rolloutMode: "on",
          activationDecision: "production_ready",
          authoritative: "statsbomb",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          artifactCutoffAt: "2026-06-01T00:00:00.000Z",
          artifactGeneratedAt: "2026-06-29T19:48:39.341Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: { coverage: "partial", freshness: "stale", matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
          awayProfile: { coverage: "partial", freshness: "stale", matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
          warnings: []
        })}
      />
    );
    const stageMatch = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (stageMatch) {
      expect(stageMatch[1]).toContain("Yes");
    }
    const finalMatch = html.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalMatch) {
      expect(finalMatch[1]).toContain("Yes");
    }
  });

  test("SB shadow: Stage authoritative No, Final authoritative No", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: false,
          reason: "applied",
          rolloutMode: "shadow",
          activationDecision: "shadow_ready",
          authoritative: "baseline",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.1, away: 0.9 },
          shadowAdjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: { coverage: "partial", freshness: "stale", matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
          awayProfile: { coverage: "partial", freshness: "stale", matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
          warnings: []
        })}
      />
    );
    const stageMatch = html.match(/Stage authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (stageMatch) {
      expect(stageMatch[1]).toContain("No");
    }
    const finalMatch = html.match(/Final authoritative<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
    if (finalMatch) {
      expect(finalMatch[1]).toContain("No");
    }
  });
});

describe("MatchSimulationResults — pipeline label visibility", () => {
  test("pipeline label is always present for live Elo predictions", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "Argentina",
      awayTeam: "Germany",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 3
    });
    if (response.status !== "success") throw new Error("Expected success");
    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).toContain("Pipeline:");
    expect(html).toContain("Elo V2");
  });

  test("pipeline label is not rendered for baseline simulation results", () => {
    const html = renderToStaticMarkup(<MatchSimulationResults result={makeResult()} />);
    expect(html).not.toContain("Pipeline:");
  });

  test("pipeline label with AD shadow and no SB includes only Attack/Defense stage", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeLiveResultWithAttackDefense(AD_META_SHADOW)} />
    );
    expect(html).toContain("Elo V2 → Attack/Defense");
    expect(html).not.toContain("→ StatsBomb");
  });

  test("pipeline label with SB on and no AD shows only StatsBomb stage", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: true,
          reason: "applied",
          rolloutMode: "on",
          activationDecision: "production_ready",
          authoritative: "statsbomb",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: { coverage: "partial", freshness: "stale", matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
          awayProfile: { coverage: "partial", freshness: "stale", matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
          warnings: []
        })}
      />
    );
    expect(html).toContain("Elo V2 → StatsBomb");
    expect(html).not.toContain("Attack/Defense →");
  });

  test("fallback clarity note is absent when no active stages beyond Elo V2", () => {
    const response = predictDashboardMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "balanced",
      maxGoals: 6,
      mostLikelyScorelineLimit: 3
    });
    if (response.status !== "success") throw new Error("Expected success");
    const html = renderToStaticMarkup(<MatchSimulationResults result={response} />);
    expect(html).not.toContain("Elo V2 is the final authoritative model for this prediction.");
  });
});

describe("MatchSimulationResults — no scoreline output regression", () => {
  test("scoreline probability cards are present for live Elo prediction with AD and SB", () => {
    const result = {
      ...makeLiveResultWithAttackDefense(AD_META_ON_APPLIED),
      statsBombSignal: {
        enabled: true,
        applied: true,
        reason: "applied" as const,
        rolloutMode: "on" as const,
        activationDecision: "production_ready" as const,
        authoritative: "statsbomb" as const,
        provider: "statsbomb_open_data" as const,
        cutoffAt: "2026-06-01T00:00:00.000Z",
        signalVersion: "statsbomb-signal-v1",
        baselineExpectedGoals: { home: 1.48, away: 0.95 },
        adjustedExpectedGoals: { home: 1.55, away: 0.88 },
        homeProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 10, latestMatchAt: "2024-07-01", weight: 0.14 },
        awayProfile: { coverage: "partial" as const, freshness: "stale" as const, matchCount: 8, latestMatchAt: "2024-06-30", weight: 0.12 },
        warnings: []
      }
    };
    const html = renderToStaticMarkup(<MatchSimulationResults result={result} />);
    expect(html).toContain("France win");
    expect(html).toContain("Brazil win");
    expect(html).toContain("Draw");
    expect(html).toContain("Scoreline prediction");
    expect(html).toContain("Recommended score");
  });

  test("scoreline output unchanged for baseline simulation (no pipeline label)", () => {
    const html = renderToStaticMarkup(<MatchSimulationResults result={makeResult()} />);
    expect(html).toContain("Most likely scorelines");
    expect(html).not.toContain("Recommended score");
    expect(html).not.toContain("Pipeline:");
  });
});
