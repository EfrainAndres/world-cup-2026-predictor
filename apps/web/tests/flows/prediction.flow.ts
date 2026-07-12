import { SearchableTeamSelect } from "../components/searchable-team-select.component";
import type { PredictionTeam } from "../data/prediction-test-data";
import { PredictionsPage, type PredictionPreset } from "../pages/predictions.page";

export interface CreateCustomPredictionInput {
  home: PredictionTeam;
  away: PredictionTeam;
  preset?: PredictionPreset;
  tournamentForm?: "On" | "Off";
}

export class PredictionFlow {
  constructor(
    private readonly predictionsPage: PredictionsPage,
    private readonly homeTeamSelect: SearchableTeamSelect,
    private readonly awayTeamSelect: SearchableTeamSelect
  ) {}

  async openCustomMatchup(): Promise<void> {
    await this.predictionsPage.switchToCustomMatchup();
  }

  async openCustomAutoPredict(): Promise<void> {
    await this.predictionsPage.switchToCustomMatchup();
    await this.predictionsPage.switchToAutoPredict();
  }

  async selectTeams(input: { home: PredictionTeam; away: PredictionTeam }): Promise<void> {
    await this.homeTeamSelect.select(input.home);
    await this.awayTeamSelect.select(input.away);
  }

  async createManualPrediction(input: { home: PredictionTeam; away: PredictionTeam }): Promise<void> {
    await this.openCustomMatchup();
    await this.selectTeams(input);
    await this.predictionsPage.runSimulation();
  }

  async createAutoPrediction(input: CreateCustomPredictionInput): Promise<void> {
    await this.openCustomAutoPredict();
    if (input.preset !== undefined) {
      await this.predictionsPage.selectPreset(input.preset);
    }
    if (input.tournamentForm !== undefined) {
      await this.predictionsPage.setTournamentForm(input.tournamentForm);
    }
    await this.selectTeams(input);
    await this.predictionsPage.runAutoPredict();
  }

  async runScheduledManualPrediction(input: { group: string; fixtureId: string }): Promise<void> {
    await this.predictionsPage.selectWorldCupGroup(input.group);
    await this.predictionsPage.selectOfficialFixture(input.fixtureId);
    await this.predictionsPage.runSimulation();
  }

  async runScheduledAutoPrediction(input?: {
    group?: string;
    fixtureId?: string;
    tournamentForm?: "On" | "Off";
  }): Promise<void> {
    await this.predictionsPage.switchToAutoPredict();
    if (input?.tournamentForm !== undefined) {
      await this.predictionsPage.setTournamentForm(input.tournamentForm);
    }
    if (input?.group !== undefined) {
      await this.predictionsPage.selectWorldCupGroup(input.group);
    }
    if (input?.fixtureId !== undefined) {
      await this.predictionsPage.selectOfficialFixture(input.fixtureId);
    }
    await this.predictionsPage.runAutoPredict();
  }
}
