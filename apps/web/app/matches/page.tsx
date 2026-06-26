import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { EmptyState } from "../../src/components/EmptyState";

export const metadata: Metadata = {
  title: "Matches · World Cup 2026 Predictor"
};

export default function MatchesPage() {
  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Matches"
        description="Browse today's matches, upcoming fixtures, recent results, and stored predictions."
      />
      <div className="mt-8">
        <EmptyState
          title="Full match experience coming in Phase 12.19E"
          description="Date navigation, live scores, fixture detail, and per-match prediction views."
          action={
            <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">
              Today&apos;s matches on Home →
            </Link>
          }
        />
      </div>
    </PageContainer>
  );
}
