import { describe, expect, it } from "vitest";
import {
  buildWorldCup2026GroupStandings,
  createCachedResultsProvider,
  createExternalApiResultsProvider,
  createLocalStaticResultsProvider,
  normalizeExternalFixtureRecords,
  resolveWorldCup2026ResultsProviderFoundation,
  toFixtureResultsFromExternalRecords,
  type WorldCup2026FootballResultsProvider
} from "../src/index.js";
import type { WorldCup2026ExternalFixtureRecord, WorldCup2026ExternalMatchStatus } from "../src/index.js";

function createSuccessProvider(
  id: string,
  fixtureOverrides: Partial<ReturnType<typeof createFixtureRecord>> = {}
): WorldCup2026FootballResultsProvider {
  const fixture = createFixtureRecord(fixtureOverrides);
  const standings = [
    {
      group: "A",
      team: fixture.homeTeam,
      position: 1,
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 3,
      updatedAt: "2026-06-15"
    }
  ] as const;

  const success = <T>(records: readonly T[]) => ({
    status: "success" as const,
    providerId: id,
    records,
    servedFromCache: false,
    syncedAt: "2026-06-15",
    warnings: [] as const
  });

  return {
    id,
    getFixtures: () => success([fixture]),
    getLiveMatches: () => success([]),
    getCompletedResults: () => success([fixture]),
    getStandings: () => success(standings)
  };
}

function createFailingProvider(id: string): WorldCup2026FootballResultsProvider {
  const failure = (operation: "fixtures" | "live_matches" | "completed_results" | "standings") => ({
    status: "error" as const,
    providerId: id,
    servedFromCache: false as const,
    warnings: [`${id} failed during ${operation}.`] as const,
    error: {
      code: "provider_unavailable" as const,
      providerId: id,
      operation,
      message: `${id} is unavailable.`
    }
  });

  return {
    id,
    getFixtures: () => failure("fixtures"),
    getLiveMatches: () => failure("live_matches"),
    getCompletedResults: () => failure("completed_results"),
    getStandings: () => failure("standings")
  };
}

function createFlippableProvider(id: string): { provider: WorldCup2026FootballResultsProvider; setFailing: (value: boolean) => void } {
  let failing = false;
  const successProvider = createSuccessProvider(id);
  const failingProvider = createFailingProvider(id);

  return {
    provider: {
      id,
      getFixtures: () => (failing ? failingProvider.getFixtures() : successProvider.getFixtures()),
      getLiveMatches: () => (failing ? failingProvider.getLiveMatches() : successProvider.getLiveMatches()),
      getCompletedResults: () => (failing ? failingProvider.getCompletedResults() : successProvider.getCompletedResults()),
      getStandings: () => (failing ? failingProvider.getStandings() : successProvider.getStandings())
    },
    setFailing(value: boolean) {
      failing = value;
    }
  };
}

function createFixtureRecord(
  overrides: Partial<Omit<WorldCup2026ExternalFixtureRecord, "status">> & {
    status?: string;
    homeScore?: number | undefined;
    awayScore?: number | undefined;
  } = {}
): WorldCup2026ExternalFixtureRecord {
  const { status, homeScore, awayScore, ...rest } = overrides;

  return {
    providerFixtureId: "provider-fixture-1",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "Group Stage",
    group: "D",
    matchday: 1,
    homeTeam: "USA",
    awayTeam: "Türkiye",
    status: (status ?? "finished") as WorldCup2026ExternalMatchStatus,
    ...(homeScore === undefined ? { homeScore: 2 } : { homeScore }),
    ...(awayScore === undefined ? { awayScore: 1 } : { awayScore }),
    updatedAt: "2026-06-15",
    ...rest
  };
}

describe("results provider foundation", () => {
  it("local static provider returns current fixture, result, and standings data", () => {
    const provider = createLocalStaticResultsProvider();
    const fixtures = provider.getFixtures();
    const completedResults = provider.getCompletedResults();
    const standings = provider.getStandings();

    expect(fixtures.status).toBe("success");
    expect(completedResults.status).toBe("success");
    expect(standings.status).toBe("success");

    if (fixtures.status !== "success" || completedResults.status !== "success" || standings.status !== "success") return;

    expect(fixtures.records).toHaveLength(72);
    expect(completedResults.records).toHaveLength(8);
    expect(completedResults.records).toContainEqual(
      expect.objectContaining({
        providerFixtureId: "wc2026-group-c-md1-02-haiti-vs-scotland",
        status: "finished",
        homeTeam: "Haiti",
        awayTeam: "Scotland",
        homeScore: 0,
        awayScore: 1
      })
    );
    expect(standings.records.some((entry) => entry.team === "Mexico" && entry.points === 3)).toBe(true);
  });

  it("external API provider reports disabled without making a network request", () => {
    const provider = createExternalApiResultsProvider();
    const result = provider.getFixtures();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;

    expect(result.error.code).toBe("provider_disabled");
    expect(result.error.providerId).toBe("external_api_results_provider");
    expect(result.warnings[0]).toContain("No network request is performed");
  });

  it("prefers external success over cache and local fallback", () => {
    const externalProvider = createSuccessProvider("external-success");
    const cachedProvider = createCachedResultsProvider(externalProvider);
    const localProvider = createLocalStaticResultsProvider();
    const result = resolveWorldCup2026ResultsProviderFoundation({
      externalProvider,
      cachedProvider,
      localProvider
    });

    expect(result.provider.activeProvider).toBe("external-success");
    expect(result.provider.cacheUsed).toBe(false);
    expect(result.provider.localFallbackUsed).toBe(false);
    expect(result.completedResults).toEqual([
      expect.objectContaining({
        providerFixtureId: "provider-fixture-1",
        homeTeam: "United States",
        awayTeam: "Turkey",
        status: "finished"
      })
    ]);
  });

  it("uses cached data after external failure", () => {
    const flippable = createFlippableProvider("cache-warm");
    const cachedProvider = createCachedResultsProvider(flippable.provider);
    const warmup = resolveWorldCup2026ResultsProviderFoundation({
      externalProvider: flippable.provider,
      cachedProvider,
      localProvider: createLocalStaticResultsProvider()
    });

    expect(warmup.provider.cacheUsed).toBe(false);

    flippable.setFailing(true);
    const result = resolveWorldCup2026ResultsProviderFoundation({
      externalProvider: flippable.provider,
      cachedProvider,
      localProvider: createLocalStaticResultsProvider()
    });

    expect(result.provider.activeProvider).toBe("cached_external_results_provider");
    expect(result.provider.cacheUsed).toBe(true);
    expect(result.provider.localFallbackUsed).toBe(false);
    expect(result.provider.error?.code).toBe("provider_unavailable");
    expect(result.completedResults[0]?.providerFixtureId).toBe("provider-fixture-1");
  });

  it("uses local static fallback when external and cache both fail", () => {
    const result = resolveWorldCup2026ResultsProviderFoundation({
      externalProvider: createFailingProvider("external-fail"),
      cachedProvider: createCachedResultsProvider(createFailingProvider("external-fail")),
      localProvider: createLocalStaticResultsProvider()
    });

    expect(result.provider.activeProvider).toBe("local_static_results_provider");
    expect(result.provider.cacheUsed).toBe(false);
    expect(result.provider.localFallbackUsed).toBe(true);
    expect(result.provider.error?.code).toBe("stale_cache_unavailable");
    expect(result.completedResults).toHaveLength(8);
  });

  it("rejects duplicate provider fixture IDs", () => {
    const normalized = normalizeExternalFixtureRecords("dup-provider", [
      createFixtureRecord({ providerFixtureId: "dup-1" }),
      createFixtureRecord({ providerFixtureId: "dup-1", homeTeam: "England", awayTeam: "Croatia" })
    ]);

    expect(normalized.status).toBe("error");
    if (normalized.status !== "error") return;
    expect(normalized.error.code).toBe("duplicate_fixture_id");
  });

  it("normalizes aliases to canonical team names", () => {
    const normalized = normalizeExternalFixtureRecords("alias-provider", [
      createFixtureRecord({ homeTeam: "USA", awayTeam: "Türkiye" })
    ]);

    expect(normalized.status).toBe("success");
    if (normalized.status !== "success") return;

    expect(normalized.records[0]).toMatchObject({
      homeTeam: "United States",
      awayTeam: "Turkey"
    });
  });

  it("requires finished matches to include scores", () => {
    const fixture = createFixtureRecord();
    delete fixture.homeScore;
    delete fixture.awayScore;
    const normalized = normalizeExternalFixtureRecords("invalid-finished", [
      fixture
    ]);

    expect(normalized.status).toBe("error");
    if (normalized.status !== "error") return;
    expect(normalized.error.code).toBe("invalid_provider_response");
  });

  it("allows scheduled matches to omit scores", () => {
    const fixture = createFixtureRecord({ status: "scheduled" });
    delete fixture.homeScore;
    delete fixture.awayScore;
    const normalized = normalizeExternalFixtureRecords("scheduled-provider", [
      fixture
    ]);

    expect(normalized.status).toBe("success");
    if (normalized.status !== "success") return;
    expect(normalized.records[0]?.status).toBe("scheduled");
    expect("homeScore" in (normalized.records[0] ?? {})).toBe(false);
    expect("awayScore" in (normalized.records[0] ?? {})).toBe(false);
  });

  it("normalizes unsupported statuses safely to unknown", () => {
    const normalized = normalizeExternalFixtureRecords("status-provider", [
      createFixtureRecord({ status: "rain_delay" })
    ]);

    expect(normalized.status).toBe("success");
    if (normalized.status !== "success") return;
    expect(normalized.records[0]?.status).toBe("unknown");
    expect(normalized.issues[0]?.code).toBe("unsupported_match_status");
  });

  it("converts normalized completed results back into existing standings input without changing standings math", () => {
    const provider = createLocalStaticResultsProvider();
    const completedResults = provider.getCompletedResults();
    expect(completedResults.status).toBe("success");
    if (completedResults.status !== "success") return;

    const standingsFromProvider = buildWorldCup2026GroupStandings({
      results: toFixtureResultsFromExternalRecords(completedResults.records)
    });
    const productionStandings = buildWorldCup2026GroupStandings();

    expect(standingsFromProvider).toEqual(productionStandings);
  });
});
