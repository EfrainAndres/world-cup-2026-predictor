export interface PredictionTeam {
  value: string;
  optionLabel: string;
  searchText?: string;
}

export const predictionTeams = {
  brazil: { value: "Brazil", optionLabel: "Brazil · Group C" },
  czechia: { value: "Czechia", optionLabel: "Czechia · Group A", searchText: "Czech Republic" },
  england: { value: "England", optionLabel: "England · Group L" },
  france: { value: "France", optionLabel: "France · Group I" },
  germany: { value: "Germany", optionLabel: "Germany · Group E" },
  haiti: { value: "Haiti", optionLabel: "Haiti · Group C" },
  mexico: { value: "Mexico", optionLabel: "Mexico · Group A" },
  netherlands: { value: "Netherlands", optionLabel: "Netherlands · Group F" },
  scotland: { value: "Scotland", optionLabel: "Scotland · Group C" },
  southAfrica: { value: "South Africa", optionLabel: "South Africa · Group A" },
  southKorea: { value: "South Korea", optionLabel: "South Korea · Group A", searchText: "Korea Republic" },
  spain: { value: "Spain", optionLabel: "Spain · Group H" },
  unitedStates: { value: "United States", optionLabel: "United States · Group D", searchText: "USA" }
} as const satisfies Record<string, PredictionTeam>;

export const predictionFixtures = {
  mexicoSouthAfrica: "wc2026-group-a-md1-01-mexico-vs-south-africa",
  southKoreaCzechia: "wc2026-group-a-md1-02-south-korea-vs-czechia",
  haitiScotland: "wc2026-group-c-md1-02-haiti-vs-scotland",
  brazilMorocco: "wc2026-group-c-md1-01-brazil-vs-morocco",
  australiaTurkey: "wc2026-group-d-md1-02-australia-vs-turkey"
} as const;

export const predictionGroups = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  g: "G"
} as const;

export const predictionMatchups = {
  mexicoSouthAfrica: "Mexico vs South Africa",
  brazilGermany: "Brazil vs Germany",
  franceNetherlands: "France vs Netherlands",
  haitiScotland: "Haiti vs Scotland",
  spainEngland: "Spain vs England",
  southKoreaFrance: "South Korea vs France",
  czechiaFrance: "Czechia vs France",
  unitedStatesFrance: "United States vs France",
  belgiumEgypt: /Belgium vs Egypt/,
  brazilMorocco: "Brazil vs Morocco"
} as const;

export const mobileViewports = {
  width320: { width: 320, height: 812 },
  width375: { width: 375, height: 812 },
  width390: { width: 390, height: 844 },
  width430: { width: 430, height: 932 },
  iPhone12ProMax: { width: 428, height: 926 }
} as const;
