'use strict';
const fs = require('fs'), zlib = require('zlib'); const { makeRows } = require('./synth'); const { transform } = require('../lib/transform');
const els = {}; const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {} });
global.window = global; global.__TEST__ = true; global.document = { getElementById: el, addEventListener() { } };
(0, eval)(/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(__dirname + '/../index.html', 'utf8'))[1]);
let t = Date.now(); const S = makeRows(70000, 5, '2026-11-24'); console.log('synthetic rows', S.rows.length - 1, '(real sheet expected about 52,000)', 'gen ms', Date.now() - t);
t = Date.now(); const p = transform(S.rows); const tf = Date.now() - t; const raw = Buffer.from(JSON.stringify(p)); const gz = zlib.gzipSync(raw, { level: 6 });
console.log('transform ms', tf, '| raw MB', (raw.length / 1048576).toFixed(2), '| gzip MB', (gz.length / 1048576).toFixed(2), '| warnings', p.warnings.length);
t = Date.now(); const A = window.__app; A.init(JSON.parse(raw)); console.log('browser decode+first render ms', Date.now() - t);
for (const pg of ['ov', 'sales', 'spd', 'fun', 'ch', 'int', 'stu', 'def']) { t = Date.now(); A.setPage(pg); console.log(pg.padEnd(6), 'render ms', Date.now() - t); }
A.setPage('ov'); t = Date.now(); A.pick('ch', 'Snapchat'); console.log('filter change (overview) ms', Date.now() - t);
