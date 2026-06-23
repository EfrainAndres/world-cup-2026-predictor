import { describe, expect, it, vi } from "vitest";
import {
  createCachedResultsProvider,
  createFootballDataOrgResultsProvider,
  synchronizeWorldCup2026Results,
  type FootballDataOrgProviderConfig,
  type WorldCup2026FootballResultsProvider
} from "../src/index.js";

function buildMatchesResponse(matches: unknown[]) {
  return { count: matches.length, matches };
}

function buildStandingsResponse(standings: unknown[]) {
  return { standings };
}

function buildMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 123456,
    utcDate: "2026-06-11T19:00:00Z",
    status: "FINISHED",
    matchday: 1,
    stage: "GROUP_STAGE",
    group: "GROUP_A",
    lastUpdated: "2026-06-11T21:30:00Z",
    homeTeam: { id: 762, name: "Mexico", shortName: "Mexico" },
    awayTeam: { id: 815, name: "South Africa", shortName: "South Africa" },
    score: { fullTime: { home: 2, away: 0 } },
    ...overrides
  };
}

function buildStandingGroup(overrides: Record<string, unknown> = {}) {
  return {
    stage: "GROUP_STAGE",
    type: "TOTAL",
    group: "GROUP_A",
    table: [
      {
        position: 1,
        team: { id: 762, name: "Mexico" },
        playedGames: 1,
        won: 1,
        draw: 0,
        lost: 0,
        goalsFor: 2,
        goalsAgainst: 0,
        goalDifference: 2,
        points: 3
      }
    ],
    ...overrides
  };
}

function createMockFetch(
  matchesPayload: unknown,
  standingsPayload: unknown,
  options: { matchesOk?: boolean; standingsOk?: boolean; throwOnFetch?: boolean } = {}
): typeof globalThis.fetch {
  return vi.fn().mockImplementation(async (url: unknown) => {
    if (options.throwOnFetch === true) {
      throw new Error("Network connection refused.");
    }

    const urlStr = String(url);

    if (urlStr.includes("/matches")) {
      return {
        ok: options.matchesOk !== false,
        status: options.matchesOk === false ? 401 : 200,
        json: async () => matchesPayload
      } as Response;
    }

    return {
      ok: options.standingsOk !== false,
      status: options.standingsOk === false ? 503 : 200,
      json: async () => standingsPayload
    } as Response;
  }) as typeof globalThis.fetch;
}

const defaultConfig = (overrides: Partial<FootballDataOrgProviderConfig> = {}): FootballDataOrgProviderConfig => ({
  token: "test-token-placeholder",
  ...overrides
});

describe("createFootballDataOrgResultsProvider", () => {
  it("fetches matches from the correct URL with default competition code and season", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      buildStandingsResponse([buildStandingGroup()])
    );

    await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions/WC/matches?season=2026"),
      expect.any(Object)
    );
  });

  it("uses custom competition code and season from config", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      buildStandingsResponse([buildStandingGroup()])
    );

    await createFootballDataOrgResultsProvider(
      defaultConfig({ competitionCode: "EC", season: "2024", fetch: mockFetch })
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions/EC/matches?season=2024"),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/competitions/EC/standings?season=2024"),
      expect.any(Object)
    );
  });

  it("sends X-Auth-Token header on every request", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      buildStandingsResponse([buildStandingGroup()])
    );

    await createFootballDataOrgResultsProvider(defaultConfig({ token: "secret-api-key", fetch: mockFetch }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ "X-Auth-Token": "secret-api-key" }) })
    );
  });

  it("maps FINISHED status to finished", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch({ status: "FINISHED" })]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.records[0]?.status).toBe("finished");
  });

  it("maps IN_PLAY status to live", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "IN_PLAY", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getLiveMatches();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.records[0]?.status).toBe("live");
  });

  it("maps PAUSED status to halftime", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "PAUSED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const liveMatches = provider.getLiveMatches();

    expect(liveMatches.status).toBe("success");
    if (liveMatches.status !== "success") return;
    expect(liveMatches.records[0]?.status).toBe("halftime");
  });

  it("maps SCHEDULED status to scheduled", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "SCHEDULED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.status).toBe("scheduled");
  });

  it("maps TIMED status to scheduled", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "TIMED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.status).toBe("scheduled");
  });

  it("maps POSTPONED status to postponed", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "POSTPONED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.status).toBe("postponed");
  });

  it("maps SUSPENDED status to cancelled", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "SUSPENDED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.status).toBe("cancelled");
  });

  it("maps CANCELLED status to cancelled", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "CANCELLED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.status).toBe("cancelled");
  });

  it("maps an unknown status to unknown", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ status: "RAIN_DELAY", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.status).toBe("unknown");
  });

  it("strips GROUP_ prefix from group name", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch({ group: "GROUP_C" })]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.group).toBe("C");
  });

  it("splits matches correctly into live, completed, and all fixtures", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ id: 1, status: "FINISHED" }),
        buildMatch({ id: 2, status: "IN_PLAY", score: { fullTime: { home: null, away: null } } }),
        buildMatch({ id: 3, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));

    const fixtures = provider.getFixtures();
    const liveMatches = provider.getLiveMatches();
    const completedResults = provider.getCompletedResults();

    expect(fixtures.status).toBe("success");
    expect(liveMatches.status).toBe("success");
    expect(completedResults.status).toBe("success");

    if (fixtures.status !== "success" || liveMatches.status !== "success" || completedResults.status !== "success") return;

    expect(fixtures.records).toHaveLength(3);
    expect(liveMatches.records).toHaveLength(1);
    expect(liveMatches.records[0]?.status).toBe("live");
    expect(completedResults.records).toHaveLength(1);
    expect(completedResults.records[0]?.status).toBe("finished");
  });

  it("maps standings from API response with correct fields", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const standings = provider.getStandings();

    expect(standings.status).toBe("success");
    if (standings.status !== "success") return;

    expect(standings.records).toHaveLength(1);
    expect(standings.records[0]).toMatchObject({
      group: "A",
      team: "Mexico",
      position: 1,
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 3
    });
  });

  it("ignores non-TOTAL standings groups (home/away splits)", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      buildStandingsResponse([
        buildStandingGroup({ type: "TOTAL" }),
        buildStandingGroup({ type: "HOME" }),
        buildStandingGroup({ type: "AWAY" })
      ])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const standings = provider.getStandings();

    expect(standings.status).toBe("success");
    if (standings.status !== "success") return;
    expect(standings.records).toHaveLength(1);
  });

  it("returns a failing provider when matches endpoint returns HTTP error", async () => {
    const mockFetch = createMockFetch(
      {},
      buildStandingsResponse([buildStandingGroup()]),
      { matchesOk: false }
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.error.code).toBe("provider_unavailable");
    expect(result.error.providerId).toBe("football_data_org_results_provider");
  });

  it("returns a failing provider when standings endpoint returns HTTP error", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      {},
      { standingsOk: false }
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getStandings();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.error.code).toBe("provider_unavailable");
  });

  it("returns a failing provider when fetch throws a network error", async () => {
    const mockFetch = createMockFetch({}, {}, { throwOnFetch: true });
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.error.code).toBe("provider_unavailable");
    expect(result.error.message).toContain("Network request failed");
  });

  it("returns a failing provider when response body is not valid JSON", async () => {
    const badFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      }
    } as unknown as Response) as typeof globalThis.fetch;

    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: badFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.error.code).toBe("provider_unavailable");
  });

  it("does not include the token in provider warnings or error messages", async () => {
    const mockFetch = createMockFetch({}, {}, { matchesOk: false });
    const provider = await createFootballDataOrgResultsProvider(
      defaultConfig({ token: "super-secret-token-123", fetch: mockFetch })
    );
    const result = provider.getFixtures();

    const allText = JSON.stringify(result);
    expect(allText).not.toContain("super-secret-token-123");
  });

  it("fixture records use the match id as providerFixtureId", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch({ id: 999888 })]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const fixtures = provider.getFixtures();

    expect(fixtures.status).toBe("success");
    if (fixtures.status !== "success") return;
    expect(fixtures.records[0]?.providerFixtureId).toBe("999888");
  });

  // ---------------------------------------------------------------------------
  // Unresolved knockout fixture filtering
  // ---------------------------------------------------------------------------

  it("omits fixtures with null team names and keeps resolved fixtures", async () => {
    const resolvedMatch = buildMatch({
      id: 20001,
      status: "SCHEDULED",
      score: { fullTime: { home: null, away: null } },
      utcDate: "2026-07-14T20:00:00Z"
    });
    const unresolvedMatch = buildMatch({
      id: 20002,
      status: "SCHEDULED",
      score: { fullTime: { home: null, away: null } },
      homeTeam: { id: null, name: null, shortName: null },
      awayTeam: { id: null, name: null, shortName: null }
    });

    const mockFetch = createMockFetch(
      buildMatchesResponse([resolvedMatch, unresolvedMatch]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.providerFixtureId).toBe("20001");
  });

  it("provider remains active (localFallbackUsed=false) when resolved fixtures exist alongside unresolved ones", async () => {
    const resolvedMatch = buildMatch({
      id: 30001,
      status: "SCHEDULED",
      score: { fullTime: { home: null, away: null } }
    });
    const unresolvedMatch = buildMatch({
      id: 30002,
      homeTeam: { id: null, name: null, shortName: null },
      awayTeam: { id: null, name: null, shortName: null },
      score: { fullTime: { home: null, away: null } }
    });

    const mockFetch = createMockFetch(
      buildMatchesResponse([resolvedMatch, unresolvedMatch]),
      buildStandingsResponse([buildStandingGroup()])
    );

    // synchronizeWorldCup2026Results wires the foundation resolver
    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "test-token",
      fetch: mockFetch
    });

    expect(result.localFallbackUsed).toBe(false);
    expect(result.externalProviderEnabled).toBe(true);
    expect(result.fixtures).toHaveLength(1);
    expect(result.fixtures[0]?.providerFixtureId).toBe("30001");
  });

  it("preserves kickoffAt on resolved fixtures when unresolved ones are omitted", async () => {
    const resolvedMatch = buildMatch({
      id: 40001,
      status: "SCHEDULED",
      utcDate: "2026-07-15T18:00:00Z",
      score: { fullTime: { home: null, away: null } }
    });
    const unresolvedMatch = buildMatch({
      id: 40002,
      homeTeam: { id: null, name: null, shortName: null },
      awayTeam: { id: null, name: null, shortName: null },
      score: { fullTime: { home: null, away: null } }
    });

    const mockFetch = createMockFetch(
      buildMatchesResponse([resolvedMatch, unresolvedMatch]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.records[0]?.kickoffAt).toBe("2026-07-15T18:00:00Z");
  });

  it("includes a sanitized warning when unresolved fixtures are omitted", async () => {
    const resolvedMatch = buildMatch({
      id: 50001,
      status: "SCHEDULED",
      score: { fullTime: { home: null, away: null } }
    });
    const unresolvedMatch = buildMatch({
      id: 50002,
      homeTeam: { id: null, name: null, shortName: null },
      awayTeam: { id: null, name: null, shortName: null },
      score: { fullTime: { home: null, away: null } }
    });

    const mockFetch = createMockFetch(
      buildMatchesResponse([resolvedMatch, unresolvedMatch]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(
      defaultConfig({ token: "secret-api-token-xyz", fetch: mockFetch })
    );
    const result = provider.getFixtures();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("unresolved participants"))).toBe(true);
    // Warning must not expose any sensitive or raw data
    const warningText = result.warnings.join(" ");
    expect(warningText).not.toContain("secret-api-token-xyz");
    expect(warningText).not.toContain("null");
  });

  it("emits no warning and returns all fixtures when all team names are resolved", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ id: 60001, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } }),
        buildMatch({ id: 60002, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.records).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });

  it("omits fixtures with blank-whitespace-only team names", async () => {
    const resolvedMatch = buildMatch({ id: 70001, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } });
    const blankTeamMatch = buildMatch({
      id: 70002,
      homeTeam: { id: null, name: "   ", shortName: null },
      awayTeam: { id: null, name: "", shortName: null },
      score: { fullTime: { home: null, away: null } }
    });

    const mockFetch = createMockFetch(
      buildMatchesResponse([resolvedMatch, blankTeamMatch]),
      buildStandingsResponse([buildStandingGroup()])
    );
    const provider = await createFootballDataOrgResultsProvider(defaultConfig({ fetch: mockFetch }));
    const result = provider.getFixtures();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.providerFixtureId).toBe("70001");
  });
});

describe("synchronizeWorldCup2026Results", () => {
  it("defaults to local_static mode when providerMode is not set", async () => {
    const original = process.env["RESULTS_PROVIDER"];
    delete process.env["RESULTS_PROVIDER"];
    try {
      const result = await synchronizeWorldCup2026Results({});

      expect(result.providerMode).toBe("local_static");
      expect(result.activeProvider).toBe("local_static_results_provider");
      expect(result.localFallbackUsed).toBe(true);
      expect(result.externalProviderEnabled).toBe(false);
    } finally {
      if (original === undefined) {
        delete process.env["RESULTS_PROVIDER"];
      } else {
        process.env["RESULTS_PROVIDER"] = original;
      }
    }
  });

  it("returns local static data when providerMode is 'local'", async () => {
    const result = await synchronizeWorldCup2026Results({ providerMode: "local" });

    expect(result.status).toBe("success");
    expect(result.providerMode).toBe("local_static");
    expect(result.completedResults).toHaveLength(8);
    expect(result.fixtures).toHaveLength(72);
  });

  it("returns local data for any non-football_data_org provider mode", async () => {
    const result = await synchronizeWorldCup2026Results({ providerMode: "manual_override" });

    expect(result.providerMode).toBe("local_static");
    expect(result.status).toBe("success");
  });

  it("returns error result when token is missing in football_data_org mode", async () => {
    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: ""
    });

    expect(result.status).toBe("error");
    expect(result.providerMode).toBe("football_data_org");
    expect(result.externalProviderEnabled).toBe(true);
    expect(result.localFallbackUsed).toBe(true);
    expect(result.error?.code).toBe("provider_disabled");
    expect(result.completedResults).toHaveLength(8);
  });

  it("does not expose the token in warnings when token is missing", async () => {
    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: ""
    });

    const allText = JSON.stringify(result);
    expect(allText).not.toContain("super-secret");
  });

  it("returns football_data_org provider data on successful external fetch", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ id: 10001, status: "FINISHED" }),
        buildMatch({ id: 10002, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );

    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "test-token",
      fetch: mockFetch
    });

    expect(result.status).toBe("success");
    expect(result.providerMode).toBe("football_data_org");
    expect(result.localFallbackUsed).toBe(false);
    expect(result.fixtures).toHaveLength(2);
    expect(result.completedResults).toHaveLength(1);
  });

  it("never exposes the token in the sync result warnings", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch()]),
      buildStandingsResponse([buildStandingGroup()])
    );

    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "hidden-secret-token-abc123",
      fetch: mockFetch
    });

    const allText = JSON.stringify(result);
    expect(allText).not.toContain("hidden-secret-token-abc123");
  });

  it("falls back to local static data when external provider fails and cache is empty", async () => {
    const mockFetch = createMockFetch({}, {}, { matchesOk: false });

    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "test-token",
      fetch: mockFetch
    });

    expect(result.localFallbackUsed).toBe(true);
    expect(result.completedResults).toHaveLength(8);
    expect(result.fixtures).toHaveLength(72);
  });

  it("uses cached data after external provider failure when cache is warm", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([buildMatch({ id: 55555 })]),
      buildStandingsResponse([buildStandingGroup()])
    );

    const externalProvider = await createFootballDataOrgResultsProvider({
      token: "test-token",
      fetch: mockFetch
    });
    const cachedProvider = createCachedResultsProvider(externalProvider);

    // Warm up cache by resolving once
    const warmup = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "test-token",
      fetch: mockFetch,
      cachedProvider
    });
    expect(warmup.cacheUsed).toBe(false);

    // Now use a failing fetch but pre-warmed cache
    const failingFetch = createMockFetch({}, {}, { matchesOk: false });
    const failingExternal = await createFootballDataOrgResultsProvider({
      token: "test-token",
      fetch: failingFetch
    });

    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "test-token",
      fetch: failingFetch,
      cachedProvider: createCachedResultsProvider(failingExternal)
    });

    expect(result.localFallbackUsed).toBe(true);
    expect(result.completedResults).toHaveLength(8);
  });

  it("result always contains a syncedAt ISO timestamp", async () => {
    const result = await synchronizeWorldCup2026Results({ providerMode: "local" });

    expect(result.syncedAt).toBeDefined();
    expect(new Date(result.syncedAt).toISOString()).toBe(result.syncedAt);
  });

  it("calling sync twice with the same local mode returns consistent results", async () => {
    const result1 = await synchronizeWorldCup2026Results({ providerMode: "local" });
    const result2 = await synchronizeWorldCup2026Results({ providerMode: "local" });

    expect(result1.completedResults).toHaveLength(result2.completedResults.length);
    expect(result1.fixtures).toHaveLength(result2.fixtures.length);
    expect(result1.standings).toHaveLength(result2.standings.length);
  });

  it("local mode result has externalProviderEnabled false", async () => {
    const result = await synchronizeWorldCup2026Results({ providerMode: "local" });
    expect(result.externalProviderEnabled).toBe(false);
  });

  it("football_data_org mode result has externalProviderEnabled true even on fallback", async () => {
    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: ""
    });
    expect(result.externalProviderEnabled).toBe(true);
  });

  it("includes normalizationIssues field in the result", async () => {
    const result = await synchronizeWorldCup2026Results({ providerMode: "local" });
    expect(Array.isArray(result.normalizationIssues)).toBe(true);
  });

  it("includes warnings field in the result", async () => {
    const result = await synchronizeWorldCup2026Results({ providerMode: "local" });
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("football_data_org provider data passes through normalization before sync result", async () => {
    const mockFetch = createMockFetch(
      buildMatchesResponse([
        buildMatch({ homeTeam: { id: 1, name: "USA" }, awayTeam: { id: 2, name: "Türkiye" } })
      ]),
      buildStandingsResponse([buildStandingGroup()])
    );

    const result = await synchronizeWorldCup2026Results({
      providerMode: "football_data_org",
      token: "test-token",
      fetch: mockFetch
    });

    expect(result.status).toBe("success");
    const fixture = result.fixtures[0];
    expect(fixture?.homeTeam).toBe("United States");
    expect(fixture?.awayTeam).toBe("Turkey");
  });
});
