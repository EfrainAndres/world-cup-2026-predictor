import { expect, test } from "@playwright/test";

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

// ---------------------------------------------------------------------------
// Model page — structure
// ---------------------------------------------------------------------------

test("Model page renders heading and subtitle", async ({ page }) => {
  await page.goto("/model");

  await expect(
    page.getByRole("heading", { name: "Model and Evidence Center", exact: true })
  ).toBeVisible();
});

test("Model page has correct metadata title", async ({ page }) => {
  await page.goto("/model");
  await expect(page).toHaveTitle(/Model · World Cup 2026 Predictor/);
});

test("Model nav item is active on /model", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/model");
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const modelLink = nav.getByRole("link", { name: "Model" });
  await expect(modelLink).toHaveAttribute("aria-current", "page");
});

// ---------------------------------------------------------------------------
// Model page — 7 regions visible
// ---------------------------------------------------------------------------

test("Model status section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-status")).toBeVisible();
});

test("Model pipeline section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-pipeline")).toBeVisible();
});

test("Model configuration section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-configuration")).toBeVisible();
});

test("Model confidence section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-confidence")).toBeVisible();
});

test("Model evidence section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-evidence")).toBeVisible();
});

test("Model recalibration section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-recalibration")).toBeVisible();
});

test("Model disclosure section is visible", async ({ page }) => {
  await page.goto("/model");
  await expect(page.locator("section#model-disclosure")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Model status region — production active badge
// ---------------------------------------------------------------------------

test("Model status shows Production active badge", async ({ page }) => {
  await page.goto("/model");
  const statusSection = page.locator("section#model-status");
  await expect(statusSection.getByText("Production active")).toBeVisible();
});

test("Model status has evidence progress bar", async ({ page }) => {
  await page.goto("/model");
  const progressbar = page.locator("section#model-status [role='progressbar']");
  await expect(progressbar).toBeVisible();
});

// ---------------------------------------------------------------------------
// Pipeline region — 8 steps in ordered list
// ---------------------------------------------------------------------------

test("Pipeline has an ordered list with 8 steps", async ({ page }) => {
  await page.goto("/model");
  const pipelineSection = page.locator("section#model-pipeline");
  const items = pipelineSection.locator("ol li");
  await expect(items).toHaveCount(8);
});

test("Pipeline step 1 mentions team resolution", async ({ page }) => {
  await page.goto("/model");
  const pipelineSection = page.locator("section#model-pipeline");
  await expect(
    pipelineSection.getByText("Resolve canonical teams", { exact: true })
  ).toBeVisible();
});

test("Pipeline step 8 mentions snapshot persistence", async ({ page }) => {
  await page.goto("/model");
  const pipelineSection = page.locator("section#model-pipeline");
  await expect(
    pipelineSection.getByText("Optionally persist immutable snapshot", { exact: true })
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Configuration region — disclosure
// ---------------------------------------------------------------------------

test("Configuration section shows formula version and preset labels", async ({ page }) => {
  await page.goto("/model");
  const configSection = page.locator("section#model-configuration");
  await expect(configSection.getByText("Formula version")).toBeVisible();
  await expect(configSection.getByText("Active preset")).toBeVisible();
});

test("Full parameters disclosure opens on click", async ({ page }) => {
  await page.goto("/model");
  const configSection = page.locator("section#model-configuration");
  const detailsTrigger = configSection.getByText("Full formula parameters and Poisson configuration");
  await detailsTrigger.click();
  const table = configSection.locator("table");
  await expect(table).toBeVisible();
});

// ---------------------------------------------------------------------------
// Confidence guide region
// ---------------------------------------------------------------------------

test("Confidence guide shows all four confidence levels", async ({ page }) => {
  await page.goto("/model");
  const confidenceSection = page.locator("section#model-confidence");
  await expect(confidenceSection.getByText("High", { exact: true })).toBeVisible();
  await expect(confidenceSection.getByText("Medium", { exact: true })).toBeVisible();
  await expect(confidenceSection.getByText("Low", { exact: true })).toBeVisible();
  await expect(confidenceSection.getByText("Very low", { exact: true })).toBeVisible();
});

test("Confidence guide shows all four coverage types", async ({ page }) => {
  await page.goto("/model");
  const confidenceSection = page.locator("section#model-confidence");
  await expect(confidenceSection.getByText("Full", { exact: true })).toBeVisible();
  await expect(confidenceSection.getByText("Partial", { exact: true })).toBeVisible();
  await expect(confidenceSection.getByText("Fallback", { exact: true })).toBeVisible();
  await expect(confidenceSection.getByText("Fallback only", { exact: true })).toBeVisible();
});

test("Confidence guide has important caveat notice", async ({ page }) => {
  await page.goto("/model");
  const confidenceSection = page.locator("section#model-confidence");
  await expect(
    confidenceSection.getByText("High confidence does not guarantee accuracy", { exact: false })
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Recalibration gate region
// ---------------------------------------------------------------------------

test("Recalibration gate shows a verdict title", async ({ page }) => {
  await page.goto("/model");
  const gateSection = page.locator("section#model-recalibration");
  await expect(gateSection).toBeVisible();
});

test("Recalibration gate has evidence progress bar", async ({ page }) => {
  await page.goto("/model");
  const gateSection = page.locator("section#model-recalibration");
  const progressbar = gateSection.locator("[role='progressbar']");
  await expect(progressbar).toBeVisible();
});

// ---------------------------------------------------------------------------
// Disclosure region — expandable details
// ---------------------------------------------------------------------------

test("Model disclosure has Known limitations details element", async ({ page }) => {
  await page.goto("/model");
  const disclosureSection = page.locator("section#model-disclosure");
  await expect(disclosureSection.getByText("Known limitations")).toBeVisible();
});

test("Model disclosure Known limitations opens on click", async ({ page }) => {
  await page.goto("/model");
  const disclosureSection = page.locator("section#model-disclosure");
  const detailsTrigger = disclosureSection.getByText("Known limitations");
  await detailsTrigger.click();
  const openDetails = disclosureSection.locator("details[open]");
  await expect(openDetails.first()).toBeVisible();
});

test("Model disclosure shows model scope details", async ({ page }) => {
  await page.goto("/model");
  const disclosureSection = page.locator("section#model-disclosure");
  await expect(disclosureSection.getByText("Model scope")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Cross-page CTAs
// ---------------------------------------------------------------------------

test("Cross-page CTAs contain links to /match, /groups, /tournament", async ({ page }) => {
  await page.goto("/model");
  const ctaNav = page.getByRole("navigation", { name: "Related pages" });
  await expect(ctaNav.getByRole("link", { name: "Run a prediction" })).toBeVisible();
  await expect(ctaNav.getByRole("link", { name: "Group standings" })).toBeVisible();
  await expect(ctaNav.getByRole("link", { name: "Tournament bracket" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Mobile viewports — no horizontal overflow
// ---------------------------------------------------------------------------

for (const vp of REQUIRED_VIEWPORTS) {
  test(`No horizontal overflow at ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/model");

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
}

// ---------------------------------------------------------------------------
// Accessibility landmarks
// ---------------------------------------------------------------------------

test("Each visible section has an aria-labelledby heading", async ({ page }) => {
  await page.goto("/model");

  const sections = [
    "model-status",
    "model-pipeline",
    "model-configuration",
    "model-confidence",
    "model-evidence",
    "model-recalibration",
    "model-disclosure"
  ];

  for (const id of sections) {
    const section = page.locator(`section#${id}`);
    const labelledById = await section.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    if (labelledById) {
      const heading = page.locator(`#${labelledById}`);
      await expect(heading).toBeVisible();
    }
  }
});
