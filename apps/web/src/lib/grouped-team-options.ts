import {
  TEAM_ALIASES,
  WORLD_CUP_2026_GROUPS,
  normalizeTeamSearchText
} from "@world-cup-2026-predictor/api";

export interface GroupedTeamOption {
  canonicalName: string;
  group: string;
  aliases: string[];
}

export interface GroupedTeamSearchMatch {
  option: GroupedTeamOption;
  label: string;
}

function buildAliasLookup(): Map<string, string[]> {
  const lookup = new Map<string, string[]>();

  for (const [alias, canonicalName] of Object.entries(TEAM_ALIASES)) {
    const aliases = lookup.get(canonicalName) ?? [];
    aliases.push(alias);
    lookup.set(canonicalName, aliases);
  }

  return lookup;
}

const ALIASES_BY_CANONICAL = buildAliasLookup();

export function getGroupedTeamOptions(): GroupedTeamOption[] {
  return WORLD_CUP_2026_GROUPS.flatMap((group) =>
    group.teams.map((team) => ({
      canonicalName: team,
      group: group.group,
      aliases: [...new Set(ALIASES_BY_CANONICAL.get(team) ?? [])].sort((a, b) => a.localeCompare(b))
    }))
  );
}

export function filterGroupedTeamOptions(
  options: readonly GroupedTeamOption[],
  query: string,
  excludedTeam?: string
): GroupedTeamSearchMatch[] {
  const normalizedQuery = normalizeTeamSearchText(query);

  return options
    .filter((option) => option.canonicalName !== excludedTeam)
    .map((option) => {
      const label = `${option.canonicalName} · Group ${option.group}`;
      const normalizedCanonical = normalizeTeamSearchText(option.canonicalName);
      const normalizedAliases = option.aliases.map((alias) => normalizeTeamSearchText(alias));
      const searchableTerms = [normalizedCanonical, ...normalizedAliases];
      const matches =
        normalizedQuery.length === 0 ||
        searchableTerms.some((term) => term.includes(normalizedQuery));

      return {
        option,
        label,
        matches,
        score:
          normalizedQuery.length === 0
            ? 0
            : Math.min(
                ...searchableTerms
                  .filter((term) => term.includes(normalizedQuery))
                  .map((term) => (term.startsWith(normalizedQuery) ? 0 : 1))
              )
      };
    })
    .filter((match) => match.matches)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.option.group.localeCompare(b.option.group) ||
        a.option.canonicalName.localeCompare(b.option.canonicalName)
    )
    .map(({ option, label }) => ({ option, label }));
}

export function groupFilteredTeamMatches(
  matches: readonly GroupedTeamSearchMatch[]
): Array<{ group: string; matches: GroupedTeamSearchMatch[] }> {
  const grouped = new Map<string, GroupedTeamSearchMatch[]>();

  for (const match of matches) {
    const entries = grouped.get(match.option.group) ?? [];
    entries.push(match);
    grouped.set(match.option.group, entries);
  }

  return [...grouped.entries()]
    .sort(([groupA], [groupB]) => groupA.localeCompare(groupB))
    .map(([group, groupedMatches]) => ({
      group,
      matches: groupedMatches
    }));
}
