import React from "react";
import Link from "next/link";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type { WorldCup2026GroupStandings } from "@world-cup-2026-predictor/api";
import { TeamIdentity } from "./TeamIdentity";
import { formatGD, formatGroupProgress, groupIsComplete } from "../lib/groups-tournament-ui";

interface GroupOverviewCardProps {
  group: WorldCup2026GroupStandings;
  isLive?: boolean;
}

export function GroupOverviewCard({ group, isLive = false }: GroupOverviewCardProps) {
  const isComplete = groupIsComplete(group.completedFixtureCount, group.pendingFixtureCount);
  const progress = formatGroupProgress(group.completedFixtureCount, group.pendingFixtureCount);
  const topThree = group.standings.slice(0, 3);
  const headingId = `group-${group.group.toLowerCase()}-overview-heading`;
  const overviewLabelId = `group-${group.group.toLowerCase()}-overview-label`;

  return (
    <article
      aria-labelledby={`${headingId} ${overviewLabelId}`}
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <span id={overviewLabelId} className="sr-only">
        overview
      </span>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <Link
          href={`/groups/${group.group}`}
          id={headingId}
          className="text-base font-semibold text-slate-950 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        >
          {group.groupName}
        </Link>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Live
            </span>
          )}
          {isComplete ? (
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
              Complete
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-500">{progress}</span>
          )}
        </div>
      </div>

      {topThree.length > 0 ? (
        <ol aria-label={`${group.groupName} top teams`}>
          {topThree.map((entry, index) => {
            const identity = getTeamVisualIdentity(entry.team);
            const isQualifying = index < 2;
            return (
              <li
                key={entry.team}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm ${index < topThree.length - 1 ? "border-b border-slate-50" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isQualifying ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"}`}
                  aria-label={`Position ${index + 1}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <TeamIdentity
                    identity={identity}
                    size="xs"
                    useShortName
                    className="min-w-0"
                  />
                </span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums text-xs text-slate-600">
                  <span className="w-6 text-right font-semibold text-slate-900">{entry.points}</span>
                  <span className="w-8 text-right">{formatGD(entry.goalDifference)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">No standings data yet.</p>
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Pts · GD</span>
          <Link
            href={`/groups/${group.group}`}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
            aria-label={`View Group ${group.group}`}
          >
            View group →
          </Link>
        </div>
      </div>
    </article>
  );
}
