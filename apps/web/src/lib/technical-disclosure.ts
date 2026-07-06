import type { ModelInfoResponse } from "@world-cup-2026-predictor/api";
import type { ProductionRuntimeDiagnostics } from "./server-runtime";

export interface ProviderWarningSummary {
  notice: string | null;
  summaryItems: string[];
  rawWarnings: readonly string[];
}

export interface ProjectionWarningSummary {
  sharedWarnings: Array<{ warning: string; fixtureCount: number }>;
  fixtureWarningsById: Map<string, readonly string[]>;
}

const MISSING_GROUP_LABEL_WARNING = /^Fixture '[^']+' is missing a provider group label\.$/;
const UNRESOLVED_CANONICAL_FIXTURE_WARNING =
  /^Fixture '[^']+' could not be resolved to (?:a canonical World Cup 2026 group-stage fixture|an internal group-stage fixture).*/;
const UNRESOLVED_TEAM_WARNING =
  /^(?:Home|Away) team '[^']+' could not be resolved to the canonical World Cup 2026 team list\.$/;
const SKIPPED_FIXTURE_ISSUES_WARNING = /^(\d+) fixture issues? were skipped while composing group detail data\.$/;
const UNGROUPED_STANDINGS_WARNING =
  "Provider standings include ungrouped rows and were not used as grouped standings truth.";

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function pushUnique(items: string[], item: string): void {
  if (!items.includes(item)) {
    items.push(item);
  }
}

export function summarizeProviderWarnings(
  warnings: readonly string[],
  state: { cacheUsed: boolean; localFallbackUsed: boolean; stale: boolean }
): ProviderWarningSummary {
  let missingGroupLabels = 0;
  let unresolvedFixtures = 0;
  let unresolvedTeams = 0;
  let skippedFixtureIssues = 0;
  let ungroupedStandings = false;

  for (const warning of warnings) {
    if (MISSING_GROUP_LABEL_WARNING.test(warning)) {
      missingGroupLabels += 1;
      continue;
    }
    if (UNRESOLVED_CANONICAL_FIXTURE_WARNING.test(warning)) {
      unresolvedFixtures += 1;
      continue;
    }
    if (UNRESOLVED_TEAM_WARNING.test(warning)) {
      unresolvedTeams += 1;
      continue;
    }
    if (warning === UNGROUPED_STANDINGS_WARNING) {
      ungroupedStandings = true;
      continue;
    }
    const skippedMatch = warning.match(SKIPPED_FIXTURE_ISSUES_WARNING);
    if (skippedMatch !== null) {
      skippedFixtureIssues += Number(skippedMatch[1]);
    }
  }

  const summaryItems: string[] = [];

  if (missingGroupLabels > 0) {
    pushUnique(
      summaryItems,
      `${pluralize(missingGroupLabels, "provider fixture is", "provider fixtures are")} missing group labels.`
    );
  }

  if (unresolvedFixtures > 0) {
    pushUnique(
      summaryItems,
      `${pluralize(unresolvedFixtures, "provider fixture could", "provider fixtures could")} not be mapped to canonical WC2026 fixtures.`
    );
  }

  if (unresolvedTeams > 0) {
    pushUnique(
      summaryItems,
      `${pluralize(unresolvedTeams, "provider team name could", "provider team names could")} not be resolved to the canonical WC2026 team list.`
    );
  }

  if (ungroupedStandings) {
    pushUnique(summaryItems, "Provider standings included ungrouped rows.");
    pushUnique(summaryItems, "Grouped standings were derived from validated match records.");
  }

  if (skippedFixtureIssues > 0) {
    pushUnique(
      summaryItems,
      `${pluralize(skippedFixtureIssues, "provider fixture issue was", "provider fixture issues were")} skipped during group composition.`
    );
  }

  if (state.localFallbackUsed) {
    pushUnique(summaryItems, "Local fallback data is active.");
  } else if (state.cacheUsed || state.stale) {
    pushUnique(summaryItems, "Cached provider data may be stale.");
  } else {
    pushUnique(summaryItems, "No local fallback was used.");
  }

  const hasMappingIssues =
    missingGroupLabels > 0 || unresolvedFixtures > 0 || unresolvedTeams > 0 || ungroupedStandings;

  const notice = state.localFallbackUsed
    ? "Live provider synchronization is unavailable. Local fallback data remains in use until a successful refresh returns."
    : hasMappingIssues
      ? "Some provider records could not be mapped to canonical World Cup 2026 fixtures. These records were ignored for grouped standings, and validated canonical data remained in use."
      : state.cacheUsed || state.stale
        ? "Showing the last successful grouped data while the provider refreshes."
        : null;

  return {
    notice,
    summaryItems,
    rawWarnings: warnings
  };
}

export function buildHomeSystemStatusSummary(
  runtimeDiagnostics: ProductionRuntimeDiagnostics,
  formulaVersion?: string
): string {
  const liveDataStatus = runtimeDiagnostics.externalProviderActive
    ? "Live data connected"
    : runtimeDiagnostics.localFallbackUsed
      ? "Live data fallback"
      : runtimeDiagnostics.cacheUsed
        ? "Live data cached"
        : runtimeDiagnostics.resultsProviderConfigured
          ? "Live data unavailable"
          : "Static fixture mode";

  const persistenceStatus = runtimeDiagnostics.databaseConnected
    ? "Persistence connected"
    : runtimeDiagnostics.persistenceProviderConfigured
      ? "Persistence unavailable"
      : "Persistence off";

  const modelStatus = formulaVersion !== undefined
    ? `Model ${formulaVersion.toLowerCase()} active`
    : "Model active";

  return `${liveDataStatus} · ${persistenceStatus} · ${modelStatus}`;
}

export function buildModelDisclosureSummary(modelInfo: ModelInfoResponse): {
  scopeSummary: string[];
  limitationSummary: string[];
} {
  return {
    scopeSummary: [
      "Live Elo + Elo-to-xG V2",
      "Poisson score matrix",
      "Match and knockout simulation",
      "Snapshot/evaluation persistence",
      "Model-vs-reality evidence"
    ],
    limitationSummary: [
      "Partial international history",
      "Not production-calibrated",
      "Recalibration requires enough unique evaluated fixtures",
      modelInfo.metadata.databaseEnabled
        ? "PostgreSQL required for persistent evidence"
        : "Persistent evidence requires PostgreSQL"
    ]
  };
}

export function summarizeRepeatedProjectionWarnings(
  fixtures: ReadonlyArray<{ fixtureId: string; warnings: readonly string[] }>
): ProjectionWarningSummary {
  const warningCounts = new Map<string, number>();

  for (const fixture of fixtures) {
    for (const warning of fixture.warnings) {
      warningCounts.set(warning, (warningCounts.get(warning) ?? 0) + 1);
    }
  }

  const sharedWarnings = [...warningCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([warning, fixtureCount]) => ({ warning, fixtureCount }));

  const sharedWarningSet = new Set(sharedWarnings.map((entry) => entry.warning));
  const fixtureWarningsById = new Map<string, readonly string[]>();

  for (const fixture of fixtures) {
    fixtureWarningsById.set(
      fixture.fixtureId,
      fixture.warnings.filter((warning) => !sharedWarningSet.has(warning))
    );
  }

  return { sharedWarnings, fixtureWarningsById };
}
