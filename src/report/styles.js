'use strict';
/* Gedeelde opmaak voor rapport en verklaring. Licht en donker thema via tokens. */
module.exports = `
/* Layout: één leeskolom (max 860px) met een samenvattingsband bovenaan; bevindingen als genummerde dossierkaarten. */
:root {
  --paper: #f6f7f9;
  --sheet: #ffffff;
  --ink: #14181f;
  --ink-2: #4a5263;
  --ink-3: #5f677a;
  --rule: #dfe3ea;
  --accent: #1f4fd1;
  --accent-soft: #e7edfc;
  --code-bg: #f0f2f6;
  --sev-kritiek: #b42318; --sev-kritiek-bg: #fdecea;
  --sev-ernstig: #b54708; --sev-ernstig-bg: #fef0e6;
  --sev-matig: #8a6100;   --sev-matig-bg: #fdf5dc;
  --sev-klein: #475467;   --sev-klein-bg: #eef1f5;
  --good: #067647; --good-bg: #e6f6ee;
  --f-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --f-body: "Instrument Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
  --f-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #0f1218; --sheet: #161a22; --ink: #e8ebf1; --ink-2: #b3bac8; --ink-3: #8a93a5;
    --rule: #2a303c; --accent: #8aa8ff; --accent-soft: #1c2541; --code-bg: #1d222c;
    --sev-kritiek: #ff8a80; --sev-kritiek-bg: #3a1714;
    --sev-ernstig: #ffb27a; --sev-ernstig-bg: #3a2312;
    --sev-matig: #f2cf66;   --sev-matig-bg: #33290d;
    --sev-klein: #b3bac8;   --sev-klein-bg: #232834;
    --good: #6fdca6; --good-bg: #12301f;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #0f1218; --sheet: #161a22; --ink: #e8ebf1; --ink-2: #b3bac8; --ink-3: #8a93a5;
  --rule: #2a303c; --accent: #8aa8ff; --accent-soft: #1c2541; --code-bg: #1d222c;
  --sev-kritiek: #ff8a80; --sev-kritiek-bg: #3a1714;
  --sev-ernstig: #ffb27a; --sev-ernstig-bg: #3a2312;
  --sev-matig: #f2cf66;   --sev-matig-bg: #33290d;
  --sev-klein: #b3bac8;   --sev-klein-bg: #232834;
  --good: #6fdca6; --good-bg: #12301f;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font: 400 16px/1.6 var(--f-body);
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 32px 64px;
}
.wrap { max-width: 860px; margin: 0 auto; display: grid; gap: 28px; grid-template-columns: minmax(0, 1fr); }
.wrap > *, .section > *, .issue > * { min-width: 0; }
.section, .issue, .masthead, .limits { grid-template-columns: minmax(0, 1fr); }
.masthead h1 { overflow-wrap: anywhere; }
h1, h2, h3 { font-family: var(--f-display); text-wrap: balance; margin: 0; line-height: 1.2; }
h1 { font-size: clamp(1.7rem, 4vw, 2.3rem); font-weight: 700; letter-spacing: -0.01em; }
h2 { font-size: 1.35rem; font-weight: 650; }
h3 { font-size: 1.1rem; font-weight: 650; }
p { margin: 0; }
a { color: var(--accent); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.eyebrow { font: 600 0.75rem/1.2 var(--f-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }
.muted { color: var(--ink-2); }
.small { font-size: 0.875rem; }
.mono { font-family: var(--f-mono); font-size: 0.82rem; }
.num { font-variant-numeric: tabular-nums; }

.masthead { display: grid; gap: 10px; }
.masthead .site { font-family: var(--f-mono); font-size: 0.95rem; color: var(--ink-2); word-break: break-all; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 0.875rem; color: var(--ink-2); }

.summary {
  background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px;
  display: grid; grid-template-columns: minmax(0, 220px) minmax(0, 1fr); gap: 0;
  overflow: hidden;
}
.scorebox { padding: 24px; border-right: 1px solid var(--rule); display: grid; gap: 6px; align-content: start; }
.score { font: 700 4.2rem/1 var(--f-display); font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
.score small { font-size: 1.1rem; color: var(--ink-3); font-weight: 500; }
.grade { display: inline-block; font-weight: 600; font-size: 0.85rem; padding: 3px 10px; border-radius: 999px; justify-self: start; }
.tone-goed { color: var(--good); background: var(--good-bg); }
.tone-matig { color: var(--sev-matig); background: var(--sev-matig-bg); }
.tone-ernstig { color: var(--sev-ernstig); background: var(--sev-ernstig-bg); }
.tone-kritiek { color: var(--sev-kritiek); background: var(--sev-kritiek-bg); }
.sumright { padding: 24px; display: grid; gap: 16px; align-content: start; min-width: 0; }
.sevrow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.sev { border-radius: 10px; padding: 10px 12px; display: grid; gap: 2px; }
.sev b { font: 700 1.5rem/1.1 var(--f-display); font-variant-numeric: tabular-nums; }
.sev span { font-size: 0.8rem; font-weight: 600; }
.sev-kritiek { color: var(--sev-kritiek); background: var(--sev-kritiek-bg); }
.sev-ernstig { color: var(--sev-ernstig); background: var(--sev-ernstig-bg); }
.sev-matig { color: var(--sev-matig); background: var(--sev-matig-bg); }
.sev-klein { color: var(--sev-klein); background: var(--sev-klein-bg); }
.note { font-size: 0.875rem; color: var(--ink-2); border-left: 3px solid var(--accent); border-radius: 0; padding-left: 12px; }

.shot { border: 1px solid var(--rule); border-radius: 10px; width: 100%; max-width: 100%; max-height: 340px; object-fit: cover; object-position: top; display: block; }

.section { display: grid; gap: 14px; }
.toplist { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; counter-reset: top; }
.toplist li { counter-increment: top; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; padding: 10px 14px; background: var(--sheet); border: 1px solid var(--rule); border-radius: 10px; }
.toplist li::before { content: counter(top); font: 700 0.95rem var(--f-display); color: var(--accent); }
.toplist a { color: var(--ink); text-decoration: none; font-weight: 600; }
.toplist a:hover { text-decoration: underline; }

.issue { background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 22px; display: grid; gap: 14px; scroll-margin-top: 16px; }
.issue header { display: grid; gap: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 0.78rem; font-weight: 600; padding: 2px 9px; border-radius: 999px; border: 1px solid var(--rule); color: var(--ink-2); background: var(--sheet); }
.chip.wcag { font-family: var(--f-mono); color: var(--accent); background: var(--accent-soft); border-color: transparent; }
.chip.sev-kritiek { color: var(--sev-kritiek); background: var(--sev-kritiek-bg); border-color: transparent; }
.chip.sev-ernstig { color: var(--sev-ernstig); background: var(--sev-ernstig-bg); border-color: transparent; }
.chip.sev-matig { color: var(--sev-matig); background: var(--sev-matig-bg); border-color: transparent; }
.chip.sev-klein { color: var(--sev-klein); background: var(--sev-klein-bg); border-color: transparent; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
.cols > div { display: grid; gap: 6px; align-content: start; min-width: 0; }
.tip { background: var(--accent-soft); border-radius: 10px; padding: 12px 14px; font-size: 0.92rem; display: grid; gap: 4px; }
.tip b { font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); }
pre { margin: 0; background: var(--code-bg); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font: 0.82rem/1.55 var(--f-mono); color: var(--ink); white-space: pre; }
details { border-top: 1px solid var(--rule); padding-top: 10px; }
summary { cursor: pointer; font-weight: 600; font-size: 0.92rem; }
.tablewrap { overflow-x: auto; margin-top: 10px; }
table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
td code { font-family: var(--f-mono); font-size: 0.78rem; word-break: break-all; }
.swatch { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.swatch i { width: 34px; height: 22px; border-radius: 5px; border: 1px solid var(--rule); display: inline-grid; place-items: center; font: 700 0.72rem var(--f-body); font-style: normal; }

.limits { background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 22px; display: grid; gap: 10px; }
.limits ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
footer.foot { font-size: 0.82rem; color: var(--ink-3); display: grid; gap: 6px; }

@media (max-width: 680px) {
  .summary { grid-template-columns: minmax(0, 1fr); }
  .scorebox { border-right: 0; border-bottom: 1px solid var(--rule); }
  .sevrow { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cols { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
@media print { body { background: #fff; } .issue, .summary, .limits { break-inside: avoid; } }
`;
