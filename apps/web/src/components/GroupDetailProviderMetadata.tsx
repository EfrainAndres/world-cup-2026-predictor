import React from "react";
import type { WorldCup2026GroupDetailProviderMetadata } from "../lib/api-client";
import { formatUtcTimestamp } from "../lib/daily-matches-ui";

interface GroupDetailProviderMetadataProps {
  metadata: WorldCup2026GroupDetailProviderMetadata;
}

export function GroupDetailProviderMetadata({ metadata }: GroupDetailProviderMetadataProps) {
  const isWarning = metadata.localFallbackUsed || metadata.stale;

  return (
    <div
      className={`rounded-lg border p-4 ${isWarning ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
      aria-label="Data source summary"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data source</p>
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

      {metadata.localFallbackUsed && (
        <p className="mt-3 text-xs font-medium text-amber-900">
          Local static fallback is active. This data does not reflect live provider results.
        </p>
      )}
      {!metadata.localFallbackUsed && metadata.stale && (
        <p className="mt-3 text-xs font-medium text-amber-900">
          Cached data may be stale. Provider results may not be current.
        </p>
      )}
    </div>
  );
}
