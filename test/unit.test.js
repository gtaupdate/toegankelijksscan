'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/rules/color');
const { computeScore, ruleDeduction, gradeFor } = require('../src/score');
const { pickPages } = require('../src/scanner');
const { esc, safeHex } = require('../src/report/escape');

test('contrast: zwart op wit is 21:1', () => {
  assert.equal(Math.round(C.contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }) * 100) / 100, 21);
});

test('contrast: bekende grenswaarden', () => {
  const white = { r: 255, g: 255, b: 255 };
  const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
  // #767676 op wit is de bekende "net genoeg"-kleur (4,54:1); #777777 valt er net onder (4,48:1).
  assert.ok(C.contrastRatio(hex('#767676'), white) >= 4.5);
  assert.ok(C.contrastRatio(hex('#777777'), white) < 4.5);
  assert.equal(Math.round(C.contrastRatio(hex('#aaaaaa'), white) * 100) / 100, 2.32);
});

test('grote tekst: 24px of 18,66px vet -> 3:1', () => {
  assert.equal(C.requiredRatio(24, '400'), 3);
  assert.equal(C.requiredRatio(18.66, '700'), 3);
  assert.equal(C.requiredRatio(18.66, '400'), 4.5);
  assert.equal(C.requiredRatio(16, 'bold'), 4.5);
});

test('kleuren parsen: oude en nieuwe syntax, onbekend formaat', () => {
  assert.deepEqual(C.parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(C.parseColor('rgba(10, 20, 30, 0.5)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(C.parseColor('rgb(10 20 30 / 0.25)'), { r: 10, g: 20, b: 30, a: 0.25 });
  assert.equal(C.parseColor('color(display-p3 1 0 0)'), null);
  assert.equal(C.parseColor('transparent').a, 0);
});

test('transparantie wordt over de achtergrond gemengd', () => {
  const mixed = C.blend({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
  assert.equal(Math.round(mixed.r), 128);
});

test('score: geen fouten = 100, signalen tellen niet mee', () => {
  assert.equal(computeScore([]).score, 100);
  assert.equal(computeScore([{ kind: 'controle', impact: 'matig', count: 50 }]).score, 100);
});

test('score: aftrek per regel is begrensd', () => {
  assert.equal(ruleDeduction('kritiek', 1), 10);
  assert.equal(ruleDeduction('kritiek', 10), 20);
  assert.equal(ruleDeduction('kritiek', 100000), 25); // plafond 2,5 × gewicht
  assert.equal(computeScore(Array.from({ length: 20 }, () => ({ kind: 'fout', impact: 'kritiek', count: 1000 }))).score, 0);
});

test('score-labels', () => {
  assert.equal(gradeFor(95).tone, 'goed');
  assert.equal(gradeFor(75).tone, 'matig');
  assert.equal(gradeFor(55).tone, 'ernstig');
  assert.equal(gradeFor(10).tone, 'kritiek');
});

test('paginakeuze: product, winkelwagen en checkout gaan voor', () => {
  const links = [
    'https://shop.nl/over-ons', 'https://shop.nl/blog/1', 'https://shop.nl/winkelwagen',
    'https://shop.nl/product/rode-jas', 'https://shop.nl/afrekenen', 'https://shop.nl/logo.png',
  ];
  assert.deepEqual(pickPages('https://shop.nl/', links, 3), [
    'https://shop.nl/product/rode-jas', 'https://shop.nl/winkelwagen', 'https://shop.nl/afrekenen',
  ]);
});

test('escape: HTML van gescande sites wordt onschadelijk gemaakt', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(safeHex('#12abEF'), '#12abEF');
  assert.equal(safeHex('red;background:url(x)'), '#000000');
});

test('webhook: compacte samenvatting wordt correct verstuurd', async () => {
  const http = require('http');
  const path = require('path');
  const { scanSite } = require('../src/scanner');
  const { payloadFor, notify, parseArgs } = require('../bin/run-and-notify');
  let received = null;
  const hook = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { received = { type: req.headers['content-type'], body: JSON.parse(body) }; res.end('Accepted'); });
  });
  await new Promise((r) => hook.listen(0, '127.0.0.1', r));
  try {
    const scan = await scanSite(path.join(__dirname, 'fixtures', 'fout-shop.html'), { maxPages: 1, screenshot: false });
    await notify('http://127.0.0.1:' + hook.address().port + '/', payloadFor(scan, { runUrl: 'x' }));
    assert.equal(received.type, 'application/json');
    assert.equal(received.body.type, 'toegankelijkscan.resultaat');
    assert.equal(received.body.score, scan.score.score);
    assert.equal(received.body.issues.length, scan.issues.length);
    assert.ok(JSON.stringify(received.body).length < 60000, 'samenvatting blijft klein');
  } finally {
    hook.close();
  }
  const fs = require('fs');
  const os = require('os');
  const f = path.join(os.tmpdir(), 'verzoeken-test.txt');
  fs.writeFileSync(f, '# commentaar\nsite-a.nl\n\nsite-b.nl\nsite-a.nl\n');
  assert.deepEqual(parseArgs(['--file', f, '--pages', '3']).urls, ['site-a.nl', 'site-b.nl']);
});
