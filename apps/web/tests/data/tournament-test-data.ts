export const tournamentRounds = {
  champion: {
    navName: "Champion",
    regionName: "Champion outlook",
    sectionId: "tournament-champion-outlook",
    href: "#tournament-champion-outlook"
  },
  roundOf32: {
    navName: "Round of 32",
    regionName: "Round of 32",
    sectionId: "tournament-round-of-32",
    href: "#tournament-round-of-32"
  },
  roundOf16: {
    navName: "Round of 16",
    regionName: "Round of 16",
    sectionId: "tournament-round-of-16",
    href: "#tournament-round-of-16"
  },
  quarterfinals: {
    navName: "Quarterfinals",
    regionName: "Quarterfinals",
    sectionId: "tournament-quarterfinals",
    href: "#tournament-quarterfinals"
  },
  semifinals: {
    navName: "Semifinals",
    regionName: "Semifinals",
    sectionId: "tournament-semifinals",
    href: "#tournament-semifinals"
  },
  final: {
    navName: "Final",
    regionName: "Final",
    sectionId: "tournament-final",
    href: "#tournament-final"
  },
  thirdPlace: {
    navName: "Third Place",
    regionName: "Third Place Match",
    sectionId: "tournament-third-place",
    href: "#tournament-third-place"
  }
} as const;

export type TournamentRoundKey = keyof typeof tournamentRounds;

export const tournamentRoundKeys = [
  "champion",
  "roundOf32",
  "roundOf16",
  "quarterfinals",
  "semifinals",
  "final",
  "thirdPlace"
] as const satisfies readonly TournamentRoundKey[];

export const tournamentBracketRoundKeys = [
  "roundOf32",
  "roundOf16",
  "quarterfinals",
  "semifinals",
  "final",
  "thirdPlace"
] as const satisfies readonly TournamentRoundKey[];

export const tournamentConfirmedRoundOf32Fixtures = [
  { matchNumber: 73, homeTeam: "South Africa", awayTeam: "Canada" },
  { matchNumber: 74, homeTeam: "Brazil", awayTeam: "Japan" },
  { matchNumber: 80, homeTeam: "England", awayTeam: "DR Congo" },
  { matchNumber: 82, homeTeam: "United States", awayTeam: "Bosnia-Herzegovina" },
  { matchNumber: 87, homeTeam: "Argentina", awayTeam: "Cape Verde" },
  { matchNumber: 88, homeTeam: "Colombia", awayTeam: "Ghana" }
] as const;

export const tournamentLaterRoundFixtureCounts = [
  { round: "roundOf16", fixtureCount: 8 },
  { round: "quarterfinals", fixtureCount: 4 },
  { round: "semifinals", fixtureCount: 2 },
  { round: "final", fixtureCount: 1 },
  { round: "thirdPlace", fixtureCount: 1 }
] as const satisfies readonly { round: TournamentRoundKey; fixtureCount: number }[];

export const tournamentSentinelTexts = ["Unknown Team", "Unavailable", "???"] as const;

export const tournamentStaleTopologyRegressions = {
  canadaParaguay: {
    matchNumber: 89,
    teamA: "Canada",
    teamB: "Paraguay",
    forbiddenPairText: "Canada vs Paraguay"
  },
  canadaNorway: {
    matchNumber: 97,
    teamA: "Canada",
    teamB: "Norway",
    forbiddenPairText: "Canada vs Norway"
  }
} as const;

export const tournamentViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 }
] as const;

export const tournamentSmokeStats = {
  officialRoundOf32Fixtures: "Official R32 fixtures",
  officialRoundOf32FixtureCount: "16",
  officialKnockoutTopology: "Official knockout topology"
} as const;
