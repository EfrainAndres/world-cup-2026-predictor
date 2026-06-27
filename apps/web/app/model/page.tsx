import React from "react";
import type { Metadata } from "next";
import { HistoricalReplayAuditPreviewCard } from "../../src/components/HistoricalReplayAuditPreviewCard";
import { HistoricalValidationSection } from "../../src/components/HistoricalValidationSection";
import { LiveEloRatingsSection } from "../../src/components/LiveEloRatingsSection";
import { ModelStatusCard } from "../../src/components/ModelStatusCard";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { TeamRatingsSection } from "../../src/components/TeamRatingsSection";
import { getDashboardSnapshot } from "../../src/lib/api-client";
import {
  buildDashboardStandingsFromSync,
  getDashboardLiveSyncResult,
  getProductionRuntimeDiagnostics
} from "../../src/lib/server-runtime";

export const metadata: Metadata = {
  title: "Model · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ModelPage() {
  const syncResult = await getDashboardLiveSyncResult();
  const runtimeDiagnostics = await getProductionRuntimeDiagnostics(syncResult);
  const standings = buildDashboardStandingsFromSync(syncResult);
  const snapshot = getDashboardSnapshot({ worldCup2026Standings: standings });

  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Model"
        description="Review model readiness, evidence, rating inputs, validation summaries, and historical replay context."
      />

      <section aria-labelledby="model-status-title" className="mt-8 grid gap-6 lg:grid-cols-2">
        <h2 id="model-status-title" className="sr-only">
          Model status and evidence summary
        </h2>
        <ModelStatusCard
          health={snapshot.health}
          modelInfo={snapshot.modelInfo}
          runtimeDiagnostics={runtimeDiagnostics}
        />
        <HistoricalReplayAuditPreviewCard audit={snapshot.historicalReplayAudit} />
      </section>

      <LiveEloRatingsSection liveEloRatings={snapshot.liveEloRatings} />
      <TeamRatingsSection teamRatings={snapshot.teamRatings} />
      <div id="historical">
        <HistoricalValidationSection
          tournaments={snapshot.historicalTournaments}
          audit={snapshot.historicalReplayAudit}
        />
      </div>
    </PageContainer>
  );
}
