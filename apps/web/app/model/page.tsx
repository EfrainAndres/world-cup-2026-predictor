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
import { buildModelDisclosureSummary } from "../../src/lib/technical-disclosure";
import { TechnicalDisclosure } from "../../src/components/TechnicalDisclosure";

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
  const disclosureSummary = buildModelDisclosureSummary(data.modelInfo);

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

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">Model scope summary</p>
            <ul className="mt-3 space-y-1.5">
              {disclosureSummary.scopeSummary.map((item) => (
                <li key={item} className="text-sm text-slate-700">{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">Known limitations</p>
            <ul className="mt-3 space-y-1.5">
              {disclosureSummary.limitationSummary.map((item) => (
                <li key={item} className="text-sm text-slate-700">{item}</li>
              ))}
            </ul>
          </div>

          <TechnicalDisclosure summary="View full technical scope">
            <ul className="space-y-1">
              {scopeList.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </TechnicalDisclosure>

          <TechnicalDisclosure summary="View supported handlers">
            <ul className="space-y-1">
              {data.modelInfo.supportedHandlers.map((handler, i) => (
                <li key={i} className="font-mono text-[11px] text-slate-600">{handler}</li>
              ))}
            </ul>
          </TechnicalDisclosure>

          <TechnicalDisclosure summary="View full limitation details">
            <ul className="space-y-1">
              {limitationsList.map((limitation, i) => (
                <li key={i}>{limitation}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">Model package: {data.modelInfo.modelPackage}</p>
          </TechnicalDisclosure>
        </div>
      </section>

      {/* Cross-page CTAs */}
      <nav aria-label="Related pages" className="mb-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href="/predictions"
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
