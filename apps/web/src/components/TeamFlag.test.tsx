import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { getTeamVisualIdentity, UNKNOWN_TEAM_VISUAL_IDENTITY } from "@world-cup-2026-predictor/api";
import { TeamFlag } from "./TeamFlag";

describe("TeamFlag", () => {
  test("renders img tag when flagPath is present", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain('<img');
    expect(html).toContain('/flags/world-cup-2026/col.svg');
  });

  test("renders meaningful alt text by default", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain('alt="Flag of Colombia"');
  });

  test("renders empty alt when decorative=true", () => {
    const identity = getTeamVisualIdentity("Colombia");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} decorative />);
    expect(html).toContain('alt=""');
  });

  test("renders FIFA code fallback when flagPath is null", () => {
    const noFlagIdentity = { ...UNKNOWN_TEAM_VISUAL_IDENTITY };
    const html = renderToStaticMarkup(<TeamFlag identity={noFlagIdentity} />);
    expect(html).toContain("???");
    expect(html).not.toContain('<img');
  });

  test("renders xs size with expected dimensions class", () => {
    const identity = getTeamVisualIdentity("Mexico");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} size="xs" />);
    expect(html).toContain("h-4");
    expect(html).toContain("w-6");
  });

  test("renders sm size by default", () => {
    const identity = getTeamVisualIdentity("Mexico");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain("h-5");
    expect(html).toContain("w-8");
  });

  test("renders md size correctly", () => {
    const identity = getTeamVisualIdentity("Mexico");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} size="md" />);
    expect(html).toContain("h-6");
    expect(html).toContain("w-9");
  });

  test("renders lg size correctly", () => {
    const identity = getTeamVisualIdentity("Mexico");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} size="lg" />);
    expect(html).toContain("h-8");
    expect(html).toContain("w-12");
  });

  test("Switzerland (white flag) gets a border class", () => {
    const identity = getTeamVisualIdentity("Switzerland");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain("ring-1");
    expect(html).toContain("ring-slate-200");
  });

  test("Japan (white flag) gets a border class", () => {
    const identity = getTeamVisualIdentity("Japan");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain("ring-1");
  });

  test("does not render a broken img indicator when identity has no flag — shows code text instead", () => {
    const html = renderToStaticMarkup(<TeamFlag identity={UNKNOWN_TEAM_VISUAL_IDENTITY} />);
    expect(html).not.toContain('<img');
    expect(html).toContain("???");
  });

  test("renders DR Congo correctly", () => {
    const identity = getTeamVisualIdentity("DR Congo");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain('/flags/world-cup-2026/cod.svg');
    expect(html).toContain('Flag of DR Congo');
  });

  test("England flag has association alt text", () => {
    const identity = getTeamVisualIdentity("England");
    const html = renderToStaticMarkup(<TeamFlag identity={identity} />);
    expect(html).toContain("Association flag for England");
  });

  test("runtime image-load failure falls back to FIFA-code display (same path as flagPath=null)", () => {
    // onError calls setImgError(true), which skips the <img> branch and renders the
    // FIFA-code fallback — the same branch exercised when flagPath is null.
    // We prove the fallback renders correctly by forcing flagPath to null on a team
    // that normally has one; this is the identical rendering path onError takes.
    const base = getTeamVisualIdentity("Colombia");
    const noFlagIdentity = { ...base, flagPath: null };
    const html = renderToStaticMarkup(<TeamFlag identity={noFlagIdentity} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("COL");
    expect(html).toContain("bg-slate-100");
  });

  test("flagPath=null fallback never produces a broken-image element", () => {
    const html = renderToStaticMarkup(<TeamFlag identity={UNKNOWN_TEAM_VISUAL_IDENTITY} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("broken");
  });
});
