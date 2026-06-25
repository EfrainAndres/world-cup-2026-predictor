# Team Identity and Flags Strategy

Phase 12.19A defines the team identity and flag strategy for future UX work. No team assets, components, or application code are added in this phase.

## Goals

- immediate team recognition in match rows, standings, selectors, bracket views, prediction results, and history;
- consistent identity across every screen;
- compatibility with football-data.org provider aliases and existing user-facing team aliases;
- accessible fallbacks when visual assets are missing;
- no dependence on emoji flag rendering, which varies by device, operating system, and browser.

## Canonical Identity Model

Current canonical World Cup 2026 group membership is owned by `WORLD_CUP_2026_GROUPS` in `packages/api/src/world-cup-2026-teams.ts`. Provider/user aliases are normalized through `TEAM_ALIASES`, `canonicalizeTeamName()`, and `resolveTeamAlias()` in `packages/api/src/team-aliases.ts`.

Future Phase 12.19B should extend that ownership model with a visual identity layer similar to:

```ts
type WorldCup2026TeamVisualIdentity = {
  teamId: string;
  canonicalName: string;
  shortName: string;
  fifaCode: string;
  countryCode: string | null;
  flagPath: string | null;
  flagAlt: string;
};
```

Field guidance:

| Field | Purpose |
| --- | --- |
| `teamId` | Stable project identifier derived from the canonical team name, not provider display text. |
| `canonicalName` | Existing canonical team name from `WORLD_CUP_2026_GROUPS`. |
| `shortName` | Short display label for tight rows, selectors, and mobile cards. |
| `fifaCode` | Three-letter fallback text and compact table code. |
| `countryCode` | ISO-style country code when it cleanly applies; `null` for association-specific or ambiguous cases. |
| `flagPath` | Local SVG path when reviewed and available. |
| `flagAlt` | Accessible text such as `Flag of Colombia` or `Association flag for England`. |

The exact type name can adapt to repository conventions, but the model should stay separate from prediction/model contracts. Team visual identity is presentation metadata, not a prediction input.

## Data Ownership

Recommended ownership:

```text
canonical team source
  WORLD_CUP_2026_GROUPS
      ↓
alias resolution
  TEAM_ALIASES / canonicalizeTeamName()
      ↓
visual identity lookup
  getWorldCup2026TeamVisualIdentity(canonicalName)
      ↓
React components
  TeamFlag / TeamIdentity
```

Rules:

- Keep a single canonical mapping layer in the API/shared package boundary.
- Do not duplicate flag maps in React components.
- Resolve provider names to canonical team names before looking up visual identity.
- Unknown provider names should render a safe text fallback and produce a warning where current data-quality contracts support it.
- Visual identity must not change snapshot IDs, fixture IDs, prediction hashes, or model input names.

## Flag Asset Strategy

| Option | Benefits | Risks | Recommendation |
| --- | --- | --- | --- |
| Local SVG assets | Reliable rendering, no third-party runtime dependency, cacheable, works offline, predictable sizing. | Requires licensing review and asset maintenance. | Recommended for production. |
| Remote flag CDN | Quick to add, broad coverage. | Runtime dependency, privacy/caching concerns, broken external requests, licensing uncertainty. | Avoid for core UI. |
| Emoji flags | No assets to manage. | Inconsistent rendering, missing flags on some platforms, accessibility issues, association-team ambiguity. | Do not rely on emoji flags. |
| CSS-generated flags | No image files for simple flags. | Hard to maintain accurately; not suitable for all flags; accessibility still needs text. | Not recommended. |

Recommended local asset plan:

- **Location:** `apps/web/public/flags/world-cup-2026/`
- **Naming:** lowercase `fifaCode` or stable `teamId`, for example `col.svg`, `usa.svg`, `cod.svg`, `eng.svg`.
- **Licensing:** review source licensing before adding any SVG. Record allowed use and attribution requirements in a future asset note.
- **Optimization:** run SVG optimization only after licensing is approved; preserve accessibility-neutral `viewBox` and remove embedded scripts/metadata.
- **Caching:** static public assets can use normal Next.js static asset caching.
- **White flags:** render with a subtle neutral border or containing shape so mostly white flags remain visible.
- **Aspect ratio:** use a fixed flag frame such as 4:3 or 3:2 with `object-fit: contain`; do not stretch flags.
- **Fallback:** when `flagPath` is missing, render the `fifaCode` in a compact frame with accessible text.

No flag assets are downloaded or added in Phase 12.19A.

## Component Proposal

### `TeamFlag`

Responsibilities:

- render a local SVG when `flagPath` exists;
- render a compact `fifaCode` fallback when missing;
- support sizes such as `xs`, `sm`, `md`, and `lg`;
- keep a visible border for white or low-contrast flags;
- expose meaningful alt text when the flag conveys identity;
- allow decorative rendering with empty alt text when adjacent team text already provides the accessible name.

### `TeamIdentity`

Responsibilities:

- compose `TeamFlag`, canonical/short team name, and optional FIFA code;
- support compact row layout and stacked card layout;
- work in tables, match rows, selectors, bracket nodes, prediction results, and prediction history;
- avoid layout shift by reserving a stable flag frame;
- accept canonical team name only, or explicitly resolve aliases before rendering.

Suggested sizes:

| Size | Use |
| --- | --- |
| `xs` | dense standings table rows and bracket nodes. |
| `sm` | compact match rows and selectors. |
| `md` | match cards and prediction result headers. |
| `lg` | match detail page headers. |

Loading behavior:

- local static SVGs should not require skeleton loading;
- missing files should fall back to `fifaCode`;
- broken image handling should not collapse the team row.

## Edge Cases

| Case | Strategy |
| --- | --- |
| DR Congo / Congo DR | Canonical name remains `DR Congo`; aliases already map `congo dr`, `democratic republic of the congo`, and `drc`. Future `fifaCode` should use the official football code selected by the project after review. |
| South Korea / Korea Republic | Canonical name remains `South Korea`; alias maps `korea republic`. |
| United States / USA | Canonical name remains `United States`; aliases include `usa`, `us`, `u.s.`, `u.s.a.`, and `usmnt`. |
| Curacao / Curaçao | Canonical project name is currently `Curacao`; normalized search removes diacritics so provider `Curaçao` can resolve. Display copy may later use the diacritic only if canonical naming is intentionally updated. |
| England, Scotland, Wales, Northern Ireland | These represent football associations, not always sovereign-country UI assumptions. Use association-specific visual identity and accessible alt text, not generic United Kingdom fallback. |
| Football association names vs country names | `countryCode` may be `null` when a simple country-code mapping is misleading. |
| Unknown provider team | Render text-only canonicalized provider name if safe, or `Unknown team`; surface data-quality warning through existing contracts. |
| Missing SVG | Render FIFA code fallback in the flag frame. |
| Mostly white flags | Always show a subtle border and neutral background. |
| Long localized names | Use `shortName` in compact UI and preserve `canonicalName` for accessible labels or title text. |

## Rollout Plan

Flags and team identity should be introduced in Phase 12.19B before the major Home redesign.

1. Define the visual identity contract and fixture-safe lookup helpers.
2. Add reviewed local SVG assets only after licensing is verified.
3. Add `TeamFlag` and `TeamIdentity` primitives.
4. Update dense surfaces first: match rows, standings, group nav, and selectors.
5. Update prediction results, bracket, prediction history, and model pages.
6. Run visual QA for white flags, long names, mobile rows, and table alignment.

## Non-Goals for Phase 12.19A

- no flag assets;
- no component code;
- no CSS changes;
- no provider alias changes;
- no canonical team-name migration;
- no prediction/model/persistence behavior changes.

## Related UX Documents

- [Sports UI Benchmark and Information Architecture](SPORTS_UI_BENCHMARK_AND_INFORMATION_ARCHITECTURE.md)
- [Current Home Content Inventory](CURRENT_HOME_CONTENT_INVENTORY.md)
