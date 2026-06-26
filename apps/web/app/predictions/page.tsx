import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { EmptyState } from "../../src/components/EmptyState";

export const metadata: Metadata = {
  title: "Predictions · World Cup 2026 Predictor"
};

export default function PredictionsPage() {
  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Predictions"
        description="Create and review World Cup match predictions."
      />
      <div className="mt-8">
        <EmptyState
          title="Dedicated prediction hub coming in Phase 12.19E"
          description="Featured predictions, the Auto Predict tool, and upcoming stored predictions."
          action={
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/#match-preview" className="text-sm font-medium text-teal-700 hover:underline">
                Prediction tool on Home →
              </Link>
              <Link href="/prediction-history" className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline">
                Prediction History →
              </Link>
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}
