import { expect, test } from "@playwright/test";

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

const KNOWN_FIXTURE_ID = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const SOUTH_AFRICA_CANADA_FIXTURE_ID = "wc2026-match-73-south-africa-vs-canada";

// ---------------------------------------------------------------------------
// Matches page — structure
// ---------------------------------------------------------------------------

test("Matches page renders heading and core UI regions @smoke", async ({ page }) => {
  await page.goto("/matches");

  await expect(page.getByRole("heading", { name: "Matches", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Date navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Match filters" })).toBeVisible();
});

test("Matches page has correct metadata title", async ({ page }) => {
  await page.goto("/matches");
  await expect(page).toHaveTitle(/Matches · World Cup 2026 Predictor/);
});

test("Matches nav item is active on /matches", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/matches");
  const matchesLink = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Matches" });
  await expect(matchesLink).toHaveAttribute("aria-current", "page");
});

// ---------------------------------------------------------------------------
// Date navigation
// ---------------------------------------------------------------------------

test("Date navigation prev link goes to previous day", async ({ page }) => {
  await page.goto("/matches?date=2026-06-15");
  await page.getByRole("link", { name: "Previous day" }).click();
  await expect(page).toHaveURL(/date=2026-06-14/);
});

test("Date navigation next link goes to next day", async ({ page }) => {
  await page.goto("/matches?date=2026-06-14");
  await page.getByRole("link", { name: "Next day" }).click();
  await expect(page).toHaveURL(/date=2026-06-15/);
});

test("Today badge is shown for today's date", async ({ page }) => {
  await page.goto("/matches");
  await expect(page.getByText("Today", { exact: true }).first()).toBeVisible();
});

test("Invalid date in URL falls back to today", async ({ page }) => {
  await page.goto("/matches?date=not-a-date");
  await expect(page.getByRole("heading", { name: "Matches", exact: true })).toBeVisible();
  // Should not show an error — renders today's matches
  await expect(page.getByRole("navigation", { name: "Date navigation" })).toBeVisible();
});

test("Date navigation preserves active filter", async ({ page }) => {
  await page.goto("/matches?date=2026-06-14&filter=upcoming");
  await page.getByRole("link", { name: "Next day" }).click();
  await expect(page).toHaveURL(/filter=upcoming/);
});

// ---------------------------------------------------------------------------
// Match filters
// ---------------------------------------------------------------------------

test("All filter tab is present and active by default", async ({ page }) => {
  await page.goto("/matches");
  const allFilter = page.getByRole("navigation", { name: "Match filters" }).getByRole("link", { name: /^All/ });
  await expect(allFilter).toBeVisible();
  await expect(allFilter).toHaveAttribute("aria-current", "page");
});

test("Filter tabs are present for all filter types", async ({ page }) => {
  await page.goto("/matches");
  const filterNav = page.getByRole("navigation", { name: "Match filters" });
  for (const label of ["All", "Live", "Upcoming", "Finished", "Predicted"]) {
    await expect(filterNav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
  }
});

test("Clicking Upcoming filter updates the URL and activates the tab", async ({ page }) => {
  await page.goto("/matches");
  const upcomingFilter = page
    .getByRole("navigation", { name: "Match filters" })
    .getByRole("link", { name: /^Upcoming/ });
  await upcomingFilter.click();
  await expect(page).toHaveURL(/filter=upcoming/);
  await expect(upcomingFilter).toHaveAttribute("aria-current", "page");
});

test("Clicking All filter removes the filter from the URL", async ({ page }) => {
  await page.goto("/matches?filter=live");
  const allFilter = page
    .getByRole("navigation", { name: "Match filters" })
    .getByRole("link", { name: /^All/ });
  await allFilter.click();
  // After clicking All, filter param should not be in URL
  await expect(page).not.toHaveURL(/filter=live/);
  await expect(allFilter).toHaveAttribute("aria-current", "page");
});

// ---------------------------------------------------------------------------
// Match list
// ---------------------------------------------------------------------------

test("Match list or empty state is present on /matches", async ({ page }) => {
  await page.goto("/matches");
  const hasList = await page.locator("ol[aria-label='Matches']").count();
  const hasEmpty = await page.getByText("No matches found").count();
  expect(hasList + hasEmpty).toBeGreaterThan(0);
});

test("A date without scheduled fixtures shows the daily empty state", async ({ page }) => {
  await page.goto("/matches?date=2026-01-01");
  await expect(page.getByText("No matches found", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/matches/"]')).toHaveCount(0);
});

test("Known canonical and provider fixture identities resolve", async ({ page }) => {
  for (const href of [
    "/matches/wc2026-match-73-south-africa-vs-canada",
    "/matches/537417",
  ]) {
    const response = await page.goto(href);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "South Africa vs Canada", exact: true })).toBeVisible()}
});

// ---------------------------------------------------------------------------
// Match detail route
// ---------------------------------------------------------------------------

test("Match detail page renders for a valid fixture", async ({ page }) => {
  await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);
  // Should not be a 404
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Mexico vs South Africa" })).toBeVisible();
  // Should contain at least one team name
  await expect(page.getByText("Mexico").first()).toBeVisible();
});

test("Match detail page resolves the South Africa vs Canada official fixture", async ({ page }) => {
  await page.goto(`/matches/${SOUTH_AFRICA_CANADA_FIXTURE_ID}`);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "South Africa vs Canada" })).toBeVisible();
  await expect(page.getByText("South Africa").first()).toBeVisible();
  await expect(page.getByText("Canada").first()).toBeVisible();
});

test("Match detail page shows a back link to matches", async ({ page }) => {
  await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);
  const backLink = page.getByRole("link", { name: "Back to matches" });
  await expect(backLink).toBeVisible();
});

test("Match detail page shows status badge", async ({ page }) => {
  await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);
  // Any of these status states are valid
  const statusTexts = ["Upcoming", "Live", "Halftime", "Final", "Postponed", "Cancelled", "Unknown"];
  let found = false;
  for (const status of statusTexts) {
    const count = await page.getByText(status, { exact: true }).count();
    if (count > 0) {
      found = true;
      break;
    }
  }
  expect(found, "Expected a status badge to be visible").toBe(true);
});

test("Match detail page returns 404 for an invalid fixture ID", async ({ page }) => {
  const response = await page.goto("/matches/invalid-fixture-id-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Match not found" })).toBeVisible();
});

test("Matches nav item is active on match detail route", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);
  const matchesLink = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Matches" });
  await expect(matchesLink).toHaveAttribute("aria-current", "page");
});

test("Technical details section is collapsed by default", async ({ page }) => {
  await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);
  const details = page.locator("details").filter({ hasText: "Technical details" });
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute("open", "");
});

// ---------------------------------------------------------------------------
// Mobile — no horizontal overflow
// ---------------------------------------------------------------------------

for (const viewport of REQUIRED_VIEWPORTS) {
  test(`/matches has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/matches");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test(`Match detail page has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

// ---------------------------------------------------------------------------
// Mobile — bottom nav remains visible
// ---------------------------------------------------------------------------

test("Mobile bottom nav stays visible on /matches", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/matches");

  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
});

test("Mobile bottom nav stays visible on match detail route", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/matches/${KNOWN_FIXTURE_ID}`);

  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
});
