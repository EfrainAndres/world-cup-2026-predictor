import type { Metadata } from "next";
import { PredictionHistoryDashboard } from "../../src/components/PredictionHistoryDashboard";
import { listWorldCup2026PredictionHistory } from "@world-cup-2026-predictor/api";
import { toPredictionHistoryQuery } from "../../src/lib/prediction-history-ui";

export const metadata: Metadata = {
  title: "Prediction History · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PredictionHistoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PredictionHistoryPage({
  searchParams
}: PredictionHistoryPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = toPredictionHistoryQuery(resolvedSearchParams);
  const response = await listWorldCup2026PredictionHistory(query);

  const firstValue = (key: string): string => {
    const value = resolvedSearchParams[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };

  return (
    <PredictionHistoryDashboard
      response={response}
      formValues={{
        group: firstValue("group"),
        team: firstValue("team"),
        fixtureId: firstValue("fixtureId"),
        status: firstValue("status"),
        evaluationState: firstValue("evaluationState") || "all",
        sort: firstValue("sort") || "captured_desc",
        pageSize: firstValue("pageSize") || "20"
      }}
    />
  );
}
