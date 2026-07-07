import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  buildWorldCup2026BestThirdPlaceRanking,
  getTeamVisualIdentity
} from "@world-cup-2026-predictor/api";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { GroupOverviewCard } from "../../src/components/GroupOverviewCard";
import { TeamIdentity } from "../../src/components/TeamIdentity";
import {
  buildDashboardStandingsFromSync,
  getDashboardLiveSyncResult
} from "../../src/lib/server-runtime";
import { formatGD, toBestThirdPlaceRankingInput } from "../../src/lib/groups-tournament-ui";
import { GroupDetailProviderMetadata } from "../../src/components/GroupDetailProviderMetadata";

export const metadata: Metadata = {
  title: "Groups · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function GroupsPage() {
  const syncResult = await getDashboardLiveSyncResult();
  const standings = buildDashboardStandingsFromSync(syncResult);

  const officialGroups = standings.officialGroups;
  const isLive = standings.activeLiveMatchCount > 0;

  const completedGroupCount = officialGroups.filter(
    (g) => g.pendingFixtureCount === 0 && g.completedFixtureCount > 0
  ).length;

  const bestThirdRanking = buildWorldCup2026BestThirdPlaceRanking(toBestThirdPlaceRankingInput(officialGroups));

  const resolvedGroupWinners = officialGroups
    .map((g) => g.standings[0])
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  const resolvedGroupRunnersUp = officialGroups
    .map((g) => g.standings[1])
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  const isOfficial = !standings.syncMetadata.localFallbackUsed && !standings.syncMetadata.cacheUsed;

  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <PageHeader
          eyebrow="World Cup 2026"
          title="Groups"
          description="Current standings, qualification status, and fixture progress for all 12 groups."
        />
      </div>

      {/* Tournament progress bar */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="flex flex-wrap gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Groups complete</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{completedGroupCount} / {officialGroups.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Matches played</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{standings.completedMatchCount}</dd>
            </div>
            {isLive && (
              <div>
                <dt className="text-xs text-slate-500">Live now</dt>
                <dd className="mt-0.5 font-semibold text-red-700">{standings.activeLiveMatchCount}</dd>
              </div>
            )}
          </dl>
          <div className="flex gap-1.5">
            {isLive && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Live
              </span>
            )}
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isOfficial ? "border-teal-200 bg-teal-50 text-teal-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {isOfficial ? "Official" : standings.syncMetadata.localFallbackUsed ? "Local fallback" : "Cached"}
            </span>
          </div>
        </div>
      </div>

      {/* Group overview grid */}
      <section aria-labelledby="groups-overview-heading" className="mb-8">
        <h2 id="groups-overview-heading" className="mb-4 text-base font-semibold text-slate-900">
          Group standings overview
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {officialGroups.map((group) => (
            <GroupOverviewCard
              key={group.group}
              group={group}
              isLive={isLive && group.standings.some((s) => s.played > 0)}
            />
          ))}
        </div>
      </section>

      {/* Qualification summary */}
      <section aria-labelledby="qualification-overview-heading" className="mb-8">
        <h2 id="qualification-overview-heading" className="mb-4 text-base font-semibold text-slate-900">
          Qualification overview
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Group winners ({resolvedGroupWinners.length} / {officialGroups.length})
              </p>
              {resolvedGroupWinners.length > 0 ? (
                <ul className="space-y-1.5">
                  {resolvedGroupWinners.map((entry) => (
                    <li key={entry.team} className="flex min-w-0 items-center gap-2">
                      <TeamIdentity
                        identity={getTeamVisualIdentity(entry.team)}
                        size="xs"
                        useShortName
                        className="min-w-0 flex-1"
                      />
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
                        {entry.points}pts
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No group stage matches played yet.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Runners-up ({resolvedGroupRunnersUp.length} / {officialGroups.length})
              </p>
              {resolvedGroupRunnersUp.length > 0 ? (
                <ul className="space-y-1.5">
                  {resolvedGroupRunnersUp.map((entry) => (
                    <li key={entry.team} className="flex min-w-0 items-center gap-2">
                      <TeamIdentity
                        identity={getTeamVisualIdentity(entry.team)}
                        size="xs"
                        useShortName
                        className="min-w-0 flex-1"
                      />
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
                        {entry.points}pts
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No runners-up determined yet.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Best third places (top 8 advance)
              </p>
              {bestThirdRanking.length > 0 ? (
                <ol className="space-y-1.5">
                  {bestThirdRanking.slice(0, 8).map((entry, i) => (
                    <li key={entry.team} className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${i < 8 ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
                        {i + 1}
                      </span>
                      <TeamIdentity
                        identity={getTeamVisualIdentity(entry.team)}
                        size="xs"
                        useShortName
                        className="min-w-0 flex-1"
                      />
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        {entry.points}pt {formatGD(entry.goalDifference)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500">Best-third-place ranking unavailable until group stage begins.</p>
              )}
              <p className="mt-2 text-[10px] text-slate-400">
                Ranked by: Pts → GD → GF → team name
              </p>
            </div>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {completedGroupCount === 0
              ? "Group stage has not yet begun. Qualification positions are undetermined."
              : completedGroupCount < officialGroups.length
              ? `${completedGroupCount} of ${officialGroups.length} groups complete. Remaining positions subject to change.`
              : "All group matches complete. Qualification positions are official."}
          </p>
        </div>
      </section>

      {/* Best third place detail */}
      {bestThirdRanking.length > 0 && (
        <section aria-labelledby="best-third-heading" className="mb-8">
          <h2 id="best-third-heading" className="mb-4 text-base font-semibold text-slate-900">
            Best third-place ranking
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm" aria-label="Best third-place ranking">
              <caption className="sr-only">Best third-place team ranking from all groups</caption>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th scope="col" className="py-2 pl-4 pr-3 text-left text-xs font-semibold uppercase text-slate-500">#</th>
                  <th scope="col" className="py-2 pr-3 text-left text-xs font-semibold uppercase text-slate-500">Team</th>
                  <th scope="col" className="py-2 pr-3 text-left text-xs font-semibold uppercase text-slate-500">Group</th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold uppercase text-slate-500">Pts</th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold uppercase text-slate-500">P</th>
                  <th scope="col" className="py-2 pl-2 pr-4 text-right text-xs font-semibold uppercase text-slate-500">GD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bestThirdRanking.map((entry, i) => (
                  <tr key={entry.team} className={i < 8 ? "" : "opacity-50"}>
                    <td className="py-2 pl-4 pr-3 text-xs font-semibold text-slate-500">
                      {i + 1}
                      {i < 8 && (
                        <span className="sr-only"> (qualifies)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <TeamIdentity
                        identity={getTeamVisualIdentity(entry.team)}
                        size="xs"
                        useShortName
                        className="min-w-0"
                      />
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-600">Grp {entry.group}</td>
                    <td className="px-2 py-2 text-right text-xs font-semibold text-slate-900">{entry.points}</td>
                    <td className="px-2 py-2 text-right text-xs text-slate-600">{entry.played}</td>
                    <td className="py-2 pl-2 pr-4 text-right text-xs text-slate-600">{formatGD(entry.goalDifference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Top 8 third-place teams qualify for the Round of 32. Tie-break order: points, goal difference, goals for, team name.
          </p>
        </section>
      )}

      {/* Activity summary */}
      <section aria-labelledby="activity-heading" className="mb-8">
        <h2 id="activity-heading" className="mb-3 text-base font-semibold text-slate-900">
          Group stage activity
        </h2>
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <dl className="flex flex-wrap gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Completed</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{standings.completedMatchCount}</dd>
            </div>
            {isLive && (
              <div>
                <dt className="text-xs text-slate-500">Live</dt>
                <dd className="mt-0.5 font-semibold text-red-700">{standings.activeLiveMatchCount}</dd>
              </div>
            )}
          </dl>
          <Link
            href="/matches"
            className="inline-flex min-h-[44px] items-center rounded-md border border-teal-600 bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
          >
            View all matches →
          </Link>
        </div>
      </section>

      <section aria-labelledby="groups-provider-heading" className="mb-8">
        <h2 id="groups-provider-heading" className="mb-3 text-base font-semibold text-slate-900">
          Provider data notice
        </h2>
        <GroupDetailProviderMetadata
          title="Data source"
          metadata={{
            configuredProvider: standings.syncMetadata.localFallbackUsed ? "local_static" : "football_data_org",
            activeProvider: standings.syncMetadata.activeProvider,
            cacheUsed: standings.syncMetadata.cacheUsed,
            localFallbackUsed: standings.syncMetadata.localFallbackUsed,
            stale: standings.syncMetadata.cacheUsed,
            ...(standings.syncMetadata.lastSuccessfulSync === undefined
              ? {}
              : { lastSuccessfulSync: standings.syncMetadata.lastSuccessfulSync })
          }}
          warnings={standings.warnings}
        />
      </section>
    </PageContainer>
  );
}
