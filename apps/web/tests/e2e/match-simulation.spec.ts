import { expect, test, type Page } from "@playwright/test";

async function selectTeamOption(page: Page, label: string, searchText: string, optionLabel: string): Promise<void> {
  const input = page.getByRole("combobox", { name: label });

  await input.click();
  await input.fill(searchText);
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
}

function buildDailyMatchesSuccessResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "success",
    requestedDate: "2026-06-20",
    timezone: "UTC",
    generatedAt: "2026-06-19T12:00:00Z",
    matches: [],
    unscheduledMatches: [],
    counts: {
      total: 0,
      upcoming: 0,
      live: 0,
      halftime: 0,
      final: 0,
      postponed: 0,
      cancelled: 0,
      unknown: 0,
      unavailableKickoff: 0
    },
    providerMetadata: {
      configuredProvider: "football-data",
      activeProvider: "football-data.org",
      externalRequestAttempted: true,
      cacheUsed: false,
      localFallbackUsed: false,
      lastSuccessfulSync: "2026-06-20T15:45:00Z",
      stale: false
    },
    issues: [],
    warnings: [],
    metadata: {
      apiVersion: "1.0.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: []
    },
    ...overrides
  };
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

test("loads dashboard home with main heading", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "World Cup prediction signals with model limits in view"
    })
  ).toBeVisible();
});

test("main dashboard sections are visible on load", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "Interactive match simulation" })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 2, name: "Current model and API evidence" })
  ).toBeVisible();
});

test("dashboard renders Today's World Cup Matches with timezone, fallback source, and unscheduled warning", async ({ page }) => {
  await page.goto("/");

  const section = page.getByRole("region", { name: "Today's World Cup Matches" });
  await expect(section).toBeVisible();
  await expect(section.getByText("Selected date")).toBeVisible();
  await expect(section.getByText("Timezone")).toBeVisible();
  await expect(section.getByText("UTC", { exact: true })).toBeVisible();
  await expect(section.getByText("Source: Local static fallback", { exact: true })).toBeVisible();
  await expect(section.getByText("No scheduled matches are available for this date.")).toBeVisible();
  await expect(section.getByText(/fixtures are available but do not yet have kickoff metadata/i)).toBeVisible();
});

test("daily match center navigation loads mocked live and final cards with snapshot metadata", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/world-cup-2026/daily-matches**", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildDailyMatchesSuccessResponse({
            requestedDate: "2026-06-20",
            matches: [
              {
                fixtureId: "wc2026-group-a-md1-mex-rsa",
                providerFixtureId: "provider-fixture-1",
                group: "Group A",
                matchday: 1,
                kickoffAt: "2026-06-20T16:00:00Z",
                localizedKickoff: "2026-06-20 16:00 UTC",
                homeTeam: "Mexico",
                awayTeam: "South Africa",
                normalizedStatus: "final",
                state: "final",
                homeScore: 2,
                awayScore: 0,
                predictionSnapshot: {
                  available: true,
                  snapshotId: "snap-final-1",
                  capturedAt: "2026-06-20T14:00:00Z",
                  modelVersion: "model-v1"
                },
                predictionHistory: {
                  snapshot: {
                    available: true,
                    status: "pre_match_locked",
                    snapshotId: "snap-final-1",
                    capturedAt: "2026-06-20T14:00:00Z",
                    modelVersion: "model-v1",
                    prediction: {
                      homeExpectedGoals: 1.42,
                      awayExpectedGoals: 0.88,
                      homeWinProbability: 0.56,
                      drawProbability: 0.26,
                      awayWinProbability: 0.18,
                      projectedScoreline: {
                        homeGoals: 1,
                        awayGoals: 0
                      },
                      confidenceLevel: "medium",
                      coverageType: "partial"
                    }
                  },
                  evaluation: {
                    available: true,
                    evaluationId: "eval-final-1",
                    evaluatedAt: "2026-06-20T18:15:00Z",
                    metrics: {
                      outcomeCorrect: true,
                      exactScoreCorrect: false,
                      brierScore: 0.342,
                      logLoss: 0.578,
                      totalGoalAbsoluteError: 1
                    }
                  },
                  warnings: []
                }
              },
              {
                fixtureId: "wc2026-group-c-md1-bra-mar",
                providerFixtureId: "provider-fixture-2",
                group: "Group C",
                matchday: 1,
                kickoffAt: "2026-06-20T19:00:00Z",
                localizedKickoff: "2026-06-20 19:00 UTC",
                homeTeam: "Brazil",
                awayTeam: "Morocco",
                normalizedStatus: "live",
                state: "live",
                homeScore: 1,
                awayScore: 1,
                predictionSnapshot: {
                  available: false
                },
                predictionHistory: {
                  snapshot: {
                    available: false
                  },
                  evaluation: {
                    available: false
                  },
                  warnings: []
                }
              }
            ],
            counts: {
              total: 2,
              upcoming: 0,
              live: 1,
              halftime: 0,
              final: 1,
              postponed: 0,
              cancelled: 0,
              unknown: 0,
              unavailableKickoff: 0
            }
          })
        )
      });
      return;
    }

    if (requestCount === 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildDailyMatchesSuccessResponse({
            requestedDate: "2026-06-19",
            matches: [],
            providerMetadata: {
              configuredProvider: "local",
              activeProvider: "local_static_provider",
              externalRequestAttempted: false,
              cacheUsed: false,
              localFallbackUsed: true,
              stale: false
            }
          })
        )
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildDailyMatchesSuccessResponse({
          requestedDate: "2026-06-18",
          matches: [
            {
              fixtureId: "wc2026-group-d-md1-usa-par",
              providerFixtureId: "provider-fixture-3",
              group: "Group D",
              matchday: 1,
              kickoffAt: "2026-06-18T18:00:00Z",
              localizedKickoff: "2026-06-18 18:00 UTC",
              homeTeam: "United States",
              awayTeam: "Paraguay",
              normalizedStatus: "halftime",
              state: "halftime",
              homeScore: 2,
              awayScore: 1,
              predictionSnapshot: {
                available: false
              },
              predictionHistory: {
                snapshot: {
                  available: false
                },
                evaluation: {
                  available: false
                },
                warnings: []
              }
            }
          ],
          counts: {
            total: 1,
            upcoming: 0,
            live: 0,
            halftime: 1,
            final: 0,
            postponed: 0,
            cancelled: 0,
            unknown: 0,
            unavailableKickoff: 0
          }
        })
      )
    });
  });

  await page.goto("/");

  const section = page.getByRole("region", { name: "Today's World Cup Matches" });
  await section.getByRole("button", { name: "Next day" }).click();
  await expect(section.getByText("2026-06-20", { exact: true })).toBeVisible();
  await expect(section.getByText("Source: football-data.org")).toBeVisible();
  await expect(section.getByText("Final", { exact: true })).toBeVisible();
  await expect(section.getByText("Live", { exact: true })).toBeVisible();
  await expect(section.getByText("2 - 0", { exact: true })).toBeVisible();
  await expect(section.getByText("1 - 1", { exact: true })).toBeVisible();
  await expect(section.getByText("Pre-match prediction", { exact: true })).toBeVisible();
  await expect(section.getByText("Projected score: 1 - 0")).toBeVisible();
  await expect(section.getByText("Outcome prediction: Correct")).toBeVisible();
  await expect(section.getByText("No pre-match prediction saved").nth(1)).toBeVisible();
  await expect(section.getByText("Model: model-v1")).toBeVisible();

  await section.getByRole("button", { name: "Today" }).click();
  await expect(section.getByText("2026-06-19", { exact: true })).toBeVisible();

  await section.getByRole("button", { name: "Previous day" }).click();
  await expect(section.getByText("2026-06-18", { exact: true })).toBeVisible();
  await expect(section.getByText("Halftime", { exact: true })).toBeVisible();
});

test("daily match center shows evaluation pending for final fixtures without stored evaluation", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/world-cup-2026/daily-matches**", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildDailyMatchesSuccessResponse({
            requestedDate: "2026-06-20",
            matches: [
              {
                fixtureId: "wc2026-group-h-md1-esp-cpv",
                providerFixtureId: "provider-fixture-5",
                group: "Group H",
                matchday: 1,
                kickoffAt: "2026-06-20T12:00:00Z",
                localizedKickoff: "2026-06-20 12:00 UTC",
                homeTeam: "Spain",
                awayTeam: "Cape Verde",
                normalizedStatus: "final",
                state: "final",
                homeScore: 1,
                awayScore: 0,
                predictionSnapshot: {
                  available: true,
                  status: "pre_match_locked",
                  snapshotId: "snap-pending-1",
                  capturedAt: "2026-06-20T09:00:00Z",
                  modelVersion: "wc2026-model-v1"
                },
                predictionHistory: {
                  snapshot: {
                    available: true,
                    status: "pre_match_locked",
                    snapshotId: "snap-pending-1",
                    capturedAt: "2026-06-20T09:00:00Z",
                    modelVersion: "wc2026-model-v1",
                    prediction: {
                      homeExpectedGoals: 1.55,
                      awayExpectedGoals: 0.72,
                      homeWinProbability: 0.62,
                      drawProbability: 0.23,
                      awayWinProbability: 0.15,
                      projectedScoreline: { homeGoals: 2, awayGoals: 0 },
                      confidenceLevel: "medium",
                      coverageType: "partial"
                    }
                  },
                  evaluation: {
                    available: false
                  },
                  warnings: []
                }
              }
            ],
            counts: {
              total: 1,
              upcoming: 0,
              live: 0,
              halftime: 0,
              final: 1,
              postponed: 0,
              cancelled: 0,
              unknown: 0,
              unavailableKickoff: 0
            }
          })
        )
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildDailyMatchesSuccessResponse())
    });
  });

  await page.goto("/");

  const section = page.getByRole("region", { name: "Today's World Cup Matches" });
  await section.getByRole("button", { name: "Next day" }).click();
  await expect(section.getByText("Evaluation pending")).toBeVisible();
  await expect(section.getByText("Prediction saved").nth(1)).toBeVisible();
  await expect(section.getByText("Final result")).toBeVisible();
  await expect(section.getByText("1 - 0", { exact: true })).toBeVisible();
});

test("daily match center clears previous cards when a date change returns an API error", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/world-cup-2026/daily-matches**", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildDailyMatchesSuccessResponse({
            requestedDate: "2026-06-20",
            matches: [
              {
                fixtureId: "wc2026-group-f-md1-ned-jpn",
                providerFixtureId: "provider-fixture-4",
                group: "Group F",
                matchday: 1,
                kickoffAt: "2026-06-20T14:00:00Z",
                localizedKickoff: "2026-06-20 14:00 UTC",
                homeTeam: "Netherlands",
                awayTeam: "Japan",
                normalizedStatus: "final",
                state: "final",
                homeScore: 1,
                awayScore: 0,
                predictionSnapshot: {
                  available: false
                },
                predictionHistory: {
                  snapshot: {
                    available: false
                  },
                  evaluation: {
                    available: false
                  },
                  warnings: []
                }
              }
            ],
            counts: {
              total: 1,
              upcoming: 0,
              live: 0,
              halftime: 0,
              final: 1,
              postponed: 0,
              cancelled: 0,
              unknown: 0,
              unavailableKickoff: 0
            }
          })
        )
      });
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        status: "validation_error",
        issues: [{ field: "date", message: "Date is unavailable for the selected range." }],
        metadata: {
          apiVersion: "1.0.0",
          mode: "pure_handlers",
          serverEnabled: false,
          databaseEnabled: false,
          externalServicesEnabled: false,
          notes: []
        }
      })
    });
  });

  await page.goto("/");

  const section = page.getByRole("region", { name: "Today's World Cup Matches" });
  await section.getByRole("button", { name: "Next day" }).click();
  await expect(section.getByText("Netherlands")).toBeVisible();
  await expect(section.getByText("1 - 0")).toBeVisible();

  await section.getByRole("button", { name: "Next day" }).click();
  await expect(section.getByRole("alert")).toContainText("Date is unavailable for the selected range.");
  await expect(section.getByText("Netherlands")).toHaveCount(0);
});

test("daily match center remains usable on mobile layouts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const section = page.getByRole("region", { name: "Today's World Cup Matches" });
  await expect(section).toBeVisible();
  await expect(section.getByRole("button", { name: "Previous day" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Today" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Next day" })).toBeVisible();
  await expect(section.getByText("Source: Local static fallback", { exact: true })).toBeVisible();
});

test("dashboard renders World Cup 2026 groups and Group C fixtures", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "World Cup 2026 Groups & Fixtures" })
  ).toBeVisible();
  const groupsSection = page.getByRole("region", { name: "World Cup 2026 Groups & Fixtures" });
  await expect(groupsSection.getByText("Foundation tournament structure")).toBeVisible();
  await expect(groupsSection.getByText("72 group fixtures")).toBeVisible();
  await expect(groupsSection.getByText("12 groups")).toBeVisible();

  const groupC = groupsSection.getByRole("article", { name: "Group C" });
  await expect(groupC).toBeVisible();
  await expect(groupC.getByText("Brazil", { exact: true })).toBeVisible();
  await expect(groupC.getByText("Morocco", { exact: true })).toBeVisible();
  await expect(groupC.getByText("Haiti", { exact: true })).toBeVisible();
  await expect(groupC.getByText("Scotland", { exact: true })).toBeVisible();
});

test("dashboard renders World Cup 2026 group standings tables", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "World Cup 2026 Group Standings" })
  ).toBeVisible();
  await expect(page.getByText("Live group standings")).toBeVisible();
  await expect(page.getByText("Results source: local static provider")).toBeVisible();
  await expect(page.getByText("External provider: disabled")).toBeVisible();
  await expect(page.getByText("Standings are calculated from completed matches only. Scheduled fixtures are excluded.")).toBeVisible();

  const groupA = page.getByRole("article", { name: "Group A standings" });
  const groupC = page.getByRole("article", { name: "Group C standings" });

  await expect(groupA).toBeVisible();
  await expect(groupA.getByRole("row", { name: /Mexico/ })).toContainText("3");
  await expect(groupC).toBeVisible();
  await expect(groupC.getByRole("row", { name: /Scotland/ })).toContainText("3");
});

test("standings section shows Official tab selected by default", async ({ page }) => {
  await page.goto("/");

  const tablist = page.getByRole("tablist", { name: "Standings mode" });
  await expect(tablist).toBeVisible();

  const officialTab = tablist.getByRole("tab", { name: /Official/ });
  await expect(officialTab).toBeVisible();
  await expect(officialTab).toHaveAttribute("aria-selected", "true");
});

test("standings section shows live provisional tab in disabled state when no live matches", async ({ page }) => {
  await page.goto("/");

  const tablist = page.getByRole("tablist", { name: "Standings mode" });
  const provisionalTab = tablist.getByRole("tab", { name: /Live provisional/ });
  await expect(provisionalTab).toBeVisible();
  await expect(provisionalTab).toBeDisabled();
  await expect(provisionalTab).toHaveAttribute("aria-disabled", "true");
});

test("standings section shows projected tab in disabled state", async ({ page }) => {
  await page.goto("/");

  const tablist = page.getByRole("tablist", { name: "Standings mode" });
  const projectedTab = tablist.getByRole("tab", { name: /Projected/ });
  await expect(projectedTab).toBeVisible();
  await expect(projectedTab).toBeDisabled();
  await expect(projectedTab).toHaveAttribute("aria-disabled", "true");
});

test("standings section group tables remain accessible via Official tab", async ({ page }) => {
  await page.goto("/");

  const groupsSection = page.getByRole("region", { name: "World Cup 2026 Group Standings" });
  const groupA = groupsSection.getByRole("article", { name: "Group A standings" });
  const groupL = groupsSection.getByRole("article", { name: "Group L standings" });
  await expect(groupA).toBeVisible();
  await expect(groupL).toBeVisible();
});

test("dashboard renders projected World Cup 2026 Round of 32 foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Round of 32" })).toBeVisible();
  const roundOf32Section = page.getByRole("region", { name: "Projected Round of 32" });
  await expect(roundOf32Section.getByText("Round of 32 foundation", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("Qualified teams")).toBeVisible();
  await expect(roundOf32Section.getByText("32", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("Fixtures", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("16", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByRole("article", { name: "Round of 32 fixture 1", exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("Projected Round of 32 foundation based on current local standings.")).toBeVisible();
});

test("dashboard renders Round of 32 knockout match simulations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Round of 32 match simulations" })).toBeVisible();
  const simSection = page.getByRole("region", { name: "Round of 32 match simulations" });
  await expect(simSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(page.getByText("Slot 1").first()).toBeVisible();
  await expect(page.getByText(/Draw: \d+\.\d+%/).first()).toBeVisible();
});

test("dashboard renders projected Round of 16 with advancement reasons", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Round of 16" })).toBeVisible();
  const r16Section = page.getByRole("region", { name: "Projected Round of 16" });
  await expect(r16Section.getByText("Projected from pre-match probabilities", { exact: true })).toBeVisible();
  await expect(r16Section.getByText("R16 Slot 1").first()).toBeVisible();
  await expect(r16Section.getByText("advanced via highest pre-match win probability").first()).toBeVisible();
});

test("dashboard renders Round of 16 match simulations with win and draw probabilities", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Round of 16 match simulations" })).toBeVisible();
  const r16SimSection = page.getByRole("region", { name: "Round of 16 match simulations" });
  await expect(r16SimSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(r16SimSection.getByText("R16 Sim Slot 1").first()).toBeVisible();
  await expect(r16SimSection.getByText(/Draw: \d+\.\d+%/).first()).toBeVisible();
});

test("dashboard renders projected Quarterfinals with advancement reasons", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Quarterfinals" })).toBeVisible();
  const qfSection = page.getByRole("region", { name: "Projected Quarterfinals" });
  await expect(qfSection.getByText("Projected from pre-match probabilities", { exact: true })).toBeVisible();
  await expect(qfSection.getByText("QF Slot 1").first()).toBeVisible();
  await expect(qfSection.getByText("advanced via highest pre-match win probability").first()).toBeVisible();
});

test("dashboard renders Quarterfinal match simulations with win and draw probabilities", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Quarterfinal match simulations" })).toBeVisible();
  const qfSimSection = page.getByRole("region", { name: "Quarterfinal match simulations" });
  await expect(qfSimSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(qfSimSection.getByText("QF Sim Slot 1").first()).toBeVisible();
  await expect(qfSimSection.getByText(/Draw: \d+\.\d+%/).first()).toBeVisible();
});

test("dashboard renders projected Semifinals with advancement reasons", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Semifinals" })).toBeVisible();
  const sfSection = page.getByRole("region", { name: "Projected Semifinals" });
  await expect(sfSection.getByText("Projected from quarterfinal pre-match probabilities", { exact: true })).toBeVisible();
  await expect(sfSection.getByText("SF Slot 1").first()).toBeVisible();
  await expect(sfSection.getByText("advanced via highest pre-match win probability").first()).toBeVisible();
});

test("dashboard renders Semifinal match simulations with win and draw probabilities", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Semifinal match simulations" })).toBeVisible();
  const sfSimSection = page.getByRole("region", { name: "Semifinal match simulations" });
  await expect(sfSimSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(sfSimSection.getByText("SF Sim Slot 1").first()).toBeVisible();
  await expect(sfSimSection.getByText(/Draw: \d+\.\d+%/).first()).toBeVisible();
});

test("dashboard renders projected Final with advancement reasons", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Final" })).toBeVisible();
  const finalSection = page.getByRole("region", { name: "Projected Final" });
  await expect(finalSection.getByText("Final participants only", { exact: true })).toBeVisible();
  await expect(finalSection.getByText("Final Slot 1").first()).toBeVisible();
  await expect(finalSection.getByText("advanced via highest pre-match win probability").first()).toBeVisible();
});

test("dashboard renders Final match simulation with win and draw probabilities", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Final match simulation", exact: true })).toBeVisible();
  const finalSimSection = page.getByRole("region", { name: "Final match simulation", exact: true });
  await expect(finalSimSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(finalSimSection.getByText("Final Sim Slot 1").first()).toBeVisible();
  await expect(finalSimSection.getByText(/Draw/).first()).toBeVisible();
});

test("dashboard renders tournament projection overview with champion, runner-up, third place, and phase nav", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Tournament Projection Overview" })).toBeVisible();
  const overviewSection = page.getByRole("region", { name: "Tournament Projection Overview" });
  await expect(overviewSection.getByText("Full tournament projection complete", { exact: true })).toBeVisible();
  await expect(overviewSection.getByText("Projected Champion", { exact: true })).toBeVisible();
  await expect(overviewSection.getByText("Projected Runner-Up", { exact: true })).toBeVisible();
  await expect(overviewSection.getByText("Third Place Match", { exact: true })).toBeVisible();
  await expect(overviewSection.getByText("Jump to round", { exact: true })).toBeVisible();
  await expect(overviewSection.getByRole("link", { name: "Champion" })).toBeVisible();
});

test("dashboard renders champion projection summary with champion, runner-up, path, and warning", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Champion Projection Summary" })).toBeVisible();
  const summarySection = page.getByRole("region", { name: "Champion Projection Summary" });
  await expect(summarySection.getByText("Deterministic projection only", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("Projected Champion", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("Projected Runner-Up", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("Champion path", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("Round of 32").first()).toBeVisible();
  await expect(summarySection.getByText("Final").first()).toBeVisible();
});

test("dashboard renders projected tournament winner with champion and runner-up", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Tournament Winner" })).toBeVisible();
  const resolutionSection = page.getByRole("region", { name: "Projected Tournament Winner" });
  await expect(resolutionSection.getByText("Deterministic projection only", { exact: true })).toBeVisible();
  await expect(resolutionSection.getByText("Projected Champion", { exact: true })).toBeVisible();
  await expect(resolutionSection.getByText("Projected Runner-Up", { exact: true })).toBeVisible();
  await expect(resolutionSection.getByText("advanced via highest pre-match win probability").first()).toBeVisible();
});

test("dashboard renders projected third place match with two participants", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Third Place Match" })).toBeVisible();
  const thirdPlaceSection = page.getByRole("region", { name: "Projected Third Place Match" });
  await expect(thirdPlaceSection.getByText("Fixture foundation only", { exact: true })).toBeVisible();
  await expect(thirdPlaceSection.getByText("Home Team", { exact: true })).toBeVisible();
  await expect(thirdPlaceSection.getByText("Away Team", { exact: true })).toBeVisible();
  await expect(thirdPlaceSection.getByText(/wc2026-3rd-place-01/).first()).toBeVisible();
});

test("dashboard renders third place match simulation section with probabilities and scorelines", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Third Place Match simulation" })).toBeVisible();
  const simSection = page.getByRole("region", { name: "Third Place Match simulation" });
  await expect(simSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(simSection.getByText("Draw", { exact: true })).toBeVisible();
  await expect(simSection.getByText("Top scorelines", { exact: true })).toBeVisible();
  await expect(simSection.getByText("Expected goals", { exact: true })).toBeVisible();
});

test("dashboard renders projected knockout bracket with all rounds", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected knockout bracket" })).toBeVisible();
  const bracketSection = page.getByRole("region", { name: "Projected knockout bracket" });
  await expect(bracketSection.getByText("Projected bracket only")).toBeVisible();
  await expect(bracketSection.getByText("Round of 32", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Round of 16", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Quarterfinals", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Semifinals", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Third Place", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Final", { exact: true })).toBeVisible();
  await expect(page.getByText("Winner R32-01").first()).toBeVisible();
});

test("AppHeader anchor links have matching section targets in the page", async ({ page }) => {
  await page.goto("/");

  // Verify the three anchors that were previously broken now have matching ids
  await expect(page.locator("#match-preview")).toBeAttached();
  await expect(page.locator("#replay-audit")).toBeAttached();
  await expect(page.locator("#historical")).toBeAttached();

  // Verify the existing tournament-section anchors also resolve
  await expect(page.locator("#overview")).toBeAttached();
  await expect(page.locator("#world-cup-tournament-overview")).toBeAttached();
  await expect(page.locator("#world-cup-champion-projection-summary")).toBeAttached();
  await expect(page.locator("#world-cup-final-match-simulation")).toBeAttached();
  await expect(page.locator("#world-cup-semifinal-match-simulation")).toBeAttached();
  await expect(page.locator("#world-cup-quarterfinal-match-simulation")).toBeAttached();
  await expect(page.locator("#world-cup-round-of-16-match-simulation")).toBeAttached();
  await expect(page.locator("#world-cup-knockout-simulation")).toBeAttached();
  await expect(page.locator("#world-cup-third-place-match-simulation")).toBeAttached();
});

test("clicking Match Preview AppHeader link navigates to the match simulation section", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("navigation", { name: "Dashboard navigation" }).getByRole("link", { name: "Match Preview" }).click();

  await expect(page).toHaveURL(/#match-preview$/);
  await expect(page.locator("#match-preview")).toBeAttached();
});

test("dashboard sections appear in correct top-to-bottom order for portfolio flow", async ({ page }) => {
  await page.goto("/");

  const overviewSection = page.getByRole("region", { name: "Tournament Projection Overview", exact: true });
  const championSection = page.getByRole("region", { name: "Champion Projection Summary", exact: true });
  const finalSimSection = page.getByRole("region", { name: "Final match simulation", exact: true });
  const semifinalSimSection = page.getByRole("region", { name: "Semifinal match simulations", exact: true });
  const thirdPlaceSection = page.getByRole("region", { name: "Projected Third Place Match", exact: true });
  const winnerResolutionSection = page.getByRole("region", { name: "Projected Tournament Winner", exact: true });

  await expect(overviewSection).toBeVisible();
  await expect(championSection).toBeVisible();
  await expect(finalSimSection).toBeVisible();
  await expect(semifinalSimSection).toBeVisible();
  await expect(thirdPlaceSection).toBeVisible();
  await expect(winnerResolutionSection).toBeVisible();

  const overviewBox = await overviewSection.boundingBox();
  const championBox = await championSection.boundingBox();
  const finalSimBox = await finalSimSection.boundingBox();
  const semifinalSimBox = await semifinalSimSection.boundingBox();
  const thirdPlaceBox = await thirdPlaceSection.boundingBox();
  const winnerResolutionBox = await winnerResolutionSection.boundingBox();

  expect(overviewBox!.y).toBeLessThan(championBox!.y);
  expect(championBox!.y).toBeLessThan(finalSimBox!.y);
  expect(finalSimBox!.y).toBeLessThan(semifinalSimBox!.y);
  expect(semifinalSimBox!.y).toBeLessThan(thirdPlaceBox!.y);
  expect(thirdPlaceBox!.y).toBeLessThan(winnerResolutionBox!.y);
});

// ── Match simulation form ─────────────────────────────────────────────────────

test("match simulation form renders with required inputs and submit button", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Scheduled World Cup match" })).toBeVisible();
  await expect(page.getByLabel("World Cup group")).toBeVisible();
  await expect(page.getByLabel("Official fixture")).toBeVisible();
  await expect(page.getByLabel("Expected home goals")).toBeVisible();
  await expect(page.getByLabel("Expected away goals")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeVisible();
});

test("scheduled World Cup match mode is the default selection path", async ({ page }) => {
  await page.goto("/");

  const fixtureMetadata = page.getByText("Selected fixture metadata").locator("..");

  await expect(page.getByRole("button", { name: "Scheduled World Cup match" })).toHaveClass(/bg-teal-50/);
  await expect(page.getByLabel("World Cup group")).toHaveValue("A");
  await expect(page.getByLabel("Official fixture")).toHaveValue("wc2026-group-a-md1-01-mexico-vs-south-africa");
  await expect(fixtureMetadata.getByText("Selected home team").locator("..")).toContainText("Mexico");
  await expect(fixtureMetadata.getByText("Selected away team").locator("..")).toContainText("South Africa");
  await expect(fixtureMetadata.getByText("Status", { exact: true }).locator("..")).toContainText("Scheduled");
});

test("initial simulation results render on page load for the default scheduled fixture", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Mexico vs South Africa" })
  ).toBeVisible();

  const resultsHeadingSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsHeadingSection.getByText("Draw", { exact: true })).toBeVisible();
});

test("changing the selected group filters official fixtures to that group only", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("World Cup group").selectOption("C");

  const fixtureSelect = page.getByLabel("Official fixture");
  await expect(fixtureSelect).toHaveValue("wc2026-group-c-md1-01-brazil-vs-morocco");
  await expect(fixtureSelect.getByRole("option")).toHaveCount(6);
  await expect(fixtureSelect).toContainText("Fixture 1 - Brazil vs Morocco");
  await expect(fixtureSelect).toContainText("Fixture 2 - Haiti vs Scotland");
  await expect(fixtureSelect).not.toContainText("Mexico vs South Africa");
});

test("scheduled fixture selection updates both teams in official order", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("World Cup group").selectOption("D");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-d-md1-02-australia-vs-turkey");

  await expect(page.getByText("Selected home team").locator("..")).toContainText("Australia");
  await expect(page.getByText("Selected away team").locator("..")).toContainText("Turkey");
  await expect(page.getByText("Fixture order").locator("..")).toContainText("2");
});

// ── Win/draw/loss probability cards ──────────────────────────────────────────

test("outcome probability cards render with percentage values", async ({ page }) => {
  await page.goto("/");

  const resultsSection = page.getByRole("region", {
    name: "Mexico vs South Africa"
  });

  // Three probability articles are inside the results section
  const probabilityCards = resultsSection.getByRole("article");
  await expect(probabilityCards).toHaveCount(3);

  // Each card should show a percentage
  for (const card of await probabilityCards.all()) {
    await expect(card).toContainText("%");
  }
});

// ── Most likely scorelines ────────────────────────────────────────────────────

test("most likely scorelines heading and list are visible", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Most likely scorelines" })
  ).toBeVisible();

  // Scorelines render as a list — at least one item should be present
  const scorelineItems = page
    .getByRole("region", { name: "Mexico vs South Africa" })
    .getByRole("list")
    .getByRole("listitem");

  await expect(scorelineItems.first()).toBeVisible();
});

// ── Scheduled simulation run ──────────────────────────────────────────────────

test("running a manual simulation from a scheduled fixture uses the selected official matchup", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("World Cup group").selectOption("C");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-c-md1-02-haiti-vs-scotland");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
});

test("changing scheduled fixture selection clears stale results", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByLabel("Official fixture").selectOption("wc2026-group-a-md1-02-south-korea-vs-czechia");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("changing scheduled group clears stale results", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByLabel("World Cup group").selectOption("B");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("switching prediction mode clears stale results for the selected fixture", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("switching to custom matchup clears stale scheduled results", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Custom matchup" }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

// ── Custom matchup mode ───────────────────────────────────────────────────────

test("custom matchup mode remains functional with manual inputs", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();

  await expect(page.getByRole("combobox", { name: "Home team" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Away team" })).toBeVisible();

  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();
});

test("custom matchup grouped selector excludes the selected home team from away options", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");

  await page.getByRole("combobox", { name: "Away team" }).click();
  await page.getByRole("combobox", { name: "Away team" }).fill("Brazil");

  await expect(page.getByRole("option", { name: "Brazil · Group C" })).not.toBeVisible();
});

test("custom matchup supports keyboard selection and canonical team labels", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();

  const homeTeamInput = page.getByRole("combobox", { name: "Home team" });
  await homeTeamInput.click();
  await homeTeamInput.fill("USA");
  await homeTeamInput.press("ArrowDown");
  await homeTeamInput.press("Enter");

  await expect(homeTeamInput).toHaveValue("United States");
});

test("changing a custom selected team clears stale results", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await selectTeamOption(page, "Away team", "England", "England · Group L");

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("swap teams exchanges canonical values and clears stale results", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await page.getByRole("button", { name: "Swap teams" }).click();

  await expect(page.getByRole("combobox", { name: "Home team" })).toHaveValue("Germany");
  await expect(page.getByRole("combobox", { name: "Away team" })).toHaveValue("Brazil");
  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("custom matchup remains functional in Auto Predict From Elo mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
});

// ── Manual simulation run ─────────────────────────────────────────────────────

test("submitting manual simulation with different teams updates result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");

  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(
    page.getByRole("heading", { name: "Brazil vs Germany" })
  ).toBeVisible();
});

test("manual simulation result shows three probability cards", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Spain", "Spain · Group H");
  await selectTeamOption(page, "Away team", "England", "England · Group L");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Spain vs England" });
  await expect(resultsSection.getByRole("article")).toHaveCount(3);
});

// ── Result output sections ────────────────────────────────────────────────────

test("manual simulation result includes win draw loss labels, expected goals, scorelines, and baseline note", async ({
  page
}) => {
  await page.goto("/");

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });

  // Win/draw/loss probability card labels use home and away team names
  await expect(resultsSection.getByText("Mexico win")).toBeVisible();
  await expect(resultsSection.getByText("Draw")).toBeVisible();
  await expect(resultsSection.getByText("South Africa win")).toBeVisible();

  // Expected goals metadata terms
  await expect(resultsSection.getByText("Expected home goals")).toBeVisible();
  await expect(resultsSection.getByText("Expected away goals")).toBeVisible();

  // Most likely scorelines section heading
  await expect(
    resultsSection.getByRole("heading", { name: "Most likely scorelines" })
  ).toBeVisible();

  // Baseline simulation disclaimer
  await expect(
    resultsSection.getByText("Baseline simulation, not a guarantee.")
  ).toBeVisible();
});

// ── Auto Predict From Elo mode ────────────────────────────────────────────────

test("switching to Auto Predict From Elo mode shows Elo info panel", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(
    page.getByText("Expected goals generated from live Elo")
  ).toBeVisible();
});

test("scheduled fixture selection works in Auto Predict From Elo mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("World Cup group").selectOption("C");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-c-md1-02-haiti-vs-scotland");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
});

test("Elo mode preset selector shows all three preset buttons", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByRole("button", { name: "Conservative" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Balanced" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggressive" })).toBeVisible();
});

test("Auto Predict From Elo with valid teams returns Live Elo prediction result", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
  await expect(resultsSection.getByText("Live Elo auto prediction")).toBeVisible();
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();
  await expect(resultsSection.getByText("Medium", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Data coverage")).toBeVisible();
  await expect(resultsSection.getByText("Partial", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Both teams use computed Live Elo ratings.")).toBeVisible();
  await expect(resultsSection.getByText("Attack and defense ratings are unavailable.")).toBeVisible();
  await expect(
    resultsSection.getByText(
      "Live Elo is based on partial curated data and is not a public accuracy claim."
    )
  ).toBeVisible();
});

test("Auto Predict From Elo supports Haiti vs Scotland from World Cup 2026 coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "Haiti", "Haiti · Group C");
  await selectTeamOption(page, "Away team", "Scotland", "Scotland · Group C");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Haiti vs Scotland" });

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
  await expect(resultsSection.getByText("Live Elo auto prediction")).toBeVisible();
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();
  await expect(resultsSection.getByText("Low", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Partial with fallback", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Haiti uses the fallback rating of 1500.")).toBeVisible();
  await expect(resultsSection.getByText("Manual xG review recommended.")).toBeVisible();
  await expect(
    resultsSection.getByText(
      "Live Elo is based on partial curated data and is not a public accuracy claim."
    )
  ).toBeVisible();
  await expect(
    resultsSection.getByText(/Fallback seed rating/)
  ).toBeVisible();
});

test("changing a scheduled fixture clears stale confidence output together with stale prediction results", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();

  await page.getByLabel("Official fixture").selectOption("wc2026-group-a-md1-02-south-korea-vs-czechia");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Prediction confidence" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("manual simulation flow does not render automated confidence metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).not.toBeVisible();
  await expect(resultsSection.getByText("Manual xG review recommended.")).not.toBeVisible();
});

// ── Elo prediction presets ────────────────────────────────────────────────────

test("conservative preset result shows conservative preset metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Conservative" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();
});

test("balanced preset result shows balanced preset metadata", async ({ page }) => {
  await page.goto("/");

  // Balanced is the default preset — no preset button click needed
  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/balanced preset/)).toBeVisible();
});

test("aggressive preset result shows aggressive preset metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Aggressive" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
});

test("switching preset from conservative to aggressive updates preset metadata in result", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Conservative" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();

  // Switch to aggressive and re-submit with the same teams
  await page.getByRole("button", { name: "Aggressive" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
  await expect(resultsSection.getByText(/conservative preset/)).not.toBeVisible();
});

// ── Team aliases ──────────────────────────────────────────────────────────────

test("entering Korea Republic in Elo mode resolves to South Korea in result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "Korea Republic", "South Korea · Group A");
  await selectTeamOption(page, "Away team", "France", "France · Group I");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "South Korea vs France" })
  ).toBeVisible();
});

test("entering Czech Republic in Elo mode resolves to Czechia in result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "Czech Republic", "Czechia · Group A");
  await selectTeamOption(page, "Away team", "France", "France · Group I");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Czechia vs France" })
  ).toBeVisible();
});

test("entering USA in Elo mode resolves to United States in result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "USA", "United States · Group D");
  await selectTeamOption(page, "Away team", "France", "France · Group I");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "United States vs France" })
  ).toBeVisible();
});

// ── Alias search and duplicate prevention ─────────────────────────────────────

test("alias search in custom mode returns canonical team options", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("combobox", { name: "Home team" }).click();
  await page.getByRole("combobox", { name: "Home team" }).fill("USA");

  await expect(page.getByRole("option", { name: "United States · Group D" })).toBeVisible();
});

test("duplicate-team selection is prevented in custom mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await page.getByRole("combobox", { name: "Away team" }).click();
  await page.getByRole("combobox", { name: "Away team" }).fill("Brazil");

  await expect(page.getByRole("option", { name: "Brazil · Group C" })).not.toBeVisible();
});

// ── Manual mode validation ────────────────────────────────────────────────────

test("invalid xG value in manual mode shows field-level validation error", async ({ page }) => {
  await page.goto("/");

  // Negative xG is invalid — client requires 0 or greater
  await page.getByLabel("Expected home goals").fill("-1");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(
    page.getByText("Expected home goals must be 0 or greater.")
  ).toBeVisible();
});

// ── Tournament form adjustment toggle ─────────────────────────────────────────

test("tournament form toggle defaults to Off in Auto Predict mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByText("Tournament form adjustment")).toBeVisible();
  await expect(page.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "On", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("tournament form toggle is not visible in Manual xG mode", async ({ page }) => {
  await page.goto("/");

  // Default is manual mode — toggle should not be visible
  await expect(page.getByText("Tournament form adjustment")).not.toBeVisible();
});

test("switching to Manual xG mode hides tournament form toggle", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await expect(page.getByText("Tournament form adjustment")).toBeVisible();

  await page.getByRole("button", { name: "Manual xG" }).click();
  await expect(page.getByText("Tournament form adjustment")).not.toBeVisible();
});

test("tournament form help text is visible when toggle is shown", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(
    page.getByText("Uses completed World Cup 2026 matches as a bounded secondary Elo signal.")
  ).toBeVisible();
});

test("enabling tournament form toggle clears stale results", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "On", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("disabling tournament form toggle clears stale results", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Off" }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("running Auto Predict with tournament form Off does not show tournament form section", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  // Off is the default — no need to click Off
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection).toBeVisible();
  await expect(resultsSection.getByText("Tournament form", { exact: true })).not.toBeVisible();
});

test("running Auto Predict with tournament form On shows tournament form section", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();
});

test("tournament form section shows Applied or Not applied status", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();
  // Accept either Applied or Not applied — depends on local completed-results data
  const hasApplied = await resultsSection.getByText("Applied", { exact: true }).isVisible();
  const hasNotApplied = await resultsSection.getByText("Not applied", { exact: true }).isVisible();
  expect(hasApplied || hasNotApplied).toBe(true);
});

test("tournament form Not applied shows explanatory text", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByLabel("World Cup group").selectOption("G");
  // Group G: Belgium, Egypt, Iran, New Zealand — may have few completed matches
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: /Belgium vs Egypt/ });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();

  const notApplied = await resultsSection.getByText("Not applied", { exact: true }).isVisible();
  const applied = await resultsSection.getByText("Applied", { exact: true }).isVisible();

  if (notApplied) {
    await expect(
      resultsSection.getByText("Not enough completed tournament matches yet to apply a secondary Elo adjustment.")
    ).toBeVisible();
  } else {
    // Applied path is also valid
    expect(applied).toBe(true);
  }
});

test("tournament form Applied shows Baseline Elo, Adjustment, Effective Elo and Matches for both teams", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  // Group A - Mexico and South Africa — most likely to have completed matches
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  const isApplied = await resultsSection.getByText("Applied", { exact: true }).isVisible();

  if (isApplied) {
    await expect(resultsSection.getByText("Baseline Elo").first()).toBeVisible();
    await expect(resultsSection.getByText("Adjustment").first()).toBeVisible();
    await expect(resultsSection.getByText("Effective Elo").first()).toBeVisible();
    await expect(resultsSection.getByText("Matches").first()).toBeVisible();
    await expect(
      resultsSection.getByText("Secondary Elo adjustment from completed World Cup 2026 matches.")
    ).toBeVisible();
  } else {
    // Not applied is valid given sparse local data
    await expect(resultsSection.getByText("Not applied", { exact: true })).toBeVisible();
  }
});

test("tournament form section always shows secondary signal disclaimer", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(
    resultsSection.getByText(
      "Tournament form is an optional secondary signal, not a separate prediction model. It does not automatically increase confidence."
    )
  ).toBeVisible();
});

// ── Match context section in simulation results ───────────────────────────────

test("initial simulation result always shows match context section header", async ({ page }) => {
  await page.goto("/");

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(
    resultsSection.getByText("Match context — not used as a model input", { exact: true })
  ).toBeVisible();
});

test("custom matchup simulation shows match context section with not-available message", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(
    resultsSection.getByText("Match context — not used as a model input", { exact: true })
  ).toBeVisible();
  await expect(
    resultsSection.getByText("Match context is not available for this prediction.", { exact: true })
  ).toBeVisible();
});

test("match context section header remains visible after running Auto Predict From Elo in scheduled mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(
    resultsSection.getByText("Match context — not used as a model input", { exact: true })
  ).toBeVisible();
});

test("Manual xG result does not show tournament form section", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).not.toBeVisible();
});

test("switching from tournament form On back to Off and re-predicting removes tournament form section", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Off" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).not.toBeVisible();
});

test("scheduled fixture and custom matchup flows remain functional with tournament form enabled", async ({ page }) => {
  await page.goto("/");

  // Scheduled fixture flow with tournament form On
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByLabel("World Cup group").selectOption("C");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-c-md1-01-brazil-vs-morocco");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Morocco" })).toBeVisible();

  // Custom matchup flow
  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
});

test("prediction confidence section still visible alongside tournament form section", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();
});
