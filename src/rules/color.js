/*
 * Kleur- en contrastberekening volgens WCAG 2.1 (1.4.3).
 * Werkt zowel in Node (tests) als in de browser (ingeladen vóór de regels).
 */
(function (root) {
  'use strict';

  // Parse "rgb(1, 2, 3)", "rgba(1, 2, 3, 0.5)" of de moderne syntax "rgb(1 2 3 / 0.5)".
  function parseColor(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null; // onbekend formaat (bijv. color(display-p3 ...)) -> handmatig controleren
    const parts = m[1].replace('/', ' ').split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const num = (p, max) => (p.endsWith('%') ? (parseFloat(p) / 100) * max : parseFloat(p));
    const r = num(parts[0], 255);
    const g = num(parts[1], 255);
    const b = num(parts[2], 255);
    const a = parts[3] !== undefined ? num(parts[3], 1) : 1;
    if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
    return { r, g, b, a: Math.max(0, Math.min(1, a)) };
  }

  // Legt een (semi-)transparante kleur over een ondoorzichtige achtergrond.
  function blend(top, bottom) {
    const a = top.a;
    return {
      r: top.r * a + bottom.r * (1 - a),
      g: top.g * a + bottom.g * (1 - a),
      b: top.b * a + bottom.b * (1 - a),
      a: 1,
    };
  }

  function channel(c) {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function luminance(c) {
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function contrastRatio(fg, bg) {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  // Grote tekst: minimaal 18pt (24px), of 14pt (18.66px) en vet. Dan geldt 3:1, anders 4.5:1.
  function requiredRatio(fontSizePx, fontWeight) {
    const w = parseInt(fontWeight, 10) || (fontWeight === 'bold' ? 700 : 400);
    const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && w >= 700);
    return large ? 3 : 4.5;
  }

  function toHex(c) {
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }

  const api = { parseColor, blend, luminance, contrastRatio, requiredRatio, toHex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.__tsColor = api;
})(this);
