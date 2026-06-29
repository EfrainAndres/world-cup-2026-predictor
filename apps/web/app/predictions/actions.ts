"use server";

import type { PredictMatchFromLiveEloRequest, PredictMatchFromLiveEloResponse } from "@world-cup-2026-predictor/api";
import { predictDashboardMatchFromLiveEloWithProductionStatsBomb } from "../../src/lib/server-runtime";

export async function predictMatchFromLiveEloAction(
  request: PredictMatchFromLiveEloRequest
): Promise<PredictMatchFromLiveEloResponse> {
  return predictDashboardMatchFromLiveEloWithProductionStatsBomb(request);
}
