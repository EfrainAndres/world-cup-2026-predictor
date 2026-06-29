import { describe, expect, it } from "vitest";
import type { WorldCup2026DailyMatchEntry } from "./api-client";
import {
  applyMatchFilter,
  buildMatchesUrl,
  formatDisplayDate,
  getLocalDateFromKickoff,
  getMatchDetailId,
  getMatchStatusPriority,
  getNextDate,
  getPrevDate,
  parseMatchDate,
  parseMatchFilter,
  sortMatchesForDisplay
} from "./matches-experience";

function makeEntry(
  fixtureId: string,
  state: WorldCup2026DailyMatchEntry["state"],
  overrides: Partial<WorldCup2026DailyMatchEntry> = {}
): WorldCup2026DailyMatchEntry {
  return {
    fixtureId,
    homeTeam: "Team A",
    awayTeam: "Team B",
    state,
    predictionHistory: {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    },
    ...overrides
  } as WorldCup2026DailyMatchEntry;
}

describe("getMatchStatusPriority", () => {
  it("returns 0 for live", () => {
    expect(getMatchStatusPriority("live")).toBe(0);
  });

  it("returns 0 for halftime", () => {
    expect(getMatchStatusPriority("halftime")).toBe(0);
  });

  it("returns 1 for upcoming", () => {
    expect(getMatchStatusPriority("upcoming")).toBe(1);
  });

  it("returns 2 for final", () => {
    expect(getMatchStatusPriority("final")).toBe(2);
  });

  it("returns 3 for postponed", () => {
    expect(getMatchStatusPriority("postponed")).toBe(3);
  });

  it("returns 4 for cancelled", () => {
    expect(getMatchStatusPriority("cancelled")).toBe(4);
  });

  it("returns 5 for unknown", () => {
    expect(getMatchStatusPriority("unknown")).toBe(5);
  });
});

describe("sortMatchesForDisplay", () => {
  it("orders live before upcoming before final", () => {
    const matches = [
      makeEntry("c", "final"),
      makeEntry("a", "live"),
      makeEntry("b", "upcoming")
    ];
    const sorted = sortMatchesForDisplay(matches);
    expect(sorted.map((m) => m.fixtureId)).toEqual(["a", "b", "c"]);
  });

  it("orders live and halftime together before upcoming", () => {
    const matches = [
      makeEntry("b", "upcoming"),
      makeEntry("a", "halftime"),
      makeEntry("c", "final")
    ];
    const sorted = sortMatchesForDisplay(matches);
    expect(sorted[0]!.fixtureId).toBe("a");
    expect(sorted[1]!.fixtureId).toBe("b");
    expect(sorted[2]!.fixtureId).toBe("c");
  });

  it("sorts upcoming matches by kickoff ascending", () => {
    const matches = [
      makeEntry("b", "upcoming", { kickoffAt: "2026-06-14T20:00:00Z" }),
      makeEntry("a", "upcoming", { kickoffAt: "2026-06-14T17:00:00Z" })
    ];
    const sorted = sortMatchesForDisplay(matches);
    expect(sorted.map((m) => m.fixtureId)).toEqual(["a", "b"]);
  });

  it("places matches without kickoff at end within same state", () => {
    const matches = [
      makeEntry("b", "upcoming"),
      makeEntry("a", "upcoming", { kickoffAt: "2026-06-14T17:00:00Z" })
    ];
    const sorted = sortMatchesForDisplay(matches);
    expect(sorted[0]!.fixtureId).toBe("a");
    expect(sorted[1]!.fixtureId).toBe("b");
  });

  it("sorts final matches by kickoff descending (most recent first)", () => {
    const matches = [
      makeEntry("a", "final", { kickoffAt: "2026-06-14T17:00:00Z" }),
      makeEntry("b", "final", { kickoffAt: "2026-06-14T20:00:00Z" })
    ];
    const sorted = sortMatchesForDisplay(matches);
    expect(sorted.map((m) => m.fixtureId)).toEqual(["b", "a"]);
  });
});

describe("applyMatchFilter", () => {
  const matches = [
    makeEntry("live1", "live"),
    makeEntry("halftime1", "halftime"),
    makeEntry("upcoming1", "upcoming"),
    makeEntry("final1", "final"),
    makeEntry("predicted1", "upcoming", {
      predictionHistory: {
        snapshot: { available: true },
        evaluation: { available: false },
        warnings: []
      }
    })
  ];

  it("all returns all matches", () => {
    expect(applyMatchFilter(matches, "all")).toHaveLength(5);
  });

  it("live returns live and halftime matches", () => {
    const result = applyMatchFilter(matches, "live");
    expect(result.map((m) => m.fixtureId)).toEqual(["live1", "halftime1"]);
  });

  it("upcoming returns only upcoming matches", () => {
    const result = applyMatchFilter(matches, "upcoming");
    expect(result.map((m) => m.fixtureId)).toEqual(["upcoming1", "predicted1"]);
  });

  it("finished returns only final matches", () => {
    const result = applyMatchFilter(matches, "finished");
    expect(result.map((m) => m.fixtureId)).toEqual(["final1"]);
  });

  it("predicted returns only matches with available snapshots", () => {
    const result = applyMatchFilter(matches, "predicted");
    expect(result.map((m) => m.fixtureId)).toEqual(["predicted1"]);
  });
});

describe("parseMatchFilter", () => {
  it("returns all for undefined", () => {
    expect(parseMatchFilter(undefined)).toBe("all");
  });

  it("returns all for unknown value", () => {
    expect(parseMatchFilter("invalid")).toBe("all");
  });

  it("returns valid filter values", () => {
    expect(parseMatchFilter("live")).toBe("live");
    expect(parseMatchFilter("upcoming")).toBe("upcoming");
    expect(parseMatchFilter("finished")).toBe("finished");
    expect(parseMatchFilter("predicted")).toBe("predicted");
    expect(parseMatchFilter("all")).toBe("all");
  });
});

describe("parseMatchDate", () => {
  const fallback = "2026-06-14";

  it("returns fallback for undefined", () => {
    expect(parseMatchDate(undefined, fallback)).toBe(fallback);
  });

  it("returns fallback for malformed date", () => {
    expect(parseMatchDate("not-a-date", fallback)).toBe(fallback);
    expect(parseMatchDate("2026/06/14", fallback)).toBe(fallback);
    expect(parseMatchDate("14-06-2026", fallback)).toBe(fallback);
  });

  it("returns fallback for invalid calendar date", () => {
    expect(parseMatchDate("2026-02-30", fallback)).toBe(fallback);
    expect(parseMatchDate("2026-13-01", fallback)).toBe(fallback);
  });

  it("returns valid date strings unchanged", () => {
    expect(parseMatchDate("2026-06-14", fallback)).toBe("2026-06-14");
    expect(parseMatchDate("2026-12-31", fallback)).toBe("2026-12-31");
  });
});

describe("buildMatchesUrl", () => {
  it("builds URL with date only when filter is all", () => {
    const url = buildMatchesUrl("2026-06-14", "all");
    expect(url).toBe("/matches?date=2026-06-14");
  });

  it("builds URL with date and filter when filter is not all", () => {
    const url = buildMatchesUrl("2026-06-14", "live");
    expect(url).toBe("/matches?date=2026-06-14&filter=live");
  });

  it("defaults filter to all", () => {
    const url = buildMatchesUrl("2026-06-14");
    expect(url).toBe("/matches?date=2026-06-14");
  });
});

describe("getMatchDetailId", () => {
  it("preserves canonical group fixture IDs", () => {
    const id = getMatchDetailId(
      makeEntry("wc2026-group-a-md1-01-mexico-vs-south-africa", "upcoming", {
        homeTeam: "Mexico",
        awayTeam: "South Africa"
      })
    );

    expect(id).toBe("wc2026-group-a-md1-01-mexico-vs-south-africa");
  });

  it("maps official Round-of-32 provider records to stable canonical IDs", () => {
    const id = getMatchDetailId(
      makeEntry("537417", "final", {
        homeTeam: "South Africa",
        awayTeam: "Canada"
      })
    );

    expect(id).toBe("wc2026-match-73-south-africa-vs-canada");
  });
});

describe("getPrevDate / getNextDate", () => {
  it("getPrevDate shifts back one day", () => {
    expect(getPrevDate("2026-06-14")).toBe("2026-06-13");
  });

  it("getNextDate shifts forward one day", () => {
    expect(getNextDate("2026-06-14")).toBe("2026-06-15");
  });

  it("handles month boundary", () => {
    expect(getPrevDate("2026-07-01")).toBe("2026-06-30");
    expect(getNextDate("2026-06-30")).toBe("2026-07-01");
  });
});

describe("getLocalDateFromKickoff", () => {
  it("returns Colombia-local date for a UTC timestamp on the same calendar day", () => {
    // 2026-06-28 at 15:00 UTC = 10:00 Bogota (UTC-5) — same calendar day
    expect(getLocalDateFromKickoff("2026-06-28T15:00:00Z")).toBe("2026-06-28");
  });

  it("returns the previous Colombia-local date for a UTC timestamp that crosses midnight", () => {
    // 2026-06-29 at 01:00 UTC = 2026-06-28 at 20:00 Bogota (UTC-5)
    expect(getLocalDateFromKickoff("2026-06-29T01:00:00Z")).toBe("2026-06-28");
  });

  it("handles a kickoff at exactly midnight UTC", () => {
    // 2026-07-01 at 00:00 UTC = 2026-06-30 at 19:00 Bogota (UTC-5)
    expect(getLocalDateFromKickoff("2026-07-01T00:00:00Z")).toBe("2026-06-30");
  });
});

describe("formatDisplayDate", () => {
  it("formats a date as weekday, month day, year", () => {
    const result = formatDisplayDate("2026-06-14");
    expect(result).toContain("2026");
    expect(result).toContain("Jun");
  });

  it("returns the original string for invalid input", () => {
    expect(formatDisplayDate("bad")).toBe("bad");
  });
});
