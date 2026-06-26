# Application Shell and Navigation

Phase: 12.19C  
Status: Complete

## Shell ownership

`AppShell` (`src/components/AppShell.tsx`) is the single layout owner. It is a server component imported by the root `app/layout.tsx`. Every page receives exactly one shell instance, which contains:

- A keyboard-accessible skip link (`href="#main-content"`, `sr-only` until focused)
- `AppHeader` (sticky, h-14, brand + desktop primary nav + History secondary link)
- A `<main id="main-content" tabIndex={-1}>` landmark wrapping all page content
- `MobileBottomNavigation` (fixed bottom, hidden at `lg:`)

Pages must **not** add their own `<header>`, `<main>`, or outer wrapper div with `min-h-screen`. They own their own inner content area only.

## Route map

| Route | Type | Page file |
|---|---|---|
| `/` | Dynamic (server) | `app/page.tsx` |
| `/matches` | Static placeholder | `app/matches/page.tsx` |
| `/groups` | Static placeholder | `app/groups/page.tsx` |
| `/groups/[group]` | Dynamic (server) | `app/groups/[group]/page.tsx` |
| `/predictions` | Static placeholder | `app/predictions/page.tsx` |
| `/tournament` | Static placeholder | `app/tournament/page.tsx` |
| `/model` | Static placeholder | `app/model/page.tsx` |
| `/prediction-history` | Dynamic (server) | `app/prediction-history/page.tsx` |

## Navigation single source of truth

All navigation arrays are defined in `src/lib/navigation.ts`. Both desktop and mobile components import from this file; no nav label or href is duplicated elsewhere.

```
PRIMARY_NAV_ITEMS   — Home, Matches, Groups, Predictions, Tournament, Model
SECONDARY_NAV_ITEMS — Prediction History
MOBILE_BOTTOM_ITEMS — Home, Matches, Predict, Groups (≤4 items; 5th slot = More)
MOBILE_MORE_ITEMS   — Tournament, Model, Prediction History
```

## Desktop navigation

- `PrimaryNavigation` (`src/components/PrimaryNavigation.tsx`) — client component, `hidden lg:block`
- Renders as a `<nav aria-label="Primary navigation">` containing a flex list of `Link` elements
- Compact height: links use `px-3 py-1.5` within the `h-14` header
- Active item: `bg-teal-50 text-teal-700` + `aria-current="page"`
- History secondary link: small `text-xs` link in `AppHeader`, `hidden lg:block`
- Anchor-hash links (`#overview`, `#tournament`, etc.) are removed from global nav; section IDs remain on the page for direct deep links

## Mobile navigation

- `MobileBottomNavigation` (`src/components/MobileBottomNavigation.tsx`) — client component, `lg:hidden`
- Fixed to the viewport bottom with `env(safe-area-inset-bottom)` padding for iOS
- 4 direct-link slots + 1 "More" button
- More menu: `role="menu"` panel slides above the bar; Escape closes it and returns focus to the trigger button; backdrop overlay closes it on tap
- `<main>` carries `pb-16 lg:pb-0` to prevent content from being hidden behind the bar

## Active route strategy

`isRouteActive(pathname, href)` in `src/lib/navigation.ts`:

- `/` — exact match only
- All other routes — `pathname === href || pathname.startsWith(`${href}/`)`

The trailing slash guard prevents `/prediction-history` from activating `/predictions` or `/models` from activating `/model`.

## Placeholder policy

Routes without a full implementation render an `EmptyState` or `Surface` with:
- A `PageHeader` identifying the route and its purpose
- A phase label indicating when full content arrives
- One contextual link into existing live content

Placeholder pages are static (`○`) in the build. When a phase lands, the page is replaced in place.

## Accessibility

- Skip link: keyboard-only users Tab to it first; activating it scrolls to and focuses `<main>`
- `aria-current="page"` on the active link in both desktop and mobile navs
- More button: `aria-expanded` + `aria-controls="mobile-more-menu"`
- Escape on More menu: closes panel, returns focus to More button
- All interactive elements use `focus-visible:ring-2 focus-visible:ring-teal-500` focus rings

## Responsive breakpoints

| Breakpoint | Desktop nav | Mobile nav | History link |
|---|---|---|---|
| `< lg` (< 1024 px) | hidden | visible (fixed bottom) | hidden |
| `≥ lg` (≥ 1024 px) | visible (in header) | hidden | visible (in header) |

## Migration: AppHeader anchor links retired

The previous `AppHeader` contained `<a href="#overview">`, `<a href="#tournament">`, etc. as its primary navigation. These were replaced by route-based navigation in Phase 12.19C. The section IDs (`#overview`, `#match-preview`, etc.) remain on the Home page for backwards-compatible deep links, but they are no longer listed in the global nav.

## Non-goals

- No Home page redesign
- No API, model, or persistence changes
- No third-party UI component library
- No SSR hydration error workarounds (components use `"use client"` where hooks are needed)
