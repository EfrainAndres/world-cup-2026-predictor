import React from "react";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type {
  OfficialKnockoutFixtureProjection,
  OfficialKnockoutParticipant,
  OfficialKnockoutProjectionResult,
  OfficialKnockoutStage
} from "@world-cup-2026-predictor/api";
import { Surface } from "./Surface";
import { StatusBadge } from "./StatusBadge";
import { TeamIdentity } from "./TeamIdentity";

const stageLabels: Record<OfficialKnockoutStage, string> = {
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinals",
  semifinal: "Semifinals",
  third_place: "Third Place Match",
  final: "Final"
};

const stageIds: Record<OfficialKnockoutStage, string> = {
  round_of_32: "tournament-round-of-32",
  round_of_16: "tournament-round-of-16",
  quarterfinal: "tournament-quarterfinals",
  semifinal: "tournament-semifinals",
  third_place: "tournament-third-place",
  final: "tournament-final"
};

const orderedStages: readonly OfficialKnockoutStage[] = [
  "round_of_32",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "final",
  "third_place"
];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function scoreText(match: OfficialKnockoutFixtureProjection): string {
  const score = match.officialScore ?? match.projectedScore;
  if (score === undefined) return "TBD";
  return `${score.homeGoals}-${score.awayGoals}`;
}

function resultBadge(match: OfficialKnockoutFixtureProjection) {
  if (match.sourceState === "official_result") {
    return <StatusBadge label="Official result" variant="success" />;
  }
  if (match.status === "live" || match.status === "halftime") {
    return <StatusBadge label="Live" variant="live" />;
  }
  if (match.status === "postponed") {
    return <StatusBadge label="Postponed" variant="warning" />;
  }
  if (match.status === "cancelled") {
    return <StatusBadge label="Unavailable" variant="danger" />;
  }
  if (match.projectedScore !== undefined) {
    return <StatusBadge label="Projected result" variant="warning" />;
  }
  return <StatusBadge label="Awaiting result" variant="neutral" />;
}

function fixtureBadge(match: OfficialKnockoutFixtureProjection) {
  if (match.stage === "round_of_32") {
    return <StatusBadge label="Official fixture" variant="info" />;
  }
  if (match.sourceState === "mixed_official_projected" || match.sourceState === "projected_participants") {
    return <StatusBadge label="Projected participant" variant="neutral" />;
  }
  return null;
}

function participantStateLabel(participant: OfficialKnockoutParticipant): string {
  if (participant.state === "official_participant") return "Official participant";
  if (participant.state === "official_winner") return "Official winner";
  if (participant.state === "official_loser") return "Official loser";
  if (participant.state === "projected_winner") return "Projected participant";
  if (participant.state === "projected_loser") return "Projected participant";
  return "Awaiting participant";
}

function ParticipantLine({ participant, align = "start" }: { participant: OfficialKnockoutParticipant; align?: "start" | "end" }) {
  const label = participantStateLabel(participant);
  if (participant.team === undefined) {
    return (
      <div className={`min-w-0 ${align === "end" ? "text-right" : ""}`}>
        <p className="text-sm font-semibold text-slate-500">Awaiting participant</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${align === "end" ? "text-right" : ""}`}>
      <TeamIdentity
        identity={getTeamVisualIdentity(participant.team)}
        size="sm"
        showFifaCode
        className="min-w-0 max-w-full"
      />
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function FixtureCard({ match }: { match: OfficialKnockoutFixtureProjection }) {
  const homeName = match.home.team ?? "Awaiting participant";
  const awayName = match.away.team ?? "Awaiting participant";
  const fixture = fixtureBadge(match);

  return (
    <article
      className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      aria-label={`Match ${match.officialMatchNumber}: ${homeName} vs ${awayName}`}
      data-knockout-fixture={match.officialMatchNumber}
      data-stage={match.stage}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">Match {match.officialMatchNumber}</p>
        <div className="flex flex-wrap gap-1.5">
          {fixture}
          {resultBadge(match)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <ParticipantLine participant={match.home} />
        <div className="rounded-md bg-slate-100 px-2.5 py-1 text-center text-lg font-bold tabular-nums text-slate-950">
          {scoreText(match)}
        </div>
        <ParticipantLine participant={match.away} align="end" />
      </div>

      {match.projection !== undefined ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded bg-slate-50 px-2 py-1">
            <span className="block text-slate-500">Home</span>
            <span className="font-semibold text-slate-900">
              {formatPercent(match.projection.outcomeProbabilities.homeWinProbability)}
            </span>
          </div>
          <div className="rounded bg-slate-50 px-2 py-1">
            <span className="block text-slate-500">Draw</span>
            <span className="font-semibold text-slate-900">
              {formatPercent(match.projection.outcomeProbabilities.drawProbability)}
            </span>
          </div>
          <div className="rounded bg-slate-50 px-2 py-1">
            <span className="block text-slate-500">Away</span>
            <span className="font-semibold text-slate-900">
              {formatPercent(match.projection.outcomeProbabilities.awayWinProbability)}
            </span>
          </div>
        </div>
      ) : null}

      {match.winner?.team !== undefined ? (
        <p className="mt-3 text-xs text-slate-600">
          Advances: <span className="font-semibold text-slate-900">{match.winner.team}</span>
        </p>
      ) : null}
    </article>
  );
}

function PodiumTeam({ label, team }: { label: string; team: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <TeamIdentity identity={getTeamVisualIdentity(team)} size="md" showFifaCode className="mt-2 min-w-0" />
    </div>
  );
}

function RoundSection({ stage, matches }: { stage: OfficialKnockoutStage; matches: readonly OfficialKnockoutFixtureProjection[] }) {
  const headingId = `${stageIds[stage]}-heading`;
  const gridClass =
    stage === "round_of_32"
      ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      : "grid gap-3 md:grid-cols-2";

  return (
    <section id={stageIds[stage]} aria-labelledby={headingId} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-slate-950">
            {stageLabels[stage]}
          </h2>
          <p className="text-sm text-slate-500">
            {matches.length} {matches.length === 1 ? "fixture" : "fixtures"}
          </p>
        </div>
      </div>
      <div className={gridClass}>
        {matches.map((match) => (
          <FixtureCard key={match.officialMatchNumber} match={match} />
        ))}
      </div>
    </section>
  );
}

export function OfficialKnockoutTournament({ projection }: { projection: OfficialKnockoutProjectionResult }) {
  const roundOf32Count = projection.rounds.round_of_32.length;

  return (
    <div className="space-y-8">
      <Surface className="px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="grid flex-1 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Official R32 fixtures</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">{roundOf32Count}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Knockout matches</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">{projection.matches.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Provider sync</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">
                {projection.metadata.sourceSynchronizationAt !== undefined ? "Available" : "Fallback"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Predicted fixtures</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">{projection.metadata.predictorCallCount}</dd>
            </div>
          </dl>
          <StatusBadge label="Official knockout topology" variant="info" />
        </div>
      </Surface>

      <section id="tournament-champion-outlook" aria-labelledby="champion-outlook-heading" className="scroll-mt-24">
        <div className="mb-3">
          <h2 id="champion-outlook-heading" className="text-lg font-semibold text-slate-950">
            Champion outlook
          </h2>
          <p className="text-sm text-slate-500">
            Official results are preserved. Remaining fixtures are projected through the fixed bracket path.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PodiumTeam label="Champion" team={projection.podium.champion} />
          <PodiumTeam label="Runner-up" team={projection.podium.runnerUp} />
          <PodiumTeam label="Third place" team={projection.podium.thirdPlace} />
          <PodiumTeam label="Fourth place" team={projection.podium.fourthPlace} />
        </div>
      </section>

      <section id="tournament-bracket" aria-labelledby="tournament-bracket-heading" className="scroll-mt-24">
        <div className="mb-3">
          <h2 id="tournament-bracket-heading" className="text-lg font-semibold text-slate-950">
            Knockout bracket
          </h2>
          <p className="text-sm text-slate-500">
            One fixed FIFA match-number path from Match 73 through Match 104. No re-seeding is applied.
          </p>
        </div>
        <div className="space-y-8">
          {orderedStages.map((stage) => (
            <RoundSection key={stage} stage={stage} matches={projection.rounds[stage]} />
          ))}
        </div>
      </section>

      <details className="group rounded-lg border border-slate-200 bg-white px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
          Technical/provenance disclosure
          <span className="text-xs font-medium text-slate-500 group-open:hidden">Collapsed</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>
            Canonical fixture data as of {projection.metadata.canonicalFixtureAsOf}. Generated {projection.metadata.generatedAt}.
          </p>
          <p>
            Model {projection.metadata.modelVersion}; formula {projection.metadata.formulaVersion}. Knockout fixture links are deferred until the match detail route supports knockout records.
          </p>
          {projection.warnings.length > 0 || projection.validationWarnings.length > 0 || projection.matchingIssues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {[...projection.warnings, ...projection.validationWarnings, ...projection.matchingIssues].map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p>No bracket validation warnings.</p>
          )}
        </div>
      </details>
    </div>
  );
}
