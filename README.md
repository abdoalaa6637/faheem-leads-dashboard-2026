# Faheem leads dashboard — sheet mode

ClickHouse --(Hightouch, one model)--> Google Sheet tab `data` --(this project)--> Vercel page.

## Files
- `api/data.js` reads the tab `data` (A..AE) with a service account, checks it, gzips it, caches 10 min.
- `lib/sheet.js` Google auth (JWT, no npm packages) + chunked read. `lib/transform.js` rows -> columnar payload + health checks.
- `index.html` the page (built from `src/app1.js`, `src/app2.js` and the mockup CSS with `python3 build.py`).
- `test/` synthetic-data tests (`node test/api.test.js`, `node test/ui.test.js`). Synthetic only: they prove the logic, not the real sheet.

## Deploy
1. Vercel > New Project > import this folder (no build command, no framework).
2. Environment variables (Production):
   - `GOOGLE_SA_EMAIL` the service account email.
   - `GOOGLE_SA_PRIVATE_KEY` the private key from the JSON (keep the `\n` as they are).
   - `SHEET_ID` the id in the sheet URL.
   - `SHEET_TAB` optional, default `data`.
3. Share the sheet with `GOOGLE_SA_EMAIL` as Viewer. Enable "Google Sheets API" in that Google Cloud project.
4. Vercel > Settings > Deployment Protection: Vercel Authentication ON (the sales page shows agent names). Open the production URL in a private window to confirm.
5. Redeploy after adding the variables.

## First checks (in this order)
1. `/api/data?diag=1` -> every env var `true`.
2. `/api/data?probe=1` -> `header` starts with `pk, g, k1...`. Look at `sample[*][2].type`: `string` (dates kept as text) or `number` (Sheets turned dates into serial numbers). Both are handled; a `number` is fine.
3. `/api/data` -> JSON, `warnings` empty. The page also lists warnings under "التعريفات وصحة الداتا".
4. Reconcile with ClickHouse at the same as-of time: leads, paid and revenue on the overview page = the independent check query in `references/sheets-mode.md`.

## Known limits
- Weekly/monthly grains snap the date filter to the week/month start.
- Status and tag filters only apply to pages built on `core`.
- Agent medians are a weighted average of weekly medians (approximate).
- Not built yet: Sankey, agent drill-down, CSV export of follow-up lists, mobile layout polish.
