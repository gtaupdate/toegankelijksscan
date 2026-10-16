# Projectstatus

Bijgewerkt: 16 oktober 2026

## Huidige fase
MVP van scan-engine, rapport, verklaring en webapp: gebouwd en getest op proefpagina's.

## Testresultaten (echte run, `npm test`)
- 22 tests, 22 geslaagd, 0 mislukt (inclusief API met sleutel).
- Sabotagetest: escaping uitgezet en contrastnorm verlaagd → 4 tests faalden. Hersteld → 21 geslaagd.
- Eigen landingspagina gescand met de eigen scanner: eerst 2 contrastfouten (4,44:1), opgelost, daarna score 100.

## Bekende beperkingen
- Niet getest op echte externe webshops: de bouwomgeving blokkeerde uitgaand verkeer naar externe sites.
- axe-core niet geïnstalleerd (npm-register geblokkeerd in de bouwomgeving).
- Opslag in het geheugen; geen accounts of betalingen.
- Lettertypen komen van Google Fonts; zonder internet valt het rapport terug op systeemlettertypen.

## Opgeloste bugs tijdens de bouw
- Mislukte scan toonde score 100 "Goed op weg". Nu: geen score, duidelijke foutpagina, geen verklaring. Vastgelegd in een test.
- Ernstlabels kregen hun kleur niet (CSS-volgorde). Opgelost.
- Horizontaal scrollen op mobiel in het rapport. Opgelost.

## Volgende stap
1. `npm install && npx playwright install chromium && npm test` in je eigen omgeving.
2. 20 echte webshops scannen en valse meldingen opsporen.
3. axe-core toevoegen.
4. Landingspagina live zetten met de gratis scan, zodat je meteen zoekverkeer en e-mailadressen verzamelt.
