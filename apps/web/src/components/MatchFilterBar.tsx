import React from "react";
import Link from "next/link";
import {
  buildMatchesUrl,
  MATCH_FILTER_LABELS,
  MATCH_FILTERS,
  type MatchFilter
} from "../lib/matches-experience";
import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";

type MatchCounts = Record<MatchFilter, number>;

function buildFilterCounts(matches: readonly WorldCup2026DailyMatchEntry[]): MatchCounts {
  const liveCount = matches.filter((m) => m.state === "live" || m.state === "halftime").length;
  const upcomingCount = matches.filter((m) => m.state === "upcoming").length;
  const finishedCount = matches.filter((m) => m.state === "final").length;
  const predictedCount = matches.filter((m) => m.predictionHistory.snapshot.available).length;
  return {
    all: matches.length,
    live: liveCount,
    upcoming: upcomingCount,
    finished: finishedCount,
    predicted: predictedCount
  };
}

interface MatchFilterBarProps {
  currentDate: string;
  activeFilter: MatchFilter;
  allMatches: readonly WorldCup2026DailyMatchEntry[];
}

export function MatchFilterBar({ currentDate, activeFilter, allMatches }: MatchFilterBarProps) {
  const counts = buildFilterCounts(allMatches);

  return (
    <div
      className="relative -mx-4 sm:mx-0"
      role="navigation"
      aria-label="Match filters"
    >
      <div className="flex gap-1 overflow-x-auto px-4 pb-1 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {MATCH_FILTERS.map((filter) => {
          const isActive = filter === activeFilter;
          const count = counts[filter];
          return (
            <Link
              key={filter}
              href={buildMatchesUrl(currentDate, filter)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                "min-h-[44px] sm:min-h-[unset]",
                isActive
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              ].join(" ")}
            >
              {MATCH_FILTER_LABELS[filter]}
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                ].join(" ")}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
