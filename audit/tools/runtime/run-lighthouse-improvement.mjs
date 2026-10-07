import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../../..');
const baseline = JSON.parse(readFileSync(path.join(root, 'audit/raw/baseline/web/lighthouse-summary.json'), 'utf8'));
const output = path.join(root, 'audit/runs/2026-10-03-improvement-02/raw/performance');
mkdirSync(output, { recursive: true });
const started = new Date().toISOString();
const artifacts = path.join(output, `lighthouse-login-${started.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`);
mkdirSync(artifacts);
const summaryFile = path.join(output, 'lighthouse-summary.json');
const cli = baseline.runs[0].argv[1];
const runtime = path.join(root, 'audit/tools/runtime');
assert.equal(JSON.parse(readFileSync(path.join(runtime, 'node_modules/lighthouse/package.json'))).version, '13.5.0');

function save(value) { writeFileSync(summaryFile, `${JSON.stringify(value, null, 2)}\n`); }
function portOpen() {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port: 4173 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => { socket.destroy(); assert.equal(error.code, 'ECONNREFUSED'); resolve(false); });
  });
}
function hash(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function protectedFiles() {
  const files = ['package.json', 'pnpm-lock.yaml', 'apps/web/package.json', 'apps/web/vite.config.ts'];
  function walk(directory) { for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) { const relative = `${directory}/${entry.name}`; if (entry.isDirectory()) walk(relative); else files.push(relative); } }
  walk('apps/web/dist');
  return Object.fromEntries(files.map(file => [file, hash(path.join(root, file))]));
}
function statistics(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { values, median: sorted[Math.floor(sorted.length / 2)], range: [sorted[0], sorted[sorted.length - 1]] };
}
const summary = {
  started_at_utc: started, status: 'RUNNING', url: baseline.url, scope: baseline.scope,
  artifacts_directory: artifacts, driver: baseline.driver,
  authenticated_routes: baseline.authenticated_routes, field_INP: baseline.field_INP,
  separate_axe_scan: baseline.separate_axe_scan, limitations: baseline.limitations,
  baseline_summary: 'audit/raw/baseline/web/lighthouse-summary.json',
  protected_files_before: protectedFiles(), runs: [],
};
assert.equal(await portOpen(), false, 'Port 4173 is already in use; no unrelated process will be stopped');
const previewLog = openSync(path.join(artifacts, 'preview.stdout.log'), 'w');
const previewError = openSync(path.join(artifacts, 'preview.stderr.log'), 'w');
const previewArgv = [path.join(root, 'apps/web/node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'];
const preview = spawn(process.execPath, previewArgv, { cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: ['ignore', previewLog, previewError] });
summary.preview = { pid: preview.pid, hidden: true, listeners_before: [], argv: [process.execPath, ...previewArgv], cwd: path.join(root, 'apps/web'), stopped: false };
save(summary);
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (preview.exitCode !== null) throw new Error(`Owned preview exited early: ${preview.exitCode}`);
    try { const response = await fetch(baseline.url); if (response.status === 200) { ready = true; summary.preview.http_status = response.status; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.equal(ready, true, 'Owned production preview did not become ready');
  for (let number = 1; number <= 3; number++) {
    const prefix = path.join(artifacts, `run-${number}`);
    const args = baseline.runs[0].argv.slice(2).map(value => value.startsWith('--output-path=') ? `--output-path=${prefix}` : value);
    const log = `${prefix}.log`;
    const descriptor = openSync(log, 'w');
    const runStarted = new Date().toISOString();
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: runtime, windowsHide: true, stdio: ['ignore', descriptor, descriptor], timeout: 120000 });
    closeSync(descriptor);
    assert.equal(result.status, 0, `Lighthouse ${number} failed: ${result.error?.message ?? result.status}`);
    const jsonReport = `${prefix}.report.json`;
    const htmlReport = `${prefix}.report.html`;
    assert.ok(existsSync(jsonReport) && existsSync(htmlReport));
    const report = JSON.parse(readFileSync(jsonReport));
    const accessibility = report.categories.accessibility.auditRefs.map(item => report.audits[item.id]);
    const run = {
      number, started_at_utc: runStarted, completed_at_utc: new Date().toISOString(), argv: [process.execPath, cli, ...args], cwd: runtime, log, exit_code: result.status,
      json_report: jsonReport, html_report: htmlReport, status: 'MEASURED', fetch_time: report.fetchTime,
      requested_url: report.requestedUrl, final_displayed_url: report.finalDisplayedUrl, final_url: report.finalUrl,
      lighthouse_version: report.lighthouseVersion, environment: report.environment, config_settings: report.configSettings,
      credits: report.environment.credits, embedded_axe_version: report.environment.credits['axe-core'],
      metrics: { LCP_ms: report.audits['largest-contentful-paint'].numericValue, CLS: report.audits['cumulative-layout-shift'].numericValue, TBT_ms: report.audits['total-blocking-time'].numericValue },
      performance_score: report.categories.performance.score, accessibility_score: report.categories.accessibility.score,
      accessibility_failed_audits: accessibility.filter(item => item.score !== null && item.score < 1).map(item => ({ id: item.id, title: item.title, score: item.score })),
      accessibility_manual_audits: accessibility.filter(item => item.scoreDisplayMode === 'manual').map(item => item.id),
      accessibility_unknown_audits: accessibility.filter(item => item.scoreDisplayMode === 'error').map(item => item.id), run_warnings: report.runWarnings,
    };
    summary.runs.push(run);
    if (number === 1) {
      const data = report.audits['final-screenshot'].details.data;
      const screenshot = `${prefix}-final-screenshot.jpg`;
      writeFileSync(screenshot, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
      summary.scope_verification = { status: 'PENDING_OFFLINE_VISUAL_CHECK', method: 'Lighthouse final-screenshot artifact only', screenshot };
    }
    save(summary);
    console.log(JSON.stringify({ number, ...run.metrics, performance_score: run.performance_score, accessibility_score: run.accessibility_score, failed_audits: run.accessibility_failed_audits }));
  }
  summary.successful_runs = summary.runs.length;
  summary.statistics = Object.fromEntries(['LCP_ms', 'CLS', 'TBT_ms'].map(metric => [metric, statistics(summary.runs.map(run => run.metrics[metric]))]));
  summary.statistics.performance_score = statistics(summary.runs.map(run => run.performance_score));
  summary.statistics.accessibility_score = statistics(summary.runs.map(run => run.accessibility_score));
  summary.settings_identical = summary.runs.every(run => JSON.stringify(run.config_settings) === JSON.stringify(summary.runs[0].config_settings));
  summary.settings_match_baseline = JSON.stringify(summary.runs[0].config_settings) === JSON.stringify(baseline.runs[0].config_settings);
  summary.pinned_versions_match_baseline = summary.runs.every(run => run.lighthouse_version === baseline.runs[0].lighthouse_version && run.embedded_axe_version === baseline.runs[0].embedded_axe_version);
  summary.browser_version_matches_baseline = summary.runs.every(run => run.environment.hostUserAgent === baseline.runs[0].environment.hostUserAgent);
  summary.protected_files_after = protectedFiles();
  summary.protected_files_unchanged = JSON.stringify(summary.protected_files_after) === JSON.stringify(summary.protected_files_before);
  assert.ok(summary.protected_files_unchanged, 'Protected configurations/dist changed during measurement');
  summary.status = 'MEASURED';
} catch (error) {
  summary.status = 'FAILED';
  summary.error = error.stack;
  process.exitCode = 1;
} finally {
  if (preview.exitCode === null) {
    const exited = new Promise(resolve => preview.once('exit', resolve));
    preview.kill();
    await exited;
  }
  closeSync(previewLog); closeSync(previewError);
  summary.preview.stopped = true;
  summary.preview.exit_code = preview.exitCode;
  summary.preview.listeners_after = await portOpen() ? ['Port has another listener after owned preview stopped; no unrelated process stopped'] : [];
  summary.completed_at_utc = new Date().toISOString();
  summary.artifact_sha256 = Object.fromEntries(readdirSync(artifacts).map(name => [name, hash(path.join(artifacts, name))]));
  save(summary);
  console.log(JSON.stringify({ status: summary.status, summary: summaryFile, statistics: summary.statistics, preview_stopped: summary.preview.stopped, port_4173_free: summary.preview.listeners_after.length === 0 }));
}

