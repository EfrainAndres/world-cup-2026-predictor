import type { WorldCup2026FinalMatchSimulationFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

interface WorldCupFinalMatchSimulationSectionProps {
  finalMatchSimulation: WorldCup2026FinalMatchSimulationFoundationResponse;
}

export function WorldCupFinalMatchSimulationSection({
  finalMatchSimulation
}: WorldCupFinalMatchSimulationSectionProps) {
  const fixture = finalMatchSimulation.fixtures[0];

  if (fixture === undefined) {
    return null;
  }

  const usesFallback =
    fixture.homeRatingSource === "fallback_seed" || fixture.awayRatingSource === "fallback_seed";

  return (
    <section
      id="world-cup-final-match-simulation"
      aria-labelledby="world-cup-final-match-simulation-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Final match simulation"
        titleId="world-cup-final-match-simulation-title"
        title="Final match simulation"
        description="Projected Final match probabilities using Live Elo ratings, Elo-to-expected-goals conversion, and a Poisson score matrix."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Match probabilities only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          This phase simulates the Final match probabilities only. Champion selection, extra time, and penalties are not modeled yet.
        </p>
      </div>

      <article className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">Final Sim Slot {fixture.slot}</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              {fixture.homeTeam} vs {fixture.awayTeam}
            </h3>
          </div>
          <span
            className={
              usesFallback
                ? "rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                : "rounded border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700"
            }
          >
            {usesFallback ? "Partial data" : "Live Elo"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{fixture.homeTeam}</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatPercent(fixture.homeWinProbability)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Draw</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatPercent(fixture.drawProbability)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{fixture.awayTeam}</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatPercent(fixture.awayWinProbability)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Expected goals</p>
            <p className="mt-1 text-sm text-slate-700">
              {fixture.homeTeam}: {fixture.homeExpectedGoals.toFixed(2)}
            </p>
            <p className="text-sm text-slate-700">
              {fixture.awayTeam}: {fixture.awayExpectedGoals.toFixed(2)}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Top scorelines</p>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              {fixture.mostLikelyScorelines.map((scoreline) => (
                <li key={`${scoreline.homeGoals}-${scoreline.awayGoals}`}>
                  {fixture.homeTeam} {scoreline.homeGoals}-{scoreline.awayGoals} {fixture.awayTeam}:{" "}
                  {formatPercent(scoreline.probability)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>
    </section>
  );
}
