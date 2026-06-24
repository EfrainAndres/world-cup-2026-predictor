"use client";

import { useMemo, useState } from "react";

import type {
  WorldCup2026DailyMatchesResponse,
  WorldCup2026DailyMatchesSuccessResponse
} from "../lib/api-client";
import {
  DAILY_MATCHES_DISPLAY_TIMEZONE,
  DAILY_MATCHES_DISPLAY_TIMEZONE_LABEL,
  formatUtcTimestamp,
  getDailyMatchesSourceClasses,
  getDailyMatchesSourceLabel,
  getTodayDateForTimezone,
  shiftDailyMatchesDate
} from "../lib/daily-matches-ui";
import { SectionHeader } from "./SectionHeader";
import { DailyMatchCard } from "./DailyMatchCard";

interface TodaysMatchesSectionProps {
  initialData: WorldCup2026DailyMatchesSuccessResponse;
}

const DAILY_MATCHES_API_PATH = "/api/world-cup-2026/daily-matches";

async function fetchDailyMatches(date: string, timezone: string): Promise<WorldCup2026DailyMatchesResponse> {
  const params = new URLSearchParams({ date, timezone });
  const response = await fetch(`${DAILY_MATCHES_API_PATH}?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  return response.json() as Promise<WorldCup2026DailyMatchesResponse>;
}

function buildErrorMessage(response: WorldCup2026DailyMatchesResponse | null): string {
  if (response?.status === "validation_error") {
    return response.issues[0]?.message ?? "Unable to load daily matches for the selected date.";
  }

  return "Unable to load daily matches for the selected date.";
}

export function TodaysMatchesSection({ initialData }: TodaysMatchesSectionProps) {
  const timezone = initialData.timezone ?? DAILY_MATCHES_DISPLAY_TIMEZONE;
  const todayDate = useMemo(() => getTodayDateForTimezone(timezone), [timezone]);
  const [selectedDate, setSelectedDate] = useState(initialData.requestedDate);
  const [data, setData] = useState<WorldCup2026DailyMatchesSuccessResponse | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function navigateToDate(nextDate: string): Promise<void> {
    setSelectedDate(nextDate);
    setIsLoading(true);
    setErrorMessage(null);
    setData(null);

    try {
      const response = await fetchDailyMatches(nextDate, timezone);

      if (response.status !== "success") {
        setErrorMessage(buildErrorMessage(response));
        return;
      }

      setData(response);
      setSelectedDate(response.requestedDate);
    } catch {
      setErrorMessage(buildErrorMessage(null));
    } finally {
      setIsLoading(false);
    }
  }

  const providerMetadata = data?.providerMetadata;
  const hasMatches = (data?.matches.length ?? 0) > 0;
  const hasUnscheduledMatches = (data?.counts.unavailableKickoff ?? 0) > 0;

  return (
    <section id="live-match-center" aria-labelledby="todays-matches-title" className="py-8">
      <SectionHeader
        eyebrow="Live match center"
        titleId="todays-matches-title"
        title="Today's World Cup Matches"
        description="A compact daily match view over the synchronized World Cup 2026 fixtures foundation. Date filtering, status mapping, and provider-source handling stay in the API layer."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected date</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{selectedDate}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {timezone === DAILY_MATCHES_DISPLAY_TIMEZONE ? DAILY_MATCHES_DISPLAY_TIMEZONE_LABEL : timezone}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {providerMetadata !== undefined ? (
                  <>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDailyMatchesSourceClasses(providerMetadata)}`}>
                      Source: {getDailyMatchesSourceLabel(providerMetadata)}
                    </span>
                    {providerMetadata.stale ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Stale data
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    Source unavailable
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last successful sync</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {formatUtcTimestamp(providerMetadata?.lastSuccessfulSync)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Daily match navigation">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:border-teal-700 hover:text-teal-800"
              onClick={() => void navigateToDate(shiftDailyMatchesDate(selectedDate, -1))}
            >
              Previous day
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:border-teal-700 hover:text-teal-800"
              onClick={() => void navigateToDate(todayDate)}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:border-teal-700 hover:text-teal-800"
              onClick={() => void navigateToDate(shiftDailyMatchesDate(selectedDate, 1))}
            >
              Next day
            </button>
          </div>
        </div>

        {providerMetadata?.localFallbackUsed ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Source: Local static fallback. Live provider synchronization is not active for this response.
          </div>
        ) : null}

        {providerMetadata?.cacheUsed ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Cached provider data is being shown for this date. Review the last successful sync before treating match states as current.
          </div>
        ) : null}

        {hasUnscheduledMatches ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {data?.counts.unavailableKickoff} fixtures are available but do not yet have kickoff metadata for date placement. They are excluded from today's list until dated kickoff values exist.
          </div>
        ) : null}

        {errorMessage !== null ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600" role="status" aria-live="polite">
            Loading daily matches for {selectedDate}.
          </div>
        ) : null}

        {!isLoading && errorMessage === null && !hasMatches ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No scheduled matches are available for this date.
          </div>
        ) : null}

        {!isLoading && errorMessage === null && hasMatches ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {data?.matches.map((match) => <DailyMatchCard key={match.fixtureId} match={match} />)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
