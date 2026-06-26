import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "./world-cup-2026-teams.js";

export interface WorldCup2026TeamVisualIdentity {
  teamId: string;
  canonicalName: string;
  shortName: string;
  fifaCode: string;
  countryCode: string | null;
  flagPath: string | null;
  flagAlt: string;
}

function flagPath(fifaCode: string): string {
  return `/flags/world-cup-2026/${fifaCode.toLowerCase()}.svg`;
}

const IDENTITY_RECORDS: readonly WorldCup2026TeamVisualIdentity[] = [
  // Group A
  { teamId: "mexico", canonicalName: "Mexico", shortName: "Mexico", fifaCode: "MEX", countryCode: "MX", flagPath: flagPath("MEX"), flagAlt: "Flag of Mexico" },
  { teamId: "south-africa", canonicalName: "South Africa", shortName: "South Africa", fifaCode: "RSA", countryCode: "ZA", flagPath: flagPath("RSA"), flagAlt: "Flag of South Africa" },
  { teamId: "south-korea", canonicalName: "South Korea", shortName: "South Korea", fifaCode: "KOR", countryCode: "KR", flagPath: flagPath("KOR"), flagAlt: "Flag of South Korea" },
  { teamId: "czechia", canonicalName: "Czechia", shortName: "Czechia", fifaCode: "CZE", countryCode: "CZ", flagPath: flagPath("CZE"), flagAlt: "Flag of Czechia" },
  // Group B
  { teamId: "canada", canonicalName: "Canada", shortName: "Canada", fifaCode: "CAN", countryCode: "CA", flagPath: flagPath("CAN"), flagAlt: "Flag of Canada" },
  { teamId: "bosnia-herzegovina", canonicalName: "Bosnia-Herzegovina", shortName: "Bosnia-Herz.", fifaCode: "BIH", countryCode: "BA", flagPath: flagPath("BIH"), flagAlt: "Flag of Bosnia and Herzegovina" },
  { teamId: "qatar", canonicalName: "Qatar", shortName: "Qatar", fifaCode: "QAT", countryCode: "QA", flagPath: flagPath("QAT"), flagAlt: "Flag of Qatar" },
  { teamId: "switzerland", canonicalName: "Switzerland", shortName: "Switzerland", fifaCode: "SUI", countryCode: "CH", flagPath: flagPath("SUI"), flagAlt: "Flag of Switzerland" },
  // Group C
  { teamId: "brazil", canonicalName: "Brazil", shortName: "Brazil", fifaCode: "BRA", countryCode: "BR", flagPath: flagPath("BRA"), flagAlt: "Flag of Brazil" },
  { teamId: "morocco", canonicalName: "Morocco", shortName: "Morocco", fifaCode: "MAR", countryCode: "MA", flagPath: flagPath("MAR"), flagAlt: "Flag of Morocco" },
  { teamId: "haiti", canonicalName: "Haiti", shortName: "Haiti", fifaCode: "HAI", countryCode: "HT", flagPath: flagPath("HAI"), flagAlt: "Flag of Haiti" },
  { teamId: "scotland", canonicalName: "Scotland", shortName: "Scotland", fifaCode: "SCO", countryCode: null, flagPath: flagPath("SCO"), flagAlt: "Association flag for Scotland" },
  // Group D
  { teamId: "united-states", canonicalName: "United States", shortName: "USA", fifaCode: "USA", countryCode: "US", flagPath: flagPath("USA"), flagAlt: "Flag of the United States" },
  { teamId: "paraguay", canonicalName: "Paraguay", shortName: "Paraguay", fifaCode: "PAR", countryCode: "PY", flagPath: flagPath("PAR"), flagAlt: "Flag of Paraguay" },
  { teamId: "australia", canonicalName: "Australia", shortName: "Australia", fifaCode: "AUS", countryCode: "AU", flagPath: flagPath("AUS"), flagAlt: "Flag of Australia" },
  { teamId: "turkey", canonicalName: "Turkey", shortName: "Turkey", fifaCode: "TUR", countryCode: "TR", flagPath: flagPath("TUR"), flagAlt: "Flag of Turkey" },
  // Group E
  { teamId: "germany", canonicalName: "Germany", shortName: "Germany", fifaCode: "GER", countryCode: "DE", flagPath: flagPath("GER"), flagAlt: "Flag of Germany" },
  { teamId: "curacao", canonicalName: "Curacao", shortName: "Curaçao", fifaCode: "CUW", countryCode: "CW", flagPath: flagPath("CUW"), flagAlt: "Flag of Curaçao" },
  { teamId: "ivory-coast", canonicalName: "Ivory Coast", shortName: "Ivory Coast", fifaCode: "CIV", countryCode: "CI", flagPath: flagPath("CIV"), flagAlt: "Flag of Ivory Coast" },
  { teamId: "ecuador", canonicalName: "Ecuador", shortName: "Ecuador", fifaCode: "ECU", countryCode: "EC", flagPath: flagPath("ECU"), flagAlt: "Flag of Ecuador" },
  // Group F
  { teamId: "netherlands", canonicalName: "Netherlands", shortName: "Netherlands", fifaCode: "NED", countryCode: "NL", flagPath: flagPath("NED"), flagAlt: "Flag of the Netherlands" },
  { teamId: "japan", canonicalName: "Japan", shortName: "Japan", fifaCode: "JPN", countryCode: "JP", flagPath: flagPath("JPN"), flagAlt: "Flag of Japan" },
  { teamId: "sweden", canonicalName: "Sweden", shortName: "Sweden", fifaCode: "SWE", countryCode: "SE", flagPath: flagPath("SWE"), flagAlt: "Flag of Sweden" },
  { teamId: "tunisia", canonicalName: "Tunisia", shortName: "Tunisia", fifaCode: "TUN", countryCode: "TN", flagPath: flagPath("TUN"), flagAlt: "Flag of Tunisia" },
  // Group G
  { teamId: "belgium", canonicalName: "Belgium", shortName: "Belgium", fifaCode: "BEL", countryCode: "BE", flagPath: flagPath("BEL"), flagAlt: "Flag of Belgium" },
  { teamId: "egypt", canonicalName: "Egypt", shortName: "Egypt", fifaCode: "EGY", countryCode: "EG", flagPath: flagPath("EGY"), flagAlt: "Flag of Egypt" },
  { teamId: "iran", canonicalName: "Iran", shortName: "Iran", fifaCode: "IRN", countryCode: "IR", flagPath: flagPath("IRN"), flagAlt: "Flag of Iran" },
  { teamId: "new-zealand", canonicalName: "New Zealand", shortName: "New Zealand", fifaCode: "NZL", countryCode: "NZ", flagPath: flagPath("NZL"), flagAlt: "Flag of New Zealand" },
  // Group H
  { teamId: "spain", canonicalName: "Spain", shortName: "Spain", fifaCode: "ESP", countryCode: "ES", flagPath: flagPath("ESP"), flagAlt: "Flag of Spain" },
  { teamId: "cape-verde", canonicalName: "Cape Verde", shortName: "Cape Verde", fifaCode: "CPV", countryCode: "CV", flagPath: flagPath("CPV"), flagAlt: "Flag of Cape Verde" },
  { teamId: "saudi-arabia", canonicalName: "Saudi Arabia", shortName: "Saudi Arabia", fifaCode: "KSA", countryCode: "SA", flagPath: flagPath("KSA"), flagAlt: "Flag of Saudi Arabia" },
  { teamId: "uruguay", canonicalName: "Uruguay", shortName: "Uruguay", fifaCode: "URU", countryCode: "UY", flagPath: flagPath("URU"), flagAlt: "Flag of Uruguay" },
  // Group I
  { teamId: "france", canonicalName: "France", shortName: "France", fifaCode: "FRA", countryCode: "FR", flagPath: flagPath("FRA"), flagAlt: "Flag of France" },
  { teamId: "senegal", canonicalName: "Senegal", shortName: "Senegal", fifaCode: "SEN", countryCode: "SN", flagPath: flagPath("SEN"), flagAlt: "Flag of Senegal" },
  { teamId: "iraq", canonicalName: "Iraq", shortName: "Iraq", fifaCode: "IRQ", countryCode: "IQ", flagPath: flagPath("IRQ"), flagAlt: "Flag of Iraq" },
  { teamId: "norway", canonicalName: "Norway", shortName: "Norway", fifaCode: "NOR", countryCode: "NO", flagPath: flagPath("NOR"), flagAlt: "Flag of Norway" },
  // Group J
  { teamId: "argentina", canonicalName: "Argentina", shortName: "Argentina", fifaCode: "ARG", countryCode: "AR", flagPath: flagPath("ARG"), flagAlt: "Flag of Argentina" },
  { teamId: "algeria", canonicalName: "Algeria", shortName: "Algeria", fifaCode: "ALG", countryCode: "DZ", flagPath: flagPath("ALG"), flagAlt: "Flag of Algeria" },
  { teamId: "austria", canonicalName: "Austria", shortName: "Austria", fifaCode: "AUT", countryCode: "AT", flagPath: flagPath("AUT"), flagAlt: "Flag of Austria" },
  { teamId: "jordan", canonicalName: "Jordan", shortName: "Jordan", fifaCode: "JOR", countryCode: "JO", flagPath: flagPath("JOR"), flagAlt: "Flag of Jordan" },
  // Group K
  { teamId: "portugal", canonicalName: "Portugal", shortName: "Portugal", fifaCode: "POR", countryCode: "PT", flagPath: flagPath("POR"), flagAlt: "Flag of Portugal" },
  { teamId: "dr-congo", canonicalName: "DR Congo", shortName: "DR Congo", fifaCode: "COD", countryCode: "CD", flagPath: flagPath("COD"), flagAlt: "Flag of DR Congo" },
  { teamId: "uzbekistan", canonicalName: "Uzbekistan", shortName: "Uzbekistan", fifaCode: "UZB", countryCode: "UZ", flagPath: flagPath("UZB"), flagAlt: "Flag of Uzbekistan" },
  { teamId: "colombia", canonicalName: "Colombia", shortName: "Colombia", fifaCode: "COL", countryCode: "CO", flagPath: flagPath("COL"), flagAlt: "Flag of Colombia" },
  // Group L
  { teamId: "england", canonicalName: "England", shortName: "England", fifaCode: "ENG", countryCode: null, flagPath: flagPath("ENG"), flagAlt: "Association flag for England" },
  { teamId: "croatia", canonicalName: "Croatia", shortName: "Croatia", fifaCode: "CRO", countryCode: "HR", flagPath: flagPath("CRO"), flagAlt: "Flag of Croatia" },
  { teamId: "ghana", canonicalName: "Ghana", shortName: "Ghana", fifaCode: "GHA", countryCode: "GH", flagPath: flagPath("GHA"), flagAlt: "Flag of Ghana" },
  { teamId: "panama", canonicalName: "Panama", shortName: "Panama", fifaCode: "PAN", countryCode: "PA", flagPath: flagPath("PAN"), flagAlt: "Flag of Panama" },
];

export const UNKNOWN_TEAM_VISUAL_IDENTITY: WorldCup2026TeamVisualIdentity = {
  teamId: "unknown",
  canonicalName: "Unknown Team",
  shortName: "Unknown",
  fifaCode: "???",
  countryCode: null,
  flagPath: null,
  flagAlt: "Unknown team"
};

const IDENTITY_BY_CANONICAL = new Map<string, WorldCup2026TeamVisualIdentity>(
  IDENTITY_RECORDS.map((r) => [normalizeTeamSearchText(r.canonicalName), r])
);

const IDENTITY_BY_TEAM_ID = new Map<string, WorldCup2026TeamVisualIdentity>(
  IDENTITY_RECORDS.map((r) => [r.teamId, r])
);

export const WORLD_CUP_2026_TEAM_IDENTITIES: readonly WorldCup2026TeamVisualIdentity[] = IDENTITY_RECORDS;

export function getTeamVisualIdentity(canonicalNameOrTeamId: string): WorldCup2026TeamVisualIdentity {
  const normalized = normalizeTeamSearchText(canonicalNameOrTeamId);
  return (
    IDENTITY_BY_CANONICAL.get(normalized) ??
    IDENTITY_BY_TEAM_ID.get(normalized) ??
    UNKNOWN_TEAM_VISUAL_IDENTITY
  );
}

export function resolveTeamVisualIdentity(providerName: string): WorldCup2026TeamVisualIdentity {
  const canonical = canonicalizeTeamName(providerName);
  const byCanonical = IDENTITY_BY_CANONICAL.get(normalizeTeamSearchText(canonical));

  if (byCanonical !== undefined) {
    return byCanonical;
  }

  const normalizedInput = normalizeTeamSearchText(providerName);
  return IDENTITY_BY_CANONICAL.get(normalizedInput) ?? UNKNOWN_TEAM_VISUAL_IDENTITY;
}

export function getTeamFlagPath(canonicalNameOrTeamId: string): string | null {
  return getTeamVisualIdentity(canonicalNameOrTeamId).flagPath;
}

export function isKnownTeam(canonicalNameOrTeamId: string): boolean {
  const id = getTeamVisualIdentity(canonicalNameOrTeamId);
  return id.teamId !== "unknown";
}

export function assertAllCanonicalTeamsCovered(): void {
  for (const name of WORLD_CUP_2026_TEAM_NAMES) {
    const identity = getTeamVisualIdentity(name);
    if (identity.teamId === "unknown") {
      throw new Error(`No visual identity found for canonical team: ${name}`);
    }
  }
}
