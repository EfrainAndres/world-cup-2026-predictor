export interface TeamAliasResolution {
  input: string;
  normalizedInput: string;
  canonicalName: string | undefined;
  matchedBy: "canonical" | "alias" | "none";
}

export interface TeamCoverageEntry {
  team: string;
  rank: number;
  eloRating: number;
  matchesPlayed: number;
}

export const TEAM_ALIASES: Readonly<Record<string, string>> = {
  "czech republic": "Czechia",
  "korea republic": "South Korea",
  "south korea": "South Korea",
  usa: "United States",
  usmnt: "United States",
  "ir iran": "Iran",
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  netherlands: "Netherlands",
  holland: "Netherlands"
};

export function normalizeTeamSearchText(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function canonicalizeTeamName(value: string): string {
  const trimmed = value.trim();
  const aliasCanonical = TEAM_ALIASES[normalizeTeamSearchText(trimmed)];

  return aliasCanonical ?? trimmed;
}

export function resolveTeamAlias(input: string, availableTeams: readonly string[]): TeamAliasResolution {
  const normalizedInput = normalizeTeamSearchText(input);
  const availableByKey = new Map(availableTeams.map((team) => [normalizeTeamSearchText(team), team]));
  const aliasCanonical = TEAM_ALIASES[normalizedInput];

  if (aliasCanonical !== undefined) {
    return {
      input,
      normalizedInput,
      canonicalName: availableByKey.get(normalizeTeamSearchText(aliasCanonical)) ?? aliasCanonical,
      matchedBy: "alias"
    };
  }

  const canonicalMatch = availableByKey.get(normalizedInput);

  if (canonicalMatch !== undefined) {
    return {
      input,
      normalizedInput,
      canonicalName: canonicalMatch,
      matchedBy: "canonical"
    };
  }

  return {
    input,
    normalizedInput,
    canonicalName: undefined,
    matchedBy: "none"
  };
}

export function getAvailableTeamCoverage(teams: readonly TeamCoverageEntry[]): string[] {
  return [...new Set(teams.map((entry) => canonicalizeTeamName(entry.team)))].sort((a, b) => a.localeCompare(b));
}

export function suggestAvailableTeams(input: string, availableTeams: readonly string[], limit = 5): string[] {
  const normalizedInput = normalizeTeamSearchText(input);

  if (normalizedInput.length === 0) {
    return availableTeams.slice(0, limit);
  }

  const scored = availableTeams
    .map((team) => {
      const normalizedTeam = normalizeTeamSearchText(team);
      const startsWith = normalizedTeam.startsWith(normalizedInput) ? 0 : 1;
      const includes = normalizedTeam.includes(normalizedInput) ? 0 : 1;
      const distance = Math.abs(normalizedTeam.length - normalizedInput.length);

      return {
        team,
        score: startsWith * 100 + includes * 50 + distance
      };
    })
    .sort((a, b) => a.score - b.score || a.team.localeCompare(b.team));

  return scored.slice(0, limit).map((entry) => entry.team);
}
