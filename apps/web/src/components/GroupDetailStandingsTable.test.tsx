import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { GroupDetailStandingsTable } from "./GroupDetailStandingsTable";
import type { WorldCup2026GroupStandingEntry } from "../lib/api-client";

const standings: WorldCup2026GroupStandingEntry[] = [
  { team: "Mexico", points: 9, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: 6 },
  { team: "Canada", points: 6, played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1 },
  { team: "Honduras", points: 3, played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3 },
  { team: "Jamaica", points: 0, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 5, goalDifference: -4 }
];

describe("GroupDetailStandingsTable", () => {
  test("renders all team rows", () => {
    const html = renderToStaticMarkup(
      <GroupDetailStandingsTable standings={standings} label="Official standings" />
    );
    expect(html).toContain("Mexico");
    expect(html).toContain("Canada");
    expect(html).toContain("Honduras");
    expect(html).toContain("Jamaica");
  });

  test("renders correct points and stats", () => {
    const html = renderToStaticMarkup(
      <GroupDetailStandingsTable standings={standings} label="Official standings" />
    );
    expect(html).toContain("9");
    expect(html).toContain("6");
    expect(html).toContain("7");
  });

  test("renders label", () => {
    const html = renderToStaticMarkup(
      <GroupDetailStandingsTable standings={standings} label="Official standings" />
    );
    expect(html).toContain("Official standings");
  });

  test("renders provisional label for live provisional standings", () => {
    const html = renderToStaticMarkup(
      <GroupDetailStandingsTable standings={standings} label="Live provisional standings" />
    );
    expect(html).toContain("Live provisional standings");
  });

  test("renders empty table body when no standings", () => {
    const html = renderToStaticMarkup(
      <GroupDetailStandingsTable standings={[]} label="Official standings" />
    );
    expect(html).toContain("Official standings");
    expect(html).not.toContain("Mexico");
  });
});
