import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { SearchableTeamSelect } from "./SearchableTeamSelect";
import type { GroupedTeamOption } from "../lib/grouped-team-options";

// SearchableTeamSelect's interactive behavior (open/close on focus/click,
// selection via mouse/keyboard, the blur-close timer, and the mobile
// reopen-guard) is covered end-to-end in
// apps/web/tests/e2e/match-simulation.spec.ts, consistent with this
// project's convention of using Playwright for real DOM event sequences.
// These tests cover static markup correctness only — the parts that don't
// require a live DOM/event environment.

const OPTIONS: GroupedTeamOption[] = [
  { canonicalName: "Brazil", group: "C", aliases: [] },
  { canonicalName: "Germany", group: "E", aliases: [] },
  { canonicalName: "United States", group: "D", aliases: ["USA", "US"] }
];

function render(props: Partial<React.ComponentProps<typeof SearchableTeamSelect>> = {}): string {
  return renderToStaticMarkup(
    <SearchableTeamSelect
      label={props.label ?? "Home team"}
      value={props.value ?? ""}
      options={props.options ?? OPTIONS}
      excludedTeam={props.excludedTeam}
      onChange={props.onChange ?? (() => {})}
    />
  );
}

describe("SearchableTeamSelect static markup", () => {
  test("renders a combobox with the provided label", () => {
    const html = render({ label: "Away team" });
    expect(html).toContain("Away team");
    expect(html).toContain('role="combobox"');
  });

  test("closed by default: aria-expanded is false and no listbox is rendered", () => {
    const html = render();
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="listbox"');
  });

  test("displays the selected value when a value is provided", () => {
    const html = render({ value: "Brazil" });
    expect(html).toContain('value="Brazil"');
  });

  test("displays an empty value when no team is selected", () => {
    const html = render({ value: "" });
    expect(html).toContain('value=""');
  });

  test("does not set aria-activedescendant while closed", () => {
    const html = render();
    expect(html).not.toContain("aria-activedescendant=\"");
  });

  test("uses autoComplete=off so the browser's native autofill UI does not compete with the listbox", () => {
    const html = render();
    expect(html).toContain('autoComplete="off"');
  });
});
