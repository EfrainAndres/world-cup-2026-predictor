# E2E Match Prediction Coverage

Phase 8.1 expands the Playwright E2E suite to cover the full match prediction workflow — both manual xG and Live Elo modes — including preset behavior, team alias resolution, validation, and required result output sections.

## Test Count

22 tests total (11 original from Phase 8.0 + 11 added in Phase 8.1).

## Test List

| # | Test name | Area |
| --- | --- | --- |
| 1 | Loads dashboard home with main heading | Dashboard shell |
| 2 | Main dashboard sections are visible on load | Dashboard shell |
| 3 | Match simulation form renders with required inputs and submit button | Form |
| 4 | Initial simulation results render on page load | Form / results |
| 5 | Outcome probability cards render with percentage values | Probability cards |
| 6 | Most likely scorelines heading and list are visible | Scorelines |
| 7 | Submitting manual simulation with different teams updates result heading | Manual xG |
| 8 | Manual simulation result shows three probability cards | Manual xG |
| 9 | Manual simulation result includes win draw loss labels, expected goals, scorelines, and baseline note | Result completeness |
| 10 | Switching to Auto Predict From Elo mode shows Elo info panel | Elo mode |
| 11 | Elo mode preset selector shows all three preset buttons | Elo mode |
| 12 | Auto Predict From Elo with valid teams returns Live Elo prediction result | Elo mode |
| 13 | Conservative preset result shows conservative preset metadata | Presets |
| 14 | Balanced preset result shows balanced preset metadata | Presets |
| 15 | Aggressive preset result shows aggressive preset metadata | Presets |
| 16 | Switching preset from conservative to aggressive updates preset metadata in result | Presets |
| 17 | Entering Korea Republic in Elo mode resolves to South Korea in result heading | Team aliases |
| 18 | Entering Czech Republic in Elo mode resolves to Czechia in result heading | Team aliases |
| 19 | Entering USA in Elo mode resolves to United States in result heading | Team aliases |
| 20 | Submitting unknown team in Elo mode shows validation alert | Elo validation |
| 21 | Unavailable team in Elo mode shows field error with suggestions | Elo validation |
| 22 | Invalid xG value in manual mode shows field-level validation error | Manual validation |

## Coverage by Area

### Manual xG prediction

Tests 7, 8, and 9 together verify that submitting a manual simulation produces an updated result heading, three probability cards (home win, draw, away win), expected goals terms, a scorelines list, and the "Baseline simulation, not a guarantee." disclaimer.

Test 22 verifies that a negative xG value triggers the field-level validation message "Expected home goals must be 0 or greater." using the client-side validation path in `buildClientValidationIssues`.

### Auto Predict From Elo

Test 12 verifies the full round trip: entering two valid live Elo teams (France, Netherlands), submitting, and confirming the result heading, "Live Elo auto prediction" status pill, and the Live Elo data disclaimer.

### Prediction presets

Tests 13–15 verify that each preset (conservative, balanced, aggressive) surfaces the correct lowercase preset name in the result metadata block after submission. The DOM renders the preset as lowercase even though CSS capitalizes it visually.

Test 16 verifies that re-submitting with a different preset replaces the previous preset label in the result section. It confirms "aggressive preset" is visible and "conservative preset" is no longer visible after switching.

### Team aliases

Tests 17–19 cover the three aliases required by Phase 7.3:

| Input | Canonical name | Confirmed by |
| --- | --- | --- |
| Korea Republic | South Korea | Fixture data uses "South Korea" as canonical |
| Czech Republic | Czechia | `canonicalizeTeamName` maps "Czech Republic" → "Czechia"; the pipeline stores "Czechia" in the available team list |
| USA | United States | Confirmed by API unit tests |

Each alias test submits the alias as the home team and "France" as the away team, then asserts the result heading contains the canonical team name.

### Validation

Test 20 (existing) verifies the `role="alert"` summary banner appears when an unknown team is submitted in Elo mode.

Test 21 verifies the field-level `FieldError` component shows "Suggestions:" text when a near-miss team name is submitted. The input "Franc" starts with the normalized form of "France", so `suggestAvailableTeams` surfaces "France" in the suggestions list.

Test 22 verifies that a negative xG value in manual mode shows the field error message via client-side validation before any API call is made.

## Selectors

All tests use accessible selectors:

- `getByRole("heading", { level, name })` for section headings
- `getByLabel("…")` for form inputs
- `getByRole("button", { name })` for mode switches and preset buttons
- `getByRole("button", { name, exact: true })` to distinguish the submit button ("Auto predict from Elo") from the mode-switch button ("Auto Predict From Elo")
- `getByRole("region", { name })` to scope assertions to the results section via `aria-labelledby`
- `getByRole("article")` for outcome probability cards
- `getByRole("alert").filter({ hasText })` to avoid matching the Next.js route announcer
- `getByText(/regex/)` for partial text matches on preset metadata and suggestions

No CSS class selectors are used.

## Known Limitations

- Chromium only. Firefox and WebKit deferred.
- Preset descriptions are not asserted verbatim — only the presence of the preset name in the metadata block is checked, since descriptions may be updated when the model is recalibrated.
- Alias resolution depends on the live Elo pipeline having the aliased team in its available team list. If a team is removed from the fixture data, the alias test would fail with a validation error instead of a result heading.
- The suggestions test uses "Franc" as a near-miss for "France". If the available teams list changes significantly, the specific suggestion surfaced may differ, though "Suggestions:" should still appear for any near-miss input.
