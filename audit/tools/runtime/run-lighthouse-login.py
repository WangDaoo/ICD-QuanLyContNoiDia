"""Run approved Lighthouse CLI measurements; never drive Chrome ourselves."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps/web"
RUNTIME = Path(__file__).resolve().parent
RAW = ROOT / "audit/raw/baseline/web"
URL = "http://127.0.0.1:4173/"
NODE = shutil.which("node")
HIDDEN = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0


def utc():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def protected_hashes():
    paths = [ROOT / "package.json", ROOT / "pnpm-lock.yaml", WEB / "package.json", WEB / "vite.config.ts"]
    paths += sorted((WEB / "dist").rglob("*"))
    return {p.relative_to(ROOT).as_posix(): digest(p) for p in paths if p.is_file()}


def listeners():
    command = "Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress"
    result = subprocess.run(["powershell", "-NoProfile", "-Command", command], capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=HIDDEN)
    text = result.stdout.strip()
    if not text:
        return []
    data = json.loads(text)
    return data if isinstance(data, list) else [data]


def report_run(path, exit_code):
    if exit_code != 0 or not path.exists():
        return {"status": "UNKNOWN", "reason": "Lighthouse CLI failed or report was not written"}
    report = json.loads(path.read_text(encoding="utf-8"))
    if report.get("runtimeError"):
        return {"status": "UNKNOWN", "reason": "Lighthouse runtimeError", "runtime_error": report["runtimeError"]}
    audits = report.get("audits", {})
    category = report.get("categories", {}).get("accessibility", {})
    accessibility_ids = {x["id"] for x in category.get("auditRefs", [])}
    numeric = {}
    for label, audit_id in [("LCP_ms", "largest-contentful-paint"), ("CLS", "cumulative-layout-shift"), ("TBT_ms", "total-blocking-time")]:
        value = audits.get(audit_id, {}).get("numericValue")
        numeric[label] = value if isinstance(value, (int, float)) else None
    return {
        "status": "MEASURED" if all(v is not None for v in numeric.values()) else "PARTIAL",
        "fetch_time": report.get("fetchTime"),
        "requested_url": report.get("requestedUrl"),
        "final_displayed_url": report.get("finalDisplayedUrl"),
        "final_url": report.get("finalUrl"),
        "lighthouse_version": report.get("lighthouseVersion"),
        "environment": report.get("environment"),
        "config_settings": report.get("configSettings"),
        "credits": report.get("environment", {}).get("credits", {}),
        "embedded_axe_version": report.get("environment", {}).get("credits", {}).get("axe-core"),
        "metrics": numeric,
        "performance_score": report.get("categories", {}).get("performance", {}).get("score"),
        "accessibility_score": category.get("score"),
        "accessibility_failed_audits": [k for k in sorted(accessibility_ids) if audits.get(k, {}).get("score") == 0],
        "accessibility_manual_audits": [k for k in sorted(accessibility_ids) if audits.get(k, {}).get("scoreDisplayMode") == "manual"],
        "accessibility_unknown_audits": [k for k in sorted(accessibility_ids) if audits.get(k, {}).get("scoreDisplayMode") in ("error", "informative") or audits.get(k, {}).get("errorMessage")],
        "run_warnings": report.get("runWarnings", []),
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    RAW.mkdir(parents=True, exist_ok=True)
    summary_path = RAW / "lighthouse-summary.json"
    if summary_path.exists():
        raise RuntimeError("Summary already exists; preserve prior evidence before a new approved run")
    folder = RAW / ("lighthouse-login-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    folder.mkdir(exist_ok=False)
    summary = {
        "started_at_utc": utc(), "status": "IN_PROGRESS", "url": URL,
        "scope": "Production unauthenticated Login; three fresh-profile mobile Lighthouse CLI navigation runs",
        "artifacts_directory": str(folder), "driver": "Lighthouse CLI only; no CUA/Playwright/custom CDP driver",
        "authenticated_routes": {"status": "UNKNOWN", "reason": "Not navigated or authenticated"},
        "field_INP": {"status": "UNKNOWN", "reason": "No real-user field data or interaction measurement; TBT is not INP"},
        "separate_axe_scan": {"status": "NOT_RUN", "reason": "Only Lighthouse's selected accessibility checks run in its dedicated browser"},
        "limitations": ["Local production build, not deployed network/field performance", "Simulated mobile throttling; device is not physical mobile", "Automated accessibility score excludes required manual review", "Lighthouse runs its normal gatherers, including isolated axe and scroll reset, in its own browser only"],
        "primary_sources": ["https://developer.chrome.com/docs/lighthouse/overview", "https://developer.chrome.com/docs/lighthouse/performance/performance-scoring", "https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/gather/gatherers/accessibility.js", "https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/runner.js"],
        "runs": [], "preview": {"pid": None, "stopped": None},
        "protected_files_before": protected_hashes(),
    }
    preview = None
    preview_out = None
    preview_err = None
    save(summary_path, summary)
    try:
        if not NODE or not (WEB / "dist/index.html").exists():
            raise RuntimeError("Node or production dist/index.html unavailable")
        initial_listeners = listeners()
        summary["preview"]["listeners_before"] = initial_listeners
        if initial_listeners:
            raise RuntimeError("Port 4173 is occupied; no existing process will be stopped")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 4173))
        cli = RUNTIME / "node_modules/lighthouse/cli/index.js"
        for flag, name in [("--help", "help"), ("--version", "version")]:
            command = [NODE, str(cli), flag]
            r = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=HIDDEN)
            (folder / f"lighthouse-{name}.log").write_text(r.stdout + r.stderr, encoding="utf-8")
            summary[f"{name}_command"] = {"argv": command, "exit_code": r.returncode}
            if r.returncode != 0:
                raise RuntimeError("Lighthouse CLI prerequisite command failed")
        preview_command = [NODE, str(WEB / "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"]
        preview_out = (folder / "preview.stdout.log").open("wb")
        preview_err = (folder / "preview.stderr.log").open("wb")
        preview = subprocess.Popen(preview_command, cwd=WEB, stdout=preview_out, stderr=preview_err, creationflags=HIDDEN)
        summary["preview"].update({"pid": preview.pid, "argv": preview_command, "cwd": str(WEB), "hidden": True})
        save(summary_path, summary)
        deadline = time.monotonic() + 25
        while True:
            if preview.poll() is not None:
                raise RuntimeError("Owned preview process exited before readiness")
            try:
                with urlopen(URL, timeout=2) as response:
                    served = response.read()
                    summary["preview"]["http_status"] = response.status
                    if served != (WEB / "dist/index.html").read_bytes():
                        raise RuntimeError("Preview response differs from production dist/index.html")
                break
            except (OSError, TimeoutError):
                if time.monotonic() >= deadline:
                    raise RuntimeError("Owned preview did not become ready")
                time.sleep(0.25)
        bound = listeners()
        summary["preview"]["listeners_during"] = bound
        if not bound or any(row["OwningProcess"] != preview.pid for row in bound):
            raise RuntimeError("Port 4173 listener is not our owned preview PID")
        base = [NODE, str(cli), URL, "--only-categories=performance,accessibility", "--form-factor=mobile", "--throttling-method=simulate", "--locale=en-US", "--output=json", "--output=html", "--chrome-flags=--headless=new --disable-gpu --no-first-run --no-default-browser-check", "--no-enable-error-reporting"]
        summary["identical_measurement_argv"] = base
        for number in range(1, 4):
            prefix = folder / f"run-{number}"
            command = base + ["--output-path=" + str(prefix)]
            run = {"number": number, "started_at_utc": utc(), "argv": command, "cwd": str(RUNTIME), "log": str(prefix) + ".log"}
            print(f"Lighthouse run {number}/3 started", flush=True)
            with Path(run["log"]).open("wb") as log:
                try:
                    result = subprocess.run(command, cwd=RUNTIME, stdout=log, stderr=subprocess.STDOUT, creationflags=HIDDEN, timeout=240)
                    run["exit_code"] = result.returncode
                except subprocess.TimeoutExpired:
                    run["exit_code"] = None
                    run["timeout_seconds"] = 240
            run["completed_at_utc"] = utc()
            run["json_report"] = str(prefix) + ".report.json"
            run["html_report"] = str(prefix) + ".report.html"
            run.update(report_run(Path(run["json_report"]), run["exit_code"]))
            summary["runs"].append(run)
            save(summary_path, summary)
            print(f"Lighthouse run {number}/3: {run['status']} exit={run['exit_code']} metrics={run.get('metrics')}", flush=True)
        measured = [r for r in summary["runs"] if r["status"] == "MEASURED"]
        summary["status"] = "MEASURED" if len(measured) == 3 else "PARTIAL" if measured else "UNKNOWN"
        summary["successful_runs"] = len(measured)
        summary["statistics"] = {}
        for metric in ["LCP_ms", "CLS", "TBT_ms"]:
            values = [r["metrics"][metric] for r in measured]
            summary["statistics"][metric] = {"sample_count": len(values), "values": values, "median": statistics.median(values) if values else None, "range": [min(values), max(values)] if values else None}
        summary["settings_identical"] = len(measured) == 3 and all(r["config_settings"] == measured[0]["config_settings"] for r in measured)
    except Exception as exc:
        summary["status"] = "UNKNOWN"
        summary["failure"] = {"type": type(exc).__name__, "message": str(exc)}
        print(f"Lighthouse preparation/run UNKNOWN: {exc}", flush=True)
    finally:
        if preview is not None:
            # This Popen object owns only the direct Node Vite process we launched.
            if preview.poll() is None:
                preview.terminate()
                try:
                    preview.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    preview.kill()
                    preview.wait(timeout=5)
            summary["preview"].update({"stopped": preview.poll() is not None, "exit_code": preview.returncode, "listeners_after": listeners()})
        if preview_out:
            preview_out.close()
        if preview_err:
            preview_err.close()
        summary["protected_files_after"] = protected_hashes()
        summary["protected_files_unchanged"] = summary["protected_files_before"] == summary["protected_files_after"]
        summary["completed_at_utc"] = utc()
        summary["artifact_sha256"] = {p.name: digest(p) for p in folder.iterdir() if p.is_file()}
        save(summary_path, summary)
        manifest_path = ROOT / "audit/tool-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["lighthouse_login"] = {"summary_path": str(summary_path), "summary_sha256": digest(summary_path), "status": summary["status"], "artifacts_directory": str(folder), "helper_path": str(Path(__file__).resolve()), "helper_sha256": digest(Path(__file__)), "primary_sources": summary["primary_sources"]}
        save(manifest_path, manifest)
        print(json.dumps({"status": summary["status"], "statistics": summary.get("statistics"), "preview": summary["preview"], "protected_files_unchanged": summary["protected_files_unchanged"], "summary": str(summary_path)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
