"use client";

import React from "react";
import type { ScorelinePresentation, SimulateMatchSuccessResponse } from "@world-cup-2026-predictor/api";
import type { PredictMatchFromLiveEloSuccessResponse, WorldCup2026MatchContext } from "../lib/api-client";
import { formatElo, formatPercent } from "../lib/api-client";
import { getTournamentFormDisplayState } from "../lib/tournament-form-helpers";
import { StatusPill } from "./StatusPill";
import { MatchContextDisplay } from "./MatchContextDisplay";
import { TechnicalDisclosure } from "./TechnicalDisclosure";

interface MatchSimulationResultsProps {
  result: SimulateMatchSuccessResponse | PredictMatchFromLiveEloSuccessResponse;
  matchContext?: WorldCup2026MatchContext;
}

function formatConfidenceLevel(level: PredictMatchFromLiveEloSuccessResponse["predictionConfidence"]["level"]): string {
  switch (level) {
    case "very_low":
      return "Very Low";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
  }
}

function formatCoverageType(coverageType: PredictMatchFromLiveEloSuccessResponse["predictionConfidence"]["coverageType"]): string {
  switch (coverageType) {
    case "fallback_only":
      return "Fallback only";
    case "fallback":
      return "Partial with fallback";
    case "partial":
      return "Partial";
    case "full":
      return "Full";
  }
}

function formatStatsBombLabel(value: string | undefined): string {
  if (value === undefined) return "Unavailable";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatStatsBombDate(value: string | undefined): string {
  if (value === undefined) return "Unavailable";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(timestamp));
}

function formatStatsBombReason(reason: string): string {
  switch (reason) {
    case "disabled":
      return "Disabled";
    case "applied":
      return "Applied";
    case "source_unavailable":
      return "Source unavailable";
    case "home_profile_missing":
      return "Home profile missing";
    case "away_profile_missing":
      return "Away profile missing";
    case "both_profiles_missing":
      return "Profiles missing";
    case "invalid_profile":
      return "Invalid profile";
    case "stale_profile":
      return "Stale profile";
    default:
      return formatStatsBombLabel(reason);
  }
}

function formatAttackDefenseReason(reason: string): string {
  switch (reason) {
    case "disabled": return "Disabled";
    case "applied": return "Applied";
    case "shadow": return "Shadow only — Elo V2 remains authoritative";
    case "not_authoritative": return "Not yet authoritative";
    case "source_unavailable": return "Runtime profile artifact unavailable";
    case "artifact_unavailable": return "Runtime profile artifact unavailable";
    case "artifact_mismatch": return "Runtime profile artifact mismatch";
    case "home_profile_missing": return "Home profile is unavailable";
    case "away_profile_missing": return "Away profile is unavailable";
    case "home_profile_sparse": return "Home profile coverage is sparse";
    case "away_profile_sparse": return "Away profile coverage is sparse";
    case "home_profile_fallback": return "Home profile uses fallback data";
    case "away_profile_fallback": return "Away profile uses fallback data";
    case "insufficient_home_sample": return "Home profile sample is insufficient";
    case "insufficient_away_sample": return "Away profile sample is insufficient";
    case "invalid_home_profile": return "Home profile is invalid";
    case "invalid_away_profile": return "Away profile is invalid";
    default:
      return reason.charAt(0).toUpperCase() + reason.slice(1).replaceAll("_", " ");
  }
}

function formatRecommendedScoreReason(
  reason: ScorelinePresentation["recommendationReason"],
  homeTeam: string,
  awayTeam: string,
  recommendedOutcome: ScorelinePresentation["recommendedOutcome"]
): string {
  switch (reason) {
    case "modal_matches_most_likely_outcome":
      return "The most likely scoreline also belongs to the most likely match outcome.";
    case "selected_top_scoreline_for_most_likely_outcome": {
      const outcomeLabel =
        recommendedOutcome === "home_win" ? `${homeTeam} win` :
        recommendedOutcome === "away_win" ? `${awayTeam} win` : "draw";
      return `The modal score is in a different outcome. This is the most probable scoreline within the most likely outcome (${outcomeLabel}).`;
    }
    case "outcome_probabilities_near_tied":
      return "The outcome probabilities are closely matched. Shown as the modal exact score.";
    case "draw_is_most_likely_outcome":
      return "A draw is the most likely outcome. Recommended scoreline is the most probable draw.";
    case "fallback_to_modal":
      return "No scorelines found within the most likely outcome. Showing modal as fallback.";
  }
}

function formatOutcomeLabel(outcome: ScorelinePresentation["recommendedOutcome"], homeTeam: string, awayTeam: string): string {
  switch (outcome) {
    case "home_win": return `${homeTeam} win`;
    case "draw": return "Draw";
    case "away_win": return `${awayTeam} win`;
  }
}

function ScorelinePresentationSection({
  presentation,
  homeTeam,
  awayTeam
}: {
  presentation: ScorelinePresentation;
  homeTeam: string;
  awayTeam: string;
}) {
  const { modalExactScore, recommendedScore, topScorelines, recommendedOutcome, recommendationReason, diversitySummary } = presentation;
  const recommendedIsModal = diversitySummary.recommendedIsModal;
  const reasonText = formatRecommendedScoreReason(recommendationReason, homeTeam, awayTeam, recommendedOutcome);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-950">Scoreline prediction</h4>
        <span className="text-xs text-slate-500">
          Most likely outcome: <span className="font-medium text-slate-700">{formatOutcomeLabel(recommendedOutcome, homeTeam, awayTeam)}</span>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Recommended score</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
            {recommendedScore.homeGoals}–{recommendedScore.awayGoals}
          </p>
          <p className="mt-1 text-sm tabular-nums text-indigo-700">
            {formatPercent(recommendedScore.probability)}
          </p>
        </div>

        {!recommendedIsModal ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modal exact score</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
              {modalExactScore.homeGoals}–{modalExactScore.awayGoals}
            </p>
            <p className="mt-1 text-sm tabular-nums text-slate-600">
              {formatPercent(modalExactScore.probability)}
            </p>
          </div>
        ) : (
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Recommended score equals modal exact score.</p>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-600">{reasonText}</p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-slate-500">Top {topScorelines.length} scorelines</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {topScorelines.map((s) => {
            const isRecommended = s.homeGoals === recommendedScore.homeGoals && s.awayGoals === recommendedScore.awayGoals;
            const isModal = !recommendedIsModal && s.homeGoals === modalExactScore.homeGoals && s.awayGoals === modalExactScore.awayGoals;
            return (
              <li
                key={`${s.homeGoals}-${s.awayGoals}`}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  isRecommended
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-950">
                    {s.homeGoals}–{s.awayGoals}
                  </span>
                  {isRecommended ? (
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">rec.</span>
                  ) : isModal ? (
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">modal</span>
                  ) : null}
                </span>
                <span className="tabular-nums text-slate-600">{formatPercent(s.probability)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Top 5 cumulative: {formatPercent(diversitySummary.top5CumulativeProbability)}
        {" · "}
        {presentation.topScorelines.length >= 2
          ? `Top-2 gap: ${formatPercent(diversitySummary.top1To2Gap)}`
          : null}
      </p>
    </div>
  );
}

function AttackDefenseGoalModelSection({ result }: { result: PredictMatchFromLiveEloSuccessResponse }) {
  const adMeta = result.attackDefenseGoalModel;
  if (adMeta === undefined) return null;

  const { mode, applied, reason, candidateId, activationDecision, baselineExpectedGoals, effectiveExpectedGoals, shadowExpectedGoals, homeProfile, awayProfile, warnings } = adMeta;

  const isShadow = mode === "shadow";
  const isAuthoritative = mode === "on" && applied;

  let sectionTitle: string;
  let badgeLabel: string;
  let badgeStyle: string;

  if (isAuthoritative) {
    sectionTitle = "Attack/Defense enriched";
    badgeLabel = "Attack/Defense enriched";
    badgeStyle = "bg-emerald-100 text-emerald-800";
  } else if (isShadow) {
    sectionTitle = "Shadow comparison";
    badgeLabel = "Shadow comparison";
    badgeStyle = "bg-amber-100 text-amber-800";
  } else {
    sectionTitle = "Baseline Elo V2";
    badgeLabel = "Baseline model";
    badgeStyle = "bg-slate-200 text-slate-800";
  }

  const candidateXg = isShadow ? (shadowExpectedGoals ?? null) : (isAuthoritative ? effectiveExpectedGoals : null);
  const shadowDeltaHome = isShadow && shadowExpectedGoals !== undefined ? shadowExpectedGoals.home - baselineExpectedGoals.home : null;
  const shadowDeltaAway = isShadow && shadowExpectedGoals !== undefined ? shadowExpectedGoals.away - baselineExpectedGoals.away : null;
  const appliedDeltaHome = isAuthoritative ? effectiveExpectedGoals.home - baselineExpectedGoals.home : null;
  const appliedDeltaAway = isAuthoritative ? effectiveExpectedGoals.away - baselineExpectedGoals.away : null;
  const deltaHome = isShadow ? shadowDeltaHome : appliedDeltaHome;
  const deltaAway = isShadow ? shadowDeltaAway : appliedDeltaAway;

  const formattedReason = formatAttackDefenseReason(reason);
  const appliedDisplay = isAuthoritative ? "Yes" : isShadow ? "Yes, shadow calculation only" : "No";
  const artifactCutoff = homeProfile?.cutoffAt ?? awayProfile?.cutoffAt ?? null;

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">Attack/Defense model</h4>
          <p className="mt-1 text-sm text-slate-700">{sectionTitle}</p>
        </div>
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}
        >
          {badgeLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Mode</dt>
          <dd className="mt-1 text-slate-950">{mode === "off" ? "Off" : mode === "shadow" ? "Shadow" : "On"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Applied</dt>
          <dd className="mt-1 text-slate-950">{appliedDisplay}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Authoritative</dt>
          <dd className="mt-1 text-slate-950">{isAuthoritative ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Reason</dt>
          <dd className="mt-1 text-slate-950">{formattedReason}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-600">
        {isShadow
          ? "Shadow mode computed a comparison only; the displayed prediction remains Elo V2 baseline."
          : isAuthoritative
            ? "Attack/Defense profile data replaced the Elo V2 baseline xG before scoreline probabilities."
            : `Attack/Defense did not affect this prediction: ${formattedReason}.`}
      </p>

      <TechnicalDisclosure summary="Attack/Defense technical details" className="mt-3">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">Baseline xG</dt>
            <dd className="tabular-nums">
              {baselineExpectedGoals.home.toFixed(2)} / {baselineExpectedGoals.away.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">
              {isShadow ? "Shadow xG" : "Candidate xG"}
            </dt>
            <dd className="tabular-nums">
              {candidateXg !== null
                ? `${candidateXg.home.toFixed(2)} / ${candidateXg.away.toFixed(2)}`
                : "Not available"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Authoritative xG</dt>
            <dd className="tabular-nums">
              {effectiveExpectedGoals.home.toFixed(2)} / {effectiveExpectedGoals.away.toFixed(2)}
            </dd>
          </div>
          {deltaHome !== null && deltaAway !== null ? (
            <div>
              <dt className="font-semibold text-slate-500">xG delta</dt>
              <dd className="tabular-nums">
                {deltaHome >= 0 ? "+" : ""}{deltaHome.toFixed(2)} / {deltaAway >= 0 ? "+" : ""}{deltaAway.toFixed(2)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-slate-500">Home coverage</dt>
            <dd>{homeProfile !== null ? homeProfile.coverage : "Not available"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Away coverage</dt>
            <dd>{awayProfile !== null ? awayProfile.coverage : "Not available"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Home sample size</dt>
            <dd className="tabular-nums">{homeProfile !== null ? homeProfile.matchCount : "Not available"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Away sample size</dt>
            <dd className="tabular-nums">{awayProfile !== null ? awayProfile.matchCount : "Not available"}</dd>
          </div>
          {artifactCutoff !== null ? (
            <div>
              <dt className="font-semibold text-slate-500">Artifact cutoff</dt>
              <dd>{artifactCutoff}</dd>
            </div>
          ) : null}
          {activationDecision !== undefined ? (
            <div>
              <dt className="font-semibold text-slate-500">Activation</dt>
              <dd>{activationDecision.replaceAll("_", " ")}</dd>
            </div>
          ) : null}
          {candidateId !== undefined ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-slate-500">Candidate ID</dt>
              <dd className="break-all font-mono text-xs">{candidateId}</dd>
            </div>
          ) : null}
        </dl>
        {warnings.length > 0 ? (
          <ul className="mt-2 space-y-1 text-amber-800">
            {warnings.map((w) => (
              <li key={w}>- {w}</li>
            ))}
          </ul>
        ) : null}
      </TechnicalDisclosure>
    </div>
  );
}

function StatsBombSignalSection({ result }: { result: PredictMatchFromLiveEloSuccessResponse }) {
  const signal = result.statsBombSignal;
  if (signal === undefined) return null;

  const enriched = signal.applied && signal.authoritative === "statsbomb";
  const shadow = signal.rolloutMode === "shadow";
  const homeCoverage = formatStatsBombLabel(signal.homeProfile?.coverage);
  const awayCoverage = formatStatsBombLabel(signal.awayProfile?.coverage);
  const homeFreshness = formatStatsBombLabel(signal.homeProfile?.freshness);
  const awayFreshness = formatStatsBombLabel(signal.awayProfile?.freshness);
  const signalWeight = Math.max(signal.homeProfile?.weight ?? 0, signal.awayProfile?.weight ?? 0);

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">Model signal</h4>
          <p className="mt-1 text-sm text-slate-700">
            Model: {enriched ? "Elo V2 + StatsBomb" : "Elo V2 baseline"}
          </p>
        </div>
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-semibold ${
            enriched ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"
          }`}
        >
          {enriched ? "StatsBomb enriched" : "Baseline model"}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Coverage</dt>
          <dd className="mt-1 text-slate-950">
            {homeCoverage} / {awayCoverage}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Freshness</dt>
          <dd className="mt-1 text-slate-950">
            {homeFreshness} / {awayFreshness}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Signal weight</dt>
          <dd className="mt-1 tabular-nums text-slate-950">{signalWeight.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Data cutoff</dt>
          <dd className="mt-1 text-slate-950">{formatStatsBombDate(signal.artifactCutoffAt ?? signal.cutoffAt)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-600">
        {shadow
          ? "Shadow mode computed a comparison only; the current authoritative prediction remains unchanged."
          : enriched
            ? "StatsBomb profile data adjusted the xG before scoreline probabilities."
            : `StatsBomb did not affect this prediction: ${formatStatsBombReason(signal.reason)}.`}
      </p>

      <details className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
        <summary className="min-h-10 cursor-pointer list-none py-1 font-semibold text-slate-800">
          StatsBomb technical details
        </summary>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">Stage input xG</dt>
            <dd className="tabular-nums">
              {signal.baselineExpectedGoals.home.toFixed(2)} / {signal.baselineExpectedGoals.away.toFixed(2)}
            </dd>
          </div>
          {signal.originalEloExpectedGoals !== undefined ? (
            <div>
              <dt className="font-semibold text-slate-500">Original Elo xG</dt>
              <dd className="tabular-nums">
                {signal.originalEloExpectedGoals.home.toFixed(2)} / {signal.originalEloExpectedGoals.away.toFixed(2)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-slate-500">Authoritative xG</dt>
            <dd className="tabular-nums">
              {signal.adjustedExpectedGoals.home.toFixed(2)} / {signal.adjustedExpectedGoals.away.toFixed(2)}
            </dd>
          </div>
          {signal.shadowAdjustedExpectedGoals !== undefined ? (
            <div>
              <dt className="font-semibold text-slate-500">Shadow adjusted xG</dt>
              <dd className="tabular-nums">
                {signal.shadowAdjustedExpectedGoals.home.toFixed(2)} / {signal.shadowAdjustedExpectedGoals.away.toFixed(2)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-slate-500">Provider</dt>
            <dd>{signal.provider}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Signal version</dt>
            <dd>{signal.signalVersion}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Reason</dt>
            <dd>{formatStatsBombReason(signal.reason)}</dd>
          </div>
        </dl>
        {signal.warnings.length > 0 ? (
          <ul className="mt-2 space-y-1 text-amber-800">
            {signal.warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        ) : null}
      </details>
    </div>
  );
}

function TournamentFormAdjustmentSection({ result }: { result: PredictMatchFromLiveEloSuccessResponse }) {
  const displayState = getTournamentFormDisplayState(result.tournamentFormAdjustment);

  if (displayState.status === "disabled") {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-950">Tournament form</h4>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            displayState.status === "applied"
              ? "bg-slate-200 text-slate-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {displayState.status === "applied" ? "Applied" : "Not applied"}
        </span>
      </div>

      {displayState.status === "applied" ? (
        <>
          <p className="mt-1 text-xs text-slate-600">
            Secondary Elo adjustment from completed World Cup 2026 matches.
          </p>

          {displayState.adj.formulaVersion !== undefined ? (
            <p className="mt-1 text-xs text-slate-500">Formula: {displayState.adj.formulaVersion}</p>
          ) : null}

          {displayState.adj.cutoffAt !== undefined ? (
            <p className="mt-1 text-xs text-slate-500">Cutoff: {displayState.adj.cutoffAt}</p>
          ) : null}

          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                { label: result.liveElo.homeTeam, side: displayState.adj.home },
                { label: result.liveElo.awayTeam, side: displayState.adj.away }
              ] as const
            ).map(({ label, side }) => (
              <div key={label} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-500">Baseline Elo</dt>
                  <dd className="tabular-nums text-slate-950">{formatElo(side.baselineElo)}</dd>
                  <dt className="text-slate-500">Adjustment</dt>
                  <dd className="tabular-nums text-slate-950">
                    {side.adjustment >= 0 ? "+" : ""}
                    {side.adjustment.toFixed(1)}
                  </dd>
                  <dt className="text-slate-500">Effective Elo</dt>
                  <dd className="tabular-nums font-semibold text-slate-950">{formatElo(side.effectiveElo)}</dd>
                  <dt className="text-slate-500">Matches</dt>
                  <dd className="tabular-nums text-slate-950">{side.matchesIncluded}</dd>
                  {side.formScore !== undefined ? (
                    <>
                      <dt className="text-slate-500">Form score</dt>
                      <dd className="tabular-nums text-slate-950">{side.formScore.toFixed(1)}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            ))}
          </dl>

          {displayState.adj.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-amber-800">
              {displayState.adj.warnings.map((w) => (
                <li key={w}>- {w}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-600">
            Not enough completed tournament matches yet to apply a secondary Elo adjustment.
          </p>
          {displayState.warnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {displayState.warnings.map((w) => (
                <li key={w}>- {w}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Tournament form is an optional secondary signal, not a separate prediction model. It does not automatically increase confidence.
      </p>
    </div>
  );
}

export function MatchSimulationResults({ result, matchContext }: MatchSimulationResultsProps) {
  const isLiveEloPrediction = "liveElo" in result;
  const probabilityCards = [
    {
      label: `${result.request.homeTeam} win`,
      value: result.outcomeProbabilities.homeWinProbability
    },
    {
      label: "Draw",
      value: result.outcomeProbabilities.drawProbability
    },
    {
      label: `${result.request.awayTeam} win`,
      value: result.outcomeProbabilities.awayWinProbability
    }
  ];

  return (
    <section aria-labelledby="match-simulation-results-title" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Simulation results</p>
          <h3 id="match-simulation-results-title" className="mt-1 text-xl font-semibold text-slate-950">
            {result.request.homeTeam} vs {result.request.awayTeam}
          </h3>
        </div>
        <StatusPill label={isLiveEloPrediction ? "Live Elo auto prediction" : "Baseline simulation"} tone="warning" />
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Expected home goals</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{result.request.expectedHomeGoals.toFixed(2)}</dd>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Expected away goals</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{result.request.expectedAwayGoals.toFixed(2)}</dd>
        </div>
      </dl>

      {isLiveEloPrediction ? (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-3 py-3 text-sm leading-6 text-teal-950">
          <p>
            Live Elo: {result.liveElo.homeTeam}{" "}
            {result.liveElo.homeRatingSource !== "fallback_seed" ? `rank ${result.liveElo.homeRank} ` : null}
            ({formatElo(result.liveElo.homeEloRating)}) vs{" "}
            {result.liveElo.awayTeam}{" "}
            {result.liveElo.awayRatingSource !== "fallback_seed" ? `rank ${result.liveElo.awayRank} ` : null}
            ({formatElo(result.liveElo.awayEloRating)}). Elo difference:{" "}
            {result.expectedGoals.eloDifference.toFixed(2)}.
          </p>
          {(result.liveElo.homeRatingSource === "fallback_seed" || result.liveElo.awayRatingSource === "fallback_seed") ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              Fallback seed rating — not in the Live Elo dataset. Prediction is illustrative only.
            </p>
          ) : null}
          <p className="mt-1 text-xs text-teal-800">
            <span className="font-semibold capitalize">{result.expectedGoals.preset}</span> preset —{" "}
            {result.expectedGoals.presetDescription}
          </p>
        </div>
      ) : null}

      {isLiveEloPrediction ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-950">Prediction confidence</h4>
              <p className="mt-1 text-sm text-slate-700">
                {formatConfidenceLevel(result.predictionConfidence.level)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data coverage</p>
              <p className="mt-1 text-sm text-slate-700">
                {formatCoverageType(result.predictionConfidence.coverageType)}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <dt className="text-xs text-slate-500">Latest match date</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {result.predictionConfidence.dataPoints.latestMatchDate ?? "Unavailable"}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <dt className="text-xs text-slate-500">Historical matches processed</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {result.predictionConfidence.dataPoints.historicalMatchesAvailable}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <dt className="text-xs text-slate-500">Fallback status</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {result.predictionConfidence.dataPoints.homeUsesFallback || result.predictionConfidence.dataPoints.awayUsesFallback
                  ? "Fallback used"
                  : "No fallback used"}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <dt className="text-xs text-slate-500">World Cup 2026 matches included</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {result.predictionConfidence.dataPoints.currentTournamentMatchesIncluded ?? "Unavailable"}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {result.predictionConfidence.reasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          </div>

          {result.predictionConfidence.manualXgRecommended ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              Manual xG review recommended.
            </p>
          ) : null}
        </div>
      ) : null}

      {isLiveEloPrediction ? <TournamentFormAdjustmentSection result={result} /> : null}
      {isLiveEloPrediction ? <AttackDefenseGoalModelSection result={result} /> : null}
      {isLiveEloPrediction ? <StatsBombSignalSection result={result} /> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {probabilityCards.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{formatPercent(item.value)}</p>
          </article>
        ))}
      </div>

      {isLiveEloPrediction && result.scorelinePresentation !== undefined ? (
        <ScorelinePresentationSection
          presentation={result.scorelinePresentation}
          homeTeam={result.request.homeTeam}
          awayTeam={result.request.awayTeam}
        />
      ) : (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-950">Most likely scorelines</h4>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.mostLikelyScorelines.map((scoreline) => (
              <li
                key={`${scoreline.homeGoals}-${scoreline.awayGoals}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-950">
                  {scoreline.homeGoals}-{scoreline.awayGoals}
                </span>
                <span className="tabular-nums text-slate-600">{formatPercent(scoreline.probability)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.monteCarloSimulation ? (
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Optional Monte Carlo run: {result.monteCarloSimulation.simulationCount} seeded simulations.
        </p>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Match context — not used as a model input
        </p>
        {matchContext !== undefined ? (
          <MatchContextDisplay context={matchContext} />
        ) : (
          <p className="mt-1 text-xs text-slate-500">Match context is not available for this prediction.</p>
        )}
      </div>

      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
        {isLiveEloPrediction
          ? "Live Elo is based on partial curated data and is not a public accuracy claim."
          : "Baseline simulation, not a guarantee."}
      </p>
    </section>
  );
}
