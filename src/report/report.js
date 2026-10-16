'use strict';
const { esc, safeHex, fmtDate, plural } = require('./escape');
const STYLES = require('./styles');
const { RULES } = require('../rules/meta');

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap">';

const PLATFORM_NAMES = {
  woocommerce: 'WooCommerce', wordpress: 'WordPress', shopify: 'Shopify', magento: 'Magento',
  lightspeed: 'Lightspeed', ccvshop: 'CCV Shop', wix: 'Wix',
};

const IMPACT_LABEL = { kritiek: 'Kritiek', ernstig: 'Ernstig', matig: 'Matig', klein: 'Klein' };

// Wat een geautomatiseerde scan NIET kan beoordelen. Eerlijk benoemen hoort bij het product.
const NOT_COVERED = [
  'Of je de hele bestelling (product kiezen, winkelwagen, gegevens, betalen) met alleen het toetsenbord kunt afronden.',
  'Of de focus altijd zichtbaar is en logisch door de pagina loopt.',
  'Of foutmeldingen in formulieren duidelijk zijn en door een screenreader worden voorgelezen.',
  'Of alt-teksten inhoudelijk kloppen. De scan ziet alleen of ze er zijn.',
  'Of video\'s ondertiteling hebben en of informatie alleen via kleur wordt overgebracht.',
  'Of pop-ups, cookiebanners en betaalvensters van derden toegankelijk zijn.',
  'Of de site bruikbaar blijft bij 200% tekstvergroting en op een smal scherm (reflow).',
];

function platformTips(meta, platforms) {
  const tips = meta.platforms || {};
  let keys = Object.keys(tips).filter((k) => platforms.includes(k));
  // WooCommerce draait op WordPress: toon dan beide tips als ze er zijn.
  if (!keys.length) keys = [];
  return keys.map((k) => '<div class="tip"><b>' + esc(PLATFORM_NAMES[k] || k) + '</b><span>' + esc(tips[k]) + '</span></div>').join('');
}

function exampleTable(issue) {
  const rows = issue.examples.map((ex) => {
    let extra = esc(ex.detail || '');
    if (issue.id === 'color-contrast' && ex.fg) {
      extra = '<span class="swatch"><i aria-hidden="true" title="Voorbeeld van de huidige kleuren" style="color:' + safeHex(ex.fg) + ';background:' + safeHex(ex.bg) + '">Aa</i>' +
        '<span class="num">' + esc(ex.ratio) + ':1 (nodig ' + esc(ex.required) + ':1)</span></span>' +
        '<br><span class="mono">' + esc(ex.fg) + ' op ' + esc(ex.bg) + '</span>';
    }
    return '<tr><td><code>' + esc(ex.selector) + '</code></td><td><code>' + esc(ex.html) + '</code></td><td>' + extra + '</td></tr>';
  }).join('');
  const shown = issue.examples.length;
  const total = issue.kind === 'controle' ? issue.count : issue.count;
  const more = total > shown ? '<p class="small muted">Eerste ' + shown + ' van ' + total + ' getoond.</p>' : '';
  return '<details' + (shown <= 5 ? ' open' : '') + '><summary>Waar het voorkomt (' + total + ')</summary>' +
    '<div class="tablewrap"><table><thead><tr><th>Element</th><th>Code</th><th>Detail</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + more + '</details>';
}

function issueCard(issue, idx, platforms) {
  const isCheck = issue.kind === 'controle';
  const pages = Array.from(new Set(issue.pages)).length;
  return '<article class="issue" id="b' + idx + '">' +
    '<header><div class="chips">' +
      '<span class="chip sev-' + issue.impact + '">' + (isCheck ? 'Handmatig controleren' : IMPACT_LABEL[issue.impact]) + '</span>' +
      '<span class="chip wcag">WCAG ' + esc(issue.wcag.id) + ' · niveau ' + esc(issue.wcag.level) + '</span>' +
      '<span class="chip">' + plural(issue.count, isCheck ? 'signaal' : 'keer', isCheck ? 'signalen' : 'keer') + (pages > 1 ? ' op ' + pages + ' pagina\'s' : '') + '</span>' +
      '<span class="chip">Inspanning: ' + esc(issue.effort) + '</span>' +
    '</div><h3>' + esc(issue.title) + '</h3>' +
    '<p class="small muted">' + esc(issue.wcag.name) + '</p></header>' +
    '<div class="cols"><div><span class="eyebrow">Wie heeft er last van</span><p>' + esc(issue.who) + '</p></div>' +
    '<div><span class="eyebrow">Zo los je het op</span><p>' + esc(issue.fix) + '</p></div></div>' +
    '<pre>' + esc(issue.code) + '</pre>' +
    platformTips(issue, platforms) +
    exampleTable(issue) +
    '</article>';
}

function renderReport(scan, opts = {}) {
  const errors = scan.issues.filter((i) => i.kind === 'fout' && i.count);
  const checks = scan.issues.filter((i) => i.kind === 'controle' || (!i.count && i.reviewCount));
  const okPages = scan.pages.filter((p) => !p.error);
  const firstTitle = okPages[0] && okPages[0].title ? okPages[0].title : scan.startUrl;
  const platforms = scan.platforms || [];
  const s = scan.summary;
  const reviewFromErrors = scan.issues.filter((i) => i.kind === 'fout' && i.reviewCount);

  const top = errors.slice(0, 5).map((i) => {
    const idx = scan.issues.indexOf(i);
    return '<li><a href="#b' + idx + '">' + esc(i.title) + '</a><span class="chip sev-' + i.impact + '">' + IMPACT_LABEL[i.impact] + ' · ' + i.count + '</span></li>';
  }).join('');

  const head = '<title>Toegankelijkheidsrapport ' + esc(hostOf(scan.startUrl)) + '</title>' +
    '<meta name="claude:viewport-fit-sides" content="cover">' + FONTS + '<style>' + STYLES + '</style>';

  const body =
    '<div class="wrap">' +
    '<header class="masthead"><span class="eyebrow">Toegankelijkheidsrapport · WCAG 2.1 AA · European Accessibility Act</span>' +
      '<h1>' + esc(firstTitle) + '</h1>' +
      '<span class="site">' + esc(scan.startUrl) + '</span>' +
      '<div class="meta"><span>Gescand op ' + esc(fmtDate(scan.scannedAt)) + '</span>' +
        '<span>' + plural(okPages.length, 'pagina', 'pagina\'s') + ' bekeken</span>' +
        (platforms.length ? '<span>Platform: ' + esc(platforms.map((p) => PLATFORM_NAMES[p] || p).join(', ')) + '</span>' : '') +
        '<span>Regelset ' + esc(scan.tool.ruleset) + '</span></div>' +
    '</header>' +

    '<section class="summary" aria-label="Samenvatting">' +
      '<div class="scorebox"><span class="eyebrow">Score</span>' +
        (scan.score.score === null
          ? '<div class="score num">–</div>'
          : '<div class="score num">' + scan.score.score + '<small>/100</small></div>') +
        '<span class="grade tone-' + scan.score.grade.tone + '">' + esc(scan.score.grade.label) + '</span></div>' +
      '<div class="sumright">' +
        '<p><strong>' + plural(s.totalErrors, 'fout', 'fouten') + '</strong> in ' + plural(s.rulesFailed, 'categorie', 'categorieën') +
          (s.totalReview ? ', plus ' + plural(s.totalReview, 'punt', 'punten') + ' om handmatig te controleren' : '') + '.</p>' +
        '<div class="sevrow">' + ['kritiek', 'ernstig', 'matig', 'klein'].map((k) =>
          '<div class="sev sev-' + k + '"><b>' + s.counts[k] + '</b><span>' + IMPACT_LABEL[k] + '</span></div>').join('') + '</div>' +
        '<p class="note">De score laat zien hoeveel en hoe ernstige problemen automatisch zijn gevonden. Een score van 100 betekent niet dat de site aan de wet voldoet: een scan vindt een deel van de problemen, de rest vraagt een handmatige test.</p>' +
      '</div>' +
    '</section>' +

    (okPages[0] && okPages[0].screenshot && !opts.noScreenshot ? '<img class="shot" src="' + okPages[0].screenshot + '" alt="Schermafbeelding van de gescande startpagina">' : '') +

    (!okPages.length ? '<section class="section"><h2>De website kon niet worden gescand</h2><p class="muted">Er is geen enkele pagina geladen, dus er is niets beoordeeld. Controleer of het adres klopt en of de site bereikbaar is, en probeer het opnieuw. Details staan onderaan bij "Bekeken pagina\'s".</p></section>' :
    errors.length ? '<section class="section"><h2>Begin hier</h2><p class="muted">De vijf zwaarste problemen, op volgorde van impact.</p><ol class="toplist">' + top + '</ol></section>' :
      '<section class="section"><h2>Geen automatisch vastgestelde fouten</h2><p class="muted">Goed nieuws. Doe nu de handmatige controles hieronder: daar zitten de problemen die een scan niet kan zien.</p></section>') +

    (errors.length ? '<section class="section"><h2>Bevindingen</h2>' + errors.map((i) => issueCard(i, scan.issues.indexOf(i), platforms)).join('') + '</section>' : '') +

    (checks.length || reviewFromErrors.length ? '<section class="section"><h2>Handmatig controleren</h2><p class="muted">Hier ziet de scan een mogelijk probleem, maar kan hij het niet zeker vaststellen. Bekijk deze punten zelf.</p>' +
      checks.map((i) => issueCard(i, scan.issues.indexOf(i), platforms)).join('') +
      reviewFromErrors.map((i) => '<article class="issue"><header><div class="chips"><span class="chip sev-klein">Handmatig controleren</span><span class="chip wcag">WCAG ' + esc(i.wcag.id) + '</span></div><h3>' + esc(i.title) + ': ' + plural(i.reviewCount, 'element', 'elementen') + ' niet automatisch te beoordelen</h3></header>' +
        '<div class="tablewrap"><table><thead><tr><th>Element</th><th>Reden</th></tr></thead><tbody>' +
        i.reviewExamples.map((ex) => '<tr><td><code>' + esc(ex.selector) + '</code></td><td>' + esc(ex.detail) + '</td></tr>').join('') +
        '</tbody></table></div></article>').join('') +
      '</section>' : '') +

    (!okPages.length ? '' : '<section class="limits"><h2>Wat deze scan niet kan zien</h2><p class="muted">Deze punten horen bij de European Accessibility Act, maar vragen een mens met toetsenbord en screenreader:</p><ul>' +
      NOT_COVERED.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></section>') +

    '<section class="section"><h2>Bekeken pagina\'s</h2><div class="tablewrap"><table><thead><tr><th>Pagina</th><th>Status</th></tr></thead><tbody>' +
      scan.pages.map((p) => '<tr><td><code>' + esc(p.url) + '</code>' + (p.title ? '<br><span class="small muted">' + esc(p.title) + '</span>' : '') + '</td><td>' +
        (p.error ? 'Niet gescand: ' + esc(p.error) : 'Gescand') + '</td></tr>').join('') +
    '</tbody></table></div></section>' +

    '<footer class="foot"><p>Gemaakt met ' + esc(scan.tool.name) + ' ' + esc(scan.tool.version) + ', regelset ' + esc(scan.tool.ruleset) + '. Getoetst aan een selectie succescriteria uit WCAG 2.1 niveau A en AA, de norm waarnaar EN 301 549 verwijst.</p>' +
    '<p>Dit rapport is geen juridisch advies en geen conformiteitsverklaring.</p></footer>' +
    '</div>';

  if (opts.fragment) return head + body;
  return '<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' + head + '</head><body>' + body + '</body></html>';
}

function hostOf(url) {
  try { return new URL(url).host || url.split('/').pop(); } catch (e) { return url; }
}

module.exports = { renderReport, NOT_COVERED, RULES };
