import { expect, test } from "@playwright/test";

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 }
];

test("Tournament page renders the official knockout experience @smoke", async ({ page }) => {
  await page.goto("/tournament");

  await expect(page).toHaveTitle(/Tournament · World Cup 2026 Predictor/);
  await expect(page.getByRole("heading", { name: "Tournament", exact: true })).toBeVisible();
  await expect(page.getByText("Official knockout topology")).toBeVisible();
  await expect(page.getByText("Official R32 fixtures")).toBeVisible();
  await expect(page.getByText("16").first()).toBeVisible();
});

test("Tournament nav item is active on /tournament", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tournament");

  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(nav.getByRole("link", { name: "Tournament" })).toHaveAttribute("aria-current", "page");
});

test("Round navigation contains seven exact destinations", async ({ page }) => {
  await page.goto("/tournament");

  const nav = page.getByRole("navigation", { name: "Tournament round navigation" });
  await expect(nav.getByRole("link", { name: "Champion", exact: true })).toHaveAttribute("href", "#tournament-champion-outlook");
  await expect(nav.getByRole("link", { name: "Round of 32", exact: true })).toHaveAttribute("href", "#tournament-round-of-32");
  await expect(nav.getByRole("link", { name: "Round of 16", exact: true })).toHaveAttribute("href", "#tournament-round-of-16");
  await expect(nav.getByRole("link", { name: "Quarterfinals", exact: true })).toHaveAttribute("href", "#tournament-quarterfinals");
  await expect(nav.getByRole("link", { name: "Semifinals", exact: true })).toHaveAttribute("href", "#tournament-semifinals");
  await expect(nav.getByRole("link", { name: "Final", exact: true })).toHaveAttribute("href", "#tournament-final");
  await expect(nav.getByRole("link", { name: "Third Place", exact: true })).toHaveAttribute("href", "#tournament-third-place");
});

test("Tournament page shows one complete bracket with all six stages", async ({ page }) => {
  await page.goto("/tournament");

  const bracket = page.getByRole("region", { name: "Knockout bracket", exact: true });
  await expect(bracket).toHaveCount(1);
  await expect(bracket).toBeVisible();

  await expect(page.getByRole("region", { name: "Round of 32", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Round of 16", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Quarterfinals", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Semifinals", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Final", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Third Place Match", exact: true })).toBeVisible();
});

test("Tournament page shows exactly 16 official Round-of-32 fixtures", async ({ page }) => {
  await page.goto("/tournament");

  const roundOf32 = page.locator("section#tournament-round-of-32");
  await expect(roundOf32.locator("[data-knockout-fixture]")).toHaveCount(16);
  await expect(roundOf32.getByText("Official fixture")).toHaveCount(16);
  await expect(roundOf32.getByText("Projected result")).toHaveCount(16);
});

test("Tournament page shows confirmed official Round-of-32 matchups", async ({ page }) => {
  await page.goto("/tournament");

  const examples = [
    [73, "South Africa", "Canada"],
    [74, "Brazil", "Japan"],
    [80, "England", "DR Congo"],
    [82, "United States", "Bosnia-Herzegovina"],
    [87, "Argentina", "Cape Verde"],
    [88, "Colombia", "Ghana"]
  ] as const;

  for (const [matchNumber, homeTeam, awayTeam] of examples) {
    const card = page.locator(`[data-knockout-fixture="${matchNumber}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByTitle(homeTeam).first()).toBeVisible();
    await expect(card.getByTitle(awayTeam).first()).toBeVisible();
    await expect(card.getByText("Official fixture")).toBeVisible();
  }
});

test("Tournament page distinguishes projected participants from official fixtures", async ({ page }) => {
  await page.goto("/tournament");

  const roundOf16 = page.locator("section#tournament-round-of-16");
  await expect(roundOf16.getByText("Projected participant").first()).toBeVisible();
  await expect(roundOf16.getByText("Official participant")).toHaveCount(0);
});

test("Tournament projected fixtures explain regulation score and advancement method", async ({ page }) => {
  await page.goto("/tournament");

  const firstFixture = page.locator("[data-knockout-fixture]").first();
  await expect(firstFixture.getByText("Projected after regulation")).toBeVisible();
  await expect(firstFixture.getByText("Projected to advance")).toBeVisible();
  await expect(firstFixture.getByText("Advancement:")).toBeVisible();
});

test("Tournament page shows champion, runner-up, third place, and fourth place", async ({ page }) => {
  await page.goto("/tournament");

  const champion = page.getByRole("region", { name: "Champion outlook", exact: true });
  await expect(champion.getByText("Champion", { exact: true })).toBeVisible();
  await expect(champion.getByText("Runner-up", { exact: true })).toBeVisible();
  await expect(champion.getByText("Third place", { exact: true })).toBeVisible();
  await expect(champion.getByText("Fourth place", { exact: true })).toBeVisible();
  await expect(champion.getByText("Projected", { exact: true })).toHaveCount(4);
});

test("Tournament later rounds are fully populated from projections", async ({ page }) => {
  await page.goto("/tournament");

  for (const [sectionId, fixtureCount] of [
    ["tournament-round-of-16", 8],
    ["tournament-quarterfinals", 4],
    ["tournament-semifinals", 2],
    ["tournament-final", 1],
    ["tournament-third-place", 1]
  ] as const) {
    const section = page.locator(`section#${sectionId}`);
    await expect(section.locator("[data-knockout-fixture]")).toHaveCount(fixtureCount);
    await expect(section.getByText("Awaiting participant")).toHaveCount(0);
    await expect(section.getByText("Projected to advance").first()).toBeVisible();
  }
});

test("Tournament Final and Third Place stay projected until official dependencies resolve", async ({ page }) => {
  await page.goto("/tournament");

  const final = page.locator("section#tournament-final");
  const thirdPlace = page.locator("section#tournament-third-place");
  await expect(final.getByText("Projected result")).toBeVisible();
  await expect(thirdPlace.getByText("Projected result")).toBeVisible();
  await expect(final.getByText("Official result")).toHaveCount(0);
  await expect(thirdPlace.getByText("Official result")).toHaveCount(0);
});

test("Tournament page never shows sentinel team names", async ({ page }) => {
  await page.goto("/tournament");

  await expect(page.getByText("Unknown Team")).toHaveCount(0);
  await expect(page.getByText("Unavailable")).toHaveCount(0);
  await expect(page.getByText("???")).toHaveCount(0);
});

test("Home tournament outlook shows a resolved projected podium without sentinels", async ({ page }) => {
  await page.goto("/");

  const outlook = page.locator("#home-tournament-outlook");
  await expect(outlook.getByText("Projected champion")).toBeVisible();
  await expect(outlook.getByText("Unknown Team")).toHaveCount(0);
  await expect(outlook.getByText("Unavailable")).toHaveCount(0);
  await expect(outlook.getByText("???")).toHaveCount(0);
});

test("Tournament page surfaces TeamIdentity flags in bracket and podium summaries", async ({ page }) => {
  await page.goto("/tournament");

  await expect(page.locator("#tournament-champion-outlook img").first()).toBeVisible();
  await expect(page.locator("#tournament-bracket img").first()).toBeVisible();
});

test("Technical disclosure is collapsed by default", async ({ page }) => {
  await page.goto("/tournament");

  const disclosure = page.locator("details").filter({ hasText: "Technical/provenance disclosure" });
  await expect(disclosure).toBeVisible();
  await expect(disclosure).not.toHaveAttribute("open");
});

test("Home tournament CTA still routes to /tournament", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "View tournament", exact: true }).click();
  await expect(page).toHaveURL("/tournament");
  await expect(page.getByRole("heading", { name: "Tournament", exact: true })).toBeVisible();
});

for (const viewport of REQUIRED_VIEWPORTS) {
  test(`Tournament page has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tournament");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test("Mobile round navigation remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tournament");

  const nav = page.getByRole("navigation", { name: "Tournament round navigation" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Final", exact: true }).click();
  await expect(page.locator("section#tournament-final")).toBeInViewport();
});
