# Historical Dataset Sources

The Phase 4.0H fixtures are manually curated factual match records from public FIFA World Cup result references. They are committed as small reviewed JSON fixtures and are not downloaded during tests.

## Source References

| Tournament | Primary Reference | Cross-Check Reference |
| --- | --- | --- |
| 2010 FIFA World Cup | [OpenFootball World Cup 2010 data](https://github.com/openfootball/worldcup/tree/master/2010--south-africa) | [2010 FIFA World Cup knockout stage](https://en.wikipedia.org/wiki/2010_FIFA_World_Cup_knockout_stage) |
| 2014 FIFA World Cup | [OpenFootball World Cup 2014 data](https://github.com/openfootball/worldcup/tree/master/2014--brazil) | [2014 FIFA World Cup knockout stage](https://en.wikipedia.org/wiki/2014_FIFA_World_Cup_knockout_stage) |
| 2018 FIFA World Cup | [OpenFootball World Cup 2018 data](https://github.com/openfootball/worldcup/tree/master/2018--russia) | [2018 FIFA World Cup knockout stage](https://en.wikipedia.org/wiki/2018_FIFA_World_Cup_knockout_stage) |
| 2022 FIFA World Cup | [OpenFootball World Cup 2022 data](https://github.com/openfootball/worldcup/tree/master/2022--qatar) | [2022 FIFA World Cup knockout stage](https://en.wikipedia.org/wiki/2022_FIFA_World_Cup_knockout_stage) |

Additional public tournament result pages may be used by future contributors to verify group-stage dates, scores, penalty winners, and final outcomes.

## Source Review Rules

Future data updates should record:

- Source name.
- Source URL.
- Retrieval date.
- Fixture scope.
- Field-level transformations.
- Manual corrections.
- License or usage note.
- Reviewer initials or review note when manually curated.

Each fixture row includes a concise `source_note`; this document is the source index for the fixture directory.

## Licensing And Usage Considerations

The committed fixtures are small manually curated factual records used for tests and portfolio demonstration. They are not bulk scraped website content.

Before expanding the dataset:

- Confirm whether the chosen source permits reuse.
- Prefer stable sources with clear licenses or public factual records.
- Avoid automated scraping unless terms allow it.
- Avoid committing large raw datasets without redistribution review.
- Keep source notes factual and short.

## Why Curated Fixtures Instead Of Automatic Download

Automatic downloads are intentionally out of scope because:

- Network-dependent tests would make local checks less reliable.
- Manual review keeps early data quality visible.
- The dataset is small enough to inspect in pull requests.
- Source licensing and provenance rules should be settled before automated ingestion.
