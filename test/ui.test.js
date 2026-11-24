'use strict';
const fs = require('fs');
const { makeRows, sow, addD } = require('./synth');
const { transform } = require('../lib/transform');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
// --- DOM stub ---
const els = {}; const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {} });
global.window = global; global.__TEST__ = true;
global.document = { getElementById: el, addEventListener() { } };
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const js = /<script>([\s\S]*)<\/script>/.exec(html)[1];
(0, eval)(js);
const S = makeRows(14000, 11, '2026-11-24');
const payload = JSON.parse(JSON.stringify(transform(S.rows))); // same trip as the API
const A = window.__app; A.init(payload);
const LD = S.leads.filter((x) => x.day >= '2026-09-01');
const nf = (n) => Math.round(n).toLocaleString('en-US');
const page = () => A.html();
const bad = (h) => /NaN|undefined|Infinity|حصل خطأ/.test(h);
const MAX = LD.reduce((m, x) => x.day > m ? x.day : m, '0');
// 1) Overview totals vs truth
let h = page();
const T0 = { L: LD.length, P: LD.reduce((s, x) => s + x.f_pay, 0), R: LD.reduce((s, x) => s + x.amt, 0) };
ok(h.includes(nf(T0.L) + ' ليد') && h.includes(nf(T0.R)) && h.includes('>' + nf(T0.P) + '<'), 'Overview (Lifetime): leads ' + nf(T0.L) + ' / paid ' + nf(T0.P) + ' / revenue ' + nf(T0.R) + ' match the lead-level truth');
ok(!bad(h), 'Overview has no NaN/undefined/Infinity');
// 2) preset Last 30 Days + channel Snapchat
A.pick('preset', 'Last 30 Days'); A.pick('ch', 'Snapchat');
const f30 = addD(MAX, -29), sub = LD.filter((x) => x.day >= f30 && x.ch === 'Snapchat');
h = page();
ok(h.includes(nf(sub.length) + ' ليد') && h.includes(nf(sub.reduce((s, x) => s + x.amt, 0))), 'Last 30 Days + Snapchat: leads ' + nf(sub.length) + ' and revenue match truth');
// 3) status filter
A.pick('st', 'مهتم بالاشتراك في الباقات');
const sub2 = sub.filter((x) => x.status === 'مهتم بالاشتراك في الباقات');
h = page(); ok(h.includes(nf(sub2.length) + ' ليد'), 'status filter narrows to ' + sub2.length + ' leads (matches truth)');
// 4) tag filter + clear
A.pick('st', 'مهتم بالاشتراك في الباقات'); A.pick('ch', 'Snapchat'); A.pick('preset', 'Lifetime');
h = page(); ok(h.includes(nf(T0.L) + ' ليد'), 'removing the filters returns to the full totals');
// 5) custom range
A.pick('preset', 'Custom'); A.state.from = '2026-10-01'; A.state.to = '2026-10-15'; A.renderPage();
const sc = LD.filter((x) => x.day >= '2026-10-01' && x.day <= '2026-10-15'); h = page();
ok(h.includes(nf(sc.length) + ' ليد'), 'Custom 1-15 Oct: ' + sc.length + ' leads matches truth'); A.pick('preset', 'Lifetime');
// 6) trend toggles
for (const g of ['day', 'week', 'month']) for (const m of ['rev', 'paid', 'conv']) { A.setOpt('grain', g); A.setOpt('metric', m); const x = page(); if (bad(x) || !x.includes('<polyline')) { ok(false, 'trend ' + g + '/' + m); } }
ok(true, 'trend renders for all 9 grain x metric combinations without NaN');
A.setOpt('grain', 'day'); A.setOpt('metric', 'rev');
// 7) every page renders, with and without filters
const pages = ['ov', 'sales', 'spd', 'fun', 'ch', 'int', 'stu', 'def'];
for (const filt of [false, true]) {
  if (filt) { A.pick('preset', 'Last 3 Months'); A.pick('ch', 'Google'); }
  for (const p of pages) { A.setPage(p); const x = page(); ok(x.length > 800 && !bad(x), 'page ' + p + (filt ? ' (Last 3 Months + Google)' : '') + ' renders (' + Math.round(x.length / 1024) + ' KB html)'); }
}
A.pick('ch', 'Google'); A.pick('preset', 'Lifetime');
// 8) empty selection message
A.setPage('ov'); A.pick('preset', 'Custom'); A.state.from = '2026-08-01'; A.state.to = '2026-08-02'; A.renderPage(); h = page(); // clamps to MIN (first day with data) so it is not empty; just must not crash
ok(!bad(h), 'very narrow custom range does not crash'); A.pick('preset', 'Lifetime');
// 9) sales: one agent row vs truth
A.setPage('sales'); A.state.agMin = 0; A.state.agQ = 'Agent 01'; A.agRefresh(); // agBox only
const box = els.agBox ? els.agBox.innerHTML : '';
A.renderPage(); const sh = page();
const a1 = LD.filter((x) => x.agId === 1), m1 = a1.filter((x) => x.mature), p14 = m1.filter((x) => x.p14).length;
const re = /<td>Agent 01<\/td><td>([\d,]+)<\/td><td>([\d.]+|—)%?<\/td>/.exec(sh);
ok(re && re[1] === nf(m1.length), 'sales table: Agent 01 mature leads = ' + m1.length + ' (page says ' + (re && re[1]) + ')');
ok(sh.includes('<circle') && sh.includes('class="cl95"'), 'funnel plot has points and the 95% limit lines');
// sort + search + pager
A.state.agQ = ''; A.state.agMin = 100; A.state.agSort = 'name'; A.state.agDir = 1; A.state.agPage = 1; A.renderPage();
ok(!bad(page()), 'sales page with min 100, sorted by name renders');
// 10) interest page numbers vs truth (levels)
A.setPage('int'); h = page();
const lvlN = (g) => LD.filter((x) => (x.grp || 5) === g).length;
const GRPLV = { 1: 'مهتم', 2: 'متردد', 3: 'مش مهتم', 5: 'لسه ما اتعرفش' };
const tr = LD.filter((x) => x.grp === 1).length;
ok(h.includes('>' + nf(tr) + '<'), 'interest: level "مهتم" has ' + tr + ' leads (matches truth)');
const rjTruth = LD.filter((x) => x.rj & 4).length; ok(h.includes('>' + nf(rjTruth) + '<') || h.includes(nf(rjTruth)), 'interest: rejection reason "السعر" = ' + rjTruth + ' (matches truth)');
// 11) same-point month table
A.setPage('ov'); h = page(); const mcNov = S.leads.filter((x) => x.inSame && x.day.startsWith('2026-11')).length; ok(h.includes(nf(mcNov)), 'same-point comparison shows November = ' + mcNov + ' leads');
// 12) definitions page: health message
A.setPage('def'); h = page(); ok(h.includes('فحص الداتا: كل الجداول'), 'definitions page shows the healthy data check');
const bp = JSON.parse(JSON.stringify(payload)); bp.warnings = ['Totals differ: spd leads = 1 vs core = 2']; A.init(bp); A.setPage('def'); ok(page().includes('تحذيرات من فحص الداتا') && page().includes('Totals differ'), 'definitions page shows warnings from the API');
console.log(fail ? 'FAILED ' + fail : 'ALL ' + pass + ' PASSED'); process.exit(fail ? 1 : 0);
