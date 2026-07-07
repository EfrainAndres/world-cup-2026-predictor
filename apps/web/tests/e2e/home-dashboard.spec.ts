import { expect, test } from "@playwright/test";

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 }
];

test("Home has exactly one header, one main, and eight primary sections in order @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);

  const sections = page.locator("[data-home-section]");
  await expect(sections).toHaveCount(8);
  await expect(sections.nth(0)).toHaveAttribute("id", "home-intro");
  await expect(sections.nth(1)).toHaveAttribute("id", "home-todays-matches");
  await expect(sections.nth(2)).toHaveAttribute("id", "home-featured-prediction");
  await expect(sections.nth(3)).toHaveAttribute("id", "home-group-snapshot");
  await expect(sections.nth(4)).toHaveAttribute("id", "home-tournament-outlook");
  await expect(sections.nth(5)).toHaveAttribute("id", "home-model-track-record");
  await expect(sections.nth(6)).toHaveAttribute("id", "home-quick-actions");
  await expect(sections.nth(7)).toHaveAttribute("id", "home-technical-status");
});

test("Home does not render obsolete full-detail sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Projected Round of 32" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Round of 32 match simulations" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "World Cup 2026 Group Standings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Live Elo ratings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Prediction History" })).toHaveCount(0);
});

test("Home technical status is collapsed by default", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("System status", { exact: true })).toBeVisible();
  const disclosure = page.locator("#home-technical-status details");
  await expect(disclosure).toBeVisible();
  await expect(disclosure).not.toHaveAttribute("open", "");
});

test("Home surfaces flags in match, group, prediction, and tournament summaries", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#home-featured-prediction img").first()).toBeVisible();
  await expect(page.locator("#home-group-snapshot img").first()).toBeVisible();
  await expect(page.locator("#home-tournament-outlook img").first()).toBeVisible();
});

test("Home CTAs route to reachable destinations", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "View matches" }).first().click();
  await expect(page).toHaveURL("/matches");
  await expect(page.getByRole("heading", { name: "Matches", exact: true })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Create prediction" }).first().click();
  await expect(page).toHaveURL("/predictions");
  await expect(page.getByRole("button", { name: "Scheduled World Cup match" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "View tournament", exact: true }).click();
  await expect(page).toHaveURL("/tournament");
  await expect(page.getByRole("heading", { name: "Tournament", exact: true })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "View model evidence", exact: true }).click();
  await expect(page).toHaveURL("/model");
  await expect(page.getByRole("heading", { name: "Model and Evidence Center", exact: true }),).toBeVisible();
});

for (const viewport of REQUIRED_VIEWPORTS) {
  test(`Home has no document-level horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test("mobile bottom navigation does not obscure Home content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#home-technical-status summary").scrollIntoViewIfNeeded();

  const navBox = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
  const summaryBox = await page.locator("#home-technical-status summary").boundingBox();

  expect(navBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  if (navBox && summaryBox) {
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(navBox.y);
  }
});
