# W-S-005 billing payment re-entry

Scope: approved P1 financial Record Payment path in BillingView only. The reviewed
Truck Visit, Partner, Handover and EDI pending subcases remain P2 and were not changed.

Root cause: handleRecordPayment awaited recordPayment without synchronously marking
the request in progress. Two submit events in the same React batch issued two
distinct command attempts. A same-batch cancellation could also close the form.

Change: a paymentPending ref guards submit, invoice selection, edits and closure
before React commits. isPaying provides native disabled controls, aria-busy and
pending submit text. Unsuccessful results and exceptions appear in a role=alert
message without clearing the amount, method, selected invoice or dialog. finally
releases the ref and pending state so a deliberate retry can proceed. Success
retains the existing alert and closes the payment dialog.

Evidence:

- red.txt: original source failed all four cases. Repeated submit invoked 2 commands
  instead of 1; cancellation closed the form; result error had no inline feedback;
  a rejected command escaped the handler.
- green.txt: four real React 19/jsdom interaction cases pass, including the
  W-S-001 ModalOverlay integration and same-batch native cancel event.
- typecheck.txt: pnpm --filter @icd/web typecheck exited 0.
- audit/fixes/W-S-005/before/BillingView.tsx is an exact-byte copy with baseline
  SHA256 1F033639CFAC6B4B9EEEBEAEE8E2806A3B71387F8DEF69D7D7BA515BD7FBBA28.
- audit/fixes/W-S-005/after/BillingView.tsx captures the W-S-005 change before
  W-S-001/W-S-002 integration, with SHA256
  7C819A293E94F1120CF53E8C7D8A7538A7D83943E1D40DA818A04BCB81D9735F.
- audit/fixes/W-S-005/change.diff records only this payment change.

Reproduce: node --test audit/raw/re-audit/billing/billing-payment.test.cjs

Acceptance:

1. Exactly one command on repeated submit while deferred, including before React
   commits: PASS_FIXTURE.
2. Payment pending feedback, disabled fields/cancel/submit and guarded same-batch
   edits/cancellation: PASS_FIXTURE.
3. Recoverable failed result and thrown exception preserve values and form; retry
   issues one new command after settlement: PASS_FIXTURE.
4. Successful fixture result closes the payment form: PASS_FIXTURE.

Limits: the fixture compiles and renders the actual BillingView with real React
and jsdom, while substituting useApp with in-memory recordPayment promises. It
does not load AppContext or send a payment request. fetch throws if reached.
Native dialog showModal/close are shimmed to model open state because jsdom does
not implement the browser top layer. No backend acceptance, double charging,
idempotency or concurrent transaction outcome is claimed. Real-browser payment keyboard behavior remains to be checked
by the root integration audit after the W-S-001 dialog wrapper is applied.

BillingView ownership was released to the web semantics agent after the four
green tests. That agent was instructed to preserve closePaymentModal and pass
isPaying as the dialog pending prop. AppContext and backend code were not edited.
