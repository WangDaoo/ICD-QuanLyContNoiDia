# Mobile Yard Alignment Implementation Plan

> Execute independent assignment and grid work in parallel; root owns integration, runtime, browser QA and final review. The user approved these changes with “bắt đầu xử lý”.

**Goal:** Keep the approved mobile terminal layout and light/dark themes while fixing manual assignment availability, organizing actual slot coordinates and showing Hold/active inspection consistently with web.

**Architecture:** Yard API remains the command boundary. Small pure helpers cover assignment loading/selection and yard geometry/appearance. The mobile grid groups real slots by Block/Row/Bay/Tier with a layer filter and slot details; YardHome and Monitor load actual inspection/permission-scoped Hold context. No recommendation suspension on mobile, new lifecycle enum, migration, reseed or bulk/PDF work.

**Tech stack:** Existing React Native/Expo TSX, TypeScript, Node/CJS regression tests, real local API at 3000 and mobile preview at 8081.

## Tasks

- [x] Assignment: write a failing regression where recommendations reject but catalog resolves; manual loading/check/assign must remain available. Modify `apps/mobile/src/features/yard/screens/YardAssignmentScreen.tsx` and add a focused helper/test. Keep recommendation attribution for recommended choices; manual writes use source `MANUAL`. Recheck selected visit/slot and invalidate checked tuples on changes. Surface independent load errors and retry controls.
- [x] Grid/model: extend only the YardSlot type in `apps/mobile/src/features/yard/api/yard.api.ts` with actual coordinate/operational/reefer/maxWeight fields. Write failing sparse/alphanumeric geometry and palette/Hold/inspection precedence tests. Replace `components/YardSlotGrid.tsx` with selectable Block and Tier, actual Row×Bay cells, no fabricated slots, shared Legend/slot appearance and accessible slot details. White empty, blue occupied, gray maintenance, cyan empty reefer, red Hold, yellow active inspection. Keep readable light/dark variants.
- [x] Inspection list: distinguish completed HOLD/FAIL/PASS and in-progress inspection in `SurveyHomeScreen.tsx`; keep canonical status and explanatory result labels. Test a pure display helper before implementation. No request/body/business changes.
- [x] Root integration: load slot catalog, inspection context and readable Holds in a focused snapshot helper, preserving exact Visit IDs. Inspection/hold enrichment failure should warn and preserve catalog, never invent status/readiness. Add stale-response protection to YardHome/Monitor refresh. Grid selection fills only an available target after the user chooses a Visit and has the action permission; occupied slot details link to actual container when permitted.
- [x] Verification: mobile full tests, typecheck and targeted lint; independent review of source/contracts. Start/check API then 8081 preview. Test real QA data, all blocks/tier combinations, Hold detail, light/dark, narrow view, manual slot checking, assignment/movement and inspection color transitions. Save screenshots and API verification under `test-artifacts/2026-10-02-mobile-yard-alignment/`; restore viewport and keep final mobile page open.

## Acceptance boundaries

The five mobile tabs and terminal layout remain. Suggestions stay consistent with the current Mobile Spec; manual assignment works when suggestions fail. Every critical write requires online permission and backend confirmation. Active Holds stay intact. Business/database conflicts for Stripped and unsupported PDF/bulk booking remain outside these approved changes.
