import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    className,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
  }) {
    return React.createElement("a", { href, className }, children);
  },
}));

import MatchesPage from "../../app/matches/page";
import GroupsPage from "../../app/groups/page";
import PredictionsPage from "../../app/predictions/page";
import TournamentPage from "../../app/tournament/page";
import ModelPage from "../../app/model/page";

describe("Matches placeholder page", () => {
  test("renders the Matches heading", () => {
    const html = renderToStaticMarkup(<MatchesPage />);
    expect(html).toContain("Matches");
  });

  test("includes a link back to home", () => {
    const html = renderToStaticMarkup(<MatchesPage />);
    expect(html).toContain('href="/"');
  });

  test("communicates upcoming phase rather than empty state", () => {
    const html = renderToStaticMarkup(<MatchesPage />);
    expect(html).toContain("12.19E");
  });
});

describe("Groups placeholder page", () => {
  test("renders the Groups heading", () => {
    const html = renderToStaticMarkup(<GroupsPage />);
    expect(html).toContain("Groups");
  });

  test("links to all 12 group detail pages", () => {
    const html = renderToStaticMarkup(<GroupsPage />);
    for (const g of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]) {
      expect(html).toContain(`href="/groups/${g}"`);
    }
  });
});

describe("Predictions placeholder page", () => {
  test("renders the Predictions heading", () => {
    const html = renderToStaticMarkup(<PredictionsPage />);
    expect(html).toContain("Predictions");
  });

  test("links to Prediction History", () => {
    const html = renderToStaticMarkup(<PredictionsPage />);
    expect(html).toContain('href="/prediction-history"');
  });
});

describe("Tournament placeholder page", () => {
  test("renders the Tournament heading", () => {
    const html = renderToStaticMarkup(<TournamentPage />);
    expect(html).toContain("Tournament");
  });

  test("links to tournament overview on Home", () => {
    const html = renderToStaticMarkup(<TournamentPage />);
    expect(html).toContain("#world-cup-tournament-overview");
  });
});

describe("Model placeholder page", () => {
  test("renders the Model heading", () => {
    const html = renderToStaticMarkup(<ModelPage />);
    expect(html).toContain("Model");
  });

  test("links to Prediction History", () => {
    const html = renderToStaticMarkup(<ModelPage />);
    expect(html).toContain('href="/prediction-history"');
  });
});
