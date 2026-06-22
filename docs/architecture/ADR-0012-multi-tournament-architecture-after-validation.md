# ADR 0012: Defer Multi-Tournament Generalization Until After Live World Cup 2026 Validation

## Status

Accepted

## Date

2026-06-22

## Context

The product is currently built exclusively around the FIFA World Cup 2026. Tournament identity is hardcoded across the API, model, persistence, and web layers: model/metric version strings carry a `wc2026-` prefix, fixture identifiers carry a `wc2026-group-` prefix, the group set is fixed to `A`–`L`, advancement rules encode "top two per group plus the best eight third-placed teams," API routes bake `world-cup-2026` into the URL path, and product branding is hardcoded in the web shell.

There is recurring interest in eventually reusing this codebase for other competitions (other World Cups, continental championships, qualifiers). The roadmap reserves Phase 12.17, "Multi-Tournament Architecture After Validation," for that work, and its acceptance criteria are explicit: *the architecture proposal must be informed by actual live World Cup usage and evaluation evidence, and no multi-tournament generalization may happen before validation.*

This ADR records the decision about **when** and **how** to generalize. It does not generalize anything. The companion document `MULTI_TOURNAMENT_ARCHITECTURE_PROPOSAL.md` contains the full coupling audit, the classification of each coupling, the proposed future boundaries, the future database-migration strategy, and the staged implementation roadmap.

The decision must respect these constraints:

- The live World Cup 2026 workflow and its product value are not yet validated end-to-end.
- Premature abstraction risks diluting World Cup 2026 UX clarity and adding maintenance burden before any second tournament exists.
- Immutable prediction snapshots and Model-vs-Reality evaluations are already persisted; their content hashes and idempotency keys must never change retroactively.
- Existing public URLs and stored identifiers must remain stable.

## Decision

Defer all multi-tournament generalization until the live World Cup 2026 workflow is validated end-to-end and its product value is confirmed.

Specifically:

1. **No generalization in this phase.** Phase 12.17 (this phase, 12.17A) produces only an architecture proposal and this decision record. No application code, persistence schema, migration, runtime route, provider, model, test, or UI is generalized.
2. **Adopt a staged, evidence-gated roadmap** (12.17A–12.17D, defined in the proposal). Each later stage is gated on validation evidence from the stage before it and on confirmed product value from the live tournament.
3. **Generalization must be strictly additive and backward compatible.** Existing World Cup 2026 routes, identifiers, version strings, and stored hashes must remain valid and unchanged. A second tournament is introduced alongside the existing product, never by rewriting it in place.
4. **Tournament identity becomes a first-class concept only when a second tournament is actually implemented** (stage 12.17C), not preemptively.
5. **The single most important pre-implementation deliverable is a persistence tournament-scoping migration plan** (stage 12.17B), because the immutable history tables and the projection cache are where premature or incorrect generalization would be most damaging and hardest to reverse.

## Why Defer Rather Than Generalize Now

| Reason | Explanation |
| --- | --- |
| Validation first | The roadmap requires the live World Cup 2026 flow to prove value before the codebase absorbs the cost and risk of generalization. |
| Avoid premature abstraction | A `FIFA2026TournamentFormat` type already exists but is never used as a runtime parameter; this shows the cost of speculative abstraction is real and the current design deliberately keeps format inert. |
| Protect immutable history | Snapshot content hashes and evaluation identity keys embed `modelVersion`/`metricVersion` strings that carry the `wc2026-` prefix; changing how identity is composed risks the integrity of already-stored records. |
| Protect UX clarity | World Cup 2026-specific UX (12 groups, best-thirds qualification, a single implicit tournament) is currently a product strength; a generic shell could weaken it before a second tournament justifies the tradeoff. |
| Lower maintenance burden | Maintaining a generic abstraction with exactly one concrete tournament adds cost without delivering user value. |

## Compatibility Policy

This policy binds every later generalization stage.

- Existing API routes (`/api/world-cup-2026/...`) remain valid. A future generic namespace (for example `/api/tournaments/[tournamentId]/...`) is introduced as an addition; the World Cup 2026 routes may become thin aliases but must not break.
- Existing web routes (`/`, `/groups/[group]`, `/prediction-history`) remain valid and continue to resolve to World Cup 2026.
- Existing stored identifiers (`fixtureId`, `snapshotId`, `evaluationId`, `idempotency_key`, `content_hash`, `result_identity`) remain valid and are never recomputed for historical rows.
- New tournament-scoping columns are introduced as additive migrations that backfill existing rows to a World Cup 2026 default, never as destructive rewrites.
- Version strings (`modelVersion`, `metricVersion`, `formula_version`, schema versions) are append-only; a second tournament introduces new version strings rather than mutating existing ones.

## Consequences

### Benefits

- World Cup 2026 product quality and evidence-gathering remain the priority.
- Immutable history integrity is protected from speculative schema churn.
- The eventual generalization is guided by a concrete, citation-anchored audit rather than guesswork.
- Each generalization stage is small, reviewable, and reversible.

### Tradeoffs

- Reusing the codebase for a second tournament is intentionally delayed.
- Some WC2026-specific code (version-string composition, fixture-ID format, qualification rules) will need refactoring later rather than being written generically now.
- The inert `FIFA2026TournamentFormat` type remains unused until a format layer is actually adopted.

## Security

- This phase changes documentation only; it introduces no new runtime surface, credentials, or data flows.
- The compatibility policy preserves the existing server-side-only persistence boundary and the rule that no tournament identity or provider secret is exposed to the browser.
- Future tournament scoping must not weaken existing constraints (idempotency uniqueness, foreign keys, server-only writes).

## Alternatives Considered

| Alternative | Reason Not Selected |
| --- | --- |
| Generalize now, before validation | Violates the roadmap acceptance criteria; risks premature abstraction and immutable-history churn with no second tournament to justify it. |
| Generalize only the cheap, low-risk parts now (for example branding strings) | Partial generalization still introduces a tournament concept prematurely and invites inconsistent half-abstractions; cleaner to stage it behind validation. |
| Never generalize; fork the repo per tournament | Loses the long-term reuse value the roadmap explicitly wants to preserve; duplicates model and persistence maintenance. |
| Adopt the existing `FIFA2026TournamentFormat` type as the runtime format layer now | The type is currently inert by design; wiring it in now is the same premature-abstraction risk under a different name. |

## Open Questions

- The exact trigger that counts as "live World Cup 2026 validated" (which usage and evaluation metrics, over what window) — to be defined before stage 12.17B begins.
- Whether tournament scoping uses an opaque `tournament_id` string (for example `wc2026`) or a structured registry record.
- Whether the projection cache should be tournament-scoped by an added column or by encoding tournament into the existing `cache_key`.
- Whether a second tournament reuses the same model/metric version lineage or starts its own.
- Whether route generalization uses a new `/tournaments/[id]/...` tree or keeps flat routes with a tournament context resolved server-side.

## Notes

This ADR selects timing and policy, not implementation. The companion `MULTI_TOURNAMENT_ARCHITECTURE_PROPOSAL.md` holds the detailed audit, classification, proposed boundaries, migration strategy, and staged roadmap. No later stage may begin until the validation gate defined here and in the proposal is met.

Related decisions: ADR 0010 (persistent prediction history) and ADR 0011 (PostgreSQL persistence stack) define the immutable-history and persistence foundations this policy must protect.
