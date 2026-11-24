'use strict';
const zlib = require('zlib');
const { readSheet, probeSheet, tabName } = require('../lib/sheet');
const { transform } = require('../lib/transform');

const CACHE_MS = 10 * 60 * 1000;
const REQUIRED = ['GOOGLE_SA_EMAIL', 'GOOGLE_SA_PRIVATE_KEY', 'SHEET_ID'];
let cache = null;      // { at, gz, rows, asOf, warnings }
let inflight = null;
let fetchImpl = (...a) => fetch(...a);

async function build() {
  const t0 = Date.now();
  const { rows, truncated } = await readSheet(process.env, (...a) => fetchImpl(...a));
  const readMs = Date.now() - t0;
  const payload = transform(rows);
  if (truncated) payload.warnings.push('The tab has 160,000+ rows: only the first 160,000 were read.');
  payload.read_ms = readMs;
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload)), { level: 6 });
  return { at: Date.now(), gz, rows: payload.row_count, asOf: payload.as_of, warnings: payload.warnings, readMs };
}
async function getData(force) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return { c: cache, stale: false };
  if (!inflight) inflight = build().finally(() => { inflight = null; });
  try { cache = await inflight; return { c: cache, stale: false }; }
  catch (e) {
    console.error('[api/data] failed:', e.message);
    if (cache) return { c: cache, stale: true, err: e.message };
    throw e;
  }
}
function json(res, code, obj) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (url.searchParams.get('diag')) {
    return json(res, 200, { env: Object.fromEntries(REQUIRED.map((k) => [k, !!process.env[k]])), tab: tabName(process.env), cache: cache ? { ageSec: Math.round((Date.now() - cache.at) / 1000), rows: cache.rows, asOf: cache.asOf, bytesGzip: cache.gz.length, warnings: cache.warnings } : null });
  }
  if (missing.length) return json(res, 500, { error: 'Missing environment variables: ' + missing.join(', ') + '. Add them in Vercel > Settings > Environment Variables and redeploy.', missing });
  if (url.searchParams.get('probe')) {
    try {
      const v = await probeSheet(process.env, (...a) => fetchImpl(...a));
      return json(res, 200, { header: v[0] || null, sample: v.slice(1).map((r) => r.slice(0, 8).map((x) => ({ v: x, type: typeof x }))) });
    } catch (e) { return json(res, 502, { error: e.message }); }
  }
  try {
    const { c, stale, err } = await getData(!!url.searchParams.get('refresh'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Cache-Control', 'private, no-cache');
    if (stale) { res.setHeader('X-Data-Stale', '1'); res.setHeader('X-Data-Error', String(err).slice(0, 200).replace(/[^\x20-\x7e]/g, '')); }
    if (c.gz.length > 4 * 1024 * 1024) { for (let i = 0; i < c.gz.length; i += 65536) res.write(c.gz.subarray(i, i + 65536)); res.end(); }
    else { res.setHeader('Content-Length', c.gz.length); res.end(c.gz); }
  } catch (e) { return json(res, 502, { error: e.message }); }
};
module.exports._test = { setFetch: (f) => { fetchImpl = f; }, reset: () => { cache = null; inflight = null; } };
