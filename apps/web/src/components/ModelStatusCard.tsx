import type { HealthResponse, ModelInfoResponse } from "@world-cup-2026-predictor/api";
import { StatusPill } from "./StatusPill";

interface ModelStatusCardProps {
  health: HealthResponse;
  modelInfo: ModelInfoResponse;
}

export function ModelStatusCard({ health, modelInfo }: ModelStatusCardProps) {
  return (
    <section aria-labelledby="model-status-title" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Model status</p>
          <h3 id="model-status-title" className="mt-1 text-xl font-semibold text-slate-950">
            API and model foundation are available
          </h3>
        </div>
        <StatusPill label={health.status === "ok" ? "Operational" : "Needs review"} tone={health.status === "ok" ? "success" : "warning"} />
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-slate-500">API mode</dt>
          <dd className="mt-1 font-semibold text-slate-900">{health.metadata.mode.replace("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Model package</dt>
          <dd className="mt-1 font-semibold text-slate-900">{modelInfo.modelPackage}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">External services</dt>
          <dd className="mt-1 font-semibold text-slate-900">{health.metadata.externalServicesEnabled ? "Enabled" : "Disabled"}</dd>
        </div>
      </dl>
      <ul className="mt-6 space-y-2 text-sm leading-6 text-slate-600">
        {modelInfo.limitations.slice(0, 3).map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
