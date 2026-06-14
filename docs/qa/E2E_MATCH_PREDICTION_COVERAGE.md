# E2E Match Prediction Coverage

Phase 8.1 expands the Playwright E2E suite to cover the full match prediction workflow — both manual xG and Live Elo modes — including preset behavior, team alias resolution, validation, and required result output sections.

## Test Count

33 tests total (11 original from Phase 8.0 + 11 added in Phase 8.1 + 1 added in Phase 10.1 + 1 added in Phase 10.2 + 1 added in Phase 10.3 + 1 added in Phase 10.4 + 1 added in Phase 10.6 + 1 added in Phase 10.7 + 1 added in Phase 10.8 + 1 added in Phase 10.9 + 1 added in Phase 10.10 + 1 added in Phase 10.11 + 1 added in Phase 10.12). The Haiti vs Scotland coverage test was updated in Phase 10.2A to also assert the fallback seed indicator.

## Test List

| # | Test name | Area |
| --- | --- | --- |
| 1 | Loads dashboard home with main heading | Dashboard shell |
| 2 | Main dashboard sections are visible on load | Dashboard shell |
| 3 | Dashboard renders World Cup 2026 groups and Group C fixtures | Tournament structure |
| 4 | Dashboard renders World Cup 2026 group standings tables | Group standings |
| 5 | Dashboard renders projected World Cup 2026 Round of 32 foundation | Round of 32 foundation |
| 6 | Dashboard renders Round of 32 knockout match simulations | Knockout simulation |
| 7 | Dashboard renders projected knockout bracket with all rounds | Knockout bracket |
| 8 | Match simulation form renders with required inputs and submit button | Form |
| 9 | Initial simulation results render on page load | Form / results |
| 10 | Outcome probability cards render with percentage values | Probability cards |
| 11 | Most likely scorelines heading and list are visible | Scorelines |
| 12 | Submitting manual simulation with different teams updates result heading | Manual xG |
| 13 | Manual simulation result shows three probability cards | Manual xG |
| 14 | Manual simulation result includes win draw loss labels, expected goals, scorelines, and baseline note | Result completeness |
| 15 | Switching to Auto Predict From Elo mode shows Elo info panel | Elo mode |
| 16 | Elo mode preset selector shows all three preset buttons | Elo mode |
| 17 | Auto Predict From Elo with valid teams returns Live Elo prediction result | Elo mode |
| 18 | Auto Predict From Elo supports Haiti vs Scotland from World Cup 2026 coverage | Elo mode / full coverage |
| 19 | Conservative preset result shows conservative preset metadata | Presets |
| 20 | Balanced preset result shows balanced preset metadata | Presets |
| 21 | Aggressive preset result shows aggressive preset metadata | Presets |
| 22 | Switching preset from conservative to aggressive updates preset metadata in result | Presets |
| 23 | Entering Korea Republic in Elo mode resolves to South Korea in result heading | Team aliases |
| 24 | Entering Czech Republic in Elo mode resolves to Czechia in result heading | Team aliases |
| 25 | Entering USA in Elo mode resolves to United States in result heading | Team aliases |
| 26 | Submitting unknown team in Elo mode shows validation alert | Elo validation |
| 27 | Unavailable team in Elo mode shows field error with suggestions | Elo validation |
| 28 | Invalid xG value in manual mode shows field-level validation error | Manual validation |
| 29 | Stale result is cleared and empty state is shown when validation fails after a valid prediction | Stale result clearing |
| 30 | Dashboard renders projected Round of 16 with advancement reasons | Round of 16 simulation |
| 31 | Dashboard renders Round of 16 match simulations with win and draw probabilities | Round of 16 match simulation |
| 32 | Dashboard renders projected Quarterfinals with advancement reasons | Quarterfinal simulation |
| 33 | Dashboard renders Quarterfinal match simulations with win and draw probabilities | Quarterfinal match simulation |

## Coverage by Area

### Manual xG prediction

Tests 10, 11, and 12 together verify that submitting a manual simulation produces an updated result heading, three probability cards (home win, draw, away win), expected goals terms, a scorelines list, and the "Baseline simulation, not a guarantee." disclaimer.

Test 26 verifies that a negative xG value triggers the field-level validation message "Expected home goals must be 0 or greater." using the client-side validation path in `buildClientValidationIssues`.

### Tournament structure

Test 3 verifies the Phase 10.3 groups and fixtures dashboard section. It asserts that "World Cup 2026 Groups & Fixtures", "Foundation tournament structure", "72 group fixtures", and "12 groups" render, then checks Group C includes Brazil, Morocco, Haiti, and Scotland.

### Group standings

Test 4 verifies the Phase 10.4A group standings dashboard section. It asserts that "World Cup 2026 Group Standings", "Foundation standings", the local static provider note, the disabled external provider note, and the local-normalized-results warning render. It then checks Group A includes Mexico with points from the local static result and Group C includes Scotland with points from the local static result.

### Round of 32 foundation

Test 5 verifies the Phase 10.6 projected Round of 32 section. It asserts that "Projected Round of 32", "Round of 32 foundation", "Qualified teams", "Fixtures", at least one fixture card, and the projected/foundation warning render.

### Knockout match simulation

Test 6 verifies the Phase 10.8 knockout simulation section. It asserts that the "Round of 32 match simulations" heading, the "Match probabilities only" warning banner, the "Slot 1" card label, and the "Draw: x.x%" probability text are visible on the dashboard.

### Round of 16 simulation

Test 30 verifies the Phase 10.9 Round of 16 simulation section. It asserts that the "Projected Round of 16" heading, the "Projected from pre-match probabilities" warning banner, the "R16 Slot 1" card label, and the "advanced via highest pre-match win probability" advancement reason text are visible on the dashboard.

### Round of 16 match simulation

Test 31 verifies the Phase 10.10 Round of 16 match simulation section. It asserts that the "Round of 16 match simulations" heading, the "Match probabilities only" warning banner, the "R16 Sim Slot 1" card label, and a "Draw: x.x%" probability text are visible on the dashboard.

### Quarterfinal simulation

Test 32 verifies the Phase 10.11 Quarterfinal simulation section. It asserts that the "Projected Quarterfinals" heading, the "Projected from pre-match probabilities" warning banner, the "QF Slot 1" card label, and the "advanced via highest pre-match win probability" advancement reason text are visible on the dashboard.

### Quarterfinal match simulation

Test 33 verifies the Phase 10.12 Quarterfinal match simulation section. It asserts that the "Quarterfinal match simulations" heading, the "Match probabilities only" warning banner, the "QF Sim Slot 1" card label, and a "Draw: x.x%" probability text are visible on the dashboard.

### Knockout bracket foundation

Test 7 verifies the Phase 10.7 knockout bracket section. It asserts that the "Projected knockout bracket" heading, the "Projected bracket only" warning, all six round labels (Round of 32, Round of 16, Quarterfinals, Semifinals, Third Place, Final), and the first R16 placeholder team name ("Winner R32-01") are visible.

### Auto Predict From Elo

Test 15 verifies the full round trip: entering two valid live Elo teams (France, Netherlands), submitting, and confirming the result heading, "Live Elo auto prediction" status pill, and the Live Elo data disclaimer.

### Prediction presets

Tests 17–19 verify that each preset (conservative, balanced, aggressive) surfaces the correct lowercase preset name in the result metadata block after submission. The DOM renders the preset as lowercase even though CSS capitalizes it visually.

Test 20 verifies that re-submitting with a different preset replaces the previous preset label in the result section. It confirms "aggressive preset" is visible and "conservative preset" is no longer visible after switching.

### World Cup 2026 full-team coverage

Test 16 verifies the Phase 10.2 coverage expansion: Haiti vs Scotland can be submitted through Auto Predict From Elo even though Haiti depends on fallback seed coverage rather than a calibrated Live Elo rating. Updated in Phase 10.2A to also assert that the fallback seed indicator ("Fallback seed rating — not in the Live Elo dataset. Prediction is illustrative only.") is visible in the results section when fallback teams are used.

### Team aliases

Tests 21–23 cover the three aliases required by Phase 7.3:

| Input | Canonical name | Confirmed by |
| --- | --- | --- |
| Korea Republic | South Korea | Fixture data uses "South Korea" as canonical |
| Czech Republic | Czechia | `canonicalizeTeamName` maps "Czech Republic" → "Czechia"; the pipeline stores "Czechia" in the available team list |
| USA | United States | Confirmed by API unit tests |

Each alias test submits the alias as the home team and "France" as the away team, then asserts the result heading contains the canonical team name.

### Validation

Test 26 (existing) verifies the `role="alert"` summary banner appears when an unknown team is submitted in Elo mode.

Test 27 verifies the field-level `FieldError` component shows "Suggestions:" text when a near-miss team name is submitted. The input "Franc" starts with the normalized form of "France", so `suggestAvailableTeams` surfaces "France" in the suggestions list.

Test 28 verifies that a negative xG value in manual mode shows the field error message via client-side validation before any API call is made.

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

Test 29 verifies the Phase 10.1 bugfix: after a valid Auto Predict From Elo submission produces a result, submitting the same form with an unavailable team must clear the stale result. The test asserts that the old result heading ("France vs Netherlands") is no longer visible and that the "Prediction unavailable" empty state is shown.

## Known Limitations

- Chromium only. Firefox and WebKit deferred.
- Preset descriptions are not asserted verbatim — only the presence of the preset name in the metadata block is checked, since descriptions may be updated when the model is recalibrated.
- Alias resolution depends on the World Cup 2026 Auto Predict coverage list. Pipeline-rated teams keep Live Elo values, while missing teams can resolve through fallback seed coverage.
- The suggestions test uses "Franc" as a near-miss for "France". If the available teams list changes significantly, the specific suggestion surfaced may differ, though "Suggestions:" should still appear for any near-miss input.
