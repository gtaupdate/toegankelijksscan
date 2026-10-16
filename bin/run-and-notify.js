#!/usr/bin/env node
'use strict';
/*
 * Scant één of meer sites, schrijft per site rapport.html / verklaring.html / scan.json
 * naar out/<naam>/ en stuurt een samenvatting naar een webhook (bijv. Make.com).
 *
 *   node bin/run-and-notify.js www.site.nl [andere.nl ...] [--file scan-verzoeken.txt] [--pages 5]
 *
 * Webhook-adres via omgevingsvariabele RESULT_WEBHOOK. Zonder die variabele wordt alleen gescand.
 * Exitcode 1 als een site niet geladen kon worden, zodat GitHub je een melding stuurt.
 */
const fs = require('fs');
const path = require('path');
const { scanSite } = require('../src/scanner');
const { renderReport } = require('../src/report/report');
const { renderStatement } = require('../src/report/statement');

function parseArgs(argv) {
  const out = { urls: [], pages: 5, file: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pages') out.pages = Math.max(1, Math.min(25, parseInt(argv[++i], 10) || 5));
    else if (argv[i] === '--file') out.file = argv[++i];
    else out.urls.push(argv[i]);
  }
  if (out.file) {
    const lines = fs.readFileSync(out.file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    out.urls.push(...lines);
  }
  out.urls = Array.from(new Set(out.urls));
  return out;
}

function slug(s) {
  return s.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]+/g, '_').slice(0, 80);
}

// Compacte samenvatting: past ruim binnen de limieten van een webhook en is goed leesbaar.
function payloadFor(scan, extra = {}) {
  const trim = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || null);
  return {
    type: 'toegankelijkscan.resultaat',
    version: scan.tool.version,
    ruleset: scan.tool.ruleset,
    url: scan.startUrl,
    scannedAt: scan.scannedAt,
    score: scan.score.score,
    grade: scan.score.grade.label,
    summary: scan.summary,
    platforms: scan.platforms,
    pages: scan.pages.map((p) => ({ url: p.url, title: trim(p.title, 120), error: p.error || null })),
    issues: scan.issues.map((i) => ({
      id: i.id, title: i.title, impact: i.impact, kind: i.kind, count: i.count, reviewCount: i.reviewCount,
      occurrences: i.occurrences || i.count, pagesAffected: new Set(i.pages).size,
      wcag: i.wcag.id,
      examples: i.examples.slice(0, 5).map((e) => ({
        selector: trim(e.selector, 160), html: trim(e.html, 200), detail: trim(e.detail, 160),
        page: e.page, pageCount: e.pageCount, fg: e.fg, bg: e.bg, ratio: e.ratio,
      })),
    })),
    ...extra,
  };
}

async function notify(webhook, payload) {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Webhook antwoordde met status ' + res.status);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.urls.length) {
    console.error('Geen adressen opgegeven.');
    process.exit(2);
  }
  const webhook = process.env.RESULT_WEBHOOK || '';
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
    ? process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID
    : null;
  let failed = 0;
  for (const url of args.urls) {
    console.log('Scannen: ' + url);
    const scan = await scanSite(url, { maxPages: args.pages });
    const dir = path.join('out', slug(url));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'scan.json'), JSON.stringify(scan, null, 2));
    fs.writeFileSync(path.join(dir, 'rapport.html'), renderReport(scan));
    const ok = scan.pages.some((p) => !p.error);
    if (ok) fs.writeFileSync(path.join(dir, 'verklaring.html'), renderStatement(scan, {}));
    else failed++;
    console.log(ok ? '  score ' + scan.score.score + ' (' + scan.score.grade.label + ')' : '  niet gescand: ' + scan.errors.map((e) => e.error).join('; '));
    if (webhook) {
      try {
        await notify(webhook, payloadFor(scan, { runUrl, trigger: process.env.GITHUB_EVENT_NAME || 'handmatig' }));
        console.log('  verstuurd naar webhook');
      } catch (e) {
        console.error('  webhook mislukt: ' + e.message);
        failed++;
      }
    }
  }
  process.exit(failed ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { payloadFor, parseArgs, notify };
