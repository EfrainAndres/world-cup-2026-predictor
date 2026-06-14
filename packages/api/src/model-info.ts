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
      "Live Elo pipeline computing current ratings from 256 World Cup fixtures (2010–2022) plus an expanded partial international supplement covering FIFA World Cup 2022, Copa America 2024, Euro 2024, WCQ 2026, and friendlies.",
      "Automatic match prediction from live Elo team names using a transparent Elo-to-expected-goals foundation.",
      "Static World Cup 2026 Groups A-L and group-stage fixture foundation data.",
      "World Cup 2026 group standings foundation calculated from normalized local result provider records.",
      "Projected World Cup 2026 Round of 32 foundation derived from current local group standings.",
      "Projected World Cup 2026 Round of 16 foundation derived from deterministic R32 winner selection using pre-match probabilities and Elo tie-breaking.",
      "Match-level Round of 16 simulation using Live Elo ratings and Poisson score matrix for each projected R16 fixture.",
      "Projected quarterfinal foundation derived from R16 match probabilities via deterministic winner selection. No QF match simulation.",
      "Match-level quarterfinal simulation using Live Elo ratings and Poisson score matrix for each projected QF fixture."
    ],
    supportedHandlers: [
      "getHealth",
      "getModelInfo",
      "simulateMatch",
      "getHistoricalTournamentSummary",
      "getHistoricalReplayAudit",
      "predictMatchFromLiveElo",
      "simulateTournamentFoundation",
      "getTeamRatingsFoundation",
      "getLiveEloRatingsFoundation",
      "getWorldCup2026FixtureFoundation",
      "getWorldCup2026GroupStandingsFoundation",
      "getWorldCup2026RoundOf32Foundation",
      "getWorldCup2026KnockoutBracketFoundation",
      "simulateWorldCup2026KnockoutFixturesFoundation",
      "simulateWorldCup2026RoundOf16Foundation",
      "simulateWorldCup2026RoundOf16MatchesFoundation",
      "simulateWorldCup2026QuarterfinalFoundation",
      "simulateWorldCup2026QuarterfinalMatchesFoundation"
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
