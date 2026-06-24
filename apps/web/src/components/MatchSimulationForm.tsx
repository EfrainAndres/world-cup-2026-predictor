"use client";

import { FormEvent, useState } from "react";
import type { ApiValidationIssue, SimulateMatchSuccessResponse, WorldCup2026FixtureFoundationResponse } from "@world-cup-2026-predictor/api";
import { getDashboardAvailableLiveEloTeams, predictDashboardMatchFromLiveElo, simulateDashboardMatch } from "../lib/api-client";
import type { EloXgPreset, PredictMatchFromLiveEloSuccessResponse, WorldCup2026MatchContext } from "../lib/api-client";
import { buildTournamentFormRequestField } from "../lib/tournament-form-helpers";
import { getGroupedTeamOptions } from "../lib/grouped-team-options";
import {
  formatFixtureStatus,
  formatScheduledFixtureLabel,
  getDefaultScheduledMatchSelection,
  getFixturesForGroup,
  resolveScheduledFixture
} from "../lib/scheduled-match-selector";
import { MatchSimulationResults } from "./MatchSimulationResults";
import { SearchableTeamSelect } from "./SearchableTeamSelect";

interface MatchSimulationFormProps {
  initialResult: SimulateMatchSuccessResponse;
  fixtureFoundation: WorldCup2026FixtureFoundationResponse;
  initialMatchContextByFixtureId?: Record<string, WorldCup2026MatchContext>;
}

interface MatchSimulationFormState {
  homeTeam: string;
  awayTeam: string;
  expectedHomeGoals: string;
  expectedAwayGoals: string;
  maxGoals: string;
  simulationCount: string;
}

type PredictionMode = "manual" | "elo";
type MatchSelectionMode = "scheduled" | "custom";
type MatchSimulationResultState = SimulateMatchSuccessResponse | PredictMatchFromLiveEloSuccessResponse;

function parseNumber(value: string): number {
  return Number(value.trim());
}

function buildInitialFormState(initialResult: SimulateMatchSuccessResponse): MatchSimulationFormState {
  return {
    homeTeam: initialResult.request.homeTeam,
    awayTeam: initialResult.request.awayTeam,
    expectedHomeGoals: initialResult.request.expectedHomeGoals.toFixed(2),
    expectedAwayGoals: initialResult.request.expectedAwayGoals.toFixed(2),
    maxGoals: initialResult.request.maxGoals.toString(),
    simulationCount: initialResult.monteCarloSimulation?.simulationCount?.toString() ?? "100"
  };
}

function buildClientValidationIssues(state: MatchSimulationFormState, mode: PredictionMode): ApiValidationIssue[] {
  const issues: ApiValidationIssue[] = [];
  const homeTeam = state.homeTeam.trim();
  const awayTeam = state.awayTeam.trim();
  const expectedHomeGoals = parseNumber(state.expectedHomeGoals);
  const expectedAwayGoals = parseNumber(state.expectedAwayGoals);
  const maxGoals = parseNumber(state.maxGoals);
  const simulationCount = state.simulationCount.trim() === "" ? undefined : parseNumber(state.simulationCount);

  if (homeTeam.length === 0) issues.push({ field: "homeTeam", message: "Home team is required." });
  if (awayTeam.length === 0) issues.push({ field: "awayTeam", message: "Away team is required." });
  if (homeTeam.length > 0 && awayTeam.length > 0 && homeTeam.toLocaleLowerCase() === awayTeam.toLocaleLowerCase()) {
    issues.push({ field: "awayTeam", message: "Away team must be different from home team." });
  }

  if (mode === "manual") {
    if (!Number.isFinite(expectedHomeGoals) || expectedHomeGoals < 0) {
      issues.push({ field: "expectedHomeGoals", message: "Expected home goals must be 0 or greater." });
    }
    if (!Number.isFinite(expectedAwayGoals) || expectedAwayGoals < 0) {
      issues.push({ field: "expectedAwayGoals", message: "Expected away goals must be 0 or greater." });
    }
  }
  if (!Number.isInteger(maxGoals) || maxGoals < 1 || maxGoals > 20) {
    issues.push({ field: "maxGoals", message: "Max goals must be a whole number from 1 to 20." });
  }
  if (simulationCount !== undefined && (!Number.isInteger(simulationCount) || simulationCount < 1 || simulationCount > 10000)) {
    issues.push({ field: "simulationCount", message: "Simulation count must be a whole number from 1 to 10000." });
  }

  return issues;
}

function FieldError({ issues, field }: { issues: readonly ApiValidationIssue[]; field: string }) {
  const issue = issues.find((entry) => entry.field === field);

  if (issue === undefined) return null;

  return (
    <div className="mt-2 text-sm font-medium text-rose-700">
      <p>{issue.message}</p>
      {issue.suggestions !== undefined && issue.suggestions.length > 0 ? (
        <p className="mt-1 text-xs font-semibold text-rose-800">Suggestions: {issue.suggestions.join(", ")}</p>
      ) : null}
    </div>
  );
}

const PRESET_LABELS: Record<EloXgPreset, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive"
};

const GROUPED_TEAM_OPTIONS = getGroupedTeamOptions();

export function MatchSimulationForm({ initialResult, fixtureFoundation, initialMatchContextByFixtureId }: MatchSimulationFormProps) {
  const defaultScheduledSelection = getDefaultScheduledMatchSelection(fixtureFoundation);
  const [matchSelectionMode, setMatchSelectionMode] = useState<MatchSelectionMode>("scheduled");
  const [predictionMode, setPredictionMode] = useState<PredictionMode>("manual");
  const [preset, setPreset] = useState<EloXgPreset>("balanced");
  const [tournamentFormEnabled, setTournamentFormEnabled] = useState(false);
  const [scheduledGroup, setScheduledGroup] = useState(defaultScheduledSelection.group);
  const [scheduledFixtureId, setScheduledFixtureId] = useState(defaultScheduledSelection.fixtureId);
  const [formState, setFormState] = useState<MatchSimulationFormState>(() => buildInitialFormState(initialResult));
  const [issues, setIssues] = useState<ApiValidationIssue[]>([]);
  const [result, setResult] = useState<MatchSimulationResultState | null>(initialResult);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTeams] = useState(() => getDashboardAvailableLiveEloTeams());

  const scheduledFixtures = getFixturesForGroup(fixtureFoundation, scheduledGroup);
  const selectedFixture = resolveScheduledFixture(fixtureFoundation, {
    group: scheduledGroup,
    fixtureId: scheduledFixtureId
  });

  const resolvedMatchContext: WorldCup2026MatchContext | undefined =
    matchSelectionMode === "scheduled" && initialMatchContextByFixtureId !== undefined
      ? initialMatchContextByFixtureId[selectedFixture.id]
      : undefined;

  function clearInteractiveState(): void {
    setIssues([]);
    setResult(null);
  }

  function updateField(field: keyof MatchSimulationFormState, value: string): void {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function handleCustomTeamChange(field: "homeTeam" | "awayTeam", value: string): void {
    if (formState[field] === value) {
      return;
    }

    setFormState((current) => ({ ...current, [field]: value }));
    clearInteractiveState();
  }

  function handleSwapTeams(): void {
    if (formState.homeTeam.trim().length === 0 || formState.awayTeam.trim().length === 0) {
      return;
    }

    setFormState((current) => ({
      ...current,
      homeTeam: current.awayTeam,
      awayTeam: current.homeTeam
    }));
    clearInteractiveState();
  }

  function applyScheduledFixtureSelection(nextGroup: string, nextFixtureId: string): void {
    const fixture = resolveScheduledFixture(fixtureFoundation, {
      group: nextGroup,
      fixtureId: nextFixtureId
    });

    setFormState((current) => ({
      ...current,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam
    }));
  }

  function handleMatchSelectionModeChange(nextMode: MatchSelectionMode): void {
    if (nextMode === matchSelectionMode) {
      return;
    }

    setMatchSelectionMode(nextMode);

    if (nextMode === "scheduled") {
      applyScheduledFixtureSelection(scheduledGroup, scheduledFixtureId);
    }

    clearInteractiveState();
  }

  function handleTournamentFormToggle(enabled: boolean): void {
    if (tournamentFormEnabled === enabled) {
      return;
    }

    setTournamentFormEnabled(enabled);
    clearInteractiveState();
  }

  function handlePredictionModeChange(nextMode: PredictionMode): void {
    if (nextMode === predictionMode) {
      return;
    }

    setPredictionMode(nextMode);
    clearInteractiveState();
  }

  function handleScheduledGroupChange(nextGroup: string): void {
    const nextFixture = getFixturesForGroup(fixtureFoundation, nextGroup)[0];

    if (nextFixture === undefined) {
      return;
    }

    setScheduledGroup(nextGroup);
    setScheduledFixtureId(nextFixture.id);
    applyScheduledFixtureSelection(nextGroup, nextFixture.id);
    clearInteractiveState();
  }

  function handleScheduledFixtureChange(nextFixtureId: string): void {
    setScheduledFixtureId(nextFixtureId);
    applyScheduledFixtureSelection(scheduledGroup, nextFixtureId);
    clearInteractiveState();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsSubmitting(true);

    const clientIssues = buildClientValidationIssues(formState, predictionMode);

    if (clientIssues.length > 0) {
      setIssues(clientIssues);
      setResult(null);
      setIsSubmitting(false);
      return;
    }

    const simulationCount = formState.simulationCount.trim() === "" ? undefined : parseNumber(formState.simulationCount);
    const monteCarlo =
      simulationCount === undefined
        ? undefined
        : {
            simulationCount,
            seed: 2026,
            mostCommonScorelineLimit: 3
          };
    const tournamentFormRequest = buildTournamentFormRequestField(tournamentFormEnabled);
    const response =
      predictionMode === "elo"
        ? predictDashboardMatchFromLiveElo({
            homeTeam: formState.homeTeam,
            awayTeam: formState.awayTeam,
            maxGoals: parseNumber(formState.maxGoals),
            mostLikelyScorelineLimit: 5,
            preset,
            ...(monteCarlo === undefined ? {} : { monteCarlo }),
            ...(tournamentFormRequest === undefined ? {} : { tournamentFormAdjustment: tournamentFormRequest })
          })
        : simulateDashboardMatch({
            homeTeam: formState.homeTeam,
            awayTeam: formState.awayTeam,
            expectedHomeGoals: parseNumber(formState.expectedHomeGoals),
            expectedAwayGoals: parseNumber(formState.expectedAwayGoals),
            maxGoals: parseNumber(formState.maxGoals),
            mostLikelyScorelineLimit: 5,
            ...(monteCarlo === undefined ? {} : { monteCarlo })
          });

    if (response.status === "validation_error") {
      setIssues([...response.issues]);
      setResult(null);
      setIsSubmitting(false);
      return;
    }

    setIssues([]);
    setResult(response);
    setFormState((current) => ({
      ...current,
      expectedHomeGoals: response.request.expectedHomeGoals.toFixed(2),
      expectedAwayGoals: response.request.expectedAwayGoals.toFixed(2)
    }));
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" noValidate>
        <div>
          <p className="text-sm font-semibold text-slate-500">Match inputs</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Run a baseline simulation</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Select an official World Cup fixture or switch to a custom matchup. Use expected-goals inputs manually or let the local
            API generate them from live Elo ratings.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Match selection</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  matchSelectionMode === "scheduled"
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => handleMatchSelectionModeChange("scheduled")}
              >
                Scheduled World Cup match
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  matchSelectionMode === "custom"
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => handleMatchSelectionModeChange("custom")}
              >
                Custom matchup
              </button>
            </div>
          </fieldset>

          {matchSelectionMode === "scheduled" ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  World Cup group
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm"
                    value={scheduledGroup}
                    onChange={(event) => handleScheduledGroupChange(event.target.value)}
                  >
                    {fixtureFoundation.groups.map((group) => (
                      <option key={group.group} value={group.group}>
                        {group.groupName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Official fixture
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm"
                    value={selectedFixture.id}
                    onChange={(event) => handleScheduledFixtureChange(event.target.value)}
                  >
                    {scheduledFixtures.map((fixture) => (
                      <option key={fixture.id} value={fixture.id}>
                        {formatScheduledFixtureLabel(fixture)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-950">Selected fixture metadata</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Group</dt>
                    <dd className="font-semibold text-slate-950">{`Group ${selectedFixture.group}`}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Matchday</dt>
                    <dd className="font-semibold text-slate-950">{selectedFixture.matchday}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="font-semibold text-slate-950">{formatFixtureStatus(selectedFixture.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Fixture order</dt>
                    <dd className="font-semibold text-slate-950">{selectedFixture.groupFixtureOrder}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Selected home team</dt>
                    <dd className="font-semibold text-slate-950">{selectedFixture.homeTeam}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Selected away team</dt>
                    <dd className="font-semibold text-slate-950">{selectedFixture.awayTeam}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
                <div>
                  <SearchableTeamSelect
                    label="Home team"
                    value={formState.homeTeam}
                    options={GROUPED_TEAM_OPTIONS}
                    excludedTeam={formState.awayTeam}
                    onChange={(value) => handleCustomTeamChange("homeTeam", value)}
                  />
                  <FieldError issues={issues} field="homeTeam" />
                </div>

                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-950"
                  onClick={handleSwapTeams}
                >
                  Swap teams
                </button>

                <div>
                  <SearchableTeamSelect
                    label="Away team"
                    value={formState.awayTeam}
                    options={GROUPED_TEAM_OPTIONS}
                    excludedTeam={formState.homeTeam}
                    onChange={(value) => handleCustomTeamChange("awayTeam", value)}
                  />
                  <FieldError issues={issues} field="awayTeam" />
                </div>
              </div>
            </>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Prediction mode</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  predictionMode === "manual"
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => handlePredictionModeChange("manual")}
              >
                Manual xG
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  predictionMode === "elo" ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => handlePredictionModeChange("elo")}
              >
                Auto Predict From Elo
              </button>
            </div>
          </fieldset>

          {predictionMode === "manual" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Expected home goals
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm"
                  value={formState.expectedHomeGoals}
                  onChange={(event) => updateField("expectedHomeGoals", event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                />
                <FieldError issues={issues} field="expectedHomeGoals" />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Expected away goals
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm"
                  value={formState.expectedAwayGoals}
                  onChange={(event) => updateField("expectedAwayGoals", event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                />
                <FieldError issues={issues} field="expectedAwayGoals" />
              </label>
            </div>
          ) : (
            <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-3">
              <p className="text-sm font-semibold text-teal-950">Expected goals generated from live Elo</p>
              <p className="mt-1 text-sm leading-6 text-teal-900">
                {matchSelectionMode === "scheduled"
                  ? "The API uses the selected official fixture teams, looks both up in the live Elo pipeline, and generates expected goals automatically."
                  : "Enter team names only. The API looks up both teams in the live Elo pipeline and generates expected goals automatically."}
              </p>

              <fieldset className="mt-3">
                <legend className="text-xs font-semibold uppercase text-teal-700">Prediction preset</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["conservative", "balanced", "aggressive"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                        preset === p
                          ? "border-teal-700 bg-teal-100 text-teal-950"
                          : "border-teal-200 bg-white/70 text-teal-800"
                      }`}
                      onClick={() => setPreset(p)}
                    >
                      {PRESET_LABELS[p]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-4">
                <legend className="text-xs font-semibold uppercase text-teal-700">Tournament form adjustment</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={!tournamentFormEnabled}
                    className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                      !tournamentFormEnabled
                        ? "border-teal-700 bg-teal-100 text-teal-950"
                        : "border-teal-200 bg-white/70 text-teal-800"
                    }`}
                    onClick={() => handleTournamentFormToggle(false)}
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    aria-pressed={tournamentFormEnabled}
                    className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                      tournamentFormEnabled
                        ? "border-teal-700 bg-teal-100 text-teal-950"
                        : "border-teal-200 bg-white/70 text-teal-800"
                    }`}
                    onClick={() => handleTournamentFormToggle(true)}
                  >
                    On
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-teal-800">
                  Uses completed World Cup 2026 matches as a bounded secondary Elo signal.
                </p>
              </fieldset>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-teal-700">Home xG</dt>
                  <dd className="font-semibold tabular-nums text-teal-950">{formState.expectedHomeGoals}</dd>
                </div>
                <div>
                  <dt className="text-teal-700">Away xG</dt>
                  <dd className="font-semibold tabular-nums text-teal-950">{formState.expectedAwayGoals}</dd>
                </div>
              </dl>
              <div className="mt-4 rounded-md border border-teal-200 bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-teal-700">Available live Elo teams</p>
                <p className="mt-1 text-xs leading-5 text-teal-950">{availableTeams.join(", ")}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Max goals
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm"
                value={formState.maxGoals}
                onChange={(event) => updateField("maxGoals", event.target.value)}
                type="number"
                min="1"
                max="20"
                step="1"
                inputMode="numeric"
              />
              <FieldError issues={issues} field="maxGoals" />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Simulation count
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm"
                value={formState.simulationCount}
                onChange={(event) => updateField("simulationCount", event.target.value)}
                type="number"
                min="1"
                max="10000"
                step="1"
                inputMode="numeric"
              />
              <FieldError issues={issues} field="simulationCount" />
            </label>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800" role="alert">
            Fix the highlighted fields before running the simulation.
          </div>
        ) : null}

        <button
          className="mt-6 w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Running simulation..." : predictionMode === "elo" ? "Auto predict from Elo" : "Run simulation"}
        </button>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          {predictionMode === "elo"
            ? "Live Elo prediction uses partial curated data and is not a public accuracy claim."
            : "Baseline simulation, not a guarantee."}
        </p>
      </form>

      {result !== null ? (
        <MatchSimulationResults result={result} matchContext={resolvedMatchContext} />
      ) : (
        <section
          aria-label="Simulation results"
          className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-500">Simulation results</p>
            <p className="mt-3 text-base font-semibold text-slate-700">Prediction unavailable</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Fix validation errors and run a new simulation.</p>
          </div>
        </section>
      )}
    </div>
  );
}
