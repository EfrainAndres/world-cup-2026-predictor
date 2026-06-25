# Sports UI Benchmark and Information Architecture

Phase 12.19A is a documentation-only UX architecture phase. It defines a sports-oriented information architecture for the World Cup 2026 Predictor without changing routes, components, styles, model logic, data sources, persistence, or production behavior.

## Executive Summary

The current Home page contains too many primary sections. It combines runtime diagnostics, model evidence, Auto Predict, daily matches, Elo/rating tables, every tournament projection round, groups, standings, bracket, tournament simulation, and historical validation on one long page. Each section is individually useful, but the page gives too many of them similar visual weight.

The result feels overloaded because:

- the first screen explains the system before it answers the user's immediate football question;
- many sections are rendered as separate cards or card grids with similar importance;
- technical provenance and warnings repeat across the page;
- tournament projections are split into many round-specific sections instead of a concise tournament story;
- navigation is mostly anchor-based and mirrors implementation sections instead of user tasks;
- team identity is text-only, so match scanning is slower than in sports products with consistent flags or crests.

The target experience is a deliberate sports product: match-first, compact, status-aware, and easy to scan on mobile. Technical model provenance remains available, but it moves behind progressive disclosure and model/evidence pages instead of competing with matches, groups, predictions, and tournament progression on Home.

## Benchmark Framework

The benchmark uses public product patterns associated with established football products. It does not reproduce screenshots, logos, branding, exact layouts, proprietary copy, or visual identity.

| Product | Pattern Observed | Adopt Conceptually | Do Not Copy |
| --- | --- | --- | --- |
| SofaScore | Dense live-score lists, event-first match detail hierarchy, visible date navigation, structured tournament/team navigation, compact status indicators, strong team identity. | Make matches the default entry point; use compact rows for scores and kickoff states; put deep statistics behind match detail pages. | Do not copy visual styling, iconography, score widgets, color system, app navigation, or proprietary statistics presentation. |
| FotMob | Match-first daily feed, match detail tabs, lineups/statistics hierarchy, team/competition pages, mobile-first navigation, concise news and match context. | Use route-level detail pages with tabs/sections for summary, prediction, context, and evidence; keep Home as a summary. | Do not copy tab ordering, mobile chrome, news layout, text, or branded match-center presentation. |
| Flashscore | Very dense fixtures/results feed, clear date controls, competition grouping, fast score scanning, restrained rows, status-first live handling. | Use high-density match lists and predictable date navigation; avoid excessive card grids for every fixture. | Do not copy exact list layout, live-score styling, commercial structure, or proprietary status labels. |
| OneFootball | Content plus scores model, prominent club/country identity, news and fixtures separated by interest, simple mobile navigation. | Keep editorial or explanatory content secondary to matches and predictions; use team identity consistently across cards, tables, selectors, and history. | Do not copy branding, article layout, content prioritization, or visual treatments. |

### Pattern Comparison

| Area | SofaScore | FotMob | Flashscore | OneFootball | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Primary navigation | Sports, leagues, teams, matches, profile-style destinations. | Matches, competitions, favorites, news, settings. | Scores by sport/date/competition. | Scores/news/team-following split. | Use task-based navigation: Matches, Groups, Predictions, Tournament, Model. |
| Match list density | Compact rows with state and score. | Compact cards/rows with useful context. | Highest density; scores are the product center. | Moderate density, often content-led. | Home should show a short match list; `/matches` can be denser. |
| Match detail hierarchy | Summary first, then details/statistics. | Match center tabs. | Summary and stats separated. | Summary with related content. | `/matches/[fixtureId]` should separate summary, prediction, context, and technical detail. |
| Date navigation | Prominent day controls. | Prominent date strip. | Core interaction. | Present but less central. | Keep previous/today/next and add a full `/matches` day view later. |
| Standings presentation | Tables tied to competition pages. | Tables in competition/team context. | Tables under competition. | Tables near competition pages. | Move complete standings to `/groups` and `/groups/[group]`; Home gets a group snapshot only. |
| Tournament navigation | Competition/team hierarchy. | Competition center. | Competition list with stages. | Competition and content hubs. | Add `/tournament` for bracket, qualification, and projections. |
| Progressive disclosure | Deep stats are not all on score feed. | Detail tabs hide complexity. | Feed stays compact. | Content and scores separated. | Keep provider diagnostics, formula versions, and evidence in `/model`. |
| Mobile navigation | Bottom or compact app navigation patterns. | Bottom/nav tabs. | Dense top/date controls. | Bottom/content nav. | Use hybrid navigation: top nav on desktop, bottom primary nav on mobile. |
| Visual density | High but structured. | Medium-high. | High. | Medium. | Use sports-feed density without clutter: fewer containers, stronger list/table patterns. |
| Team identity | Crests/flags are central. | Crests/flags are central. | Crests/flags are central. | Team identity is prominent. | Add a canonical team identity and local flag asset strategy before redesign. |

## Product Principles

- **Match-first:** the first useful content should answer what is happening today or next.
- **One primary action per screen:** Home should guide to Matches, Auto Predict, Groups, Tournament, or Model evidence, not perform every task.
- **Summary before detail:** show the result or headline first, then let users drill into supporting model data.
- **Technical details on demand:** diagnostics, provider metadata, formula versions, cache state, and persistence state should be available but not repeated everywhere.
- **Fewer but stronger visual containers:** use lists, tables, and bands instead of card-inside-card layouts.
- **Consistent team identity:** every team display should share canonical name, short name, FIFA code, and flag behavior.
- **Data density without clutter:** dense match and standings views are acceptable when hierarchy is clear.
- **Mobile-first prioritization:** mobile should prioritize match rows, group navigation, and one clear action per section.
- **Transparent model provenance:** predictions must remain honest about confidence, fallbacks, and evidence, but the explanation should not overwhelm match scanning.

## Proposed Sitemap

No route changes occur in Phase 12.19A. This sitemap defines the target migration shape.

```text
/
  concise dashboard/home

/matches
  today
  previous/next day
  upcoming
  recent results
  filters

/matches/[fixtureId]
  summary
  prediction
  probabilities
  context
  model vs reality when completed
  technical details through progressive disclosure

/groups
  all groups overview

/groups/[group]
  standings
  fixtures
  qualification
  projections

/predictions
  prediction tool
  featured predictions
  upcoming stored predictions

/prediction-history
  existing historical evidence area

/tournament
  qualification summary
  knockout bracket
  round projections
  champion outlook

/model
  model status
  accuracy
  evidence gate
  Elo/xG information
  coverage and fallback information
  technical provenance
```

Route compatibility notes:

- Preserve `/`, `/groups/[group]`, and `/prediction-history`.
- Add new routes incrementally instead of moving everything at once.
- Existing anchors can continue to work during migration, but should not be the long-term primary navigation model.
- Redirects should only be introduced if a route is replaced later.
- No route changes are part of Phase 12.19A.

## Proposed Home Architecture

Target Home section count: 8 sections, down from 25 current visual regions when divider labels are counted.

| Order | Section | Purpose | User Question Answered | Existing Data Source | Primary Action | Desktop Presentation | Mobile Presentation | Max Content | Excluded Content |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Compact application header | Give identity and primary navigation. | Where am I and where can I go? | Current `AppHeader`, future nav routes. | Navigate. | Thin header with top nav. | Compact top row plus bottom nav later. | Brand, 5 primary nav items. | Anchor list for every implementation section. |
| 2 | Short tournament/status introduction | Set context without explaining every system boundary. | What is this product doing now? | Runtime diagnostics, model info. | View model status. | One short intro with one status line. | One concise text block. | 2-3 sentences, one source badge. | Long model explanation, database/external-service grid. |
| 3 | Today's matches | Make live/upcoming football the first real content. | What matches matter today? | `getWorldCup2026DailyMatches()`. | View all matches. | Dense list/rows with 3-6 matches. | Stacked compact match cards. | Current day plus unscheduled warning count. | Full provider diagnostics, all unscheduled fixtures. |
| 4 | Featured prediction | Surface one useful prediction workflow. | What does the model think about a key match? | Auto Predict and saved snapshot summary. | Open prediction tool or match detail. | One focused panel with projected score/probabilities. | One card below matches. | One fixture or CTA. | Full simulator form and every technical metric. |
| 5 | Group snapshot | Summarize group context. | Who is leading and what groups need attention? | Live group standings and group detail foundations. | View groups. | 2-4 compact group tables or standings highlights. | Horizontal group selector plus compact table. | Top rows or active groups only. | All 12 full standings tables. |
| 6 | Tournament outlook | Show high-level tournament progression. | Who is projected to advance or win? | Tournament projection, bracket, champion summary. | View tournament. | One bracket/summary band. | Collapsed bracket summary. | Champion, finalists, next key round. | Separate sections for every round. |
| 7 | Model track record | Build trust without dominating the page. | How has the model performed so far? | Prediction history, Model-vs-Reality, evidence gate. | View model evidence. | Small metric strip. | 2-3 stat rows. | Evaluated count, outcome accuracy, Brier/log loss. | Full historical replay audit, all evidence diagnostics. |
| 8 | Focused calls to action | Direct users to deeper workflows. | What should I do next? | Route map. | Open Matches, Groups, Predictions, Model. | Four compact links. | Button list. | 4 links. | Repeated explanatory copy. |

## Progressive Disclosure Strategy

| Level | Content | Examples |
| --- | --- | --- |
| Always visible | Core sports facts and primary model output. | Teams, flags, kickoff, match state, score, projected score, top 1X2 probabilities, group rank. |
| Visible on interaction | Useful context that can crowd the feed. | Confidence explanation, fallback note, match context, source freshness, full probability row, snapshot captured time. |
| Visible only on detail pages | Deep football and prediction context. | Full scoreline distribution, standings context, qualification details, Model-vs-Reality evaluation, provider warnings for that fixture. |
| Technical/model-only | Diagnostics and model implementation details. | Provider diagnostics, persistence state, formula versions, schema versions, cache internals, historical replay audit, evidence gate thresholds. |

## Visual Direction

The future UI should feel like a restrained sports analytics product:

- neutral surfaces with clear dividers and tables;
- one primary brand color, currently compatible with teal;
- semantic colors only for state: live, final, warning, error, stale;
- stronger typography hierarchy and fewer all-caps labels;
- consistent spacing scale;
- compact rows for matches and standings;
- fewer rounded containers;
- no glassmorphism;
- no decorative gradients unless a future brand system strongly justifies them;
- concise product copy that names the state rather than explaining the whole architecture.

Current anti-patterns to reduce:

- card-inside-card layouts;
- every metric as a badge;
- repeated warnings and technical provenance;
- excessive anchor navigation;
- large repeated headings;
- many visually equal sections;
- long dashboard scroll;
- repeated model caveats in every section;
- sections organized by implementation phase rather than user task.

## Desktop Wireframe

```text
Header: brand | Matches | Groups | Predictions | Tournament | Model | History

Home intro band:
  World Cup 2026 Predictor
  Status: Live provider active / cached / fallback
  CTA: View matches

Main grid:
  Left column (2fr):
    Today's Matches
      date controls
      compact match rows
      View all matches

    Featured Prediction
      match identity
      projected score
      xG and 1X2 summary
      CTA: Open prediction

    Group Snapshot
      compact tabs or selected groups
      top standings rows
      CTA: View all groups

  Right column (1fr):
    Tournament Outlook
      champion/finalists/qualification summary
      CTA: View tournament

    Model Track Record
      evaluated count
      outcome accuracy
      Brier/log loss
      CTA: View model evidence

    Quick Links
      Prediction History
      Groups
      Model
```

## Mobile Wireframe

```text
Top:
  compact brand row
  status line

Primary content:
  Today's Matches
    previous | today | next
    compact match cards
    source/fallback label

  Featured Prediction
    one match card
    collapsed probability details

  Group Snapshot
    horizontal A-L group navigation
    selected group table with 4 rows

  Tournament Outlook
    one collapsed bracket/projection summary

  Model Track Record
    small stat list

Bottom navigation:
  Matches | Groups | Predict | Tournament | Model
```

Mobile table handling:

- standings tables should keep essential columns visible first: position, team, played, goal difference, points;
- less important columns can collapse behind details or use abbreviated labels;
- match cards should not require horizontal scrolling;
- technical disclosures should default closed.

## Navigation Recommendation

| Option | Strengths | Weaknesses | Fit |
| --- | --- | --- | --- |
| Top navigation only | Simple, familiar, good for desktop. | Crowds quickly on mobile and currently becomes a long anchor list. | Use for desktop primary routes only. |
| Sidebar | Supports many destinations. | Too heavy for a sports dashboard and poor for mobile. | Not recommended for this phase. |
| Mobile bottom navigation | Fast access to core sports tasks. | Requires careful route selection and should not include too many items. | Recommended for mobile after routes exist. |
| Hybrid navigation | Desktop top nav plus mobile bottom nav. | Slightly more implementation work. | Recommended target. |

Recommendation: use hybrid navigation. Desktop gets a compact top navigation for `Matches`, `Groups`, `Predictions`, `Tournament`, `Model`, and `History`. Mobile gets a five-item bottom navigation: `Matches`, `Groups`, `Predict`, `Tournament`, `Model`. `Prediction History` can remain available from the Model or History area until a bottom item is justified by usage.

## Component Reuse Plan

| Current Component or Area | Classification | Rationale |
| --- | --- | --- |
| `AppHeader` | Restyle / split | Keep brand responsibility, replace long anchor list with route navigation. |
| `SectionHeader` | Keep / restyle | Useful primitive, but copy should be shorter and less repetitive. |
| `TodaysMatchesSection` | Keep / move toward `/matches` | Strong Home candidate; should become denser and less card-heavy. |
| `DailyMatchCard` | Restyle / split | Keep data contract; split compact row from detail card. |
| `MatchSimulationForm` | Move to `/predictions` | Too large for Home; Home should show featured prediction or CTA. |
| `MatchSimulationResults` | Keep / reuse on match detail | Useful result display, but details should be progressive. |
| `MatchContextDisplay` | Move to detail / technical disclosure | Valuable context, too dense for default Home card. |
| `ModelStatusCard` | Move to `/model` / simplify on Home | Keep one Home status line; full diagnostics belong on Model page. |
| `HistoricalReplayAuditPreviewCard` | Move to `/model` | Evidence belongs with model track record. |
| `HistoricalValidationSection` | Move to `/model` or history | Too deep for Home. |
| `LiveEloRatingsSection` | Move to `/model` | Technical input, not primary sports navigation. |
| `TeamRatingsSection` | Move to `/model` or `/predictions` | Useful support data, not Home priority. |
| `TournamentProjectionOverviewSection` | Simplify on Home | Keep headline tournament outlook only. |
| Round-specific knockout simulation sections | Move to `/tournament` | Details should live under tournament progression. |
| `WorldCupChampionProjectionSummarySection` | Simplify on Home | Keep as part of Tournament Outlook. |
| `WorldCupGroupsSection` | Move to `/groups` | Home should show a compact group snapshot only. |
| `WorldCupStandingsSection` | Move to `/groups` | Full standings belong on group pages. |
| `WorldCupKnockoutBracketSection` | Move to `/tournament` | Bracket is a tournament destination. |
| `TournamentSimulationSection` | Move to `/tournament` or `/model` | Full simulation estimates should not compete on Home. |
| `PredictionHistoryDashboard` | Keep route | Existing `/prediction-history` remains the historical evidence area. |
| `GroupDetail*` components | Keep / restyle | Good route-level foundation for `/groups/[group]`. |
| `GroupNav` | Keep / restyle | Useful for A-L navigation; future Home group snapshot can reuse pattern. |

Future shared primitives:

- `AppShell`
- `PrimaryNavigation`
- `MobileBottomNavigation`
- `PageHeader`
- `SectionHeader`
- `MatchList`
- `CompactMatchRow`
- `MatchCard`
- `TeamIdentity`
- `TeamFlag`
- `ProbabilityBar`
- `StandingsTable`
- `StatusBadge`
- `FilterBar`
- `Tabs`
- `TechnicalDisclosure`
- `EmptyState`
- `ModelStatusSummary`

## Migration Roadmap

### 12.19B - Design System & Team Identity Foundation

- **Scope:** introduce design tokens, team identity contracts, and flag component foundations without broad page redesign.
- **Likely files:** `apps/web/app/globals.css`, shared component primitives, `packages/api/src/world-cup-2026-teams.ts`, team alias exports, future flag asset directory.
- **Risks:** flag licensing, asset sizing, white-flag contrast, breaking team-name assumptions.
- **Acceptance criteria:** canonical identity mapping exists; no duplicate flag maps in React; existing team displays can opt in.
- **Dependencies:** Phase 12.19A strategy.
- **Non-goals:** no Home redesign, no route changes, no downloaded assets unless licensing is approved.

### 12.19C - Application Shell and Navigation

- **Scope:** add reusable shell and primary route navigation while preserving existing routes.
- **Likely files:** `AppHeader`, new shell/navigation components, layout wiring.
- **Risks:** breaking anchors before destination routes exist; mobile nav overcrowding.
- **Acceptance criteria:** desktop and mobile navigation are accessible and route-based.
- **Dependencies:** design tokens from 12.19B.
- **Non-goals:** no large content moves yet.

### 12.19D - Home Dashboard Redesign

- **Scope:** replace the long Home with the eight-section architecture.
- **Likely files:** `apps/web/app/page.tsx`, Home-specific components, existing dashboard sections as dependencies.
- **Risks:** hiding current capabilities without replacement links; regressions in live runtime metadata.
- **Acceptance criteria:** Home is materially shorter; every removed detail has a destination link.
- **Dependencies:** shell/navigation and team identity.
- **Non-goals:** no prediction formula, provider, persistence, or route-contract changes.

### 12.19E - Matches Experience

- **Scope:** add `/matches` and later `/matches/[fixtureId]` around daily matches, prediction summaries, and match context.
- **Likely files:** new App Router pages, match list/card primitives, API client wrappers.
- **Risks:** duplicating date/timezone logic in React; overloading match detail with model diagnostics.
- **Acceptance criteria:** date navigation, match states, and detail pages are available without duplicating API logic.
- **Dependencies:** compact match primitives.
- **Non-goals:** no polling, no provider changes, no automatic snapshot creation.

### 12.19F - Groups and Tournament Experience

- **Scope:** add `/groups` overview and move tournament bracket/projection content out of Home.
- **Likely files:** group overview page, tournament page, existing group-detail components, bracket/projection sections.
- **Risks:** standings/projection confusion; qualification context overclaiming.
- **Acceptance criteria:** groups, qualification, and tournament progression are reachable and clearly separated.
- **Dependencies:** navigation and team identity.
- **Non-goals:** no qualification probabilities unless already supported by data contracts.

### 12.19G - Model and Evidence Center

- **Scope:** consolidate model status, evidence gate, prediction history entry points, Elo/xG explanation, coverage, and fallbacks.
- **Likely files:** new `/model` route, existing model/evidence components, prediction-history links.
- **Risks:** presenting small samples as conclusive; leaking technical diagnostics into user flows.
- **Acceptance criteria:** technical provenance is transparent but not repeated across Home.
- **Dependencies:** evidence gate and prediction history pages.
- **Non-goals:** no recalibration or model changes.

### 12.19H - Responsive, Accessibility and Final UX QA

- **Scope:** final responsive pass, keyboard testing, screen-reader labels, density tuning, and mobile usability.
- **Likely files:** shared primitives, page-level tests, Playwright specs.
- **Risks:** mobile table overflow, focus order, color-only status communication.
- **Acceptance criteria:** core workflows work on mobile and desktop with accessible labels and no horizontal dependency for essential information.
- **Dependencies:** all prior 12.19 phases.
- **Non-goals:** no new product capabilities.

## References

- [Team Identity and Flags Strategy](TEAM_IDENTITY_AND_FLAGS_STRATEGY.md)
- [Current Home Content Inventory](CURRENT_HOME_CONTENT_INVENTORY.md)
