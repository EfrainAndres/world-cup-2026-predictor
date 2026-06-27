import React from "react";
import {
  getConfidenceLevelPresentation,
  getCoverageTypePresentation
} from "../lib/model-evidence-center";
import type { PredictionConfidenceLevel, PredictionCoverageType } from "@world-cup-2026-predictor/api";

const CONFIDENCE_LEVELS: PredictionConfidenceLevel[] = ["high", "medium", "low", "very_low"];
const COVERAGE_TYPES: PredictionCoverageType[] = ["full", "partial", "fallback", "fallback_only"];

const LEVEL_BADGE_CLASSES: Record<PredictionConfidenceLevel, string> = {
  high: "bg-teal-100 text-teal-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-amber-100 text-amber-800",
  very_low: "bg-red-100 text-red-800"
};

export function ConfidenceCoverageGuide() {
  return (
    <section
      id="model-confidence"
      aria-labelledby="model-confidence-heading"
      className="mb-8"
    >
      <h2 id="model-confidence-heading" className="mb-4 text-lg font-semibold text-slate-950">
        Confidence and data coverage
      </h2>

      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <strong className="font-semibold">Important:</strong> Confidence describes input data quality and coverage, not the probability that the prediction will be correct. High confidence does not guarantee accuracy.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Confidence levels */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Confidence levels</h3>
          <dl className="space-y-3">
            {CONFIDENCE_LEVELS.map((level) => {
              const p = getConfidenceLevelPresentation(level);
              return (
                <div key={level}>
                  <dt className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${LEVEL_BADGE_CLASSES[level]}`}>
                      {p.label}
                    </span>
                  </dt>
                  <dd className="mt-1 text-xs text-slate-600">{p.description}</dd>
                  <dd className="mt-0.5 text-[10px] italic text-slate-400">{p.note}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Coverage types */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Coverage types</h3>
          <dl className="space-y-3">
            {COVERAGE_TYPES.map((type) => {
              const p = getCoverageTypePresentation(type);
              return (
                <div key={type}>
                  <dt className="text-xs font-semibold text-slate-700">{p.label}</dt>
                  <dd className="mt-0.5 text-xs text-slate-500">{p.description}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      {/* Fallback behavior */}
      <details className="group mt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          Fallback behavior and manual xG recommendation
        </summary>
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>Teams without direct Elo coverage receive a <strong className="font-semibold">seed fallback rating of 1500</strong>. A fallback team can still produce a valid prediction, but the confidence layer makes the limitation explicit.</p>
          <p>When confidence is <strong className="font-semibold">low</strong> or <strong className="font-semibold">very low</strong>, <abbr title="Expected Goals">xG</abbr> values are automatically flagged as candidates for manual review. Manual xG mode lets you supply custom expected-goal values — it bypasses automated Elo-derived confidence metadata.</p>
          <p>The current international dataset is curated and marked partial. Most real predictions will reach <strong className="font-semibold">partial</strong> coverage rather than <strong className="font-semibold">full</strong>. This is expected behavior, not an error.</p>
        </div>
      </details>
    </section>
  );
}
