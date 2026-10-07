# Lumen cross-platform token reference

Lumen is a reference at commit `efafe93739bce351735b7b20fd2a2cf18424f099`.
Its React and React Native rules expose the same background, text, border, status,
and interaction roles. These notes compare meanings; no package, preset, font,
palette, or component was adopted. The application conventions remain the audit
baseline. Sources: [React rules](https://github.com/LedgerHQ/lumen/blob/efafe93739bce351735b7b20fd2a2cf18424f099/libs/ui-react/ai-rules/RULES.md)
and [React Native rules](https://github.com/LedgerHQ/lumen/blob/efafe93739bce351735b7b20fd2a2cf18424f099/libs/ui-rnative/ai-rules/RULES.md).

| Application role | Lumen comparison role | Audit use |
| --- | --- | --- |
| Mobile `background`; web page backdrop | background `canvas` | Compare page versus content-surface hierarchy. |
| Mobile `surface`, `surfaceSubtle`, `chrome`; web white/slate containers | `base`, `surface`, `canvas-sheet` | Compare separation by semantic purpose; shades are not equivalent. |
| Mobile `textPrimary`, `textSecondary`, `textMuted`; web slate text utilities | text `base`, `muted`, `muted-subtle` | Compare primary, secondary and supporting emphasis across platforms. |
| Mobile `border`, `borderDark`; web slate borders | border `base`, `muted` | Compare normal boundaries and stronger separation. |
| Mobile `primary` / `info`; web blue actions | `interactive` or `accent`, plus `on-interactive`/`on-accent` | Distinguish action meaning from brand emphasis; measure actual foreground/background pairs. |
| Mobile `success`, `warning`, `danger` and matching backgrounds | status `success`, `warning`, `error`, with on-color text | Compare status semantics and readable pairings, not Ledger brand colors. |
| Disabled/hover/pressed/focus states | dedicated state tokens | Check whether states are distinguishable; token existence does not prove rendered state quality. |

Current source: `apps/mobile/src/theme/colors.ts:1` defines light and dark semantic
palettes. Web `apps/web/src/index.css:1` imports Tailwind and components such as
`apps/web/src/components/AuditsView.tsx:20` use white/slate/blue utility classes.
This does not establish an app-wide web token layer or rendered contrast values.

Mobile spacing is 4/8/12/16/20/24/32 (`spacing.ts:1`), all present in Lumen's
[spacing primitives](https://github.com/LedgerHQ/lumen/blob/efafe93739bce351735b7b20fd2a2cf18424f099/libs/design-core/src/lib/themes/js/primitives/primitives.others.ts).
Mobile radii are 4/6/8/12/16/full (`spacing.ts:11`), while Lumen uses
0/4/8/12/16/24/32/full. The 6px application radius is a project convention, not an
audit defect. Lumen's utility numbers map directly to pixels (`p-16` means 16px);
the application's Tailwind utilities use their own scale (`p-4` is not Lumen's
4px). Compare measured pixels rather than matching class spelling.

Mobile typography uses 24/20/16 headings, 13 body and 11 caption, with platform
monospace for codes (`typography.ts:3`). Lumen's
[medium typography roles](https://github.com/LedgerHQ/lumen/blob/efafe93739bce351735b7b20fd2a2cf18424f099/libs/design-core/src/lib/themes/js/typographies/typography.md.ts)
use 16/14/12/10 body sizes and Inter-based role tokens. Use this reference for
hierarchy and consistent role application. An 11px caption or 13px body is not a
defect merely because the reference uses a different scale; readability and font
scaling require application evidence. Lumen's required Inter font is a consumer
setup requirement, not a requirement for this application.

Phase 0 use: compare semantic roles, spacing cadence, state coverage, typography
hierarchy, and separate theme evidence across web and native. Do not map web DOM
checks to native app passes. Lumen is not an audit engine, and no Lumen runtime
dependencies were installed.
