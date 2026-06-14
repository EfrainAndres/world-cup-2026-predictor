import type { WorldCup2026RoundOf32FoundationResponse } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";
import { WorldCupRoundOf32FixtureCard } from "./WorldCupRoundOf32FixtureCard";

interface WorldCupRoundOf32SectionProps {
  roundOf32Foundation: WorldCup2026RoundOf32FoundationResponse;
}

export function WorldCupRoundOf32Section({ roundOf32Foundation }: WorldCupRoundOf32SectionProps) {
  return (
    <section id="world-cup-round-of-32" aria-labelledby="world-cup-round-of-32-title" className="py-8">
      <SectionHeader
        eyebrow="Knockout foundation"
        titleId="world-cup-round-of-32-title"
        title="Projected Round of 32"
        description="A deterministic first-knockout-round foundation derived from current local standings. Winners are not simulated."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Round of 32 foundation</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{roundOf32Foundation.tournamentName}</p>
          </div>
          <StatusPill label="Projected bracket" tone="neutral" />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Qualified teams</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{roundOf32Foundation.totalQualifiedTeams}</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Group winners</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{roundOf32Foundation.groupWinners}</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Best third-place</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{roundOf32Foundation.bestThirdPlaceTeams}</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Fixtures</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{roundOf32Foundation.fixturesCount}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Projected foundation warning</p>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Projected Round of 32 foundation based on current local standings. Official third-place pairing rules may differ and
            pending fixtures can change qualification.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {roundOf32Foundation.fixtures.map((fixture) => (
          <WorldCupRoundOf32FixtureCard key={fixture.fixtureId} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
