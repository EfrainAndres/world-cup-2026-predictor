# UX Research

This document captures product inspiration and UX lessons for the future dashboard. These notes are directional and should guide design decisions without copying another product.

## Research Sources

| Source | Reference |
| --- | --- |
| Sofascore | [sofascore.com](https://www.sofascore.com/) |
| FotMob | [fotmob.com](https://www.fotmob.com/main), [App Store listing](https://apps.apple.com/us/app/fotmob-soccer-live-scores/id488575683) |
| FiveThirtyEight-style sports forecasting | [FiveThirtyEight soccer methodology](https://fivethirtyeight.com/methodology/how-our-club-soccer-predictions-work/) |
| Tableau/Public BI dashboards | [Tableau dashboard best practices](https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm) |
| Dribbble dashboard inspiration | [Dribbble dashboard search](https://dribbble.com/search/dashboard) |
| Behance dashboard inspiration | [Behance dashboard UI search](https://www.behance.net/search/projects/Dashboard%20UI%20Design?locale=en_US) |
| Data analytics SaaS dashboards | [Microsoft Power BI dashboard design tips](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips) |

## Sofascore

| Learn From It | Avoid | Apply To This Project |
| --- | --- | --- |
| Dense match coverage, fast scanning, match stats, team pages, competition navigation. | Overloading the MVP with every live-score feature, odds-first patterns, or too many sports contexts. | Use strong match cards, team context, fixture navigation, and clear statistical summaries. |

Sofascore is useful as a reference for football information architecture. It shows how live scores, fixtures, tables, teams, and statistics can be connected in a way users already understand.

## FotMob

| Learn From It | Avoid | Apply To This Project |
| --- | --- | --- |
| Clean football-first navigation, match details, xG/shot-map style context, personalized-feeling team/player follow patterns. | Building notifications, news, transfers, or personalization before the model/dashboard foundation is strong. | Use focused match detail pages, readable team context, and football-native labels. |

FotMob is a strong reference for football usability. It is especially relevant for how fans expect match pages, team pages, fixtures, and live context to feel.

## FiveThirtyEight-Style Sports Forecasting

| Learn From It | Avoid | Apply To This Project |
| --- | --- | --- |
| Forecasting transparency, probability tables, model methodology, simulations, and uncertainty framing. | Treating a model result as a single truth or hiding assumptions behind a polished chart. | Show probabilities, model version, simulation assumptions, and validation metrics near predictions. |

FiveThirtyEight-style forecasting is the closest product reference for responsible predictive UX. The lesson is not just visual style; it is the habit of explaining the model, showing probabilities, and making uncertainty normal.

## Tableau/Public BI Dashboards

| Learn From It | Avoid | Apply To This Project |
| --- | --- | --- |
| Purpose-driven dashboards, audience clarity, filtering, highlighting, and layout discipline. | Cramming too many views into one screen or turning exploration into clutter. | Use dashboard pages with clear goals, limited charts, useful filters, and strong hierarchy. |

BI dashboard guidance is important because this project is not only a football app. It is also an analytical product where users need to compare values, drill into details, and trust the data.

## Dribbble/Behance Dashboard Inspiration

| Learn From It | Avoid | Apply To This Project |
| --- | --- | --- |
| Visual polish, spacing ideas, chart composition, card layouts, and presentation quality. | Copying glossy mockups that ignore real data density, accessibility, responsiveness, or edge cases. | Use as visual moodboard input only; validate every design against real content and product goals. |

Design galleries are useful for visual taste, but they are risky as UX sources. The final dashboard should be beautiful because it is clear, not because it imitates a decorative concept shot.

## Data Analytics SaaS Dashboards

| Learn From It | Avoid | Apply To This Project |
| --- | --- | --- |
| Clear KPI hierarchy, top-left prioritization, concise charts, responsive constraints, and decision-oriented layouts. | Enterprise clutter, excessive controls, vague metrics, or charts that look impressive but do not answer a question. | Structure dashboard home around key actions: inspect a match, compare teams, explore simulations, verify data quality. |

Analytics SaaS dashboards are useful for operational discipline. The future UI should feel professional, calm, and useful rather than like a sports news homepage.

## Research Takeaways

- Football users expect quick paths to matches, teams, fixtures, and competition context.
- Forecasting users need probabilities, assumptions, and model confidence explained.
- Portfolio reviewers need visible evidence of architecture, QA, validation, and product judgment.
- Dashboard pages should answer one primary question each.
- Visual inspiration must be filtered through accessibility, real data, mobile layouts, and testability.
