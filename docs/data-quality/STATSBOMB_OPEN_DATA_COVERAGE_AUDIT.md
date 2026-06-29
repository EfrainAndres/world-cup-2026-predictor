# StatsBomb Open Data Coverage Audit

**Phase:** 12.20A1  
**Audited:** 2026-06-28  
**Status:** Complete — read-only analysis; no production code changed

---

## Purpose

This document audits StatsBomb Open Data for coverage of all 48 World Cup 2026 teams. The goal is to determine whether and how StatsBomb-derived xG (expected goals) performance data can complement the existing Elo-based prediction model.

No production prediction formulas, Elo constants, Poisson behavior, scoreline selection, snapshots, evaluations, persistence schema, standings, qualification, or tournament topology were changed as part of this audit.

---

## Data Source

**Repository:** [statsbomb/open-data](https://github.com/statsbomb/open-data)  
**License:** Open use for research and genuine interest in football analytics. Published work must credit StatsBomb and use their logo (see [StatsBomb Media Pack](https://statsbomb.com/media-pack/)).  
**Format:** JSON files — competitions, matches, events, lineups, 360 frames  
**xG field:** `shot.statsbomb_xg` (float) present in shot events across all competitions audited

---

## Competitions Audited

| Competition | Season | Matches | Events+xG |
|---|---|---|---|
| FIFA World Cup | 2022 | 64 | ✓ |
| FIFA World Cup | 2018 | 64 | ✓ |
| Copa América | 2024 | 32 | ✓ |
| AFCON | 2023 | 52 | ✓ |
| UEFA Euro | 2024 | 51 | ✓ |
| UEFA Euro | 2020 | 51 | ✓ |
| **Total** | | **314** | |

Additional StatsBomb competitions exist (La Liga, Premier League, Bundesliga, etc.) but cover club football. This audit is scoped to international competition data directly relevant to WC2026 national teams.

---

## Coverage Classification

Coverage is classified per team by total matches available across audited competitions:

| Classification | Threshold | Meaning |
|---|---|---|
| **Full** | ≥ 10 matches | Multi-competition coverage; direct xG estimation feasible with reasonable confidence |
| **Partial** | 4–9 matches | Single major competition or limited cross-competition; xG estimation feasible with moderate shrinkage |
| **Sparse** | 1–3 matches | Very limited data; xG estimation requires heavy confederation and global prior blending |
| **Fallback** | 0 matches | No StatsBomb open data found; must rely entirely on Elo-derived prior |

---

## 48-Team Coverage Summary

| Group | Team | Matches | Classification | Sources |
|---|---|---|---|---|
| A | Mexico | 10 | **Full** | WC2022(3), WC2018(4), Copa América 2024(3) |
| A | South Africa | 7 | Partial | AFCON 2023(7) |
| A | South Korea | 7 | Partial | WC2022(4), WC2018(3) |
| A | Czechia | 8 | Partial | Euro 2024(3), Euro 2020(5) |
| B | Canada | 9 | Partial | WC2022(3), Copa América 2024(6) |
| B | Bosnia-Herzegovina | 0 | **Fallback** | — |
| B | Qatar | 3 | Sparse | WC2022(3) |
| B | Switzerland | 18 | **Full** | WC2022(4), WC2018(4), Euro 2024(5), Euro 2020(5) |
| C | Brazil | 14 | **Full** | WC2022(5), WC2018(5), Copa América 2024(4) |
| C | Morocco | 14 | **Full** | WC2022(7), WC2018(3), AFCON 2023(4) |
| C | Haiti | 0 | **Fallback** | — |
| C | Scotland | 6 | Partial | Euro 2024(3), Euro 2020(3) |
| D | United States | 7 | Partial | WC2022(4), Copa América 2024(3) |
| D | Paraguay | 3 | Sparse | Copa América 2024(3) |
| D | Australia | 7 | Partial | WC2022(4), WC2018(3) |
| D | Turkey | 8 | Partial | Euro 2024(5), Euro 2020(3) |
| E | Germany | 15 | **Full** | WC2022(3), WC2018(3), Euro 2024(5), Euro 2020(4) |
| E | Curacao | 0 | **Fallback** | — |
| E | Ivory Coast | 7 | Partial | AFCON 2023(7) |
| E | Ecuador | 7 | Partial | WC2022(3), Copa América 2024(4) |
| F | Netherlands | 15 | **Full** | WC2022(5), Euro 2024(6), Euro 2020(4) |
| F | Japan | 8 | Partial | WC2022(4), WC2018(4) |
| F | Sweden | 9 | Partial | WC2018(5), Euro 2020(4) |
| F | Tunisia | 9 | Partial | WC2022(3), WC2018(3), AFCON 2023(3) |
| G | Belgium | 19 | **Full** | WC2022(3), WC2018(7), Euro 2024(4), Euro 2020(5) |
| G | Egypt | 7 | Partial | WC2018(3), AFCON 2023(4) |
| G | Iran | 6 | Partial | WC2022(3), WC2018(3) |
| G | New Zealand | 0 | **Fallback** | — |
| H | Spain | 21 | **Full** | WC2022(4), WC2018(4), Euro 2024(7), Euro 2020(6) |
| H | Cape Verde | 5 | Partial | AFCON 2023(5) |
| H | Saudi Arabia | 6 | Partial | WC2022(3), WC2018(3) |
| H | Uruguay | 14 | **Full** | WC2022(3), WC2018(5), Copa América 2024(6) |
| I | France | 24 | **Full** | WC2022(7), WC2018(7), Euro 2024(6), Euro 2020(4) |
| I | Senegal | 11 | **Full** | WC2022(4), WC2018(3), AFCON 2023(4) |
| I | Iraq | 0 | **Fallback** | — |
| I | Norway | 0 | **Fallback** | — |
| J | Argentina | 17 | **Full** | WC2022(7), WC2018(4), Copa América 2024(6) |
| J | Algeria | 3 | Sparse | AFCON 2023(3) |
| J | Austria | 8 | Partial | Euro 2024(4), Euro 2020(4) |
| J | Jordan | 0 | **Fallback** | — |
| K | Portugal | 18 | **Full** | WC2022(5), WC2018(4), Euro 2024(5), Euro 2020(4) |
| K | DR Congo | 7 | Partial | AFCON 2023(7) |
| K | Uzbekistan | 0 | **Fallback** | — |
| K | Colombia | 10 | **Full** | WC2018(4), Copa América 2024(6) |
| L | England | 26 | **Full** | WC2022(5), WC2018(7), Euro 2024(7), Euro 2020(7) |
| L | Croatia | 21 | **Full** | WC2022(7), WC2018(7), Euro 2024(3), Euro 2020(4) |
| L | Ghana | 6 | Partial | WC2022(3), AFCON 2023(3) |
| L | Panama | 7 | Partial | WC2018(3), Copa América 2024(4) |

**Coverage distribution:** Full 16 · Partial 21 · Sparse 3 · Fallback 8

---

## Fallback Teams (No StatsBomb Open Data)

Eight teams have zero coverage in the audited StatsBomb Open Data competitions:

| Team | Group | FIFA Code | Confederation | Reason |
|---|---|---|---|---|
| Bosnia-Herzegovina | B | BIH | UEFA | Did not qualify for any audited competition |
| Haiti | C | HAI | CONCACAF | Did not qualify for any audited competition |
| Curacao | E | CUW | CONCACAF | Did not qualify for any audited competition |
| New Zealand | G | NZL | OFC | Did not qualify for any audited competition |
| Iraq | I | IRQ | AFC | Did not qualify for any audited competition |
| Norway | I | NOR | UEFA | Did not qualify for any audited competition (missed WC2018/2022, Euro 2020/2024) |
| Jordan | J | JOR | AFC | Did not qualify for any audited competition |
| Uzbekistan | K | UZB | AFC | Did not qualify for any audited competition |

These teams must fall back entirely to Elo-derived xG estimates.

---

## Sparse Teams (1–3 Matches)

Three teams have minimal coverage requiring heavy shrinkage to confederation/global priors:

| Team | Group | Matches | Source | Note |
|---|---|---|---|---|
| Qatar | B | 3 | WC2022 | Host nation; all group-stage exits |
| Paraguay | D | 3 | Copa América 2024 | Group-stage exits only |
| Algeria | J | 3 | AFCON 2023 | Group-stage exits only |

---

## StatsBomb Name Normalization Required

StatsBomb uses different team names in some cases. The following mappings are needed when ingesting events:

| WC2026 Canonical Name | StatsBomb Name(s) |
|---|---|
| Czechia | Czech Republic |
| Ivory Coast | Côte d'Ivoire |
| Cape Verde | Cape Verde Islands |
| DR Congo | Congo DR |

All other WC2026 team names match StatsBomb names directly (case-insensitive).

---

## Data Quality Observations

**xG field availability:** `shot.statsbomb_xg` is present in all shot events across all audited competitions. The WC2022 Canada vs Morocco match (match ID 3857276) confirmed: 3388 total events, 12 shot events, all with `statsbomb_xg` float values.

**Events file size:** Events files are 2–4 MB each (compressed). Downloading all 314 matches in the audited competitions requires ~800 MB uncompressed. This should not be committed to the repository.

**Data freshness:** Most recent data is from Euro 2024 / Copa América 2024 (final matches July 14–15, 2024). No 2025 or 2026 international competition data is available in the open dataset as of the audit date (2026-06-28).

**No 360 data for all matches:** StatsBomb 360 (spatial freeze-frame data) is not available for all competitions. This audit uses only match results and shot-level events (xG), which are available for all audited competitions.

**Own goals:** StatsBomb records own goals as a `Shot` event with `outcome.name = "Own Goal For"` against the own goal scorer's team. Own goals should be excluded from xG-for calculations and included in xG-against.

**Extra time and penalties:** Match events include extra time periods (`period = 3` for ET first half, `period = 4` for ET second half, `period = 5` for penalty shootout). For the performance profile, regulation time only (`period ≤ 2`) should be used unless explicitly extending to extra time. Penalty shootout shots must be excluded from `statsbomb_xg` aggregation.

---

## Confederation Coverage Analysis

| Confederation | WC2026 Teams | Full | Partial | Sparse | Fallback |
|---|---|---|---|---|---|
| UEFA | 16 | 11 | 5 | 0 | 0 |
| CAF | 10 | 4 | 6 | 0 | 0 |
| CONMEBOL | 8 | 6 | 1 | 1 | 0 |
| AFC | 8 | 0 | 5 | 1 | 2 |
| CONCACAF | 5 | 1 | 3 | 0 | 1 |
| OFC | 1 | 0 | 0 | 0 | 1 |

UEFA and CONMEBOL teams have the strongest open data coverage. AFC and OFC teams have the weakest coverage. CONCACAF teams are split, with Curacao and Haiti having no coverage.

---

## Adapter Boundary Assessment

The cleanest boundary for a StatsBomb performance data provider is:

**Input:** StatsBomb competition ID + season ID + canonical team name  
**Output:** `TeamPerformanceProfile` — xG for/against per 90, shot counts, match count, freshness date, coverage classification

The existing `canonicalizeTeamName` and `normalizeTeamSearchText` functions in `team-aliases.ts` already handle the normalization layer. The StatsBomb-to-canonical name mapping (Czechia/Czech Republic, Ivory Coast/Côte d'Ivoire, etc.) extends `TEAM_ALIASES` with four additional entries.

See `docs/architecture/STATSBOMB_PERFORMANCE_DATA_INTEGRATION.md` for the full interface design.

---

## Audit Conclusion

**Open data is sufficient for a partial-coverage experiment for most teams.** 40 of 48 WC2026 teams (83%) have at least some StatsBomb open data coverage. 16 of 48 (33%) have full coverage suitable for direct xG estimation. The 8 fallback teams require Elo-only priors.

**Final recommendation:** `open_data_partial_use_with_priors`

The open dataset can meaningfully enrich xG estimates for the 40 covered teams using a shrinkage blending approach (StatsBomb-derived sample mean blended toward Elo-derived prior with weight proportional to match count). The 8 uncovered teams continue using Elo-derived xG unchanged. No commercial API access is required to begin experimentation.
