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
