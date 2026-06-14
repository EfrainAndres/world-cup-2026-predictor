import type { WorldCup2026GroupStandingsFoundationResponse } from "../lib/api-client";

type WorldCup2026GroupStandings = WorldCup2026GroupStandingsFoundationResponse["groups"][number];

interface WorldCupStandingsTableProps {
  group: WorldCup2026GroupStandings;
}

export function WorldCupStandingsTable({ group }: WorldCupStandingsTableProps) {
  return (
    <article aria-label={`${group.groupName} standings`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{group.groupName}</h3>
          <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
            {group.completedFixtureCount} completed / {group.pendingFixtureCount} pending
          </p>
        </div>
        <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          Group {group.group}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">
                Team
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                Pts
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                P
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                W
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                D
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                L
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                GF
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                GA
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">
                GD
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {group.standings.map((entry) => (
              <tr key={entry.team}>
                <th scope="row" className="py-2 pr-3 font-medium text-slate-900">
                  {entry.team}
                </th>
                <td className="px-2 py-2 text-right font-semibold text-slate-950">{entry.points}</td>
                <td className="px-2 py-2 text-right">{entry.played}</td>
                <td className="px-2 py-2 text-right">{entry.wins}</td>
                <td className="px-2 py-2 text-right">{entry.draws}</td>
                <td className="px-2 py-2 text-right">{entry.losses}</td>
                <td className="px-2 py-2 text-right">{entry.goalsFor}</td>
                <td className="px-2 py-2 text-right">{entry.goalsAgainst}</td>
                <td className="py-2 pl-2 text-right">{entry.goalDifference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

