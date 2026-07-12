# Playwright Test Architecture

## Goals

This architecture starts the E2E suite migration from large spec-local helper blocks toward a scalable Senior SDET-style framework. The first reference implementation is `apps/web/tests/e2e/match-simulation.spec.ts` because it covers route navigation, scheduled fixtures, custom team selection, Auto Predict, stale-result reset behavior, accessibility interactions, and mobile overflow.

The goal is not to wrap every Playwright call. The goal is to move stable interaction ownership into focused objects while keeping business assertions visible in specs.

## Directory Structure

```text
apps/web/tests/
├── components/
│   └── searchable-team-select.component.ts
├── data/
│   └── prediction-test-data.ts
├── e2e/
│   └── match-simulation.spec.ts
├── fixtures/
│   └── test.fixture.ts
├── flows/
│   └── prediction.flow.ts
└── pages/
    └── predictions.page.ts
```

Future specs should reuse these folders instead of creating parallel helper directories.

## Page Objects

Page Objects represent route-level capabilities. `PredictionsPage` owns navigation to `/predictions`, route-level controls, result-region accessors, preset buttons, scheduled fixture controls, and route-level technical helpers such as horizontal overflow checks.

Page Objects should:

- Use readonly locators for stable controls.
- Prefer `getByRole`, `getByLabel`, and other semantic locators.
- Expose small interaction methods with explicit return types.
- Keep route concepts together without becoming a God Object.

Page Objects should not:

- Contain all business assertions.
- Own team-specific test data.
- Duplicate component-specific interaction details.
- Hide complete scenarios behind vague methods like `validateEverything()`.

## Component Objects

Component Objects own reusable widgets that appear inside pages. `SearchableTeamSelect` owns the Home/Away team combobox input, listbox, exact option lookup, search, selection, keyboard selection, value access, and post-selection stabilization.

The component preserves the CI stability behavior required by the production `SearchableTeamSelect` timers. The app uses a short `justSelectedRef` guard and a blur-close timeout, so the test component exposes `TEAM_SELECT_RESELECTION_STABILIZATION_MS = 300` with an inline explanation. This keeps the wait named, bounded, and tied to the component contract instead of scattered as an unexplained magic number.

Component Objects may include technical waits or assertions only when needed to complete a safe interaction, such as waiting for the listbox to be visible before selecting an option.

## Flows

Flows model business workflows by composing Page Objects and Component Objects. `PredictionFlow` owns common setup paths such as selecting custom teams, running manual predictions, running Auto Predict, and running scheduled fixture predictions.

Flows should:

- Compose existing page/component objects.
- Keep scenarios concise in specs.
- Avoid global state.
- Avoid assertions unless they are technical preconditions for a stable interaction.

Flows should not:

- Decide business pass/fail conditions.
- Mask important behavior behind one large `doEverything()` method.
- Own raw locators that belong in pages or components.

## Fixture Dependency Injection

`apps/web/tests/fixtures/test.fixture.ts` extends Playwright's base test with:

- `predictionsPage`
- `homeTeamSelect`
- `awayTeamSelect`
- `predictionFlow`

Specs import `test` and `expect` from this fixture file. Each fixture is created per test from the current `page`, so the pattern remains parallel-safe and worker-safe. Do not add mutable module-level state to fixtures.

## Locator Policy

Preferred locator order:

- `getByRole` for interactive and landmark elements.
- `getByLabel` for form fields.
- Scoped `getByText` when the copy is user-visible and stable.
- `data-testid` only when accessible locators are insufficient.

Avoid:

- Tailwind or styling class selectors.
- Deep CSS chains.
- `nth()` when a semantic locator can express intent.
- Repeating the same raw selector across specs.

## Assertion Policy

Business assertions stay in spec files. Examples include result headings, probability cards, confidence text, stale-result clearing, accessibility behavior, and mobile overflow expectations.

Page and Component Objects may expose locators or state accessors to make assertions readable:

```ts
await predictionFlow.createManualPrediction({
  home: predictionTeams.france,
  away: predictionTeams.germany
});

await awayTeamSelect.select(predictionTeams.england);

await expect(predictionsPage.resultHeading("France vs Germany")).not.toBeVisible();
await expect(predictionsPage.predictionUnavailableMessage).toBeVisible();
```

Avoid Page Object methods such as `assertCorrectPrediction()` or `verifyWholePage()`. They hide the business intent and make failures harder to triage.

## Test Data Policy

Reusable scenario data belongs in typed modules such as `prediction-test-data.ts`. Store repeated team names, option labels, fixture ids, group ids, and common mobile viewports there.

Do not move one-off strings into data modules unless the value is reused or meaningful as a shared scenario concept. Over-centralizing makes tests harder to read.

## Anti-Patterns

Avoid:

- One Page Object per tiny subsection.
- A `BasePage` with dozens of generic methods.
- Inheritance-heavy test framework layers.
- Flows that contain business assertions.
- Spec-local copies of component logic.
- Arbitrary sleeps without a documented component or app contract.
- Global mutable test state.
- Refactoring unrelated specs in a migration phase.

Prefer composition, small objects, explicit locators, and assertions that remain close to the behavior under test.

## Example Test

```ts
test("changing a custom selected team clears stale results", async ({
  page,
  predictionsPage,
  predictionFlow,
  awayTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({
    home: predictionTeams.brazil,
    away: predictionTeams.germany
  });

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await awayTeamSelect.select(predictionTeams.england);

  await expect(awayTeamSelect.input).toHaveValue("England");
  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(predictionsPage.predictionUnavailableMessage).toBeVisible();
});
```

The setup is reusable, the combobox interaction is centralized, and the business assertions remain explicit.

## Migration Strategy

Use `match-simulation.spec.ts` as the reference implementation. Future migrations should be incremental:

1. Identify repeated route-level locators and move them into a Page Object.
2. Identify reusable widgets and move interaction details into Component Objects.
3. Extract only common business setup into Flow objects.
4. Move repeated scenario constants into typed data modules.
5. Keep assertions in specs unless they are technical interaction guards.
6. Run the migrated spec repeatedly before broad E2E validation.

Do not migrate unrelated specs only to chase symmetry. Migrate when duplication or flake risk justifies it.

## Web Page Objects vs Mobile Screen Objects

This project is a web dashboard, so the current pattern uses Page Objects and Component Objects around Playwright locators. If a future mobile/Appium suite is added, use Screen Objects for mobile surfaces. The concepts are similar, but mobile Screen Objects should own native accessibility ids, gestures, and platform-specific synchronization rather than web roles and labels.

## Senior SDET Competencies Demonstrated

This architecture demonstrates:

- Stable locator ownership based on accessibility semantics.
- Reusable component abstractions for complex widgets.
- Business-flow composition without hiding assertions.
- Custom fixtures for dependency injection.
- Typed test data with deterministic scenarios.
- CI-safe synchronization around known component timer contracts.
- Parallel-safe object creation with no global mutable state.
- Incremental migration discipline instead of a risky suite-wide rewrite.
