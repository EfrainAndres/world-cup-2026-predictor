import { expect, test } from "@playwright/test";

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

// ---------------------------------------------------------------------------
// Groups overview page — structure
// ---------------------------------------------------------------------------

test("Groups page renders heading and core regions @smoke", async ({ page }) => {
  await page.goto("/groups");

  await expect(page.getByRole("heading", { name: "Groups", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Group standings overview" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Qualification overview" })).toBeVisible();
});

test("Groups page has correct metadata title", async ({ page }) => {
  await page.goto("/groups");
  await expect(page).toHaveTitle(/Groups · World Cup 2026 Predictor/);
});

test("Groups nav item is active on /groups", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/groups");
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const groupsLink = nav.getByRole("link", { name: "Groups" });
  await expect(groupsLink).toHaveAttribute("aria-current", "page");
});

test("Groups page shows 12 group overview cards", async ({ page }) => {
  await page.goto("/groups");
  const cards = page.locator("article");
  await expect(cards).toHaveCount(12);
});

test("Groups page tournament progress bar is visible", async ({ page }) => {
  await page.goto("/groups");
  await expect(page.getByText("Groups complete").first()).toBeVisible();
  await expect(page.getByText("Matches played").first()).toBeVisible();
});

test("Groups page activity section has matches CTA link", async ({ page }) => {
  await page.goto("/groups");
  const cta = page.getByRole("link", { name: "View all matches →" });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/matches");
});

test("Groups page technical details disclosure is collapsed by default", async ({ page }) => {
  await page.goto("/groups");
  const details = page.locator("details").filter({ hasText: "Technical details" });
  await expect(details).not.toHaveAttribute("open");
});

// ---------------------------------------------------------------------------
// Group overview card
// ---------------------------------------------------------------------------

test("Each group overview card links to its group detail page", async ({ page }) => {
  await page.goto("/groups");
  const firstCard = page.getByRole("article", { name: "Group A overview", exact: true });
  const viewLink = firstCard.getByRole("link", { name: "View Group A", exact: true });
  await expect(viewLink).toBeVisible();
  await expect(viewLink).toHaveAttribute("href", "/groups/A");
});

test("Clicking a group overview card navigates to the group detail page", async ({ page }) => {
  await page.goto("/groups");
  const firstCard = page.getByRole("article", { name: "Group A overview", exact: true });
  const viewLink = firstCard.getByRole("link", { name: "View Group A", exact: true });
  await viewLink.click();
  await expect(page).toHaveURL("/groups/A");
});

// ---------------------------------------------------------------------------
// Qualification overview
// ---------------------------------------------------------------------------

test("Qualification overview shows three columns", async ({ page }) => {
  await page.goto("/groups");
  const section = page.getByRole("region", { name: "Qualification overview" });
  await expect(section.getByText(/Group winners/)).toBeVisible();
  await expect(section.getByText(/Runners-up/)).toBeVisible();
  await expect(section.getByText(/Best third places/)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Group detail page — breadcrumb and nav
// ---------------------------------------------------------------------------

test("Group detail page breadcrumb links back to /groups", async ({ page }) => {
  await page.goto("/groups/A");
  const breadcrumb = page.getByRole("link", { name: "← Groups" });
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb).toHaveAttribute("href", "/groups");
});

test("Group detail page shows GroupNav with group links", async ({ page }) => {
  await page.goto("/groups/A");
  const nav = page.getByRole("navigation", { name: "Group navigation" });
  await expect(nav).toBeVisible();
  const linkA = nav.getByRole("link", { name: "A" });
  await expect(linkA).toBeVisible();
});

test("Group detail page provider metadata is behind disclosure", async ({ page }) => {
  await page.goto("/groups/A");
  const details = page.locator("details").filter({ hasText: "Data source" });
  await expect(details).not.toHaveAttribute("open");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open");
});

test("Group detail page shows official standings table", async ({ page }) => {
  await page.goto("/groups/A");
  await expect(page.getByRole("heading", { name: "Official standings" })).toBeVisible();
});

test("Group detail page has correct metadata title for Group A", async ({ page }) => {
  await page.goto("/groups/A");
  await expect(page).toHaveTitle(/Group A · World Cup 2026 Predictor/);
});

test("Invalid group slug returns 404", async ({ page }) => {
  const response = await page.goto("/groups/Z");
  expect(response?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// GroupNav — horizontal scroll / keyboard
// ---------------------------------------------------------------------------

test("GroupNav links use /groups/[X] hrefs", async ({ page }) => {
  await page.goto("/groups/A");
  const nav = page.getByRole("navigation", { name: "Group navigation" });
  const linkB = nav.getByRole("link", { name: "B" });
  await expect(linkB).toHaveAttribute("href", "/groups/B");
});

// ---------------------------------------------------------------------------
// Overflow at mobile viewports
// ---------------------------------------------------------------------------

for (const viewport of REQUIRED_VIEWPORTS) {
  test(`Groups page has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/groups");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
}
