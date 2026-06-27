import React from "react";
import type { Metadata } from "next";
import { MatchSimulationForm } from "../../src/components/MatchSimulationForm";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { DAILY_MATCHES_DISPLAY_TIMEZONE } from "../../src/lib/daily-matches-ui";
import type { WorldCup2026MatchContext } from "../../src/lib/api-client";
import { getDashboardSnapshot } from "../../src/lib/api-client";
import {
  buildDashboardDailyMatchesFromSync,
  buildDashboardStandingsFromSync,
  getDashboardLiveSyncResult
} from "../../src/lib/server-runtime";

export const metadata: Metadata = {
  title: "Predictions · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PredictionsPage() {
  const syncResult = await getDashboardLiveSyncResult();
  const standings = buildDashboardStandingsFromSync(syncResult);
  const dailyMatches = buildDashboardDailyMatchesFromSync(syncResult, { timezone: DAILY_MATCHES_DISPLAY_TIMEZONE });
  const snapshot = getDashboardSnapshot({ worldCup2026Standings: standings });

  const contextByFixtureId: Record<string, WorldCup2026MatchContext> = {};
  for (const match of [...dailyMatches.matches, ...dailyMatches.unscheduledMatches]) {
    if (match.matchContext !== undefined) {
      contextByFixtureId[match.fixtureId] = match.matchContext;
    }
  }

  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Predictions"
        description="Create a scheduled fixture prediction or switch to a custom matchup."
      />
      <section id="match-preview" aria-labelledby="match-preview-title" className="mt-8">
        <h2 id="match-preview-title" className="sr-only">
          Interactive match simulation
        </h2>
        <MatchSimulationForm
          initialResult={snapshot.matchPreview}
          fixtureFoundation={snapshot.worldCup2026Fixtures}
          initialMatchContextByFixtureId={contextByFixtureId}
        />
      </section>
    </PageContainer>
  );
}
