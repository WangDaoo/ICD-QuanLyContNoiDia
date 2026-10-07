"""Static feasibility evidence and lexical wrappers; never executes DOM checks."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "audit/tools"
CHECKS = Path("C:/Users/quang/.codex/skills/kz-uicheck/checks")
OUT = ROOT / "audit/raw/baseline/web/kz-check-feasibility.json"
COMMIT = "ca77ea4be13dc1405d18d0671e4696ecd91c3e62"
FLAG_KEYS = ["dom_tree_writes", "style_writes", "attribute_writes", "input_value_writes", "focus_changes", "scroll_changes", "synthetic_events", "global_listeners", "timers_or_channels", "global_property_writes"]
DESCRIPTIONS = {
    "table-check.js": {
        "flags": [], "reason": "Only DOM/CSS/geometry reads and console logging; local arrays/objects are mutated, not the page.",
        "anchors": ["parseFloat(cs[", "return { tables:"],
        "limitations": ["Only visible HTML data tables with at least two columns and a body row are examined.", "Zero tables means not applicable, not all UI passed.", "Search/count/explainer heuristics contain English text matching and can miss Vietnamese labels.", "NOSEARCH, NOCOUNT, and NOHELP are upstream advisories, not failures."]},
    "layout-audit.js": {
        "flags": [], "reason": "Only DOM/CSS/geometry reads. createRange/selectNodeContents change a detached Range, not document content or selection.",
        "anchors": ["document.createRange()", "r.selectNodeContents(el)", "matchMedia('(hover: none)')", "try { walk(sh.cssRules)"],
        "limitations": ["The sandbox may reject createRange or CSSOM access despite these being read-only; record UNKNOWN for unsupported capability.", "Many layout/chart checks use source-project class selectors and may match no application nodes.", "Cross-origin stylesheet reads are silently skipped upstream, limiting static focus/token coverage.", "The touch target branch requires actual hover:none; a narrow viewport alone does not enable it.", "The upstream touch floor is height44/width24, so it does not establish a 44x44 target guarantee.", "The returned clean sentinel covers only executed heuristics, not a complete layout pass."]},
    "contrast-check.js": {
        "flags": ["dom_tree_writes", "style_writes", "attribute_writes"],
        "reason": "Injects a style element to disable transitions/animations, changes data-theme, then restores/removes them. Restoration does not make execution read-only.",
        "anchors": ["document.head.appendChild(freeze)", "root.setAttribute('data-theme', t)", "freeze.remove()", "if (!fg) { continue; }", "var base = [255, 255, 255, 1]"],
        "limitations": ["Parser accepts rgb()/rgba() only: unsupported OKLCH foreground is silently skipped.", "Unresolved backdrop colors can become a white canvas fallback.", "Group opacity is multiplied into text alpha, which is not a general compositing proof.", "Uses a -0.005 threshold tolerance; do not replace full-precision WCAG comparison with this result.", "Use separate captured DOM evidence and offline Color4 calculation; never label it as the original kz run."]},
    "focus-check.js": {
        "flags": ["dom_tree_writes", "style_writes", "attribute_writes", "focus_changes", "scroll_changes"],
        "reason": "Requires foreground page focus, injects freeze CSS, switches theme, focuses/blurs controls, and restores focus/scroll.",
        "anchors": ["if (!document.hasFocus())", "document.head.appendChild(freeze)", "root.setAttribute('data-theme', t)", "el.focus({ preventScroll: true })", "el.blur()", "window.scrollTo(sx, sy)"],
        "limitations": ["Background/unfocused execution returns not-run, not a focus pass.", "Programmatic focus may not exercise :focus-visible.", "RGB-only indicator parsing can replace unknown indicator colors with sentinel99; no valid OKLCH contrast guarantee."]},
    "typing-check.js": {
        "flags": ["input_value_writes", "focus_changes", "scroll_changes", "synthetic_events", "timers_or_channels"],
        "reason": "Scrolls/focuses fields, writes values using native setters, changes caret selection, dispatches input and Enter events, and restores some values. App handlers can fire.",
        "anchors": ["el.scrollIntoView", "el.focus()", "setValue.call(el, v.slice", "new InputEvent('input'", "new KeyboardEvent('keydown'", "window.scrollTo(0, 0)"],
        "limitations": ["Input or Enter handlers can trigger business writes even when values are restored.", "Synthetic Enter does not reproduce native implicit submission."]},
    "popover-check.js": {
        "flags": ["scroll_changes", "synthetic_events", "timers_or_channels"],
        "reason": "Scrolls triggers and dispatches pointer/mouse/click and Escape events to open/close panels; app handlers mutate state.",
        "anchors": ["el.dispatchEvent(new Ctor", "t.scrollIntoView", "tap(document.body)", "new KeyboardEvent('keydown'"],
        "limitations": ["Click handlers can invoke business mutations or navigation.", "Synthetic events do not reproduce native user input in every widget."]},
    "modal-check.js": {
        "flags": ["attribute_writes", "focus_changes", "scroll_changes", "synthetic_events", "timers_or_channels"],
        "reason": "Scrolls/focuses openers, dispatches pointer/click/keyboard/cancel events, and calls native dialog.close(); app handlers mutate state.",
        "anchors": ["op.scrollIntoView", "op.focus({ preventScroll: true })", "el.dispatchEvent(new C", "dlg.dispatchEvent(ev)", "dlg.close()"],
        "limitations": ["dialog.close() mutates open state even when cleanup is intended.", "Fallback closure may tap the first button in a dialog, which can be a business action.", "Synthetic cancel is not a real Escape keypress."]},
    "form-check.js": {
        "flags": ["dom_tree_writes", "style_writes", "input_value_writes", "focus_changes", "synthetic_events", "global_listeners", "timers_or_channels"],
        "reason": "Injects freeze CSS, writes values, focuses/blurs inputs, installs a window submit listener, and calls requestSubmit(); the page's submit handler still runs.",
        "anchors": ["document.head.appendChild(freeze)", "Object.getOwnPropertyDescriptor(proto, 'value').set.call", "e.focus({ preventScroll: true })", "window.addEventListener('submit'", "form.requestSubmit()", "window.removeEventListener('submit'"],
        "limitations": ["preventDefault only cancels browser default submission; it does not prevent application fetch/mutation handlers.", "Leaves induced validation errors visible, per upstream comments.", "Read-only label/type fragments would be a distinct reduced method, not an execution of the original form check."]},
}

def sha(payload):
    return hashlib.sha256(payload).hexdigest()

def line_evidence(source, anchors):
    lines = source.splitlines()
    return [{"line": next((i + 1 for i, text in enumerate(lines) if anchor in text), None), "anchor": anchor} for anchor in anchors]

def wrapper(filename, source, source_sha):
    viewport = """
    const view = typeof window !== 'undefined' ? window : document.defaultView;
    if (!view || !Number.isFinite(view.innerWidth) || !Number.isFinite(view.innerHeight) || typeof view.matchMedia !== 'function') {
      return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:'Native viewport/matchMedia reads unavailable; no geometry substitution made',logs:logs};
    }
    const innerWidth = view.innerWidth;
    const innerHeight = view.innerHeight;
    const matchMedia = query => view.matchMedia(query);
""" if filename == "layout-audit.js" else ""
    return """/* Lexical read-only wrapper. Upstream source is embedded unchanged below.
No browser globals, DOM attributes/styles, values, focus, or listeners are written. */
(() => {
  const sourceSha256 = SOURCE_SHA;
  const logs = [];
  const capture = level => function () { logs.push({level:level,args:Array.prototype.slice.call(arguments)}); };
  const console = {log:capture('log'),warn:capture('warn'),error:capture('error')};
  try {
    const parseFloat = Number.parseFloat;
    const parseInt = Number.parseInt;
    if (typeof parseFloat !== 'function') return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:'Number.parseFloat unavailable; no parser substitution made',logs:logs};
    if (!document.documentElement || document.documentElement.clientWidth <= 0 || !document.body) return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:'No nonzero document viewport/body',logs:logs};
VIEWPORT
    const result =
UPSTREAM
    return {executionStatus:'EXECUTED',sourceSha256:sourceSha256,upstreamResult:result,logs:logs,method:'Unchanged upstream IIFE with lexical console capture and native Number parser aliases; limited heuristic coverage'};
  } catch (error) {
    return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:String(error && error.message || error),logs:logs};
  }
})();
""".replace("SOURCE_SHA", json.dumps(source_sha)).replace("VIEWPORT", viewport).replace("UPSTREAM", source)

def main():
    results = []
    for filename, description in DESCRIPTIONS.items():
        payload = (CHECKS / filename).read_bytes()
        source = payload.decode("utf-8")
        compatible = not description["flags"]
        result = {"filename": filename, "source_path": str(CHECKS / filename), "source_sha256": sha(payload),
            "source_commit": COMMIT, "static_review": "complete source read", "original_dom_read_only": compatible,
            "execution_status": "NOT_RUN_PREPARED_FOR_PARENT" if compatible else "NOT_RUN_INCOMPATIBLE_READ_ONLY",
            "flags": {key: key in description["flags"] for key in FLAG_KEYS}, "reason": description["reason"],
            "evidence": line_evidence(source, description["anchors"]), "limitations": description["limitations"]}
        if compatible:
            destination = TOOLS / f"kz-readonly-{filename}"
            code = wrapper(filename, source, sha(payload))
            destination.write_text(code, encoding="utf-8", newline="\n")
            assert payload in destination.read_bytes(), f"Upstream bytes changed: {filename}"
            process = subprocess.run(["node", "--check", str(destination)], capture_output=True, text=True)
            if process.returncode:
                raise RuntimeError(process.stderr)
            result["wrapper"] = {"path": str(destination), "sha256": sha(destination.read_bytes()), "upstream_bytes_preserved": True,
                "syntax_check": "node --check: exit0", "runtime_tested": False,
                "adaptations": ["Lexical console object captures log/warn output; never replaces global console", "Local parseFloat/parseInt aliases use native Number.parseFloat/Number.parseInt", "Layout only: local innerWidth/innerHeight/matchMedia refer to original Window values, not document client-size approximations"],
                "unsupported_policy": "Return UNKNOWN, no fallback or invented passing result"}
        results.append(result)
    axe_path = TOOLS / "runtime/node_modules/axe-core/axe.js"
    axe_source = axe_path.read_text(encoding="utf-8")
    axe = {"version": "4.13.0", "source_path": str(axe_path), "source_sha256": sha(axe_path.read_bytes()),
        "execution_status": "NOT_RUN_INCOMPATIBLE_READ_ONLY", "reason": "Standard axe bootstrap writes window.axe and document.elementsFromPoint; iframe messaging uses global listeners. Native DOM constructors, real rendering APIs and conditional polyfills/preload helpers exceed read-only sandbox assumptions.",
        "evidence": line_evidence(axe_source, ["window.axe = axe", "document.elementsFromPoint = _pollyfillElementsFromPoint()", "window.addEventListener('message'", "document.head.appendChild(style)", "current.style.setProperty(cssProp", "document.createElement('canvas')", "function setupGlobals(context)", "function injectStyle(style)"]),
        "conditional_paths": ["Modern native elementsFromPoint avoids its style-mutating polyfill body, but the bootstrap property assignment remains.", "Style injection helper and CSSOM/media preloading are conditional; source presence alone is not evidence every axe.run injects CSS.", "Iframe messaging installs listeners when that messenger is opened; no claim every top-level scan opens one.", "color-contrast needs rendered geometry/canvas; an offline HTML snapshot does not reproduce it."],
        "primary_sources": ["https://github.com/dequelabs/axe-core/blob/v4.13.0/doc/API.md", "https://github.com/dequelabs/axe-core/blob/v4.13.0/README.md"],
        "reporting": "Record not run with these prerequisites; never report zero axe violations or substitute static label checks as an axe scan."}
    artifact = {"generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "method": "Source inspection only; no browser/DOM checks executed",
        "source_repository": "https://github.com/kz-95/kz-skills", "source_commit": COMMIT,
        "compatible_originals": [result["filename"] for result in results if result["original_dom_read_only"]],
        "read_only_prerequisites": ["CUA must expose required native DOM/CSSOM/geometry reads and Number parser methods.", "Visible painted nonzero viewport; parent verifies actual rendering.", "No page focus required by table/layout; focus-check requires focus but is still incompatible due writes.", "Execute checks separately on a settled page; unsupported API is UNKNOWN, never an empty clean result."],
        "checks": results, "axe": axe}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = ROOT / "audit/tool-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["readonly_check_feasibility"] = {"path": str(OUT), "sha256": sha(OUT.read_bytes()), "compatible_originals": artifact["compatible_originals"], "runtime_executed": False}
    notes = TOOLS / "lumen-token-reference-notes.md"
    if notes.exists():
        lumen = TOOLS / "lumen-source"
        references = ["libs/ui-react/ai-rules/RULES.md", "libs/ui-rnative/ai-rules/RULES.md", "libs/design-core/README.md",
            "libs/design-core/src/lib/themes/js/primitives/primitives.others.ts", "libs/design-core/src/lib/themes/js/primitives/primitive.typographies.ts",
            "libs/design-core/src/lib/themes/js/typographies/typography.md.ts", "libs/design-core/src/lib/themes/js/ledger-live/theme.light.ts"]
        current = ["apps/mobile/src/theme/colors.ts", "apps/mobile/src/theme/spacing.ts", "apps/mobile/src/theme/typography.ts", "apps/web/src/index.css", "apps/web/package.json", "apps/web/src/components/AuditsView.tsx"]
        manifest["lumen_reference_notes"] = {"path": str(notes), "sha256": sha(notes.read_bytes()), "mode": "semantic token comparison; no adoption or package installation",
            "source_commit": manifest["sources"]["lumen"]["commit"], "reference_hashes": {name: sha((lumen / name).read_bytes()) for name in references},
            "current_source_hashes": {name: sha((ROOT / name).read_bytes()) for name in current}}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"artifact": str(OUT), "compatible": artifact["compatible_originals"], "wrapper_syntax_checks": "2 passed", "browser_executions": 0}, ensure_ascii=True))

if __name__ == "__main__":
    main()
