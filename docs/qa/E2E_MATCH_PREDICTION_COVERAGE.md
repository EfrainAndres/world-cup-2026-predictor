# E2E Match Prediction Coverage

Phase 8.1 expands the Playwright E2E suite to cover the full match prediction workflow — both manual xG and Live Elo modes — including preset behavior, team alias resolution, validation, and required result output sections.

## Test Count

24 tests total (11 original from Phase 8.0 + 11 added in Phase 8.1 + 1 added in Phase 10.1 + 1 added in Phase 10.2). Test 13 updated in Phase 10.2A to also assert the fallback seed indicator.
25 tests total (11 original from Phase 8.0 + 11 added in Phase 8.1 + 1 added in Phase 10.1 + 1 added in Phase 10.2 + 1 added in Phase 10.3).

## Test List

| # | Test name | Area |
| --- | --- | --- |
| 1 | Loads dashboard home with main heading | Dashboard shell |
| 2 | Main dashboard sections are visible on load | Dashboard shell |
| 3 | Dashboard renders World Cup 2026 groups and Group C fixtures | Tournament structure |
| 4 | Match simulation form renders with required inputs and submit button | Form |
| 5 | Initial simulation results render on page load | Form / results |
| 6 | Outcome probability cards render with percentage values | Probability cards |
| 7 | Most likely scorelines heading and list are visible | Scorelines |
| 8 | Submitting manual simulation with different teams updates result heading | Manual xG |
| 9 | Manual simulation result shows three probability cards | Manual xG |
| 10 | Manual simulation result includes win draw loss labels, expected goals, scorelines, and baseline note | Result completeness |
| 11 | Switching to Auto Predict From Elo mode shows Elo info panel | Elo mode |
| 12 | Elo mode preset selector shows all three preset buttons | Elo mode |
| 13 | Auto Predict From Elo with valid teams returns Live Elo prediction result | Elo mode |
| 14 | Auto Predict From Elo supports Haiti vs Scotland from World Cup 2026 coverage | Elo mode / full coverage |
| 15 | Conservative preset result shows conservative preset metadata | Presets |
| 16 | Balanced preset result shows balanced preset metadata | Presets |
| 17 | Aggressive preset result shows aggressive preset metadata | Presets |
| 18 | Switching preset from conservative to aggressive updates preset metadata in result | Presets |
| 19 | Entering Korea Republic in Elo mode resolves to South Korea in result heading | Team aliases |
| 20 | Entering Czech Republic in Elo mode resolves to Czechia in result heading | Team aliases |
| 21 | Entering USA in Elo mode resolves to United States in result heading | Team aliases |
| 22 | Submitting unknown team in Elo mode shows validation alert | Elo validation |
| 23 | Unavailable team in Elo mode shows field error with suggestions | Elo validation |
| 24 | Invalid xG value in manual mode shows field-level validation error | Manual validation |
| 25 | Stale result is cleared and empty state is shown when validation fails after a valid prediction | Stale result clearing |

## Coverage by Area

### Manual xG prediction

Tests 8, 9, and 10 together verify that submitting a manual simulation produces an updated result heading, three probability cards (home win, draw, away win), expected goals terms, a scorelines list, and the "Baseline simulation, not a guarantee." disclaimer.

Test 24 verifies that a negative xG value triggers the field-level validation message "Expected home goals must be 0 or greater." using the client-side validation path in `buildClientValidationIssues`.

### Tournament structure

Test 3 verifies the Phase 10.3 groups and fixtures dashboard section. It asserts that "World Cup 2026 Groups & Fixtures", "Foundation tournament structure", "72 group fixtures", and "12 groups" render, then checks Group C includes Brazil, Morocco, Haiti, and Scotland.

### Auto Predict From Elo

Test 13 verifies the full round trip: entering two valid live Elo teams (France, Netherlands), submitting, and confirming the result heading, "Live Elo auto prediction" status pill, and the Live Elo data disclaimer.

### Prediction presets

Tests 15–17 verify that each preset (conservative, balanced, aggressive) surfaces the correct lowercase preset name in the result metadata block after submission. The DOM renders the preset as lowercase even though CSS capitalizes it visually.

Test 18 verifies that re-submitting with a different preset replaces the previous preset label in the result section. It confirms "aggressive preset" is visible and "conservative preset" is no longer visible after switching.

### World Cup 2026 full-team coverage

Test 13 verifies the Phase 10.2 coverage expansion: Haiti vs Scotland can be submitted through Auto Predict From Elo even though Haiti depends on fallback seed coverage rather than a calibrated Live Elo rating. Updated in Phase 10.2A to also assert that the fallback seed indicator ("Fallback seed rating — not in the Live Elo dataset. Prediction is illustrative only.") is visible in the results section when fallback teams are used.

Test 14 verifies the Phase 10.2 coverage expansion: Haiti vs Scotland can be submitted through Auto Predict From Elo even though Haiti depends on fallback seed coverage rather than a calibrated Live Elo rating.

### Team aliases

Tests 19–21 cover the three aliases required by Phase 7.3:

| Input | Canonical name | Confirmed by |
| --- | --- | --- |
| Korea Republic | South Korea | Fixture data uses "South Korea" as canonical |
| Czech Republic | Czechia | `canonicalizeTeamName` maps "Czech Republic" → "Czechia"; the pipeline stores "Czechia" in the available team list |
| USA | United States | Confirmed by API unit tests |

Each alias test submits the alias as the home team and "France" as the away team, then asserts the result heading contains the canonical team name.

### Validation

Test 22 (existing) verifies the `role="alert"` summary banner appears when an unknown team is submitted in Elo mode.

Test 23 verifies the field-level `FieldError` component shows "Suggestions:" text when a near-miss team name is submitted. The input "Franc" starts with the normalized form of "France", so `suggestAvailableTeams` surfaces "France" in the suggestions list.

Test 24 verifies that a negative xG value in manual mode shows the field error message via client-side validation before any API call is made.

## Selectors

All tests use accessible selectors:

- `getByRole("heading", { level, name })` for section headings
- `getByLabel("…")` for form inputs
- `getByRole("button", { name })` for mode switches and preset buttons
- `getByRole("button", { name, exact: true })` to distinguish the submit button ("Auto predict from Elo") from the mode-switch button ("Auto Predict From Elo")
- `getByRole("region", { name })` to scope assertions to the results section via `aria-labelledby`
- `getByRole("article")` for outcome probability cards and World Cup group cards
- `getByRole("alert").filter({ hasText })` to avoid matching the Next.js route announcer
- `getByText(/regex/)` for partial text matches on preset metadata and suggestions

No CSS class selectors are used.

### Stale result clearing

Test 25 verifies the Phase 10.1 bugfix: after a valid Auto Predict From Elo submission produces a result, submitting the same form with an unavailable team must clear the stale result. The test asserts that the old result heading ("France vs Netherlands") is no longer visible and that the "Prediction unavailable" empty state is shown.

## Known Limitations

- Chromium only. Firefox and WebKit deferred.
- Preset descriptions are not asserted verbatim — only the presence of the preset name in the metadata block is checked, since descriptions may be updated when the model is recalibrated.
- Alias resolution depends on the World Cup 2026 Auto Predict coverage list. Pipeline-rated teams keep Live Elo values, while missing teams can resolve through fallback seed coverage.
- The suggestions test uses "Franc" as a near-miss for "France". If the available teams list changes significantly, the specific suggestion surfaced may differ, though "Suggestions:" should still appear for any near-miss input.
