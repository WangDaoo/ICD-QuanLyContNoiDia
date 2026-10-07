# Web static UI/UX audit batch

Report-only source review. Browser interactions, live mutations and tests were not performed by this agent.

Coverage: 65 source/test/CSS files extracted; 21 active View component files and 18 sidebar destinations; 282 JSX controls. Source IDs are W-S; runtime UNKNOWNs are separate.

## Findings

| ID | Priority | Category | Finding |
|---|---|---|---|
| W-S-001 | P1 | accessibility | Most operational dialogs do not establish modal keyboard behavior |
| W-S-002 | P1 | accessibility | Visible sibling labels are not associated with operational fields |
| W-S-003 | P1 | accessibility | Five master/detail lists use pointer-only clickable div cards |
| W-S-004 | P1 | states | Two create dialogs discard input before the save result arrives |
| W-S-005 | P1 | states | Payment and other asynchronous actions stay enabled while saving |
| W-S-006 | P2 | forms | Several required-field failures silently return and cannot identify the field |
| W-S-007 | P2 | accessibility | Role/permission buttons expose selection only through color |
| W-S-008 | P1 | microcopy | Gate Pass detail contradicts expiration and cancellation status |
| W-S-009 | P1 | states | Container 360 displays an icon where it promises a Gate Pass QR code |
| W-S-010 | P2 | states | Container Gate Pass tab calls unknown readiness a failed condition |
| W-S-011 | P2 | forms | Movement Order default expiry shifts the local clock by seven hours |
| W-S-012 | P2 | navigation | Work Queue handover review passes the wrong identifier kind |
| W-S-013 | P2 | navigation | Create Truck Visit shortcut drops its container context and opens no form |
| W-S-014 | P2 | navigation | Screen/context selections are memory-only and view changes discard work |
| W-S-015 | P2 | states | Several lists render a blank region for zero rows |
| W-S-016 | P1 | states | Nested load failures silently become empty holds, passes or incomplete details |
| W-S-017 | P1 | microcopy | EDI inspector calls generated example segments the raw transmitted payload |
| W-S-018 | P2 | states | Read-only page access still exposes write actions |
| W-S-019 | P2 | navigation | Notifications panel lacks Escape and outside-click dismissal |
| W-S-020 | P0 | states | Partner API log JSON bodies crash the whole web app |

## W-S-001 — Most operational dialogs do not establish modal keyboard behavior

**P1; accessibility; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** WCAG 2.1.1 / 2.4.3; kz N1. Nielsen H3, H4.

Create/edit overlays are fixed divs without a named dialog role, focus transfer, Tab containment, Escape handling or focus restoration. Container 360 has role/aria-modal/name but still has no focus mechanism. The modal panel can therefore open while keyboard focus remains on its opener outside the panel; aria-modal alone does not move or contain focus. Background scroll/click leakage must be measured separately. Yard dialogs are excluded because their source implements these behaviors.

Affected: Manifest create/MBL/HBL; Container create/360; Truck Visit create; Billing tariff/rule/order/payment; Gate Pass issue; Handover create; Master Data create; Users create; Partner create.

Evidence:

- `apps/web/src/components/TruckVisitsView.tsx:159` — Create overlay and panel are divs; component imports useState only and contains no focus/key handlers.
- `apps/web/src/components/BillingView.tsx:398` — Tariff overlay; same structure at 436,477,522.
- `apps/web/src/components/ManifestsView.tsx:373` — Create overlay; MBL 470 and HBL 514 are also plain div overlays.
- `apps/web/src/components/ContainersView.tsx:321` — Container 360 role/name exist; no focus/keydown implementation in file.
- `apps/web/src/components/ContainersView.tsx:897` — Create Visit plain div overlay.
- `apps/web/src/components/GatePassView.tsx:347` — Issue overlay.
- `apps/web/src/components/HandoversView.tsx:424` — Create overlay.
- `apps/web/src/components/MasterDataView.tsx:152` — Create overlay.
- `apps/web/src/components/UsersRolesView.tsx:146` — Create overlay.
- `apps/web/src/components/PartnerManagementView.tsx:151` — Create partner overlay.

Jakob → The overlay looks modal but does not follow expected modal keyboard conventions. → Use native showModal behavior or the existing project focus pattern, with scroll lock.

Illustrative local fix (not implemented):

```tsx
const dialogRef = useRef<HTMLDialogElement>(null);
useEffect(() => {
  if (!showCreateModal) return;
  const opener = document.activeElement as HTMLElement | null;
  const main = document.querySelector<HTMLElement>('.app-content');
  const overflow = main?.style.overflow ?? '';
  if (main) main.style.overflow = 'hidden';
  dialogRef.current?.showModal();
  return () => {
    if (main) main.style.overflow = overflow;
    if (opener?.isConnected) opener.focus();
  };
}, [showCreateModal]);
<dialog ref={dialogRef} aria-labelledby="truck-create-title"
  onCancel={() => setShowCreateModal(false)}
  className="m-auto w-full max-w-md rounded-xl bg-white p-6 backdrop:bg-slate-900/40">
  <h3 id="truck-create-title">Tạo Lịch hẹn Chuyến xe</h3>
  {/* Existing form and explicitly named Cancel button */}
</dialog>
```

Recheck:

- Open each overlay with keyboard; focus enters a meaningful enabled control.
- Tab and Shift+Tab remain in the modal; Escape closes when no write is pending.
- On close, focus returns to the opener; background neither scrolls nor receives clicks.

## W-S-002 — Visible sibling labels are not associated with operational fields

**P1; accessibility; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** WCAG 1.3.1 / 3.3.2 / 4.1.2; kz form check. Nielsen H4, H6.

Several form fields render label and input/select as siblings with no htmlFor/id relationship, no wrapping label and no aria-label/labelledby. Their nearby visible labels do not programmatically name those controls. The unambiguous examples below have no placeholder fallback either. Login, Gate-in and Yard wrapping labels are correct; Gate Pass receiver fields and Container master selectors already have aria-label and are not claimed unnamed.

Affected: Truck Visit form; Master Data forms; User form; Billing forms; Handover form; Manifest/MBL/HBL forms; Container create/inline Gate Pass/Hold forms.

Evidence:

- `apps/web/src/components/TruckVisitsView.tsx:188` — Plate visible label followed by unnamed input at 189; driver 200/201, phone 210/211, transporter 222/223 and container 232/233 also lack associations.
- `apps/web/src/components/MasterDataView.tsx:157` — Name label and input at 158; additional code/tax/phone/address/email follow same structure.
- `apps/web/src/components/UsersRolesView.tsx:151` — Name label/input at 152 and email 155/156.
- `apps/web/src/components/BillingView.tsx:532` — Payment amount label/input 533; payment method 543/544; tariff/rule/order fields likewise.
- `apps/web/src/components/HandoversView.tsx:433` — Transport code label/input 434 and three selects 444/445,460/461,475/476.
- `apps/web/src/components/ManifestsView.tsx:519` — HBL label/input 520, consignee 523/524, agent 527/528, description 531/532, numeric 536/537,540/541.
- `apps/web/src/components/ContainersView.tsx:686` — Inline Gate Pass labels/input 687,695/696,704/705; Seal 951/952 and weight 955/956.

Gestalt proximity / Jakob → Visual proximity implies a label relationship that assistive technology cannot use. → Make the native label relationship explicit.

Illustrative local fix (not implemented):

```tsx
<label className="block font-semibold text-slate-700">
  <span className="mb-1 block">Biển số đầu kéo *</span>
  <input type="text" required value={plate}
    onChange={(event) => setPlate(event.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase" />
</label>
{/* Apply the same wrapping label or htmlFor/id pair to each field. */}
```

Recheck:

- Inspect accessible names for every visible input/select/textarea; each must match its visible label.
- Click/tap a visible label and confirm the corresponding control receives focus.
- Do not add redundant ARIA to already correctly labelled native fields.

## W-S-003 — Five master/detail lists use pointer-only clickable div cards

**P1; accessibility; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** WCAG 2.1.1 / 4.1.2; kz focus check. Nielsen H3, H4, H7.

The record selectors are divs with onClick and cursor-pointer but no native interactive element, tabIndex or keyboard handler. They cannot receive sequential keyboard focus, so keyboard users cannot choose the record whose detail and subsequent actions are displayed. This is a concrete non-native interaction failure, not a missing-ARIA guess.

Affected: Manifest list; Handover list; Gate Pass list; EDI Outbox list; Partner API log list.

Evidence:

- `apps/web/src/components/ManifestsView.tsx:209` — Manifest card onClick at 211.
- `apps/web/src/components/HandoversView.tsx:214` — Handover card onClick at 216.
- `apps/web/src/components/GatePassView.tsx:204` — Gate Pass card onClick at 206.
- `apps/web/src/components/EDIView.tsx:208` — Outbox card onClick at 210.
- `apps/web/src/components/PartnerManagementView.tsx:246` — Partner log card onClick at 248.

Source-derived measurements: `{"verified_selector_patterns":5}`.

Jakob → Cards visually promise a selection control but lack standard button keyboard operation. → Use a native button with preserved card styles.

Illustrative local fix (not implemented):

```tsx
<button type="button" key={edi.id}
  onClick={() => setSelectedEdiId(edi.id)}
  aria-pressed={selectedEdi?.id === edi.id}
  className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left">
  <span className="block font-mono text-xs font-bold text-blue-700">{edi.messageType}</span>
  <span className="mt-1 block font-mono text-xs text-slate-800">{edi.containerNumber}</span>
  <span className="mt-2 block text-xs text-slate-500">{edi.shippingLine}</span>
</button>
```

Recheck:

- Every record selector appears in sequential keyboard order.
- Enter and Space select the same record as a pointer click and expose selected state.
- Focus is visible and selected detail identifies the chosen record.

## W-S-004 — Two create dialogs discard input before the save result arrives

**P1; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz F3 / A1; form recovery. Nielsen H1, H3, H9.

Master Data dispatches a Promise and immediately resets all fields and closes the panel. Users create similarly calls createManagedUser without awaiting and clears/closes. A delayed or failed request therefore loses the entered data and removes the local recovery surface. AppContext.command does show the global apiError banner on failure, so this finding does not claim errors are absent everywhere.

Affected: All four Master Data create types; Add User.

Evidence:

- `apps/web/src/components/MasterDataView.tsx:36` — Four create Promises at 38-41; unconditional reset/close at 42-43.
- `apps/web/src/components/UsersRolesView.tsx:176` — createManagedUser at 178, reset/close at 179-180.
- `apps/web/src/context/AppContext.tsx:445` — command awaits executeOperation; failed writes set global apiError at 448.

Peak-End / Zeigarnik → The apparent ending precedes the server outcome and erases unfinished work. → Await outcome and preserve the form on failure.

Illustrative local fix (not implemented):

```tsx
const [pending, setPending] = useState(false);
const [formError, setFormError] = useState('');
const handleCreateUser = async () => {
  if (pending) return;
  setPending(true); setFormError('');
  try {
    const result = await createManagedUser(userForm.name.trim(), userForm.email.trim(), userForm.roleCodes);
    if (!result.success) { setFormError(result.message); return; }
    setUserForm({ name: '', email: '', roleCodes: [] });
    setShowUserForm(false);
  } finally { setPending(false); }
};
{formError && <p role="alert" className="text-rose-700">{formError}</p>}
<button disabled={pending} onClick={() => void handleCreateUser()}>
  {pending ? 'Đang lưu…' : 'Tạo'}
</button>
```

Recheck:

- Delay a save in a disposable fixture: keep panel and values until outcome.
- Reject save: show actionable local error, preserve all input, allow retry.
- Resolve save: reset/close only after success and show confirmation.

## W-S-005 — Payment and other asynchronous actions stay enabled while saving

**P1; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz A1; duplicate-submit prevention. Nielsen H1, H5.

Billing payment submission awaits recordPayment but never sets a pending state or guards re-entry, and its submit remains enabled. Repeated clicks/Enter can start multiple calls before the first settles. Context recordPayment creates a new referenceNo with crypto.randomUUID on every call. This proves distinct outgoing command attempts, not that the backend necessarily accepts or duplicates them. Truck/Partner/Handover create and multiple EDI actions also omit pending protection; Yard and Gate-in already protect writes.

Affected: Record Payment; Truck Visit create; Partner create/key rotation; Handover create/publish/confirm; EDI retry/dispatch.

Evidence:

- `apps/web/src/components/BillingView.tsx:88` — Payment handler lacks re-entry/pending guard.
- `apps/web/src/components/BillingView.tsx:562` — Payment submit has no disabled/pending label.
- `apps/web/src/context/AppContext.tsx:489` — recordPayment sends a newly generated WEB reference per call.
- `apps/web/src/components/TruckVisitsView.tsx:42` — Create handler and submit at 250 have no pending guard.
- `apps/web/src/components/PartnerManagementView.tsx:47` — Create and key rotation have no pending guard.
- `apps/web/src/components/HandoversView.tsx:78` — Create/publish/confirm await without operation pending state.

Doherty / Peak-End → No operation-specific acknowledgment encourages a repeated action before completion. → Expose pending feedback and guard re-entry; p95 latency is still UNKNOWN.

Illustrative local fix (not implemented):

```tsx
const paymentPending = useRef(false);
const [isPaying, setIsPaying] = useState(false);
const handleRecordPayment = async (event: React.FormEvent) => {
  event.preventDefault();
  if (!selectedInvoice || paymentPending.current) return;
  paymentPending.current = true; setIsPaying(true);
  try {
    const result = await recordPayment(selectedInvoice.id, payAmount, payMethod);
    if (!result.success) { setPaymentError(result.message); return; }
    setShowPayModal(false); setSelectedInvoice(null);
  } finally { paymentPending.current = false; setIsPaying(false); }
};
<button type="submit" disabled={isPaying}>
  {isPaying ? 'Đang ghi nhận…' : 'Xác nhận Thu tiền'}
</button>
```

Recheck:

- Use a delayed fixture, activate submit repeatedly, and observe exactly one command attempt.
- The control acknowledges pending immediately and prevents edits/closure that would misidentify the request.
- Failure restores enabled retry with preserved values; backend idempotency remains a separate contract.

## W-S-006 — Several required-field failures silently return and cannot identify the field

**P2; forms; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** WCAG 3.3.1 / 3.3.3; kz F1 / F2. Nielsen H5, H9.

Master Data blank name, Users blank name/email, MBL blank number and HBL blank number/consignee silently return. These panels use div + onClick rather than a native required form, so the visible asterisk does not provide browser validation. Users/Master Data email inputs also default to text. No invalid/error association or first-invalid focus is provided in these paths. This is verified from the handlers and control markup; no submit was exercised.

Affected: Master Data create; Users create; Manifest MBL/HBL add; Container add Hold.

Evidence:

- `apps/web/src/components/MasterDataView.tsx:37` — Blank name returns without message; input 158 has no required.
- `apps/web/src/components/UsersRolesView.tsx:177` — Blank required fields return silently; email input at 156 has no type=email.
- `apps/web/src/components/ManifestsView.tsx:496` — Blank MBL number returns silently.
- `apps/web/src/components/ManifestsView.tsx:549` — Blank HBL/consignee returns silently.
- `apps/web/src/components/ContainersView.tsx:793` — Blank hold reason returns silently.

Postel / Peak-End → A refused save offers no explanation or local recovery path. → Add explicit field-specific validation with preserved input and focus.

Illustrative local fix (not implemented):

```tsx
const nameRef = useRef<HTMLInputElement>(null);
const [nameError, setNameError] = useState('');
const save = async () => {
  if (!form.name.trim()) {
    setNameError('Nhập tên trước khi lưu.');
    nameRef.current?.focus(); return;
  }
  await handleCreate();
};
<label htmlFor="master-name">Tên *</label>
<input id="master-name" ref={nameRef} required value={form.name}
  aria-invalid={!!nameError} aria-describedby={nameError ? 'master-name-error' : undefined}
  onChange={e => { setForm({ ...form, name: e.target.value }); setNameError(''); }} />
{nameError && <p id="master-name-error" role="alert">{nameError}</p>}
<button type="button" onClick={() => void save()}>Lưu</button>
```

Recheck:

- Submit blank required values: visible error names each missing field and focus lands on first invalid field.
- Invalid email uses type=email or equivalent accessible validation; phone uses type=tel where applicable.
- Correcting input clears its stale error; error text is linked with aria-describedby and invalid state.

## W-S-007 — Role/permission buttons expose selection only through color

**P2; accessibility; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** WCAG 4.1.2; selection state. Nielsen H1, H4.

Permission codes in the role editor and role chips in Add User are native named buttons, but their selected state is rendered only through CSS color/border. No aria-pressed/checked state is attached. Similar top-level local view toggles in Billing, Master Data, EDI and Users/Roles use color-only active state. Native buttons are correct for actions; a tablist is not required if these controls remain a button group with explicit pressed state.

Affected: Role permissions; Add User roles; Billing local views; Master Data categories; EDI local views; Users/Roles views.

Evidence:

- `apps/web/src/components/UsersRolesView.tsx:129` — Permission button selection active at 127/132 has no aria-pressed.
- `apps/web/src/components/UsersRolesView.tsx:162` — User role chips have no selected state despite includes(...) style at 165.
- `apps/web/src/components/BillingView.tsx:142` — Invoices/Orders/Tariffs local view buttons.
- `apps/web/src/components/MasterDataView.tsx:123` — Category view button active only in classes.
- `apps/web/src/components/EDIView.tsx:74` — Outbox/Routes/Alerts active only in classes.

Gestalt similarity → Only sighted users receive the repeated selected-state pattern. → Pair selected styles with programmatic state.

Illustrative local fix (not implemented):

```tsx
<button type="button" key={code}
  aria-pressed={active}
  onClick={() => setRolePermissions(r.id, active
    ? r.permissionCodes.filter(item => item !== code)
    : [...r.permissionCodes, code])}
  className={active ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}>
  {code}
</button>
```

Recheck:

- Accessibility tree exposes true/false selected state for every toggle.
- Keyboard selection updates the state and visible styling together.
- If a full tablist is adopted, implement its complete roles and keyboard behavior rather than roles alone.

## W-S-008 — Gate Pass detail contradicts expiration and cancellation status

**P1; microcopy; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz A4; honest operational status. Nielsen H1, H2, H5.

The list derives EXPIRED when an ACTIVE pass expires, but detail badge/actions use only status === ACTIVE and still invite Gate-out. For every non-ACTIVE status, detail copy says the pass was used and offers the Handover next action, including CANCELLED or EXPIRED. Container 360 also locates any ACTIVE pass without expiry and labels it currently valid. Backend rechecks Gate-out; the finding is contradictory UI guidance, not bypassed enforcement.

Affected: Gate Pass list/detail; Container 360 Gate Pass.

Evidence:

- `apps/web/src/components/GatePassView.tsx:202` — List computes isExpired and displays EXPIRED at 224.
- `apps/web/src/components/GatePassView.tsx:247` — Detail badge renders raw status.
- `apps/web/src/components/GatePassView.tsx:300` — All non-ACTIVE statuses get used copy; ACTIVE always receives Gate-out buttons.
- `apps/web/src/components/ContainersView.tsx:117` — Active pass lookup omits expiry.
- `apps/web/src/components/ContainersView.tsx:662` — Unconditionally calls found ACTIVE pass currently valid.

Peak-End / Jakob → A terminal/restricted record is described as a successful or usable one. → Derive one display status and render distinct status copy/actions.

Illustrative local fix (not implemented):

```tsx
const expired = !!selectedGatePass && new Date(selectedGatePass.expiresAt).getTime() <= Date.now();
const usable = selectedGatePass?.status === 'ACTIVE' && !expired;
const displayedStatus = expired && selectedGatePass?.status === 'ACTIVE'
  ? 'EXPIRED' : selectedGatePass?.status;
const statusCopy = displayedStatus === 'USED'
  ? 'Phiếu đã được sử dụng để ra cổng.'
  : displayedStatus === 'CANCELLED' ? 'Phiếu đã bị hủy.'
  : displayedStatus === 'EXPIRED' ? 'Phiếu đã hết hạn; cần phát hành lại nếu đủ điều kiện.'
  : 'Đối chiếu thông tin trước khi xác nhận ra cổng.';
<p>{statusCopy}</p>
{usable && <button onClick={() => handleConfirmExit(selectedGatePass!)}>Xác nhận Ra cổng</button>}
```

Recheck:

- Fixture ACTIVE fresh/ACTIVE expired/USED/CANCELLED/EXPIRED cases: list and detail status agree.
- Expired/cancelled passes have appropriate recovery text and no active Gate-out invitation.
- Container 360 validity claim also considers expiry; backend remains authoritative.

## W-S-009 — Container 360 displays an icon where it promises a Gate Pass QR code

**P1; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** Functional affordance / truthful output. Nielsen H1, H4, H5.

The inline Gate Pass display uses Lucide QrCode, which draws a fixed icon unrelated to qrToken. It cannot encode the issued token. The dedicated Gate Pass view already uses react-qr-code with the token, so the same business artifact appears scannable in one screen and as a decorative symbol in another.

Affected: Container 360 > Gate Pass.

Evidence:

- `apps/web/src/components/ContainersView.tsx:668` — QrCode icon at 669 with token text below.
- `apps/web/src/components/GatePassView.tsx:2` — react-qr-code import.
- `apps/web/src/components/GatePassView.tsx:274` — QRCode value=selectedGatePass.qrToken in dedicated view.

Jakob → A familiar scannable code affordance produces no encoded business value. → Render the existing QR component or label an icon as decorative.

Illustrative local fix (not implemented):

```tsx
import QRCode from 'react-qr-code';
<div className="inline-block rounded-xl border border-slate-200 bg-white p-4">
  {activeVisitGatePass.qrToken ? (
    <QRCode value={activeVisitGatePass.qrToken} size={160}
      title={`QR phiếu ra cổng ${activeVisitGatePass.code}`} />
  ) : <p>QR chưa khả dụng. Mở Phiếu ra cổng để kiểm tra.</p>}
</div>
```

Recheck:

- Decode QR in both screens in a disposable fixture; decoded value equals the same qrToken.
- No token/permission: display honest unavailable text and a route to dedicated Gate Pass.
- Keep a readable code alternative and expiration guidance.

## W-S-010 — Container Gate Pass tab calls unknown readiness a failed condition

**P2; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz A4; explicit readiness status. Nielsen H1, H9.

Overview distinguishes checking, result and no result. The Gate Pass tab branches only on readiness?.blockers.length === 0; both null/pending and failed network check fall into copy saying unmet conditions are blocking issue. No checking/error branch is rendered in that tab. Unknown evaluation is therefore stated as a business blocker.

Affected: Container 360 > Gate Pass during check/error.

Evidence:

- `apps/web/src/components/ContainersView.tsx:409` — Overview correctly distinguishes checking/no result.
- `apps/web/src/components/ContainersView.tsx:679` — Gate Pass branch tests only blockers length.
- `apps/web/src/components/ContainersView.tsx:729` — Fallback claims unmet conditions for all non-pass states.
- `apps/web/src/components/useBackendReadiness.ts:13` — Hook clears readiness on each visit/reload and reports readinessError.

Peak-End → Users are sent to fix business conditions before any result exists. → Give pending and unknown their own states.

Illustrative local fix (not implemented):

```tsx
{isCheckingReadiness ? (
  <p role="status">Đang kiểm tra điều kiện ra cổng…</p>
) : readinessError ? (
  <p role="alert" className="text-rose-700">{readinessError}</p>
) : !readiness ? (
  <p>Chưa có kết quả kiểm tra. Vui lòng thử lại.</p>
) : readiness.blockers.length > 0 ? (
  <ul>{readiness.blockers.map(code => <li key={code}>{readinessLabel(code)}</li>)}</ul>
) : <>{/* Existing issue form */}</>}
```

Recheck:

- Pending/read failure/no result/blockers/pass each produce distinct truthful content.
- A network error never becomes a claimed failed business condition.
- Issue remains unavailable until an explicit backend pass.

## W-S-011 — Movement Order default expiry shifts the local clock by seven hours

**P2; forms; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** Local datetime semantics; kz F2. Nielsen H2, H5.

The datetime-local default is built using toISOString().slice(0,16), which removes the UTC zone but presents the UTC clock as a local value. Submission then parses that value as local and converts it back to UTC. On the workspace Asia/Saigon UTC+07 zone, the default intended now+24h becomes now+17h. Source proves this timezone transformation; real-browser displayed date was not measured by this agent.

Affected: Movement Order > default authorization expiry.

Evidence:

- `apps/web/src/components/MovementOrdersView.tsx:14` — UTC ISO string stripped for datetime-local.
- `apps/web/src/components/MovementOrdersView.tsx:61` — datetime-local uses this value.
- `apps/web/src/components/MovementOrdersView.tsx:111` — Selected local value is parsed then converted to ISO.

Source-derived measurements: `{"workspace_offset_hours":7,"default_intended_hours":24,"default_serialized_hours":17}`.

Postel / Tesler → The system converts a default time into a different operational deadline. → Format local datetime correctly and state the timezone.

Illustrative local fix (not implemented):

```tsx
function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const [expiresAt, setExpiresAt] = useState(() =>
  localDateTimeValue(new Date(Date.now() + 86400000)));
<label>Thời hạn khi duyệt lệnh (giờ thiết bị)
  <input type="datetime-local" value={expiresAt}
    onChange={event => setExpiresAt(event.target.value)} />
</label>
```

Recheck:

- Freeze a clock in UTC+07 and inspect the default: exactly 24h later, not 17h.
- Edit local datetime and verify serialized ISO denotes that local clock time.
- Blank/invalid/past dates show a recoverable error and do not submit.

## W-S-012 — Work Queue handover review passes the wrong identifier kind

**P2; navigation; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz N4; contextual navigation. Nielsen H2, H3, H5.

HANDOVER_REVIEW fallback navigation sends task.containerVisitId. App forwards the generic context as targetHandoverId. Handovers resolves this exclusively by handover.id, then falls back to the first handover. A task can therefore open an unrelated first handover instead of its review record. This is a source contract mismatch; whether fixture IDs happen to match remains runtime UNKNOWN.

Affected: Work Queue > Handover review.

Evidence:

- `apps/web/src/components/WorkQueueView.tsx:81` — HANDOVER_REVIEW sends containerVisitId at 83.
- `apps/web/src/App.tsx:53` — Generic activeContextId is targetHandoverId.
- `apps/web/src/components/HandoversView.tsx:49` — Lookup compares h.id to targetHandoverId; fallback handovers[0].
- `apps/web/src/components/HandoversView.tsx:53` — Effect repeats handover-id-only lookup.

Tesler / Jakob → The navigation makes users rediscover the intended record and can select the wrong one. → Pass/resolve a canonical handover identifier.

Illustrative local fix (not implemented):

```tsx
const { workQueue, currentUser, handovers } = useApp();
case 'HANDOVER_REVIEW': {
  const handover = handovers.find(item =>
    item.containerVisitId === task.containerVisitId && item.status === 'PARTNER_CONFIRMED');
  if (!handover) { setNavigationError('Không tìm thấy bàn giao cần duyệt.'); break; }
  onNavigate('handovers', handover.id);
  break;
}
```

Recheck:

- With two distinct handovers, opening the second review task selects the second correct handover.
- No matching target displays a missing/unavailable-target state rather than silently selecting the first record.
- Prefer retaining canonical entityId in work-queue mapping if a visit can have multiple handovers.

## W-S-013 — Create Truck Visit shortcut drops its container context and opens no form

**P2; navigation; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz N4; promise/action alignment. Nielsen H2, H6, H7.

Movement Order action says Tạo Truck Visit and sends containerVisitId, but App renders TruckVisitsView with only onNavigate; TruckVisitsView supports no context prop and initializes showCreateModal=false, selectedConts empty. Users arrive at a generic list and must reopen the form and retype the intended container. Truck Visit Gate-in shortcut also omits its linked visit, sending users to a blank selection.

Affected: Movement Order > Tạo Truck Visit; Truck Visit > Tiến hành Tiếp nhận.

Evidence:

- `apps/web/src/components/MovementOrdersView.tsx:129` — Tạo Truck Visit navigation passes containerVisitId.
- `apps/web/src/App.tsx:48` — TruckVisitsView receives no activeContextId.
- `apps/web/src/components/TruckVisitsView.tsx:17` — Props contain onNavigate only.
- `apps/web/src/components/TruckVisitsView.tsx:25` — Create modal initially false; selectedConts empty at 33.
- `apps/web/src/components/TruckVisitsView.tsx:146` — Gate-in shortcut omits the container visit id.

Tesler → Users must carry and re-enter data the application already knows. → Propagate the context to the destination and perform the advertised opening action.

Illustrative local fix (not implemented):

```tsx
<TruckVisitsView onNavigate={handleNavigate} targetVisitId={activeContextId} />
// In TruckVisitsView, add the optional targetVisitId prop.
useEffect(() => {
  if (!targetVisitId) return;
  const visit = containerVisits.find(item => item.id === targetVisitId);
  if (!visit) return;
  setSelectedConts(visit.containerNumber);
  setType('GATE_IN'); setShowCreateModal(true);
}, [targetVisitId, containerVisits]);
```

Recheck:

- Authorized Movement Order shortcut opens create with the correct container prefilled.
- Gate-in shortcut selects the relevant visit and matching arrived truck when unambiguous.
- Missing or multiple matching targets have explicit selection/recovery; no write occurs on navigation.

## W-S-014 — Screen/context selections are memory-only and view changes discard work

**P2; navigation; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz N4 / F3; browser history and return state. Nielsen H3, H6, H7.

App navigation changes local activeTab/activeContextId without router, URL or history. A reload starts at dashboard; browser Back cannot restore in-app selections. Conditional renderContent also unmounts most views, so their local filters, selections and form drafts disappear when navigating away and back. Partner CLIENTS/LOGS is the same component type and can retain state, so this is not claimed for that pair. Session state/data security resets are separate.

Affected: All 18 sidebar destinations; Multi-field Manifest/Container/Truck/Handover drafts.

Evidence:

- `apps/web/src/App.tsx:28` — activeTab default dashboard; context stored only in useState.
- `apps/web/src/App.tsx:32` — handleNavigate only sets component state.
- `apps/web/src/App.tsx:43` — Conditional view switch replaces most screen components.
- `apps/web/src/components/ManifestsView.tsx:84` — Search and draft fields live in view useState.

Zeigarnik / Jakob → Interrupted work restarts and standard browser return behavior cannot recover it. → Address screens/context and retain view state using the installed router and local draft state.

Illustrative local fix (not implemented):

```tsx
const [params, setParams] = useSearchParams();
const activeTab = (params.get('view') || 'dashboard') as NavTabId;
const activeContextId = params.get('record') || undefined;
const handleNavigate = (tab: NavTabId, contextId?: string) => {
  setParams({ view: tab, ...(contextId ? { record: contextId } : {}) });
  setIsSidebarOpen(false);
};
// Wrap the app in the existing react-router-dom BrowserRouter.
// Store per-view filters/drafts in parent state; restore them on return.
```

Recheck:

- Navigate A>B, use browser Back: A and its record/filter/scroll selection restore.
- A copied URL or reload opens the requested authorized destination and record.
- Leaving a dirty multi-field form preserves a draft or gives an explicit discard choice.

## W-S-015 — Several lists render a blank region for zero rows

**P2; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz A4; empty and no-results feedback. Nielsen H1, H9.

Audits and Master Data table bodies contain only mapped rows. Truck Visit cards, Partner clients/logs, Manifest list, Handover list, Gate Pass list and EDI outbox/routes similarly have no explicit collection/no-match branch at the list location. Existing detail placeholders ask users to choose a record even when no records exist. Global loading/error indicators do exist; this finding is specifically settled zero/no-match state.

Affected: Audit list; Master Data list; Truck Visit list; Partner clients/logs; Manifest list; Handover list; Gate Pass list; EDI outbox/routes.

Evidence:

- `apps/web/src/components/AuditsView.tsx:61` — Only filteredLogs.map until tbody end 81.
- `apps/web/src/components/MasterDataView.tsx:147` — tbody only renderList().
- `apps/web/src/components/TruckVisitsView.tsx:95` — Only filteredVisits.map until list close 155.
- `apps/web/src/components/PartnerManagementView.tsx:84` — Only partnerClients.map until 148; logs at 243.
- `apps/web/src/components/ManifestsView.tsx:200` — Only filtered map in list.
- `apps/web/src/components/HandoversView.tsx:211` — Only filtered map in list.
- `apps/web/src/components/GatePassView.tsx:200` — Only filtered map in list.
- `apps/web/src/components/EDIView.tsx:205` — Only filteredEdi.map; routes map at 121.

Peak-End / Gestalt closure → A blank region gives no outcome or recovery for search/list loading completion. → Explain settled empty and no-match states with context-appropriate next steps.

Illustrative local fix (not implemented):

```tsx
{filteredLogs.length === 0 && (
  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">
    {searchTerm ? 'Không có bản ghi khớp tìm kiếm.' : 'Chưa có nhật ký kiểm toán.'}
    {searchTerm && <button type="button" onClick={() => setSearchTerm('')}
      className="ml-2 font-semibold text-blue-700 underline">Xóa tìm kiếm</button>}
  </td></tr>
)}
```

Recheck:

- Fixture 0 records and a nonempty collection filtered to 0 each render distinct messages.
- No-results recovery clears the actual filters without initiating a write.
- Loading/error/forbidden states are not described as an empty collection.

## W-S-016 — Nested load failures silently become empty holds, passes or incomplete details

**P1; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz A4; partial data integrity. Nielsen H1, H5, H9.

The top-level loader records failures, but later per-visit holds/gate-pass requests use allSettled and substitute [] without adding to failures. Manifest bills, role detail and handover detail also catch and return the less-complete row with no local availability marker. After such a rejected GET, UI can show no holds or no pass rather than unavailable data while apiError remains empty if other requests succeeded. Backend readiness/Gate-out rechecks still enforce business rules.

Affected: Container Holds/Gate Pass; Yard HOLD appearance; Manifest MBL/HBL detail; Role permission detail; Handover review detail.

Evidence:

- `apps/web/src/context/AppContext.tsx:365` — Manifest detail catch returns m at 370 with no marker.
- `apps/web/src/context/AppContext.tsx:373` — Role detail catch returns r at 375.
- `apps/web/src/context/AppContext.tsx:377` — Handover detail catch returns h at 379.
- `apps/web/src/context/AppContext.tsx:391` — Rejected holds/passes become [] at 393; no failures.push.
- `apps/web/src/context/AppContext.tsx:409` — Banner depends on failures and health only.

Peak-End → Incomplete operational data is presented with the visual confidence of an empty complete result. → Retain per-record readiness/availability markers and report partial failures.

Illustrative local fix (not implemented):

```tsx
const perVisit = await Promise.all(visits.map(async visit => {
  const paths = [`/containers/${visit.id}/holds`, `/containers/${visit.id}/gate-passes`];
  const results = await Promise.allSettled(paths.map(loadList));
  results.forEach((result, index) => {
    if (result.status === 'rejected' && ![401, 403].includes(result.reason?.status))
      failures.push(`${paths[index]}: ${result.reason?.message ?? 'Không tải được dữ liệu'}`);
  });
  return {
    holds: results[0].status === 'fulfilled' ? results[0].value : [],
    passes: results[1].status === 'fulfilled' ? results[1].value : [],
    holdsLoaded: results[0].status === 'fulfilled', passesLoaded: results[1].status === 'fulfilled',
  };
}));
// Preserve these per-record availability flags so empty is distinct from unavailable.
```

Recheck:

- Reject one nested GET in a fixture while top-level/health succeed: show partial/unavailable state and retry.
- A failed holds request must not claim no holds or derive a reassuring no-HOLD appearance.
- Distinguish permission restriction from transient failure without exposing unauthorized details.

## W-S-017 — EDI inspector calls generated example segments the raw transmitted payload

**P1; microcopy; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** Truthful source attribution; kz A4. Nielsen H1, H2, H5.

getSimulatedEdifact constructs segments from UI fields and hardcodes EQD ISO type 45G1 and other envelope values. Both Copy and the panel labelled raw UN/EDIFACT payload use that function rather than the actual outbound message. An operator inspecting a 20-foot/reefer message can therefore copy a generated 40HC example presented as source-of-truth transmission data.

Affected: EDI Outbox > payload inspector/Copy.

Evidence:

- `apps/web/src/components/EDIView.tsx:30` — getSimulatedEdifact constructs payload, hardcodes 45G1 at 36.
- `apps/web/src/components/EDIView.tsx:262` — Copy copies simulated output.
- `apps/web/src/components/EDIView.tsx:303` — Panel says raw segment payload; render at 306 uses generator.

Jakob / Peak-End → An inspection tool labels reconstructed illustrative data as authoritative output. → Show the real backend payload or clearly name the illustrative preview.

Illustrative local fix (not implemented):

```tsx
<div className="mb-2 text-xs font-bold text-slate-700">
  Bản minh họa EDIFACT — không phải payload đã truyền
</div>
<p className="mb-2 text-xs text-amber-800">
  Dữ liệu dưới đây được tạo để minh họa. Xem payload gốc từ backend khi khả dụng.
</p>
<button type="button" onClick={() => handleCopy(getSimulatedEdifact(selectedEdi))}>
  Sao chép bản minh họa
</button>
<pre>{getSimulatedEdifact(selectedEdi)}</pre>
```

Recheck:

- A generated preview is visibly and accessibly identified as illustrative before copying.
- If raw payload becomes available, display exactly that payload and clearly identify its version/source.
- A 20-foot/reefer fixture never labels a hardcoded 45G1 example as its transmitted raw data.

## W-S-018 — Read-only page access still exposes write actions

**P2; states; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz A4; permission-aware actions. Nielsen H1, H5.

Sidebar page permission checks distinguish read from write, but Users/Roles, Master Data and Billing show creation/toggle/edit controls without checking the corresponding write permissions. Read-only users may enter these pages and are invited to actions the API will reject. This is an interaction/permission-state issue, not a claim that the backend is insecure. Yard already demonstrates exact permission gating.

Affected: Users/Roles read-only; Master Data read-only; Billing read-only.

Evidence:

- `apps/web/src/services/permissions.ts:4` — Billing page requires billing.read.
- `apps/web/src/services/permissions.ts:7` — Master Data read; Users/Roles read permits page.
- `apps/web/src/components/UsersRolesView.tsx:43` — Add User unconditional once USERS tab.
- `apps/web/src/components/UsersRolesView.tsx:80` — User role/status write controls unconditional; permissions editor at 114/129.
- `apps/web/src/components/MasterDataView.tsx:110` — Add new and per-row toggle unconditional.
- `apps/web/src/components/BillingView.tsx:212` — Payment action depends on invoice status, not billing.manage.

Hick / Tesler → Unusable choices increase effort and end in predictable permission errors. → Expose only authorized actions or explain unavailable actions before use.

Illustrative local fix (not implemented):

```tsx
const { currentUser, ...data } = useApp();
const canManageUsers = currentUser.permissionCodes?.some(code =>
  code === '*' || code === 'users.manage') ?? false;
{canManageUsers && (
  <button type="button" onClick={() => setShowUserForm(true)}
    className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white">
    Thêm người dùng
  </button>
)}
{/* Gate role writes with roles.manage, master data with master_data.manage. */}
```

Recheck:

- Read-only fixture users see viewing controls and clear permission context, no unusable write invitation.
- Users/manage, roles/manage, billing/manage and tariff/manage controls follow exact separate permissions.
- Backend authorization remains enforced on every command.

## W-S-019 — Notifications panel lacks Escape and outside-click dismissal

**P2; navigation; verified_static; UNKNOWN_NOT_EXERCISED_BY_STATIC_AGENT.** kz N2; dismissible popover. Nielsen H3, H4.

Header provides a correctly named trigger and aria-expanded, and the trigger can toggle the panel closed. However, its panel contains no Escape handler, outside-click listener or visible Done/close control. It can remain open over changed content until users rediscover the same trigger. A nonmodal panel does not require dialog/menu roles or focus trapping, so those are not claimed missing.

Affected: Header > Notifications.

Evidence:

- `apps/web/src/components/Header.tsx:9` — Only local showNotifs state.
- `apps/web/src/components/Header.tsx:33` — Trigger toggles and exposes aria-expanded.
- `apps/web/src/components/Header.tsx:34` — Panel has no dismissal routes beyond trigger; full component has no effect/keydown listener.

Jakob → A familiar popup does not follow standard dismissal routes. → Add dismissal and a reachable explicit close control without modal behavior.

Illustrative local fix (not implemented):

```tsx
const notificationRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!showNotifs) return;
  const closeOnPointer = (event: PointerEvent) => {
    if (!notificationRef.current?.contains(event.target as Node)) setShowNotifs(false);
  };
  const closeOnKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { setShowNotifs(false); notificationTrigger.current?.focus(); }
  };
  document.addEventListener('pointerdown', closeOnPointer);
  document.addEventListener('keydown', closeOnKey);
  return () => { document.removeEventListener('pointerdown', closeOnPointer); document.removeEventListener('keydown', closeOnKey); };
}, [showNotifs]);
<button type="button" onClick={() => setShowNotifs(false)}>Đóng thông báo</button>
```

Recheck:

- Open panel: trigger again, real Escape and outside pointer each close.
- Escape returns focus to trigger; a visible touch close route stays reachable.
- Click inside keeps appropriate content interactions working and does not lock the main page.

## W-S-020 — Partner API log JSON bodies crash the whole web app

**P0; states; verified_source_and_parent_runtime; Parent confirmed blank app and React object-child console error at partner-api-logs, 1440px; parent owns screenshot/console/AX evidence links.** kz A4; runtime crash containment. Nielsen H1, H3, H9.

Root runtime audit confirmed that opening Nhật ký API đối tác produced a blank application and React console error: Objects are not valid as a React child, with structured request-body keys. The detail panel renders requestBodyRedacted and responseBodyRedacted as React children inside pre. The live mapper spreads backend fields unchanged, while API logs store JSON objects and the web type declares string. There is no web ErrorBoundary around the view; the unexpected object therefore removes the entire React root. Runtime confirmation is from the parent audit, not an interaction by the static agent.

Affected: Partner API logs inspector; Entire web application when the failing record is selected.

Evidence:

- `apps/web/src/components/PartnerManagementView.tsx:297` — Request body rendered directly as child.
- `apps/web/src/components/PartnerManagementView.tsx:306` — Response body rendered directly as child.
- `apps/web/src/services/mappers/live-view.mapper.ts:40` — Partner logs spread backend values without body serialization.
- `apps/web/src/types.ts:424` — Both body fields are inaccurately typed string.
- `apps/web/src/App.tsx:77` — renderContent is not wrapped in an error boundary.

Peak-End / Tesler → Opening an inspection record removes every recovery/navigation control. → Normalize JSON to text and contain per-view render errors.

Illustrative local fix (not implemented):

```tsx
function logBodyText(value: unknown): string {
  if (value == null) return '// Empty or Redacted';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
<pre className="overflow-x-auto whitespace-pre-wrap">
  {logBodyText(selectedLog.requestBodyRedacted)}
</pre>
<pre className="overflow-x-auto whitespace-pre-wrap">
  {logBodyText(selectedLog.responseBodyRedacted)}
</pre>
// Model these fields as unknown or a JSON-value type at the view boundary.
```

Recheck:

- Render a log whose request/response bodies are objects, arrays, strings, null, false and zero: no crash, JSON text is readable.
- The real affected runtime route and record open successfully with sidebar/header still present.
- A forced view render exception shows local recovery while the application shell and navigation remain usable.
- Confirm display still uses already-redacted fields and never exposes the unredacted request.

Supplemental local containment recommendation:

```tsx
class ViewBoundary extends React.Component<{ children: React.ReactNode; onRecover: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="rounded-xl bg-rose-50 p-4">
      Không mở được màn hình này.
      <button onClick={this.props.onRecover}>Về Tổng quan</button>
    </div>;
    return this.props.children;
  }
}
<ViewBoundary key={activeTab} onRecover={() => handleNavigate('dashboard')}>
  {renderContent()}
</ViewBoundary>
```

## Source coverage / role and state inventory

| Component | Role context | Inspected state/surfaces |
|---|---|---|
| WebLoginView | public | Signed-out login; password visibility; submitting; auth failure |
| DashboardView | all authenticated | KPI/gate activity/free-days/holds/EDI overview; conditional overdue and empty subpanels |
| WorkQueueView | permitted work-queue read paths | Urgency/type/own-role filters; task cards; no-matches; contextual task actions |
| ManifestsView | manifest.read; write actions presently not gated | Search/list/detail; ISO tool; create; MBL/HBL add; submit/cancel |
| ContainersView | container.read; write actions presently not gated | Search/state/blocker filters; create; 360 Overview/Yard Ops/Billing/Gate Pass/Timeline/Holds; local readiness; hold add/release |
| MovementOrdersView | movement_order.read | Search/list/status; create for eligible PENDING; expiry field; authorize/cancel; Truck shortcut |
| TruckVisitsView | truck_visit.read | Search/cards; scheduled/arrived/completed; create Gate-in/Gate-out; arrival/Gate-in shortcut |
| GateInView | gate_in.create | Eligible visit/matching arrived truck; seal/weight mismatch validation; pending; success next-step |
| YardView | yard.read with specific writes | Map/List/Assignment/Operations; list filters; Block/Slot config; permission/pending/notices |
| YardSiteMap | yard.read with specific writes | Slot/state colors; legend; block/tier/search; sparse geometry; slot dialog and actions |
| YardAssignment | yard.read; yard.update | Manual coordinates; local blockers; backend check; stale-check guard; assign pending/feedback |
| YardOperations | yard.read with exact yard.move/booking/inspect | Movement/Booking/Inspection histories; search/status/container filters; create/start/complete/cancel dialogs; guarded writes |
| BillingView | billing.read; write actions presently not gated | Invoice/Order/Tariff views; tariff/rule/order/payment overlays; billing preview; status actions |
| GatePassView | gate_pass.create or gate_pass.use | Search/cards/detail; QR/code lookup; issue with backend readiness; Gate-out/cancel |
| HandoversView | handover.read | Search/status cards/detail/timeline; create/publish/ICD confirm; partner proof view |
| PartnerManagementView | partner_client.manage or partner_api_log.read | CLIENTS cards/create/one-time key/rotate; LOGS cards/request-response inspector |
| EDIView | edi.read | Outbox/filter/selection/preview/copy/retry/dispatch; Routes/edit; Alerts acknowledge/resolve |
| MasterDataView | master_data.read | Shipping Line/Consignee/Clearing Agent/Transporter; status toggles and conditional create fields |
| UsersRolesView | users.read or roles.read | Users/roles; role chips/status changes; permission edits; create user |
| ReportsView | reports.read | TEU/shipping-line/dwell/occupancy/revenue/handover metrics |
| AuditsView | audit.read | Search across action/entity/actor/details; six-column read-only table |

## Positive evidence

- Reduced-motion support exists; do not claim missing. (`apps/web/src/index.css:19`)
- Login native labels/types/autofill are implemented. (`apps/web/src/components/WebLoginView.tsx:51`)
- Yard Slot/Config dialogs implement a keyboard focus mechanism; runtime validation still needed. (`apps/web/src/components/yard/useYardDialogFocus.ts:22`)
- Yard Operations intentionally covers many dialog/pending/permission states. (`apps/web/src/components/yard/YardOperations.tsx:99`)
- Yard writes are guarded and give clear local feedback. (`apps/web/src/components/yard/YardOperations.tsx:267`)
- Global loading and API failure indicators exist. (`apps/web/src/App.tsx:72`)
- Native table headers are present. Missing scope/caption alone was not treated as a failure. (`apps/web/src/components/AuditsView.tsx:49`)
- Icon-only shared controls and Container/Yard close buttons are explicitly named. (`apps/web/src/components/Header.tsx:22`)
- Session data reset is present; no claim of retained cross-user business data. (`apps/web/src/context/AppContext.tsx:428`)

## Runtime UNKNOWN / measurement backlog

- **W-S-U01 (layout)**: desktop/narrow/375px touch overflow; overlap/clipping; long localized strings; zoom 200%/400%; drawer focus and scroll. Needs rendered browser geometry; root owns runtime.
- **W-S-U02 (accessibility)**: computed contrast with alpha/ancestors; target hitboxes including mobile 44px advisory; focus ring visibility/3:1; screen-reader announcements. Source classes do not prove the final composed pixels. 44px skill target is distinct from WCAG 2.2 24px target/minimum exceptions.
- **W-S-U03 (forms)**: caret stability/rebuild; real Enter/IME behavior; touch/iOS input zoom; blur nudge timing; screen reader invalid errors. No typing or submit exercised; native browser and device behavior cannot be asserted from JSX alone.
- **W-S-U04 (performance)**: p95 interaction acknowledgment; initial/refresh readiness time; request count and bytes on realistic data; React render duration/list scaling; bundle/page resource budgets. No measured runtime latency/payload/profile; do not invent a 400ms or bundle failure. Global full-collection refresh and per-entity fan-out are verified structures. Approximate request floor = one health + each top-level route page + manifest/MBL pages + role details + handover details + report summary + two visit collection pages + eligible QR detail requests.
- **W-S-U05 (tokens)**: undefined var(--token); theme-specific states; font loading/metrics. Existing Tailwind theme and yard-model palette definitions are legitimate definitions; no alternate web dark-mode audit claimed.
- **W-S-U06 (accessibility)**: Inspect actual focus pixels on yard map search. Source suggests a visibility gap, but browser/CSS default compositing must be measured before recording confirmed NOFOCUS.

## Law-metric limits and non-findings

This source-only batch cannot honestly populate rendered/timing/conversion measurements. Structural causes are attached per finding; numeric law results are UNKNOWN, not fabricated.

Missing measured keys: min_target_size_px, primary_action_reach, primary_cta_count, screen_choice_count, group_spacing_ratio, focal_points, feedback_ms_p95, simplicity_score, completion conversion measurements.

- Fix snippets are illustrative 5-20-line local recommendations; they were not applied or executed.
- Screen/runtime claims are limited to source-guaranteed structure and stated conditional examples; unknown browser/fixture outcomes remain separate.
- Screens use native table headers; the skill preference for a filter on every column is not automatically imposed over consistent project table patterns.
- No new visual design, component library migration or speculative theme was proposed.
