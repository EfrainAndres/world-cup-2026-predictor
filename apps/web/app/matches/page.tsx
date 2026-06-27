import React from "react";
import type { Metadata } from "next";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { TodaysMatchesSection } from "../../src/components/TodaysMatchesSection";
import { DAILY_MATCHES_DISPLAY_TIMEZONE } from "../../src/lib/daily-matches-ui";
import {
  buildDashboardDailyMatchesFromSync,
  getDashboardLiveSyncResult
} from "../../src/lib/server-runtime";

export const metadata: Metadata = {
  title: "Matches · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MatchesPage() {
  const syncResult = await getDashboardLiveSyncResult();
  const dailyMatches = buildDashboardDailyMatchesFromSync(syncResult, { timezone: DAILY_MATCHES_DISPLAY_TIMEZONE });

  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Matches"
        description="Browse daily fixtures, live scores, recent results, date navigation, and stored prediction summaries."
      />
      <TodaysMatchesSection initialData={dailyMatches} />
    </PageContainer>
  );
}
