# Searchable Grouped Team Selectors

## Purpose

Phase 12.2 upgrades `Custom matchup` mode from raw text inputs to searchable grouped team selectors.

The goal is to keep scheduled fixtures as the default path while making custom comparisons easier, safer, and more consistent with the existing World Cup 2026 team foundation.

## Data Source

The selector does not add a second hardcoded World Cup team list in the web app.

It derives grouped team options from the existing API foundation exports:

- `WORLD_CUP_2026_GROUPS`
- existing alias helpers
- existing team-name normalization rules

Each option is built from:

- canonical team name
- group letter
- alias search terms

## Behavior

- `Custom matchup` shows searchable selectors for both home and away teams.
- All 48 World Cup 2026 teams are available.
- Options are grouped by `Group A` through `Group L`.
- Searches match canonical names and existing aliases.
- Submitted requests always use canonical team names.
- The selected home team is excluded from away-team options.
- The selected away team is excluded from home-team options when filtering.
- `Swap teams` exchanges canonical values and clears stale results.
- Changing either selected team clears stale prediction results.
- Duplicate selections are prevented by filtered options and existing validation.

## Accessibility

The selector is a lightweight custom combobox-style control with:

- labeled inputs
- `combobox` and `listbox` roles
- keyboard navigation with Up and Down arrows
- `Enter` to select
- `Escape` to close
- visible focus styling
- grouped headers for scanability
- mobile-friendly stacked layout

## Alias Search

Aliases do not appear as duplicate options.

They only improve matching. For example:

- `USA` resolves to `United States`
- `Korea Republic` resolves to `South Korea`
- `Czech Republic` resolves to `Czechia`

The visible selected value remains the canonical team name.

## Stale Result Clearing

Custom-mode prediction results are cleared when:

- the user changes the home team
- the user changes the away team
- the user swaps teams
- the user switches between scheduled and custom modes

This keeps old results from appearing alongside new inputs.

## Current Limitations

- The selector uses the World Cup 2026 team foundation only; it is not yet a general multi-tournament team picker.
- Search is local and deterministic; there is no remote provider, fuzzy ranking service, or live data dependency.
- The grouped selector improves discovery, but it does not yet add recent teams, favorites, or confidence metadata.
