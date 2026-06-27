import React from "react";
import type { Metadata } from "next";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { MatchList } from "../../src/components/MatchList";
import { MatchesDateNavigation } from "../../src/components/MatchesDateNavigation";
import { MatchFilterBar } from "../../src/components/MatchFilterBar";
import {
  buildDashboardDailyMatchesFromSync,
  getDashboardLiveSyncResult
} from "../../src/lib/server-runtime";
import {
  applyMatchFilter,
  DAILY_MATCHES_DISPLAY_TIMEZONE,
  parseMatchDate,
  parseMatchFilter,
  sortMatchesForDisplay
} from "../../src/lib/matches-experience";
import { getTodayDateForTimezone } from "../../src/lib/daily-matches-ui";

export const metadata: Metadata = {
  title: "Matches · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MatchesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams;
  const todayDate = getTodayDateForTimezone(DAILY_MATCHES_DISPLAY_TIMEZONE);
  const rawDate = typeof params["date"] === "string" ? params["date"] : undefined;
  const rawFilter = typeof params["filter"] === "string" ? params["filter"] : undefined;

  const currentDate = parseMatchDate(rawDate, todayDate);
  const activeFilter = parseMatchFilter(rawFilter);

  const syncResult = await getDashboardLiveSyncResult();
  const dailyMatches = buildDashboardDailyMatchesFromSync(syncResult, {
    date: currentDate,
    timezone: DAILY_MATCHES_DISPLAY_TIMEZONE
  });

  const allMatches = [...dailyMatches.matches, ...dailyMatches.unscheduledMatches];
  const filtered = applyMatchFilter(allMatches, activeFilter);
  const sorted = sortMatchesForDisplay(filtered);

  const filterEmptyDescription =
    activeFilter === "all"
      ? "No fixtures are scheduled for this date."
      : `No ${activeFilter} matches on this date. Try the All filter.`;

  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <PageHeader
          eyebrow="World Cup 2026"
          title="Matches"
          description="Browse daily fixtures, live scores, results, and stored predictions."
        />
      </div>

      <div className="mb-4">
        <MatchesDateNavigation
          currentDate={currentDate}
          todayDate={todayDate}
          activeFilter={activeFilter}
        />
      </div>

      <div className="mb-4">
        <MatchFilterBar
          currentDate={currentDate}
          activeFilter={activeFilter}
          allMatches={allMatches}
        />
      </div>

      <MatchList
        matches={sorted}
        emptyTitle="No matches found"
        emptyDescription={filterEmptyDescription}
      />
    </PageContainer>
  );
}
