'use strict';
const { RULES, IMPACT_WEIGHT, IMPACT_ORDER } = require('./rules/meta');

/*
 * Score van 0 tot 100. Alleen vastgestelde fouten tellen mee, signalen voor handmatige controle niet.
 * Per regel: aftrek = gewicht × (1 + log10(aantal)), begrensd op 2,5 × gewicht.
 * Zo weegt "een paar fouten" zwaar mee, terwijl 500 identieke contrastfouten
 * de score niet onevenredig naar nul drukken.
 *
 * Belangrijk: een hoge score betekent NIET dat de site aan WCAG voldoet.
 */
function ruleDeduction(impact, count) {
  if (!count) return 0;
  const w = IMPACT_WEIGHT[impact] || 1;
  return Math.min(w * (1 + Math.log10(count)), w * 2.5);
}

function computeScore(issues) {
  let deduction = 0;
  for (const issue of issues) {
    if (issue.kind !== 'fout') continue;
    deduction += ruleDeduction(issue.impact, issue.count);
  }
  const score = Math.max(0, Math.round(100 - deduction));
  return { score, grade: gradeFor(score) };
}

function gradeFor(score) {
  if (score >= 90) return { label: 'Goed op weg', tone: 'goed' };
  if (score >= 70) return { label: 'Aandacht nodig', tone: 'matig' };
  if (score >= 50) return { label: 'Serieuze problemen', tone: 'ernstig' };
  return { label: 'Kritiek', tone: 'kritiek' };
}

/*
 * Voegt de ruwe resultaten van alle gescande pagina's samen tot één lijst bevindingen per regel.
 */
function aggregate(pages) {
  const byRule = new Map();
  for (const page of pages) {
    if (page.error) continue;
    for (const [id, res] of Object.entries(page.results)) {
      const meta = RULES[id];
      if (!meta || res.error) continue;
      const isControle = meta.kind === 'controle';
      const list = isControle ? res.incomplete : res.violations;
      const count = isControle ? res.incompleteCount : res.violationCount;
      // Bij een 'fout'-regel tellen we de 'incomplete' items apart als handmatige controle.
      const reviewCount = isControle ? 0 : res.incompleteCount;
      if (!count && !reviewCount) continue;
      if (!byRule.has(id)) {
        byRule.set(id, {
          id, ...meta, count: 0, reviewCount: 0, pages: [], examples: [], reviewExamples: [],
        });
      }
      const agg = byRule.get(id);
      agg.count += count;
      agg.reviewCount += reviewCount;
      if (count) agg.pages.push(page.url);
      for (const ex of list) if (agg.examples.length < 25) agg.examples.push({ ...ex, page: page.url });
      if (!isControle) {
        for (const ex of res.incomplete) if (agg.reviewExamples.length < 10) agg.reviewExamples.push({ ...ex, page: page.url });
      }
    }
  }
  const issues = Array.from(byRule.values());
  issues.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'fout' ? -1 : 1;
    const ia = IMPACT_ORDER.indexOf(a.impact);
    const ib = IMPACT_ORDER.indexOf(b.impact);
    if (ia !== ib) return ia - ib;
    return b.count - a.count;
  });
  return issues;
}

function summarize(issues) {
  const counts = { kritiek: 0, ernstig: 0, matig: 0, klein: 0 };
  let totalErrors = 0;
  let totalReview = 0;
  for (const i of issues) {
    if (i.kind === 'fout' && i.count) {
      counts[i.impact] += i.count;
      totalErrors += i.count;
    }
    totalReview += i.kind === 'controle' ? i.count : i.reviewCount;
  }
  return { counts, totalErrors, totalReview, rulesFailed: issues.filter((i) => i.kind === 'fout' && i.count).length };
}

module.exports = { computeScore, aggregate, summarize, ruleDeduction, gradeFor };
