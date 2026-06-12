import { expect, test } from "@playwright/test";

const HISTORICAL_TOURNAMENTS = [
  { year: 2010, champion: "Spain", runnerUp: "Netherlands", thirdPlace: "Germany" },
  { year: 2014, champion: "Germany", runnerUp: "Argentina", thirdPlace: "Netherlands" },
  { year: 2018, champion: "France", runnerUp: "Croatia", thirdPlace: "Belgium" },
  { year: 2022, champion: "Argentina", runnerUp: "France", thirdPlace: "Croatia" }
] as const;

// ── Historical validation section ────────────────────────────────────────────

test("dashboard loads historical validation section and disclaimer", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  await expect(
    section.getByRole("heading", { level: 2, name: "Replay audit and tournament summaries" })
  ).toBeVisible();

  await expect(
    section.getByText("Historical validation is used for model auditing, not a public accuracy guarantee.")
  ).toBeVisible();
});

test("aggregate replay audit status renders", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  await expect(section.getByText("Aggregate audit status")).toBeVisible();
  await expect(section.getByText("4 years in replay scope")).toBeVisible();
  await expect(section.getByText("ready with warnings")).toBeVisible();
});

test("aggregate component availability renders", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  for (const label of [
    "Dataset completeness",
    "Bracket reconstruction",
    "Elo snapshot replay",
    "Monte Carlo replay",
    "Replay validation"
  ]) {
    await expect(section.getByText(label)).toBeVisible();
  }

  await expect(section.getByText("Available")).toHaveCount(5);
});

test("supported historical years render", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  for (const tournament of HISTORICAL_TOURNAMENTS) {
    await expect(
      section.getByRole("heading", { level: 3, name: `FIFA World Cup ${tournament.year}` })
    ).toBeVisible();
    await expect(section.getByText(String(tournament.year), { exact: true })).toBeVisible();
  }
});

test("each historical tournament card shows champion and runner-up", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  for (const tournament of HISTORICAL_TOURNAMENTS) {
    const card = section.getByRole("article").filter({ hasText: `FIFA World Cup ${tournament.year}` });

    await expect(card.getByText("Champion")).toBeVisible();
    await expect(card.getByText(tournament.champion, { exact: true })).toBeVisible();
    await expect(card.getByText("Runner-up")).toBeVisible();
    await expect(card.getByText(tournament.runnerUp, { exact: true })).toBeVisible();
  }
});

test("each historical tournament card shows dataset and replay status", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  for (const tournament of HISTORICAL_TOURNAMENTS) {
    const card = section.getByRole("article").filter({ hasText: `FIFA World Cup ${tournament.year}` });

    await expect(card.getByText("Dataset status")).toBeVisible();
    await expect(card.getByText("complete curated fixture foundation")).toBeVisible();
    await expect(card.getByText("Replay supported")).toBeVisible();
  }
});

test("foundation-only tournament notes render", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Replay audit and tournament summaries" });

  for (const tournament of HISTORICAL_TOURNAMENTS) {
    const card = section.getByRole("article").filter({ hasText: `FIFA World Cup ${tournament.year}` });

    await expect(
      card.getByText("Historical tournament summary is local curated fixture metadata, not a live data service.")
    ).toBeVisible();
  }
});
