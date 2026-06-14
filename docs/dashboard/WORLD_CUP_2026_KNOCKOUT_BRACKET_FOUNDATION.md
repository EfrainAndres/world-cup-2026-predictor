# World Cup 2026 Knockout Bracket Foundation

Phase 10.7 adds a complete placeholder knockout bracket structure for the World Cup 2026 dashboard and API.

This is not an official bracket or a simulation. It is a deterministic placeholder-only foundation derived from the Round of 32 fixture data.

## Tournament Context

The World Cup 2026 knockout bracket progresses from the Round of 32 through the Final:

- Round of 32 — 16 projected fixtures (from Phase 10.6 local standings foundation)
- Round of 16 — 8 placeholder fixtures
- Quarterfinals — 4 placeholder fixtures
- Semifinals — 2 placeholder fixtures
- Third Place Match — 1 placeholder fixture
- Final — 1 placeholder fixture

This phase creates the bracket structure only. No winners are simulated. No champion probabilities are calculated.

## API Handler

`getWorldCup2026KnockoutBracketFoundation()` exposes:

- `roundOf32` — 16 projected fixtures with actual team names derived from current local standings.
- `roundOf16` — 8 placeholder fixtures named Winner R32-01 through Winner R32-16.
- `quarterfinals` — 4 placeholder fixtures named Winner R16-1 through Winner R16-8.
- `semifinals` — 2 placeholder fixtures named Winner QF-1 through Winner QF-4.
- `thirdPlaceMatch` — 1 placeholder fixture: Loser SF-1 vs Loser SF-2.
- `final` — 1 placeholder fixture: Winner SF-1 vs Winner SF-2.
- Warning text that rounds beyond R32 use placeholder slots and winners are not simulated.

## Placeholder Naming Convention

| Round | Home placeholder | Away placeholder |
|---|---|---|
| R16 fixture 1 | Winner R32-01 | Winner R32-02 |
| R16 fixture 8 | Winner R32-15 | Winner R32-16 |
| QF fixture 1 | Winner R16-1 | Winner R16-2 |
| SF fixture 1 | Winner QF-1 | Winner QF-2 |
| Third Place | Loser SF-1 | Loser SF-2 |
| Final | Winner SF-1 | Winner SF-2 |

## Response Schema

```typescript
{
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_knockout_bracket_foundation";
  roundOf32: WorldCup2026KnockoutBracketFixture[];
  roundOf16: WorldCup2026KnockoutBracketFixture[];
  quarterfinals: WorldCup2026KnockoutBracketFixture[];
  semifinals: WorldCup2026KnockoutBracketFixture[];
  thirdPlaceMatch: WorldCup2026KnockoutBracketFixture;
  final: WorldCup2026KnockoutBracketFixture;
  warnings: string[];
  metadata: ApiMetadata;
}
```

Each `WorldCup2026KnockoutBracketFixture`:

```typescript
{
  fixtureId: string;
  round: "round_of_32" | "round_of_16" | "quarterfinals" | "semifinals" | "third_place" | "final";
  slot: number;
  homeTeam: string;
  awayTeam: string;
  source: "current_local_standings_foundation" | "placeholder_progression";
  status: "projected";
}
```

## Dashboard Section

The dashboard includes `WorldCupKnockoutBracketSection` placed after the Round of 32 section.

It displays:

- "Projected knockout bracket" heading with eyebrow "Knockout bracket".
- A prominent amber warning: "Projected bracket only".
- All six rounds in order: R32, R16, QF, SF, Third Place, Final.
- R32 fixtures show actual projected teams as "Projected".
- R16 and beyond show placeholder team names as "Placeholder".

## Warning

The API and dashboard display this warning:

> Projected bracket only. Round of 32 is derived from current local standings; rounds beyond R32 use placeholder progression slots.
> Winners are not simulated. No champion probabilities. No external API calls. No prediction formula changes.

## Boundaries

- Not an official FIFA bracket.
- No winner simulation or bracket auto-advancement.
- No champion probability calculations.
- No external API calls.
- No Elo or xG formula changes.
- Round of 32 teams derive from the same local standings used in Phase 10.6.
