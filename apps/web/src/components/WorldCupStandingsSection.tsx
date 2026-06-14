import type { WorldCup2026GroupStandingsFoundationResponse } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";
import { WorldCupStandingsTable } from "./WorldCupStandingsTable";

interface WorldCupStandingsSectionProps {
  standingsFoundation: WorldCup2026GroupStandingsFoundationResponse;
}

export function WorldCupStandingsSection({ standingsFoundation }: WorldCupStandingsSectionProps) {
  return (
    <section id="world-cup-standings" aria-labelledby="world-cup-standings-title" className="py-8">
      <SectionHeader
        eyebrow="Group standings"
        titleId="world-cup-standings-title"
        title="World Cup 2026 Group Standings"
        description="Tables are calculated from normalized local result records when scores are present. Scheduled fixtures do not change the standings."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Foundation standings</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{standingsFoundation.tournamentName}</p>
          </div>
          <StatusPill label="Local results only" tone="neutral" />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Groups</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{standingsFoundation.groupCount} groups</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Completed fixtures</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{standingsFoundation.completedFixtureCount}</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Pending fixtures</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{standingsFoundation.pendingFixtureCount}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
            Results source: {standingsFoundation.resultProvider.providerName}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
            External provider: {standingsFoundation.resultProvider.externalProviderEnabled ? "enabled" : "disabled"}
          </span>
        </div>

        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Foundation warning</p>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Standings are calculated from local normalized results. Scheduled matches are ignored.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {standingsFoundation.groups.map((group) => (
          <WorldCupStandingsTable key={group.group} group={group} />
        ))}
      </div>
    </section>
  );
}
