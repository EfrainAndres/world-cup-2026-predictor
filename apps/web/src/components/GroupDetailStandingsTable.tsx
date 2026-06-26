import React from "react";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type { WorldCup2026TeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type { WorldCup2026GroupStandingEntry } from "../lib/api-client";
import { TeamIdentity } from "./TeamIdentity";

function resolveStandingIdentity(teamName: string): WorldCup2026TeamVisualIdentity {
  const id = getTeamVisualIdentity(teamName);
  if (id.teamId === "unknown") {
    return { ...id, canonicalName: teamName, shortName: teamName };
  }
  return id;
}

interface GroupDetailStandingsTableProps {
  standings: readonly WorldCup2026GroupStandingEntry[];
  label: string;
}

export function GroupDetailStandingsTable({ standings, label }: GroupDetailStandingsTableProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm" aria-label={label}>
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="py-2 pl-4 pr-3 font-semibold">Team</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Pts</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">P</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">W</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">D</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">L</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">GF</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">GA</th>
              <th scope="col" className="py-2 pl-2 pr-4 text-right font-semibold">GD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {standings.map((entry) => (
              <tr key={entry.team}>
                <th scope="row" className="py-2 pl-4 pr-3 font-medium text-slate-900">
                  <TeamIdentity identity={resolveStandingIdentity(entry.team)} size="xs" />
                </th>
                <td className="px-2 py-2 text-right font-semibold text-slate-950">{entry.points}</td>
                <td className="px-2 py-2 text-right">{entry.played}</td>
                <td className="px-2 py-2 text-right">{entry.wins}</td>
                <td className="px-2 py-2 text-right">{entry.draws}</td>
                <td className="px-2 py-2 text-right">{entry.losses}</td>
                <td className="px-2 py-2 text-right">{entry.goalsFor}</td>
                <td className="px-2 py-2 text-right">{entry.goalsAgainst}</td>
                <td className="py-2 pl-2 pr-4 text-right">{entry.goalDifference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
