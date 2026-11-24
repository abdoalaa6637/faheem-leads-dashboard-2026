'use strict';
const crypto = require('crypto'), zlib = require('zlib');
const { makeRows } = require('./synth');
const handler = require('../api/data.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.GOOGLE_SA_EMAIL = 'dash@proj.iam.gserviceaccount.com';
process.env.GOOGLE_SA_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'); // like Vercel stores it
process.env.SHEET_ID = 'SHEET123';
const S = makeRows(12000, 7, '2026-11-24');
// variant: Sheets turned ISO dates into serial numbers
const serial = (s) => Math.round(Date.parse(s + 'T00:00:00Z') / 864e5) + 25569;
const asSerials = S.rows.map((r, i) => { if (i === 0) return r; const q = r.slice(); if (/^\d{4}-\d{2}-\d{2}$/.test(q[2])) q[2] = serial(q[2]); return q; });
let mode = 'ok', calls = [], useRows = S.rows, tabTitle = 'data', gridOverride = 0;
function fakeFetch(url, opt) {
  calls.push(String(url));
  if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
    const jwt = new URLSearchParams(opt.body).get('assertion').split('.');
    const v = crypto.createVerify('RSA-SHA256').update(jwt[0] + '.' + jwt[1]).verify(publicKey, Buffer.from(jwt[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    fakeFetch.jwtOk = v; fakeFetch.claim = JSON.parse(Buffer.from(jwt[1], 'base64').toString());
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) });
  }
  if (mode === 'down') return Promise.resolve({ ok: false, status: 503, json: async () => ({ error: { message: 'backend error' } }) });
  if (mode === '403') return Promise.resolve({ ok: false, status: 403, json: async () => ({ error: { message: 'The caller does not have permission' } }) });
  const u = new URL(url);
  const gridRows = gridOverride || useRows.length, gridCols = 31;
  if (u.pathname.endsWith('/SHEET123') && u.searchParams.get('fields')) {            // spreadsheet metadata
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ sheets: [{ properties: { title: tabTitle, gridProperties: { rowCount: gridRows, columnCount: gridCols } } }] }) });
  }
  if (u.pathname.endsWith('values:batchGet')) {
    const rs = u.searchParams.getAll('ranges');
    for (const rg of rs) {                                                          // real API: a range starting beyond the grid is a 400
      const m = /!A(\d+):/.exec(decodeURIComponent(rg)); if (m && +m[1] > gridRows) return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: { message: 'Range (' + tabTitle + '!' + decodeURIComponent(rg).split('!')[1] + ') exceeds grid limits. Max rows: ' + gridRows + ', max columns: ' + gridCols } }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ valueRanges: rs.map((rg) => { const m = /!A(\d+):[A-Z]+(\d+)/.exec(decodeURIComponent(rg)); const a = +m[1] - 1, b = +m[2]; const v = useRows.slice(a, b); return v.length ? { range: rg, values: v } : { range: rg }; }) }) });
  }
  return Promise.resolve({ ok: true, status: 200, json: async () => ({ values: useRows.slice(0, 6) }) });
}
handler._test.setFetch(fakeFetch);
function call(path) {
  return new Promise((resolve) => {
    const res = { headers: {}, chunks: [], statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, write(c) { this.chunks.push(Buffer.from(c)); }, end(b) { if (b) this.chunks.push(Buffer.from(b)); resolve(this); } };
    handler({ url: path }, res);
  });
}
const body = (r) => { const b = Buffer.concat(r.chunks); return r.headers['Content-Encoding'] === 'gzip' ? JSON.parse(zlib.gunzipSync(b)) : JSON.parse(b); };
(async () => {
  let r = await call('/api/data?diag=1'); ok(r.statusCode === 200 && body(r).env.SHEET_ID === true && !JSON.stringify(body(r)).includes('PRIVATE KEY'), 'diag reports env presence and never prints the key');
  let r1 = await call('/api/data'); const p = body(r1);
  ok(r1.statusCode === 200 && r1.headers['Content-Encoding'] === 'gzip' && /private/.test(r1.headers['Cache-Control']), 'data is gzip + private');
  ok(fakeFetch.jwtOk === true && fakeFetch.claim.iss === process.env.GOOGLE_SA_EMAIL && /readonly/.test(fakeFetch.claim.scope), 'JWT signed with the (\\n-escaped) env key and read-only scope');
  ok(calls.filter((c) => c.includes('batchGet')).length === 1 && decodeURIComponent(calls.find((c) => c.includes('batchGet'))).includes("'data'!A1:AE19949"), 'one batchGet call, tab data, range clamped to the real grid (A1:AE19949)');
  ok(p.row_count === S.rows.length - 1 && Object.keys(p.groups).length === 17, 'row_count ' + p.row_count + ' and all 17 groups present');
  ok(p.warnings.length === 0, 'no warnings on consistent data: ' + JSON.stringify(p.warnings));
  const core = p.groups.core; const mIdx = (g, i) => g.m[g.mi.indexOf(i)];
  const leads = mIdx(core, 1).reduce((a, b) => a + b, 0), paid = mIdx(core, 7).reduce((a, b) => a + b, 0), rev = mIdx(core, 8).reduce((a, b) => a + b, 0);
  const LD = S.leads.filter((x) => x.day >= '2026-09-01');
  ok(leads === LD.length && paid === LD.reduce((s, x) => s + x.f_pay, 0) && Math.abs(rev - LD.reduce((s, x) => s + x.amt, 0)) < 1e-6, 'core totals equal the lead-level truth: ' + leads + ' leads / ' + paid + ' paid / ' + rev + ' SAR');
  ok(p.as_of === '2026-11-24 20:34:54' && p.d1 === '2026-09-01', 'as_of and window read from the meta row');
  calls = []; await call('/api/data'); ok(calls.length === 0, 'second request served from cache');
  // dates as serials
  handler._test.reset(); useRows = asSerials; const rs = await call('/api/data?refresh=1'); const ps = body(rs);
  const dk = ps.groups.core.kd[0]; ok(/^\d{4}-\d{2}-\d{2}$/.test(dk.d[0]) && ps.warnings.length === 0, 'date serials are converted back to ISO days (' + dk.d[0] + ')');
  useRows = S.rows;
  // stale fallback
  handler._test.reset(); await call('/api/data?refresh=1'); mode = 'down'; const st = await call('/api/data?refresh=1');
  ok(st.statusCode === 200 && st.headers['X-Data-Stale'] === '1', 'sheet down -> last good copy + X-Data-Stale');
  handler._test.reset(); const cold = await call('/api/data?refresh=1'); ok(cold.statusCode === 502 && /503/.test(body(cold).error), 'sheet down with no cache -> readable 502');
  mode = '403'; const f3 = await call('/api/data?refresh=1'); ok(f3.statusCode === 502 && /share the sheet with dash@proj/.test(body(f3).error), '403 -> tells to share the sheet with the service account');
  mode = 'ok';
  // partial read warning: drop half of core rows
  handler._test.reset(); useRows = S.rows.filter((r, i) => i === 0 || !(r[1] === 'core' && i % 2 === 0)); const pw = body(await call('/api/data?refresh=1'));
  ok(pw.warnings.some((w) => /Totals differ/.test(w)), 'inconsistent grains raise a "Totals differ" warning'); useRows = S.rows;
  // duplicates
  handler._test.reset(); useRows = S.rows.concat([S.rows[5]]); const pd = body(await call('/api/data?refresh=1')); ok(pd.warnings.some((w) => /duplicate pk/.test(w)), 'duplicate pk raises a warning'); useRows = S.rows;
  // the user's real case: grid 52,437 rows (more than 2 chunks), data fills only part of it
  handler._test.reset(); gridOverride = 52437; calls = []; const big = await call('/api/data?refresh=1');
  const bq = decodeURIComponent(calls.find((c) => c.includes('batchGet')));
  ok(big.statusCode === 200 && /A40001:AE52437/.test(bq) && !/A60001/.test(bq), 'grid of 52,437 rows: last range is A40001:AE52437, nothing beyond the grid (was the 400 error)');
  ok(body(big).row_count === S.rows.length - 1 && body(big).warnings.length === 0, 'all rows read, no warnings, with the larger grid'); gridOverride = 0;
  // wrong tab name -> lists the real tabs
  handler._test.reset(); tabTitle = 'Sheet1'; const wt = await call('/api/data?refresh=1');
  ok(wt.statusCode === 502 && /Tab "data" not found/.test(body(wt).error) && /"Sheet1"/.test(body(wt).error), 'wrong tab name -> clear message that lists the sheet\'s real tabs'); tabTitle = 'data';
  // missing env
  const save = process.env.SHEET_ID; delete process.env.SHEET_ID; const me = await call('/api/data'); ok(me.statusCode === 500 && /SHEET_ID/.test(body(me).error), 'missing env -> clear 500'); process.env.SHEET_ID = save;
  const pr = await call('/api/data?probe=1'); ok(pr.statusCode === 200 && body(pr).header[0] === 'pk' && body(pr).sample[0][2].type === 'string', 'probe shows header + raw cell types');
  const size = zlib.gzipSync(JSON.stringify(p)).length; console.log('payload gzip KB (synthetic, ' + p.row_count + ' rows):', (size / 1024).toFixed(0), '| raw KB:', (JSON.stringify(p).length / 1024).toFixed(0));
  console.log(fail ? 'FAILED ' + fail : 'ALL ' + pass + ' PASSED'); process.exit(fail ? 1 : 0);
})();
