import { simulateOneMatch, validateProbabilityMatrix } from "./simulation.js";
import type { KnockoutFixtureInput, RandomFunction, SimulatedKnockoutMatch, SimulatedKnockoutRound } from "./types.js";

function validateTeamName(teamName: string, label: string): void {
  if (teamName.trim().length === 0) {
    throw new Error(`${label} must be a non-empty team name.`);
  }
}

export function validateKnockoutFixture(fixture: KnockoutFixtureInput): void {
  validateTeamName(fixture.homeTeam, "homeTeam");
  validateTeamName(fixture.awayTeam, "awayTeam");

  if (fixture.homeTeam === fixture.awayTeam) {
    throw new Error("knockout fixture teams must be different.");
  }

  validateProbabilityMatrix(fixture.scoreMatrix);
}

function resolveDrawWinner(fixture: KnockoutFixtureInput, random: RandomFunction): { winner: string; loser: string } {
  const randomValue = random();

  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error("random function must return a finite number from 0 inclusive to 1 exclusive.");
  }

  if (randomValue < 0.5) {
    return {
      winner: fixture.homeTeam,
      loser: fixture.awayTeam
    };
  }

  return {
    winner: fixture.awayTeam,
    loser: fixture.homeTeam
  };
}

export function simulateKnockoutMatch(fixture: KnockoutFixtureInput, random: RandomFunction): SimulatedKnockoutMatch {
  validateKnockoutFixture(fixture);

  const scoreline = simulateOneMatch(fixture.scoreMatrix, { random });
  let winner: string;
  let loser: string;
  let tieBreakUsed = false;

  if (scoreline.homeGoals > scoreline.awayGoals) {
    winner = fixture.homeTeam;
    loser = fixture.awayTeam;
  } else if (scoreline.homeGoals < scoreline.awayGoals) {
    winner = fixture.awayTeam;
    loser = fixture.homeTeam;
  } else {
    const tieBreak = resolveDrawWinner(fixture, random);
    winner = tieBreak.winner;
    loser = tieBreak.loser;
    tieBreakUsed = true;
  }

  return {
    ...fixture,
    homeGoals: scoreline.homeGoals,
    awayGoals: scoreline.awayGoals,
    winner,
    loser,
    tieBreakUsed
  };
}

export function simulateKnockoutRound(
  roundName: string,
  fixtures: readonly KnockoutFixtureInput[],
  random: RandomFunction
): SimulatedKnockoutRound {
  if (roundName.trim().length === 0) {
    throw new Error("roundName must be non-empty.");
  }

  if (fixtures.length === 0) {
    throw new Error("knockout round must include at least one fixture.");
  }

  const matches = fixtures.map((fixture) => simulateKnockoutMatch(fixture, random));

  return {
    roundName,
    matches,
    winners: matches.map((match) => match.winner)
  };
}
