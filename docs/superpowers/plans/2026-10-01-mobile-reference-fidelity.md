# Mobile reference fidelity implementation

1. Add regression cases for separate Lookup/Survey tabs, yard permissions and OPERATOR navigation. Run them before implementation.
2. Add ThemeProvider (LIGHT default), dynamic styles, compact shared fields/cards and lucide native icons. Replace fixed DarkTheme in App.
3. Implement compact header/session card, header account/notification routes and business-only bottom navigation.
4. Add YardHome/SurveyHome using canonical container, slot and inspection APIs. Preserve assignment context token, gate truck IDs and signed QR verification.
5. Replace gate page-switch buttons with segmented controls; compact receipt fields and task/search views.
6. Run `pnpm --filter @icd/mobile test`, `pnpm --filter @icd/mobile typecheck`, and Expo web export. Inspect all five tabs at 390/360 px, both themes; save screenshots and correct visible defects.

Work in the existing dirty workspace; no reset, unrelated edits or commit. User selected the source and requested correction; execute inline without further approval gates.

Completed 2026-10-01: all six steps executed. Final checks: TypeScript passed, 20/20 tests passed, Expo web export passed. Browser verified the five tabs, light/dark, 360/390px forms and OPERATOR hidden command routes. Real gate-in → assignment → movement → inspection workflow verified by API reads. Independent review findings resolved, including operation detail state reuse. Evidence and limitations: `test-artifacts/2026-10-01-mobile-fidelity/REPORT.md`.
