import type { WorldCup2026KnockoutSimulationFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type SimulationFixture = WorldCup2026KnockoutSimulationFoundationResponse["fixtures"][number];

interface WorldCupKnockoutSimulationSectionProps {
  knockoutSimulation: WorldCup2026KnockoutSimulationFoundationResponse;
}

interface SimulationFixtureCardProps {
  fixture: SimulationFixture;
}

function SimulationFixtureCard({ fixture }: SimulationFixtureCardProps) {
  const hasFallback = fixture.homeRatingSource === "fallback_seed" || fixture.awayRatingSource === "fallback_seed";

  return (
    <article
      aria-label={`Round of 32 simulation fixture ${fixture.slot}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-400">Slot {fixture.slot}</p>
        {hasFallback ? (
          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
            Partial data
          </span>
        ) : (
          <span className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-700">
            Live Elo
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">{fixture.homeTeam}</p>
          <p className="mt-0.5 text-xs font-semibold text-teal-700">{formatPercent(fixture.homeWinProbability)}</p>
        </div>
        <p className="text-xs font-semibold uppercase text-slate-400">vs</p>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-950">{fixture.awayTeam}</p>
          <p className="mt-0.5 text-xs font-semibold text-teal-700">{formatPercent(fixture.awayWinProbability)}</p>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">Draw: {formatPercent(fixture.drawProbability)}</p>

      <ul className="mt-3 space-y-0.5">
        {fixture.mostLikelyScorelines.map((line) => (
          <li key={`${line.homeGoals}-${line.awayGoals}`} className="text-xs text-slate-500">
            {line.homeGoals}–{line.awayGoals}{" "}
            <span className="text-slate-400">({formatPercent(line.probability)})</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function WorldCupKnockoutSimulationSection({ knockoutSimulation }: WorldCupKnockoutSimulationSectionProps) {
  return (
    <section
      id="world-cup-knockout-simulation"
      aria-labelledby="world-cup-knockout-simulation-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Match simulations"
        titleId="world-cup-knockout-simulation-title"
        title="Round of 32 match simulations"
        description="Projected match probabilities for each Round of 32 fixture using Live Elo ratings and a Poisson score model."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Match probabilities only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          This phase simulates match probabilities only. Winners, penalties, and bracket advancement are not modeled yet.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {knockoutSimulation.fixtures.map((fixture) => (
          <SimulationFixtureCard key={fixture.fixtureId} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
