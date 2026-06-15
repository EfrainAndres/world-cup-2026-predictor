const navigationItems = [
  { label: "Home", href: "#overview" },
  { label: "Tournament", href: "#world-cup-tournament-overview" },
  { label: "Champion", href: "#world-cup-champion-projection-summary" },
  { label: "Final", href: "#world-cup-final-match-simulation" },
  { label: "Semifinals", href: "#world-cup-semifinal-match-simulation" },
  { label: "Quarterfinals", href: "#world-cup-quarterfinal-match-simulation" },
  { label: "Round of 16", href: "#world-cup-round-of-16-match-simulation" },
  { label: "Round of 32", href: "#world-cup-knockout-simulation" },
  { label: "Third Place", href: "#world-cup-third-place-match-simulation" },
  { label: "Match Preview", href: "#match-preview" },
  { label: "Replay Audit", href: "#replay-audit" },
  { label: "Historical", href: "#historical" }
];

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-sm font-semibold text-teal-700">World Cup 2026 Predictor</p>
          <p className="mt-1 text-sm text-slate-600">Transparent football analytics dashboard foundation</p>
        </div>
        <nav aria-label="Dashboard navigation">
          <ul className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <a className="block rounded-md border border-slate-200 px-3 py-2 hover:border-teal-700 hover:text-teal-800" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
