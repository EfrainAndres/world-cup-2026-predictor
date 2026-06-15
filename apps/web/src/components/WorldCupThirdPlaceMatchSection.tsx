import type { WorldCup2026ThirdPlaceMatchFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type ThirdPlaceParticipant = WorldCup2026ThirdPlaceMatchFoundationResponse["projectedParticipants"][number];

interface WorldCupThirdPlaceMatchSectionProps {
  thirdPlaceMatch: WorldCup2026ThirdPlaceMatchFoundationResponse;
}

interface ParticipantCardProps {
  participant: ThirdPlaceParticipant;
  role: "Home" | "Away";
}

function ParticipantCard({ participant, role }: ParticipantCardProps) {
  return (
    <article
      aria-label={`Third place ${role.toLowerCase()} participant: ${participant.team}`}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase text-slate-400">{role} Team</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{participant.team}</p>
      <p className="mt-1 text-xs text-slate-500">{participant.eliminationReason}</p>
      <p className="mt-1 text-xs text-slate-400">Lost to: {participant.lostTo}</p>
      <p className="mt-2 text-xs text-slate-400">
        {formatPercent(participant.probabilitySnapshot.homeWinProbability)} /{" "}
        {formatPercent(participant.probabilitySnapshot.drawProbability)} /{" "}
        {formatPercent(participant.probabilitySnapshot.awayWinProbability)}
      </p>
      <p className="mt-1 text-xs text-slate-300">SF fixture: {participant.semifinalSourceFixtureId}</p>
    </article>
  );
}

export function WorldCupThirdPlaceMatchSection({ thirdPlaceMatch }: WorldCupThirdPlaceMatchSectionProps) {
  const fixture = thirdPlaceMatch.thirdPlaceMatchFixture;

  return (
    <section
      id="world-cup-third-place-match"
      aria-labelledby="world-cup-third-place-match-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Third Place Match foundation"
        titleId="world-cup-third-place-match-title"
        title="Projected Third Place Match"
        description="Third Place Match participants derived from deterministic semifinal loser selection. No match simulation, no winner selection, no penalty logic."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Fixture foundation only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          This section projects the Third Place Match fixture only. The match is not simulated yet. No third-place winner selection or penalty modeling.
        </p>
      </div>

      <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">Fixture</p>
        <p className="mt-1 text-sm text-slate-950">
          <span className="font-medium">{fixture.homeTeam}</span>
          <span className="mx-2 text-slate-400">vs</span>
          <span className="font-medium">{fixture.awayTeam}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">ID: {fixture.fixtureId} · Status: {fixture.status}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ParticipantCard participant={fixture.homeParticipant} role="Home" />
        <ParticipantCard participant={fixture.awayParticipant} role="Away" />
      </div>
    </section>
  );
}
