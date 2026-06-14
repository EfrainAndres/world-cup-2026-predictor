import type { WorldCup2026FinalFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type FinalQualifier = WorldCup2026FinalFoundationResponse["projectedFinalists"][number];
type FinalFixture = WorldCup2026FinalFoundationResponse["projectedFinalFixtures"][number];

interface WorldCupFinalSimulationSectionProps {
  finalFoundation: WorldCup2026FinalFoundationResponse;
}

interface FinalQualifierBadgeProps {
  qualifier: FinalQualifier;
  side: "home" | "away";
}

function FinalQualifierBadge({ qualifier, side }: FinalQualifierBadgeProps) {
  const hasFallback =
    qualifier.homeRatingSource === "fallback_seed" || qualifier.awayRatingSource === "fallback_seed";

  return (
    <div className={side === "away" ? "text-right" : ""}>
      <p className="text-sm font-semibold text-slate-950">{qualifier.team}</p>
      <p className="mt-0.5 text-xs text-slate-500">{qualifier.advancementReason}</p>
      <div className={`mt-1 flex items-center gap-1.5 ${side === "away" ? "justify-end" : ""}`}>
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
      <p className="mt-1 text-xs text-slate-400">
        SF: {formatPercent(qualifier.probabilitySnapshot.homeWinProbability)} /{" "}
        {formatPercent(qualifier.probabilitySnapshot.drawProbability)} /{" "}
        {formatPercent(qualifier.probabilitySnapshot.awayWinProbability)}
      </p>
    </div>
  );
}

interface FinalFixtureCardProps {
  fixture: FinalFixture;
}

function FinalFixtureCard({ fixture }: FinalFixtureCardProps) {
  return (
    <article
      aria-label="Final fixture 1"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-semibold text-slate-400">Final Slot 1</p>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <FinalQualifierBadge qualifier={fixture.homeQualifier} side="home" />
        <p className="mt-1 text-xs font-semibold uppercase text-slate-400">vs</p>
        <FinalQualifierBadge qualifier={fixture.awayQualifier} side="away" />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        From SF matches {fixture.homeQualifier.sourceSlot} &amp; {fixture.awayQualifier.sourceSlot}
      </p>
    </article>
  );
}

export function WorldCupFinalSimulationSection({ finalFoundation }: WorldCupFinalSimulationSectionProps) {
  return (
    <section
      id="world-cup-final"
      aria-labelledby="world-cup-final-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Final projection"
        titleId="world-cup-final-title"
        title="Projected Final"
        description="Projected Final participants derived from semifinal pre-match probabilities via deterministic winner selection."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Final participants only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          This section projects Final participants only. The Final match has not yet been simulated.
        </p>
      </div>

      <div className="mt-6">
        <FinalFixtureCard fixture={finalFoundation.projectedFinalFixtures[0]} />
      </div>
    </section>
  );
}
