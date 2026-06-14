import type { WorldCup2026QuarterfinalFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type QFQualifier = WorldCup2026QuarterfinalFoundationResponse["projectedQuarterfinalTeams"][number];
type QFFixture = WorldCup2026QuarterfinalFoundationResponse["projectedQuarterfinalFixtures"][number];

interface WorldCupQuarterfinalSimulationSectionProps {
  quarterfinal: WorldCup2026QuarterfinalFoundationResponse;
}

interface QFQualifierBadgeProps {
  qualifier: QFQualifier;
  side: "home" | "away";
}

function QFQualifierBadge({ qualifier, side }: QFQualifierBadgeProps) {
  const hasFallback =
    qualifier.homeRatingSource === "fallback_seed" || qualifier.awayRatingSource === "fallback_seed";

  return (
    <div className={side === "away" ? "text-right" : ""}>
      <p className="text-sm font-semibold text-slate-950">{qualifier.team}</p>
      <p className="mt-0.5 text-xs text-slate-500">{qualifier.advancementReason}</p>
      <div className="mt-1 flex items-center gap-1.5">
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
        R16: {formatPercent(qualifier.sourceHomeWinProbability)} / {formatPercent(qualifier.sourceDrawProbability)} / {formatPercent(qualifier.sourceAwayWinProbability)}
      </p>
    </div>
  );
}

interface QFFixtureCardProps {
  fixture: QFFixture;
}

function QFFixtureCard({ fixture }: QFFixtureCardProps) {
  return (
    <article
      aria-label={`Quarterfinal fixture ${fixture.slot}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-semibold text-slate-400">QF Slot {fixture.slot}</p>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <QFQualifierBadge qualifier={fixture.homeQualifier} side="home" />
        <p className="mt-1 text-xs font-semibold uppercase text-slate-400">vs</p>
        <QFQualifierBadge qualifier={fixture.awayQualifier} side="away" />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        From R16 matches {fixture.homeQualifier.sourceSlot} &amp; {fixture.awayQualifier.sourceSlot}
      </p>
    </article>
  );
}

export function WorldCupQuarterfinalSimulationSection({ quarterfinal }: WorldCupQuarterfinalSimulationSectionProps) {
  return (
    <section
      id="world-cup-quarterfinal"
      aria-labelledby="world-cup-quarterfinal-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Quarterfinal projection"
        titleId="world-cup-quarterfinal-title"
        title="Projected Quarterfinals"
        description="Projected quarterfinal participants derived from Round of 16 match probabilities via deterministic winner selection."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Projected from pre-match probabilities</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Quarterfinal participants are projected from Round of 16 pre-match probabilities. Real match outcomes, extra time, and penalties are not modeled yet.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {quarterfinal.projectedQuarterfinalFixtures.map((fixture) => (
          <QFFixtureCard key={fixture.fixtureId} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
