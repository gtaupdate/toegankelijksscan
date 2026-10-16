# Toegankelijkscan

Toegankelijkheidsscan voor webshops: toetst aan een selectie WCAG 2.1 AA-criteria (de norm achter de European Accessibility Act), maakt een Nederlandstalig rapport met oplossingen per platform en een conceptversie van de toegankelijkheidsverklaring.

"Toegankelijkscan" is een werknaam.

## Wat er staat

| Onderdeel | Bestand | Status |
|---|---|---|
| Scan-engine (14 regels, draait in een echte browser) | `src/rules/browser-rules.js` | Werkt, getest |
| Contrastberekening volgens WCAG | `src/rules/color.js` | Werkt, getest |
| Nederlandse uitleg, oplossing en platformtips per regel | `src/rules/meta.js` | Klaar |
| Score en samenvoegen van meerdere pagina's | `src/score.js` | Werkt, getest |
| Scanner (Playwright, kiest product/winkelwagen/checkout) | `src/scanner.js` | Werkt, getest |
| Rapport (HTML, licht en donker, mobiel) | `src/report/report.js` | Werkt, getest |
| Conceptverklaring | `src/report/statement.js` | Werkt, getest |
| Webapp (landingspagina, scan, rapport, verklaring, JSON-API) | `src/web/` | Werkt, getest |
| Beveiliging tegen interne adressen (SSRF) | `src/net-guard.js` + `scanner.js` | Werkt, getest |
| Commandoregel | `bin/scan.js` | Werkt |

### Regels

| Regel | WCAG | Soort |
|---|---|---|
| Taal van de pagina | 3.1.1 | fout |
| Paginatitel | 2.4.2 | fout |
| Inzoomen geblokkeerd | 1.4.4 | fout |
| Afbeeldingen zonder alt | 1.1.1 | fout |
| Niet-beschrijvende alt ("IMG_123.jpg") | 1.1.1 | handmatig |
| Links zonder naam | 2.4.4 | fout |
| Knoppen zonder naam | 4.1.2 | fout |
| Formuliervelden zonder label | 1.3.1 / 4.1.2 | fout |
| Alleen placeholder als label | 3.3.2 | fout |
| Iframe zonder title | 4.1.2 | fout |
| Positieve tabindex | 2.4.3 | fout |
| Lege koppen | 1.3.1 | fout |
| Koppenstructuur | 1.3.1 | handmatig |
| Kleurcontrast | 1.4.3 | fout (handmatig bij achtergrondafbeelding) |

Dit dekt de foutsoorten die het vaakst voorkomen, maar niet alle 50 succescriteria. Het rapport zegt dat ook expliciet tegen de klant.

## Starten

Vereist: Node 20 of hoger.

```bash
npm install
npx playwright install chromium   # eenmalig: de browser downloaden
npm test                          # 21 tests
```

Commandoregel:

```bash
node bin/scan.js www.jouwwinkel.nl --pages 5 --out out --naam "Jouw Winkel BV" --email info@jouwwinkel.nl
# maakt out/rapport.html, out/verklaring.html en out/scan.json
```

Webapp:

```bash
node src/web/server.js            # http://localhost:8080
```

Instellingen via omgevingsvariabelen:

| Variabele | Standaard | Betekenis |
|---|---|---|
| `PORT` | 8080 | Poort |
| `SCAN_MAX_PAGES` | 3 | Pagina's per gratis scan |
| `SCAN_CONCURRENCY` | 2 | Gelijktijdige scans |
| `SCANS_PER_IP_PER_HOUR` | 5 | Rate limit |
| `TRUST_PROXY` | 0 | Zet op 1 achter een reverse proxy (dan telt X-Forwarded-For) |
| `ALLOW_PRIVATE_TARGETS` | 0 | Alleen voor lokaal testen. **Nooit in productie.** |

## Gratis route: scannen via GitHub Actions en Make.com (geen server nodig)

1. Maak een **private** repository op GitHub en upload de inhoud van deze map (inclusief de verborgen map `.github`).
2. Ga in de repository naar **Settings → Secrets and variables → Actions → New repository secret**. Naam: `RESULT_WEBHOOK`, waarde: het adres van de Make-webhook "Toegankelijkscan – scanresultaten".
3. Een scan starten kan op twee manieren:
   - **Actions → Scan een website → Run workflow**, adres invullen.
   - Een adres toevoegen aan `scan-verzoeken.txt` en opslaan. Elke wijziging in dat bestand start een scan.
4. Na een paar minuten staat het rapport bij de run onder **Artifacts**, en de samenvatting in de wachtrij van de Make-webhook. Daar kan Claude hem uitlezen.

Kosten: GitHub geeft private repositories 2.000 gratis Actions-minuten per maand. Een scan kost een paar minuten, dus dat zijn honderden scans per maand.

De webapp met landingspagina (hieronder) heb je pas nodig als klanten zelf gaan scannen.

## Live zetten op een server (later, als er betalende klanten zijn)

1. Maak een **private** repository op GitHub (bijv. `toegankelijkscan`) en upload de inhoud van deze map. Vanaf dat moment draaien de tests elke week en na elke wijziging automatisch (`.github/workflows/controle.yml`), inclusief controlescans van de sites in `sites.txt`.
2. Maak een account bij [Render](https://render.com), kies **New → Blueprint** en selecteer de repository. `render.yaml` regelt de rest: Docker, regio Frankfurt, health check en een willekeurige `API_KEY`. Kies een plan met minstens 1 GB geheugen.
3. Kopieer in Render bij **Environment** de waarde van `API_KEY` en het adres van de dienst (eindigt op `.onrender.com`).
4. Geef die twee aan Claude. Claude maakt in Make.com een scenario dat de API aanroept, en kan daarna vanuit de chat elke site scannen en het resultaat lezen.

Zonder server testen kan ook: op GitHub onder **Actions → Scan een website → Run workflow**. Het rapport staat na afloop onder "Artifacts".

## JSON-API

Starten (sleutel verplicht):

```
POST /api/scans
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "url": "www.jouwwinkel.nl", "pages": 5, "wait": true }
```

Met `"wait": true` wacht het antwoord tot de scan klaar is (maximaal 110 seconden). Je krijgt dan status, score, samenvatting, bevindingen met voorbeelden en een link naar het rapport. Zonder `wait` krijg je direct een `id`, en haal je het resultaat later op met `GET /api/scan/:id`.

`GET /health` geeft de status van de server (voor een uptime-monitor).

## Beveiliging

- Alles wat van een gescande site komt, wordt ge-escaped. Een test controleert dat er nooit een `<script>` in rapport of verklaring belandt.
- SSRF: het ingevulde adres wordt vooraf gecontroleerd, en tijdens de scan gaat ook elk verzoek van de browser (redirects, scripts, afbeeldingen) langs dezelfde controle. Interne adressen, localhost, cloud-metadata en afwijkende poorten worden geweigerd.
- De eigen pagina's sturen een strikte Content-Security-Policy mee en zijn niet in een frame te laden.
- Rate limit per IP en een wachtrij met maximaal 2 gelijktijdige browsers.

Nog open vóór livegang:
- Een headless browser op een server blijft een groot aanvalsoppervlak. Draai de scanner in een aparte container zonder toegang tot je interne netwerk, met beperkt geheugen en een tijdslimiet.
- Opslag staat nu in het geheugen. Bij een herstart zijn rapporten weg. Voor betaalde plannen: database (bijv. Supabase, EU-regio).
- Privacyverklaring en voorwaarden laten opstellen.

## Wat er nog moet gebeuren

1. **axe-core toevoegen** naast de eigen regels (`npm install axe-core`, MPL-2.0, commercieel bruikbaar). Dat breidt de dekking flink uit. In deze bouwsessie was het npm-register geblokkeerd, daarom eigen regels.
2. **Testen op echte webshops.** De regels zijn getest op proefpagina's. Externe sites waren vanuit de bouwomgeving niet bereikbaar. Scan als eerste 20 echte shops en vergelijk met een tweede tool (bijv. WAVE of Lighthouse) op valse meldingen.
3. **Accounts en betalen** (Mollie of Stripe) voor de abonnementen, plus wekelijkse herscan en e-mailmelding.
4. **Hosting:** een server die een headless browser kan draaien (bijv. een VPS of Fly.io/Railway met Docker). Vercel-functies zijn hiervoor niet geschikt.
5. **WordPress-plugin** die het scanresultaat in het dashboard toont. Past bij jouw WordPress-ervaring en is een sterk distributiekanaal.
6. **Duitsland:** dezelfde wet (BFSG), veel grotere markt. Rapport en verklaring vertalen.

## Projectstructuur

```
bin/scan.js              commandoregel
src/rules/               regels (browser), kleurberekening, Nederlandse teksten
src/scanner.js           Playwright: pagina's laden, regels uitvoeren
src/score.js             score en samenvoegen
src/report/              rapport, verklaring, opmaak, escaping
src/web/                 webserver en pagina's
src/net-guard.js         SSRF-bescherming
test/                    unit-, scan- en webtests, proefpagina's
```
