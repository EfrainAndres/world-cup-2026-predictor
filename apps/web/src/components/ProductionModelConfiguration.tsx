import React from "react";
import { getProductionModelConfig } from "../lib/model-evidence-center";

export function ProductionModelConfiguration() {
  const cfg = getProductionModelConfig();

  return (
    <section
      id="model-configuration"
      aria-labelledby="model-config-heading"
      className="mb-8"
    >
      <h2 id="model-config-heading" className="mb-4 text-lg font-semibold text-slate-950">
        Production model configuration
      </h2>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Primary identifiers */}
        <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Formula version</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">Elo-to-xG {cfg.formulaVersion.toUpperCase()}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Active preset</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{cfg.elo.preset} (default)</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tournament-form adjustment</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {cfg.tournamentFormEnabledByDefault ? "On by default" : "Off by default"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tournament-result adjustment</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {cfg.tournamentResultAdjustmentEnabledByDefault ? "On by default" : "Off by default"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">V1 rollback available</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {cfg.elo.v1RollbackAvailable ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Manual xG mode</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {cfg.manualXgModeAvailable ? "Available" : "Not available"}
            </dd>
          </div>
        </dl>

        {/* Technical details behind disclosure */}
        <details className="group border-t border-slate-100">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Full formula parameters and Poisson configuration
          </summary>
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Elo-to-xG V2 balanced parameters
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs" aria-label="Elo-to-xG V2 parameters">
                <caption className="sr-only">Elo-to-xG V2 balanced preset production constants</caption>
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th scope="col" className="py-2 pl-0 pr-4 text-left font-semibold text-slate-600">Parameter</th>
                    <th scope="col" className="py-2 pr-4 text-right font-semibold text-slate-600">V2 (active)</th>
                    <th scope="col" className="py-2 pr-0 text-right font-semibold text-slate-400">V1 (rollback)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 pr-4">Adjustment per 100 Elo</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900 tabular-nums">{cfg.elo.adjustmentPer100}</td>
                    <td className="py-2 pr-0 text-right tabular-nums text-slate-400">{cfg.elo.v1AdjustmentPer100}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Max xG adjustment</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900 tabular-nums">{cfg.elo.maxAdjustment}</td>
                    <td className="py-2 pr-0 text-right tabular-nums text-slate-400">{cfg.elo.v1MaxAdjustment}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Base xG (neutral)</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900 tabular-nums">{cfg.elo.baseGoals}</td>
                    <td className="py-2 pr-0 text-right tabular-nums text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Min xG bound</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900 tabular-nums">{cfg.elo.minGoals}</td>
                    <td className="py-2 pr-0 text-right tabular-nums text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Max xG bound</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-900 tabular-nums">{cfg.elo.maxGoals}</td>
                    <td className="py-2 pr-0 text-right tabular-nums text-slate-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Poisson score matrix
            </p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Matrix max goals per team</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">{cfg.poisson.matrixMaxGoals}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Matrix normalization</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{cfg.poisson.normalizeMatrix ? "Enabled" : "Disabled"}</dd>
              </div>
            </dl>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Model version string
            </p>
            <p className="break-all rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-700">
              {cfg.modelVersion}
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
