'use strict';
const { esc, fmtDate } = require('./escape');
const STYLES = require('./styles');

/*
 * Conceptversie van een toegankelijkheidsverklaring op basis van de scan.
 *
 * Bewuste keuzes:
 * - Een automatische scan kan nooit aantonen dat een site VOLDOET. Zonder gevonden fouten
 *   wordt de status daarom "nog niet volledig onderzocht", nooit "voldoet".
 * - De tekst is een concept dat de ondernemer zelf moet nalopen en aanvullen.
 */
function statusFor(scan) {
  const errors = scan.issues.filter((i) => i.kind === 'fout' && i.count);
  if (errors.length) {
    return {
      label: 'Voldoet nog niet volledig',
      text: 'Uit een geautomatiseerde controle blijkt dat de website nog niet volledig voldoet aan WCAG 2.1 niveau AA. Hieronder staat welke onderdelen nog niet toegankelijk zijn en wat we daaraan doen.',
    };
  }
  return {
    label: 'Nog niet volledig onderzocht',
    text: 'Een geautomatiseerde controle vond geen fouten. Zo\'n controle vindt niet alle problemen. We laten de website daarom nog handmatig testen.',
  };
}

function renderStatement(scan, org = {}, opts = {}) {
  if (!scan.pages.some((p) => !p.error)) {
    throw new Error('Geen verklaring mogelijk: er is geen enkele pagina gescand.');
  }
  const name = org.name || '[Bedrijfsnaam]';
  const site = org.website || scan.startUrl;
  const email = org.email || '[e-mailadres]';
  const phone = org.phone || '';
  const deadline = org.fixBy || '[datum]';
  const service = org.service || 'een webwinkel waarin consumenten producten kunnen bekijken, bestellen en betalen';
  const status = statusFor(scan);
  const errors = scan.issues.filter((i) => i.kind === 'fout' && i.count);
  const today = fmtDate(new Date().toISOString());

  const known = errors.length
    ? '<ul>' + errors.map((i) => '<li><strong>' + esc(i.title) + '</strong> (WCAG ' + esc(i.wcag.id) + '). ' + esc(plainImpact(i)) + '</li>').join('') + '</ul>' +
      '<p>We willen deze punten uiterlijk ' + esc(deadline) + ' hebben opgelost.</p>'
    : '<p>Op dit moment zijn er geen bekende problemen. Zodra de handmatige test is gedaan, werken we deze verklaring bij.</p>';

  const head = '<title>Toegankelijkheidsverklaring ' + esc(name) + '</title><meta name="claude:viewport-fit-sides" content="cover"><style>' + STYLES +
    '.doc{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:28px;display:grid;gap:18px;max-width:72ch}' +
    '.doc ul{margin:0;padding-left:20px;display:grid;gap:6px}.draft{background:var(--sev-matig-bg);color:var(--sev-matig);border-radius:10px;padding:12px 14px;font-size:.9rem}' +
    '</style>';

  const body = '<div class="wrap">' +
    (opts.hideDraftBanner ? '' : '<p class="draft">Concept, gegenereerd op basis van een automatische scan. Controleer de inhoud, vul de velden tussen [ ] aan en laat de tekst eventueel juridisch nalopen voordat je hem publiceert.</p>') +
    '<article class="doc">' +
      '<header class="masthead"><span class="eyebrow">Toegankelijkheidsverklaring</span><h1>' + esc(name) + '</h1><span class="site">' + esc(site) + '</span></header>' +
      '<section class="section"><h2>Onze dienst</h2><p>' + esc(name) + ' biedt via ' + esc(site) + ' ' + esc(service) + '. We willen dat iedereen deze website kan gebruiken, ook mensen met een beperking.</p></section>' +
      '<section class="section"><h2>Welke norm we volgen</h2><p>We streven naar toegankelijkheid volgens de Web Content Accessibility Guidelines (WCAG) 2.1 op niveau AA. Dit is de norm waarnaar de Europese standaard EN 301 549 verwijst en die past bij de eisen van de European Accessibility Act.</p></section>' +
      '<section class="section"><h2>Status: ' + esc(status.label) + '</h2><p>' + esc(status.text) + '</p></section>' +
      '<section class="section"><h2>Wat nog niet goed werkt</h2>' + known + '</section>' +
      '<section class="section"><h2>Hoe we de website toegankelijk maken</h2><ul>' +
        '<li>We controleren de website regelmatig, automatisch en handmatig.</li>' +
        '<li>We houden rekening met toegankelijkheid bij nieuwe pagina\'s, productfoto\'s en functies.</li>' +
        '<li>[Vul aan: bijvoorbeeld training van medewerkers, eisen aan leveranciers van plug-ins en betaalmodules.]</li>' +
      '</ul></section>' +
      '<section class="section"><h2>Loop je tegen een probleem aan?</h2><p>Laat het ons weten. Mail naar <strong>' + esc(email) + '</strong>' + (phone ? ' of bel <strong>' + esc(phone) + '</strong>' : '') + '. Vertel ons op welke pagina het was en wat er misging. We reageren binnen [aantal] werkdagen en helpen je zo nodig op een andere manier verder met je bestelling.</p></section>' +
      '<section class="section"><h2>Toezicht</h2><p>In Nederland houdt de Autoriteit Consument & Markt (ACM) toezicht op de toegankelijkheid van webwinkels. Ben je niet tevreden over hoe we je melding hebben afgehandeld, dan kun je dit melden bij ACM ConsuWijzer.</p></section>' +
      '<footer class="foot"><p>Deze verklaring is opgesteld op ' + esc(today) + ' en gebaseerd op een controle van ' + esc(fmtDate(scan.scannedAt)) + '. We werken haar minimaal eens per jaar bij.</p></footer>' +
    '</article></div>';

  if (opts.fragment) return head + body;
  return '<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' + head + '</head><body>' + body + '</body></html>';
}

// Klantvriendelijke zin per probleem, zonder vakjargon.
function plainImpact(issue) {
  const map = {
    'image-alt': 'Sommige afbeeldingen hebben geen beschrijving, waardoor blinde bezoekers niet weten wat erop staat.',
    'color-contrast': 'Sommige tekst heeft te weinig contrast met de achtergrond en is slecht leesbaar.',
    'form-label': 'Sommige invulvelden hebben geen label, waardoor niet duidelijk is wat je moet invullen.',
    'label-placeholder-only': 'Bij sommige velden verdwijnt de uitleg zodra je begint met typen.',
    'link-name': 'Sommige links, vaak icoontjes, hebben geen tekst die een screenreader kan voorlezen.',
    'button-name': 'Sommige knoppen, vaak icoontjes, hebben geen tekst die een screenreader kan voorlezen.',
    'html-lang': 'De taal van de pagina is niet ingesteld, waardoor voorleessoftware de verkeerde uitspraak kan gebruiken.',
    'document-title': 'Niet elke pagina heeft een titel.',
    'meta-viewport-zoom': 'Op mobiel kun je niet inzoomen.',
    'iframe-title': 'Sommige ingesloten onderdelen, zoals video\'s of kaarten, hebben geen beschrijving.',
    'tabindex-positive': 'Met het toetsenbord loopt de volgorde op sommige plekken niet logisch.',
    'empty-heading': 'Er staan lege kopjes op de pagina.',
  };
  return map[issue.id] || issue.who;
}

module.exports = { renderStatement, statusFor };
