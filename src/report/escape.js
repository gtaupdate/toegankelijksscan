'use strict';
// Alles wat van een gescande site komt (titels, HTML-fragmenten, selectors) is onbetrouwbare invoer.
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Alleen kleuren in #rrggbb-vorm worden als stijlwaarde gebruikt.
function safeHex(v) {
  return /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#000000';
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function plural(n, one, many) {
  return n + ' ' + (n === 1 ? one : many);
}

module.exports = { esc, safeHex, fmtDate, plural };
