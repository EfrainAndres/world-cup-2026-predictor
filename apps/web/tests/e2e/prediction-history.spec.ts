import { expect, test } from "@playwright/test";

test("opens /prediction-history and renders the page shell", async ({ page }) => {
  await page.goto("/prediction-history");

  await expect(page.getByRole("heading", { level: 1, name: "Prediction History" })).toBeVisible();
  await expect(page.getByText("Filter-scoped summary")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "History records" })).toBeVisible();
});

test("group filter is represented in the URL", async ({ page }) => {
  await page.goto("/prediction-history");

  await page.getByLabel("Group").selectOption("A");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/group=A/);
});

test("evaluated-only and pending-only filters preserve URL state", async ({ page }) => {
  await page.goto("/prediction-history");

  await page.getByLabel("Evaluation state").selectOption("evaluated");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/evaluationState=evaluated/);

  await page.getByLabel("Evaluation state").selectOption("pending");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/evaluationState=pending/);
});

test("clear filters returns to defaults", async ({ page }) => {
  await page.goto("/prediction-history?group=A&evaluationState=pending&sort=kickoff_asc&pageSize=10");

  await page.getByRole("link", { name: "Clear filters" }).click();

  await expect(page).toHaveURL("/prediction-history");
});

test("refresh preserves filter query parameters", async ({ page }) => {
  await page.goto("/prediction-history?group=B&evaluationState=all&sort=captured_asc&pageSize=50");

  await page.reload();

  await expect(page).toHaveURL(/group=B/);
  await expect(page.getByLabel("Group")).toHaveValue("B");
  await expect(page.getByLabel("Sort order")).toHaveValue("captured_asc");
  await expect(page.getByLabel("Page size")).toHaveValue("50");
});

test("empty state is visible when no history records exist", async ({ page }) => {
  await page.goto("/prediction-history");

  await expect(page.getByText("No prediction history records match the current filters.")).toBeVisible();
});

test("mobile layout remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/prediction-history");

  await expect(page.getByRole("heading", { level: 1, name: "Prediction History" })).toBeVisible();
  await expect(page.getByLabel("Group")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
});

test("sanitized history page output does not expose credentials or raw database URLs", async ({ page }) => {
  await page.goto("/prediction-history");

  await expect(page.getByText("postgresql://")).toHaveCount(0);
  await expect(page.getByText("DATABASE_URL")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Redesigned filter/list UX — raw Fixture ID moved to advanced filters,
// team search renamed, and explainer copy for statuses and Brier score.
// ---------------------------------------------------------------------------

test("raw Fixture ID and Snapshot status are collapsed behind an Advanced filters toggle", async ({ page }) => {
  await page.goto("/prediction-history");

  const advancedToggle = page.getByText("Advanced filters", { exact: true });
  await expect(advancedToggle).toBeVisible();
  await expect(page.getByLabel("Fixture ID")).not.toBeVisible();

  await advancedToggle.click();

  await expect(page.getByLabel("Fixture ID")).toBeVisible();
  await expect(page.getByLabel("Snapshot status")).toBeVisible();
  await expect(page.getByLabel("Page size")).toBeVisible();
});

test("Fixture ID filter inside Advanced filters still updates the URL", async ({ page }) => {
  await page.goto("/prediction-history");

  await page.getByText("Advanced filters", { exact: true }).click();
  await page.getByLabel("Fixture ID").fill("wc2026-group-a-md1-01-mexico-vs-south-africa");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/fixtureId=wc2026-group-a-md1-01-mexico-vs-south-africa/);
});

test("Team filter is presented as a team-or-match search", async ({ page }) => {
  await page.goto("/prediction-history");

  await expect(page.getByLabel("Team or match search")).toBeVisible();
});

test("snapshot status explainer is visible with exact-semantics copy", async ({ page }) => {
  await page.goto("/prediction-history");

  const explainer = page.getByText("What do snapshot statuses mean?");
  await expect(explainer).toBeVisible();
  await explainer.click();

  await expect(page.getByText("safe for accuracy evaluation", { exact: false })).toBeVisible();
  await expect(page.getByText("Retained for audit", { exact: false })).toBeVisible();
});

test("Brier Score explainer is visible near the filter-scoped summary", async ({ page }) => {
  await page.goto("/prediction-history");

  await expect(page.getByText("Brier Score:", { exact: false })).toBeVisible();
  await expect(page.getByText("Lower is better", { exact: false })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Mobile overflow — redesigned filters/details must not overflow small viewports
// ---------------------------------------------------------------------------

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

for (const vp of REQUIRED_VIEWPORTS) {
  test(`no horizontal overflow at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/prediction-history");

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
}
