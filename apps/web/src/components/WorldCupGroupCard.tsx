import type { WorldCup2026FixtureFoundationResponse } from "../lib/api-client";

type WorldCup2026Group = WorldCup2026FixtureFoundationResponse["groups"][number];
type WorldCup2026Fixture = WorldCup2026FixtureFoundationResponse["fixtures"][number];

interface WorldCupGroupCardProps {
  group: WorldCup2026Group;
  fixtures: readonly WorldCup2026Fixture[];
}

export function WorldCupGroupCard({ group, fixtures }: WorldCupGroupCardProps) {
  return (
    <article aria-label={group.groupName} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{group.groupName}</h3>
          <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{group.fixtureCount} fixtures</p>
        </div>
        <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          Group {group.group}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700">
        {group.teams.map((team) => (
          <li key={team} className="rounded-md bg-slate-50 px-2.5 py-1.5 font-medium">
            {team}
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Group fixtures</p>
        <ol className="mt-2 space-y-2 text-sm text-slate-700">
          {fixtures.map((fixture) => (
            <li key={fixture.id} className="grid gap-1 rounded-md bg-slate-50 px-3 py-2 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
              <span className="text-xs font-semibold uppercase text-slate-500">MD {fixture.matchday}</span>
              <span className="font-medium text-slate-800">
                {fixture.homeTeam} vs {fixture.awayTeam}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

