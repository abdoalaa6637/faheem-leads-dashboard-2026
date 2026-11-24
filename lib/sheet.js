'use strict';
const crypto = require('crypto');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHUNK = 20000, MAX_CHUNKS = 8, LAST_COL = 'AE';

const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function privateKey(env) {
  let k = env.GOOGLE_SA_PRIVATE_KEY || '';
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\n/g, '\n');
}
let tokenCache = null;
async function getToken(env, f) {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: env.GOOGLE_SA_EMAIL, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(privateKey(env));
  const jwt = head + '.' + claim + '.' + b64u(sig);
  const r = await f(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('Google auth failed: ' + (j.error_description || j.error || r.status));
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}
const tabName = (env) => env.SHEET_TAB || 'data';
const quoted = (t) => "'" + t.replace(/'/g, "''") + "'";

async function sheetGet(env, f, path) {
  const token = await getToken(env, f);
  const r = await f('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(env.SHEET_ID) + path, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
    if (r.status === 403) throw new Error('Sheets API 403: share the sheet with ' + env.GOOGLE_SA_EMAIL + ' (Viewer) and enable the Google Sheets API. ' + msg);
    if (r.status === 404) throw new Error('Sheets API 404: wrong SHEET_ID. ' + msg);
    throw new Error('Sheets API ' + r.status + ': ' + msg);
  }
  return j;
}
const vopts = '&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';

// Real size of the tab (Google rejects any range that starts beyond the grid, so we must not guess).
async function tabGrid(env, f) {
  const j = await sheetGet(env, f, '?fields=' + encodeURIComponent('sheets.properties(title,gridProperties(rowCount,columnCount))'));
  const tabs = (j.sheets || []).map((x) => x.properties);
  const t = tabs.find((x) => x.title === tabName(env));
  if (!t) throw new Error('Tab "' + tabName(env) + '" not found. Tabs in this sheet: ' + (tabs.map((x) => '"' + x.title + '"').join(', ') || '(none)') + '. Rename the tab or set SHEET_TAB.');
  return t.gridProperties;
}
const colLetter = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// Whole tab, in row chunks clamped to the real grid.
async function readSheet(env, f) {
  const g = await tabGrid(env, f);
  const cols = Math.min(g.columnCount || 31, 31), last = colLetter(cols);
  if (cols < 31) throw new Error('Tab "' + tabName(env) + '" has only ' + g.columnCount + ' columns, expected 31 (pk, g, k1..k4, m1..m25). Check the Hightouch column mapping.');
  const rows = Math.min(g.rowCount || 0, CHUNK * MAX_CHUNKS);
  const t = quoted(tabName(env)), ranges = [];
  for (let r = 1; r <= rows; r += CHUNK) ranges.push(encodeURIComponent(t + '!A' + r + ':' + last + Math.min(r + CHUNK - 1, rows)));
  if (!ranges.length) return { rows: [], truncated: false };
  const j = await sheetGet(env, f, '/values:batchGet?' + ranges.map((r) => 'ranges=' + r).join('&') + vopts);
  const out = [];
  for (const x of j.valueRanges || []) if (x.values) for (const row of x.values) out.push(row);
  return { rows: out, truncated: (g.rowCount || 0) > CHUNK * MAX_CHUNKS };
}
// First rows only, for ?probe=1 (shows raw cell types so date handling can be checked).
async function probeSheet(env, f) {
  const j = await sheetGet(env, f, '/values/' + encodeURIComponent(quoted(tabName(env)) + '!A1:' + LAST_COL + '6') + '?' + vopts.slice(1));
  return j.values || [];
}
module.exports = { readSheet, probeSheet, getToken, tabName };
