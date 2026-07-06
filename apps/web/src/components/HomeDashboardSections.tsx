import React from "react";
import Link from "next/link";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type { OfficialKnockoutProjectionResult, WorldCup2026GroupStandings } from "@world-cup-2026-predictor/api";
import type {
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesSuccessResponse
} from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import {
  formatUtcTimestamp,
  getDailyMatchPredictionLabel,
  getDailyMatchHistoryState,
  getDailyMatchStateLabel,
} from "../lib/daily-matches-ui";
import { buildMatchResultDisplay } from "../lib/match-result-display";
import type { ProductionRuntimeDiagnostics } from "../lib/server-runtime";
import type {
  HomeFeaturedPrediction,
  HomeModelTrackRecordMetric
} from "../lib/home-dashboard";
import { buildHomeRuntimeStatusLine, HOME_SECTION_IDS } from "../lib/home-dashboard";
import { EmptyState } from "./EmptyState";
import { PageContainer } from "./PageContainer";
import { PageHeader } from "./PageHeader";
import { SectionHeader } from "./SectionHeader";
import { StatusBadge } from "./StatusBadge";
import { Surface } from "./Surface";
import { TeamIdentity } from "./TeamIdentity";
import { TechnicalDisclosure } from "./TechnicalDisclosure";

interface HomeDashboardProps {
  runtimeDiagnostics: ProductionRuntimeDiagnostics;
  dailyMatches: WorldCup2026DailyMatchesSuccessResponse;
  homeMatches: readonly WorldCup2026DailyMatchEntry[];
  featuredPrediction: HomeFeaturedPrediction | null;
  groups: readonly WorldCup2026GroupStandings[];
  tournamentProjection: OfficialKnockoutProjectionResult;
  modelTrackRecordMetrics: readonly HomeModelTrackRecordMetric[];
  modelVersion?: string;
  formulaVersion?: string;
}

interface HomeIntroProps {
  runtimeDiagnostics: ProductionRuntimeDiagnostics;
}

interface HomeTodayMatchesProps {
  matches: readonly WorldCup2026DailyMatchEntry[];
  dailyMatches: WorldCup2026DailyMatchesSuccessResponse;
}

interface HomeFeaturedPredictionProps {
  prediction: HomeFeaturedPrediction | null;
}

interface HomeGroupSnapshotProps {
  groups: readonly WorldCup2026GroupStandings[];
}

interface HomeTournamentOutlookProps {
  projection: OfficialKnockoutProjectionResult;
}

interface HomeModelTrackRecordProps {
  metrics: readonly HomeModelTrackRecordMetric[];
}

interface HomeTechnicalStatusProps {
  runtimeDiagnostics: ProductionRuntimeDiagnostics;
  dailyMatches: WorldCup2026DailyMatchesSuccessResponse;
  modelVersion?: string;
  formulaVersion?: string;
}

function primaryLinkClasses(): string {
  return "inline-flex items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
}

function secondaryLinkClasses(): string {
  return "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
}

function sectionActionClasses(): string {
  return "text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline";
}

function getMatchStatusVariant(match: WorldCup2026DailyMatchEntry): "neutral" | "info" | "success" | "warning" | "danger" | "live" {
  if (match.state === "live" || match.state === "halftime") return "live";
  if (match.state === "upcoming") return "info";
  if (match.state === "final") return "success";
  if (match.state === "postponed" || match.state === "cancelled") return "warning";
  return "neutral";
}

function formatProjectedScore(match: WorldCup2026DailyMatchEntry): string | null {
  const scoreline = match.predictionHistory.snapshot.prediction?.projectedScoreline;
  if (scoreline === undefined) return null;
  return `${scoreline.homeGoals}-${scoreline.awayGoals}`;
}

function HomeMatchRow({ match }: { match: WorldCup2026DailyMatchEntry }) {
  const resultDisplay = buildMatchResultDisplay(match);
  const projectedScore = formatProjectedScore(match);
  const hasPrediction = match.predictionHistory.snapshot.available;

  return (
    <li className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge label={getDailyMatchStateLabel(match.state)} variant={getMatchStatusVariant(match)} />
          <span className="text-xs font-medium text-slate-500">
            {match.localizedKickoff ?? "Kickoff TBD"}
          </span>
          {hasPrediction ? (
            <span className="text-xs font-semibold text-teal-700">
              {getDailyMatchPredictionLabel(getDailyMatchHistoryState(match))}
            </span>
          ) : null}
        </div>
        <div className="grid min-w-0 gap-2">
          <TeamIdentity identity={getTeamVisualIdentity(match.homeTeam)} size="sm" showFifaCode className="min-w-0" />
          <TeamIdentity identity={getTeamVisualIdentity(match.awayTeam)} size="sm" showFifaCode className="min-w-0" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:min-w-32 sm:justify-end">
        <div>
          <p className="text-xs font-medium text-slate-500">{resultDisplay.primaryScoreLabel}</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-950">
            {resultDisplay.primaryScoreText}
          </p>
          {resultDisplay.resultNote !== undefined ? (
            <p className="mt-0.5 max-w-44 text-xs font-medium text-slate-600">{resultDisplay.resultNote}</p>
          ) : null}
        </div>
        {projectedScore !== null ? (
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">Projected</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{projectedScore}</p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ProbabilityBar({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{formatPercent(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

function HomeSection({
  id,
  labelledBy,
  children,
  className = "py-6"
}: {
  id: string;
  labelledBy: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} data-home-section={id} aria-labelledby={labelledBy} className={className}>
      {children}
    </section>
  );
}

export function HomeIntro({ runtimeDiagnostics }: HomeIntroProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[0]} labelledBy="home-intro-title" className="pb-6 pt-8">
      <PageHeader
        eyebrow="World Cup 2026"
        titleId="home-intro-title"
        title="World Cup 2026 Predictor"
        description="Live matches, model predictions, group standings, and tournament outlook in one place."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/matches" className={primaryLinkClasses()}>
              View matches
            </Link>
            <Link href="/predictions" className={secondaryLinkClasses()}>
              Create prediction
            </Link>
          </div>
        }
      />
      <p className="mt-3 text-sm text-slate-600">{buildHomeRuntimeStatusLine(runtimeDiagnostics)}</p>
    </HomeSection>
  );
}

export function HomeTodayMatches({ matches, dailyMatches }: HomeTodayMatchesProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[1]} labelledBy="home-todays-matches-title">
      <SectionHeader
        eyebrow="Match center"
        titleId="home-todays-matches-title"
        title="Today's matches"
        action={
          <Link href="/matches" className={sectionActionClasses()}>
            View all matches
          </Link>
        }
      />
      <Surface className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{dailyMatches.requestedDate}</p>
          <p className="text-xs text-slate-500">{dailyMatches.timezone}</p>
        </div>
        {matches.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No matches scheduled today"
              description="Browse the match center for upcoming fixtures and date navigation."
              action={
                <Link href="/matches" className={sectionActionClasses()}>
                  View all matches
                </Link>
              }
            />
          </div>
        ) : (
          <ul aria-label="Home match list" className="divide-y-0">
            {matches.map((match) => (
              <HomeMatchRow key={match.fixtureId} match={match} />
            ))}
          </ul>
        )}
      </Surface>
    </HomeSection>
  );
}

export function HomeFeaturedPrediction({ prediction }: HomeFeaturedPredictionProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[2]} labelledBy="home-featured-prediction-title">
      <SectionHeader eyebrow="Prediction" titleId="home-featured-prediction-title" title="Featured prediction" />
      {prediction === null ? (
        <div className="mt-4">
          <EmptyState
            title="No featured prediction available"
            description="Open the prediction tool to create a match forecast."
            action={
              <Link href="/predictions" className={sectionActionClasses()}>
                Create prediction
              </Link>
            }
          />
        </div>
      ) : (
        <Surface className="mt-4 p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">
                {prediction.group ?? "World Cup 2026"}
                {prediction.matchday === undefined ? "" : ` · Matchday ${prediction.matchday}`}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <TeamIdentity identity={getTeamVisualIdentity(prediction.homeTeam)} size="md" showFifaCode className="min-w-0" />
                <div className="text-left sm:text-center">
                  <p className="text-xs font-medium text-slate-500">Projected score</p>
                  <p className="text-2xl font-semibold text-slate-950">
                    {prediction.projectedScore === null
                      ? "TBD"
                      : `${prediction.projectedScore.home} - ${prediction.projectedScore.away}`}
                  </p>
                </div>
                <TeamIdentity identity={getTeamVisualIdentity(prediction.awayTeam)} size="md" showFifaCode className="min-w-0" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{prediction.context}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                {prediction.confidenceLevel !== undefined ? <span>Confidence: {prediction.confidenceLevel}</span> : null}
                {prediction.coverageType !== undefined ? <span>Coverage: {prediction.coverageType}</span> : null}
              </div>
            </div>
            <div className="grid gap-3">
              <ProbabilityBar label={prediction.homeTeam} value={prediction.homeWinProbability} />
              <ProbabilityBar label="Draw" value={prediction.drawProbability} />
              <ProbabilityBar label={prediction.awayTeam} value={prediction.awayWinProbability} />
              <Link href="/predictions" className={`${primaryLinkClasses()} mt-1`}>
                {prediction.ctaLabel}
              </Link>
            </div>
          </div>
        </Surface>
      )}
    </HomeSection>
  );
}

export function HomeGroupSnapshot({ groups }: HomeGroupSnapshotProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[3]} labelledBy="home-group-snapshot-title">
      <SectionHeader
        eyebrow="Groups"
        titleId="home-group-snapshot-title"
        title="Group snapshot"
        action={
          <Link href="/groups" className={sectionActionClasses()}>
            View all groups
          </Link>
        }
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <Surface key={group.group} className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-950">{group.groupName}</h3>
              <Link href={`/groups/${group.group}`} className="text-xs font-semibold text-teal-700 hover:underline">
                Open
              </Link>
            </div>
            <ol className="space-y-2">
              {group.standings.slice(0, 3).map((entry, index) => (
                <li key={entry.team} className="flex items-center justify-between gap-3">
                  <TeamIdentity
                    identity={getTeamVisualIdentity(entry.team)}
                    size="xs"
                    secondaryMetadata={index < 2 ? "Top 2" : "3rd"}
                    className="min-w-0"
                  />
                  <span className="shrink-0 text-sm font-semibold text-slate-950">{entry.points} pts</span>
                </li>
              ))}
            </ol>
          </Surface>
        ))}
      </div>
    </HomeSection>
  );
}

export function HomeTournamentOutlook({ projection }: HomeTournamentOutlookProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[4]} labelledBy="home-tournament-outlook-title">
      <SectionHeader
        eyebrow="Tournament"
        titleId="home-tournament-outlook-title"
        title="Tournament outlook"
        action={
          <Link href="/tournament" className={sectionActionClasses()}>
            View tournament outlook
          </Link>
        }
      />
      <Surface className="mt-4 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-teal-700">Projected champion</p>
            <TeamIdentity identity={getTeamVisualIdentity(projection.podium.champion)} size="lg" showFifaCode className="mt-2 min-w-0" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Projected runner-up</p>
            <TeamIdentity identity={getTeamVisualIdentity(projection.podium.runnerUp)} size="lg" showFifaCode className="mt-2 min-w-0" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Projected third place</p>
            <TeamIdentity identity={getTeamVisualIdentity(projection.podium.thirdPlace)} size="lg" showFifaCode className="mt-2 min-w-0" />
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500">Official knockout phase</p>
          <p className="mt-1 text-sm text-slate-700">
            {projection.rounds.round_of_32.length} official fixtures; {projection.metadata.predictorCallCount} unresolved fixtures projected.
          </p>
          <p className="mt-2 text-xs text-slate-500">Official completed results override projections. Remaining paths may change as results update.</p>
        </div>
      </Surface>
    </HomeSection>
  );
}

export function HomeModelTrackRecord({ metrics }: HomeModelTrackRecordProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[5]} labelledBy="home-model-track-record-title">
      <SectionHeader
        eyebrow="Evidence"
        titleId="home-model-track-record-title"
        title="Model track record"
        action={
          <Link href="/model" className={sectionActionClasses()}>
            View model evidence
          </Link>
        }
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.slice(0, 4).map((metric) => (
          <Surface key={metric.label} className="p-4">
            <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </Surface>
        ))}
      </div>
      <Link href="/prediction-history" className={`${sectionActionClasses()} mt-3 inline-flex`}>
        Prediction history
      </Link>
    </HomeSection>
  );
}

export function HomeQuickActions() {
  const actions = [
    { label: "Browse matches", href: "/matches" },
    { label: "Create prediction", href: "/predictions" },
    { label: "Explore groups", href: "/groups" },
    { label: "View tournament", href: "/tournament" }
  ];

  return (
    <HomeSection id={HOME_SECTION_IDS[6]} labelledBy="home-quick-actions-title">
      <SectionHeader eyebrow="Next" titleId="home-quick-actions-title" title="Quick actions" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-teal-600 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </HomeSection>
  );
}

export function HomeTechnicalStatus({
  runtimeDiagnostics,
  dailyMatches,
  modelVersion,
  formulaVersion
}: HomeTechnicalStatusProps) {
  return (
    <HomeSection id={HOME_SECTION_IDS[7]} labelledBy="home-technical-status-title" className="pb-10 pt-6">
      <h2 id="home-technical-status-title" className="sr-only">
        Technical status
      </h2>
      <TechnicalDisclosure summary="Technical status">
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-semibold text-slate-700">Live data</dt>
            <dd>{buildHomeRuntimeStatusLine(runtimeDiagnostics)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Persistence</dt>
            <dd>{runtimeDiagnostics.databaseConnected ? "Connected" : runtimeDiagnostics.persistenceProviderConfigured ? "Configured, unavailable" : "Disabled"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Last synchronization</dt>
            <dd>{formatUtcTimestamp(runtimeDiagnostics.lastSuccessfulSync ?? dailyMatches.providerMetadata?.lastSuccessfulSync)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Fallback status</dt>
            <dd>{runtimeDiagnostics.localFallbackUsed ? "Local fallback active" : runtimeDiagnostics.cacheUsed ? "Cached provider response" : "Primary source"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">StatsBomb signal</dt>
            <dd>
              {runtimeDiagnostics.statsBomb.rolloutMode === "off"
                ? "Off"
                : runtimeDiagnostics.statsBomb.artifactReady
                  ? `${runtimeDiagnostics.statsBomb.rolloutMode} mode, artifact ready`
                  : `${runtimeDiagnostics.statsBomb.rolloutMode} mode, baseline fallback`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Model version</dt>
            <dd>{modelVersion ?? "Current production model"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Formula version</dt>
            <dd>{formulaVersion ?? "Current Elo/xG formula"}</dd>
          </div>
        </dl>
      </TechnicalDisclosure>
    </HomeSection>
  );
}

export function HomeDashboard({
  runtimeDiagnostics,
  dailyMatches,
  homeMatches,
  featuredPrediction,
  groups,
  tournamentProjection,
  modelTrackRecordMetrics,
  modelVersion,
  formulaVersion
}: HomeDashboardProps) {
  return (
    <PageContainer id="overview" className="py-0">
      <HomeIntro runtimeDiagnostics={runtimeDiagnostics} />
      <HomeTodayMatches matches={homeMatches} dailyMatches={dailyMatches} />
      <HomeFeaturedPrediction prediction={featuredPrediction} />
      <HomeGroupSnapshot groups={groups} />
      <HomeTournamentOutlook projection={tournamentProjection} />
      <HomeModelTrackRecord metrics={modelTrackRecordMetrics} />
      <HomeQuickActions />
      <HomeTechnicalStatus
        runtimeDiagnostics={runtimeDiagnostics}
        dailyMatches={dailyMatches}
        modelVersion={modelVersion}
        formulaVersion={formulaVersion}
      />
    </PageContainer>
  );
}
