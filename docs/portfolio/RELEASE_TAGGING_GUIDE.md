# Release Tagging Guide

This guide documents the manual tag process for the portfolio release. It is documentation-only: do not run these commands from an automated agent session unless the user explicitly asks for tagging.

Recommended portfolio release tag:

```text
v0.1.0-portfolio
```

## Before Tagging

Confirm:

- The portfolio release pull request is merged to `main`.
- GitHub Actions passed on the merged `main` commit.
- Final local checks passed before merge.
- README and portfolio documentation are reviewed.
- Known limitations remain visible.

## Manual Release Tagging Commands

Run these commands manually after the release PR is merged:

```bash
git checkout main
git pull origin main
git tag -a v0.1.0-portfolio -m "Portfolio release v0.1.0"
git push origin v0.1.0-portfolio
```

## Verify The Tag

After pushing, confirm the tag appears in GitHub under repository tags or releases.

Optional local check:

```bash
git tag --list "v0.1.0-portfolio"
```

## Rollback Guidance

Only delete the tag if it was created from the wrong commit or the release is materially incorrect.

Delete the local tag:

```bash
git tag -d v0.1.0-portfolio
```

Delete the remote tag:

```bash
git push origin :refs/tags/v0.1.0-portfolio
```

After deleting a tag:

- Fix the release issue on a new branch.
- Open and merge a corrective pull request.
- Re-run GitHub Actions on `main`.
- Recreate the tag from the corrected `main` commit.

## What This Tag Means

`v0.1.0-portfolio` means the repository is ready to present as a portfolio case study. It does not mean:

- A production deployment exists.
- The model is production-calibrated.
- The dataset is complete.
- The outputs are betting advice.
- The project makes a public predictive accuracy claim.
