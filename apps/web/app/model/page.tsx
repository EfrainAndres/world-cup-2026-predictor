import React from "react";
import type { Metadata } from "next";
import { ConfidenceCoverageGuide } from "../../src/components/ConfidenceCoverageGuide";
import { ModelEvidenceSummary } from "../../src/components/ModelEvidenceSummary";
import { ModelStatusSummary } from "../../src/components/ModelStatusSummary";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { PredictionPipelineOverview } from "../../src/components/PredictionPipelineOverview";
import { ProductionModelConfiguration } from "../../src/components/ProductionModelConfiguration";
import { RecalibrationGateSummary } from "../../src/components/RecalibrationGateSummary";
import { getProductionModelConfig } from "../../src/lib/model-evidence-center";
import { getModelEvidenceCenterData } from "../../src/lib/server-runtime";

export const metadata: Metadata = {
  title: "Model · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ModelPage() {
  const data = await getModelEvidenceCenterData();
  const cfg = getProductionModelConfig();

  const limitationsList = data.modelInfo.limitations;
  const scopeList = data.modelInfo.modelScope;

  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Model and Evidence Center"
        description="Production pipeline configuration, evidence accumulated from real matches, and the recalibration gate."
      />

      {/* Region 1 — Model status and header */}
      <div className="mt-8">
        <ModelStatusSummary
          data={data}
          modelVersion={cfg.modelVersion}
          formulaVersion={cfg.formulaVersion}
        />
      </div>

      {/* Region 2 — Prediction pipeline */}
      <PredictionPipelineOverview />

      {/* Region 3 — Production configuration */}
      <ProductionModelConfiguration />

      {/* Region 4 — Confidence and coverage guide */}
      <ConfidenceCoverageGuide />

      {/* Region 5 — Model-vs-reality evidence */}
      <ModelEvidenceSummary
        realitySummary={data.realitySummary}
        stateKind={data.stateKind}
      />

      {/* Region 6 — Recalibration gate */}
      <RecalibrationGateSummary gateReport={data.gateReport} />

      {/* Region 7 — Technical disclosure */}
      <section
        id="model-disclosure"
        aria-labelledby="model-disclosure-heading"
        className="mb-8"
      >
        <h2 id="model-disclosure-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Technical disclosure
        </h2>

        <div className="space-y-3">
          {/* Scope */}
          <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 focus-visible:outline-none">
              Model scope
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <ul className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-1">
              {scopeList.map((item, i) => (
                <li key={i} className="text-xs text-slate-600">{item}</li>
              ))}
            </ul>
          </details>

          {/* Limitations */}
          <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 focus-visible:outline-none">
              Known limitations
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <ul className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-1">
              {limitationsList.map((limitation, i) => (
                <li key={i} className="text-xs text-slate-600">{limitation}</li>
              ))}
            </ul>
          </details>

          {/* Supported handlers */}
          <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 focus-visible:outline-none">
              Supported prediction handlers
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <ul className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-1">
              {data.modelInfo.supportedHandlers.map((handler, i) => (
                <li key={i} className="font-mono text-[11px] text-slate-600">{handler}</li>
              ))}
            </ul>
          </details>

          {/* Model package identifier */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-slate-500">Model package</p>
            <p className="mt-0.5 break-all font-mono text-[11px] text-slate-700">
              {data.modelInfo.modelPackage}
            </p>
          </div>
        </div>
      </section>

      {/* Cross-page CTAs */}
      <nav aria-label="Related pages" className="mb-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href="/match"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Run a prediction
          </a>
          <a
            href="/groups"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Group standings
          </a>
          <a
            href="/tournament"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Tournament bracket
          </a>
        </div>
      </nav>
    </PageContainer>
  );
}
