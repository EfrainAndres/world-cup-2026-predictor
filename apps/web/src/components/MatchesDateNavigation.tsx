import React from "react";
import Link from "next/link";
import { buildMatchesUrl, formatDisplayDate, getNextDate, getPrevDate } from "../lib/matches-experience";
import type { MatchFilter } from "../lib/matches-experience";

interface MatchesDateNavigationProps {
  currentDate: string;
  todayDate: string;
  activeFilter: MatchFilter;
}

export function MatchesDateNavigation({
  currentDate,
  todayDate,
  activeFilter
}: MatchesDateNavigationProps) {
  const isToday = currentDate === todayDate;
  const prevDate = getPrevDate(currentDate);
  const nextDate = getNextDate(currentDate);

  return (
    <nav aria-label="Date navigation" className="flex items-center gap-2">
      <Link
        href={buildMatchesUrl(prevDate, activeFilter)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        aria-label="Previous day"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
            clipRule="evenodd"
          />
        </svg>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 sm:flex-row sm:gap-3">
        <span className="text-sm font-semibold text-slate-900">{formatDisplayDate(currentDate)}</span>
        {!isToday ? (
          <Link
            href={buildMatchesUrl(todayDate, activeFilter)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
          >
            Today
          </Link>
        ) : (
          <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            Today
          </span>
        )}
      </div>

      <Link
        href={buildMatchesUrl(nextDate, activeFilter)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        aria-label="Next day"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    </nav>
  );
}
