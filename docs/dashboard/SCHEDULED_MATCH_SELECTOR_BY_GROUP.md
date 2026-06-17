# Scheduled Match Selector by Group

## Purpose

Phase 12.1 makes scheduled World Cup match selection the default dashboard path for match prediction.

The goal is to reduce manual team entry for the primary workflow and keep prediction inputs aligned with the existing World Cup 2026 fixture foundation.

## What Changed

- `Scheduled World Cup match` is now the default match-selection mode in the interactive simulation form.
- Users select `Group A` through `Group L` first, then choose one official fixture from that group.
- Home and away teams are derived from the existing fixture foundation response and kept in official order.
- `Custom matchup` remains available as the secondary path for manual team entry and alias-based Live Elo predictions.
- Stale results are cleared when the user changes:
  - scheduled group
  - scheduled fixture
  - match-selection mode
  - prediction mode

## Data Source

The web app does not duplicate World Cup fixture data locally.

The selector uses the existing dashboard snapshot value from `getWorldCup2026FixtureFoundation()` and reads:

- groups
- grouped fixtures
- official fixture order
- matchday
- status

Dates and venues remain deferred because the current fixture foundation does not model them yet.

## UX Notes

- Native `select` controls are used for group and fixture selection.
- Scheduled mode shows selected fixture metadata:
  - group
  - matchday
  - status
  - fixture order
  - selected home team
  - selected away team
- Manual xG, Auto Predict From Elo, preset controls, max goals, simulation count, validation, and result rendering remain unchanged.

## Boundaries

This phase does not add:

- external fixture or results providers
- live results
- standings changes
- Elo recalibration
- database storage
- new dependencies

## Validation

The phase is covered by:

- web helper tests for default selection and grouped fixture ordering
- Playwright checks for scheduled mode default behavior, fixture filtering, official team order, stale-result clearing, scheduled prediction flow, and preserved custom matchup behavior
