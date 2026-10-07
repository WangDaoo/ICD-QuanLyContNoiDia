"""Prepare audit-only tools with pinned sources and reproducible install logs."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "audit" / "tools"
LOGS = ROOT / "audit" / "raw" / "baseline"
MANIFEST = ROOT / "audit" / "tool-manifest.json"
SKILLS = Path("C:/Users/quang/.codex/skills")
INSTALLER = SKILLS / ".system/skill-installer/scripts/install-skill-from-github.py"
REPOS = {
    "frontend-law-auditor": "Jacobinwwey/frontend-law-auditor",
    "mobile-ux-audit": "aditya305/mobile-ux-audit",
    "kz-skills": "kz-95/kz-skills",
    "lumen": "LedgerHQ/lumen",
    "ux-gap-detector": "laststance/skills",
}


def utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def run(label: str, argv: list[str], cwd: Path | None = None) -> str:
    LOGS.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(argv, cwd=cwd or ROOT, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    log = LOGS / f"tool-install-{label}.log"
    with log.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps({"at": utc(), "command": argv,
                                 "cwd": str(cwd or ROOT)}, ensure_ascii=False) + "\n")
        stream.write(result.stdout)
        stream.write(result.stderr)
        stream.write(f"\nexit_code={result.returncode}\n")
    if result.returncode:
        raise RuntimeError(f"{label} failed ({result.returncode}); see {log}")
    return result.stdout.strip()


def save(data: dict) -> None:
    data["updated_at_utc"] = utc()
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["resolve", "core-skills", "sources", "kz-skills", "runtime", "color-dependency", "verify"])
    args = parser.parse_args()
    TOOLS.mkdir(parents=True, exist_ok=True)
    data = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {
        "created_at_utc": utc(), "sources": {}, "skills": {}, "runtime": {},
        "scope": "audit-only preparation; no application package changes, audits, browser launch, or business writes",
        "tamagui": {"status": "not-applicable", "reason": "No Tamagui dependency in the application per delegated baseline context"},
    }
    if args.stage == "resolve":
        for name, repo in REPOS.items():
            if name in data["sources"]:
                print(f"Reused recorded source {name}: {data['sources'][name]['commit']}")
                continue
            output = run(f"resolve-{name}", ["git", "ls-remote", "--symref", f"https://github.com/{repo}.git", "HEAD"])
            lines = output.splitlines()
            commit = next(line.split()[0] for line in lines if not line.startswith("ref:") and line.endswith("\tHEAD"))
            branch = next((line.split()[1].removeprefix("refs/heads/") for line in lines if line.startswith("ref:")), None)
            data["sources"][name] = {"repository": repo, "url": f"https://github.com/{repo}",
                                     "commit": commit, "default_branch": branch, "resolved_at_utc": utc()}
            save(data)
            print(f"Resolved {name}: {commit} ({branch})", flush=True)
    elif args.stage == "core-skills":
        for name in ("mobile-ux-audit", "frontend-law-auditor"):
            source = data["sources"][name]
            target = SKILLS / name
            if target.exists():
                if name not in data["skills"]:
                    raise RuntimeError(f"Existing unrecorded skill requires review: {target}")
                print(f"Reused recorded skill {name}: {target}")
                continue
            run(name, [sys.executable, str(INSTALLER), "--repo", source["repository"],
                       "--path", ".", "--name", name, "--ref", source["commit"], "--dest", str(SKILLS)])
            data["skills"][name] = {"path": str(target), "source_key": name,
                                     "source_path": ".", "commit": source["commit"],
                                     "install_method": "official-installer-full-root", "installed_at_utc": utc()}
            save(data)
            print(f"Installed full-root skill {name}: {target}", flush=True)
    elif args.stage == "sources":
        for name, relative in (("lumen", "lumen-source"), ("kz-skills", "kz-skills-source"),
                               ("ux-gap-detector", "reference/laststance-skills")):
            source = data["sources"][name]
            target = TOOLS / relative
            if target.exists():
                actual = run(f"verify-source-{name}", ["git", "-C", str(target), "rev-parse", "HEAD"])
                if actual != source["commit"]:
                    raise RuntimeError(f"Existing source checkout mismatch: {target}")
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                run(f"clone-{name}", ["git", "clone", "--depth", "1", "--single-branch",
                                      "--branch", source["default_branch"], source["url"] + ".git", str(target)])
                actual = run(f"verify-source-{name}", ["git", "-C", str(target), "rev-parse", "HEAD"])
                if actual != source["commit"]:
                    run(f"pin-source-{name}", ["git", "-C", str(target), "fetch", "--depth", "1", "origin", source["commit"]])
                    run(f"checkout-source-{name}", ["git", "-C", str(target), "checkout", "--detach", source["commit"]])
            source.update({"local_path": str(target), "mode": "reference-only; dependencies not installed", "depth": 1})
            save(data)
            print(f"Cached {name}: {target}", flush=True)
    elif args.stage == "kz-skills":
        source = data["sources"]["kz-skills"]
        source_root = Path(source["local_path"])
        skill_files = sorted((source_root / "skills").glob("*/SKILL.md"))
        skill_roots = [path.parent.relative_to(source_root).as_posix() for path in skill_files]
        for relative in skill_roots:
            name = Path(relative).name
            target = SKILLS / name
            if target.exists():
                if name not in data["skills"]:
                    raise RuntimeError(f"Existing unrecorded skill requires review: {target}")
                print(f"Reused recorded skill {name}: {target}")
                continue
            run(f"kz-{name}", [sys.executable, str(INSTALLER), "--repo", source["repository"],
                              "--path", relative, "--ref", source["commit"], "--dest", str(SKILLS)])
            data["skills"][name] = {"path": str(target), "source_key": "kz-skills", "source_path": relative,
                                     "commit": source["commit"], "install_method": "official-installer",
                                     "full_source_reference": str(source_root), "installed_at_utc": utc()}
            save(data)
            print(f"Installed kz sibling skill {name}: {target}", flush=True)
    elif args.stage == "runtime":
        runtime = TOOLS / "runtime"
        runtime.mkdir(exist_ok=True)
        versions = data["runtime"].get("package_versions", {})
        for name in ("axe-core", "lighthouse", "playwright", "tsx", "web-vitals"):
            if name not in versions:
                versions[name] = json.loads(run(f"npm-view-{name}", ["npm.cmd", "view", name, "version", "--json"], runtime))
                data["runtime"]["package_versions"] = versions
                save(data)
        package = {"name": "icd-audit-runtime", "version": "1.0.0", "private": True,
                   "description": "Isolated read-only audit tooling; not an application dependency", "type": "module",
                   "dependencies": versions}
        pkg_path = runtime / "package.json"
        if pkg_path.exists() and json.loads(pkg_path.read_text(encoding="utf-8")) != package:
            raise RuntimeError(f"Existing runtime package differs; review required: {pkg_path}")
        pkg_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")
        run("runtime-npm-install", ["npm.cmd", "install", "--save-exact", "--no-audit", "--no-fund"], runtime)
        data["runtime"].update({"path": str(runtime), "package_json": str(pkg_path),
                                  "lockfile": str(runtime / "package-lock.json"), "node": run("node-version", ["node", "--version"]),
                                  "npm": run("npm-version", ["npm.cmd", "--version"]),
                                  "installed_at_utc": utc(), "browser_install_performed": False})
        save(data)
        print(f"Installed isolated runtime: {runtime}\n{json.dumps(versions)}", flush=True)
    elif args.stage == "color-dependency":
        runtime = TOOLS / "runtime"
        versions = data["runtime"]["package_versions"]
        if "colorjs.io" not in versions:
            versions["colorjs.io"] = json.loads(run("npm-view-colorjs.io", ["npm.cmd", "view", "colorjs.io", "version", "--json"], runtime))
            save(data)
        run("runtime-colorjs-install", ["npm.cmd", "install", "--save-exact", "--no-audit", "--no-fund", f"colorjs.io@{versions['colorjs.io']}"], runtime)
        data["runtime"]["color_api_sources"] = ["https://colorjs.io/docs/the-color-object.html", "https://colorjs.io/docs/contrast.html"]
        save(data)
        print(f"Installed isolated CSS Color4 parser: colorjs.io {versions['colorjs.io']}", flush=True)
    elif args.stage == "verify":
        required = {
            "frontend-law-auditor": ["SKILL.md", "scripts/law_audit.py", "references/metrics-schema.md", "rules/_sections.md", "examples/evidence.sample.json"],
            "mobile-ux-audit": ["SKILL.md", "playbook/ux-audit-playbook.md", "references/stack-detection.md", "references/heuristics.md", "references/platform-guidelines.md", "templates/audit-report-template.md", "cli/index.js"],
            "kz-uiuxrule": ["rules/INDEX.md", "rules/ui-rules.md", "rules/chart-rules.md", "rules/design-principles.md", "skills/ui-glance/SKILL.md"],
            "kz-uicheck": [f"checks/{name}-check.js" for name in ("table", "typing", "popover", "contrast", "modal", "focus", "form")] + ["checks/layout-audit.js"],
        }
        for name, skill in data["skills"].items():
            path = Path(skill["path"])
            files = [item for item in path.rglob("*") if item.is_file()]
            skill.update({"file_count": len(files), "skill_md_sha256": hashlib.sha256((path / "SKILL.md").read_bytes()).hexdigest()})
            missing = [item for item in required.get(name, []) if not (path / item).is_file()]
            if missing:
                raise RuntimeError(f"Missing installed support files for {name}: {missing}")
            if skill["source_key"] == "kz-skills":
                source_dir = Path(skill["full_source_reference"]) / skill["source_path"]
                expected = [item.relative_to(source_dir) for item in source_dir.rglob("*") if item.is_file()]
                missing_source_files = [str(item) for item in expected if not (path / item).is_file()]
                if missing_source_files:
                    raise RuntimeError(f"Incomplete sibling skill: {name}: {missing_source_files}")
                skill["source_files_preserved"] = len(expected)
        for name, source in data["sources"].items():
            if source.get("local_path"):
                actual = run(f"final-source-{name}", ["git", "-C", source["local_path"], "rev-parse", "HEAD"])
                if actual != source["commit"]:
                    raise RuntimeError(f"Source commit mismatch: {name}")
                source["verified_commit"] = actual
        rubric = Path(data["sources"]["ux-gap-detector"]["local_path"]) / "skills/ux-gap-detector/scoring-rubric.md"
        data["sources"]["ux-gap-detector"].update({"rubric_path": str(rubric), "rubric_sha256": hashlib.sha256(rubric.read_bytes()).hexdigest(),
            "rubric_caveat": "Per-dimension issue-priority table uses 0-49/50-74/75+ ranges although dimensions max25; use explicit 0-25 dimension and 0-100 overall verdict bands; do not invent normalization."})
        data["skills"]["frontend-law-auditor"]["verified_help"] = run("law-help", [sys.executable, str(SKILLS / "frontend-law-auditor/scripts/law_audit.py"), "--help"])
        data["skills"]["mobile-ux-audit"]["selected_workflow"] = "Codex executes portable playbook; no CLI dependencies installed and no Claude API calls"
        if data["runtime"].get("path"):
            runtime = Path(data["runtime"]["path"])
            data["runtime"]["npm_ls"] = json.loads(run("runtime-npm-ls", ["npm.cmd", "ls", "--depth=0", "--json"], runtime))
            for name, version in data["runtime"]["package_versions"].items():
                if data["runtime"]["npm_ls"]["dependencies"][name]["version"] != version:
                    raise RuntimeError(f"Installed dependency version mismatch: {name}")
            for name, relative in (("playwright", "playwright/cli.js"), ("lighthouse", "lighthouse/cli/index.js"), ("tsx", "tsx/dist/cli.mjs")):
                data["runtime"][f"{name}_version_output"] = run(f"{name}-version", ["node", str(runtime / "node_modules" / relative), "--version"])
            data["runtime"]["package_lock_sha256"] = hashlib.sha256((runtime / "package-lock.json").read_bytes()).hexdigest()
            converter = runtime / "contrast-offline.mjs"
            if converter.exists():
                test_output = run("offline-contrast-fixtures", ["node", "--test", str(runtime / "contrast-offline.test.mjs")])
                data["runtime"]["offline_converter"] = {"path": str(converter), "sha256": hashlib.sha256(converter.read_bytes()).hexdigest(),
                    "verified_help": run("offline-contrast-help", ["node", str(converter), "--help"]),
                    "fixture_verification": test_output, "browser_access": False,
                    "primary_sources": ["https://colorjs.io/docs/the-color-object.html", "https://colorjs.io/docs/contrast.html", "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"]}
        data["verification"] = {"at_utc": utc(), "support_files": "present", "source_commits": "matched", "exact_runtime_versions": "matched", "audits_run": False, "browser_launches": False, "business_writes": False}
        save(data)
        print(f"Verified preparation manifest: {MANIFEST}", flush=True)


if __name__ == "__main__":
    main()
