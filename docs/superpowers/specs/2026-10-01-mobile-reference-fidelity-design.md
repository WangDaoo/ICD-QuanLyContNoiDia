# Mobile reference fidelity correction

User selected `dựng (2)/src/components/MobileTerminalView.tsx` on 2026-10-01. Implement its layout in React Native TSX while preserving the integrated API workflows.

- Default LIGHT; header theme toggle switches every visible screen, card, field and navigation bar to DARK.
- Compact TOS-MOBILE header, role badge, account, scan and notifications actions. Session card shows authenticated account and locked role, without demo persona switching.
- Business navigation order: Cổng, Bãi, Giám định, Tra cứu, Việc ca. OPERATOR uses Việc ca, Tra cứu, Monitor. Backend permission codes determine access and every write action.
- Gate uses blue/green Gate-In/Gate-Out segmented controls and compact receipt form, paired fields and actual ARRIVED truck context.
- Yard uses stacking form and four-column actual slot overview; lookup is a separate screen. Inspection uses a dedicated report form and real inspection commands.
- Reference spacing: scroll padding 14, card padding 14, radius 12, small labels, line icons, white/slate light palette and slate dark palette. Account and notifications are header routes.
- Do not restore sample identifiers, fake role switching, fake photos/GPS, local success fallbacks, RFID/PIN login or fabricated operations.

Validation: permission navigation regressions, existing mobile tests, typecheck, Expo web export and browser visual checks at 390/360 px in both themes. Save screenshots and document differences required by actual backend contracts.
