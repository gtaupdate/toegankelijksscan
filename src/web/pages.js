'use strict';
const { esc } = require('../report/escape');
const STYLES = require('../report/styles');

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap">';

const EXTRA = `
.hero { display: grid; gap: 18px; padding-block: 24px 8px; }
.hero h1 { font-size: clamp(2rem, 5.5vw, 3.3rem); letter-spacing: -0.02em; max-width: 18ch; }
.lead { font-size: 1.15rem; color: var(--ink-2); max-width: 60ch; }
.scanform { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 10px; max-width: 640px; }
.scanform input { font: inherit; border: 1px solid var(--rule); border-radius: 10px; padding: 12px 14px; background: var(--paper); color: var(--ink); min-width: 0; }
.scanform button, .btn { font: 600 1rem var(--f-body); border: 0; border-radius: 10px; padding: 12px 20px; background: var(--accent); color: #fff; cursor: pointer; text-decoration: none; display: inline-block; }
:root:not([data-theme="light"]) .scanform button, :root:not([data-theme="light"]) .btn { color: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .scanform button, :root:not([data-theme="light"]) .btn { color: #0f1218; } }
:root[data-theme="dark"] .scanform button, :root[data-theme="dark"] .btn { color: #0f1218; }
.scanform label { grid-column: 1 / -1; font-weight: 600; font-size: 0.9rem; padding: 2px 4px 0; }
.formerror { color: var(--sev-kritiek); font-weight: 600; font-size: 0.92rem; grid-column: 1 / -1; padding: 0 4px; }
.facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.fact { background: var(--sheet); border: 1px solid var(--rule); border-radius: 12px; padding: 16px; display: grid; gap: 4px; align-content: start; }
.fact b { font: 700 1.9rem/1.1 var(--f-display); font-variant-numeric: tabular-nums; }
.fact span { font-size: 0.88rem; color: var(--ink-2); }
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; counter-reset: s; }
.steps li { counter-increment: s; background: var(--sheet); border: 1px solid var(--rule); border-radius: 12px; padding: 16px; display: grid; gap: 6px; align-content: start; }
.steps li::before { content: "Stap " counter(s); font: 600 0.75rem var(--f-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
.plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.plan { background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 20px; display: grid; gap: 10px; align-content: start; }
.plan.featured { border: 2px solid var(--accent); }
.price { font: 700 2rem/1 var(--f-display); font-variant-numeric: tabular-nums; }
.price small { font: 500 0.9rem var(--f-body); color: var(--ink-3); }
.plan ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.92rem; }
.faq { display: grid; gap: 10px; }
.faq details { background: var(--sheet); border: 1px solid var(--rule); border-radius: 12px; padding: 14px 16px; }
.faq summary { font-size: 1rem; }
.faq p { margin-top: 8px; color: var(--ink-2); }
.bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; background: var(--sheet); border: 1px solid var(--rule); border-radius: 12px; padding: 12px 16px; }
.wait { display: grid; gap: 14px; justify-items: start; padding-block: 40px; }
.pulse { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); animation: p 1.2s ease-in-out infinite; }
@keyframes p { 50% { opacity: .3; transform: scale(.7); } }
@media (max-width: 760px) { .facts, .steps, .plans { grid-template-columns: minmax(0, 1fr); } .scanform { grid-template-columns: minmax(0, 1fr); } }
`;

function shell(title, body, opts = {}) {
  return '<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<title>' + esc(title) + '</title>' + (opts.refresh ? '<meta http-equiv="refresh" content="' + opts.refresh + '">' : '') +
    '<meta name="description" content="Gratis toegankelijkheidscheck voor webshops. Ontdek of je webshop voldoet aan de European Accessibility Act en WCAG 2.1 AA, met concrete oplossingen per probleem.">' +
    FONTS + '<style>' + STYLES + EXTRA + '</style></head><body><div class="wrap">' + body + '</div></body></html>';
}

function form(value, error) {
  return '<form class="scanform" method="post" action="/scan" novalidate>' +
    '<label for="url">Adres van je webshop</label>' +
    '<input id="url" name="url" type="text" inputmode="url" autocomplete="url" placeholder="www.jouwwinkel.nl" value="' + esc(value || '') + '" required' +
    (error ? ' aria-invalid="true" aria-describedby="url-fout"' : '') + '>' +
    '<button type="submit">Gratis scannen</button>' +
    (error ? '<p class="formerror" id="url-fout" role="alert">' + esc(error) + '</p>' : '') +
    '</form>';
}

function landing(opts = {}) {
  const body =
    '<section class="hero"><span class="eyebrow">European Accessibility Act · sinds 28 juni 2025 van kracht</span>' +
    '<h1>Is je webshop toegankelijk volgens de wet?</h1>' +
    '<p class="lead">Webshops moeten bruikbaar zijn voor mensen met een beperking. Scan je site in één minuut en zie precies wat er mis is, wie er last van heeft en hoe je het oplost in WordPress, WooCommerce of Shopify.</p>' +
    form(opts.value, opts.error) +
    '<p class="small muted">We scannen je startpagina en de belangrijkste pagina\'s van het aankoopproces. Je hoeft geen account te maken.</p></section>' +

    '<section class="facts" aria-label="Waarom nu">' +
      '<div class="fact"><b>61%</b><span>van de grootste Nederlandse webwinkels was in maart 2026 niet digitaal toegankelijk, volgens controle door de ACM.</span></div>' +
      '<div class="fact"><b>WCAG 2.1 AA</b><span>is de norm waaraan webshops moeten voldoen, via de Europese standaard EN 301 549.</span></div>' +
      '<div class="fact"><b>ACM</b><span>houdt toezicht, neemt meldingen van consumenten aan en kan handhaven.</span></div>' +
    '</section>' +

    '<section class="section"><h2>Zo werkt het</h2><ol class="steps">' +
      '<li><strong>Vul je adres in</strong><span class="muted">We bezoeken je site met een echte browser, net als een klant.</span></li>' +
      '<li><strong>Lees het rapport</strong><span class="muted">Per probleem: hoe ernstig het is, wie er last van heeft en voorbeeldcode om het op te lossen.</span></li>' +
      '<li><strong>Publiceer je verklaring</strong><span class="muted">Je krijgt een conceptversie van een toegankelijkheidsverklaring die je kunt aanvullen en op je site zetten.</span></li>' +
    '</ol></section>' +

    '<section class="section"><h2>Wat het kost</h2><div class="plans">' +
      '<div class="plan"><span class="eyebrow">Check</span><div class="price">€0</div><ul><li>Scan van maximaal 3 pagina\'s</li><li>Rapport met oplossingen</li><li>Conceptverklaring</li></ul><a class="btn" href="#url">Gratis scannen</a></div>' +
      '<div class="plan featured"><span class="eyebrow">Webshop</span><div class="price">€39<small> per maand</small></div><ul><li>Tot 250 pagina\'s, wekelijks opnieuw gescand</li><li>Melding bij nieuwe problemen</li><li>Altijd actuele verklaring</li><li>Voortgang over tijd</li></ul><span class="small muted">Binnenkort beschikbaar</span></div>' +
      '<div class="plan"><span class="eyebrow">Webbureau</span><div class="price">€149<small> per maand</small></div><ul><li>Tot 25 klantsites</li><li>Rapporten met je eigen logo</li><li>Overzicht van alle klanten</li></ul><span class="small muted">Binnenkort beschikbaar</span></div>' +
    '</div><p class="small muted">Prijzen exclusief btw.</p></section>' +

    '<section class="section"><h2>Veelgestelde vragen</h2><div class="faq">' +
      '<details><summary>Geldt de wet ook voor mijn webshop?</summary><p>De European Accessibility Act geldt voor webshops die aan consumenten verkopen. Er is een uitzondering voor micro-ondernemingen die diensten leveren: minder dan 10 medewerkers én een jaaromzet of balanstotaal van maximaal 2 miljoen euro. Twijfel je, vraag het dan na bij een jurist of je brancheorganisatie.</p></details>' +
      '<details><summary>Is een toegankelijkheidswidget of overlay niet genoeg?</summary><p>Nee. Zulke widgets lossen de problemen in je code niet op. In de VS kreeg aanbieder accessiBe in 2025 een boete van 1 miljoen dollar van de FTC voor misleidende claims hierover. Wij laten zien wat er in je site zelf moet veranderen.</p></details>' +
      '<details><summary>Vindt de scan alle problemen?</summary><p>Nee, en dat geldt voor elke automatische scan. Een scan vindt problemen als ontbrekende alt-teksten, te weinig contrast en velden zonder label. Of je met alleen een toetsenbord kunt afrekenen, moet een mens testen. In het rapport staat precies wat de scan wel en niet controleert.</p></details>' +
      '<details><summary>Wat gebeurt er met mijn gegevens?</summary><p>We bekijken alleen openbare pagina\'s, zoals een bezoeker dat doet. We loggen niet in en vullen geen formulieren in. Het rapport wordt na 24 uur verwijderd.</p></details>' +
    '</div></section>' +
    '<footer class="foot"><p>Dit is een hulpmiddel en geen juridisch advies.</p></footer>';
  return shell('Toegankelijkscan', body);
}

function waiting(id, url) {
  return shell('Scan bezig', '<section class="wait"><div class="pulse" aria-hidden="true"></div><h1>Je webshop wordt gescand</h1>' +
    '<p class="lead" role="status">We bekijken ' + esc(url) + ' en de belangrijkste pagina\'s van het aankoopproces. Dit duurt meestal minder dan een minuut. Deze pagina ververst vanzelf.</p>' +
    '<a href="/rapport/' + esc(id) + '">Nu verversen</a></section>', { refresh: 4 });
}

function failed(message) {
  return shell('Scan mislukt', '<section class="wait"><h1>Dat lukte niet</h1><p class="lead">' + esc(message) + '</p><a class="btn" href="/">Opnieuw proberen</a></section>');
}

function notFound() {
  return shell('Niet gevonden', '<section class="wait"><h1>Dit rapport bestaat niet (meer)</h1><p class="lead">Rapporten worden na 24 uur verwijderd. Start een nieuwe scan.</p><a class="btn" href="/">Nieuwe scan</a></section>');
}

// Balk bovenaan het rapport met een formulier voor de verklaring.
function reportBar(id) {
  return '<div class="wrap" style="padding-block:0 8px"><form class="bar" method="get" action="/verklaring/' + esc(id) + '">' +
    '<strong>Maak je toegankelijkheidsverklaring</strong>' +
    '<label class="small" for="naam">Bedrijfsnaam</label><input class="mono" id="naam" name="naam" autocomplete="organization" style="padding:8px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink)">' +
    '<label class="small" for="email">E-mail voor meldingen</label><input class="mono" id="email" name="email" type="email" autocomplete="email" style="padding:8px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink)">' +
    '<button class="btn" type="submit">Verklaring maken</button></form></div>';
}

module.exports = { landing, waiting, failed, notFound, reportBar };
