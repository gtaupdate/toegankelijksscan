/* KlusVanger: rekenhulp, voorbeeldgesprek, formulieren. Geen externe bibliotheken. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var eur = function (v) { return '€ ' + Math.round(v).toLocaleString('nl-NL'); };

  /* ---------- Hero: melding valt binnen, velden lichten op ---------- */
  var notif = $('[data-kv-notif]');
  if (notif && !reduce) {
    notif.classList.add('is-anim');
    $$('[data-kv-herobon] dd').forEach(function (dd, i) {
      dd.style.animationDelay = (0.45 + i * 0.18) + 's';
      dd.classList.add('is-filled');
    });
  }

  /* ---------- Rekenhulp ---------- */
  var calc = $('[data-kv-calc]');
  if (calc) {
    var n = $('#kv-c-n'), c = $('#kv-c-c'), w = $('#kv-c-w');
    var update = function () {
      var nv = +n.value, cv = +c.value / 100, wv = +w.value;
      var jobs = nv * cv, val = jobs * wv, be = wv ? 249 / wv : 0;
      $('[data-o="n"]').textContent = nv;
      $('[data-o="c"]').textContent = Math.round(cv * 100) + '%';
      $('[data-o="w"]').textContent = eur(wv);
      $('[data-kv-calc-out]').textContent = eur(val);
      $('[data-kv-calc-jobs]').textContent = jobs.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
      $('[data-kv-calc-be]').textContent = be ? be.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + (be <= 1 ? ' opdracht' : ' opdrachten') : '–';
    };
    [n, c, w].forEach(function (el) { el.addEventListener('input', update); });
    update();
  }

  /* ---------- Voorbeeldgesprek ---------- */
  var log = $('[data-kv-log]');
  if (log) {
    var DEMO = (window.KV && window.KV.demo) || null;
    var BEDRIJF = DEMO ? DEMO.bedrijf : 'Vakbedrijf De Vries';
    var CALLER = '06 12 34 56 78';
    var SCEN = DEMO ? DEMO.scen : {
      lekkage: { label: 'Lekkage met spoed', a: { klus: ['Er komt water uit het plafond onder de badkamer, het blijft lopen'], plaats: ['3561 AB Utrecht'], check: ['Ja, klopt'], naam: ['Met Sanne Jansen'], nummer: ['Ja, dat nummer is goed'] } },
      cv: { label: 'Cv-ketel in storing', a: { klus: ['Mijn cv-ketel geeft een storing, F28 staat op het scherm'], spoed: ['Het kan morgen ook nog'], plaats: ['Amersfoort'], check: ['Ja'], naam: ['Peter de Boer'], nummer: ['Nee, bel me op 06 87 65 43 21'] } },
      prijs: { label: 'Vraagt naar de prijs', a: { klus: ['Mijn wc is verstopt. Wat kost dat als jullie komen?'], spoed: ['Nee, morgen is ook goed'], plaats: ['Zeist'], check: ['Ja'], naam: ['Ruud Smit'], nummer: ['Ja'] } },
      offerte: { label: 'Offerte badkamer', a: { klus: ['Ik wil een offerte voor een nieuwe badkamer'], spoed: ['Nee hoor, geen haast'], plaats: ['3811 KL Amersfoort'], check: ['Ja'], naam: ['Fatima El Amrani'], nummer: ['Ja'] } },
      gas: { label: 'Ruikt gas', a: { klus: ['Ik ruik gas in de keuken'] } }
    };
    var TYPES = [[/gas/i, 'Gaslucht'], [/brandlucht|rook|vonk|smeult/i, 'Brandgevaar'], [/sleutel|slot|buitengesloten/i, 'Slot / buitengesloten'], [/ruit|glas/i, 'Glasschade'], [/dakpan|schoorsteen|dakgoot|dak\b/i, 'Dak'], [/stroom|aardlek|groep|stopcontact|meterkast|laadpaal|zonnepane/i, 'Elektra'], [/lek|lekt|water|druppel/i, 'Lekkage'], [/cv|ketel|verwarming|storing/i, 'Cv-ketel'], [/afvoer|riool|verstopt|wc|toilet/i, 'Afvoer'], [/kozijn|deur|kast|timmer/i, 'Timmerwerk'], [/schilder|verf|stuc/i, 'Schilderwerk'], [/tuin|bestrating|schutting|hek/i, 'Tuin'], [/badkamer|keuken|verbouw|offerte/i, 'Offerte'], [/kost|prijs/i, 'Vraag']];
    var URGENT = /\b(nu|direct|spoed|loopt|blijft|meteen|dringend|buiten|omhoog|kapot|lekt)\b|geen (warm water|verwarming|stroom)/i;
    var YES = /^(ja|jawel|klopt|zeker|graag|is goed|dat klopt|correct)\b/i;
    var NO = /^(nee|neen|niet|geen)\b/i;
    var PRICE = /kost|prijs|tarief|hoe duur|vandaag (nog )?komen|wanneer kunnen|langskomen/i;
    var PC = /\b\d{4}\s?[a-z]{2}\b/i;
    var scen = Object.keys(SCEN)[0], call;

    var bon = $('[data-kv-demobon]');
    var setField = function (f, v) {
      var dd = $('[data-f="' + f + '"]', bon);
      if (!dd) return;
      if (v) { dd.textContent = v; dd.classList.remove('is-empty'); if (!reduce) { dd.classList.remove('is-filled'); void dd.offsetWidth; dd.classList.add('is-filled'); } }
      else { dd.textContent = f === 'letop' ? 'niets' : 'nog niet bekend'; dd.classList.add('is-empty'); }
    };
    var setFoot = function (html) { $('[data-kv-bonfoot]').innerHTML = html; };
    var add = function (who, t) { var d = document.createElement('div'); d.className = 'kv-msg kv-msg--' + who; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    var say = function (t) { add('ai', t); };
    var Q = { klus: 'Waar kan ik u mee helpen?', spoed: 'Ontstaat er op dit moment schade, of kan het tot morgen wachten?', plaats: 'Wat is de postcode of plaats van het adres?', naam: 'Mag ik uw naam noteren?', nummer: 'Mogen we u terugbellen op ' + CALLER + '?' };
    var ask = function (pre) { say((pre ? pre + ' ' : '') + (call.step === 'check' ? 'Ik noteer ' + call.d.plaats + '. Klopt dat?' : Q[call.step])); };
    var go = function (step, pre) { call.step = step; call.fails = 0; if (step === 'slot') return finish(pre); ask(pre); };
    var noteLetop = function (t) { call.d.letop.push(t); setField('letop', call.d.letop.join(' · ')); };

    var start = function () {
      log.innerHTML = '';
      call = { step: 'klus', fails: 0, att: {}, ended: false, d: { letop: [] } };
      ['klus', 'omschrijving', 'plaats', 'naam', 'nummer', 'letop'].forEach(function (f) { setField(f, ''); });
      setFoot('<span class="kv-tag">gesprek loopt</span>');
      add('sys', 'Gemiste oproep van ' + CALLER + ' · doorgeschakeld');
      say('Goedendag, u spreekt met de digitale assistent van ' + BEDRIJF + '. We zijn nu bij een klant. Ik noteer uw aanvraag, zodat we u snel terugbellen. Waar kan ik u mee helpen?');
      chips();
    };
    var finish = function (pre) {
      var d = call.d;
      say((pre ? pre + ' ' : '') + 'Ik vat samen: ' + (d.klus ? d.klus.toLowerCase() : 'een bericht') + (d.plaats ? ' in ' + d.plaats : '') + (d.spoed ? ', met spoed' : '') + '. ' + BEDRIJF + ' belt u terug op ' + (d.nummer || CALLER) + '. Ik kan zelf geen afspraak of prijs bevestigen. Fijne dag.');
      end();
    };
    var end = function () {
      call.ended = true;
      add('sys', 'Gesprek klaar · klusaanvraag verstuurd');
      setFoot((call.d.spoed ? '<span class="kv-stamp kv-stamp--spoed">Spoed</span><span class="kv-tag">sms naar monteur van dienst</span>' : '<span class="kv-stamp kv-stamp--ok">Verstuurd</span><span class="kv-tag">per mail, binnen een minuut</span>'));
      chips();
    };
    var next = function (input) {
      if (!call || call.ended) return;
      var t = String(input || '').trim(); if (!t) return;
      add('me', t);
      call.att[call.step] = (call.att[call.step] || 0) + 1;
      var d = call.d, type = null;
      TYPES.some(function (x) { if (x[0].test(t)) { type = x[1]; return true; } return false; });

      if (type === 'Gaslucht') {
        d.klus = 'Gaslucht'; d.spoed = true; setField('klus', 'Gaslucht'); setField('omschrijving', t); d.nummer = CALLER; setField('nummer', CALLER + ' (nummerherkenning)');
        say('Ruikt u gas? Verlaat de woning direct. Bedien geen lichtknoppen of andere schakelaars, trek geen stekkers uit en gebruik geen vuur. Bel buiten het landelijk storingsnummer gas en stroom: 0800-9009. Bij direct gevaar belt u 112. Ik geef uw melding ook door aan ' + BEDRIJF + '.');
        noteLetop('gaslucht: verwezen naar 0800-9009 en 112');
        return end();
      }
      if (type === 'Brandgevaar') {
        d.klus = 'Brandgevaar'; d.spoed = true; setField('klus', 'Brandgevaar'); setField('omschrijving', t); d.nummer = CALLER; setField('nummer', CALLER + ' (nummerherkenning)');
        say('Ziet u rook of vuur, bel dan direct 112 en ga naar buiten. Kom niet aan de installatie. Alleen als het veilig kan: zet de hoofdschakelaar in de meterkast uit. Ik geef uw melding met spoed door aan ' + BEDRIJF + '.');
        noteLetop('brandlucht of vonken: verwezen naar 112');
        return end();
      }
      if (PRICE.test(t)) {
        noteLetop('vraag: ' + t);
        var safe = 'Prijzen en planning kan ik niet geven. Dat bespreekt ' + BEDRIJF + ' met u als ze terugbellen. Ik noteer uw vraag.';
        if (call.step === 'klus' && type) { d.klus = type; setField('klus', type); setField('omschrijving', t); return go('spoed', safe); }
        return ask(safe);
      }
      var fail = function (q) {
        call.fails++;
        if (call.fails >= 2) { noteLetop('deels onbegrepen, terugbellen'); return go(d.nummer ? 'slot' : 'nummer', 'Ik noteer dit als bericht.'); }
        say(q);
      };
      switch (call.step) {
        case 'klus':
          if (!type) return fail('Kunt u kort zeggen wat er aan de hand is? Bijvoorbeeld een lekkage, een storing of een offerte.');
          d.klus = type; setField('klus', type); setField('omschrijving', t);
          if (URGENT.test(t)) { d.spoed = true; return go('plaats', 'Dat klinkt dringend, ik markeer het als spoed.'); }
          return go('spoed', 'Begrepen.');
        case 'spoed':
          if (NO.test(t) || /wacht|morgen|geen haast/i.test(t)) d.spoed = false;
          else if (URGENT.test(t) || YES.test(t)) d.spoed = true;
          else return fail('Is het dringend, dus ontstaat er nu schade? Ja of nee is genoeg.');
          return go('plaats');
        case 'plaats':
          var pc = t.match(PC), pl = t.replace(PC, '').replace(/^(in|te)\s+/i, '').replace(/[.,]/g, '').trim();
          if (!pc && !/^[A-Z][a-zA-Z\- ']{2,}$/.test(pl)) return fail('Ik heb een postcode of plaatsnaam nodig, bijvoorbeeld 3561 AB of Utrecht.');
          d.plaats = [pc ? pc[0].toUpperCase().replace(/(\d{4})\s?/, '$1 ') : '', pl].filter(Boolean).join(' ');
          setField('plaats', d.plaats);
          return go('check');
        case 'check':
          if (YES.test(t)) return go('naam');
          if (NO.test(t)) { d.plaats = null; setField('plaats', ''); return go('plaats', 'Excuus.'); }
          return fail('Ik noteer ' + d.plaats + '. Klopt dat? Ja of nee is genoeg.');
        case 'naam':
          var nm = t.replace(/^(met|mijn naam is|ik ben|dit is)\s+/i, '').trim();
          if (nm.length < 2 || nm.length > 40) return fail('Mag ik uw naam noteren?');
          d.naam = nm.replace(/\b\w/g, function (ch) { return ch.toUpperCase(); }); setField('naam', d.naam);
          return go('nummer', 'Dank u, ' + d.naam + '.');
        case 'nummer':
          var num = t.replace(/[\s-]/g, '').match(/(\+31|0)\d{9}/);
          if (num) d.nummer = num[0].replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');
          else if (YES.test(t)) d.nummer = CALLER;
          else if (NO.test(t)) return say('Op welk nummer kunnen we u het beste bereiken?');
          else return fail('Mogen we u terugbellen op ' + CALLER + ', of op een ander nummer?');
          setField('nummer', d.nummer);
          return go('slot');
      }
    };
    var chips = function () {
      var box = $('[data-kv-chips]'); box.innerHTML = '';
      if (!call || call.ended) {
        var r = document.createElement('button'); r.type = 'button'; r.textContent = 'Nog een gesprek proberen'; r.addEventListener('click', start); box.appendChild(r); return;
      }
      var list = (SCEN[scen].a[call.step] || []);
      var opt = list[Math.min(call.att[call.step] || 0, list.length - 1)];
      if (opt) { var b = document.createElement('button'); b.type = 'button'; b.textContent = opt; b.addEventListener('click', function () { next(opt); chips(); }); box.appendChild(b); }
    };
    var scenBox = $('[data-kv-scen]');
    Object.keys(SCEN).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = SCEN[k].label; b.setAttribute('aria-pressed', k === scen ? 'true' : 'false');
      b.addEventListener('click', function () { scen = k; $$('button', scenBox).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); start(); });
      scenBox.appendChild(b);
    });
    $('[data-kv-restart]').addEventListener('click', start);
    $('[data-kv-replyform]').addEventListener('submit', function (e) { e.preventDefault(); var i = $('#kv-reply'); var v = i.value; i.value = ''; next(v); chips(); });
    start();
  }

  /* ---------- Formulieren (pilot en partner) ---------- */
  $$('[data-kv-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('[data-kv-msg]', form), btn = $('button[type="submit"]', form);
      var show = function (ok, text) { msg.hidden = false; msg.className = 'kv-form__msg ' + (ok ? 'is-ok' : 'is-err'); msg.textContent = text; };
      if (!form.checkValidity()) {
        var bad = $(':invalid', form);
        show(false, bad && bad.type === 'checkbox' ? 'Vink de toestemming aan om verder te gaan.' : 'Vul je naam, bedrijfsnaam en een geldig e-mailadres in.');
        if (bad) bad.focus();
        return;
      }
      var fd = new FormData(form), body = { soort: form.getAttribute('data-kv-form'), bron: location.href.slice(0, 200) };
      fd.forEach(function (v, k) { body[k] = v; });
      body.toestemming_contact = !!form.elements.toestemming_contact && form.elements.toestemming_contact.checked;
      body.toestemming_anoniem = !!form.elements.toestemming_anoniem && form.elements.toestemming_anoniem.checked;
      var endpoint = (window.KV && window.KV.endpoint) || '';
      if (!endpoint) { show(true, 'Dit is een voorbeeldweergave: er is niets verstuurd. Op de echte site komt je aanvraag hier binnen.'); return; }
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Versturen…';
      fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (res && res.ok) {
            form.reset();
            show(true, body.soort === 'partner' ? 'Bedankt. Je ontvangt binnen twee werkdagen de informatie over het partnerprogramma.' : 'Gelukt. Je krijgt binnen een werkdag een mail om je assistent in te stellen. Je 14 gratis dagen beginnen zodra hij aan staat.');
          } else { show(false, (res && res.fout) || 'Versturen lukte niet. Probeer het later opnieuw.'); }
        })
        .catch(function () { show(false, 'Geen verbinding. Controleer je internet en probeer het opnieuw.'); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });

  /* ---------- Pakketknoppen kiezen het pakket in het formulier ---------- */
  $$('[data-kv-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = $('input[name="plan"][value="' + a.getAttribute('data-kv-plan') + '"]'); if (r) r.checked = true;
    });
  });

  /* ---------- Header: schaduw bij scrollen en mobiel menu ---------- */
  var header = $('[data-kv-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var menuBtn = $('[data-kv-menu]'), nav = $('#kv-nav');
    if (menuBtn && nav) {
      var setMenu = function (open) { nav.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
      $$('a', nav).forEach(function (l) { l.addEventListener('click', function () { setMenu(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    }
  }

  /* ---------- Presentatie ---------- */
  $$('[data-kv-deck]').forEach(function (deck) {
    var track = $('[data-kv-deck-track]', deck), slides = $$('.kv-slide', deck), n = slides.length, cur = 0;
    var prev = $('[data-kv-deck-prev]', deck), next = $('[data-kv-deck-next]', deck), dots = $$('[data-kv-deck-dot]', deck);
    var now = $('[data-kv-deck-now]', deck), bar = $('[data-kv-deck-bar]', deck);
    function paint(i) {
      cur = i; now.textContent = i + 1; bar.style.width = ((i + 1) / n * 100) + '%';
      prev.disabled = i === 0; next.textContent = i === n - 1 ? 'Opnieuw ↺' : 'Volgende →';
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    function go(i) { i = (i + n) % n; track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' }); paint(i); }
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur === n - 1 ? 0 : cur + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-kv-deck-dot')); }); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); } });
    var t; track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(function () { var i = Math.round(track.scrollLeft / track.clientWidth); if (i !== cur && i >= 0 && i < n) paint(i); }, 80); }, { passive: true });
    paint(0);
  });

  /* ---------- Partner uitklappen ---------- */
  var pBtn = $('[data-kv-partner-open]');
  if (pBtn) pBtn.addEventListener('click', function () {
    var box = $('[data-kv-partner]'); var open = box.classList.toggle('is-open');
    pBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); pBtn.textContent = open ? 'Sluiten' : 'Word partner';
    if (open) { var f = $('input[name="naam"]', box); if (f) f.focus(); }
  });

  /* ---------- Mobiele actiebalk: verschijnt na de hero, verdwijnt bij het formulier ---------- */
  var bar = $('[data-kv-mobilebar]'), hero = $('.kv-hero'), signup = $('#aanmelden');
  if (bar && hero && 'IntersectionObserver' in window) {
    var heroGone = false, signupIn = false;
    var sync = function () { bar.classList.toggle('is-visible', heroGone && !signupIn); };
    new IntersectionObserver(function (es) { heroGone = !es[0].isIntersecting; sync(); }).observe(hero);
    if (signup) new IntersectionObserver(function (es) { signupIn = es[0].isIntersecting; sync(); }).observe(signup);
  }
})();
