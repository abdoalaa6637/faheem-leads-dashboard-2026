'use strict';
// Rows of the `data` tab (A..AE: pk, g, k1..k4, m1..m25) -> columnar payload grouped by `g`.
const NM = 25;
// key kinds: d = date (YYYY-MM-DD), t = timestamp, ym = YYYY-MM, s = plain text
const SPEC = {
  core: ['d', 's', 's', 's'], spd: ['d', 's', 's'], hr: ['d', 's'], path: ['d', 's', 's'], gap: ['d', 's', 's', 's'],
  grade: ['d', 's', 's', 's'], fail: ['d', 's', 's', 's'], plat: ['d', 's', 's'], coh: ['d', 's'], tm: ['d', 's', 's'],
  ag: ['d', 's', 's'], mc: ['d', 's'], rj: ['d', 's', 's'], rl: ['d', 's', 's'], sj: ['d', 's', 's'],
  meta: ['t', 'd', 'd'], pkg: ['ym'],
};
const SAME_TOTAL = ['core', 'spd', 'hr', 'path', 'grade', 'plat', 'coh', 'ag']; // must all sum to the same leads/paid/revenue

// Google Sheets may turn "2026-09-01" into a date serial (UNFORMATTED_VALUE). Accept both.
const fromSerial = (v) => new Date(Math.round((v - 25569) * 86400000));
function conv(kind, v) {
  if (v === null || v === undefined || v === '') return '';
  const num = typeof v === 'number';
  if (kind === 'd') return num ? fromSerial(v).toISOString().slice(0, 10) : String(v).slice(0, 10);
  if (kind === 't') return num ? fromSerial(v).toISOString().slice(0, 19).replace('T', ' ') : String(v).slice(0, 19);
  if (kind === 'ym') return num ? fromSerial(v).toISOString().slice(0, 7) : String(v).slice(0, 7);
  return String(v);
}

function transform(rows) {
  const warnings = [];
  let start = 0;
  if (rows.length && String(rows[0][0]).toLowerCase() === 'pk' && String(rows[0][1]).toLowerCase() === 'g') start = 1;
  else warnings.push('Row 1 is not the header (pk, g, k1..k4, m1..m25). Check the sync column mapping.');
  const acc = {}; const seen = new Set(); let dup = 0, unknown = 0, rowCount = 0;
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.length) continue;
    const g = String(r[1] == null ? '' : r[1]);
    const spec = SPEC[g];
    if (!spec) { if (g) unknown++; continue; }
    const pk = String(r[0]);
    if (seen.has(pk)) dup++; else seen.add(pk);
    let a = acc[g];
    if (!a) a = acc[g] = { n: 0, k: [[], [], [], []], m: Array.from({ length: NM }, () => []), has: new Array(NM).fill(false) };
    for (let j = 0; j < 4; j++) a.k[j].push(j < spec.length ? conv(spec[j], r[2 + j]) : (r[2 + j] == null ? '' : String(r[2 + j])));
    for (let j = 0; j < NM; j++) {
      const v = r[6 + j];
      if (v === undefined || v === null || v === '') { a.m[j].push(null); continue; }
      const x = Number(v);
      if (Number.isFinite(x)) { a.m[j].push(x); a.has[j] = true; } else a.m[j].push(null);
    }
    a.n++; rowCount++;
  }
  if (dup) warnings.push(dup + ' duplicate pk value(s): the tab has repeated rows, so totals may be inflated.');
  if (unknown) warnings.push(unknown + ' row(s) with an unknown group in column B were ignored.');
  const groups = {};
  for (const g of Object.keys(SPEC)) {
    const a = acc[g];
    if (!a) { warnings.push('Group "' + g + '" has no rows.'); continue; }
    const kd = a.k.map((col) => {
      if (!col.some((x) => x !== '')) return null;
      const ids = new Map(), d = [], v = new Array(col.length);
      for (let i = 0; i < col.length; i++) { let id = ids.get(col[i]); if (id === undefined) { id = d.length; ids.set(col[i], id); d.push(col[i]); } v[i] = id; }
      return { d, v };
    });
    const mi = [], m = [];
    for (let j = 0; j < NM; j++) if (a.has[j]) { mi.push(j + 1); m.push(a.m[j]); }
    groups[g] = { n: a.n, kd, mi, m };
  }
  // health: every grain that covers all leads must give the same totals as `core`
  const tot = (g, idx) => { const x = acc[g]; return x ? x.m[idx - 1].reduce((s, v) => s + (v || 0), 0) : null; };
  for (const [idx, nm] of [[1, 'leads'], [7, 'paid'], [8, 'revenue']]) {
    const base = tot('core', idx);
    if (base === null) continue;
    for (const g of SAME_TOTAL) {
      const t = tot(g, idx);
      if (t === null || g === 'core') continue;
      if (Math.abs(t - base) > Math.max(1e-6 * Math.abs(base), 0.5)) warnings.push('Totals differ: ' + g + ' ' + nm + ' = ' + t + ' vs core = ' + base + ' (partial read or stale sync?).');
    }
  }
  const meta = acc.meta;
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    as_of: meta ? meta.k[0][0] : '',
    d0: meta ? meta.k[1][0] : '', d1: meta ? meta.k[2][0] : '',
    row_count: rowCount, groups, warnings,
  };
}
module.exports = { transform, conv, NM, SPEC };
