import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  test("renders label text", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Live" />);
    expect(html).toContain("Live");
  });

  test("defaults to neutral variant", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Neutral" />);
    expect(html).toContain("text-slate-700");
  });

  test("success variant applies green classes", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Success" variant="success" />);
    expect(html).toContain("text-green-800");
    expect(html).toContain("bg-green-50");
  });

  test("warning variant applies amber classes", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Warning" variant="warning" />);
    expect(html).toContain("text-amber-900");
    expect(html).toContain("bg-amber-50");
  });

  test("danger variant applies red classes", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Danger" variant="danger" />);
    expect(html).toContain("text-red-800");
    expect(html).toContain("bg-red-50");
  });

  test("info variant applies blue classes", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Info" variant="info" />);
    expect(html).toContain("text-blue-800");
    expect(html).toContain("bg-blue-50");
  });

  test("live variant renders a pulse indicator dot", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Live" variant="live" />);
    expect(html).toContain("bg-red-500");
    expect(html).toContain("Live");
  });

  test("live variant applies red text color", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Live" variant="live" />);
    expect(html).toContain("text-red-700");
  });

  test("renders as a span element", () => {
    const html = renderToStaticMarkup(<StatusBadge label="Test" />);
    expect(html.startsWith("<span")).toBe(true);
  });
});
