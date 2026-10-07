# Audit tool preparation

Installed tools are recorded in `audit/tool-manifest.json`. Full command output,
working directory, UTC time, and exit code are in `audit/raw/baseline/tool-install-*.log`.
The application dependency files were not used for these installs.

## Sources and installs

| Tool | Installed or cached path | Pinned source commit |
| --- | --- | --- |
| Frontend Law Auditor | `C:/Users/quang/.codex/skills/frontend-law-auditor` | `6870ab3dc654ff6f879ef8fdee8d5fc085b6e507` |
| Mobile UX Audit | `C:/Users/quang/.codex/skills/mobile-ux-audit` | `a80d8c1de20ab51a5dffbf274dc13acf47c49baa` |
| kz-skills full source | `audit/tools/kz-skills-source` | `ca77ea4be13dc1405d18d0671e4696ecd91c3e62` |
| Ledger Lumen source | `audit/tools/lumen-source` | `efafe93739bce351735b7b20fd2a2cf18424f099` |
| UX Gap scoring rubric | `audit/tools/reference/laststance-skills/skills/ux-gap-detector/scoring-rubric.md` | `66d87e7906a9584d193fa32b91b9e1c3a6232743` |

The law and mobile repositories were installed from their full roots using the
official Codex skill installer with `--path . --name <name> --ref <commit>`.
Existing destinations were checked first; none of these installations overwrote an
existing skill. All supporting references, scripts, templates and hidden repository
files included in the download were preserved.

All eight kz sibling skills are direct children of `C:/Users/quang/.codex/skills`:
`kz-askcard`, `kz-crew021`, `kz-engrules`, `kz-loopfix`, `kz-reflect`, `kz-skill`,
`kz-uicheck`, and `kz-uiuxrule`. Relative sibling references remain valid. The child
`ui-glance` stays under `kz-uiuxrule/skills/ui-glance`. The full pinned source also
preserves repository-wide documentation and license files.

Lumen and laststance are shallow reference checkouts. Their dependencies were not
installed. Lumen is a design-system reference, not an executable UI audit tool.
Tamagui is not applicable: the application package manifests contain no Tamagui dependency.

## Runtime

`audit/tools/runtime/package.json` has exact dependencies, with the transitive
resolution recorded in its own `package-lock.json`:

| Dependency | Exact version |
| --- | --- |
| axe-core | 4.13.0 |
| lighthouse | 13.5.0 |
| playwright | 1.63.0 |
| tsx | 4.23.15 |
| web-vitals | 6.2.2 |
| colorjs.io | 0.7.1 |

Prepared with Node `v24.13.0`, npm `11.6.2`, Python `3.12.0`, and RTK `0.37.1`.
No browser download, browser launch, application test, audit, or business write was
performed by the preparation agent. Put Node harness scripts inside the runtime
folder so bare imports resolve to these isolated modules, or use explicit module
paths. The installed CLI paths are:

- Playwright: `audit/tools/runtime/node_modules/playwright/cli.js`.
- Lighthouse: `audit/tools/runtime/node_modules/lighthouse/cli/index.js`.
- tsx: `audit/tools/runtime/node_modules/tsx/dist/cli.mjs`.
- axe browser bundle: `audit/tools/runtime/node_modules/axe-core/axe.min.js`.

### Offline CSS Color4 contrast

`audit/tools/runtime/contrast-offline.mjs` processes already captured DOM evidence.
It does not read or drive a browser. Usage:

```powershell
node 'audit/tools/runtime/contrast-offline.mjs' --input 'audit/raw/contrast-measurements.json' --output 'audit/raw/contrast-results.json'
```

Input is an array, or `{ "measurements": [...] }`. Each item accepts `id`,
`selector`, `text`, `foregroundRaw`, `backgroundLayers`, `fontSizePx`, `fontWeight`,
and `disabled`/`ariaDisabled`. Background layers are ordered nearest to outermost,
and are color strings or objects containing `colorRaw`, `backgroundImage`, and
`opacity`. Supply optional `canvasRaw` only for a measured opaque canvas.

The output includes full-precision ratio, singleton `ratioRange`, composited sRGB
colors, required ratio, and PASS/FAIL/UNKNOWN/EXEMPT status. It parses OKLCH and
other CSS Color4 colors using [Color.js](https://colorjs.io/docs/the-color-object.html),
then uses its explicit [WCAG21 algorithm](https://colorjs.io/docs/contrast.html).
Alpha source-over compositing is performed over the supplied solid backgrounds.
Normal text uses 4.5:1; large text uses 3:1; inactive controls are exempt, following
the [W3C contrast criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Missing font size uses a documented conservative normal-text threshold.

Unsupported syntax, unresolved colors, gradients/images, CSS group opacity,
blend/filter effects, missing opaque backing, and out-of-sRGB-gamut colors return
UNKNOWN with a reason and no numerical ratio. Nothing silently defaults to white.
The mathematical fixture suite passed 11/11. It covers black/white (21), neutral
OKLCH (6), translucent text (3.976653...), layered surfaces (5.280822...), unknown
and gradient handling, disabled exemption, large-text threshold, and group opacity.

## Verified Frontend Law workflow

The Python CLI is stdlib-only. Its supported arguments are `--init-template`,
`--input`, `--output`, `--json-out`, `--strict`, and `--fail-threshold` (default 85).
`--help` was run and preserved as `tool-install-law-help.log`.

```powershell
python 'C:/Users/quang/.codex/skills/frontend-law-auditor/scripts/law_audit.py' --init-template 'audit/raw/law-evidence-template.json'
python 'C:/Users/quang/.codex/skills/frontend-law-auditor/scripts/law_audit.py' --input 'audit/raw/law-evidence.json' --output 'audit/raw/law-report.md' --json-out 'audit/raw/law-results.json'
```

These commands are examples for the audit owner, not commands run during setup.
The initialized template contains illustrative values. Replace them with measured
evidence, and omit unavailable metric keys: missing data is `unknown`, not a pass.
The CLI evaluates 10 fast gate checks and 21 law principles. Weighted scores use
pass=1, fail=0, unknown=0.4. Strict mode returns 2 for a failed fast gate or score
below the threshold. Its implementation does not independently reject every
unknown; missing evidence must remain explicit in the report.

## Selected Mobile workflow

Use the installed `playbook/ux-audit-playbook.md` directly in Codex. It defines:
configuration, stack detection, path inventory, optional navigation tracing,
checklists, severity/effort, and reporting. For more than about 10 screens or 40 UI
files, use batch mode and append findings to an on-disk ledger. Each finding needs
file:line or screenshot evidence and a confidence tag (`verified`, `likely`, or
`needs-runtime`). The report template is `templates/audit-report-template.md`.

The skill's agent arguments include `--screens`, `--batch`, `--trace`, `--tickets`
and `--fix`; this audit is report-only. The standalone Node CLI was reviewed as
source only. It calls the Claude API for normal audits and for screenshot diff
`--analyze`. No CLI dependencies were installed and no Claude API call was made.

## kz rules and checks

Review mode and scope are already authorized. Read
`C:/Users/quang/.codex/skills/kz-uiuxrule/rules/INDEX.md` to select relevant rule
sections and cite rule IDs with measurements. Checks live in
`C:/Users/quang/.codex/skills/kz-uicheck/checks/` and run sequentially on a settled,
painted page. Layout requires wide, narrow, and 375px touch-emulated views.

The eight upstream files are `layout-audit.js`, `table-check.js`, `typing-check.js`,
`popover-check.js`, `contrast-check.js`, `modal-check.js`, `focus-check.js`, and
`form-check.js`. Interactive scripts require review before use under the no
business writes constraint: typing dispatches input and Enter; form checks call
`requestSubmit()`; modal and popover checks synthesize clicks. Source comments
attempt to prevent or restore some effects, but application handlers can still
receive events. Use safe control selection and a mutation-blocking audit harness,
or mark an unsafe check as not run. Never infer native app results from DOM checks.

## UX Gap rubric caveat

The cached primary-source rubric scores Typography & Spacing, Interactive States,
Content Hierarchy, and Loading & Error UX on 0-25 each (overall 0-100). Its final
GitHub issue-priority table lists 0-49, 50-74, and 75+ "in any dimension", which
conflicts with the stated maximum 25. Preserve this as an upstream ambiguity and
use the explicit per-dimension verdict bands and overall verdict table; do not
invent a normalization or silently apply that issue-priority table.

## Read-only feasibility artifacts

`audit/raw/baseline/web/kz-check-feasibility.json` records exact source hashes,
line anchors, mutation flags, limitations, and axe prerequisites for all eight kz
checks. Only table/layout have unchanged-source read-only wrappers:
`audit/tools/kz-readonly-table-check.js` and
`audit/tools/kz-readonly-layout-audit.js`. They capture console output lexically
and alias native Number parsers locally, without writing globals or the page.
Both passed offline syntax checks; they have not been run in a browser. Unsupported
CUA APIs return UNKNOWN. The other six originals and axe are recorded as not run
under read-only evaluation; no passing results are inferred.

`audit/tools/lumen-token-reference-notes.md` documents current web/native role,
spacing and typography comparisons against the pinned Lumen source. It is a
semantic reference only, without design-system adoption.
