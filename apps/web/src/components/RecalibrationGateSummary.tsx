import React from "react";
import type { LiveEvidenceGateReport } from "@world-cup-2026-predictor/api";
import { getVerdictPresentation, getRecalibrationProgress } from "../lib/model-evidence-center";

interface RecalibrationGateSummaryProps {
  gateReport: LiveEvidenceGateReport | null;
}

const STATUS_CLASSES = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-teal-200 bg-teal-50 text-teal-800",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-800"
} as const;

const BADGE_CLASSES = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-100 text-blue-800",
  success: "bg-teal-100 text-teal-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800"
} as const;

export function RecalibrationGateSummary({ gateReport }: RecalibrationGateSummaryProps) {
  if (gateReport === null) {
    return (
      <section
        id="model-recalibration"
        aria-labelledby="model-recalibration-heading"
        className="mb-8"
      >
        <h2 id="model-recalibration-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Recalibration gate
        </h2>
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Gate report unavailable</p>
          <p className="mt-1.5 text-xs text-slate-500">
            The recalibration gate could not be evaluated. Evidence may be insufficient or
            persistence may be unavailable.
          </p>
        </div>
      </section>
    );
  }

  const verdict = getVerdictPresentation(gateReport.decision);
  const recalibrationProgress = getRecalibrationProgress(
    gateReport.evidenceCounts.uniqueEvaluatedFixtures
  );
  const bannerClass = STATUS_CLASSES[verdict.statusVariant];
  const badgeClass = BADGE_CLASSES[verdict.statusVariant];

  return (
    <section
      id="model-recalibration"
      aria-labelledby="model-recalibration-heading"
      className="mb-8"
    >
      <h2 id="model-recalibration-heading" className="mb-4 text-lg font-semibold text-slate-950">
        Recalibration gate
      </h2>

      {/* Verdict banner */}
      <div className={`rounded-lg border px-5 py-4 ${bannerClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">{verdict.title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
            {gateReport.decision.replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-1.5 text-xs">{verdict.explanation}</p>
        <p className="mt-2 text-xs">
          <strong className="font-semibold">Next action:</strong> {verdict.nextAction}
        </p>
        {!verdict.preserveModel && (
          <p className="mt-2 rounded border border-current bg-white/30 px-3 py-1.5 text-xs font-semibold">
            Model change may be warranted — see next-action guidance above.
          </p>
        )}
      </div>

      {/* Recalibration threshold progress */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Recalibration threshold — {recalibrationProgress.label}
        </p>
        <div
          role="progressbar"
          aria-valuenow={recalibrationProgress.current}
          aria-valuemin={0}
          aria-valuemax={recalibrationProgress.threshold}
          aria-label={recalibrationProgress.label}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-all ${
              recalibrationProgress.complete ? "bg-teal-500" : "bg-slate-400"
            }`}
            style={{ width: `${recalibrationProgress.percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          {recalibrationProgress.threshold} unique evaluated fixtures required before any recalibration recommendation is considered credible.
        </p>
      </div>

      {/* Decision reasons and findings */}
      {gateReport.decisionReasons.length > 0 && (
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Gate decision reasons ({gateReport.decisionReasons.length})
          </summary>
          <ul className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
            {gateReport.decisionReasons.map((reason, i) => (
              <li key={i} className="text-xs text-slate-600">{reason}</li>
            ))}
          </ul>
        </details>
      )}

      {gateReport.blockedReasons.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-amber-700 hover:text-amber-900 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Blocked reasons ({gateReport.blockedReasons.length})
          </summary>
          <ul className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            {gateReport.blockedReasons.map((reason, i) => (
              <li key={i} className="text-xs text-amber-800">{reason}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Next recommended phase */}
      {gateReport.nextRecommendedPhase.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          <strong className="font-semibold">Next recommended phase:</strong> {gateReport.nextRecommendedPhase}
        </p>
      )}

      <p className="mt-2 text-[10px] text-slate-400">
        No recalibration is performed automatically. All model changes require a dedicated named phase with full evidence documentation.
      </p>
    </section>
  );
}
