import type { HistoricalReplayAuditResponse } from "@world-cup-2026-predictor/api";
import { StatusPill } from "./StatusPill";

interface HistoricalReplayAuditPreviewCardProps {
  audit: HistoricalReplayAuditResponse;
}

export function HistoricalReplayAuditPreviewCard({ audit }: HistoricalReplayAuditPreviewCardProps) {
  const metrics = [
    ["Brier Score", audit.metricAvailability.brierScore],
    ["Log Loss", audit.metricAvailability.logLoss],
    ["Top-1 hit", audit.metricAvailability.top1Hit],
    ["Top-3 hit", audit.metricAvailability.top3Hit],
    ["Top-5 hit", audit.metricAvailability.top5Hit]
  ] as const;

  return (
    <section id="replay-audit" aria-labelledby="replay-audit-title" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Historical replay audit</p>
          <h3 id="replay-audit-title" className="mt-1 text-xl font-semibold text-slate-950">
            Ready with documented warnings
          </h3>
        </div>
        <StatusPill label={audit.apiReadiness.replaceAll("_", " ")} tone="warning" />
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {metrics.map(([label, available]) => (
          <div key={label} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="text-sm font-semibold text-slate-950">{available ? "Available" : "Missing"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Foundation warning</p>
        <p className="mt-2 text-sm leading-6 text-amber-950">{audit.warnings[0]}</p>
      </div>
    </section>
  );
}
