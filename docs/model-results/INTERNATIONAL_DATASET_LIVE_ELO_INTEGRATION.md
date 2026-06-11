# International Dataset Live Elo Integration

**Phase:** 7.0C
**Status:** Complete
**Date:** 2026-06-11

## Summary

Phase 7.0C wires the international match dataset foundation (Phase 7.0B) into the live Elo API flow. The `getLiveEloRatingsFoundation()` handler now processes 268 matches: the original 256 curated World Cup fixtures (2010–2022) plus 12 international supplement matches spanning Copa America 2024, UEFA Euro 2024, FIFA World Cup 2026 Qualifiers, and International Friendlies.

## Architecture

### Data flow

```
LIVE_ELO_FOUNDATION_MATCHES (256, EloMatch[])
      +
LIVE_ELO_INTERNATIONAL_SUPPLEMENT (12, EloCompatibleMatch[])
      |
      v
mergeEloMatchSources() — ID-based dedup, returns 268 EloMatch[]
      |
      v
runLiveEloPipeline({ dataCoverage: "partial_international_history" })
      |
      v
getLiveEloRatingsFoundation() response
```

### Key design decisions

**Embedded TypeScript constants** — The API package has no runtime dependency on the `data` package. The 12 supplement matches are embedded as `LIVE_ELO_INTERNATIONAL_SUPPLEMENT: readonly EloCompatibleMatch[]` in `live-elo-data.ts`, following the same pattern as the existing `LIVE_ELO_FOUNDATION_MATCHES` constant.

**`EloCompatibleMatch` interface** — A structural bridge type in `international-elo-adapter.ts` that matches the optional-field shape of both `NormalizedMatch` (data package) and `EloMatch` (model package) without creating a cross-package import. `toEloMatch()` uses conditional assignment (`if (x !== undefined)`) to satisfy `exactOptionalPropertyTypes: true`.

**WC 2022 exclusion from supplement** — The international sample fixture includes 3 FIFA World Cup 2022 matches (INT-WC22-xxx). These competitions overlap with the embedded World Cup dataset (different `match_id` prefixes). To avoid Elo inflation from double-counting, all FIFA World Cup 2022 entries are excluded from `LIVE_ELO_INTERNATIONAL_SUPPLEMENT`. Only the 12 non-WC2022 matches (Copa, Euro, WCQ, Friendly) are added.

**`mergeEloMatchSources()` deduplication** — Supplement matches are filtered against the foundation `Set<match_id>` before merging. Foundation match data is always authoritative when IDs collide.

**World Cup fallback preserved** — If `LIVE_ELO_INTERNATIONAL_SUPPLEMENT` is empty, `mergeEloMatchSources()` returns the foundation array unchanged. The World Cup-only path remains intact.

**Determinism maintained** — `LIVE_ELO_FOUNDATION_MATCHES` and `LIVE_ELO_INTERNATIONAL_SUPPLEMENT` are both compile-time constants. `mergeEloMatchSources()` is a pure function. The pipeline produces identical output on every call.

## Files changed

| File | Change |
| --- | --- |
| `packages/api/src/live-elo-data.ts` | Added `EloCompatibleMatch` import; added `LIVE_ELO_INTERNATIONAL_SUPPLEMENT` (12 matches) and 3 metadata constants |
| `packages/api/src/international-elo-adapter.ts` | New — `EloCompatibleMatch` interface, `toEloMatch()`, `mergeEloMatchSources()`, `LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING` |
| `packages/api/src/routes.ts` | Updated `getLiveEloRatingsFoundation()` to merge datasets; updated `dataCoverage`, `dataScope`, `latestMatchDate`, `warnings`, `metadata` |
| `packages/api/src/model-info.ts` | Updated last `modelScope` entry to mention international supplement |
| `packages/api/tests/international-elo-adapter.test.ts` | New — adapter unit tests |
| `packages/api/tests/api.test.ts` | Updated `matchesProcessed` (256 → 268), `latestMatchDate` ("2022-12-18" → "2024-09-07"); added supplement warning and dataCoverage tests |

## Dataset composition

| Source | Matches | Competitions | Date range |
| --- | --- | --- | --- |
| World Cup foundation | 256 | World Cup 2010, 2014, 2018, 2022 | 2010-06-11 – 2022-12-18 |
| International supplement | 12 | Copa America 2024, UEFA Euro 2024, FIFA WCQ 2026, International Friendly | 2023-09-12 – 2024-09-07 |
| **Combined** | **268** | | **2010-06-11 – 2024-09-07** |

## Warnings and limitations

- The international supplement is a **small curated sample only** (12 matches). It does not represent complete international match history.
- Teams that appear only in the supplement but not in any World Cup 2010–2022 receive a minimal Elo history based on those matches alone.
- `dataCoverage` is `"partial_international_history"` — not `"complete_international_history"`.
- The supplement was selected to cover notable competitions (Copa, Euro, WCQ) and avoids duplicating the WC 2022 data already in the foundation.
- `LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING` is included in every `getLiveEloRatingsFoundation()` response.

## Invariants preserved

- `supportedHandlers` count remains at 8 (no new handler added).
- Response shape of `LiveEloRatingsFoundationResponse` is backward-compatible.
- `getLiveEloRatingsFoundation()` remains a pure, deterministic function.
- `LIVE_ELO_FOUNDATION_MATCHES` and all World Cup-only constants are unchanged.
