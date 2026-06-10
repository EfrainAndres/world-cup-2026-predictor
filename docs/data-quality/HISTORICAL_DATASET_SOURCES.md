# Historical Dataset Sources

The Phase 4.0F fixtures are manually curated from public historical FIFA World Cup match records. They are not downloaded automatically and they are not a complete historical dataset.

## Source References

| Tournament | Fixture Scope | Source References |
| --- | --- | --- |
| 2018 FIFA World Cup | Semi-finals, third-place match, final | [2018 FIFA World Cup knockout stage](https://en.wikipedia.org/wiki/2018_FIFA_World_Cup_knockout_stage), [2018 FIFA World Cup final](https://en.wikipedia.org/wiki/2018_FIFA_World_Cup_final) |
| 2022 FIFA World Cup | Semi-finals, third-place match, final | [2022 FIFA World Cup knockout stage](https://en.wikipedia.org/wiki/2022_FIFA_World_Cup_knockout_stage), [2022 FIFA World Cup final](https://en.wikipedia.org/wiki/2022_FIFA_World_Cup_final) |

Future production-quality data work should prefer official FIFA pages, licensed datasets, or explicitly reusable public datasets. Public reference pages can be useful for cross-checking but should not be the only source for published model claims.

## How Sources Should Be Cited

Future data updates should record:

- Source name.
- Source URL.
- Retrieval date.
- Field-level transformations.
- Manual corrections.
- License or usage note.
- Reviewer initials or review note when manually curated.

For this phase, each fixture row includes a `source_note`, and this document provides the source reference index.

## Licensing And Usage Considerations

The committed fixtures are small manually curated factual records used for tests and portfolio demonstration. They are not bulk scraped data.

Before expanding the dataset:

- Confirm whether the chosen source permits reuse.
- Avoid automated scraping unless terms allow it.
- Prefer stable downloadable datasets with clear licenses.
- Avoid committing large raw datasets without a redistribution review.
- Keep generated outputs separate from source fixtures.

## Why Curated Fixtures Instead Of Automatic Download

Automatic downloads are intentionally out of scope for this phase because:

- The project does not yet have source-license automation rules.
- Network-dependent tests would make local checks less reliable.
- A small fixture keeps review simple.
- Manual curation makes assumptions visible before scaling.

The next phase can add broader ingestion only after the source strategy is approved and documented.
