import React from "react";
import type { Metadata } from "next";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { TournamentRoundNav } from "../../src/components/TournamentRoundNav";
import { OfficialKnockoutTournament } from "../../src/components/OfficialKnockoutTournament";
import { getOfficialWorldCup2026KnockoutProjection } from "../../src/lib/server-runtime";

export const metadata: Metadata = {
  title: "Tournament · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TournamentPage() {
  const projection = await getOfficialWorldCup2026KnockoutProjection();

  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <PageHeader
          eyebrow="World Cup 2026"
          title="Tournament"
          description="Official knockout fixtures, completed results, and projected path through champion, runner-up, third place, and fourth place."
        />
      </div>

      <div className="mb-6">
        <TournamentRoundNav />
      </div>

      <OfficialKnockoutTournament projection={projection} />
    </PageContainer>
  );
}
