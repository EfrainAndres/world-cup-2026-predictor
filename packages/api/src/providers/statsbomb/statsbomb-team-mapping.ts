import { canonicalizeTeamName } from "../../team-aliases.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../../world-cup-2026-teams.js";
import type { StatsBombSupportedCompetition } from "./statsbomb-types.js";

const CANONICAL_TEAM_SET = new Set<string>(WORLD_CUP_2026_TEAM_NAMES);

export function resolveStatsBombTeamName(statsBombName: string): string | null {
  const canonical = canonicalizeTeamName(statsBombName);
  if (CANONICAL_TEAM_SET.has(canonical)) {
    return canonical;
  }
  return null;
}

export function teamNameToId(canonicalName: string): string {
  return canonicalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const STATSBOMB_SUPPORTED_COMPETITIONS: readonly StatsBombSupportedCompetition[] = [
  { competitionId: 43, seasonId: 106, name: "FIFA World Cup 2022" },
  { competitionId: 43, seasonId: 3, name: "FIFA World Cup 2018" },
  { competitionId: 223, seasonId: 282, name: "Copa América 2024" },
  { competitionId: 1267, seasonId: 107, name: "AFCON 2023" },
  { competitionId: 55, seasonId: 282, name: "UEFA Euro 2024" },
  { competitionId: 55, seasonId: 43, name: "UEFA Euro 2020" },
];
