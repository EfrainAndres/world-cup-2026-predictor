import type { WorldCup2026ThirdPlaceMatchSimulationFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

interface WorldCupThirdPlaceMatchSimulationSectionProps {
  thirdPlaceMatchSimulation: WorldCup2026ThirdPlaceMatchSimulationFoundationResponse;
}

export function WorldCupThirdPlaceMatchSimulationSection({
  thirdPlaceMatchSimulation
}: WorldCupThirdPlaceMatchSimulationSectionProps) {
  const fixture = thirdPlaceMatchSimulation.fixtures[0];

  if (fixture === undefined) {
    return null;
  }

  const usesFallback =
    fixture.homeRatingSource === "fallback_seed" || fixture.awayRatingSource === "fallback_seed";

  return (
    <section
      id="world-cup-third-place-match-simulation"
      aria-labelledby="world-cup-third-place-match-simulation-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Third Place Match simulation"
        titleId="world-cup-third-place-match-simulation-title"
        title="Third Place Match simulation"
        description="Projected Third Place Match probabilities using Live Elo ratings, Elo-to-expected-goals conversion, and a Poisson score matrix."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Match probabilities only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          This phase simulates Third Place Match probabilities only. Third-place winner selection, extra time, and penalties are not modeled yet.
        </p>
      </div>

      <article className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">Third Place Match Simulation</p>
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
