import { pathToFileURL } from "node:url";
import { getAttackDefenseProductionDependenciesForDiagnostics } from "../apps/web/src/lib/server-runtime.ts";
import { embeddedAttackDefenseSelectedCandidateArtifact } from "../apps/web/src/lib/attack-defense-embedded-artifact.server.ts";
import { createAttackDefenseProductionDependencies } from "../packages/api/src/attack-defense-server-composition.ts";
import {
  assessAttackDefenseRuntimeEligibility,
  getAttackDefenseRuntimeProfileSampleSize,
} from "../packages/api/src/attack-defense-runtime-profile-source.ts";
import { collectAttackDefenseRuntimeEligibilityDiagnostic } from "../packages/api/src/scripts/list-attack-defense-runtime-eligibility.ts";
import type { AttackDefenseProductionDependencies } from "../packages/api/src/attack-defense-server-composition.ts";
import type { TeamAttackDefenseProfile } from "../packages/model/src/index.ts";

const PARITY_ENV = {
  ATTACK_DEFENSE_GOAL_MODEL_MODE: "on",
  STATSBOMB_PREDICTION_SIGNAL_MODE: "off",
};

const REQUIRED_PAIRS = [
  ["Algeria", "Argentina"],
  ["Brazil", "Haiti"],
  ["Brazil", "Japan"],
] as const;

function log(msg = ""): void {
  process.stdout.write(msg + "\n");
}

function fail(message: string): never {
  throw new Error(message);
}

function getApiProfiles(): NonNullable<AttackDefenseProductionDependencies["attackDefenseProfiles"]> {
  const deps = createAttackDefenseProductionDependencies({
    env: PARITY_ENV,
    selectedCandidateArtifact: embeddedAttackDefenseSelectedCandidateArtifact,
  });
  if (deps.attackDefenseReadiness.ready !== true) {
    fail(`API runtime candidate readiness failed: ${deps.attackDefenseReadiness.reason}`);
  }
  if (deps.attackDefenseProfiles === undefined) {
    fail(`API runtime profiles unavailable: ${deps.attackDefenseDiagnostics.runtimeProfileArtifactReason}`);
  }
  return deps.attackDefenseProfiles;
}

function getWebProfiles(): NonNullable<AttackDefenseProductionDependencies["attackDefenseProfiles"]> {
  const deps = getAttackDefenseProductionDependenciesForDiagnostics(PARITY_ENV);
  if (deps.attackDefenseReadiness.ready !== true) {
    fail(`Web runtime candidate readiness failed: ${deps.attackDefenseReadiness.reason}`);
  }
  if (deps.attackDefenseProfiles === undefined) {
    fail(`Web runtime profiles unavailable: ${deps.attackDefenseDiagnostics.runtimeProfileArtifactReason}`);
  }
  return deps.attackDefenseProfiles;
}

function sortedProfiles(profiles: Map<string, TeamAttackDefenseProfile>): [string, TeamAttackDefenseProfile][] {
  return [...profiles.entries()].sort(([teamA], [teamB]) => teamA.localeCompare(teamB));
}

function compareNumber(label: string, apiValue: number | null, webValue: number | null): void {
  if (apiValue === null || webValue === null) {
    if (apiValue !== webValue) fail(`${label} mismatch: api=${apiValue} web=${webValue}`);
    return;
  }
  if (Math.abs(apiValue - webValue) > 1e-12) {
    fail(`${label} mismatch: api=${apiValue} web=${webValue}`);
  }
}

function compareProfile(api: TeamAttackDefenseProfile, web: TeamAttackDefenseProfile, team: string): void {
  if (api.teamId !== web.teamId) fail(`${team} teamId mismatch.`);
  if (api.competitionId !== web.competitionId) fail(`${team} competitionId mismatch.`);
  if (api.coverage !== web.coverage) fail(`${team} coverage mismatch: api=${api.coverage} web=${web.coverage}`);
  if (api.attackSampleSize !== web.attackSampleSize) fail(`${team} attack sample mismatch.`);
  if (api.defenseSampleSize !== web.defenseSampleSize) fail(`${team} defense sample mismatch.`);
  if (api.cutoffAt !== web.cutoffAt) fail(`${team} cutoff mismatch.`);
  compareNumber(`${team} attackStrength`, api.attackStrength, web.attackStrength);
  compareNumber(`${team} defenseStrength`, api.defenseStrength, web.defenseStrength);
  compareNumber(`${team} goalsForPerMatch`, api.goalsForPerMatch, web.goalsForPerMatch);
  compareNumber(`${team} goalsAgainstPerMatch`, api.goalsAgainstPerMatch, web.goalsAgainstPerMatch);
  compareNumber(`${team} expectedGoalsForPerMatch`, api.expectedGoalsForPerMatch, web.expectedGoalsForPerMatch);
  compareNumber(`${team} expectedGoalsAgainstPerMatch`, api.expectedGoalsAgainstPerMatch, web.expectedGoalsAgainstPerMatch);
  compareNumber(`${team} strengthOfScheduleAdjustment`, api.strengthOfScheduleAdjustment, web.strengthOfScheduleAdjustment);
  compareNumber(`${team} recencyWeight`, api.recencyWeight, web.recencyWeight);
}

function assertProfileMapsMatch(
  apiProfiles: Map<string, TeamAttackDefenseProfile>,
  webProfiles: Map<string, TeamAttackDefenseProfile>
): void {
  const apiTeams = sortedProfiles(apiProfiles).map(([team]) => team);
  const webTeams = sortedProfiles(webProfiles).map(([team]) => team);
  if (apiTeams.join("\n") !== webTeams.join("\n")) fail("Profile team set mismatch.");

  for (const [team, apiProfile] of sortedProfiles(apiProfiles)) {
    const webProfile = webProfiles.get(team);
    if (webProfile === undefined) fail(`Missing web profile for ${team}.`);
    compareProfile(apiProfile, webProfile, team);
  }
}

function assertEligibilityPairsMatch(
  apiProfiles: Map<string, TeamAttackDefenseProfile>,
  webProfiles: Map<string, TeamAttackDefenseProfile>,
  pairs: readonly (readonly [string, string])[]
): void {
  for (const [homeTeam, awayTeam] of pairs) {
    const apiEligibility = assessAttackDefenseRuntimeEligibility(homeTeam, awayTeam, apiProfiles);
    const webEligibility = assessAttackDefenseRuntimeEligibility(homeTeam, awayTeam, webProfiles);
    if (JSON.stringify(apiEligibility) !== JSON.stringify(webEligibility)) {
      fail(
        `${homeTeam} vs ${awayTeam} eligibility mismatch: api=${JSON.stringify(apiEligibility)} web=${JSON.stringify(webEligibility)}`
      );
    }
  }
}

function assertRequiredProfiles(webProfiles: Map<string, TeamAttackDefenseProfile>): void {
  const algeria = webProfiles.get("Algeria") ?? fail("Algeria profile missing.");
  const argentina = webProfiles.get("Argentina") ?? fail("Argentina profile missing.");
  if (algeria.coverage !== "partial") fail(`Expected Algeria partial coverage, received ${algeria.coverage}.`);
  if (getAttackDefenseRuntimeProfileSampleSize(algeria) !== 7) fail("Expected Algeria sample size 7.");
  if (argentina.coverage !== "full") fail(`Expected Argentina full coverage, received ${argentina.coverage}.`);
  if (getAttackDefenseRuntimeProfileSampleSize(argentina) !== 35) fail("Expected Argentina sample size 35.");

  const algeriaArgentina = assessAttackDefenseRuntimeEligibility("Algeria", "Argentina", webProfiles);
  if (!algeriaArgentina.eligible) fail(`Expected Algeria vs Argentina eligible, received ${algeriaArgentina.reason}.`);

  const brazilHaiti = assessAttackDefenseRuntimeEligibility("Brazil", "Haiti", webProfiles);
  if (brazilHaiti.eligible || brazilHaiti.reason !== "away_profile_fallback") {
    fail(`Expected Brazil vs Haiti away_profile_fallback, received ${JSON.stringify(brazilHaiti)}.`);
  }
}

export function runAttackDefenseRuntimeParityCheck(): {
  fingerprint: string;
  profileCount: number;
  sourceFixtureCount: number;
  eligiblePairCount: number;
} {
  const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();
  const apiProfiles = getApiProfiles();
  const webProfiles = getWebProfiles();

  if (apiProfiles.artifact.fingerprint !== webProfiles.artifact.fingerprint) fail("Artifact fingerprint mismatch.");
  if (apiProfiles.artifact.candidateId !== webProfiles.artifact.candidateId) fail("Candidate ID mismatch.");
  if (apiProfiles.cutoffAt !== webProfiles.cutoffAt) fail("Cutoff mismatch.");
  if (apiProfiles.profiles.size !== webProfiles.profiles.size) fail("Profile count mismatch.");
  if (apiProfiles.artifact.sourceFixtureCount !== webProfiles.artifact.sourceFixtureCount) fail("Source fixture count mismatch.");
  if (diagnostic.artifact.fingerprint !== webProfiles.artifact.fingerprint) fail("Diagnostic fingerprint mismatch.");

  assertProfileMapsMatch(apiProfiles.profiles, webProfiles.profiles);

  const firstTwentyPairs = diagnostic.eligiblePairs
    .slice(0, 20)
    .map((pair) => [pair.homeTeam, pair.awayTeam] as const);
  assertEligibilityPairsMatch(apiProfiles.profiles, webProfiles.profiles, [...REQUIRED_PAIRS, ...firstTwentyPairs]);
  assertRequiredProfiles(webProfiles.profiles);

  return {
    fingerprint: webProfiles.artifact.fingerprint,
    profileCount: webProfiles.profiles.size,
    sourceFixtureCount: webProfiles.artifact.sourceFixtureCount,
    eligiblePairCount: diagnostic.eligiblePairs.length,
  };
}

async function main(): Promise<void> {
  const result = runAttackDefenseRuntimeParityCheck();
  log("[attack-defense:runtime-parity] API diagnostic and web runtime match");
  log(`  Fingerprint : ${result.fingerprint}`);
  log(`  Profiles    : ${result.profileCount}`);
  log(`  Source fx   : ${result.sourceFixtureCount}`);
  log(`  Matchups    : ${result.eligiblePairCount}`);
}

function isCliEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
  main().catch((error) => {
    process.stderr.write(`[attack-defense:runtime-parity] Fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
