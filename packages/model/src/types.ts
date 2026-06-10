export type EloResult = "home_win" | "draw" | "away_win";

export interface EloConfig {
  initialRating: number;
  kFactor: number;
}

export interface EloMatch {
  match_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  neutral_site: boolean;
  home_score?: number;
  away_score?: number;
  result?: EloResult;
}

export interface EloRatingEntry {
  team: string;
  rating: number;
}

export type EloRatingMap = ReadonlyMap<string, number>;

export interface EloMatchRatingHistory {
  match_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_rating_before: number;
  away_rating_before: number;
  home_rating_after: number;
  away_rating_after: number;
  home_rating_delta: number;
  away_rating_delta: number;
  result: EloResult;
}

export interface EloProcessResult {
  ratings: EloRatingMap;
  matchHistory: EloMatchRatingHistory[];
}

export interface ExpectedGoalsInput {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
}

export interface PoissonConfig {
  maxGoals: number;
  normalizeMatrix: boolean;
}

export interface ScorelineProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface OutcomeProbabilities {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  totalProbability: number;
}

export interface DixonColesConfig extends PoissonConfig {
  rho: number;
}

export type RandomFunction = () => number;

export interface MonteCarloSimulationConfig {
  simulationCount: number;
  seed?: number;
  random?: RandomFunction;
  mostCommonScorelineLimit?: number;
}

export interface SimulatedScoreline {
  homeGoals: number;
  awayGoals: number;
}

export interface SimulatedScorelineSummary extends SimulatedScoreline {
  count: number;
  estimatedProbability: number;
}

export interface MonteCarloMatchSimulationResult {
  homeWins: number;
  draws: number;
  awayWins: number;
  estimatedHomeWinProbability: number;
  estimatedDrawProbability: number;
  estimatedAwayWinProbability: number;
  mostCommonScorelines: SimulatedScorelineSummary[];
  simulationCount: number;
}

export interface TournamentTeamInput {
  name: string;
}

export interface GroupMatchInput {
  homeTeam: string;
  awayTeam: string;
  scoreMatrix: readonly ScorelineProbability[];
}

export interface GroupInput {
  name: string;
  teams: readonly TournamentTeamInput[];
  matches: readonly GroupMatchInput[];
  qualifiersCount?: number;
}

export interface GroupStanding {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface SimulatedGroupMatch extends GroupMatchInput {
  homeGoals: number;
  awayGoals: number;
}

export interface SimulatedGroupResult {
  groupName: string;
  matches: SimulatedGroupMatch[];
  standings: GroupStanding[];
  qualifiers: GroupStanding[];
}

export interface KnockoutFixtureInput {
  homeTeam: string;
  awayTeam: string;
  scoreMatrix: readonly ScorelineProbability[];
}

export interface SimulatedKnockoutMatch extends KnockoutFixtureInput {
  homeGoals: number;
  awayGoals: number;
  winner: string;
  loser: string;
  tieBreakUsed: boolean;
}

export interface SimulatedKnockoutRound {
  roundName: string;
  matches: SimulatedKnockoutMatch[];
  winners: string[];
}

export interface TournamentSimulationConfig {
  seed?: number;
  random?: RandomFunction;
}

export interface TournamentInput {
  name: string;
  groups: readonly GroupInput[];
  knockoutScoreMatrix: readonly ScorelineProbability[];
  groupQualifiersCount?: number;
  metadata?: Record<string, string>;
}

export interface TournamentMetadata {
  tournamentName: string;
  groupCount: number;
  qualifiedTeamCount: number;
  knockoutRoundCount: number;
  format: string;
  notes: string[];
  metadata?: Record<string, string>;
}

export interface SimulatedTournamentResult {
  groupResults: SimulatedGroupResult[];
  knockoutResults: SimulatedKnockoutRound[];
  champion: string;
  runnerUp: string;
  metadata: TournamentMetadata;
}

export interface TournamentRepeatedRunsConfig extends TournamentSimulationConfig {
  runCount: number;
  maxRunCount?: number;
}

export interface TournamentTeamProbabilitySummary {
  team: string;
  count: number;
  probability: number;
}

export interface TournamentRepeatedRunsMetadata {
  tournamentName: string;
  totalRuns: number;
  seed?: number;
  maxRunCount: number;
  format: string;
  notes: string[];
}

export interface TournamentRepeatedRunsResult {
  totalRuns: number;
  championProbabilities: TournamentTeamProbabilitySummary[];
  runnerUpProbabilities: TournamentTeamProbabilitySummary[];
  knockoutQualificationProbabilities: TournamentTeamProbabilitySummary[];
  groupQualificationProbabilities: TournamentTeamProbabilitySummary[];
  metadata: TournamentRepeatedRunsMetadata;
}
