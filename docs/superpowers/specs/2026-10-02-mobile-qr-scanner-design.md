# Mobile QR Scanner Design

The user approved building the missing scanner UI (corner guides, dimmed mask, instructions, torch and permission states) and testing it in Android Emulator through Expo Go. This implements the existing Mobile Spec camera viewfinder and preserves the terminal layout and backend checks.

## Approach

Use one reusable modal scanner for container labels and Gate Pass QR. A full screen camera modal provides a larger target and avoids competing previews; an inline card would be cramped, while a separate navigation stack would duplicate Gate permissions and form state. Keep the existing manual input form as fallback.

## Interface and behavior

`CodeScanner` accepts visibility, parent focus, mode CONTAINER/GATE_PASS, onClose and onScan. Header displays a Vietnamese title and close button. Camera area has a dimmed outer mask, four high-contrast corner guides, scan line and concise mode-specific instructions. Footer provides torch and manual-entry buttons with at least 44-point targets. Insets protect system controls.

Native rear camera reads QR, with Code128/Code39 additionally enabled for container labels. It runs only while modal is visible, parent focused and app foreground. A synchronous lock handles one result per session; closing or backgrounding resets torch and prevents callbacks from old sessions. Blank or wrong-kind codes show an actionable error inside the scanner. Mount errors have retry and manual entry. Denied permission explains retry versus opening settings. Camera readiness has a visible loading state. Browser renders the same frame with a clearly labeled unavailable-camera explanation, never a fake preview or fake scan.

Container scans use the existing ISO-shaped extraction before passing a container number to the search flow. Gate Pass scans keep the complete case-sensitive `gp1.` token; authenticity, expiry, status and readiness stay backend-owned. Scan never confirms gate-in or gate-out automatically. The generic header continues to select the permission-appropriate Gate workflow.

## Integration and validation

Replace only the inline camera blocks in GateInReceipt and GatePassScanScreen. Keep existing Gate backend routes and manual inputs. Test shared scanner event/lifecycle behavior and supported code types with the actual TSX component harness. Run full mobile tests, typecheck, scoped lint and native export.

Use existing Pixel AVD and installed Expo Go 57.0.9 for SDK 57. The separate Metro startup was rejected by automatic review, so validation used existing Metro 8081 via exp://10.0.2.2:8081. After explicit user authorization for SDK/ADB, backend port 3000 was forwarded to the host. SDK camera pose controls and imported local QR fixtures exercised real camera decoding. Inspect native UI, camera permission/readiness, frame/torch/fallback/close, successful and invalid scans, backend error presentation and focus lifecycle. Record limitations and screenshots/logs in test-artifacts/2026-10-02-mobile-qr-scanner. No migration, reseed or Gate transitions were needed.

Native testing added immediate pausePreview on background/window blur, manual close and accepted result, since Android can defer React rendering. Settings return refreshes the permission getter. Header/preview/footer scroll on reduced-height screens. Container input retains the scanned code and shows search errors next to it. A backend GATE_PASS_TOKEN_INVALID business 401 is surfaced without treating it as an expired user session; ordinary authentication 401 handling remains intact.
