import type { WorldCup2026SemifinalFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type SFQualifier = WorldCup2026SemifinalFoundationResponse["projectedSemifinalTeams"][number];
type SFFixture = WorldCup2026SemifinalFoundationResponse["projectedSemifinalFixtures"][number];

interface WorldCupSemifinalSimulationSectionProps {
  semifinal: WorldCup2026SemifinalFoundationResponse;
}

interface SFQualifierBadgeProps {
  qualifier: SFQualifier;
  side: "home" | "away";
}

function SFQualifierBadge({ qualifier, side }: SFQualifierBadgeProps) {
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
        QF: {formatPercent(qualifier.probabilitySnapshot.homeWinProbability)} /{" "}
        {formatPercent(qualifier.probabilitySnapshot.drawProbability)} /{" "}
        {formatPercent(qualifier.probabilitySnapshot.awayWinProbability)}
      </p>
    </div>
  );
}

interface SFFixtureCardProps {
  fixture: SFFixture;
}

function SFFixtureCard({ fixture }: SFFixtureCardProps) {
  return (
    <article
      aria-label={`Semifinal fixture ${fixture.slot}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-semibold text-slate-400">SF Slot {fixture.slot}</p>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <SFQualifierBadge qualifier={fixture.homeQualifier} side="home" />
        <p className="mt-1 text-xs font-semibold uppercase text-slate-400">vs</p>
        <SFQualifierBadge qualifier={fixture.awayQualifier} side="away" />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        From QF matches {fixture.homeQualifier.sourceSlot} &amp; {fixture.awayQualifier.sourceSlot}
      </p>
    </article>
  );
}

export function WorldCupSemifinalSimulationSection({ semifinal }: WorldCupSemifinalSimulationSectionProps) {
  return (
    <section
      id="world-cup-semifinal"
      aria-labelledby="world-cup-semifinal-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Semifinal projection"
        titleId="world-cup-semifinal-title"
        title="Projected Semifinals"
        description="Projected semifinal participants derived from quarterfinal pre-match probabilities via deterministic winner selection."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Projected from quarterfinal pre-match probabilities</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Semifinal participants are projected from quarterfinal pre-match probabilities. Real match outcomes, extra time, and penalties are not modeled yet.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {semifinal.projectedSemifinalFixtures.map((fixture) => (
          <SFFixtureCard key={fixture.fixtureId} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
