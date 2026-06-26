import type { WorldCup2026FixtureFoundationResponse } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";
import { WorldCupGroupCard } from "./WorldCupGroupCard";

interface WorldCupGroupsSectionProps {
  fixtureFoundation: WorldCup2026FixtureFoundationResponse;
}

export function WorldCupGroupsSection({ fixtureFoundation }: WorldCupGroupsSectionProps) {
  return (
    <section id="world-cup-groups" aria-labelledby="world-cup-groups-title" className="py-8">
      <SectionHeader
        eyebrow="Tournament structure"
        titleId="world-cup-groups-title"
        title="World Cup 2026 Groups & Fixtures"
        description="Inspect the local tournament structure foundation before standings, knockout paths, and full tournament simulation are added."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Foundation tournament structure</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{fixtureFoundation.tournamentName}</p>
          </div>
          <StatusPill label="Static local data" tone="neutral" />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Groups</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{fixtureFoundation.groupCount} groups</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Group fixtures</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{fixtureFoundation.fixtureCount} group fixtures</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Teams</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{fixtureFoundation.teamCount} teams</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Foundation warning</p>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            This section shows local curated tournament structure data. Standings and full tournament simulation are planned next.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fixtureFoundation.groups.map((group) => (
          <WorldCupGroupCard
            key={group.group}
            group={group}
            fixtures={fixtureFoundation.fixtures.filter((fixture) => fixture.group === group.group)}
          />
        ))}
      </div>
    </section>
  );
}

