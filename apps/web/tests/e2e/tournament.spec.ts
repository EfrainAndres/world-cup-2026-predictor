import { expect, test } from "../fixtures/test.fixture";
import {
  tournamentBracketRoundKeys,
  tournamentConfirmedRoundOf32Fixtures,
  tournamentLaterRoundFixtureCounts,
  tournamentRoundKeys,
  tournamentRounds,
  tournamentSentinelTexts,
  tournamentSmokeStats,
  tournamentStaleTopologyRegressions,
  tournamentViewports
} from "../data/tournament-test-data";

test("Tournament page renders the official knockout experience @smoke", async ({ tournamentPage }) => {
  await tournamentPage.goto();

  await expect(tournamentPage.page).toHaveTitle(/Tournament · World Cup 2026 Predictor/);
  await expect(tournamentPage.titleHeading).toBeVisible();
  await expect(tournamentPage.page.getByText(tournamentSmokeStats.officialKnockoutTopology)).toBeVisible();
  await expect(tournamentPage.page.getByText(tournamentSmokeStats.officialRoundOf32Fixtures)).toBeVisible();
  await expect(tournamentPage.page.getByText(tournamentSmokeStats.officialRoundOf32FixtureCount).first()).toBeVisible();
});

test("Tournament nav item is active on /tournament", async ({ tournamentPage }) => {
  await tournamentPage.page.setViewportSize({ width: 1280, height: 800 });
  await tournamentPage.goto();

  await expect(tournamentPage.primaryNavigation.getByRole("link", { name: "Tournament" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("Round navigation contains seven exact destinations", async ({ tournamentPage, tournamentRoundNav }) => {
  await tournamentPage.goto();

  for (const round of tournamentRoundKeys) {
    await expect(tournamentRoundNav.link(round)).toHaveAttribute("href", tournamentRounds[round].href);
  }
});

test("Tournament page shows one complete bracket with all six stages", async ({ tournamentPage, knockoutBracket }) => {
  await tournamentPage.goto();

  await expect(knockoutBracket.root).toHaveCount(1);
  await expect(knockoutBracket.root).toBeVisible();

  for (const round of tournamentBracketRoundKeys) {
    await expect(tournamentPage.getRoundSection(round)).toBeVisible();
  }
});

test("Tournament page shows exactly 16 official Round-of-32 fixtures", async ({
  tournamentPage,
  knockoutBracket
}) => {
  await tournamentPage.goto();

  const roundOf32 = knockoutBracket.round("roundOf32");
  await expect(knockoutBracket.fixtureCardsInRound("roundOf32")).toHaveCount(16);
  await expect(roundOf32.getByText("Official fixture")).toHaveCount(16);
  await expect(roundOf32.getByText("Projected result")).toHaveCount(16);
});

test("Tournament page shows confirmed official Round-of-32 matchups", async ({
  tournamentPage,
  knockoutBracket
}) => {
  await tournamentPage.goto();

  for (const fixture of tournamentConfirmedRoundOf32Fixtures) {
    const match = knockoutBracket.match(fixture.matchNumber);
    await expect(match.card).toBeVisible();
    await expect(match.teamName(fixture.homeTeam)).toBeVisible();
    await expect(match.teamName(fixture.awayTeam)).toBeVisible();
    await expect(match.badge("Official fixture")).toBeVisible();
  }
});

test("Tournament page distinguishes projected participants from official fixtures", async ({
  tournamentPage,
  knockoutBracket
}) => {
  await tournamentPage.goto();

  const roundOf16 = knockoutBracket.round("roundOf16");
  await expect(roundOf16.getByText("Projected participant").first()).toBeVisible();
  await expect(roundOf16.getByText("Official participant")).toHaveCount(0);
});

test("Tournament projected fixtures explain regulation score and advancement method", async ({
  tournamentPage,
  knockoutBracket
}) => {
  await tournamentPage.goto();

  const firstFixture = knockoutBracket.fixtureCards().first();
  await expect(firstFixture.getByText("Projected after regulation")).toBeVisible();
  await expect(firstFixture.getByText("Projected to advance")).toBeVisible();
  await expect(firstFixture.getByText("Advancement:")).toBeVisible();
});

test("Tournament page shows champion, runner-up, third place, and fourth place", async ({
  championOutlook,
  tournamentPage
}) => {
  await tournamentPage.goto();

  await expect(championOutlook.podiumLabel("Champion")).toBeVisible();
  await expect(championOutlook.podiumLabel("Runner-up")).toBeVisible();
  await expect(championOutlook.podiumLabel("Third place")).toBeVisible();
  await expect(championOutlook.podiumLabel("Fourth place")).toBeVisible();
  await expect(championOutlook.resolutionBadge("Projected")).toHaveCount(4);
});

test("Tournament later rounds are fully populated from projections", async ({ tournamentPage, knockoutBracket }) => {
  await tournamentPage.goto();

  for (const { round, fixtureCount } of tournamentLaterRoundFixtureCounts) {
    const section = knockoutBracket.round(round);
    await expect(knockoutBracket.fixtureCardsInRound(round)).toHaveCount(fixtureCount);
    await expect(section.getByText("Awaiting participant")).toHaveCount(0);
    await expect(section.getByText("Projected to advance").first()).toBeVisible();
  }
});

test("Tournament Final and Third Place stay projected until official dependencies resolve", async ({
  tournamentPage,
  knockoutBracket
}) => {
  await tournamentPage.goto();

  const final = knockoutBracket.round("final");
  const thirdPlace = knockoutBracket.round("thirdPlace");
  await expect(final.getByText("Projected result")).toBeVisible();
  await expect(thirdPlace.getByText("Projected result")).toBeVisible();
  await expect(final.getByText("Official result")).toHaveCount(0);
  await expect(thirdPlace.getByText("Official result")).toHaveCount(0);
});

test("Tournament page preserves provider-first stale topology regressions", async ({
  tournamentPage,
  knockoutBracket
}) => {
  await tournamentPage.goto();

  for (const regression of Object.values(tournamentStaleTopologyRegressions)) {
    await expect(knockoutBracket.matchesContaining(regression.teamA, regression.teamB)).toHaveCount(0);
    await expect(tournamentPage.page.getByText(regression.forbiddenPairText, { exact: true })).toHaveCount(0);
  }
});

test("Tournament page never shows sentinel team names", async ({ tournamentPage }) => {
  await tournamentPage.goto();

  for (const sentinelText of tournamentSentinelTexts) {
    await expect(tournamentPage.page.getByText(sentinelText)).toHaveCount(0);
  }
});

test("Home tournament outlook shows a resolved projected podium without sentinels", async ({ page }) => {
  await page.goto("/");

  const outlook = page.locator("#home-tournament-outlook");
  await expect(outlook.getByText("Projected champion")).toBeVisible();

  for (const sentinelText of tournamentSentinelTexts) {
    await expect(outlook.getByText(sentinelText)).toHaveCount(0);
  }
});

test("Tournament page surfaces TeamIdentity flags in bracket and podium summaries", async ({
  championOutlook,
  knockoutBracket,
  tournamentPage
}) => {
  await tournamentPage.goto();

  await expect(championOutlook.root.locator("img").first()).toBeVisible();
  await expect(knockoutBracket.root.locator("img").first()).toBeVisible();
});

test("Technical disclosure is collapsed by default", async ({ tournamentPage }) => {
  await tournamentPage.goto();

  await expect(tournamentPage.technicalDisclosure).toBeVisible();
  await expect(tournamentPage.technicalDisclosure).not.toHaveAttribute("open");
});

test("Home tournament CTA still routes to /tournament", async ({ page, tournamentPage }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "View tournament", exact: true }).click();
  await expect(page).toHaveURL("/tournament");
  await expect(tournamentPage.titleHeading).toBeVisible();
});

for (const viewport of tournamentViewports) {
  test(`Tournament page has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
    tournamentPage
  }) => {
    await tournamentPage.page.setViewportSize(viewport);
    await tournamentPage.goto();

    await tournamentPage.expectNoHorizontalOverflow();
  });
}

test("Mobile round navigation remains usable", async ({ tournamentFlow, tournamentPage }) => {
  await tournamentPage.page.setViewportSize({ width: 390, height: 844 });
  await tournamentFlow.openRound("final");

  await expect(tournamentPage.roundNavigation).toBeVisible();
  await expect(tournamentPage.getRoundSection("final")).toBeInViewport();
});
