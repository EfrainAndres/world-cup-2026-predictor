import { HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION } from "../../model/src/index.js";
import { buildApiMetadata } from "./schemas.js";
import type { ModelInfoResponse } from "./schemas.js";

export function getModelInfo(): ModelInfoResponse {
  return {
    status: "ok",
    modelPackage: "@world-cup-2026-predictor/model",
    modelScope: [
      "Poisson score matrix generation from expected goals.",
      "Match outcome probability aggregation.",
      "Optional deterministic match-level Monte Carlo simulation.",
      "Historical tournament summary metadata for 2010, 2014, 2018, and 2022.",
      `Historical replay audit metadata from ${HISTORICAL_REPLAY_ACCURACY_AUDIT_VERSION}.`,
      "Seeded deterministic 8-team sample tournament simulation using runTournamentRepeatedRuns.",
      "Curated seed ratings for top 10 World Cup 2026 contenders with tier and strength classifications.",
      "Live Elo pipeline computing current ratings from 256 curated World Cup fixtures (2010–2022)."
    ],
    supportedHandlers: [
      "getHealth",
      "getModelInfo",
      "simulateMatch",
      "getHistoricalTournamentSummary",
      "getHistoricalReplayAudit",
      "simulateTournamentFoundation",
      "getTeamRatingsFoundation",
      "getLiveEloRatingsFoundation"
    ],
    limitations: [
      "No HTTP server is created in Phase 5.0.",
      "No database or external services are used.",
      "Historical replay outputs are foundation evidence, not final predictive accuracy.",
      "Expected-goals inputs are caller supplied and are not calibrated by this API package."
    ],
    metadata: buildApiMetadata(["Model info is static package metadata for the API foundation."])
  };
}
