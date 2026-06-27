import React from "react";
import type { Metadata } from "next";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { WorldCupGroupsSection } from "../../src/components/WorldCupGroupsSection";
import { WorldCupStandingsSection } from "../../src/components/WorldCupStandingsSection";
import { getDashboardSnapshot } from "../../src/lib/api-client";
import {
  buildDashboardStandingsFromSync,
  getDashboardLiveSyncResult
} from "../../src/lib/server-runtime";

export const metadata: Metadata = {
  title: "Groups · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function GroupsPage() {
  const syncResult = await getDashboardLiveSyncResult();
  const standings = buildDashboardStandingsFromSync(syncResult);
  const snapshot = getDashboardSnapshot({ worldCup2026Standings: standings });

  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Groups"
        description="Explore all World Cup groups, fixtures, standings, and qualification context."
      />
      <WorldCupGroupsSection fixtureFoundation={snapshot.worldCup2026Fixtures} />
      <WorldCupStandingsSection standingsFoundation={snapshot.worldCup2026Standings} />
    </PageContainer>
  );
}
