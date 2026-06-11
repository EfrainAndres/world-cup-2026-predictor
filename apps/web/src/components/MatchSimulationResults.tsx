"use client";

import type { SimulateMatchSuccessResponse } from "@world-cup-2026-predictor/api";
import { formatPercent } from "../lib/api-client";
import { StatusPill } from "./StatusPill";

interface MatchSimulationResultsProps {
  result: SimulateMatchSuccessResponse;
}

export function MatchSimulationResults({ result }: MatchSimulationResultsProps) {
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
        <StatusPill label="Baseline simulation" tone="warning" />
      </div>

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
        Baseline simulation, not a guarantee.
      </p>
    </section>
  );
}
