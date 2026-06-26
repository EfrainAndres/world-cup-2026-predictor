import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { EmptyState } from "../../src/components/EmptyState";

export const metadata: Metadata = {
  title: "Tournament · World Cup 2026 Predictor"
};

export default function TournamentPage() {
  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Tournament"
        description="Explore projected knockout rounds, finalists, and tournament outlook."
      />
      <div className="mt-8">
        <EmptyState
          title="Full tournament view coming in Phase 12.19F"
          description="Qualification summary, knockout bracket, round projections, and champion outlook."
          action={
            <Link href="/#world-cup-tournament-overview" className="text-sm font-medium text-teal-700 hover:underline">
              Tournament overview on Home →
            </Link>
          }
        />
      </div>
    </PageContainer>
  );
}
