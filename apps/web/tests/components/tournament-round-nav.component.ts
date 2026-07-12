import { type Locator, type Page } from "@playwright/test";
import { tournamentRounds, type TournamentRoundKey } from "../data/tournament-test-data";

export class TournamentRoundNav {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole("navigation", {
      name: "Tournament round navigation"
    });
  }

  link(round: TournamentRoundKey): Locator {
    return this.root.getByRole("link", {
      name: tournamentRounds[round].navName,
      exact: true
    });
  }

  async gotoRound(round: TournamentRoundKey): Promise<void> {
    await this.link(round).click();
  }
}
