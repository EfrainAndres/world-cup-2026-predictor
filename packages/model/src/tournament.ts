import { simulateGroup } from "./group-stage.js";
import { simulateKnockoutRound } from "./knockout.js";
import { createSeededRandom, validateProbabilityMatrix } from "./simulation.js";
import type {
  KnockoutFixtureInput,
  RandomFunction,
  SimulatedGroupResult,
  SimulatedKnockoutRound,
  SimulatedTournamentResult,
  TournamentInput,
  TournamentMetadata,
  TournamentSimulationConfig
} from "./types.js";

function getRandomFunction(config?: TournamentSimulationConfig): RandomFunction {
  if (config?.random !== undefined) {
    return config.random;
  }

  if (config?.seed !== undefined) {
    return createSeededRandom(config.seed);
  }

  return Math.random;
}

function isPowerOfTwo(value: number): boolean {
  return Number.isInteger(value) && value >= 2 && (value & (value - 1)) === 0;
}

function getRoundName(teamCount: number): string {
  if (teamCount === 2) {
    return "Final";
  }

  if (teamCount === 4) {
    return "Semifinals";
  }

  if (teamCount === 8) {
    return "Quarterfinals";
  }

  return `Round of ${teamCount}`;
}

function validateTournamentInput(input: TournamentInput): void {
  if (input.name.trim().length === 0) {
    throw new Error("tournament name must be non-empty.");
  }

  if (input.groups.length === 0) {
    throw new Error("tournament must include at least one group.");
  }

  validateProbabilityMatrix(input.knockoutScoreMatrix);
}

function createOpeningFixtures(qualifiers: readonly string[], knockoutScoreMatrix: TournamentInput["knockoutScoreMatrix"]): KnockoutFixtureInput[] {
  if (!isPowerOfTwo(qualifiers.length)) {
    throw new Error("qualified team count must be a power of two for the simplified tournament bracket.");
  }

  const fixtures: KnockoutFixtureInput[] = [];

  for (let index = 0; index < qualifiers.length / 2; index += 1) {
    const homeTeam = qualifiers[index];
    const awayTeam = qualifiers[qualifiers.length - 1 - index];

    if (homeTeam === undefined || awayTeam === undefined) {
      throw new Error("qualified teams are missing for bracket creation.");
    }

    fixtures.push({
      homeTeam,
      awayTeam,
      scoreMatrix: knockoutScoreMatrix
    });
  }

  return fixtures;
}

function createNextRoundFixtures(winners: readonly string[], knockoutScoreMatrix: TournamentInput["knockoutScoreMatrix"]): KnockoutFixtureInput[] {
  if (winners.length % 2 !== 0) {
    throw new Error("knockout winners must be an even number before the final champion is decided.");
  }

  const fixtures: KnockoutFixtureInput[] = [];

  for (let index = 0; index < winners.length; index += 2) {
    const homeTeam = winners[index];
    const awayTeam = winners[index + 1];

    if (homeTeam === undefined || awayTeam === undefined) {
      throw new Error("knockout winners are missing for next-round fixture creation.");
    }

    fixtures.push({
      homeTeam,
      awayTeam,
      scoreMatrix: knockoutScoreMatrix
    });
  }

  return fixtures;
}

function buildMetadata(
  input: TournamentInput,
  qualifiedTeamCount: number,
  knockoutRoundCount: number,
  metadata?: Record<string, string>
): TournamentMetadata {
  const tournamentMetadata: TournamentMetadata = {
    tournamentName: input.name,
    groupCount: input.groups.length,
    qualifiedTeamCount,
    knockoutRoundCount,
    format: "Simplified power-of-two knockout bracket from group qualifiers",
    notes: [
      "Group standings use points, goal difference, goals for, then team name.",
      "Knockout draws are resolved by deterministic seeded randomness when provided.",
      "This is not the full FIFA World Cup 2026 format."
    ]
  };

  if (metadata !== undefined) {
    tournamentMetadata.metadata = metadata;
  }

  return tournamentMetadata;
}

export function simulateTournament(input: TournamentInput, config?: TournamentSimulationConfig): SimulatedTournamentResult {
  validateTournamentInput(input);

  const random = getRandomFunction(config);
  const groupResults: SimulatedGroupResult[] = input.groups.map((group) => simulateGroup(group, random, input.groupQualifiersCount ?? 2));
  const qualifiers = groupResults.flatMap((group) => group.qualifiers.map((standing) => standing.team));

  if (!isPowerOfTwo(qualifiers.length)) {
    throw new Error("qualified team count must be a power of two for the simplified tournament bracket.");
  }

  let fixtures = createOpeningFixtures(qualifiers, input.knockoutScoreMatrix);
  const knockoutResults: SimulatedKnockoutRound[] = [];

  while (fixtures.length > 0) {
    const roundTeamCount = fixtures.length * 2;
    const round = simulateKnockoutRound(getRoundName(roundTeamCount), fixtures, random);
    knockoutResults.push(round);

    if (round.winners.length === 1) {
      const finalMatch = round.matches[0];

      if (finalMatch === undefined) {
        throw new Error("final match result is missing.");
      }

      return {
        groupResults,
        knockoutResults,
        champion: finalMatch.winner,
        runnerUp: finalMatch.loser,
        metadata: buildMetadata(input, qualifiers.length, knockoutResults.length, input.metadata)
      };
    }

    fixtures = createNextRoundFixtures(round.winners, input.knockoutScoreMatrix);
  }

  throw new Error("tournament simulation did not produce a champion.");
}
