import {
  WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
  WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES,
  calculateWorldCup2026TournamentForm
} from "./tournament-form.js";
import type {
  PredictMatchFromLiveEloSuccessResponse,
  WorldCup2026ExternalFixtureRecord
} from "./schemas.js";

export interface ResolveTournamentFormPredictionAdjustmentInput {
  homeTeam: string;
  awayTeam: string;
  baselineRatingsForForm: ReadonlyMap<string, number>;
  effectiveRatingsBeforeTournamentForm: ReadonlyMap<string, number>;
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  cutoffAt?: string;
  referenceAt?: string;
}

type TournamentFormAdjustmentResponse =
  NonNullable<PredictMatchFromLiveEloSuccessResponse["tournamentFormAdjustment"]>;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function resolveTournamentFormPredictionAdjustment(
  input: ResolveTournamentFormPredictionAdjustmentInput
): TournamentFormAdjustmentResponse {
  const form = calculateWorldCup2026TournamentForm({
    completedResults: input.completedResults,
    baselineRatings: input.baselineRatingsForForm,
    ...(input.cutoffAt === undefined ? {} : { cutoffAt: input.cutoffAt }),
    ...(input.referenceAt === undefined ? {} : { referenceAt: input.referenceAt })
  });

  const homeSummary = form.summaries.find((summary) => summary.team === input.homeTeam);
  const awaySummary = form.summaries.find((summary) => summary.team === input.awayTeam);
  const homeBaselineElo = input.effectiveRatingsBeforeTournamentForm.get(input.homeTeam) ?? 1500;
  const awayBaselineElo = input.effectiveRatingsBeforeTournamentForm.get(input.awayTeam) ?? 1500;
  const homeAdjustment = homeSummary?.eloAdjustmentRecommendation ?? 0;
  const awayAdjustment = awaySummary?.eloAdjustmentRecommendation ?? 0;
  const homeMatchesIncluded = homeSummary?.matchesPlayed ?? 0;
  const awayMatchesIncluded = awaySummary?.matchesPlayed ?? 0;
  const warnings: string[] = [
    "Tournament form is an optional bounded secondary Elo adjustment and is not empirically calibrated."
  ];

  if (form.issues.some((issue) => issue.code === "cutoff_excluded")) {
    warnings.push("Tournament form excluded completed matches at or after the supplied cutoff.");
  }

  if (homeSummary === undefined) {
    warnings.push(`${input.homeTeam} has no eligible tournament-form summary.`);
  } else if (homeSummary.matchesPlayed < WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES) {
    warnings.push(
      `${input.homeTeam} has only ${homeSummary.matchesPlayed} eligible completed tournament match${
        homeSummary.matchesPlayed === 1 ? "" : "es"
      }; at least ${WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES} are required for a non-zero adjustment.`
    );
  }

  if (awaySummary === undefined) {
    warnings.push(`${input.awayTeam} has no eligible tournament-form summary.`);
  } else if (awaySummary.matchesPlayed < WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES) {
    warnings.push(
      `${input.awayTeam} has only ${awaySummary.matchesPlayed} eligible completed tournament match${
        awaySummary.matchesPlayed === 1 ? "" : "es"
      }; at least ${WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES} are required for a non-zero adjustment.`
    );
  }

  const applied =
    (homeSummary !== undefined &&
      homeSummary.matchesPlayed >= WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES) ||
    (awaySummary !== undefined &&
      awaySummary.matchesPlayed >= WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES);

  return {
    enabled: true,
    applied,
    ...(input.cutoffAt === undefined ? {} : { cutoffAt: input.cutoffAt }),
    home: {
      baselineElo: round1(homeBaselineElo),
      adjustment: round1(homeAdjustment),
      effectiveElo: round1(homeBaselineElo + homeAdjustment),
      matchesIncluded: homeMatchesIncluded,
      ...(homeSummary === undefined ? {} : { formScore: homeSummary.formScore })
    },
    away: {
      baselineElo: round1(awayBaselineElo),
      adjustment: round1(awayAdjustment),
      effectiveElo: round1(awayBaselineElo + awayAdjustment),
      matchesIncluded: awayMatchesIncluded,
      ...(awaySummary === undefined ? {} : { formScore: awaySummary.formScore })
    },
    formulaVersion: WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
    warnings
  };
}
