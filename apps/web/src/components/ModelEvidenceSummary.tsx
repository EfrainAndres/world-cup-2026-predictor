import React from "react";
import type { WorldCup2026ModelRealitySummary } from "@world-cup-2026-predictor/api";
import type { ModelEvidenceStateKind } from "../lib/model-evidence-center";
import {
  formatEvidencePercent,
  formatEvidenceGoals,
  formatEvidenceDecimal,
  formatSampleSize
} from "../lib/model-evidence-center";

interface MetricCardProps {
  label: string;
  value: string;
  subLabel?: string;
}

function MetricCard({ label, value, subLabel }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value}</dd>
      {subLabel !== undefined && (
        <dd className="mt-0.5 text-[10px] text-slate-400">{subLabel}</dd>
      )}
    </div>
  );
}

interface EmptyStateProps {
  stateKind: ModelEvidenceStateKind;
}

function EvidenceEmptyState({ stateKind }: EmptyStateProps) {
  const messages: Record<ModelEvidenceStateKind, { title: string; detail: string }> = {
    no_persistence_configured: {
      title: "No persistent storage configured",
      detail:
        "Model-vs-reality metrics require a PostgreSQL persistence backend. Pre-match snapshots and post-match evaluations are stored there."
    },
    persistence_error: {
      title: "Evidence storage unavailable",
      detail:
        "Persistence is configured but could not be accessed. Metrics will appear here once storage is reachable."
    },
    no_evidence: {
      title: "No evidence yet",
      detail:
        "No evaluated matches are stored. Capture pre-match snapshots before kickoff, then evaluate them after the final whistle."
    },
    insufficient: {
      title: "Insufficient evidence",
      detail:
        "Fewer than the minimum evaluated fixtures needed for meaningful metrics. Continue evidence collection."
    },
    data_quality_blocked: {
      title: "Data quality check failed",
      detail:
        "Evidence exists but data quality thresholds are not met. Review the gate verdict for details."
    },
    usable: {
      title: "Evidence available",
      detail: "Metrics are computed from the available evaluated fixtures."
    }
  };

  const msg = messages[stateKind] ?? messages.no_evidence;

  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{msg.title}</p>
      <p className="mt-1.5 text-xs text-slate-500">{msg.detail}</p>
    </div>
  );
}

interface ModelEvidenceSummaryProps {
  realitySummary: WorldCup2026ModelRealitySummary | null;
  stateKind: ModelEvidenceStateKind;
}

export function ModelEvidenceSummary({ realitySummary, stateKind }: ModelEvidenceSummaryProps) {
  const isUsable = stateKind === "usable" && realitySummary !== null;

  return (
    <section
      id="model-evidence"
      aria-labelledby="model-evidence-heading"
      className="mb-8"
    >
      <h2 id="model-evidence-heading" className="mb-4 text-lg font-semibold text-slate-950">
        Model-vs-reality evidence
      </h2>

      {!isUsable ? (
        <EvidenceEmptyState stateKind={stateKind} />
      ) : (
        <>
          <div className="mb-2 text-xs text-slate-400">
            {formatSampleSize(realitySummary.evaluationsCount)} evaluated fixtures
          </div>

          {/* Primary outcome metrics */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard
              label="1X2 outcome accuracy"
              value={formatEvidencePercent(realitySummary.outcomeAccuracy)}
              subLabel="home / draw / away correct"
            />
            <MetricCard
              label="Draw accuracy"
              value={formatEvidencePercent(realitySummary.drawAccuracy)}
              subLabel="draw predictions correct"
            />
            <MetricCard
              label="Exact-score accuracy"
              value={formatEvidencePercent(realitySummary.exactScoreAccuracy)}
              subLabel="modal scoreline correct"
            />
            <MetricCard
              label="Mean Brier score"
              value={formatEvidenceDecimal(realitySummary.meanBrierScore, 4)}
              subLabel="lower is better (0–2)"
            />
          </dl>

          {/* Goal error metrics */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Goal absolute errors</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Home goals MAE</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                  {formatEvidenceGoals(realitySummary.meanHomeGoalAbsoluteError)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Away goals MAE</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                  {formatEvidenceGoals(realitySummary.meanAwayGoalAbsoluteError)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Total goals MAE</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                  {formatEvidenceGoals(realitySummary.meanTotalGoalAbsoluteError)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Goal diff MAE</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                  {formatEvidenceGoals(realitySummary.meanGoalDifferenceAbsoluteError)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[10px] italic text-slate-400">
              MAE = Mean Absolute Error. Lower is better. Goal values are goals per match.
            </p>
          </div>

          {/* By-confidence breakdown */}
          {realitySummary.byConfidenceLevel.length > 0 && (
            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
                Accuracy by confidence level ({realitySummary.byConfidenceLevel.length} segments)
              </summary>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-xs" aria-label="Accuracy by confidence level">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th scope="col" className="py-2 pl-4 pr-3 text-left font-semibold text-slate-600">Confidence</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Count</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Outcome acc.</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Brier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {realitySummary.byConfidenceLevel.map((row) => (
                      <tr key={row.confidenceLevel}>
                        <td className="py-2 pl-4 pr-3 capitalize text-slate-700">
                          {row.confidenceLevel.replace("_", " ")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{row.evaluationsCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {formatEvidencePercent(row.outcomeAccuracy)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {formatEvidenceDecimal(row.meanBrierScore, 4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Log loss note */}
          <p className="mt-3 text-[10px] text-slate-400">
            Mean log loss: {formatEvidenceDecimal(realitySummary.meanLogLoss, 4)}. Log loss penalises overconfident wrong predictions. Brier score is preferred for human-facing interpretation.
          </p>
        </>
      )}
    </section>
  );
}
