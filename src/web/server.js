'use strict';
/*
 * Minimale webserver zonder extra pakketten.
 *   GET  /                 landingspagina met scanformulier
 *   POST /scan             start een scan (gevalideerd, met rate limit en wachtrij)
 *   GET  /rapport/:id      wachtpagina, of het rapport zodra de scan klaar is
 *   GET  /verklaring/:id   conceptverklaring (?naam=&email=)
 *   GET  /api/scan/:id     JSON-resultaat (voor koppelingen, bijv. Make.com)
 *
 * Opslag is in het geheugen en verloopt na 24 uur. Voor productie: een database (zie README).
 */
const http = require('http');
const crypto = require('crypto');
const { scanSite } = require('../scanner');
const { assertPublicUrl } = require('../net-guard');
const { renderReport } = require('../report/report');
const { renderStatement } = require('../report/statement');
const pages = require('./pages');

const CONFIG = {
  port: parseInt(process.env.PORT, 10) || 8080,
  maxPages: parseInt(process.env.SCAN_MAX_PAGES, 10) || 3,
  concurrency: parseInt(process.env.SCAN_CONCURRENCY, 10) || 2,
  perIpPerHour: parseInt(process.env.SCANS_PER_IP_PER_HOUR, 10) || 5,
  ttlMs: 24 * 3600 * 1000,
  // Alleen in tests uitzetten: dan mag de scanner lokale testpagina's bezoeken.
  blockPrivate: process.env.ALLOW_PRIVATE_TARGETS !== '1',
  // Sleutel voor de API (Make.com, scripts). Zonder sleutel staat de API uit.
  apiKey: process.env.API_KEY || '',
  apiMaxPages: 25,
  // Publiek adres van deze server, voor links naar rapporten in API-antwoorden.
  baseUrl: (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''),
};

const store = new Map();      // id -> { status, url, scan, error, created }
const hits = new Map();       // ip -> [timestamps]
const queue = [];
let running = 0;

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extra });
  res.end(body);
}

function clientIp(req) {
  // Achter een reverse proxy: zet TRUST_PROXY=1 zodat X-Forwarded-For wordt gebruikt.
  if (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']) {
    return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'onbekend';
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600 * 1000);
  if (list.length >= CONFIG.perIpPerHour) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('te groot')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function pump() {
  while (running < CONFIG.concurrency && queue.length) {
    const id = queue.shift();
    const job = store.get(id);
    if (!job) continue;
    running++;
    job.status = 'bezig';
    scanSite(job.url, { maxPages: job.maxPages || CONFIG.maxPages, blockPrivate: CONFIG.blockPrivate })
      .then((scan) => {
        if (!scan.pages.some((p) => !p.error)) {
          job.status = 'mislukt';
          job.error = 'De website kon niet worden geladen. Controleer het adres en probeer het opnieuw.';
        } else {
          job.status = 'klaar';
          job.scan = scan;
        }
      })
      .catch(() => { job.status = 'mislukt'; job.error = 'Er ging iets mis tijdens het scannen. Probeer het later opnieuw.'; })
      .finally(() => { running--; pump(); });
  }
}

function enqueue(url, maxPages) {
  const id = crypto.randomUUID();
  store.set(id, { status: 'wachtrij', url, maxPages, created: Date.now() });
  queue.push(id);
  pump();
  return id;
}

function apiView(id, job) {
  const out = { id, status: job.status, url: job.url, error: job.error || null };
  if (CONFIG.baseUrl) out.reportUrl = CONFIG.baseUrl + '/rapport/' + id;
  if (job.scan) {
    out.score = job.scan.score;
    out.summary = job.scan.summary;
    out.platforms = job.scan.platforms;
    out.pages = job.scan.pages.map((p) => ({ url: p.url, title: p.title || null, error: p.error || null }));
    out.issues = job.scan.issues.map((i) => ({
      id: i.id, title: i.title, impact: i.impact, kind: i.kind, count: i.count, reviewCount: i.reviewCount,
      wcag: i.wcag, examples: i.examples.slice(0, 5).map((e) => ({ selector: e.selector, html: e.html, detail: e.detail, page: e.page })),
    }));
  }
  return out;
}

// Vergelijk sleutels in constante tijd.
function validKey(req) {
  if (!CONFIG.apiKey) return false;
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(given);
  const b = Buffer.from(CONFIG.apiKey);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function waitFor(id, maxMs) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    const job = store.get(id);
    if (!job || job.status === 'klaar' || job.status === 'mislukt') return;
    await new Promise((r) => setTimeout(r, 500));
  }
}

function cleanup() {
  const now = Date.now();
  for (const [id, job] of store) if (now - job.created > CONFIG.ttlMs) store.delete(id);
}
setInterval(cleanup, 10 * 60 * 1000).unref();

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, pages.landing());

  if (req.method === 'POST' && url.pathname === '/scan') {
    let input = '';
    try {
      input = new URLSearchParams(await readBody(req)).get('url') || '';
    } catch (e) {
      return send(res, 413, pages.landing({ error: 'Het verzoek is te groot.' }));
    }
    let target;
    try {
      target = await assertPublicUrl(input, { allowPrivate: !CONFIG.blockPrivate });
    } catch (e) {
      return send(res, 400, pages.landing({ value: input, error: e.message }));
    }
    if (rateLimited(clientIp(req))) {
      return send(res, 429, pages.landing({ value: input, error: 'Je hebt het maximale aantal gratis scans per uur bereikt. Probeer het over een uur opnieuw.' }));
    }
    const id = enqueue(target, CONFIG.maxPages);
    res.writeHead(303, { Location: '/rapport/' + id, ...SECURITY_HEADERS });
    return res.end();
  }

  if (req.method === 'GET' && parts[0] === 'rapport' && parts.length === 2) {
    const job = store.get(parts[1]);
    if (!job) return send(res, 404, pages.notFound());
    if (job.status === 'mislukt') return send(res, 200, pages.failed(job.error));
    if (job.status !== 'klaar') return send(res, 200, pages.waiting(parts[1], job.url));
    const html = renderReport(job.scan).replace('<body>', '<body>' + pages.reportBar(parts[1]));
    return send(res, 200, html);
  }

  if (req.method === 'GET' && parts[0] === 'verklaring' && parts.length === 2) {
    const job = store.get(parts[1]);
    if (!job || job.status !== 'klaar') return send(res, 404, pages.notFound());
    const naam = (url.searchParams.get('naam') || '').slice(0, 120);
    const email = (url.searchParams.get('email') || '').slice(0, 160);
    return send(res, 200, renderStatement(job.scan, { name: naam || undefined, email: email || undefined }));
  }

  const JSON_TYPE = 'application/json; charset=utf-8';

  // POST /api/scans  { "url": "...", "pages": 5, "wait": true }  met header Authorization: Bearer <API_KEY>
  if (req.method === 'POST' && url.pathname === '/api/scans') {
    if (!validKey(req)) return send(res, 401, JSON.stringify({ error: 'Ongeldige of ontbrekende API-sleutel.' }), JSON_TYPE);
    let body;
    try {
      body = JSON.parse(await readBody(req) || '{}');
    } catch (e) {
      return send(res, 400, JSON.stringify({ error: 'Ongeldige JSON.' }), JSON_TYPE);
    }
    let target;
    try {
      target = await assertPublicUrl(body.url, { allowPrivate: !CONFIG.blockPrivate });
    } catch (e) {
      return send(res, 400, JSON.stringify({ error: e.message }), JSON_TYPE);
    }
    const pagesWanted = Math.max(1, Math.min(CONFIG.apiMaxPages, parseInt(body.pages, 10) || 5));
    const id = enqueue(target, pagesWanted);
    // Met "wait": wachten tot de scan klaar is (max. 110 s), handig voor Make.com.
    if (body.wait) await waitFor(id, 110000);
    const job = store.get(id);
    return send(res, job.status === 'klaar' || job.status === 'mislukt' ? 200 : 202, JSON.stringify(apiView(id, job)), JSON_TYPE);
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'scan' && parts.length === 3) {
    const job = store.get(parts[2]);
    if (!job) return send(res, 404, JSON.stringify({ error: 'niet gevonden' }), JSON_TYPE);
    return send(res, 200, JSON.stringify(apiView(parts[2], job)), JSON_TYPE);
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, JSON.stringify({ ok: true, queue: queue.length, running }), JSON_TYPE);
  }

  return send(res, 404, pages.notFound());
}

function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch(() => send(res, 500, pages.failed('Er ging iets mis aan onze kant.')));
  });
}

if (require.main === module) {
  createServer().listen(CONFIG.port, () => {
    console.log('Toegankelijkscan draait op http://localhost:' + CONFIG.port);
  });
}

module.exports = { createServer, CONFIG, store };
