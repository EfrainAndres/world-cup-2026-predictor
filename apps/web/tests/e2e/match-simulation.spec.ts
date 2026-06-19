import { expect, test, type Page } from "@playwright/test";

async function selectTeamOption(page: Page, label: string, searchText: string, optionLabel: string): Promise<void> {
  const input = page.getByRole("combobox", { name: label });

  await input.click();
  await input.fill(searchText);
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
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
