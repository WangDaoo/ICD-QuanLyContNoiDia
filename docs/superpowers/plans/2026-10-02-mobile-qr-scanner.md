# Mobile QR Scanner Implementation Plan

> Execute inline in the existing authorized workspace, preserving the live uncommitted application. User requested implementation and Expo Go emulator testing; no new worktree or commit is needed.

**Goal:** Deliver a usable shared native scan viewfinder and test it in Pixel Android Emulator with Expo Go.

**Architecture:** Shared CodeScanner owns camera UX and single-result session lifecycle. Gate feature components own existing parsing/search/validation API flows. Camera stops when hidden, unfocused or backgrounded. Existing Metro 8081 serves native and browser previews; SDK/ADB forwards the backend on port 3000.

**Tech Stack:** React Native TSX, Expo Camera 57, existing lucide icons, safe-area context, Node regression harness, Android SDK Pixel AVD, Expo Go 57.0.9.

- [x] Write failing `apps/mobile/tests/code-scanner.test.cjs` actual-component tests for permission, frame controls, QR versus container types, invalid code staying open, duplicate callbacks, stale callbacks after close/blur, torch reset and mount error/retry.
- [x] Add `apps/mobile/src/components/CodeScanner.tsx` and focused `scanner-code.ts` for scan normalization. Expected contract: `visible: boolean; focused: boolean; mode: 'CONTAINER' | 'GATE_PASS'; onClose(): void; onScan(value: string): void`. Container extraction uses `/\b[A-Z]{4}\d{7}\b/`; Gate Pass preserves trimmed original case and requires `gp1.`. Native `CameraView` props include `facing="back"`, `enableTorch`, `onCameraReady`, `onMountError` and supported barcode types. Scan callback locks synchronously before calling parent.
- [x] Replace local expo-camera permission/preview blocks in `GateInReceipt.tsx` and `GatePassScanScreen.tsx` with shared modal. Scan button opens UI on web with honest fallback. Existing `search` and `handleScan` remain actual API boundaries and close modal on result. Do not trigger Gate writes.
- [x] Run `pnpm --filter @icd/mobile test`, `typecheck`, scoped ESLint and Expo Android export. Save logs and inspect failure output before claiming success.
- [x] Verified backend and used existing Metro 8081 with exp://10.0.2.2:8081 in Expo Go. The separate Metro startup and later Metro port forwarding were rejected by automatic review. User explicitly authorized SDK/ADB after Windows emulator control was denied. Tested actual camera QR decoding, real backend rejections, native permission dialog/Settings return, foreground/background camera release, torch toggle/manual fallback, 140% font and reduced-height display. Saved evidence and restored display/font/scene settings.
- [x] Review requirements and final modified files, rerun checks after any repair, update checklist, write audit report and leave emulator showing completed scanner UI.

