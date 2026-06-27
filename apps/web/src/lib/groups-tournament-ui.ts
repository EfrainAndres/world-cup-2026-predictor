import {
  buildWorldCup2026BestThirdPlaceRanking,
  type WorldCup2026GroupStandings
} from "@world-cup-2026-predictor/api";
import type { WorldCup2026GroupProjectionSource } from "./api-client";

export type TournamentSourceLabel =
  | "Official"
  | "Live provisional"
  | "Projected"
  | "Stored prediction"
  | "Auto Predict"
  | "Unavailable";

export type TournamentSourceVariant =
  | "official"
  | "provisional"
  | "projected"
  | "stored"
  | "auto"
  | "unavailable";

export interface TournamentSourcePresentation {
  label: TournamentSourceLabel;
  variant: TournamentSourceVariant;
  badgeClasses: string;
}

const SOURCE_MAP: Record<TournamentSourceVariant, TournamentSourcePresentation> = {
  official: {
    label: "Official",
    variant: "official",
    badgeClasses: "border-teal-200 bg-teal-50 text-teal-800"
  },
  provisional: {
    label: "Live provisional",
    variant: "provisional",
    badgeClasses: "border-amber-200 bg-amber-50 text-amber-800"
  },
  projected: {
    label: "Projected",
    variant: "projected",
    badgeClasses: "border-blue-200 bg-blue-50 text-blue-800"
  },
  stored: {
    label: "Stored prediction",
    variant: "stored",
    badgeClasses: "border-teal-200 bg-teal-50 text-teal-800"
  },
  auto: {
    label: "Auto Predict",
    variant: "auto",
    badgeClasses: "border-blue-200 bg-blue-50 text-blue-800"
  },
  unavailable: {
    label: "Unavailable",
    variant: "unavailable",
    badgeClasses: "border-slate-200 bg-slate-100 text-slate-600"
  }
};

export function getSourcePresentation(variant: TournamentSourceVariant): TournamentSourcePresentation {
  return SOURCE_MAP[variant];
}

export function projectionSourceToVariant(source: WorldCup2026GroupProjectionSource): TournamentSourceVariant {
  switch (source) {
    case "stored_snapshot":
      return "stored";
    case "auto_predict":
      return "auto";
    case "unavailable":
      return "unavailable";
  }
}

export function getProjectionSourcePresentation(
  source: WorldCup2026GroupProjectionSource
): TournamentSourcePresentation {
  return getSourcePresentation(projectionSourceToVariant(source));
}

export function groupIsComplete(completedFixtureCount: number, pendingFixtureCount: number): boolean {
  return pendingFixtureCount === 0 && completedFixtureCount > 0;
}

export function formatGroupProgress(completedFixtureCount: number, pendingFixtureCount: number): string {
  const total = completedFixtureCount + pendingFixtureCount;
  if (pendingFixtureCount === 0 && completedFixtureCount > 0) return "Complete";
  if (completedFixtureCount === 0) return `0 / ${total} played`;
  return `${completedFixtureCount} / ${total} played`;
}

export function formatGD(gd: number): string {
  if (gd > 0) return `+${gd}`;
  return String(gd);
}

export type BestThirdPlaceRankingInput = NonNullable<
  Parameters<typeof buildWorldCup2026BestThirdPlaceRanking>[0]
>;

export function toBestThirdPlaceRankingInput(
  groups: readonly WorldCup2026GroupStandings[]
): BestThirdPlaceRankingInput {
  return groups.map((group) => ({
    ...group,
    standings: [...group.standings]
  }));
}

export const VALID_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
export type ValidGroup = (typeof VALID_GROUPS)[number];

export function isValidGroup(g: string): g is ValidGroup {
  return (VALID_GROUPS as readonly string[]).includes(g.toUpperCase());
}
