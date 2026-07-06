import React from "react";
import Link from "next/link";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";
import { getDailyMatchStateClasses, getDailyMatchStateLabel } from "../lib/daily-matches-ui";
import { buildMatchResultDisplay } from "../lib/match-result-display";
import { buildMatchDetailHref } from "../lib/matches-experience";
import { TeamIdentity } from "./TeamIdentity";

interface CompactMatchRowProps {
  match: WorldCup2026DailyMatchEntry;
}

export function CompactMatchRow({ match }: CompactMatchRowProps) {
  const resultDisplay = buildMatchResultDisplay(match);
  const hasPrediction = match.predictionHistory.snapshot.available;
  const isLive = match.state === "live" || match.state === "halftime";

  return (
    <li>
      <Link
        href={buildMatchDetailHref(match)}
        className="group flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        aria-label={`${match.homeTeam} vs ${match.awayTeam}, ${getDailyMatchStateLabel(match.state)}`}
      >
        <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <span className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
            <span className="min-w-0 sm:min-w-[8rem]">
              <TeamIdentity
                identity={getTeamVisualIdentity(match.homeTeam)}
                size="xs"
                useShortName
                className="min-w-0"
              />
            </span>

            <span className="flex shrink-0 flex-col items-start gap-1 sm:items-center sm:text-center">
              {resultDisplay.showPrimaryScore ? (
                <span className={`inline-block min-w-[3rem] rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${isLive ? "bg-red-50 text-red-900" : "bg-slate-100 text-slate-900"}`}>
                  {resultDisplay.primaryScoreText}
                </span>
              ) : match.localizedKickoff !== undefined ? (
                <span className="text-xs text-slate-500">{match.localizedKickoff}</span>
              ) : (
                <span className="text-xs text-slate-400">TBD</span>
              )}
              {resultDisplay.resultNote !== undefined ? (
                <span className="max-w-52 text-xs font-medium leading-tight text-slate-600 sm:max-w-44">
                  {resultDisplay.resultNote}
                </span>
              ) : null}
            </span>

            <span className="min-w-0 sm:min-w-[8rem] sm:text-right">
              <TeamIdentity
                identity={getTeamVisualIdentity(match.awayTeam)}
                size="xs"
                useShortName
                className="min-w-0 sm:flex-row-reverse"
              />
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5 self-start sm:self-center">
          {hasPrediction ? (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500"
              title="Prediction available"
              aria-label="Prediction available"
            />
          ) : null}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight ${getDailyMatchStateClasses(match.state)}`}
          >
            {getDailyMatchStateLabel(match.state)}
          </span>
        </span>
      </Link>
    </li>
  );
}
