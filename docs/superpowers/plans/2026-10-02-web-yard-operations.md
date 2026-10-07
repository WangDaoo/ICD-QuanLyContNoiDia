# Web Yard Operations Implementation Plan

> **For agentic workers:** Use subagent-driven-development for independent modules; root integrates and verifies the running page.

**Goal:** Render a demo ICD site plan with actual yard locations, consistent Legend colors, manual assignment and backend-connected operation controls; show the slot algorithm as “Đang trong quá trình phát triển”.

**Architecture:** A site-plan component renders decorative roads/buildings and only real backend blocks/slots. A shared yard-model helper owns location geometry and color keys; Legend and slot rendering use the same palette. Existing AppContext remains the command/data boundary, with canonical DTO maintenance and coordinate labels preserved.

**Tech Stack:** React TSX, Tailwind, existing API client, Node/tsx tests, Vite and browser UI verification.

## Acceptance and steps

- [x] Read the seven v1.7 specifications and the prior yard color design. Basic slot mode uses empty white, occupied blue, maintenance gray. Lifecycle mode labels actual backend states; Hold overlays include active operational holds and completed inspection HOLD. Gate pass issued never implies readiness.
- [x] Write failing helper regressions for shuffled/sparse Row–Bay–Tier coordinates, alphanumeric labels, empty/maintenance colors, occupied visit-ID matching and Hold precedence. Run before implementation, then pass them.
- [x] Correct DTO mapping in `apps/web/src/services/mappers/icd-view.mapper.ts` and coordinate types in `apps/web/src/types.ts`: MAINTENANCE or closed block is nonoperational; retain coordinate labels rather than coercing to 1. Add mapper regressions.
- [x] Create `apps/web/src/components/yard/yard-model.ts` and `YardSiteMap.tsx`. The demo frame contains gates, roads, warehouse, inspection and all configured blocks; sparse positions remain missing, never synthetic live slots. Provide block selection, layer/stack view, search, legend and slot details.
- [x] Replace the old MAP and algorithm-only ASSIGN sections of `apps/web/src/components/YardView.tsx`. Remove recommendation fetching entirely from this page. Keep manual Block/Row/Bay/Tier selection and invoke the real assignment command. Use current user permissions to guard configure/update/move/booking actions.
- [x] Create `YardOperations.tsx` for movement/booking create, start, complete and cancellation with visible errors, pending state, cancel reasons and local scheduled times. Every write uses existing backend commands; completed movement refreshes source/destination occupancy. Booking completion captures actual package/weight fields where required by backend.
- [x] Run web typecheck, targeted lint and `pnpm --filter @icd/web build`. Review new helpers, mapper and UI for spec coverage.
- [x] Test the running page at 5173, with API ready at 3000, using dedicated QA records only. Capture the old map, new site map, all blocks/tiers, slot detail, manual assignment unavailable algorithm, validation errors and movement/booking lifecycle. Read API state after commands and after page reload. Preserve existing Hold QA record.
- [x] Check small-width layout for overflow and popup usability. Save screenshots plus `test-artifacts/2026-10-02-web-yard-audit/REPORT.md` with precise passes, limitations and spec references. Keep the finished web page open.

## Verified result

62 frontend/helper/client tests and 36 backend tests pass. The final evidence package contains 39 screenshots and 16 persisted API/DOM invariant groups. Live optional booking measurements remain null when untouched. Canonical nested list pagination and backend error messages are also repaired.

ST-04 (Stripped) conflicts with the current six-state Database/API lifecycle; ST-05 bulk booking and IN-03 PDF attachments remain documented gaps. No synthetic state, schema migration or seed changes were made for this focused yard-page task. Broad legacy lint is not claimed clean.

## Scope

The site plan is a visual demo, not maritime terminal/quay operations or geographic coordinates. No optimized slot scoring, mock KPI/occupancy, invented dangerous/reserved metadata, database migrations or reseeding. Existing backend/mobile recommendation endpoints remain available outside this requested web page.
