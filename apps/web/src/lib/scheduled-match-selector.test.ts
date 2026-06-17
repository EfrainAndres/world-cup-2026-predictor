import { describe, expect, test } from "vitest";
import { getWorldCup2026FixtureFoundation } from "@world-cup-2026-predictor/api";
import {
  formatFixtureStatus,
  formatScheduledFixtureLabel,
  getDefaultScheduledMatchSelection,
  getFixturesForGroup,
  resolveScheduledFixture
} from "./scheduled-match-selector";

const fixtureFoundation = getWorldCup2026FixtureFoundation();

describe("scheduled match selector helpers", () => {
  test("default scheduled selection uses the first official Group A fixture", () => {
    expect(getDefaultScheduledMatchSelection(fixtureFoundation)).toEqual({
      group: "A",
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa"
    });
  });

  test("group fixture filtering preserves official fixture order", () => {
    expect(getFixturesForGroup(fixtureFoundation, "C").map((fixture) => fixture.id)).toEqual([
      "wc2026-group-c-md1-01-brazil-vs-morocco",
      "wc2026-group-c-md1-02-haiti-vs-scotland",
      "wc2026-group-c-md2-03-brazil-vs-haiti",
      "wc2026-group-c-md2-04-morocco-vs-scotland",
      "wc2026-group-c-md3-05-brazil-vs-scotland",
      "wc2026-group-c-md3-06-morocco-vs-haiti"
    ]);
  });

  test("resolving a selected fixture preserves official home and away order", () => {
    const fixture = resolveScheduledFixture(fixtureFoundation, {
      group: "D",
      fixtureId: "wc2026-group-d-md1-02-australia-vs-turkey"
    });

    expect(fixture.homeTeam).toBe("Australia");
    expect(fixture.awayTeam).toBe("Turkey");
    expect(formatScheduledFixtureLabel(fixture)).toBe("Fixture 2 - Australia vs Turkey");
    expect(formatFixtureStatus(fixture.status)).toBe("Scheduled");
  });
});
