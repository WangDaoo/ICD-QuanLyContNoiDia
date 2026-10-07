# Independent source review: approved mobile fixes

Date: 2026-10-03
Scope: M-001, M-002 and M-003 only. Read-only application review; this report is the only review artifact written. No device interaction, API calls, account creation or business submissions.

Verdict: ACCEPTED at source and regression-fixture level. No material regression or out-of-scope redesign found in the three supplied fix units. Native measurement acceptance is independently owned by the root reviewer.

## Integrity and reviewed evidence

- Read `audit/fixes/mobile/fix-log.json` and the M-001/M-002/M-003 delimited diffs. Shared-file changes are duplicated between units as disclosed in the log; they are not three independent implementation sets.
- Verified SHA-256 against every recorded before snapshot: 21 checks, zero mismatches.
- Verified current after hashes for 15 unique production files and the existing scanner integration test: 16 checks, zero mismatches. Read the new `priority-accessibility.test.cjs` independently.
- Reviewed shared target styles, header layout, scanner target changes, yard block/tier/detail target changes, palette consumers, zero-tab navigation, authenticated root route registration and existing Account logout confirmation.
- Independently executed `rtk test node --test tests/priority-accessibility.test.cjs` in `apps/mobile`: exit 0, seven focused fixtures pass.
- Read saved full verification: `mobile-tests-green.txt` records 132 tests, 132 passes, zero failures; `mobile-typecheck.txt` records exit 0; `mobile-diff-check.txt` records exit 0. These full checks were not rerun by this reviewer.
- Visually inspected saved native images `26-320-gate-light.png`, `30-320-picker-light.png` and `34-320-logout-dark.png` in `audit/screenshots/re-audit/mobile`.

## Findings resolved

| Finding | Source acceptance and anchors | Verification limit |
| --- | --- | --- |
| M-001: touch targets | `AppHeader.tsx:24` selects a column layout below 480dp or above font scale 1.2; action row wraps, retaining every existing action. `AppHeader.tsx:46`, `PrimaryButton.tsx:94`, `ScreenLayout.tsx:57`, `SelectField.tsx:20`, `ActionDialog.tsx:19`, `CodeScanner.tsx:442` and `YardSlotGrid.tsx:180` use 48dp minima. Gate labels can shrink/wrap inside their enlarged targets. Saved 320dp/150% images show header actions, picker dismissal/rows and logout controls without overlap or inaccessible action text. | Fixture assertions check style minima, not native geometry. Root must evaluate actual XML bounds and disclosed partial viewport clips. |
| M-002: semantic colors | `colors.ts:7` and `colors.ts:18` separate status foregrounds from filled-button colors. `PrimaryButton.tsx:42` uses dangerButton with onDangerButton. `StatusBadge.tsx:32`, `SessionCard.tsx:14` and `ScreenLayout.tsx:42` consume semantic foregrounds. Gate-Out uses successButton with a white label. Both palettes preserve bright dark-theme status text while using dark enough filled-button backgrounds. | Focused fixtures calculate WCAG contrast for all six badge variants, danger fill, session status, success notice and selected Gate-Out in both palettes. Root independently checks exact rendered RGB pairs. |
| M-003: permission fallback | `MainTabNavigator.tsx:26` opens Account from the authenticated Main screen. `ForbiddenScreen.tsx:26` adds an optional action and administrator-access explanation. `RootNavigator.tsx:52` registers Account inside the authenticated branch without a tab-permission guard. Existing `MoreScreen.tsx` retains cancel/close/confirm logout behavior. No permission expansion or forced logout is introduced. | The fixture proves the action callback and controlled logout branches. A real zero-tab account was unavailable; full native zero-tab traversal remains explicitly unverified. |

## Scope and regression assessment

The production diffs alter target minima, responsive header placement, semantic color roles and an optional permission-fallback exit. Existing business handlers, scanner API flow, selection behavior, permission checks and modal busy-dismissal protection are retained. No API DTO, endpoint, payload, backend source or business submission changes appear in these fix units.

The saved audit baseline is left unchanged. Existing lower-priority issues, including unrelated screen-reader semantics or other text truncation, were not promoted into this approved-fix review.

No additional source fixes requested. Acceptance is bounded to the named findings and reviewed artifacts; it is not a whole-app accessibility certification.
