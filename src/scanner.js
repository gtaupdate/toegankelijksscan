'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { aggregate, computeScore, summarize } = require('./score');

const RULES_SRC =
  fs.readFileSync(path.join(__dirname, 'rules', 'color.js'), 'utf8') + '\n;\n' +
  fs.readFileSync(path.join(__dirname, 'rules', 'browser-rules.js'), 'utf8');

// Paginatypes die voor webshops het belangrijkst zijn (de EAA gaat over het hele aankoopproces).
const PRIORITY = [
  /\/(product|products|p)\//i,
  /(winkelwagen|winkelmand|cart|basket)/i,
  /(afrekenen|checkout|bestellen)/i,
  /(collectie|collections|categorie|category|shop)/i,
  /(contact|klantenservice|service)/i,
  /(account|inloggen|login)/i,
];

const DEFAULTS = {
  maxPages: 5,
  timeoutMs: 30000,
  viewport: { width: 1366, height: 900 },
  screenshot: true,
};

function normalizeUrl(input) {
  if (/^(https?|file):\/\//i.test(input)) return input;
  if (fs.existsSync(input)) return 'file://' + path.resolve(input);
  return 'https://' + input;
}

async function scanPage(context, url, opts) {
  const page = await context.newPage();
  const started = Date.now();
  try {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: opts.timeoutMs });
    } catch (e) {
      // Sommige sites worden nooit "networkidle" (chat-widgets, trackers). Dan wachten we op 'load'.
      if (/Timeout/i.test(e.message)) await page.goto(url, { waitUntil: 'load', timeout: opts.timeoutMs });
      else throw e;
    }
    await page.waitForTimeout(500); // lazy content even de tijd geven
    // Via evaluate (niet via een script-tag) zodat een strikte CSP van de site de scan niet blokkeert.
    const data = await page.evaluate(RULES_SRC + '\n;window.__tsRules.run();');
    let links = [];
    if (opts.collectLinks) {
      links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.href)
        .filter((h) => h.startsWith(location.origin))
        .map((h) => h.split('#')[0]));
    }
    let screenshot = null;
    if (opts.screenshot) {
      const buf = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: false });
      screenshot = 'data:image/jpeg;base64,' + buf.toString('base64');
    }
    return {
      url: data.page.url,
      title: data.page.title,
      lang: data.page.lang,
      platforms: data.page.platforms,
      results: data.results,
      links,
      screenshot,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return { url, error: e.message.split('\n')[0], durationMs: Date.now() - started };
  } finally {
    await page.close();
  }
}

function pickPages(startUrl, links, max) {
  const unique = Array.from(new Set(links)).filter((l) => l !== startUrl && !/\.(pdf|jpe?g|png|zip|webp|svg)$/i.test(l));
  const chosen = [];
  for (const re of PRIORITY) {
    const hit = unique.find((l) => re.test(l) && !chosen.includes(l));
    if (hit) chosen.push(hit);
    if (chosen.length >= max) return chosen;
  }
  for (const l of unique) {
    if (chosen.length >= max) break;
    if (!chosen.includes(l)) chosen.push(l);
  }
  return chosen;
}

/**
 * Scant een website: de startpagina plus maximaal (maxPages - 1) belangrijke interne pagina's.
 */
async function scanSite(input, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const startUrl = normalizeUrl(input);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: opts.viewport,
    bypassCSP: true,
    locale: 'nl-NL',
    userAgent: undefined,
  });
  if (opts.blockPrivate) {
    // Elk verzoek van de browser (ook redirects, scripts, afbeeldingen) gaat langs de controle.
    const { hostIsPublic } = require('./net-guard');
    await context.route('**/*', async (route) => {
      let ok = false;
      try {
        const u = new URL(route.request().url());
        ok = ['http:', 'https:', 'data:', 'blob:'].includes(u.protocol) &&
          (u.protocol === 'data:' || u.protocol === 'blob:' || await hostIsPublic(u.hostname));
      } catch (e) { ok = false; }
      return ok ? route.continue() : route.abort('blockedbyclient');
    });
  }
  const startedAt = new Date();
  try {
    const first = await scanPage(context, startUrl, { ...opts, collectLinks: opts.maxPages > 1 });
    const pages = [first];
    if (!first.error && opts.maxPages > 1) {
      const extra = pickPages(first.url, first.links || [], opts.maxPages - 1);
      for (const url of extra) pages.push(await scanPage(context, url, { ...opts, screenshot: false }));
    }
    for (const p of pages) delete p.links;
    const issues = aggregate(pages);
    const scanned = pages.filter((p) => !p.error).length;
    // Zonder één geslaagde pagina is er niets beoordeeld: nooit een score tonen.
    const score = scanned
      ? computeScore(issues)
      : { score: null, grade: { label: 'Scan mislukt', tone: 'kritiek' } };
    const summary = summarize(issues);
    const platforms = Array.from(new Set(pages.flatMap((p) => p.platforms || [])));
    return {
      tool: { name: 'Toegankelijkscan', version: require('../package.json').version, ruleset: '2026.10-a' },
      startUrl,
      scannedAt: startedAt.toISOString(),
      platforms,
      pages,
      issues,
      score,
      summary,
      errors: pages.filter((p) => p.error).map((p) => ({ url: p.url, error: p.error })),
    };
  } finally {
    await browser.close();
  }
}

module.exports = { scanSite, pickPages, normalizeUrl };
