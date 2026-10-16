# Productie: de webapp in een container met de juiste browser.
# De versie van dit image moet gelijk zijn aan de playwright-versie in package.json.
FROM mcr.microsoft.com/playwright:v1.56.0-noble

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY bin ./bin
COPY src ./src

ENV NODE_ENV=production \
    PORT=8080 \
    SCAN_MAX_PAGES=3 \
    SCAN_CONCURRENCY=2

# Niet als root draaien.
USER pwuser
EXPOSE 8080
CMD ["node", "src/web/server.js"]
