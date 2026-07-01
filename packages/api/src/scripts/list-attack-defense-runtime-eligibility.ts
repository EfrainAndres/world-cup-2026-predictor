import { createAttackDefenseProductionDependencies } from "../attack-defense-server-composition.js";
import {
  assessAttackDefenseRuntimeEligibility,
  getAttackDefenseRuntimeProfileSampleSize,
  isValidAttackDefenseRuntimeProfile,
} from "../attack-defense-runtime-profile-source.js";
import { embeddedAttackDefenseSelectedCandidateArtifact } from "../../../../apps/web/src/lib/attack-defense-embedded-artifact.server.js";
import type { TeamAttackDefenseProfile } from "../../../model/src/index.js";
import { pathToFileURL } from "node:url";

type EligibilityRow = {
  team: string;
  coverage: string;
  sampleSize: number;
  valid: boolean;
  individuallyEligible: boolean;
  rejectionReason: string | null;
};

type EligiblePair = {
  homeTeam: string;
  awayTeam: string;
};

export type AttackDefenseEligibilityDiagnostic = {
  artifact: {
    sourceKind: "embedded_production_runtime_profiles";
    cutoffAt: string;
    candidateId: string;
    profileCount: number;
    schemaVersion: string;
    sourceFixtureCount: number;
    fingerprint: string;
    fingerprintShort: string;
  };
  teams: EligibilityRow[];
  eligibleTeams: EligibilityRow[];
  eligiblePairs: EligiblePair[];
};

export function validateAttackDefenseRuntimeEligibilityDiagnostic(diagnostic: AttackDefenseEligibilityDiagnostic): void {
  if (diagnostic.artifact.profileCount === 0) {
    throw new Error("Attack/defense runtime profiles contain zero teams.");
  }

  if (diagnostic.eligibleTeams.length === 0) {
    throw new Error("Attack/defense runtime profiles contain zero eligible teams.");
  }

  if (diagnostic.eligiblePairs.length === 0) {
    throw new Error("Attack/defense runtime profiles contain zero eligible matchup pairs.");
  }
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b);
}

function buildEligibilityRows(
  profiles: Map<string, TeamAttackDefenseProfile>
): EligibilityRow[] {
  return [...profiles.entries()]
    .sort(([teamA], [teamB]) => compareText(teamA, teamB))
    .map(([team, profile]) => {
      const valid = isValidAttackDefenseRuntimeProfile(profile);
      const sampleSize = getAttackDefenseRuntimeProfileSampleSize(profile);
      const selfEligibility = assessAttackDefenseRuntimeEligibility(team, team, new Map([[team, profile]]));

      return {
        team,
        coverage: profile.coverage,
        sampleSize,
        valid,
        individuallyEligible: valid && (profile.coverage === "full" || profile.coverage === "partial") && selfEligibility.eligible,
        rejectionReason: selfEligibility.eligible ? null : selfEligibility.reason,
      };
    });
}

export function buildEligiblePairs(rows: readonly EligibilityRow[]): EligiblePair[] {
  const eligibleTeams = rows.filter((row) => row.individuallyEligible).map((row) => row.team).sort(compareText);
  const pairs: EligiblePair[] = [];

  for (let i = 0; i < eligibleTeams.length; i += 1) {
    const homeTeam = eligibleTeams[i];
    if (homeTeam === undefined) continue;

    for (let j = i + 1; j < eligibleTeams.length; j += 1) {
      const awayTeam = eligibleTeams[j];
      if (awayTeam === undefined) continue;
      pairs.push({ homeTeam, awayTeam });
    }
  }

  return pairs;
}

export function collectAttackDefenseRuntimeEligibilityDiagnostic(): AttackDefenseEligibilityDiagnostic {
  const deps = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
    selectedCandidateArtifact: embeddedAttackDefenseSelectedCandidateArtifact,
  });

  if (deps.attackDefenseReadiness.ready !== true) {
    throw new Error(`Attack/defense artifact failed readiness: ${deps.attackDefenseReadiness.reason}`);
  }

  if (deps.attackDefenseProfiles === undefined) {
    throw new Error("Attack/defense runtime profiles are unavailable.");
  }

  const profileCount = deps.attackDefenseProfiles.profiles.size;
  if (profileCount === 0) {
    throw new Error("Attack/defense runtime profiles contain zero teams.");
  }

  const teams = buildEligibilityRows(deps.attackDefenseProfiles.profiles);
  const eligibleTeams = teams.filter((row) => row.individuallyEligible);

  const eligiblePairs = buildEligiblePairs(teams).filter((pair) => {
    const eligibility = assessAttackDefenseRuntimeEligibility(
      pair.homeTeam,
      pair.awayTeam,
      deps.attackDefenseProfiles!.profiles
    );
    return eligibility.eligible;
  });

  const diagnostic: AttackDefenseEligibilityDiagnostic = {
    artifact: {
      sourceKind: deps.attackDefenseProfiles.artifact.sourceKind,
      cutoffAt: deps.attackDefenseProfiles.cutoffAt,
      candidateId: deps.attackDefenseReadiness.candidateId,
      profileCount,
      schemaVersion: deps.attackDefenseProfiles.artifact.schemaVersion,
      sourceFixtureCount: deps.attackDefenseProfiles.artifact.sourceFixtureCount,
      fingerprint: deps.attackDefenseProfiles.artifact.fingerprint,
      fingerprintShort: deps.attackDefenseProfiles.artifact.fingerprintShort,
    },
    teams,
    eligibleTeams,
    eligiblePairs,
  };

  validateAttackDefenseRuntimeEligibilityDiagnostic(diagnostic);

  for (const pair of diagnostic.eligiblePairs.slice(0, 20)) {
    const eligibility = assessAttackDefenseRuntimeEligibility(
      pair.homeTeam,
      pair.awayTeam,
      deps.attackDefenseProfiles.profiles
    );
    if (!eligibility.eligible) {
      throw new Error(`Printed eligible pair failed verification: ${pair.homeTeam} vs ${pair.awayTeam} (${eligibility.reason})`);
    }
  }

  return diagnostic;
}

function log(msg = ""): void {
  process.stdout.write(msg + "\n");
}

function renderTeamRow(row: EligibilityRow): string {
  return [
    row.team.padEnd(22),
    row.coverage.padEnd(8),
    String(row.sampleSize).padStart(6),
    (row.valid ? "yes" : "no").padStart(7),
    (row.individuallyEligible ? "yes" : "no").padStart(10),
    (row.rejectionReason ?? "-"),
  ].join("  ");
}

function renderPairRow(pair: EligiblePair): string {
  return `${pair.homeTeam} vs ${pair.awayTeam}`;
}

async function main(): Promise<void> {
  const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();

  log("[attack-defense:eligibility] Embedded Attack/Defense runtime eligibility");
  log("");
  log("Artifact metadata");
  log(`  Source kind : ${diagnostic.artifact.sourceKind}`);
  log(`  Cutoff      : ${diagnostic.artifact.cutoffAt}`);
  log(`  Candidate   : ${diagnostic.artifact.candidateId}`);
  log(`  Profiles    : ${diagnostic.artifact.profileCount}`);
  log(`  Source fx   : ${diagnostic.artifact.sourceFixtureCount}`);
  log(`  Schema      : ${diagnostic.artifact.schemaVersion}`);
  log(`  Fingerprint : ${diagnostic.artifact.fingerprint}`);
  log(`  Eligible    : ${diagnostic.eligibleTeams.length} teams`);
  log(`  Matchups    : ${diagnostic.eligiblePairs.length} pairs`);
  log("");
  log("Teams");
  log("  Team                    Coverage  Sample    Valid    Eligible  Reason");
  for (const row of diagnostic.teams) {
    log(`  ${renderTeamRow(row)}`);
  }
  log("");
  log("First 20 eligible matchup pairs");
  for (const pair of diagnostic.eligiblePairs.slice(0, 20)) {
    log(`  ${renderPairRow(pair)}`);
  }
}

function isCliEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}

if (isCliEntrypoint()) {
  main().catch((error) => {
    process.stderr.write(`[attack-defense:eligibility] Fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
