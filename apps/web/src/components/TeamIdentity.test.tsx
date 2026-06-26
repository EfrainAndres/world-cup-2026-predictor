import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import { TeamIdentity } from "./TeamIdentity";

describe("TeamIdentity", () => {
  test("renders canonical name", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).toContain("Colombia");
  });

  test("renders the flag alongside the name", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).toContain('/flags/world-cup-2026/col.svg');
    expect(html).toContain("Colombia");
  });

  test("renders FIFA code when showFifaCode=true", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} showFifaCode />);
    expect(html).toContain("COL");
  });

  test("does not render FIFA code by default", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).not.toContain(">COL<");
  });

  test("renders secondary metadata when provided", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} secondaryMetadata="Group K" />);
    expect(html).toContain("Group K");
  });

  test("renders short name when useShortName=true", () => {
    const identity = getTeamVisualIdentity("Bosnia-Herzegovina");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} useShortName />);
    expect(html).toContain("Bosnia-Herz.");
  });

  test("has title attribute for long name fallback", () => {
    const identity = getTeamVisualIdentity("Bosnia-Herzegovina");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).toContain('title="Bosnia-Herzegovina"');
  });

  test("does not apply interactive role — element has no button role", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).not.toContain('role="button"');
    expect(html).toContain("inline-flex");
  });

  test("xs size renders compact flag", () => {
    const identity = getTeamVisualIdentity("Mexico");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} size="xs" />);
    expect(html).toContain("h-4");
  });

  test("lg size renders larger flag", () => {
    const identity = getTeamVisualIdentity("Mexico");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} size="lg" />);
    expect(html).toContain("h-8");
  });

  test("renders DR Congo with correct identity", () => {
    const identity = getTeamVisualIdentity("DR Congo");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).toContain("DR Congo");
    expect(html).toContain("/flags/world-cup-2026/cod.svg");
  });

  test("renders South Korea correctly", () => {
    const identity = getTeamVisualIdentity("South Korea");
    const html = renderToStaticMarkup(<TeamIdentity identity={identity} />);
    expect(html).toContain("South Korea");
    expect(html).toContain("/flags/world-cup-2026/kor.svg");
  });
});
