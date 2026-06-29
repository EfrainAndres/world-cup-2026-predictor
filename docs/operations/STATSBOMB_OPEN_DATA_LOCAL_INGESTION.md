# StatsBomb Open Data — Local Ingestion Guide

**Phase:** 12.20A2  
**Applies to:** Local development only. Raw StatsBomb data is never committed to the repository.

---

## Prerequisites

- Node.js ≥ 20 (for native `fetch`)
- pnpm workspace installed (`pnpm install`)
- Internet access to `raw.githubusercontent.com`
- ~800 MB free disk space

---

## Setup

The data directory is gitignored. Create it manually if needed:

```bash
mkdir -p .local-data/statsbomb-open-data
```

Or override the default location via environment variable:

```bash
export STATSBOMB_OPEN_DATA_DIR=/path/to/your/data
```

---

## Attribution Requirements

StatsBomb Open Data is published under the StatsBomb Open Data License. Any published work using this data **must credit StatsBomb and include the StatsBomb logo**. See [StatsBomb Media Pack](https://statsbomb.com/media-pack/).

Do not redistribute raw StatsBomb JSON files. Commit only derived aggregated profiles (match counts, xG averages).

---

## Download Raw Data

```bash
pnpm --filter @world-cup-2026-predictor/api statsbomb:download
```

This will:
1. Download match files for all 6 supported competitions (~6 small files)
2. Download event files for all ~314 matches (~800 MB total)
3. Skip files that already exist (use `--force` to re-download)

Expected output:
```
[FIFA World Cup 2022] competition_id=43 season_id=106
  64 matches found
  ................................................................
[UEFA Euro 2024] competition_id=55 season_id=282
  51 matches found
  ...
--- Download Summary ---
Competitions match files downloaded: 6
Event files downloaded: 314 (314 matches)
Skipped (already exist): 0
Errors: 0
```

### Force Re-Download

```bash
pnpm --filter @world-cup-2026-predictor/api statsbomb:download -- --force
```

### Partial Download

If a download fails partway through, re-run without `--force` to skip already-downloaded files and continue.

---

## Build Team Performance Profiles

```bash
pnpm --filter @world-cup-2026-predictor/api statsbomb:build-profiles
```

This reads the local data, aggregates xG and goal metrics per team, and writes the artifact to:

```
docs/model-results/artifacts/statsbomb-team-performance-profiles.json
```

### Custom Cutoff Date

Preferred — pass as a CLI flag (accepts ISO date or full ISO timestamp):

```bash
pnpm --filter @world-cup-2026-predictor/api statsbomb:build-profiles -- --cutoff-at 2026-06-01T00:00:00.000Z
```

Alternative — set via environment variable:

```bash
STATSBOMB_PROFILE_CUTOFF_AT=2026-06-01T00:00:00.000Z \
  pnpm --filter @world-cup-2026-predictor/api statsbomb:build-profiles
```

The `--cutoff-at` flag takes precedence over `STATSBOMB_PROFILE_CUTOFF_AT`. Both accept:
- Date only: `2026-06-01`
- Full ISO timestamp: `2026-06-01T00:00:00.000Z`

An invalid value causes the CLI to exit 1 with a clear error message.

Default cutoff is the current UTC timestamp. Only matches **strictly before** the cutoff date are included in profiles.

### Custom Output Path

```bash
STATSBOMB_PROFILE_OUTPUT_PATH=/tmp/profiles.json \
  pnpm --filter @world-cup-2026-predictor/api statsbomb:build-profiles
```

---

## Run Tests (No Data Required)

The test suite uses synthetic fixtures. No real StatsBomb data download is needed:

```bash
pnpm --filter @world-cup-2026-predictor/api test
```

---

## Update Procedure

StatsBomb Open Data is updated periodically. To refresh:

1. Run `statsbomb:download --force` to re-download all files
2. Run `statsbomb:build-profiles` to regenerate the artifact
3. Review the coverage summary — competition match counts should be stable

---

## Expected Storage

| Content | Size |
|---|---|
| Match files (6 competitions) | ~1 MB |
| Event files (~314 matches) | ~800 MB uncompressed |
| Derived profiles artifact | < 1 MB |

---

## Troubleshooting

**HTTP 404 on match file:** The competition/season ID may have changed in the StatsBomb open data repository. Check `STATSBOMB_SUPPORTED_COMPETITIONS` in `packages/api/src/providers/statsbomb/statsbomb-team-mapping.ts`.

**SSL certificate errors:** If running behind a corporate proxy, configure `NODE_EXTRA_CA_CERTS` or use `NODE_TLS_REJECT_UNAUTHORIZED=0` (development only).

**Data directory not found when building profiles:** Run `statsbomb:download` first. The CLI exits with a helpful error if the directory is missing.

**Slow downloads:** Each event file is ~2–4 MB. Downloads are sequential. Expect ~30–60 minutes for the full dataset depending on network speed.

---

## Removal

To remove all downloaded data:

```bash
rm -rf .local-data/statsbomb-open-data
```

The `.local-data/` directory is gitignored. No repository files are affected.
