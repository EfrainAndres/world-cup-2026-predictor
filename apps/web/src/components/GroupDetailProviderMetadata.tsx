import React from "react";
import type { WorldCup2026GroupDetailProviderMetadata } from "../lib/api-client";
import { formatUtcTimestamp } from "../lib/daily-matches-ui";
import { summarizeProviderWarnings } from "../lib/technical-disclosure";
import { TechnicalDisclosure } from "./TechnicalDisclosure";

interface GroupDetailProviderMetadataProps {
  metadata: WorldCup2026GroupDetailProviderMetadata;
  warnings?: readonly string[];
  title?: string;
}

export function GroupDetailProviderMetadata({
  metadata,
  warnings = [],
  title = "Data source"
}: GroupDetailProviderMetadataProps) {
  const isWarning = metadata.localFallbackUsed || metadata.stale;
  const warningSummary = summarizeProviderWarnings(warnings, {
    cacheUsed: metadata.cacheUsed,
    localFallbackUsed: metadata.localFallbackUsed,
    stale: metadata.stale
  });

  return (
    <section
      className={`rounded-lg border p-4 ${isWarning ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
      aria-label="Data source summary"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Active provider</dt>
          <dd className="font-medium text-slate-950">{metadata.activeProvider}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Cache used</dt>
          <dd className="font-medium text-slate-950">{metadata.cacheUsed ? "Yes" : "No"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Local fallback</dt>
          <dd className="font-medium text-slate-950">{metadata.localFallbackUsed ? "Yes" : "No"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Stale</dt>
          <dd className="font-medium text-slate-950">{metadata.stale ? "Yes" : "No"}</dd>
        </div>
        {metadata.lastSuccessfulSync !== undefined && (
          <div className="flex justify-between gap-2 sm:col-span-2">
            <dt className="text-slate-500">Last sync</dt>
            <dd className="font-medium text-slate-950">{formatUtcTimestamp(metadata.lastSuccessfulSync)}</dd>
          </div>
        )}
      </dl>

      {warningSummary.notice !== null && (
        <div className="mt-3 rounded-md border border-amber-200 bg-white/70 px-3 py-2">
          <p className="text-xs font-semibold text-amber-900">Provider data notice</p>
          <p className="mt-1 text-sm text-amber-950">{warningSummary.notice}</p>
        </div>
      )}

      {warningSummary.summaryItems.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
          <ul className="mt-2 space-y-1.5">
            {warningSummary.summaryItems.map((item) => (
              <li key={item} className="text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warningSummary.rawWarnings.length > 0 && (
        <TechnicalDisclosure summary="View raw technical warnings" className="mt-3">
          <ul className="space-y-1.5 text-amber-900">
            {warningSummary.rawWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </TechnicalDisclosure>
      )}
    </section>
  );
}
