'use strict';
const fs = require('fs'); const { makeRows } = require('./synth'); const { transform } = require('../lib/transform');
const els = {}; const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {} });
global.window = global; global.__TEST__ = true; global.document = { getElementById: el, addEventListener() { } };
(0, eval)(/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(__dirname + '/../index.html', 'utf8'))[1]);
const S = makeRows(14000, 11, '2026-11-24'); const A = window.__app; A.init(JSON.parse(JSON.stringify(transform(S.rows))));
const css = '.gl{stroke:#E6E6E6;stroke-dasharray:3 3}.ax{font-size:10.5px;fill:#8a8a8a}.ax2{font-size:9.5px;fill:#b0b0b0}.ax.bl{fill:#2563eb}.axt{font-size:11px;fill:#555}.vt{font-size:10.5px;fill:#333;font-weight:700}.bar{fill:#2563eb;opacity:.28}.cl95{fill:none;stroke:#8a8a8a;stroke-width:1.2;stroke-dasharray:5 4}.cl99{fill:none;stroke:#C0C0C0;stroke-width:1.1;stroke-dasharray:2 3}';
const out = {};
for (const [pg, n, name] of [['ov', 0, 'trend'], ['sales', 0, 'fplot'], ['int', 0, 'bars']]) {
  A.setPage(pg); const svgs = A.html().match(/<svg viewBox[\s\S]*?<\/svg>/g); const svg = svgs[n].replace('class="svgc"', 'xmlns="http://www.w3.org/2000/svg" width="1000"').replace('>', '><rect width="100%" height="100%" fill="white"/><style>' + css + '</style>');
  fs.writeFileSync('/mnt/data/dash-sheet/_' + name + '.svg', svg);
}
