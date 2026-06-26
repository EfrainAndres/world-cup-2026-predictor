import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { TechnicalDisclosure } from "./TechnicalDisclosure";

describe("TechnicalDisclosure", () => {
  test("renders as a details element", () => {
    const html = renderToStaticMarkup(
      <TechnicalDisclosure summary="Provider state">
        <p>Content</p>
      </TechnicalDisclosure>
    );
    expect(html).toContain("<details");
  });

  test("renders summary text in a summary element", () => {
    const html = renderToStaticMarkup(
      <TechnicalDisclosure summary="Provider state">
        <p>Content</p>
      </TechnicalDisclosure>
    );
    expect(html).toContain("<summary");
    expect(html).toContain("Provider state");
  });

  test("is closed by default (no open attribute)", () => {
    const html = renderToStaticMarkup(
      <TechnicalDisclosure summary="Formula version">
        <p>v1.0</p>
      </TechnicalDisclosure>
    );
    expect(html).not.toContain(" open");
  });

  test("renders children content", () => {
    const html = renderToStaticMarkup(
      <TechnicalDisclosure summary="Details">
        <p>Formula: Elo v2</p>
      </TechnicalDisclosure>
    );
    expect(html).toContain("Formula: Elo v2");
  });

  test("applies custom className", () => {
    const html = renderToStaticMarkup(
      <TechnicalDisclosure summary="Details" className="mt-4">
        <p>Content</p>
      </TechnicalDisclosure>
    );
    expect(html).toContain("mt-4");
  });

  test("summary is keyboard accessible via focus-visible outline", () => {
    const html = renderToStaticMarkup(
      <TechnicalDisclosure summary="Provenance">
        <p>Details</p>
      </TechnicalDisclosure>
    );
    expect(html).toContain("focus-visible");
  });
});
