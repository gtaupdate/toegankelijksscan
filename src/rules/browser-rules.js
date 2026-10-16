/*
 * Toegankelijkheidsregels die in de pagina zelf draaien (via Playwright ingeladen).
 * Elke regel geeft terug: welke elementen falen (violations), welke handmatig
 * gecontroleerd moeten worden (incomplete) en hoeveel elementen zijn bekeken (checked).
 *
 * Bewust beperkt tot regels die automatisch BETROUWBAAR te bepalen zijn.
 * Een geautomatiseerde scan vindt nooit alle WCAG-problemen.
 */
(function (root) {
  'use strict';
  const C = root.__tsColor;
  const MAX_NODES = 60; // maximaal aantal voorbeeldelementen per regel in het rapport

  // ---------- Hulpfuncties ----------

  function cssEscape(s) {
    return (root.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function selectorFor(el) {
    if (el.id && document.querySelectorAll('#' + cssEscape(el.id)).length === 1) {
      return '#' + cssEscape(el.id);
    }
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 5) {
      let part = cur.tagName.toLowerCase();
      if (cur.id && document.querySelectorAll('#' + cssEscape(cur.id)).length === 1) {
        parts.unshift('#' + cssEscape(cur.id));
        break;
      }
      const parent = cur.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(' > ');
  }

  function snippet(el) {
    const clone = el.cloneNode(false);
    let html = clone.outerHTML || '';
    // Inhoud van grote elementen weglaten, alleen de openingstag tonen.
    const close = '</' + el.tagName.toLowerCase() + '>';
    if (html.endsWith(close)) html = html.slice(0, -close.length);
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text && el.children.length === 0) html += text.slice(0, 60) + (text.length > 60 ? '…' : '');
    return html.length > 220 ? html.slice(0, 220) + '…' : html;
  }

  function isAriaHidden(el) {
    for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
      if (cur.getAttribute('aria-hidden') === 'true') return true;
      if (cur.hasAttribute('inert')) return true;
    }
    return false;
  }

  function isVisible(el) {
    if (!el.isConnected) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || st.visibility === 'collapse') return false;
    if (el.getClientRects().length === 0) return false;
    // Ook voorouders met display:none vangen we via getClientRects; opacity 0 telt als onzichtbaar.
    for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
      if (parseFloat(getComputedStyle(cur).opacity) === 0) return false;
    }
    return true;
  }

  // Elementen die een screenreader niet bereikt, tellen niet mee voor naam-regels.
  function inAccessibilityTree(el) {
    return isVisible(el) && !isAriaHidden(el);
  }

  function textOf(node) {
    let out = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        out += child.textContent;
      } else if (child.nodeType === 1) {
        const el = child;
        if (el.getAttribute('aria-hidden') === 'true') return;
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return;
        const tag = el.tagName.toLowerCase();
        if (el.getAttribute('aria-label')) { out += ' ' + el.getAttribute('aria-label') + ' '; return; }
        if (tag === 'img' || (tag === 'input' && el.type === 'image')) { out += ' ' + (el.getAttribute('alt') || '') + ' '; return; }
        if (tag === 'svg') {
          const t = el.querySelector('title');
          out += ' ' + (t ? t.textContent : '') + ' ';
          return;
        }
        if (tag === 'script' || tag === 'style' || tag === 'template') return;
        out += ' ' + textOf(el) + ' ';
      }
    });
    return out;
  }

  // Vereenvoudigde berekening van de toegankelijke naam (accname 1.2, belangrijkste stappen).
  function accessibleName(el) {
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const txt = labelledby.split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((n) => textOf(n))
        .join(' ').trim();
      if (txt) return { name: txt, source: 'aria-labelledby' };
    }
    const label = (el.getAttribute('aria-label') || '').trim();
    if (label) return { name: label, source: 'aria-label' };

    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'area' || (tag === 'input' && el.type === 'image')) {
      const alt = el.getAttribute('alt');
      if (alt !== null && alt.trim()) return { name: alt.trim(), source: 'alt' };
    }
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      if (el.labels && el.labels.length) {
        const txt = Array.from(el.labels).map((l) => textOf(l)).join(' ').trim();
        if (txt) return { name: txt, source: 'label' };
      }
      if (tag === 'input' && ['submit', 'reset', 'button'].includes(el.type)) {
        const v = (el.value || '').trim();
        if (v) return { name: v, source: 'value' };
        if (el.type === 'submit') return { name: 'Verzenden', source: 'default' };
        if (el.type === 'reset') return { name: 'Herstellen', source: 'default' };
      }
    }
    if (['a', 'button', 'summary'].includes(tag) || ['button', 'link', 'menuitem', 'tab'].includes(el.getAttribute('role'))) {
      const txt = textOf(el).replace(/\s+/g, ' ').trim();
      if (txt) return { name: txt, source: 'content' };
    }
    if (tag === 'svg') {
      const t = el.querySelector(':scope > title');
      if (t && t.textContent.trim()) return { name: t.textContent.trim(), source: 'title-element' };
    }
    const title = (el.getAttribute('title') || '').trim();
    if (title) return { name: title, source: 'title' };
    if ((tag === 'input' || tag === 'textarea')) {
      const ph = (el.getAttribute('placeholder') || '').trim();
      if (ph) return { name: ph, source: 'placeholder' };
    }
    return { name: '', source: null };
  }

  function makeResult() {
    return { violations: [], incomplete: [], checked: 0, total: 0 };
  }

  function push(list, el, extra) {
    list.__count = (list.__count || 0) + 1;
    if (list.length >= MAX_NODES) return;
    list.push(Object.assign({ selector: selectorFor(el), html: snippet(el) }, extra || {}));
  }

  // ---------- Regels ----------

  const rules = {};

  rules['html-lang'] = function () {
    const r = makeResult();
    const html = document.documentElement;
    r.checked = 1;
    const lang = (html.getAttribute('lang') || '').trim();
    if (!lang) push(r.violations, html, { detail: 'Het <html>-element heeft geen lang-attribuut.' });
    else if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(lang)) {
      push(r.violations, html, { detail: 'Ongeldige taalcode: "' + lang + '".' });
    }
    return r;
  };

  rules['document-title'] = function () {
    const r = makeResult();
    r.checked = 1;
    if (!document.title || !document.title.trim()) {
      push(r.violations, document.documentElement, { detail: 'De pagina heeft geen <title>.' });
    }
    return r;
  };

  rules['meta-viewport-zoom'] = function () {
    const r = makeResult();
    document.querySelectorAll('meta[name="viewport"]').forEach((m) => {
      r.checked++;
      const c = (m.getAttribute('content') || '').toLowerCase().replace(/\s/g, '');
      const noScale = /user-scalable=(no|0)(,|$)/.test(c);
      const max = c.match(/maximum-scale=([0-9.]+)/);
      if (noScale || (max && parseFloat(max[1]) < 2)) {
        push(r.violations, m, { detail: 'Inzoomen wordt geblokkeerd: "' + c + '".' });
      }
    });
    return r;
  };

  rules['image-alt'] = function () {
    const r = makeResult();
    document.querySelectorAll('img, input[type="image"], area[href], [role="img"]').forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      const role = el.getAttribute('role');
      if (role === 'presentation' || role === 'none') return;
      r.checked++;
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        if (!el.hasAttribute('alt') && !accessibleName(el).name) {
          push(r.violations, el, { detail: 'Afbeelding zonder alt-attribuut.', src: (el.currentSrc || el.src || '').slice(0, 200) });
        }
        return;
      }
      if (!accessibleName(el).name) push(r.violations, el, { detail: 'Element zonder tekstalternatief.' });
    });
    return r;
  };

  rules['image-alt-suspicious'] = function () {
    const r = makeResult();
    const bad = /^(image|img|afbeelding|foto|photo|picture|logo|banner|icon|icoon|untitled|naamloos|dsc|img_?\d+)$/i;
    const file = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
    document.querySelectorAll('img[alt]').forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      const alt = el.getAttribute('alt').trim();
      if (!alt) return;
      r.checked++;
      if (bad.test(alt) || file.test(alt) || /^[\w-]+_\d{2,}/.test(alt)) {
        push(r.incomplete, el, { detail: 'Alt-tekst lijkt niet beschrijvend: "' + alt.slice(0, 80) + '".' });
      }
    });
    return r;
  };

  rules['link-name'] = function () {
    const r = makeResult();
    document.querySelectorAll('a[href], [role="link"]').forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      r.checked++;
      if (!accessibleName(el).name) push(r.violations, el, { detail: 'Link zonder tekst of toegankelijke naam.', href: (el.getAttribute('href') || '').slice(0, 200) });
    });
    return r;
  };

  rules['button-name'] = function () {
    const r = makeResult();
    document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]').forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      r.checked++;
      if (!accessibleName(el).name) push(r.violations, el, { detail: 'Knop zonder tekst of toegankelijke naam.' });
    });
    return r;
  };

  const LABELABLE = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea';

  rules['form-label'] = function () {
    const r = makeResult();
    document.querySelectorAll(LABELABLE).forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      r.checked++;
      const n = accessibleName(el);
      if (!n.name) push(r.violations, el, { detail: 'Formulierveld zonder label.' });
    });
    return r;
  };

  rules['label-placeholder-only'] = function () {
    const r = makeResult();
    document.querySelectorAll(LABELABLE).forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      r.checked++;
      if (accessibleName(el).source === 'placeholder') {
        push(r.violations, el, { detail: 'Alleen een placeholder als label ("' + el.getAttribute('placeholder').slice(0, 60) + '"). Die verdwijnt tijdens het typen.' });
      }
    });
    return r;
  };

  rules['iframe-title'] = function () {
    const r = makeResult();
    document.querySelectorAll('iframe, frame').forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      r.checked++;
      if (!accessibleName(el).name) push(r.violations, el, { detail: 'Iframe zonder title.', src: (el.getAttribute('src') || '').slice(0, 200) });
    });
    return r;
  };

  rules['tabindex-positive'] = function () {
    const r = makeResult();
    document.querySelectorAll('[tabindex]').forEach((el) => {
      r.checked++;
      if (parseInt(el.getAttribute('tabindex'), 10) > 0) {
        push(r.violations, el, { detail: 'tabindex="' + el.getAttribute('tabindex') + '" verstoort de tabvolgorde.' });
      }
    });
    return r;
  };

  rules['empty-heading'] = function () {
    const r = makeResult();
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]').forEach((el) => {
      if (!inAccessibilityTree(el)) return;
      r.checked++;
      if (!textOf(el).replace(/\s+/g, '').length && !el.getAttribute('aria-label')) {
        push(r.violations, el, { detail: 'Lege kop.' });
      }
    });
    return r;
  };

  rules['heading-structure'] = function () {
    const r = makeResult();
    const heads = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(inAccessibilityTree);
    r.checked = heads.length;
    if (!heads.some((h) => h.tagName === 'H1')) {
      push(r.incomplete, document.body || document.documentElement, { detail: 'Geen zichtbare <h1> gevonden.' });
    }
    let prev = 0;
    heads.forEach((h) => {
      const lvl = parseInt(h.tagName[1], 10);
      if (prev && lvl > prev + 1) {
        push(r.incomplete, h, { detail: 'Kopniveau springt van h' + prev + ' naar h' + lvl + '.' });
      }
      prev = lvl;
    });
    return r;
  };

  // Ligt er een afbeelding, video of canvas onder het midden van deze tekst?
  function overlapsMedia(el, rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Binnen het zichtbare scherm: kijk wat er écht onder de tekst ligt (bijv. een doorzichtige
    // header boven een grote foto, waar de foto niet in dezelfde HTML-tak zit).
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      const stack = document.elementsFromPoint(cx, cy);
      for (const under of stack) {
        if (under === el || el.contains(under) || under.contains(el)) continue;
        const tag = under.tagName.toLowerCase();
        if (['img', 'video', 'canvas', 'picture'].includes(tag)) return true;
        const bgImg = getComputedStyle(under).backgroundImage;
        if (bgImg && bgImg !== 'none') return true;
      }
    }
    let anc = el.parentElement;
    for (let depth = 0; anc && depth < 6; depth++, anc = anc.parentElement) {
      const media = anc.querySelectorAll('img, video, canvas, picture');
      for (const m of media) {
        if (m === el || el.contains(m)) continue;
        const mr = m.getBoundingClientRect();
        if (mr.width < 20 || mr.height < 20) continue; // iconen tellen niet
        if (cx >= mr.left && cx <= mr.right && cy >= mr.top && cy <= mr.bottom && isVisible(m)) return true;
      }
    }
    return false;
  }

  rules['color-contrast'] = function () {
    const r = makeResult();
    const seen = new Set();
    const candidates = [];
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      candidates.push(el);
      if (candidates.length > 1500) break; // grens voor zeer grote pagina's
    }
    candidates.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'option', 'title'].includes(tag)) return;
      if (!isVisible(el)) return;
      // Uitgeschakelde bedieningselementen zijn uitgezonderd van 1.4.3.
      if (el.closest('button:disabled, input:disabled, select:disabled, textarea:disabled, fieldset:disabled, [aria-disabled="true"]')) return;
      const st = getComputedStyle(el);
      const size = parseFloat(st.fontSize);
      if (!size || size < 1) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      // Visueel verborgen tekst (sr-only) overslaan.
      if (st.clip === 'rect(0px, 0px, 0px, 0px)' || (rect.width <= 1 && rect.height <= 1)) return;
      r.checked++;

      let fg = C.parseColor(st.color);
      if (!fg) { push(r.incomplete, el, { detail: 'Tekstkleur kon niet worden gelezen: ' + st.color }); return; }

      // Opacity van het element en voorouders verlaagt het effectieve contrast.
      let opacity = 1;
      for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
        opacity *= parseFloat(getComputedStyle(cur).opacity);
      }

      const layers = [];
      let reason = null;
      for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
        const cs = getComputedStyle(cur);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') { reason = 'achtergrondafbeelding of verloop'; break; }
        const bg = C.parseColor(cs.backgroundColor);
        if (!bg) { reason = 'onleesbare achtergrondkleur'; break; }
        if (bg.a > 0) layers.push(bg);
        if (bg.a >= 1) break;
      }
      // Tekst over een afbeelding of video (bijv. een banner): de kleur erachter is dan niet betrouwbaar.
      if (!reason && overlapsMedia(el, rect)) reason = 'tekst op een afbeelding of video';
      if (reason) {
        push(r.incomplete, el, { detail: 'Contrast niet automatisch te bepalen (' + reason + ').' });
        return;
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) bg = C.blend(layers[i], bg);
      fg = C.blend({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * opacity }, bg);

      const ratio = C.contrastRatio(fg, bg);
      const need = C.requiredRatio(size, st.fontWeight);
      if (ratio + 1e-6 < need) {
        push(r.violations, el, {
          detail: 'Contrast ' + ratio.toFixed(2) + ':1, nodig is ' + need + ':1.',
          fg: C.toHex(fg),
          bg: C.toHex(bg),
          ratio: Math.round(ratio * 100) / 100,
          required: need,
          fontSize: Math.round(size * 10) / 10,
        });
      }
    });
    return r;
  };

  // ---------- Platformherkenning (voor gerichte oplostips) ----------

  function detectPlatform() {
    const html = document.documentElement.outerHTML.slice(0, 400000);
    const gen = (document.querySelector('meta[name="generator"]') || {}).content || '';
    const found = [];
    if (/woocommerce/i.test(html)) found.push('woocommerce');
    if (/wp-content|wp-includes/i.test(html) || /wordpress/i.test(gen)) found.push('wordpress');
    if (root.Shopify || /cdn\.shopify\.com/i.test(html)) found.push('shopify');
    if (/Magento|mage\/cookies/i.test(html)) found.push('magento');
    if (/lightspeed|seoshop/i.test(html)) found.push('lightspeed');
    if (/ccvshop/i.test(html)) found.push('ccvshop');
    if (/wix\.com|wixstatic/i.test(html)) found.push('wix');
    return found;
  }

  function run(only) {
    const results = {};
    Object.keys(rules).forEach((id) => {
      if (only && !only.includes(id)) return;
      try {
        const res = rules[id]();
        res.violationCount = res.violations.__count || 0;
        res.incompleteCount = res.incomplete.__count || 0;
        results[id] = {
          checked: res.checked,
          violationCount: res.violationCount,
          incompleteCount: res.incompleteCount,
          violations: Array.from(res.violations),
          incomplete: Array.from(res.incomplete),
        };
      } catch (e) {
        results[id] = { error: String(e && e.message || e) };
      }
    });
    return {
      results,
      page: {
        title: document.title,
        url: location.href,
        lang: document.documentElement.getAttribute('lang') || '',
        platforms: detectPlatform(),
      },
    };
  }

  root.__tsRules = { run, ruleIds: Object.keys(rules) };
})(this);
