import React from "react";
import type { ModelEvidenceCenterData } from "../lib/server-runtime";
import {
  getEvidenceState,
  getEvidenceProgress,
  formatEvidenceCount
} from "../lib/model-evidence-center";

interface ModelStatusSummaryProps {
  data: ModelEvidenceCenterData;
  modelVersion: string;
  formulaVersion: string;
}

function StatusBadge({ variant, label }: { variant: string; label: string }) {
  const classes: Record<string, string> = {
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-teal-200 bg-teal-50 text-teal-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800"
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes[variant] ?? classes.neutral}`}>
      {label}
    </span>
  );
}

export function ModelStatusSummary({ data, modelVersion, formulaVersion }: ModelStatusSummaryProps) {
  const evidenceState = getEvidenceState(data.stateKind);
  const progress = getEvidenceProgress(
    data.gateReport?.evidenceCounts.uniqueEvaluatedFixtures ?? 0
  );

  const persistenceLabel =
    data.persistenceMetadata === null
      ? "Not configured"
      : data.persistenceMetadata.persistent
      ? "PostgreSQL"
      : "In-memory (ephemeral)";

  const evidenceVariant =
    data.stateKind === "usable"
      ? "success"
      : data.stateKind === "persistence_error" || data.stateKind === "data_quality_blocked"
      ? "warning"
      : "neutral";

  return (
    <section
      id="model-status"
      aria-labelledby="model-status-heading"
      className="mb-8 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="model-status-heading" className="text-base font-semibold text-slate-950">
          Model status
        </h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge variant="success" label="Production active" />
          <StatusBadge variant={evidenceVariant} label={evidenceState.label} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Formula version</dt>
          <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">{formulaVersion}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Model version</dt>
          <dd className="mt-0.5 break-all font-mono text-xs font-semibold text-slate-700">{modelVersion}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Active preset</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">Balanced (V2)</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Persistence</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">{persistenceLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Stored snapshots</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {formatEvidenceCount(data.snapshotCount, "snapshot")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Evaluated fixtures</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {formatEvidenceCount(
              data.gateReport?.evidenceCounts.uniqueEvaluatedFixtures ?? data.evaluationCount,
              "fixture"
            )}
          </dd>
        </div>
        {data.gateReport !== null && (
          <div>
            <dt className="text-xs text-slate-500">Gate verdict</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{data.gateReport.decision.replace(/_/g, " ")}</dd>
          </div>
        )}
        {data.gateReport !== null && (
          <div>
            <dt className="text-xs text-slate-500">Evidence updated</dt>
            <dd className="mt-0.5 text-xs text-slate-600">
              {new Date(data.gateReport.generatedAt).toUTCString()}
            </dd>
          </div>
        )}
      </dl>

      {/* Evidence progress toward minimum threshold */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-1.5 text-xs text-slate-500">
          Evidence collection — {progress.label}
        </p>
        <div
          role="progressbar"
          aria-valuenow={progress.current}
          aria-valuemin={0}
          aria-valuemax={progress.threshold}
          aria-label={progress.label}
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-all ${progress.complete ? "bg-teal-500" : "bg-amber-400"}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {data.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          {data.warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-900">{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
