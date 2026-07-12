import { TournamentRoundNav } from "../components/tournament-round-nav.component";
import { type TournamentRoundKey } from "../data/tournament-test-data";
import { TournamentPage } from "../pages/tournament.page";

export class TournamentFlow {
  constructor(
    private readonly tournamentPage: TournamentPage,
    private readonly tournamentRoundNav: TournamentRoundNav
  ) {}

  async openTournament(): Promise<void> {
    await this.tournamentPage.goto();
  }

  async openRound(round: TournamentRoundKey): Promise<void> {
    await this.tournamentPage.goto();
    await this.tournamentRoundNav.gotoRound(round);
  }

  async openTechnicalProvenance(): Promise<void> {
    await this.tournamentPage.goto();
    await this.tournamentPage.openTechnicalDisclosure();
  }
}
