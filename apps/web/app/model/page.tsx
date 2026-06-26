import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { EmptyState } from "../../src/components/EmptyState";

export const metadata: Metadata = {
  title: "Model · World Cup 2026 Predictor"
};

export default function ModelPage() {
  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Model"
        description="Review model performance, evidence, confidence, and methodology."
      />
      <div className="mt-8">
        <EmptyState
          title="Model evidence center coming in Phase 12.19G"
          description="Accuracy metrics, evidence gate status, Elo/xG methodology, and technical provenance."
          action={
            <Link href="/prediction-history" className="text-sm font-medium text-teal-700 hover:underline">
              Prediction History →
            </Link>
          }
        />
      </div>
    </PageContainer>
  );
}
