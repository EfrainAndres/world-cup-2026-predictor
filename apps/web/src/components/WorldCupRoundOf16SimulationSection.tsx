import type { WorldCup2026RoundOf16FoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type R16Fixture = WorldCup2026RoundOf16FoundationResponse["projectedRoundOf16Fixtures"][number];
type ProjectedQualifier = WorldCup2026RoundOf16FoundationResponse["projectedRoundOf16Teams"][number];

interface WorldCupRoundOf16SimulationSectionProps {
  roundOf16: WorldCup2026RoundOf16FoundationResponse;
}

interface QualifierDetailProps {
  qualifier: ProjectedQualifier;
  side: "home" | "away";
}

function QualifierDetail({ qualifier, side }: QualifierDetailProps) {
  const hasFallback = qualifier.homeRatingSource === "fallback_seed" || qualifier.awayRatingSource === "fallback_seed";
  const winProbability = side === "home" ? qualifier.sourceHomeWinProbability : qualifier.sourceAwayWinProbability;

  return (
    <div className={side === "away" ? "text-right" : undefined}>
      <p className="text-sm font-semibold text-slate-950">{qualifier.team}</p>
      <p className="mt-0.5 text-xs font-semibold text-teal-700">{formatPercent(winProbability)}</p>
      <p className="mt-0.5 text-xs text-slate-400">{qualifier.sourceHomeTeam} vs {qualifier.sourceAwayTeam}</p>
      {hasFallback ? (
        <span className="mt-1 inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
          Partial data
        </span>
      ) : (
        <span className="mt-1 inline-block rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-700">
          Live Elo
        </span>
      )}
    </div>
  );
}

interface R16FixtureCardProps {
  fixture: R16Fixture;
}

function R16FixtureCard({ fixture }: R16FixtureCardProps) {
  return (
    <article
      aria-label={`Round of 16 projected fixture ${fixture.slot}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-semibold text-slate-400">R16 Slot {fixture.slot}</p>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <QualifierDetail qualifier={fixture.homeQualifier} side="home" />
        <p className="mt-1 text-xs font-semibold uppercase text-slate-400">vs</p>
        <QualifierDetail qualifier={fixture.awayQualifier} side="away" />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs text-slate-500">
          <span className="font-semibold">{fixture.homeTeam}:</span> {fixture.homeQualifier.advancementReason}
        </p>
        <p className="text-xs text-slate-500">
          <span className="font-semibold">{fixture.awayTeam}:</span> {fixture.awayQualifier.advancementReason}
        </p>
      </div>
    </article>
  );
}

export function WorldCupRoundOf16SimulationSection({ roundOf16 }: WorldCupRoundOf16SimulationSectionProps) {
  return (
    <section
      id="world-cup-round-of-16"
      aria-labelledby="world-cup-round-of-16-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Projected advancement"
        titleId="world-cup-round-of-16-title"
        title="Projected Round of 16"
        description="Projected Round of 16 participants derived from Round of 32 match probabilities using deterministic winner selection."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Projected from pre-match probabilities</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Round of 16 participants are projected from pre-match probabilities. Real match outcomes are not yet simulated.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roundOf16.projectedRoundOf16Fixtures.map((fixture) => (
          <R16FixtureCard key={fixture.fixtureId} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
