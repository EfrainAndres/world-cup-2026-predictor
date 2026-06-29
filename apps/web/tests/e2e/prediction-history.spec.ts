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
