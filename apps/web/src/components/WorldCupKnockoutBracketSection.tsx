import type { WorldCup2026KnockoutBracketFoundationResponse } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type KnockoutFixture = WorldCup2026KnockoutBracketFoundationResponse["roundOf32"][number];

interface WorldCupKnockoutBracketSectionProps {
  knockoutBracket: WorldCup2026KnockoutBracketFoundationResponse;
}

function formatRoundLabel(round: KnockoutFixture["round"]): string {
  if (round === "round_of_32") return "Round of 32";
  if (round === "round_of_16") return "Round of 16";
  if (round === "quarterfinals") return "Quarterfinals";
  if (round === "semifinals") return "Semifinals";
  if (round === "third_place") return "Third Place";
  return "Final";
}

interface RoundBlockProps {
  label: string;
  fixtures: readonly KnockoutFixture[];
  isPlaceholder: boolean;
}

function RoundBlock({ label, fixtures, isPlaceholder }: RoundBlockProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {fixtures.map((fixture) => (
          <article
            key={fixture.fixtureId}
            aria-label={`${formatRoundLabel(fixture.round)} fixture ${fixture.slot}`}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-400">Slot {fixture.slot}</p>
              {isPlaceholder ? (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                  Placeholder
                </span>
              ) : (
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                  Projected
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <p className="text-sm font-semibold text-slate-950">{fixture.homeTeam}</p>
              <p className="text-xs font-semibold uppercase text-slate-400">vs</p>
              <p className="text-sm font-semibold text-slate-950 sm:text-right">{fixture.awayTeam}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

interface SingleFixtureBlockProps {
  label: string;
  fixture: KnockoutFixture;
}

function SingleFixtureBlock({ label, fixture }: SingleFixtureBlockProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <article
        aria-label={`${label} fixture`}
        className="max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-400">Slot {fixture.slot}</p>
          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
            Placeholder
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <p className="text-sm font-semibold text-slate-950">{fixture.homeTeam}</p>
          <p className="text-xs font-semibold uppercase text-slate-400">vs</p>
          <p className="text-sm font-semibold text-slate-950 sm:text-right">{fixture.awayTeam}</p>
        </div>
      </article>
    </div>
  );
}

export function WorldCupKnockoutBracketSection({ knockoutBracket }: WorldCupKnockoutBracketSectionProps) {
  return (
    <section id="world-cup-knockout-bracket" aria-labelledby="world-cup-knockout-bracket-title" className="py-8">
      <SectionHeader
        eyebrow="Knockout bracket"
        titleId="world-cup-knockout-bracket-title"
        title="Projected knockout bracket"
        description="A deterministic placeholder bracket structure from Round of 32 through the Final. Rounds beyond R32 use placeholder progression slots — winners are not simulated."
      />

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Projected bracket only</p>
        <p className="mt-2 text-sm leading-6 text-amber-950">
          Rounds beyond the Round of 32 show deterministic placeholder slots (e.g. Winner R32-01, Winner R16-1). No winners are
          simulated and no champion probabilities are calculated.
        </p>
      </div>

      <div className="mt-6 space-y-8">
        <RoundBlock label="Round of 32" fixtures={knockoutBracket.roundOf32} isPlaceholder={false} />
        <RoundBlock label="Round of 16" fixtures={knockoutBracket.roundOf16} isPlaceholder={true} />
        <RoundBlock label="Quarterfinals" fixtures={knockoutBracket.quarterfinals} isPlaceholder={true} />
        <RoundBlock label="Semifinals" fixtures={knockoutBracket.semifinals} isPlaceholder={true} />
        <div className="grid gap-6 sm:grid-cols-2">
          <SingleFixtureBlock label="Third Place" fixture={knockoutBracket.thirdPlaceMatch} />
          <SingleFixtureBlock label="Final" fixture={knockoutBracket.final} />
        </div>
      </div>
    </section>
  );
}
