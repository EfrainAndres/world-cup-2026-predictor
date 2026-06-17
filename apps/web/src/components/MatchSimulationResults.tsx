"use client";

import type { SimulateMatchSuccessResponse } from "@world-cup-2026-predictor/api";
import type { PredictMatchFromLiveEloSuccessResponse } from "../lib/api-client";
import { formatElo, formatPercent } from "../lib/api-client";
import { StatusPill } from "./StatusPill";

interface MatchSimulationResultsProps {
  result: SimulateMatchSuccessResponse | PredictMatchFromLiveEloSuccessResponse;
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

export function MatchSimulationResults({ result }: MatchSimulationResultsProps) {
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

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {probabilityCards.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{formatPercent(item.value)}</p>
          </article>
        ))}
      </div>

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

      {result.monteCarloSimulation ? (
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Optional Monte Carlo run: {result.monteCarloSimulation.simulationCount} seeded simulations.
        </p>
      ) : null}

      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
        {isLiveEloPrediction
          ? "Live Elo is based on partial curated data and is not a public accuracy claim."
          : "Baseline simulation, not a guarantee."}
      </p>
    </section>
  );
}
