import type { PredictMatchFromLiveEloSuccessResponse } from "./api-client";

export type TournamentFormAdjustmentResult = NonNullable<
  PredictMatchFromLiveEloSuccessResponse["tournamentFormAdjustment"]
>;

export function buildTournamentFormRequestField(enabled: boolean): { enabled: true } | undefined {
  return enabled ? { enabled: true } : undefined;
}

export type TournamentFormDisplayState =
  | { status: "disabled" }
  | { status: "not_applied"; warnings: readonly string[] }
  | { status: "applied"; adj: TournamentFormAdjustmentResult };

export function getTournamentFormDisplayState(
  adj: TournamentFormAdjustmentResult | undefined
): TournamentFormDisplayState {
  if (adj === undefined || !adj.enabled) {
    return { status: "disabled" };
  }

  if (!adj.applied) {
    return { status: "not_applied", warnings: adj.warnings };
  }

  return { status: "applied", adj };
}
