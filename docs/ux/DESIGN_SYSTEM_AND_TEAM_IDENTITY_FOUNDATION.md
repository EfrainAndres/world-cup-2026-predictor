# Design System and Team Identity Foundation

Phase 12.19B establishes the canonical design token system, shared UI primitives, and team
visual identity layer for the World Cup 2026 Predictor. It does not redesign any existing
page, add routes, change prediction formulas, modify persistence, or alter any model behavior.

## Token Philosophy

The design token system is intentionally **minimal and purposeful**:

- every token must be used by at least one component or layout pattern;
- no token exists purely for decoration;
- token names are semantic, not color-descriptive — `--color-brand`, not `--color-teal-700`;
- the palette has one primary brand color (teal), one live/danger accent (red), and neutral grays;
- existing Tailwind utility classes remain the primary styling mechanism;
- tokens are available via `var()` as components migrate gradually.

## Color Tokens

All tokens are defined as CSS custom properties in `apps/web/app/globals.css` under `:root`.

### Surface Colors

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#f6f8fb` | Page background |
| `--color-surface` | `#ffffff` | Primary surface (cards, panels) |
| `--color-surface-muted` | `#f1f4f8` | Subdued content areas |
| `--color-surface-elevated` | `#ffffff` | Modals, popovers (with shadow) |

### Text Colors

| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#172033` | Body text, headings |
| `--color-text-secondary` | `#374151` | Supporting text |
| `--color-text-subtle` | `#5b6577` | Captions, metadata, disabled labels |

### Border Colors

| Token | Value | Usage |
|---|---|---|
| `--color-border` | `#d9e0ea` | Default dividers and table borders |
| `--color-border-strong` | `#9aa3b2` | Emphasized outlines |

### Brand Colors

| Token | Value | Usage |
|---|---|---|
| `--color-brand` | `#0f766e` | Primary interactive elements |
| `--color-brand-hover` | `#134e4a` | Hover/active brand state |

### Semantic State Colors

| Token | Foreground | Background | Border | Usage |
|---|---|---|---|---|
| `--color-success` | `#166534` | `--color-success-bg` | `--color-success-border` | Correct predictions, active status |
| `--color-warning` | `#8a5a00` | `--color-warning-bg` | `--color-warning-border` | Stale data, fallback warnings |
| `--color-danger` | `#991b1b` | `--color-danger-bg` | `--color-danger-border` | Errors, blocked states |
| `--color-info` | `#1d4ed8` | `--color-info-bg` | `--color-info-border` | Informational messages |
| `--color-live` | `#dc2626` | `--color-live-bg` | `--color-live-border` | Live match state |

### Focus Ring

| Token | Value |
|---|---|
| `--color-focus-ring` | `#0f766e` (brand teal) |

### Legacy Aliases

Existing legacy variables (`--background`, `--foreground`, `--muted`, `--panel`,
`--panel-border`, `--accent`, `--accent-strong`, `--warning`) are preserved as aliases
pointing to the new token set. Existing components using those variables continue to
work without modification.

## Scale Tokens

### Spacing

```css
--sp-1: 0.25rem   --sp-2: 0.5rem   --sp-3: 0.75rem
--sp-4: 1rem      --sp-6: 1.5rem   --sp-8: 2rem
--sp-12: 3rem     --sp-16: 4rem
```

### Radius

```css
--r-sm: 0.25rem   --r-md: 0.375rem   --r-lg: 0.5rem   --r-xl: 0.75rem
```

### Shadows

```css
--shadow-sm   /* 1px drop */
--shadow-md   /* standard card shadow */
--shadow-lg   /* elevated element */
```

### Typography

```css
--text-xs through --text-3xl
--leading-tight / --leading-normal / --leading-relaxed
```

### Container Widths

```css
--container-max: 80rem        /* 7xl, full-page layout */
--container-content: 48rem    /* readable text column */
--container-px / --container-px-sm / --container-px-lg
```

## Primitive Component Inventory

All primitives are in `apps/web/src/components/`.

### `PageContainer`

Wraps any page's content with consistent max-width and responsive horizontal padding.

```tsx
<PageContainer>
  <PageHeader title="Matches" />
  {/* page content */}
</PageContainer>
```

Use on every new page (`/matches`, `/groups`, `/tournament`, `/model`).
Do not nest PageContainers.

### `PageHeader`

Renders an `<h1>` with an optional eyebrow, description, and actions slot.

```tsx
<PageHeader
  title="Group Stage"
  eyebrow="World Cup 2026"
  description="All group standings and fixtures."
  actions={<a href="/groups">View all groups</a>}
/>
```

Props: `title` (required), `description?`, `eyebrow?`, `actions?`.

### `SectionHeader`

Renders an `<h2>` with an eyebrow, optional description, and optional action link.

```tsx
<SectionHeader
  eyebrow="Group A"
  title="Standings"
  description="After matchday 1."
  action={<a href="/groups/A">View group →</a>}
/>
```

`description` is now optional (was previously required). All existing callers
continue to work without modification since it defaults to rendering nothing
when omitted.

### `Surface`

Restrained content container with variant support.

```tsx
<Surface variant="elevated">
  <p>Elevated content</p>
</Surface>
```

Variants: `default`, `muted`, `outlined`, `elevated`.

**When to use Surface vs plain layout:**
- Use `Surface` when content needs a bounded, visually distinct area with consistent padding.
- Use plain divs/sections for layout grids, list containers, and structural spacing.
- Do not put Surface inside Surface unless the inner surface is semantically separate content.

### `StatusBadge`

Compact semantic badge for state communication. Not for ordinary metadata.

```tsx
<StatusBadge label="Live" variant="live" />
<StatusBadge label="Correct" variant="success" />
<StatusBadge label="Stale data" variant="warning" />
```

Variants: `neutral`, `info`, `success`, `warning`, `danger`, `live`.

**When NOT to use badges:**
- Do not badge every metric — only states that require user attention.
- Do not use badges for numbers alone (e.g., prediction count). Use plain text.
- `live` variant includes an animated dot indicator.

### `EmptyState`

Compact empty content placeholder.

```tsx
<EmptyState
  title="No matches scheduled today"
  description="Check back when fixtures are announced."
  action={<a href="/matches">Browse all matches</a>}
/>
```

Props: `title` (required), `description?`, `action?`.

### `TechnicalDisclosure`

Semantic `<details>`/`<summary>` wrapper for provenance, diagnostics, and
implementation metadata. Collapsed by default. Keyboard accessible.

```tsx
<TechnicalDisclosure summary="Provider state">
  <p>Source: football-data.org · Cache: fresh · Sync: 2026-06-25T12:00:00Z</p>
</TechnicalDisclosure>
```

Use for:
- provider freshness and cache state metadata;
- formula versions and model configuration;
- snapshot and evaluation provenance;
- persistence diagnostics.

Do not use for primary content.

## Canonical Team Visual Identity

### Ownership Model

```
WORLD_CUP_2026_GROUPS (canonical team names)
    ↓
TEAM_ALIASES / canonicalizeTeamName() (alias normalization)
    ↓
getTeamVisualIdentity() / resolveTeamVisualIdentity() (visual identity lookup)
    ↓
TeamFlag / TeamIdentity (React components)
```

The single source of truth is `packages/api/src/world-cup-2026-team-identity.ts`.
Do not duplicate team metadata in React components or local config files.

### `WorldCup2026TeamVisualIdentity` Type

```ts
interface WorldCup2026TeamVisualIdentity {
  teamId: string;         // stable slug: "dr-congo", "south-korea", "united-states"
  canonicalName: string;  // exact name from WORLD_CUP_2026_GROUPS
  shortName: string;      // compact label for tight UI rows
  fifaCode: string;       // 3-letter code: "COL", "ENG", "COD"
  countryCode: string | null; // ISO alpha-2; null for football associations
  flagPath: string | null;    // local asset path or null
  flagAlt: string;            // accessible alt text
}
```

`countryCode` is `null` for England and Scotland — they represent football associations,
not sovereign states. Do not use a UK fallback for them.

### Helper Functions

| Function | Usage |
|---|---|
| `getTeamVisualIdentity(nameOrId)` | Look up by canonical name or teamId |
| `resolveTeamVisualIdentity(providerName)` | Look up by provider name (handles aliases) |
| `getTeamFlagPath(nameOrId)` | Quick path lookup, returns null for unknowns |
| `isKnownTeam(nameOrId)` | Returns false for unrecognized teams |
| `assertAllCanonicalTeamsCovered()` | Guard: throws if any canonical team is unmapped |

### Alias Resolution Flow

1. Call `resolveTeamVisualIdentity("Korea Republic")`.
2. Internally calls `canonicalizeTeamName("Korea Republic")` → `"South Korea"`.
3. Looks up `"South Korea"` in the identity map.
4. Returns the `WorldCup2026TeamVisualIdentity` for South Korea.

Provider names should always be normalized before React renders them.
React components must not contain alias resolution logic.

### Fallback for Unknown Teams

`getTeamVisualIdentity` never throws. Unknown teams return `UNKNOWN_TEAM_VISUAL_IDENTITY`:

```ts
{
  teamId: "unknown",
  canonicalName: "Unknown Team",
  shortName: "Unknown",
  fifaCode: "???",
  countryCode: null,
  flagPath: null,
  flagAlt: "Unknown team"
}
```

When an unknown identity is used in `GroupDetailStandingsTable`, the component
overrides `canonicalName` and `shortName` with the raw entry team name so
the actual string is still displayed rather than "Unknown Team".

## Flag Assets

### Location and Naming

Assets are stored at `apps/web/public/flags/world-cup-2026/` and named by lowercase
FIFA code: `col.svg`, `eng.svg`, `cod.svg`.

The naming convention matches `flagPath` in the identity records:
```
/flags/world-cup-2026/{fifaCode.toLowerCase()}.svg
```

### Current Status

All 48 SVG files are **final flag assets** sourced from
[flag-icons](https://github.com/lipis/flag-icons) (MIT licensed), using the
`flags/4x3/` rectangular collection. Each file is an accurate national or
football-association flag.

See `apps/web/public/flags/world-cup-2026/ASSET_NOTES.md` for the complete
source record, FIFA → ISO code mapping, and license details.

### Special Cases

| Team | File | Note |
|---|---|---|
| England | `eng.svg` | St George's Cross (not UK flag) |
| Scotland | `sco.svg` | Saltire (not UK flag) |
| DR Congo | `cod.svg` | FIFA code COD; ISO is CD |
| Saudi Arabia | `ksa.svg` | FIFA code KSA; ISO is SA |
| Curacao | `cuw.svg` | FIFA code CUW; ISO is CW |
| Switzerland | `sui.svg` | FIFA code SUI; ISO is CH |
| South Korea | `kor.svg` | FIFA code KOR; ISO is KR |

### White-Flag Handling

Switzerland (`SUI`) and Japan (`JPN`) have predominantly white flags.
`TeamFlag` applies a `ring-1 ring-slate-200 ring-inset` border to these
automatically via `WHITE_FLAG_CODES`. Update that `Set` if additional
nearly-white flags are identified.

## TeamFlag Component

Props:
- `identity: WorldCup2026TeamVisualIdentity` — required
- `size?: 'xs' | 'sm' | 'md' | 'lg'` — defaults to `'sm'`
- `decorative?: boolean` — if true, renders empty alt (`""`) for screen readers

When `flagPath` is `null`, renders a compact FIFA code fallback in a neutral frame.
No broken-image browser icon is shown — the `<img>` is only rendered when
`flagPath` is non-null.

If the image fails to load at runtime, an `onError` handler sets component state
and the component transitions to the same FIFA-code fallback view. The `<img>`
element is removed from the DOM on error so the browser's broken-image indicator
is never displayed. `TeamFlag` is a client component (`"use client"`) for this reason.

### Size Reference

| Size | Dimensions | Usage |
|---|---|---|
| `xs` | 24×16px | Standings tables, bracket nodes |
| `sm` | 32×20px | Match rows, dropdown options (default) |
| `md` | 36×24px | Match cards, prediction results |
| `lg` | 48×32px | Page headers, match detail pages |

Flags are rectangular (4:3 ratio), not circular. Use `object-contain` so flags
are never stretched regardless of their intrinsic proportions.

## TeamIdentity Component

Combines `TeamFlag` and a canonical team name with optional metadata.

Props:
- `identity: WorldCup2026TeamVisualIdentity` — required
- `size?: 'xs' | 'sm' | 'md' | 'lg'` — defaults to `'sm'`
- `showFifaCode?: boolean` — renders the FIFA code below the team name
- `secondaryMetadata?: string` — optional second line (group, position, etc.)
- `align?: 'start' | 'center'` — defaults to `'start'`
- `useShortName?: boolean` — uses `shortName` instead of `canonicalName`
- `className?: string` — additional class overrides

The component uses a `<span>` element (not `<div>` or `<button>`). No interactive
role is applied unless the consuming component wraps it in an interactive element.

Long names receive a `title` attribute set to `canonicalName` for tooltip access.
`useShortName` enables `shortName` display for compact contexts.

## Accessibility Rules

- Every non-decorative `TeamFlag` renders meaningful `alt` text from `identity.flagAlt`.
- England and Scotland use "Association flag for …" to avoid incorrect country-name
  assumptions.
- `TeamFlag` with `decorative={true}` renders `alt=""` — appropriate when the adjacent
  `TeamIdentity` text already conveys the team name.
- `TechnicalDisclosure` summary is keyboard accessible (focus ring, no `tabindex=-1`).
- `StatusBadge` "live" variant includes `aria-hidden="true"` on the dot indicator.
- No component relies on color alone to convey information.

## Focused Integration

`GroupDetailStandingsTable` now uses `TeamIdentity` for the team cell at `xs` size,
providing a flag and name for all WC 2026 canonical teams. Non-canonical teams
(test fixtures, unknown providers) fall back gracefully to the entry's raw team name.

## Migration Guidance for Phase 12.19C and Beyond

- Phase 12.19C: Use `PageContainer`, `PageHeader`, `SectionHeader` in the new shell.
  Replace anchor-based nav items with route-based links.
- Phase 12.19D: Home redesign uses `Surface`, `EmptyState`, `StatusBadge`, `TeamIdentity`
  for match rows, group snapshots, and model track record section.
- Phase 12.19E+: `TeamFlag` and `TeamIdentity` replace plain text team names in
  `DailyMatchCard`, `MatchSimulationResults`, `PredictionHistoryDashboard`, and bracket.

## Non-Goals

- No redesign of the Home page, AppHeader navigation architecture, or existing routes.
- No new application routes (`/matches`, `/tournament`, `/model`).
- No mobile bottom navigation.
- No polling, live updates, or runtime data contract changes.
- No prediction formula, Elo/xG, snapshot, evaluation, or persistence changes.
- No federation crests or copyright-restricted imagery.
- No remote image services or CDN flag dependencies.
- No full third-party component framework added.
- No broad Tailwind migration — existing components use Tailwind classes unchanged.
- No provider alias changes — `TEAM_ALIASES` and `canonicalizeTeamName()` unchanged.
