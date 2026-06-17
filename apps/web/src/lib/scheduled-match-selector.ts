import type { WorldCup2026Fixture, WorldCup2026FixtureFoundationResponse } from "@world-cup-2026-predictor/api";

export interface ScheduledMatchSelection {
  group: string;
  fixtureId: string;
}

export function getFixturesForGroup(
  fixtureFoundation: WorldCup2026FixtureFoundationResponse,
  group: string
): WorldCup2026Fixture[] {
  return fixtureFoundation.fixtures
    .filter((fixture) => fixture.group === group)
    .slice()
    .sort((a, b) => a.groupFixtureOrder - b.groupFixtureOrder);
}

export function getDefaultScheduledMatchSelection(
  fixtureFoundation: WorldCup2026FixtureFoundationResponse
): ScheduledMatchSelection {
  const defaultGroup = fixtureFoundation.groups[0];

  if (defaultGroup === undefined) {
    throw new Error("World Cup fixture foundation must expose at least one group.");
  }

  const defaultFixture = getFixturesForGroup(fixtureFoundation, defaultGroup.group)[0];

  if (defaultFixture === undefined) {
    throw new Error(`World Cup fixture foundation must expose at least one fixture for Group ${defaultGroup.group}.`);
  }

  return {
    group: defaultGroup.group,
    fixtureId: defaultFixture.id
  };
}

export function resolveScheduledFixture(
  fixtureFoundation: WorldCup2026FixtureFoundationResponse,
  selection: ScheduledMatchSelection
): WorldCup2026Fixture {
  const selectedFixture = getFixturesForGroup(fixtureFoundation, selection.group).find((fixture) => fixture.id === selection.fixtureId);

  if (selectedFixture !== undefined) {
    return selectedFixture;
  }

  const fallbackFixture = getFixturesForGroup(fixtureFoundation, selection.group)[0];

  if (fallbackFixture !== undefined) {
    return fallbackFixture;
  }

  throw new Error(`World Cup fixture foundation must expose at least one fixture for Group ${selection.group}.`);
}

export function formatScheduledFixtureLabel(fixture: WorldCup2026Fixture): string {
  return `Fixture ${fixture.groupFixtureOrder} - ${fixture.homeTeam} vs ${fixture.awayTeam}`;
}

export function formatFixtureStatus(status: WorldCup2026Fixture["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
