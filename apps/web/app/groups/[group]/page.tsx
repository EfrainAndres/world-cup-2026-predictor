import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "../../../src/components/AppHeader";
import { GroupDetailMatchCard } from "../../../src/components/GroupDetailMatchCard";
import { GroupDetailProviderMetadata } from "../../../src/components/GroupDetailProviderMetadata";
import { GroupDetailProjection } from "../../../src/components/GroupDetailProjection";
import { GroupDetailQualificationSummary } from "../../../src/components/GroupDetailQualificationSummary";
import { GroupDetailStandingsTable } from "../../../src/components/GroupDetailStandingsTable";
import { GroupNav } from "../../../src/components/GroupNav";
import { getDashboardGroupDetail } from "../../../src/lib/api-client";
import { DAILY_MATCHES_DISPLAY_TIMEZONE } from "../../../src/lib/daily-matches-ui";
import { getGroupProjectionFromCache, setGroupProjectionInCache } from "../../../src/lib/group-projection-cache";
import type { WorldCup2026GroupDetailMatch } from "../../../src/lib/api-client";

const VALID_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
type ValidGroup = (typeof VALID_GROUPS)[number];

function isValidGroup(g: string): g is ValidGroup {
  return (VALID_GROUPS as readonly string[]).includes(g);
}

export function generateStaticParams(): { group: string }[] {
  return VALID_GROUPS.map((group) => ({ group }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ group: string }>;
}): Promise<Metadata> {
  const { group } = await params;
  const normalized = group.toUpperCase();
  if (!isValidGroup(normalized)) return { title: "Not Found · World Cup 2026 Predictor" };
  return { title: `Group ${normalized} · World Cup 2026 Predictor` };
}

interface MatchSectionProps {
  title: string;
  matches: readonly WorldCup2026GroupDetailMatch[];
  emptyMessage: string;
}

function MatchSection({ title, matches, emptyMessage }: MatchSectionProps) {
  if (matches.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <GroupDetailMatchCard key={match.fixtureId} match={match} />
        ))}
      </div>
    </div>
  );
}

export default async function GroupDetailPage({
  params
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const normalized = group.toUpperCase();

  if (!isValidGroup(normalized)) {
    notFound();
  }

  let data;
  try {
    const previousProjection = getGroupProjectionFromCache(normalized, DAILY_MATCHES_DISPLAY_TIMEZONE);
    data = await getDashboardGroupDetail({
      group: normalized,
      timezone: DAILY_MATCHES_DISPLAY_TIMEZONE,
      ...(previousProjection !== undefined ? { previousProjection } : {})
    });
    setGroupProjectionInCache(normalized, DAILY_MATCHES_DISPLAY_TIMEZONE, data.projection);
  } catch {
    notFound();
  }

  const { standings, matches, qualification, projection, providerMetadata, warnings, generatedAt } = data;
  const hasPostponedOrCancelled = matches.postponed.length > 0 || matches.cancelled.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb + group nav */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-medium text-teal-700 hover:underline">
              ← Dashboard
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600">Group {normalized}</span>
          </div>
          <GroupNav currentGroup={normalized} />
        </div>

        {/* Heading */}
        <section aria-labelledby="group-heading" className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Group stage</p>
          <h1 id="group-heading" className="mt-1 text-3xl font-semibold text-slate-950 sm:text-4xl">
            World Cup 2026 · Group {normalized}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Timezone: {DAILY_MATCHES_DISPLAY_TIMEZONE} · Generated: {new Date(generatedAt).toUTCString()}
          </p>
        </section>

        {/* Data source summary */}
        <section aria-labelledby="source-summary-heading" className="mb-8">
          <h2 id="source-summary-heading" className="sr-only">Data source summary</h2>
          <GroupDetailProviderMetadata metadata={providerMetadata} />
        </section>

        {/* Official standings */}
        <section aria-labelledby="official-standings-heading" className="mb-8">
          <h2 id="official-standings-heading" className="mb-3 text-lg font-semibold text-slate-950">
            Official standings
          </h2>
          <GroupDetailStandingsTable standings={standings.official} label="Official standings" />
        </section>

        {/* Live provisional standings (conditional) */}
        {standings.liveAvailable && standings.liveProvisional !== undefined && (
          <section aria-labelledby="provisional-standings-heading" className="mb-8">
            <h2 id="provisional-standings-heading" className="mb-1 text-lg font-semibold text-slate-950">
              Live provisional standings
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              Current live scores are included. This view does not replace official qualification status.
            </p>
            <GroupDetailStandingsTable standings={standings.liveProvisional} label="Live provisional standings" />
          </section>
        )}

        {/* Qualification summary */}
        <section aria-labelledby="qualification-heading" className="mb-8">
          <h2 id="qualification-heading" className="mb-3 text-lg font-semibold text-slate-950">
            Qualification
          </h2>
          <GroupDetailQualificationSummary qualification={qualification} />
        </section>

        {/* Projected standings */}
        <section aria-labelledby="projection-heading" className="mb-8">
          <GroupDetailProjection projection={projection} />
        </section>

        {/* Match sections */}
        <section aria-labelledby="matches-heading" className="mb-8 space-y-8">
          <h2 id="matches-heading" className="text-lg font-semibold text-slate-950">Matches</h2>

          {matches.live.length > 0 && (
            <MatchSection
              title="Live matches"
              matches={matches.live}
              emptyMessage="No live matches."
            />
          )}

          <MatchSection
            title="Completed matches"
            matches={matches.completed}
            emptyMessage="No completed matches yet."
          />

          <MatchSection
            title="Upcoming fixtures"
            matches={matches.upcoming}
            emptyMessage="No upcoming scheduled fixtures."
          />

          {hasPostponedOrCancelled && (
            <>
              {matches.postponed.length > 0 && (
                <MatchSection
                  title="Postponed fixtures"
                  matches={matches.postponed}
                  emptyMessage=""
                />
              )}
              {matches.cancelled.length > 0 && (
                <MatchSection
                  title="Cancelled fixtures"
                  matches={matches.cancelled}
                  emptyMessage=""
                />
              )}
            </>
          )}

          {matches.unscheduled.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700">Fixtures without kickoff metadata</p>
              <p className="mt-1 text-sm text-slate-500">
                {matches.unscheduled.length} fixture{matches.unscheduled.length === 1 ? "" : "s"} are scheduled but do not yet have kickoff time metadata.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.unscheduled.map((match) => (
                  <GroupDetailMatchCard key={match.fixtureId} match={match} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Provider and fallback warnings */}
        {warnings.length > 0 && (
          <section aria-labelledby="warnings-heading" className="mb-8">
            <h2 id="warnings-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Data warnings
            </h2>
            <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              {warnings.map((warning, i) => (
                <li key={i} className="text-sm text-amber-900">
                  {warning}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
