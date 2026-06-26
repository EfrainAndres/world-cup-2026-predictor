# Flag Asset Notes

**Phase:** 12.19B — Design System & Team Identity Foundation (flags finalized)

## Asset Source

| Field | Value |
|---|---|
| **Source name** | flag-icons |
| **Repository** | https://github.com/lipis/flag-icons |
| **Collection** | `flags/4x3/` — rectangular 4:3 ratio SVGs |
| **License** | MIT |
| **Redistribution** | Permitted without restriction under the MIT license |
| **Attribution** | Not required by the MIT license; acknowledged here for completeness |
| **Commit downloaded from** | `main` branch, June 2026 |

### MIT License Summary

The MIT license permits use, copying, modification, merger, publication,
distribution, sublicitation, and/or selling of the software. No runtime
attribution is required. Attribution is given here as a courtesy.

## Current Status

All 48 SVG files in this directory are **final flag assets** sourced from
flag-icons (MIT licensed). Each file contains an accurate national or
football-association flag for the corresponding World Cup 2026 team.

## Files from a Different Source

None. All 48 files were obtained from the flag-icons `flags/4x3/` collection.

## Optimization and Modification

No optimization or modification was applied to the downloaded SVGs. Files are
stored exactly as downloaded from the flag-icons repository to maintain
provenance integrity.

## Naming Convention

Files are named by **lowercase FIFA code**: `col.svg`, `eng.svg`, `cod.svg`, etc.

The flag-icons collection uses ISO 3166-1 alpha-2 codes (`co.svg`, `gb-eng.svg`,
etc.). During download, files were renamed to match our FIFA-code convention.
The FIFA → flag-icons filename mapping is documented below.

## FIFA Code to flag-icons Filename Mapping

| FIFA Code | Our Filename | flag-icons Source | Notes |
|---|---|---|---|
| MEX | mex.svg | mx.svg | |
| RSA | rsa.svg | za.svg | South Africa (ISO ZA) |
| KOR | kor.svg | kr.svg | South Korea (ISO KR) |
| CZE | cze.svg | cz.svg | |
| CAN | can.svg | ca.svg | |
| BIH | bih.svg | ba.svg | Bosnia-Herzegovina (ISO BA) |
| QAT | qat.svg | qa.svg | |
| SUI | sui.svg | ch.svg | Switzerland (ISO CH) |
| BRA | bra.svg | br.svg | |
| MAR | mar.svg | ma.svg | |
| HAI | hai.svg | ht.svg | Haiti (ISO HT) |
| SCO | sco.svg | gb-sct.svg | Scotland — Saltire (football association, not UK flag) |
| USA | usa.svg | us.svg | |
| PAR | par.svg | py.svg | Paraguay (ISO PY) |
| AUS | aus.svg | au.svg | |
| TUR | tur.svg | tr.svg | |
| GER | ger.svg | de.svg | |
| CUW | cuw.svg | cw.svg | Curaçao (ISO CW) |
| CIV | civ.svg | ci.svg | Ivory Coast (ISO CI) |
| ECU | ecu.svg | ec.svg | |
| NED | ned.svg | nl.svg | Netherlands (ISO NL) |
| JPN | jpn.svg | jp.svg | |
| SWE | swe.svg | se.svg | |
| TUN | tun.svg | tn.svg | |
| BEL | bel.svg | be.svg | |
| EGY | egy.svg | eg.svg | |
| IRN | irn.svg | ir.svg | Iran (ISO IR) |
| NZL | nzl.svg | nz.svg | |
| ESP | esp.svg | es.svg | |
| CPV | cpv.svg | cv.svg | Cape Verde (ISO CV) |
| KSA | ksa.svg | sa.svg | Saudi Arabia (ISO SA) |
| URU | uru.svg | uy.svg | Uruguay (ISO UY) |
| FRA | fra.svg | fr.svg | |
| SEN | sen.svg | sn.svg | |
| IRQ | irq.svg | iq.svg | |
| NOR | nor.svg | no.svg | |
| ARG | arg.svg | ar.svg | |
| ALG | alg.svg | dz.svg | Algeria (ISO DZ) |
| AUT | aut.svg | at.svg | |
| JOR | jor.svg | jo.svg | |
| POR | por.svg | pt.svg | |
| COD | cod.svg | cd.svg | DR Congo (FIFA COD, ISO CD) |
| UZB | uzb.svg | uz.svg | |
| COL | col.svg | co.svg | |
| ENG | eng.svg | gb-eng.svg | England — St George's Cross (football association, not UK flag) |
| CRO | cro.svg | hr.svg | Croatia (ISO HR) |
| GHA | gha.svg | gh.svg | |
| PAN | pan.svg | pa.svg | |

## Special Cases

| Team | File | Note |
|---|---|---|
| England | `eng.svg` | St George's Cross — football association flag; not the UK or England national flag |
| Scotland | `sco.svg` | Saltire (blue/white diagonal cross) — football association flag; not the UK flag |
| DR Congo | `cod.svg` | FIFA code COD; country ISO is CD |
| Saudi Arabia | `ksa.svg` | FIFA code KSA; country ISO is SA |
| Curacao | `cuw.svg` | FIFA code CUW; country ISO is CW |
| Switzerland | `sui.svg` | FIFA code SUI; country ISO is CH |
| South Korea | `kor.svg` | FIFA code KOR; country ISO is KR |

## White-Flag Handling

Switzerland (`sui.svg`) and Japan (`jpn.svg`) have predominantly white flags.
`TeamFlag` applies a subtle border ring to these automatically via the `WHITE_FLAG_CODES`
set in `apps/web/src/components/TeamFlag.tsx`. Update that set if additional
near-white flags are identified.

## Runtime Load Failure

`TeamFlag` uses a React `useState` + `onError` handler on the `<img>` element.
If an image fails to load at runtime, the component transitions to the FIFA-code
fallback view (the same branch rendered when `flagPath` is null). No broken-image
browser icon is shown.
