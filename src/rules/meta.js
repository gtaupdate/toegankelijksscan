'use strict';
/*
 * Nederlandstalige uitleg per regel: WCAG-criterium, ernst, wie er last van heeft
 * en hoe je het oplost, met tips per platform.
 *
 * impact: 'kritiek' | 'ernstig' | 'matig' | 'klein'
 * kind:   'fout' (geautomatiseerd vastgesteld) | 'controle' (signaal, mens moet beoordelen)
 */

const RULES = {
  'html-lang': {
    title: 'Taal van de pagina ontbreekt of is ongeldig',
    wcag: { id: '3.1.1', name: 'Taal van de pagina', level: 'A' },
    impact: 'ernstig',
    kind: 'fout',
    who: 'Screenreadergebruikers. Zonder taalcode leest de screenreader Nederlandse tekst mogelijk voor met een Engelse uitspraak.',
    fix: 'Zet de juiste taalcode op het <html>-element, bijvoorbeeld <html lang="nl">.',
    code: '<html lang="nl">',
    platforms: {
      wordpress: 'Instellingen → Algemeen → Taal van de site op "Nederlands". Thema\'s die language_attributes() gebruiken zetten het dan automatisch goed.',
      shopify: 'Stel de standaardtaal in bij Instellingen → Talen. Controleer in theme.liquid dat er <html lang="{{ request.locale.iso_code }}"> staat.',
    },
    effort: 'Minuten',
  },
  'document-title': {
    title: 'Pagina zonder titel',
    wcag: { id: '2.4.2', name: 'Paginatitel', level: 'A' },
    impact: 'ernstig',
    kind: 'fout',
    who: 'Iedereen die tussen tabbladen schakelt, en vooral screenreadergebruikers: de titel is het eerste wat zij horen.',
    fix: 'Geef elke pagina een unieke, beschrijvende <title>, bijvoorbeeld "Winkelwagen – Jouw Winkel".',
    code: '<title>Winkelwagen – Jouw Winkel</title>',
    platforms: {
      wordpress: 'Een SEO-plugin (Yoast, Rank Math) of het thema regelt dit meestal. Controleer of add_theme_support("title-tag") aan staat.',
      shopify: 'Controleer in theme.liquid dat <title>{{ page_title }}</title> aanwezig is.',
    },
    effort: 'Minuten',
  },
  'meta-viewport-zoom': {
    title: 'Inzoomen wordt geblokkeerd',
    wcag: { id: '1.4.4', name: 'Herschalen van tekst', level: 'AA' },
    impact: 'kritiek',
    kind: 'fout',
    who: 'Slechtzienden die op hun telefoon willen inzoomen om tekst te lezen.',
    fix: 'Verwijder user-scalable=no en maximum-scale=1 uit de viewport-tag.',
    code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    platforms: {
      wordpress: 'Staat meestal in header.php van het thema. Pas het aan in een childthema, zodat een thema-update het niet terugzet.',
      shopify: 'Pas de viewport-tag aan in theme.liquid.',
    },
    effort: 'Minuten',
  },
  'image-alt': {
    title: 'Afbeeldingen zonder tekstalternatief',
    wcag: { id: '1.1.1', name: 'Niet-tekstuele content', level: 'A' },
    impact: 'kritiek',
    kind: 'fout',
    who: 'Blinde en slechtziende bezoekers. Een screenreader leest dan de bestandsnaam voor, of slaat het product helemaal over.',
    fix: 'Geef elke informatieve afbeelding een alt-tekst die beschrijft wat erop staat. Puur decoratieve afbeeldingen krijgen een lege alt: alt="".',
    code: '<img src="schoen.jpg" alt="Zwarte leren sneaker met witte zool, zijaanzicht">',
    platforms: {
      woocommerce: 'Mediabibliotheek → afbeelding → veld "Alternatieve tekst". Productafbeeldingen gebruiken dat veld automatisch.',
      wordpress: 'Mediabibliotheek → afbeelding → veld "Alternatieve tekst", of in de blokeditor bij het afbeeldingsblok.',
      shopify: 'Producten → klik op een afbeelding → "Alt-tekst toevoegen". Controleer dat het thema {{ image.alt }} gebruikt.',
    },
    effort: 'Uren (afhankelijk van aantal producten)',
  },
  'image-alt-suspicious': {
    title: 'Alt-teksten die niet beschrijvend lijken',
    wcag: { id: '1.1.1', name: 'Niet-tekstuele content', level: 'A' },
    impact: 'matig',
    kind: 'controle',
    who: 'Screenreadergebruikers horen "IMG_4821.jpg" of "afbeelding" in plaats van wat er te zien is.',
    fix: 'Vervang bestandsnamen en algemene woorden door een korte beschrijving van de inhoud.',
    code: '<!-- niet: alt="IMG_4821.jpg" -->\n<img src="IMG_4821.jpg" alt="Rode regenjas met capuchon">',
    platforms: {},
    effort: 'Uren',
  },
  'link-name': {
    title: 'Links zonder tekst',
    wcag: { id: '2.4.4', name: 'Linkdoel (in context)', level: 'A' },
    impact: 'ernstig',
    kind: 'fout',
    who: 'Screenreader- en spraakbedieningsgebruikers. Ze horen alleen "link" en weten niet waar die heen gaat. Dit gebeurt vaak bij icoonlinks (winkelwagen, social media, logo).',
    fix: 'Geef de link zichtbare tekst, of een aria-label bij een icoon. Bij een afbeeldingslink beschrijft de alt-tekst het doel.',
    code: '<a href="/winkelwagen" aria-label="Winkelwagen, 2 artikelen">\n  <svg aria-hidden="true">…</svg>\n</a>',
    platforms: {
      wordpress: 'Social-media- en icoonlinks in menu\'s: voeg een label toe via het menu of de widgetinstellingen, of pas de template aan.',
      shopify: 'Controleer de header- en footer-secties (winkelwagen-, zoek- en accounticonen). Moderne Shopify-thema\'s hebben hiervoor "visually-hidden"-tekst.',
    },
    effort: 'Uur',
  },
  'button-name': {
    title: 'Knoppen zonder tekst',
    wcag: { id: '4.1.2', name: 'Naam, rol, waarde', level: 'A' },
    impact: 'kritiek',
    kind: 'fout',
    who: 'Screenreadergebruikers horen alleen "knop". Bij "in winkelwagen", "menu" of "zoeken" kunnen ze dan niet verder.',
    fix: 'Zet tekst in de knop, of een aria-label als de knop alleen een icoon bevat.',
    code: '<button type="button" aria-label="Menu openen">\n  <svg aria-hidden="true">…</svg>\n</button>',
    platforms: {
      woocommerce: 'Vaak in hamburgermenu\'s, zoekknoppen en aantal-plus/min-knoppen van het thema. Pas de templates aan in een childthema.',
      shopify: 'Controleer de header (menu, zoeken), de product-aantalknoppen en de knop om de winkelwagen te sluiten.',
    },
    effort: 'Uur',
  },
  'form-label': {
    title: 'Formuliervelden zonder label',
    wcag: { id: '1.3.1', name: 'Info en relaties (en 4.1.2)', level: 'A' },
    impact: 'kritiek',
    kind: 'fout',
    who: 'Screenreadergebruikers weten niet wat ze moeten invullen. In de checkout betekent dat: geen bestelling.',
    fix: 'Koppel aan elk veld een <label> via for/id. Als het label niet zichtbaar mag zijn, verberg het visueel met een sr-only-klasse in plaats van het weg te laten.',
    code: '<label for="email">E-mailadres</label>\n<input id="email" type="email" autocomplete="email">',
    platforms: {
      woocommerce: 'Checkoutvelden van WooCommerce hebben standaard labels. Controleer plug-ins en het zoekveld en de nieuwsbriefvelden van het thema.',
      shopify: 'Controleer het nieuwsbriefformulier in de footer, het zoekveld en het aantal-veld op de productpagina.',
    },
    effort: 'Uur',
  },
  'label-placeholder-only': {
    title: 'Placeholder gebruikt als enig label',
    wcag: { id: '3.3.2', name: 'Labels of instructies', level: 'A' },
    impact: 'matig',
    kind: 'fout',
    who: 'Mensen met geheugen- of concentratieproblemen. De placeholder verdwijnt zodra je typt, en heeft vaak te weinig contrast.',
    fix: 'Voeg een zichtbaar <label> toe. De placeholder mag blijven als voorbeeld van de invoer.',
    code: '<label for="postcode">Postcode</label>\n<input id="postcode" placeholder="1234 AB" autocomplete="postal-code">',
    platforms: {},
    effort: 'Uur',
  },
  'iframe-title': {
    title: 'Ingesloten content (iframe) zonder titel',
    wcag: { id: '4.1.2', name: 'Naam, rol, waarde', level: 'A' },
    impact: 'ernstig',
    kind: 'fout',
    who: 'Screenreadergebruikers horen "frame" zonder te weten wat erin zit, bijvoorbeeld een kaart, video of betaalformulier.',
    fix: 'Geef elk iframe een title die de inhoud beschrijft.',
    code: '<iframe src="https://www.youtube.com/embed/…" title="Video: zo meet je je schoenmaat"></iframe>',
    platforms: {
      wordpress: 'Voor embeds van YouTube of Google Maps: voeg een title toe in het HTML-blok, of gebruik een plug-in die dit doet.',
    },
    effort: 'Minuten',
  },
  'tabindex-positive': {
    title: 'Afwijkende tabvolgorde (tabindex groter dan 0)',
    wcag: { id: '2.4.3', name: 'Focusvolgorde', level: 'A' },
    impact: 'ernstig',
    kind: 'fout',
    who: 'Toetsenbordgebruikers. De focus springt dan onlogisch door de pagina.',
    fix: 'Gebruik alleen tabindex="0" (focusbaar in normale volgorde) of tabindex="-1" (alleen via script). Zet de volgorde goed in de HTML zelf.',
    code: '<!-- niet: tabindex="3" -->\n<a href="/contact" tabindex="0">Contact</a>',
    platforms: {},
    effort: 'Minuten tot uur',
  },
  'empty-heading': {
    title: 'Lege koppen',
    wcag: { id: '1.3.1', name: 'Info en relaties', level: 'A' },
    impact: 'matig',
    kind: 'fout',
    who: 'Screenreadergebruikers navigeren via koppen. Een lege kop is verwarrend.',
    fix: 'Verwijder lege koppen of geef ze tekst. Gebruik koppen niet voor opmaak of witruimte.',
    code: '<!-- niet: <h2></h2> -->',
    platforms: {
      wordpress: 'Vaak een leeg kopblok in de editor of een paginabouwer-widget zonder titel.',
    },
    effort: 'Minuten',
  },
  'heading-structure': {
    title: 'Koppenstructuur controleren',
    wcag: { id: '1.3.1', name: 'Info en relaties', level: 'A' },
    impact: 'klein',
    kind: 'controle',
    who: 'Screenreadergebruikers gebruiken koppen als inhoudsopgave. Overgeslagen niveaus of een ontbrekende h1 maken dat lastiger.',
    fix: 'Begin met één h1 (de paginatitel) en gebruik daarna h2, h3 enzovoort zonder niveaus over te slaan. Kies het kopniveau op basis van structuur, niet op basis van lettergrootte.',
    code: '<h1>Herenschoenen</h1>\n<h2>Sneakers</h2>\n<h3>Leren sneakers</h3>',
    platforms: {},
    effort: 'Uur',
  },
  'color-contrast': {
    title: 'Te weinig kleurcontrast',
    wcag: { id: '1.4.3', name: 'Contrast (minimum)', level: 'AA' },
    impact: 'ernstig',
    kind: 'fout',
    who: 'Slechtzienden, ouderen en iedereen die buiten op een telefoon kijkt. Dit is wereldwijd de meest voorkomende toegankelijkheidsfout.',
    fix: 'Normale tekst heeft minimaal 4,5:1 contrast nodig, grote tekst (24px, of 18,66px en vet) minimaal 3:1. Maak de tekst donkerder of de achtergrond lichter. Het rapport toont per element de huidige kleuren.',
    code: '/* bijvoorbeeld: lichtgrijs #999 op wit (2,85:1) → #595959 (7:1) */\n.prijs-oud { color: #595959; }',
    platforms: {
      wordpress: 'Pas de kleuren aan in de Customizer of de globale stijlen van het thema, zodat het overal tegelijk goed komt.',
      shopify: 'Thema aanpassen → Thema-instellingen → Kleuren. Let op kleurschema\'s die op meerdere secties worden gebruikt.',
    },
    effort: 'Uur',
  },
};

const IMPACT_ORDER = ['kritiek', 'ernstig', 'matig', 'klein'];
const IMPACT_WEIGHT = { kritiek: 10, ernstig: 7, matig: 3, klein: 1 };

module.exports = { RULES, IMPACT_ORDER, IMPACT_WEIGHT };
