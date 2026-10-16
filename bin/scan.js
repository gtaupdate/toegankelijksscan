#!/usr/bin/env node
'use strict';
/*
 * Gebruik:
 *   node bin/scan.js <url of bestand> [--pages 5] [--out map] [--naam "Bedrijf BV"] [--email info@x.nl]
 *
 * Schrijft naar de uitvoermap: rapport.html, verklaring.html en scan.json.
 */
const fs = require('fs');
const path = require('path');
const { scanSite } = require('../src/scanner');
const { renderReport } = require('../src/report/report');
const { renderStatement } = require('../src/report/statement');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    } else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = args._[0];
  if (!target) {
    console.error('Gebruik: node bin/scan.js <url of bestand> [--pages 5] [--out map]');
    process.exit(2);
  }
  const outDir = path.resolve(args.out || 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const maxPages = Math.max(1, Math.min(25, parseInt(args.pages, 10) || 5));

  console.log('Scannen: ' + target + ' (max ' + maxPages + ' pagina\'s)…');
  const scan = await scanSite(target, { maxPages });
  const org = { name: args.naam, email: args.email, website: args.website, fixBy: args.voor };

  fs.writeFileSync(path.join(outDir, 'scan.json'), JSON.stringify(scan, null, 2));
  fs.writeFileSync(path.join(outDir, 'rapport.html'), renderReport(scan));
  const scanned = scan.pages.some((p) => !p.error);
  if (scanned) fs.writeFileSync(path.join(outDir, 'verklaring.html'), renderStatement(scan, org));

  console.log(scanned
    ? 'Score: ' + scan.score.score + '/100 (' + scan.score.grade.label + ')'
    : 'Scan mislukt: geen enkele pagina geladen. Er is geen score en geen verklaring gemaakt.');
  console.log('Fouten: ' + scan.summary.totalErrors + ' in ' + scan.summary.rulesFailed + ' categorieën; handmatig controleren: ' + scan.summary.totalReview);
  if (scan.errors.length) console.log('Niet gescand: ' + scan.errors.map((e) => e.url + ' (' + e.error + ')').join('; '));
  console.log('Rapport: ' + path.join(outDir, 'rapport.html'));
  // Exitcode 0 bij een geslaagde scan, ook als er fouten op de site staan; 1 als de startpagina niet laadde.
  process.exit(scan.pages[0] && scan.pages[0].error ? 1 : 0);
}

main().catch((e) => {
  console.error('Scan mislukt: ' + e.message);
  process.exit(1);
});
