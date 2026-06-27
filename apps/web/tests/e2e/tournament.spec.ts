import { expect, test } from "@playwright/test";

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

// ---------------------------------------------------------------------------
// Tournament page — structure
// ---------------------------------------------------------------------------

test("Tournament page renders heading and core regions", async ({ page }) => {
  await page.goto("/tournament");

  await expect(page.getByRole("heading", { name: "Tournament", exact: true })).toBeVisible();
});

test("Tournament page has correct metadata title", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page).toHaveTitle(/Tournament · World Cup 2026 Predictor/);
});

test("Tournament nav item is active on /tournament", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tournament");
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const tournamentLink = nav.getByRole("link", { name: "Tournament" });
  await expect(tournamentLink).toHaveAttribute("aria-current", "page");
});

// ---------------------------------------------------------------------------
// Tournament status bar
// ---------------------------------------------------------------------------

test("Tournament page shows status bar with Projected badge", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.getByText("Projected").first()).toBeVisible();
  await expect(page.getByText(/Qualified teams/).first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Round navigation
// ---------------------------------------------------------------------------

test("Tournament page shows round navigation", async ({ page }) => {
  await page.goto("/tournament");
  const nav = page.getByRole("navigation", { name: "Tournament round navigation" });
  await expect(nav).toBeVisible();
});

test("Round nav contains expected round links", async ({ page }) => {
  await page.goto("/tournament");
  const nav = page.getByRole("navigation", { name: "Tournament round navigation" });
  await expect(nav.getByRole("link", { name: "Champion", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Round of 32", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Round of 16", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Quarterfinals", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Semifinals", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Final", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Third Place", exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Champion outlook
// ---------------------------------------------------------------------------

test("Tournament page shows champion outlook section", async ({ page }) => {
  await page.goto("/tournament");
  const champion = page.getByRole("region", { name: "Champion outlook" });
  await expect(champion).toBeVisible();
  await expect(champion.getByRole("article", { name: "Projected champion" })).toBeVisible();
  await expect(champion.getByRole("article", { name: "Projected runner-up" })).toBeVisible();
  await expect(champion.getByRole("article", { name: "Projected third place match" })).toBeVisible();
});

test("Champion outlook has Projected only badge", async ({ page }) => {
  await page.goto("/tournament");
  const champion = page.getByRole("region", { name: "Champion outlook" });
  await expect(champion.getByText("Projected only")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Stage sections and disclosure
// ---------------------------------------------------------------------------

test("Tournament page shows Round of 32 section", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.locator("section#tournament-round-of-32")).toBeVisible();
  await expect(page.locator("section#tournament-round-of-32").getByRole("heading", { name: "Round of 32", exact: true })).toBeVisible();
});

test("Tournament page shows Round of 16 section", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.locator("section#tournament-round-of-16")).toBeVisible();
  await expect(page.locator("section#tournament-round-of-16").getByRole("heading", { name: "Round of 16", exact: true })).toBeVisible();
});

test("Tournament page shows Quarterfinals section", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.locator("section#tournament-quarterfinals")).toBeVisible();
  await expect(page.locator("section#tournament-quarterfinals").getByRole("heading", { name: "Quarterfinals", exact: true })).toBeVisible();
});

test("Tournament page shows Semifinals section", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.locator("section#tournament-semifinals")).toBeVisible();
  await expect(page.locator("section#tournament-semifinals").getByRole("heading", { name: "Semifinals", exact: true })).toBeVisible();
});

test("Tournament page shows Final section", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.locator("section#tournament-final")).toBeVisible();
  await expect(page.locator("section#tournament-final").getByRole("heading", { name: "Final", exact: true })).toBeVisible();
});

test("Tournament page shows Third Place Match section", async ({ page }) => {
  await page.goto("/tournament");
  await expect(page.locator("section#tournament-third-place")).toBeVisible();
  await expect(page.locator("section#tournament-third-place").getByRole("heading", { name: "Third Place Match", exact: true })).toBeVisible();
});

test("Per-round simulation details are collapsed by default", async ({ page }) => {
  await page.goto("/tournament");
  const details = page.locator("details").filter({ hasText: "R32 simulation details" });
  await expect(details).not.toHaveAttribute("open");
});

test("Per-round simulation details expand on click", async ({ page }) => {
  await page.goto("/tournament");
  const details = page.locator("details").filter({ hasText: "R32 simulation details" });
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open");
});

test("Technical/projection disclosure is collapsed by default", async ({ page }) => {
  await page.goto("/tournament");
  const details = page.locator("details").filter({ hasText: "Projection methodology" });
  await expect(details).not.toHaveAttribute("open");
});

// ---------------------------------------------------------------------------
// Bracket section
// ---------------------------------------------------------------------------

test("Tournament page shows knockout bracket section", async ({ page }) => {
  await page.goto("/tournament");
  const bracket = page.locator("section#tournament-bracket");
  await expect(bracket).toBeVisible();
  await expect(bracket.getByRole("heading", { name: "Knockout bracket", exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Overflow at mobile viewports
// ---------------------------------------------------------------------------

for (const viewport of REQUIRED_VIEWPORTS) {
  test(`Tournament page has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tournament");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
}
