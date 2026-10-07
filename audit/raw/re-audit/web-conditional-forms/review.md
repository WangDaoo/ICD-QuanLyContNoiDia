# Conditional W-S-001/W-S-002 fixture coverage

Nine actual production-component cases were mounted with an in-memory AppContext:

- ManifestsView with a DRAFT manifest: Master BL form (2 fields) and House BL form
  (6 fields).
- BillingView with an unpaid invoice: Record Payment form (2 fields), opened and
  canceled without submitting a payment.
- MasterDataView: Shipping Line (2 fields), Consignee (5 fields), Clearing Agent
  (4 fields), and Transporter (4 fields).
- ContainersView with an in-memory successful readiness result: inline Gate Pass
  form in Container 360 (3 fields).
- ContainersView create form with populated Manifest, MBL and HBL associations
  (9 fields). The fixture selects each level and proves child options exist.

Total: 9 cases and 37 field observations. Counts include repeated fields across
Master Data modes, so they are not a unique-control or whole-application total.

Each case checks the actual ModalOverlay native dialog element, open state,
aria-modal and accessible name; all current input/select/textarea label.control
associations; native label click forwarding to the associated enabled control;
programmatic focusability including the read-only shipping-line input; actual
Shift+Tab/Tab wrap callbacks; native cancel event callback; body and app-content
scroll lock and restoration; retained view content; and focus restoration to the
opener. No form is submitted and all write methods/fetch throw if reached.

One source gap was reported during fixture preparation: the existing ARIA-named
Container-create shipping-line, consignee, Manifest, MBL and HBL fields had plain
unassociated labels. The web semantics agent added id/htmlFor pairs while keeping
ARIA names. This reviewer made no application source changes after releasing the
Billing payment fix. The mounted Container association case now checks all nine
visible fields, including those five.

Evidence: tests.txt and coverage.json in this directory; executable script is
audit/tools/conditional-forms-independent-review.test.mjs.

Run: node --import ./audit/tools/runtime/node_modules/tsx/dist/loader.mjs --test
audit/tools/conditional-forms-independent-review.test.mjs

Environment limits: this is jsdom, not native browser/CUA verification. Native
showModal/close are modeled; initial focus uses the production focusableControls
helper and a modeled native-focus step. getClientRects is modeled because jsdom
has no layout. Tests dispatch the cancel event that Escape normally produces;
they do not claim a browser Escape-default or top-layer test. Native label click
forwarding is checked, while focus after label activation is verified separately
with control.focus because jsdom does not implement every browser focus default.
The root owns the native shared-modal verification. The first local harness run
reported React legacy input-event errors because ReactDOM initialized before
jsdom; moving ReactDOM import after DOM initialization fixed the harness. Final
verification output is clean.
