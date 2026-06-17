import type {
  LiveEloRatingSource,
  PredictionConfidenceAssessment,
  PredictionConfidenceLevel,
  PredictionCoverageType
} from "./schemas.js";

const MEANINGFUL_TEAM_MATCH_THRESHOLD = 5;
const SPARSE_TEAM_MATCH_THRESHOLD = 2;

export interface AssessPredictionConfidenceInput {
  homeTeam: string;
  awayTeam: string;
  homeRatingSource: LiveEloRatingSource;
  awayRatingSource: LiveEloRatingSource;
  homeMatchesPlayed: number;
  awayMatchesPlayed: number;
  matchesProcessed: number;
  latestMatchDate?: string | undefined;
  currentTournamentMatchesIncluded?: number | undefined;
  fallbackSeedRating: number;
  dataCoverage: string;
  attackDefenseAvailable?: boolean | undefined;
}

function includesPartialCoverageMarker(dataCoverage: string): boolean {
  return dataCoverage.toLocaleLowerCase().includes("partial");
}

function pushReason(reasons: string[], message: string): void {
  if (!reasons.includes(message)) {
    reasons.push(message);
  }
}

function classifyCoverageType(input: AssessPredictionConfidenceInput): PredictionCoverageType {
  const homeUsesFallback = input.homeRatingSource === "fallback_seed";
  const awayUsesFallback = input.awayRatingSource === "fallback_seed";

  if (homeUsesFallback && awayUsesFallback) {
    return "fallback_only";
  }

  if (homeUsesFallback || awayUsesFallback) {
    return "fallback";
  }

  const hasRecentMetadata = typeof input.latestMatchDate === "string" && input.latestMatchDate.length > 0;
  const hasMeaningfulCoverage =
    input.homeMatchesPlayed >= MEANINGFUL_TEAM_MATCH_THRESHOLD &&
    input.awayMatchesPlayed >= MEANINGFUL_TEAM_MATCH_THRESHOLD;
  const hasAttackDefenseContext = input.attackDefenseAvailable === true;

  if (!includesPartialCoverageMarker(input.dataCoverage) && hasRecentMetadata && hasMeaningfulCoverage && hasAttackDefenseContext) {
    return "full";
  }

  return "partial";
}

function classifyConfidenceLevel(
  input: AssessPredictionConfidenceInput,
  coverageType: PredictionCoverageType
): PredictionConfidenceLevel {
  const homeUsesFallback = input.homeRatingSource === "fallback_seed";
  const awayUsesFallback = input.awayRatingSource === "fallback_seed";
  const bothSparse =
    input.homeMatchesPlayed <= SPARSE_TEAM_MATCH_THRESHOLD && input.awayMatchesPlayed <= SPARSE_TEAM_MATCH_THRESHOLD;
  const oneTeamSparse =
    (input.homeMatchesPlayed <= SPARSE_TEAM_MATCH_THRESHOLD && input.awayMatchesPlayed > MEANINGFUL_TEAM_MATCH_THRESHOLD) ||
    (input.awayMatchesPlayed <= SPARSE_TEAM_MATCH_THRESHOLD && input.homeMatchesPlayed > MEANINGFUL_TEAM_MATCH_THRESHOLD);

  if (homeUsesFallback && awayUsesFallback) {
    return "very_low";
  }

  if (homeUsesFallback || awayUsesFallback) {
    return "low";
  }

  if (bothSparse) {
    return "very_low";
  }

  if (oneTeamSparse) {
    return "low";
  }

  if (coverageType === "full") {
    return "high";
  }

  return "medium";
}

export function assessPredictionConfidence(input: AssessPredictionConfidenceInput): PredictionConfidenceAssessment {
  const coverageType = classifyCoverageType(input);
  const level = classifyConfidenceLevel(input, coverageType);
  const homeUsesFallback = input.homeRatingSource === "fallback_seed";
  const awayUsesFallback = input.awayRatingSource === "fallback_seed";
  const reasons: string[] = [];

  if (homeUsesFallback && awayUsesFallback) {
    pushReason(
      reasons,
      `Both teams use the fallback rating of ${input.fallbackSeedRating}.`
    );
  } else if (homeUsesFallback || awayUsesFallback) {
    if (homeUsesFallback) {
      pushReason(reasons, `${input.homeTeam} uses the fallback rating of ${input.fallbackSeedRating}.`);
    }

    if (awayUsesFallback) {
      pushReason(reasons, `${input.awayTeam} uses the fallback rating of ${input.fallbackSeedRating}.`);
    }
  } else {
    pushReason(reasons, "Both teams use computed Live Elo ratings.");
  }

  if (coverageType === "full") {
    pushReason(reasons, "Both teams have rating coverage with supporting metadata available.");
  } else {
    pushReason(reasons, "The international dataset is partial and curated.");
  }

  const sparseHome = input.homeMatchesPlayed <= SPARSE_TEAM_MATCH_THRESHOLD;
  const sparseAway = input.awayMatchesPlayed <= SPARSE_TEAM_MATCH_THRESHOLD;
  if (!homeUsesFallback && !awayUsesFallback && sparseHome && sparseAway) {
    pushReason(reasons, "Both teams have very limited direct match coverage in the current dataset.");
  } else if (!homeUsesFallback && !awayUsesFallback) {
    if (sparseHome && input.awayMatchesPlayed > MEANINGFUL_TEAM_MATCH_THRESHOLD) {
      pushReason(reasons, `${input.homeTeam} has much thinner direct match coverage than ${input.awayTeam}.`);
    }

    if (sparseAway && input.homeMatchesPlayed > MEANINGFUL_TEAM_MATCH_THRESHOLD) {
      pushReason(reasons, `${input.awayTeam} has much thinner direct match coverage than ${input.homeTeam}.`);
    }
  }

  if ((input.currentTournamentMatchesIncluded ?? 0) === 0) {
    pushReason(reasons, "No current World Cup 2026 matches are included yet.");
  }

  if (input.attackDefenseAvailable !== true) {
    pushReason(reasons, "Attack and defense ratings are unavailable.");
  }

  if (level === "low" || level === "very_low") {
    pushReason(reasons, "Manual xG review is recommended.");
  }

  return {
    level,
    coverageType,
    reasons,
    dataPoints: {
      homeUsesFallback,
      awayUsesFallback,
      homeMatchesPlayed: input.homeMatchesPlayed,
      awayMatchesPlayed: input.awayMatchesPlayed,
      historicalMatchesAvailable: input.matchesProcessed,
      latestMatchDate: input.latestMatchDate,
      currentTournamentMatchesIncluded: input.currentTournamentMatchesIncluded,
      attackDefenseAvailable: input.attackDefenseAvailable
    },
    manualXgRecommended: level === "low" || level === "very_low"
  };
}
