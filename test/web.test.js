'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer, CONFIG } = require('../src/web/server');
const { isPrivateIp, assertPublicUrl } = require('../src/net-guard');
const { scanSite } = require('../src/scanner');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)));
}

function request(base, path, { method = 'GET', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, base);
    const h = body ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), ...headers } : headers;
    const req = http.request(u, { method, headers: h }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const form = (url) => 'url=' + encodeURIComponent(url);

test('interne adressen worden herkend', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2a00:1450:4001::1']) assert.equal(isPrivateIp(ip), false, ip);
});

test('adrescontrole weigert interne en vreemde adressen', async () => {
  for (const bad of ['', 'http://127.0.0.1/', 'localhost:3000', 'http://169.254.169.254/latest/meta-data', 'file:///etc/passwd',
    'javascript:alert(1)', 'http://user:pw@example.com', 'http://[::1]/', 'http://10.0.0.5', 'https://shop.local']) {
    await assert.rejects(assertPublicUrl(bad), undefined, 'zou geweigerd moeten worden: ' + bad);
  }
});

test('browserbeveiliging: ook tijdens de scan worden interne adressen geblokkeerd', async () => {
  const target = http.createServer((req, res) => res.end('<title>intern</title><h1>geheim</h1>'));
  const base = await listen(target);
  try {
    const scan = await scanSite(base + '/', { maxPages: 1, screenshot: false, blockPrivate: true });
    assert.ok(scan.pages[0].error, 'pagina had geblokkeerd moeten worden');
    assert.equal(scan.score.score, null);
  } finally {
    target.close();
  }
});

test('webapp: landingspagina, beveiligingsheaders en foutmelding bij intern adres', async () => {
  CONFIG.blockPrivate = true;
  const server = createServer();
  const base = await listen(server);
  try {
    const home = await request(base, '/');
    assert.equal(home.status, 200);
    assert.match(home.body, /<form class="scanform"/);
    assert.match(home.headers['content-security-policy'], /default-src 'none'/);
    assert.equal(home.headers['x-frame-options'], 'DENY');

    const bad = await request(base, '/scan', { method: 'POST', body: form('http://127.0.0.1:22/') });
    assert.equal(bad.status, 400);
    assert.match(bad.body, /niet publiek bereikbaar|standaardpoorten/);
    assert.match(bad.body, /role="alert"/);

    const missing = await request(base, '/rapport/bestaat-niet');
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});

test('webapp: volledige scan via het formulier, rapport, verklaring en API', async () => {
  CONFIG.blockPrivate = false; // alleen in de test: lokale proefwinkel toestaan
  CONFIG.perIpPerHour = 2;
  const shop = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html lang="nl"><head><title>Proefwinkel</title></head><body><h1>Proef</h1><img src="a.png" width="40" height="40"><input type="text"></body></html>');
  });
  const shopBase = await listen(shop);
  const server = createServer();
  const base = await listen(server);
  try {
    const post = await request(base, '/scan', { method: 'POST', body: form(shopBase + '/') });
    assert.equal(post.status, 303);
    const loc = post.headers.location;
    assert.match(loc, /^\/rapport\/[0-9a-f-]{36}$/);
    const id = loc.split('/').pop();

    let page;
    for (let i = 0; i < 60; i++) {
      page = await request(base, loc);
      if (!/Je webshop wordt gescand/.test(page.body)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.match(page.body, /Bevindingen/);
    assert.match(page.body, /Afbeeldingen zonder tekstalternatief/);
    assert.match(page.body, /Maak je toegankelijkheidsverklaring/);

    const api = JSON.parse((await request(base, '/api/scan/' + id)).body);
    assert.equal(api.status, 'klaar');
    assert.deepEqual(api.issues.map((i) => i.id).sort(), ['form-label', 'image-alt']);

    const st = await request(base, '/verklaring/' + id + '?naam=' + encodeURIComponent('<script>alert(1)</script>') + '&email=a@b.nl');
    assert.equal(st.status, 200);
    assert.doesNotMatch(st.body, /<script/i);
    assert.match(st.body, /&lt;script&gt;/);

    // Rate limit: derde scan binnen het uur wordt geweigerd.
    await request(base, '/scan', { method: 'POST', body: form(shopBase + '/') });
    const third = await request(base, '/scan', { method: 'POST', body: form(shopBase + '/') });
    assert.equal(third.status, 429);
  } finally {
    server.close();
    shop.close();
    CONFIG.blockPrivate = true;
  }
});

test('API: sleutel verplicht, scan met wachten levert volledig resultaat', async () => {
  CONFIG.apiKey = 'test-sleutel-1234567890';
  CONFIG.baseUrl = 'https://scan.voorbeeld.nl';
  const shop = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html lang="nl"><head><title>API-proef</title></head><body><h1>Proef</h1><button></button></body></html>');
  });
  const shopBase = await listen(shop);
  const server = createServer();
  const base = await listen(server);
  const json = (obj) => JSON.stringify(obj);
  try {
    const noKey = await request(base, '/api/scans', { method: 'POST', body: json({ url: shopBase }) });
    assert.equal(noKey.status, 401);
    const wrong = await request(base, '/api/scans', { method: 'POST', body: json({ url: shopBase }), headers: { Authorization: 'Bearer fout' } });
    assert.equal(wrong.status, 401);

    CONFIG.blockPrivate = true;
    const internal = await request(base, '/api/scans', { method: 'POST', body: json({ url: 'http://169.254.169.254/' }), headers: { Authorization: 'Bearer test-sleutel-1234567890' } });
    assert.equal(internal.status, 400);

    CONFIG.blockPrivate = false;
    const ok = await request(base, '/api/scans', { method: 'POST', body: json({ url: shopBase + '/', pages: 1, wait: true }), headers: { Authorization: 'Bearer test-sleutel-1234567890' } });
    assert.equal(ok.status, 200);
    const data = JSON.parse(ok.body);
    assert.equal(data.status, 'klaar');
    assert.match(data.reportUrl, /^https:\/\/scan\.voorbeeld\.nl\/rapport\//);
    assert.deepEqual(data.issues.map((i) => i.id), ['button-name']);
    assert.ok(data.issues[0].examples.length === 1);

    const health = JSON.parse((await request(base, '/health')).body);
    assert.equal(health.ok, true);
  } finally {
    server.close();
    shop.close();
    CONFIG.blockPrivate = true;
    CONFIG.apiKey = '';
  }
});
