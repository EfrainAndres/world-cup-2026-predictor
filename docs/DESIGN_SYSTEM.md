# Design System Direction

This document defines the intended visual and interaction direction for the future dashboard. It is not a component implementation.

## Visual Direction

The dashboard should feel:

- Analytical.
- Football-aware.
- Calm and professional.
- Trustworthy rather than flashy.
- Portfolio-ready without looking like a marketing landing page.

The visual style should support repeated use and careful reading. Avoid a design dominated by one heavy color theme, decorative gradients, or oversized marketing sections inside the product dashboard.

## Layout Principles

- Design mobile-first, then add density for larger screens.
- Use clear page hierarchy: summary first, details second, methodology nearby.
- Keep navigation predictable and persistent.
- Use constrained content widths for reading-heavy pages.
- Use responsive grids for match cards, team comparisons, and dashboard metrics.
- Avoid nested cards.
- Keep interactive controls close to the data they affect.

## Typography Direction

- Use a readable sans-serif typeface.
- Reserve large display type for landing or major page headings.
- Use compact, scannable headings inside dashboard panels.
- Keep number formatting consistent across probability, score, and metric displays.
- Avoid negative letter spacing and viewport-scaled font sizes.

## Spacing System

Use a simple spacing scale aligned with Tailwind CSS defaults:

| Token | Use |
| --- | --- |
| `2` / `4` | Tight inline spacing, labels, compact controls. |
| `6` / `8` | Card and panel padding. |
| `10` / `12` | Section spacing on dashboard pages. |
| `16` / `20` | Larger page separation and landing sections. |

Spacing should make data easier to scan, not create decorative emptiness.

## Card Patterns

Cards should be used for:

- Match summaries.
- Team comparison modules.
- Key metric groups.
- Validation status summaries.
- Repeated dashboard items.

Card rules:

- Keep radius modest, around 8px unless the final design system says otherwise.
- Do not put cards inside cards.
- Do not use cards as the main structure for every page section.
- Keep card titles short and action-oriented.
- Include loading, empty, warning, and error states when implemented.

## Chart Patterns

Chart choices should match the question:

| Question | Preferred Pattern |
| --- | --- |
| Who is favored? | Probability bars or stacked probability display. |
| How do teams compare? | Side-by-side metrics, small multiples, or bar comparisons. |
| How do probabilities change over time? | Line chart with clear axis labels. |
| What are tournament outcomes? | Stage probability table, bracket view, or ranked bar chart. |
| Is the model calibrated? | Reliability chart and metric summary. |

Avoid:

- 3D charts.
- Decorative chart shapes.
- Pie charts for precise comparison.
- Too many colors in one chart.
- Unlabeled probability displays.

## Color Principles

- Use color to clarify meaning, not decorate.
- Reserve strong colors for selected states, alerts, or important comparisons.
- Use team colors carefully and only when they do not reduce readability.
- Provide non-color cues for status and chart meaning.
- Maintain accessible contrast for text, controls, and chart labels.
- Avoid green/red-only communication for probability or validation states.

## Accessibility Principles

- Meet WCAG AA contrast expectations where practical.
- Ensure keyboard navigation for all controls.
- Use visible focus states.
- Label charts, controls, tables, and icons clearly.
- Do not rely on color alone.
- Keep touch targets large enough on mobile.
- Provide meaningful empty and error states.

## Mobile-First Rules

- The main match prediction should be understandable on a phone without horizontal scrolling.
- Tables should collapse, stack, or become cards on narrow screens.
- Charts should have simplified mobile versions when needed.
- Navigation should stay reachable with one hand.
- Important probabilities and status indicators should appear before deep details.

## shadcn/ui Usage Guidance

shadcn/ui may be used later for accessible, customizable primitives such as:

- Buttons.
- Tabs.
- Dialogs.
- Selects.
- Tables.
- Tooltips.
- Accordions.

Guidelines:

- Use shadcn/ui as a foundation, not as the whole visual identity.
- Customize components to match the product's football analytics direction.
- Keep component behavior accessible.
- Avoid adding component packages before the web app phase requires them.
