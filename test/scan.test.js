'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const { scanSite } = require('../src/scanner');
const { renderReport } = require('../src/report/report');
const { renderStatement } = require('../src/report/statement');

const FIX = (f) => path.join(__dirname, 'fixtures', f);

function counts(page) {
  const out = {};
  for (const [id, r] of Object.entries(page.results)) {
    assert.ok(!r.error, 'regel ' + id + ' gaf een fout: ' + r.error);
    out[id] = [r.violationCount, r.incompleteCount];
  }
  return out;
}

test('foutenpagina: vindt precies de ingebouwde problemen', async () => {
  const scan = await scanSite(FIX('fout-shop.html'), { maxPages: 1, screenshot: false });
  const c = counts(scan.pages[0]);
  assert.deepEqual(c['html-lang'], [1, 0]);
  assert.deepEqual(c['document-title'], [1, 0]);
  assert.deepEqual(c['meta-viewport-zoom'], [1, 0]);
  assert.deepEqual(c['image-alt'], [1, 0], 'alleen #p1; alt="", aria-hidden en display:none tellen niet');
  assert.deepEqual(c['image-alt-suspicious'], [0, 1]);
  assert.deepEqual(c['link-name'], [1, 0]);
  assert.deepEqual(c['button-name'], [1, 0]);
  assert.deepEqual(c['form-label'], [2, 0], 'veld zonder label + select; hidden en gelabeld veld niet');
  assert.deepEqual(c['label-placeholder-only'], [1, 0]);
  assert.deepEqual(c['iframe-title'], [1, 0]);
  assert.deepEqual(c['tabindex-positive'], [1, 0]);
  assert.deepEqual(c['empty-heading'], [1, 0]);
  assert.deepEqual(c['heading-structure'], [0, 1]);
  assert.deepEqual(c['color-contrast'], [1, 1], '#aaa faalt; 24px #949494 en #767676 slagen; verloop = handmatig');

  const contrast = scan.pages[0].results['color-contrast'].violations[0];
  assert.equal(contrast.selector, '#lichte-tekst');
  assert.equal(contrast.ratio, 2.32);
  assert.equal(contrast.fg, '#aaaaaa');
  assert.equal(scan.pages[0].results['image-alt'].violations[0].selector, '#p1');
  assert.ok(scan.score.score < 50);
});

test('nette pagina: geen fouten en score 100', async () => {
  const scan = await scanSite(FIX('goede-shop.html'), { maxPages: 1, screenshot: false });
  const c = counts(scan.pages[0]);
  for (const [id, [v]] of Object.entries(c)) assert.equal(v, 0, id + ' gaf onterecht een fout');
  assert.equal(scan.score.score, 100);
  const statement = renderStatement(scan, { name: 'Test BV' });
  assert.match(statement, /Nog niet volledig onderzocht/, 'zonder fouten nooit "voldoet" claimen');
  assert.doesNotMatch(statement, /Status: Voldoet</);
});

// Lokale testsite: meerdere pagina's, een strikte CSP en kwaadaardige inhoud.
function startServer() {
  const pages = {
    '/': '<html lang="nl"><head><title>Home</title></head><body><h1>Shop</h1>' +
      '<a href="/over-ons">Over ons</a> <a href="/product/jas">Jas</a> <a href="/winkelwagen">Winkelwagen</a></body></html>',
    '/product/jas': '<html lang="nl"><head><title>Jas</title></head><body><h1>Jas</h1><img src="j.png" width="50" height="50"></body></html>',
    '/winkelwagen': '<html lang="nl"><head><title>Wagen</title></head><body><h1>Wagen</h1><input type="text"></body></html>',
    '/over-ons': '<html lang="nl"><head><title>Over</title></head><body><h1>Over</h1></body></html>',
    '/csp': '<html lang="nl"><head><title>CSP</title></head><body><h1>Strikt</h1><button></button></body></html>',
    '/kwaadaardig': '<html lang="nl"><head><title>&lt;script&gt;alert(1)&lt;/script&gt;</title></head><body><h1>x</h1>' +
      '<a href="/x" class="&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></a>' +
      '<img src="x" data-x="</td><script>alert(3)</script>" width="10" height="10"></body></html>',
  };
  const server = http.createServer((req, res) => {
    const body = pages[req.url];
    const headers = { 'Content-Type': 'text/html; charset=utf-8' };
    if (req.url === '/csp') headers['Content-Security-Policy'] = "default-src 'none'; script-src 'none'";
    if (!body) { res.writeHead(404, headers); res.end('<title>404</title>niet gevonden'); return; }
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('meerdere pagina\'s: kiest product en winkelwagen, telt fouten op', async () => {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const scan = await scanSite(base + '/', { maxPages: 3, screenshot: false });
    const urls = scan.pages.map((p) => new URL(p.url).pathname);
    assert.deepEqual(urls, ['/', '/product/jas', '/winkelwagen']);
    const byId = Object.fromEntries(scan.issues.map((i) => [i.id, i]));
    assert.equal(byId['image-alt'].count, 1);
    assert.equal(byId['form-label'].count, 1);
    assert.equal(scan.errors.length, 0);
  } finally {
    server.close();
  }
});

test('strikte Content-Security-Policy blokkeert de scan niet', async () => {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const scan = await scanSite(base + '/csp', { maxPages: 1, screenshot: false });
    assert.equal(scan.pages[0].error, undefined);
    assert.equal(scan.pages[0].results['button-name'].violationCount, 1);
  } finally {
    server.close();
  }
});

test('rapport bevat geen uitvoerbare code uit de gescande site', async () => {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const scan = await scanSite(base + '/kwaadaardig', { maxPages: 1, screenshot: false });
    const html = renderReport(scan) + renderStatement(scan, { name: '<script>alert(4)</script>' });
    assert.doesNotMatch(html, /<script/i, 'geen enkele script-tag in de uitvoer');
    assert.match(html, /&lt;script&gt;alert\(1\)/);
  } finally {
    server.close();
  }
});

test('onbereikbare site: nette foutmelding, geen crash', async () => {
  const scan = await scanSite('http://127.0.0.1:9/', { maxPages: 1, screenshot: false, timeoutMs: 5000 });
  assert.ok(scan.pages[0].error, 'fout wordt gemeld');
  assert.equal(scan.errors.length, 1);
  assert.equal(scan.score.score, null, 'geen score als er niets is gescand');
  const html = renderReport(scan);
  assert.match(html, /Niet gescand/);
  assert.match(html, /De website kon niet worden gescand/);
  assert.doesNotMatch(html, /Goed op weg/);
  assert.throws(() => renderStatement(scan, {}), /geen enkele pagina/);
});
