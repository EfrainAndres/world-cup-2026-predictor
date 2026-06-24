import React from "react";
import type { HealthResponse, ModelInfoResponse } from "@world-cup-2026-predictor/api";
import type { ProductionRuntimeDiagnostics } from "../lib/server-runtime";
import { StatusPill } from "./StatusPill";

interface ModelStatusCardProps {
  health: HealthResponse;
  modelInfo: ModelInfoResponse;
  runtimeDiagnostics?: ProductionRuntimeDiagnostics;
}

function getExternalServicesLabel(runtimeDiagnostics: ProductionRuntimeDiagnostics | undefined, fallbackEnabled: boolean): string {
  if (runtimeDiagnostics === undefined) return fallbackEnabled ? "Enabled" : "Disabled";
  if (runtimeDiagnostics.externalProviderActive) return "Live provider active";
  if (runtimeDiagnostics.cacheUsed) return "Cached provider data";
  if (runtimeDiagnostics.localFallbackUsed) return "Local fallback";
  if (runtimeDiagnostics.resultsProviderConfigured) return "Configured, unavailable";
  return "Disabled";
}

function getDatabaseLabel(runtimeDiagnostics: ProductionRuntimeDiagnostics | undefined, fallbackEnabled: boolean): string {
  if (runtimeDiagnostics === undefined) return fallbackEnabled ? "Enabled" : "Disabled";
  if (runtimeDiagnostics.databaseConnected) return "Connected";
  if (runtimeDiagnostics.persistenceProviderConfigured) return "Configured, unavailable";
  return "Disabled";
}

export function ModelStatusCard({ health, modelInfo, runtimeDiagnostics }: ModelStatusCardProps) {
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
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <dd className="mt-1 font-semibold text-slate-900">
            {getExternalServicesLabel(runtimeDiagnostics, health.metadata.externalServicesEnabled)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Database</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {getDatabaseLabel(runtimeDiagnostics, modelInfo.metadata.databaseEnabled)}
          </dd>
        </div>
      </dl>
      {runtimeDiagnostics !== undefined && (
        <dl className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Active provider</dt>
            <dd className="mt-1 font-semibold text-slate-900">{runtimeDiagnostics.activeProvider}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fixtures with kickoff</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {runtimeDiagnostics.fixturesWithKickoff} / {runtimeDiagnostics.fixtureCount}
            </dd>
          </div>
        </dl>
      )}
      <ul className="mt-6 space-y-2 text-sm leading-6 text-slate-600">
        {modelInfo.limitations.slice(0, 3).map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
