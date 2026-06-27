import React from "react";

const PIPELINE_STEPS = [
  {
    number: 1,
    title: "Resolve canonical teams",
    detail: "Provider team names are canonicalized to official FIFA names using an alias map covering all 48 WC2026 teams."
  },
  {
    number: 2,
    title: "Load baseline or live Elo",
    detail: "Live Elo ratings are computed from 256 WC fixtures (2010–2022) plus an expanded international supplement. Teams without direct coverage receive a seed fallback rating."
  },
  {
    number: 3,
    title: "Apply Elo-to-xG conversion (V2)",
    detail: "Elo difference is converted to expected goals using the V2 calibrated formula: base 1.25 xG each, ±0.15 per 100 Elo points, capped at ±0.65. Tournament-form adjustment is off by default."
  },
  {
    number: 4,
    title: "Build score probability matrix",
    detail: "A Poisson score matrix up to 7 goals per side is computed from the expected goal values. The matrix is normalized to sum to 1.0."
  },
  {
    number: 5,
    title: "Aggregate 1X2 probabilities",
    detail: "Home win, draw, and away win probabilities are summed from the matrix. These are the primary outcome predictions."
  },
  {
    number: 6,
    title: "Select likely scorelines",
    detail: "The top-N most probable exact scorelines are ranked by probability, then by lower total goals, then lower home goals."
  },
  {
    number: 7,
    title: "Attach confidence and coverage metadata",
    detail: "Confidence (high/medium/low/very_low) and coverage type (full/partial/fallback/fallback_only) are assigned based on data quality. Manual xG review is recommended for low confidence."
  },
  {
    number: 8,
    title: "Optionally persist immutable snapshot",
    detail: "A pre-match snapshot can be stored before kickoff. Snapshots are immutable, look-ahead-free, and idempotent. They are the foundation for Model-vs-Reality evaluation."
  }
] as const;

export function PredictionPipelineOverview() {
  return (
    <section
      id="model-pipeline"
      aria-labelledby="model-pipeline-heading"
      className="mb-8"
    >
      <h2 id="model-pipeline-heading" className="mb-4 text-lg font-semibold text-slate-950">
        How predictions are produced
      </h2>

      <ol className="space-y-0 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
        {PIPELINE_STEPS.map((step) => (
          <li key={step.number} className="flex gap-4 px-4 py-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white"
              aria-label={`Step ${step.number}`}
            >
              {step.number}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        <strong className="font-semibold text-slate-700">Optional:</strong> Tournament-form adjustment summarizes completed WC2026 results into bounded secondary signals. It is off by default unless explicitly requested. Manual xG mode bypasses automated Elo-derived confidence.
      </div>
    </section>
  );
}
