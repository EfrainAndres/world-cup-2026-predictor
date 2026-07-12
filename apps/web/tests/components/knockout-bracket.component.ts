import { type Locator, type Page } from "@playwright/test";
import { tournamentRounds, type TournamentRoundKey } from "../data/tournament-test-data";

export class KnockoutMatchCard {
  constructor(readonly card: Locator) {}

  teamName(teamName: string): Locator {
    return this.card.getByTitle(teamName).first();
  }

  badge(label: string): Locator {
    return this.card.getByText(label, { exact: true });
  }
}

export class KnockoutBracket {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole("region", {
      name: "Knockout bracket",
      exact: true
    });
  }

  match(matchNumber: number): KnockoutMatchCard {
    return new KnockoutMatchCard(this.root.locator(`[data-knockout-fixture="${matchNumber}"]`));
  }

  fixtureCards(): Locator {
    return this.root.locator("[data-knockout-fixture]");
  }

  round(round: TournamentRoundKey): Locator {
    return this.page.locator(`section#${tournamentRounds[round].sectionId}`);
  }

  fixtureCardsInRound(round: TournamentRoundKey): Locator {
    return this.round(round).locator("[data-knockout-fixture]");
  }

  matchesContaining(teamA: string, teamB: string): Locator {
    return this.fixtureCards().filter({ hasText: teamA }).filter({ hasText: teamB });
  }
}
