import React from "react";
import type { Metadata } from "next";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { TournamentProjectionOverviewSection } from "../../src/components/TournamentProjectionOverviewSection";
import { TournamentSimulationSection } from "../../src/components/TournamentSimulationSection";
import { WorldCupChampionProjectionSummarySection } from "../../src/components/WorldCupChampionProjectionSummarySection";
import { WorldCupFinalMatchSimulationSection } from "../../src/components/WorldCupFinalMatchSimulationSection";
import { WorldCupFinalSimulationSection } from "../../src/components/WorldCupFinalSimulationSection";
import { WorldCupKnockoutBracketSection } from "../../src/components/WorldCupKnockoutBracketSection";
import { WorldCupKnockoutSimulationSection } from "../../src/components/WorldCupKnockoutSimulationSection";
import { WorldCupKnockoutWinnerResolutionSection } from "../../src/components/WorldCupKnockoutWinnerResolutionSection";
import { WorldCupQuarterfinalMatchSimulationSection } from "../../src/components/WorldCupQuarterfinalMatchSimulationSection";
import { WorldCupQuarterfinalSimulationSection } from "../../src/components/WorldCupQuarterfinalSimulationSection";
import { WorldCupRoundOf16MatchSimulationSection } from "../../src/components/WorldCupRoundOf16MatchSimulationSection";
import { WorldCupRoundOf16SimulationSection } from "../../src/components/WorldCupRoundOf16SimulationSection";
import { WorldCupRoundOf32Section } from "../../src/components/WorldCupRoundOf32Section";
import { WorldCupSemifinalMatchSimulationSection } from "../../src/components/WorldCupSemifinalMatchSimulationSection";
import { WorldCupSemifinalSimulationSection } from "../../src/components/WorldCupSemifinalSimulationSection";
import { WorldCupThirdPlaceMatchSection } from "../../src/components/WorldCupThirdPlaceMatchSection";
import { WorldCupThirdPlaceMatchSimulationSection } from "../../src/components/WorldCupThirdPlaceMatchSimulationSection";
import { getDashboardSnapshot } from "../../src/lib/api-client";

export const metadata: Metadata = {
  title: "Tournament · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function TournamentPage() {
  const snapshot = getDashboardSnapshot();

  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Tournament"
        description="Explore projected knockout rounds, finalists, third-place match, bracket, and tournament outlook."
      />

      <TournamentProjectionOverviewSection
        resolution={snapshot.worldCup2026KnockoutWinnerResolution}
        thirdPlaceMatch={snapshot.worldCup2026ThirdPlaceMatch}
      />
      <WorldCupChampionProjectionSummarySection resolution={snapshot.worldCup2026KnockoutWinnerResolution} />
      <WorldCupFinalMatchSimulationSection finalMatchSimulation={snapshot.worldCup2026FinalMatchSimulation} />
      <WorldCupFinalSimulationSection finalFoundation={snapshot.worldCup2026Final} />
      <WorldCupSemifinalMatchSimulationSection semifinalMatchSimulation={snapshot.worldCup2026SemifinalMatchSimulation} />
      <WorldCupSemifinalSimulationSection semifinal={snapshot.worldCup2026Semifinal} />
      <WorldCupQuarterfinalMatchSimulationSection quarterfinalMatchSimulation={snapshot.worldCup2026QuarterfinalMatchSimulation} />
      <WorldCupQuarterfinalSimulationSection quarterfinal={snapshot.worldCup2026Quarterfinal} />
      <WorldCupRoundOf16MatchSimulationSection roundOf16MatchSimulation={snapshot.worldCup2026RoundOf16MatchSimulation} />
      <WorldCupRoundOf16SimulationSection roundOf16={snapshot.worldCup2026RoundOf16} />
      <WorldCupKnockoutSimulationSection knockoutSimulation={snapshot.worldCup2026KnockoutSimulation} />
      <WorldCupRoundOf32Section roundOf32Foundation={snapshot.worldCup2026RoundOf32} />
      <WorldCupThirdPlaceMatchSimulationSection thirdPlaceMatchSimulation={snapshot.worldCup2026ThirdPlaceMatchSimulation} />
      <WorldCupThirdPlaceMatchSection thirdPlaceMatch={snapshot.worldCup2026ThirdPlaceMatch} />
      <WorldCupKnockoutWinnerResolutionSection resolution={snapshot.worldCup2026KnockoutWinnerResolution} />
      <WorldCupKnockoutBracketSection knockoutBracket={snapshot.worldCup2026KnockoutBracket} />
      <TournamentSimulationSection simulation={snapshot.tournamentSimulation} modelInfo={snapshot.modelInfo} />
    </PageContainer>
  );
}
