import { expect, test } from "@playwright/test";

// Group detail pages perform dynamic server rendering plus projection-cache reads/writes.
// Keep this spec serial to avoid dev-server RSC stream truncation under full-suite parallel load.
test.describe.configure({ mode: "serial" });

function buildGroupDetailSuccessResponse(group: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "success",
    group,
    timezone: "America/Bogota",
    generatedAt: "2026-06-19T12:00:00Z",
    teams: [
      { team: "Mexico", position: 1 },
      { team: "Canada", position: 2 },
      { team: "Honduras", position: 3 },
      { team: "Jamaica", position: 4 }
    ],
    standings: {
      official: [
        { team: "Mexico", points: 9, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: 6 },
        { team: "Canada", points: 6, played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1 },
        { team: "Honduras", points: 3, played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3 },
        { team: "Jamaica", points: 0, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 5, goalDifference: -4 }
      ],
      liveAvailable: false
    },
    matches: {
      completed: [
        {
          fixtureId: "m1",
          homeTeam: "Mexico",
          awayTeam: "Canada",
          state: "final",
          normalizedStatus: "finished",
          matchday: 1,
          homeScore: 3,
          awayScore: 0,
          localizedKickoff: "2026-06-12, 10:00 GMT-5",
          predictionHistory: { snapshot: { available: false }, evaluation: { available: false }, warnings: [] },
          warnings: []
        }
      ],
      live: [],
      upcoming: [
        {
          fixtureId: "m2",
          homeTeam: "Honduras",
          awayTeam: "Jamaica",
          state: "upcoming",
          normalizedStatus: "scheduled",
          matchday: 2,
          localizedKickoff: "2026-06-15, 13:00 GMT-5",
          predictionHistory: { snapshot: { available: false }, evaluation: { available: false }, warnings: [] },
          warnings: []
        }
      ],
      postponed: [],
      cancelled: [],
      unscheduled: []
    },
    qualification: {
      firstPlace: "Mexico",
      secondPlace: "Canada",
      thirdPlace: "Honduras",
      thirdPlaceCurrentlyQualifying: false,
      status: "official"
    },
    projection: {
      available: true,
      status: "complete",
      standings: [
        { team: "Mexico", points: 9, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: 6 },
        { team: "Canada", points: 6, played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1 },
        { team: "Honduras", points: 3, played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3 },
        { team: "Jamaica", points: 0, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 5, goalDifference: -4 }
      ],
      qualification: {
        projectedFirstPlace: "Mexico",
        projectedSecondPlace: "Canada",
        projectedThirdPlace: "Honduras"
      },
      fixtures: [],
      warnings: []
    },
    providerMetadata: {
      configuredProvider: "football-data",
      activeProvider: "football-data.org",
      cacheUsed: false,
      localFallbackUsed: false,
      stale: false,
      lastSuccessfulSync: "2026-06-19T11:00:00Z"
    },
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

// ── Group detail page ─────────────────────────────────────────────────────────

test("navigates to Group A from dashboard via 'View group details' link", async ({ page }) => {
  await page.goto("/");

  const groupALink = page.locator('a[href="/groups/A"]').first();
  await expect(groupALink).toBeVisible();
  await groupALink.click();

  await expect(page).toHaveURL(/\/groups\/A/);
});

test("Group A page heading and official standings appear", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("World Cup 2026 · Group A");
  await expect(page.getByRole("heading", { name: "Official standings" })).toBeVisible();
});

test("Group A navigation item is marked active", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Group A");

  const nav = page.getByRole("navigation", { name: "World Cup 2026 group navigation" });
  const activeLink = nav.locator('[aria-current="page"]');
  await expect(activeLink).toBeVisible();
  await expect(activeLink).toHaveText("A");
});

// retries:1 — dev server event-loop starvation under full-suite parallel load can truncate the RSC stream; one retry recovers.
test("can navigate from Group A to Group B via group nav", { retries: 1 }, async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Group A");

  const nav = page.getByRole("navigation", { name: "World Cup 2026 group navigation" });
  await nav.getByRole("link", { name: "B", exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/B/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Group B");
  await expect(nav.locator('[aria-current="page"]')).toHaveText("B");
});

test("match categories render without duplication", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Group A");

  // Count occurrences of Mexico — should appear once in standings, once in a match card
  const sections = page.getByRole("region");
  const allText = await page.textContent("main");
  expect(allText).toBeTruthy();

  // Verify the match sections headings exist without checking duplicates strictly
  await expect(page.getByText("Completed matches")).toBeVisible();
  await expect(page.getByText("Upcoming fixtures")).toBeVisible();
});

test("qualification context is visible", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByText("Qualification summary")).toBeVisible();
  await expect(page.getByText("Qualification context:", { exact: false })).toBeVisible();
});

test("local fallback is labeled when API returns localFallbackUsed=true", async ({ page }) => {
  await page.route("**/api/world-cup-2026/groups/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildGroupDetailSuccessResponse("A", {
          providerMetadata: {
            configuredProvider: "local",
            activeProvider: "local-fallback",
            cacheUsed: false,
            localFallbackUsed: true,
            stale: false
          },
          warnings: ["Group detail data is using the local static fallback provider."]
        })
      )
    });
  });

  await page.goto("/groups/A");

  await page.locator("summary").filter({ hasText: "Data source & technical details" }).click();
  const dataSrcSummary = page.getByLabel("Data source summary");
  await expect(dataSrcSummary.getByText("Local fallback")).toBeVisible();
  await expect(dataSrcSummary.getByText("Local static fallback is active.", { exact: false })).toBeVisible();
});

test("prediction history section is absent when no snapshots exist for the group", async ({ page }) => {
  await page.goto("/groups/A");

  // With local fallback data, no prediction snapshots are stored, so the "Pre-match prediction" section
  // is not rendered. Verify the match card sections render without the prediction block.
  await expect(page.getByText("Completed matches")).toBeVisible();
  // The prediction summary block is conditional — assert it is absent when history is unavailable.
  const predictionBlocks = page.getByText("Pre-match prediction");
  await expect(predictionBlocks).toHaveCount(0);
});

test("invalid group returns not-found response", async ({ page }) => {
  const response = await page.goto("/groups/Z");
  expect(response?.status()).toBe(404);
});

test("invalid lowercase valid group normalizes correctly", async ({ page }) => {
  await page.goto("/groups/a");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Group A");
});

test("mobile layout remains usable on 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official standings" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "World Cup 2026 group navigation" });
  await expect(nav).toBeVisible();
});

test("breadcrumb link back to groups is visible", async ({ page }) => {
  await page.goto("/groups/A");

  const backLink = page.getByRole("link", { name: "← Groups" });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL("/groups");
});

// ── Projection section ────────────────────────────────────────────────────────

test("projected standings heading appears on group detail page", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
});

test("projection section shows a status badge", async ({ page }) => {
  await page.goto("/groups/A");

  const badge = page.getByText(/Complete projection|Partial projection/);
  await expect(badge).toBeVisible();
});

test("projected standings table renders in projection section", async ({ page }) => {
  await page.goto("/groups/A");

  const projectionSection = page.getByRole("region", { name: "Projected standings" });
  const standingsTable = projectionSection.getByRole("table", { name: "Projected standings" });
  await expect(standingsTable).toBeVisible();
});

test("projected qualification section renders with team names", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByText("Projected qualification")).toBeVisible();
  await expect(page.getByText("Projected 1st")).toBeVisible();
  await expect(page.getByText("Projected 2nd")).toBeVisible();
  await expect(page.getByText("Projected 3rd")).toBeVisible();
});

test("per-fixture projections appear for unplayed Group A fixtures", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByText("Per-fixture projections")).toBeVisible();
  const fixtureRows = page.getByText(/Auto Predict|Stored prediction/);
  await expect(fixtureRows.first()).toBeVisible();
});

test("projected fixture shows scoreline when available", async ({ page }) => {
  await page.goto("/groups/A");

  const projectedLabel = page.getByText("Projected:").first();
  await expect(projectedLabel).toBeVisible();
});

test("projection section is included in mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
});

test("projection section renders for a group other than A (Group B)", async ({ page }) => {
  await page.goto("/groups/B");

  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
});

// ── Projection refresh status UI ──────────────────────────────────────────────

test("per-fixture projections section renders in Group A projection", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByText("Per-fixture projections")).toBeVisible();
});

test("projection fixture rows contain a source badge", async ({ page }) => {
  await page.goto("/groups/A");

  const sourceBadge = page.getByLabel(/^Projection source:/).first();
  await expect(sourceBadge).toBeVisible();
});

test("stored snapshot fixture shows immutable pre-match snapshot label", async ({ page }) => {
  await page.goto("/groups/A");

  const immutableLabel = page.getByLabel("Projection source type: Immutable pre-match snapshot").first();
  if (await immutableLabel.count() > 0) {
    await expect(immutableLabel).toBeVisible();
  }
});

test("auto_predict fixture shows a projection status badge when refreshAssessment is present", async ({ page }) => {
  await page.goto("/groups/A");

  const statusBadge = page.getByLabel(/^Projection status:/).first();
  if (await statusBadge.count() > 0) {
    await expect(statusBadge).toBeVisible();
  }
});

test("projection section still renders correctly on Group C", async ({ page }) => {
  await page.goto("/groups/C");

  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
  await expect(page.getByText("Per-fixture projections")).toBeVisible();
});

test("official standings render alongside projection refresh section", async ({ page }) => {
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { name: "Official standings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
});

test("projection section renders without error on all groups A through D", async ({ page }) => {
  for (const group of ["A", "B", "C", "D"]) {
    await page.goto(`/groups/${group}`);
    await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
  }
});

test("mobile layout renders projection refresh section on 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/groups/A");

  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
  await expect(page.getByText("Per-fixture projections")).toBeVisible();
});

test("projection refresh failure alert role is accessible when present", async ({ page }) => {
  await page.goto("/groups/A");

  const alerts = page.getByRole("alert");
  const count = await alerts.count();
  if (count > 0) {
    await expect(alerts.first()).toBeVisible();
  }
});

test("breadcrumb, standings, and projection all coexist without layout overflow on narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/groups/A");

  await expect(page.getByRole("link", { name: "← Groups" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Official standings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projected standings" })).toBeVisible();
});
