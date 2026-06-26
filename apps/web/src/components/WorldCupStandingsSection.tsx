"use client";

import { useState } from "react";
import type { WorldCup2026LiveGroupStandingsResponse, WorldCup2026StandingsMode } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";
import { WorldCupStandingsTable } from "./WorldCupStandingsTable";

interface WorldCupStandingsSectionProps {
  standingsFoundation: WorldCup2026LiveGroupStandingsResponse;
}

interface ModeTab {
  mode: WorldCup2026StandingsMode;
  label: string;
  sublabel: string;
  disabled: boolean;
  disabledReason?: string;
}

export function WorldCupStandingsSection({ standingsFoundation }: WorldCupStandingsSectionProps) {
  const [activeMode, setActiveMode] = useState<WorldCup2026StandingsMode>("official");

  const hasLive = standingsFoundation.provisionalGroups !== null;
  const hasProjected = standingsFoundation.projectedGroups !== null;

  const tabs: ModeTab[] = [
    {
      mode: "official",
      label: "Official",
      sublabel: "Completed matches only",
      disabled: false
    },
    {
      mode: "live_provisional",
      label: "Live provisional",
      sublabel: hasLive ? "Includes current live scores" : "No live matches",
      disabled: !hasLive,
      disabledReason: hasLive ? undefined : "No active live or halftime matches"
    },
    {
      mode: "projected",
      label: "Projected",
      sublabel: hasProjected ? "Includes model outcomes" : "Not yet available",
      disabled: !hasProjected,
      disabledReason: hasProjected ? undefined : "Projected standings not yet implemented"
    }
  ];

  const activeGroups =
    activeMode === "live_provisional" && hasLive
      ? standingsFoundation.provisionalGroups!
      : activeMode === "projected" && hasProjected
        ? standingsFoundation.projectedGroups!
        : standingsFoundation.officialGroups;

  const isProvisional = activeMode === "live_provisional" && hasLive;
  const isProjected = activeMode === "projected" && hasProjected;

  return (
    <section id="world-cup-standings" aria-labelledby="world-cup-standings-title" className="py-8">
      <SectionHeader
        eyebrow="Group standings"
        titleId="world-cup-standings-title"
        title="World Cup 2026 Group Standings"
        description="Official standings use completed matches only. Live provisional standings include current scores from active matches when available."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Live group standings</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{standingsFoundation.tournamentName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isProvisional && <StatusPill label="Provisional" tone="warning" />}
            {isProjected && <StatusPill label="Projected" tone="warning" />}
            {!isProvisional && !isProjected && <StatusPill label="Official" tone="neutral" />}
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Groups</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{standingsFoundation.groupCount} groups</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Completed fixtures</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{standingsFoundation.completedMatchCount}</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Live matches</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">
              {standingsFoundation.activeLiveMatchCount > 0
                ? standingsFoundation.activeLiveMatchCount
                : "None active"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
            Results source: {standingsFoundation.resultProvider.providerName}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
            External provider: {standingsFoundation.resultProvider.externalProviderEnabled ? "enabled" : "disabled"}
          </span>
          {standingsFoundation.syncMetadata.lastSuccessfulSync !== undefined && (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
              Last sync: {standingsFoundation.syncMetadata.lastSuccessfulSync}
            </span>
          )}
        </div>

        {standingsFoundation.syncMetadata.cacheUsed && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-950">Stale cache warning</p>
            <p className="mt-1 text-sm text-amber-900">
              Standings data was served from cache. The live provider may be temporarily unavailable.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Standings mode">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            role="tab"
            aria-selected={activeMode === tab.mode && !tab.disabled}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => {
              if (!tab.disabled) setActiveMode(tab.mode);
            }}
            title={tab.disabled ? tab.disabledReason : undefined}
            className={[
              "flex min-w-[9rem] flex-col items-start rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              tab.disabled
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                : activeMode === tab.mode
                  ? "border-teal-300 bg-teal-50 text-teal-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            ].join(" ")}
          >
            <span className="font-semibold">{tab.label}</span>
            <span className="mt-0.5 text-xs text-slate-500">{tab.sublabel}</span>
          </button>
        ))}
      </div>

      {isProvisional && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Provisional standings</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            These standings include current live scores from {standingsFoundation.activeLiveMatchCount} active{" "}
            {standingsFoundation.activeLiveMatchCount === 1 ? "match" : "matches"}. They are not official until all live
            matches are completed and confirmed.
          </p>
        </div>
      )}

      {isProjected && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-950">Projected standings</p>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            These standings include model outcome projections for remaining fixtures. Projected standings are not official
            and are based on the Elo-based model used for pre-match predictions.
          </p>
        </div>
      )}

      {!isProvisional && !isProjected && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Official standings</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Standings are calculated from completed matches only. Scheduled fixtures are excluded.
            Tie-breaking uses points, goal difference, goals for, then team name.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {activeGroups.map((group) => (
          <WorldCupStandingsTable key={group.group} group={group} />
        ))}
      </div>
    </section>
  );
}
