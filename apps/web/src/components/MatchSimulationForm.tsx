"use client";

import { FormEvent, useState } from "react";
import type { ApiValidationIssue, SimulateMatchSuccessResponse } from "@world-cup-2026-predictor/api";
import { simulateDashboardMatch } from "../lib/api-client";
import { MatchSimulationResults } from "./MatchSimulationResults";

interface MatchSimulationFormProps {
  initialResult: SimulateMatchSuccessResponse;
}

interface MatchSimulationFormState {
  homeTeam: string;
  awayTeam: string;
  expectedHomeGoals: string;
  expectedAwayGoals: string;
  maxGoals: string;
  simulationCount: string;
}

const initialFormState: MatchSimulationFormState = {
  homeTeam: "Canada",
  awayTeam: "Mexico",
  expectedHomeGoals: "1.15",
  expectedAwayGoals: "1.25",
  maxGoals: "6",
  simulationCount: "100"
};

function parseNumber(value: string): number {
  return Number(value.trim());
}

function buildClientValidationIssues(state: MatchSimulationFormState): ApiValidationIssue[] {
  const issues: ApiValidationIssue[] = [];
  const homeTeam = state.homeTeam.trim();
  const awayTeam = state.awayTeam.trim();
  const expectedHomeGoals = parseNumber(state.expectedHomeGoals);
  const expectedAwayGoals = parseNumber(state.expectedAwayGoals);
  const maxGoals = parseNumber(state.maxGoals);
  const simulationCount = state.simulationCount.trim() === "" ? undefined : parseNumber(state.simulationCount);

  if (homeTeam.length === 0) issues.push({ field: "homeTeam", message: "Home team is required." });
  if (awayTeam.length === 0) issues.push({ field: "awayTeam", message: "Away team is required." });
  if (homeTeam.length > 0 && awayTeam.length > 0 && homeTeam === awayTeam) {
    issues.push({ field: "awayTeam", message: "Away team must be different from home team." });
  }
  if (!Number.isFinite(expectedHomeGoals) || expectedHomeGoals < 0) {
    issues.push({ field: "expectedHomeGoals", message: "Expected home goals must be 0 or greater." });
  }
  if (!Number.isFinite(expectedAwayGoals) || expectedAwayGoals < 0) {
    issues.push({ field: "expectedAwayGoals", message: "Expected away goals must be 0 or greater." });
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
  const message = issues.find((issue) => issue.field === field)?.message;

  if (message === undefined) return null;

  return <p className="mt-2 text-sm font-medium text-rose-700">{message}</p>;
}

export function MatchSimulationForm({ initialResult }: MatchSimulationFormProps) {
  const [formState, setFormState] = useState<MatchSimulationFormState>(initialFormState);
  const [issues, setIssues] = useState<ApiValidationIssue[]>([]);
  const [result, setResult] = useState<SimulateMatchSuccessResponse>(initialResult);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof MatchSimulationFormState, value: string): void {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsSubmitting(true);

    const clientIssues = buildClientValidationIssues(formState);

    if (clientIssues.length > 0) {
      setIssues(clientIssues);
      setIsSubmitting(false);
      return;
    }

    const simulationCount = formState.simulationCount.trim() === "" ? undefined : parseNumber(formState.simulationCount);
    const response = simulateDashboardMatch({
      homeTeam: formState.homeTeam,
      awayTeam: formState.awayTeam,
      expectedHomeGoals: parseNumber(formState.expectedHomeGoals),
      expectedAwayGoals: parseNumber(formState.expectedAwayGoals),
      maxGoals: parseNumber(formState.maxGoals),
      mostLikelyScorelineLimit: 5,
      ...(simulationCount === undefined
        ? {}
        : {
            monteCarlo: {
              simulationCount,
              seed: 2026,
              mostCommonScorelineLimit: 3
            }
          })
    });

    if (response.status === "validation_error") {
      setIssues([...response.issues]);
      setIsSubmitting(false);
      return;
    }

    setIssues([]);
    setResult(response);
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" noValidate>
        <div>
          <p className="text-sm font-semibold text-slate-500">Match inputs</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Run a baseline simulation</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">Use expected-goals inputs to generate a local API simulation.</p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Home team
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm"
              value={formState.homeTeam}
              onChange={(event) => updateField("homeTeam", event.target.value)}
              type="text"
              autoComplete="off"
            />
            <FieldError issues={issues} field="homeTeam" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Away team
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm"
              value={formState.awayTeam}
              onChange={(event) => updateField("awayTeam", event.target.value)}
              type="text"
              autoComplete="off"
            />
            <FieldError issues={issues} field="awayTeam" />
          </label>

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
          {isSubmitting ? "Running simulation..." : "Run simulation"}
        </button>

        <p className="mt-4 text-sm leading-6 text-slate-600">Baseline simulation, not a guarantee.</p>
      </form>

      <MatchSimulationResults result={result} />
    </div>
  );
}
