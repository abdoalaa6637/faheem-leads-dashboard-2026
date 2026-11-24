'use strict';
// SYNTHETIC data (not real): lead-level rows aggregated to the same 17 grains as the Hightouch query.
// Used only to test the API + the page against known totals.
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const iso = (d) => d.toISOString().slice(0, 10);
const addD = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const sow = (s) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return iso(d); };
const som = (s) => s.slice(0, 8) + '01';
const CH = [['Snapchat', 22], ['TikTok', 15], ['Google', 18], ['Google Max', 8], ['Facebook', 3], ['Influencer', 2], ['iOS', 12], ['Android', 7], ['Organic', 9], ['WhatsApp', 3], ['Other', 1]];
const ST = [['(بدون تواصل)', 2], ['ما رد', 40], ['سكر في وجهي', 4], ['مهتم بالاشتراك في الباقات', 8], ['مازال بيفكر', 9], ['رد', 3], ['غير مهتم او رافض', 14], ['غير محتاج حاليا', 6], ['الرقم خطأ او غير صحيح', 1.5], ['معلم سجل بالخطأ كطالب', 1], ['طالب جمعية او جهة', 0.7]];
const TG = [['(بدون تاج)', 80], ['جديد', 6], ['تم حجز الحصة المجانية', 5], ['الطالب اشترك', 3], ['الطالب غير مهتم', 4], ['دافع عربون', 2]];
const LV = [['أول ابتدائي', 'ابتدائي'], ['ثاني ابتدائي', 'ابتدائي'], ['سادس ابتدائي', 'ابتدائي'], ['أول متوسط', 'متوسط'], ['ثالث متوسط', 'متوسط'], ['أول ثانوي', 'ثانوي'], ['ثالث ثانوي', 'ثانوي'], ['جامعي', 'جامعي'], ['Grade 5', 'عالمي'], ['مدارس عالمية (Grade)', 'عالمي']];
const PICK = (r, arr) => { const t = arr.reduce((s, x) => s + x[1], 0); let u = r() * t; for (const x of arr) { u -= x[1]; if (u <= 0) return x[0]; } return arr[0][0]; };
const AGN = (i) => 'Agent ' + String(i).padStart(2, '0');
const GRP = (st) => st === 'مهتم بالاشتراك في الباقات' ? 1 : ['مازال بيفكر', 'رد', 'رد ولكن طلب اعادة التواصل في وقت لاحق', 'متابعة واتس اب', 'مكالمة خدمة'].includes(st) ? 2 : ['غير مهتم او رافض', 'غير محتاج حاليا'].includes(st) ? 3 : 5;

function makeLeads(N, seed, asOfDay) {
  const r = rng(seed), out = [];
  const startDay = '2026-08-01'; const span = Math.round((Date.parse(asOfDay) - Date.parse(startDay)) / 864e5) + 1;
  for (let i = 0; i < N; i++) {
    const day = addD(startDay, Math.floor(r() * span)); const hour = Math.floor(r() * 24);
    const ch = PICK(r, CH); const status = PICK(r, ST); const tag = PICK(r, TG);
    const grp = GRP(status);
    const f_con = status === '(بدون تواصل)' ? 0 : 1;
    const f_ans = f_con && !['ما رد', 'سكر في وجهي'].includes(status) ? 1 : 0;
    const f_bk = f_ans && r() < 0.25 ? 1 : 0;
    const f_att = f_bk && r() < 0.7 ? 1 : 0;
    const pPay = grp === 1 ? 0.25 : grp === 2 ? 0.08 : grp === 3 ? 0.007 : 0.011;
    const f_pay = r() < pPay * (ch === 'Organic' ? 1.8 : 1) ? 1 : 0;
    const f_ent = f_pay || (f_ans && r() < 0.1) ? 1 : 0;
    const dp = f_pay ? Math.floor(r() * r() * 40) : -1;
    const mature = day <= addD(asOfDay, -14) ? 1 : 0;
    const p14 = f_pay && dp <= 14 ? 1 : 0;
    const amt = f_pay ? Math.round(300 + r() * r() * 9000) : 0;
    const tc = f_con ? Math.floor(5 + r() * r() * 1500) : -1;
    const sp = !f_con ? 7 : tc < 5 ? 0 : tc < 15 ? 1 : tc < 60 ? 2 : tc < 180 ? 3 : tc < 720 ? 4 : tc < 1440 ? 5 : 6;
    const gp = f_bk ? Math.floor(r() * 4) : 4;
    const path = (!f_con ? 'n' : f_ans ? 'a' : 'r') + (!f_bk ? 'n' : f_att ? 't' : 'h') + (!f_ent ? 'n' : f_pay ? 'p' : 'f');
    const lv = LV[Math.floor(r() * LV.length)];
    const mob = r() < 0.4;
    const pth = mob ? 'سجّل من التطبيق' : r() < 0.3 ? 'سجّل من الويب ونزّل التطبيق' : 'سجّل من الويب وما نزّلش التطبيق';
    const os = r() < 0.5 ? 'iOS' : r() < 0.7 ? 'Android' : 'غير معروف';
    const agId = r() < 0.01 ? 0 : 1 + Math.floor(r() * r() * 40);
    const rj = grp === 3 && r() < 0.6 ? (1 << Math.floor(r() * 4)) : 0;
    const rl = f_ans ? Math.floor(r() * 8) : 0;
    const sj = r() < 0.35 ? 0 : (1 << Math.floor(r() * 9)) | (r() < 0.3 ? 1 << Math.floor(r() * 9) : 0);
    const sw = 1; // same-point flags: derive from day-of-month <= 24
    const inSame = +day.slice(8) <= +asOfDay.slice(8);
    out.push({ day, hour, ch, status, tag, grp, f_con, f_ans, f_bk, f_att, f_ent, f_pay, dp, mature, p14, amt, tc, sp, gp, path, lv, pth, os, agId, rj, rl, sj, inSame,
      slot: hour < 6 ? 0 : hour < 12 ? 1 : hour < 17 ? 2 : hour < 21 ? 3 : 4, x_fm: f_ent && !f_pay ? ['تقسيط', 'مدى', 'بطاقة'][Math.floor(r() * 3)] : '', x_fo: f_ent && !f_pay ? ['معلّق', 'انتهت المهلة', 'مرفوض'][Math.floor(r() * 3)] : '', fa: f_ent && !f_pay ? 1 + Math.floor(r() * 3) : 0,
      calls: f_con ? 1 + Math.floor(r() * 4) : 0 });
  }
  return out;
}
const med = (a) => { if (!a.length) return -1; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const base = (L) => [L.length, sum(L, 'f_con'), sum(L, 'f_ans'), sum(L, 'f_bk'), sum(L, 'f_att'), sum(L, 'f_ent'), sum(L, 'f_pay'), sum(L, 'amt'), sum(L, 'mature'), L.filter((x) => x.mature && x.p14).length];
function sum(L, k) { let s = 0; for (const x of L) s += x[k]; return s; }
function group(L, keyFn) { const m = new Map(); for (const x of L) { const k = keyFn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; }

function makeRows(N, seed, asOfDay) {
  const L = makeLeads(N, seed, asOfDay).filter(Boolean);
  const D1 = '2026-09-01'; const LD = L.filter((x) => x.day >= D1);
  const rows = [['pk', 'g', 'k1', 'k2', 'k3', 'k4', ...Array.from({ length: 25 }, (_, i) => 'm' + (i + 1))]];
  const seenPk = new Set();
  const push = (g, ks, ms) => { const k = [...ks, '', '', '', ''].slice(0, 4); const m = [...ms]; while (m.length < 25) m.push(null); const pk = [g, ...k].join('|'); if (seenPk.has(pk)) throw new Error('dup ' + pk); seenPk.add(pk); rows.push([pk, g, ...k, ...m]); };
  const emit = (g, src, keyFn, extra) => { for (const [k, grp] of group(src, (x) => JSON.stringify(keyFn(x)))) { const ks = JSON.parse(k); push(g, ks, [...base(grp), ...(extra ? extra(grp) : [])]); } };
  emit('core', LD, (x) => [x.day, x.ch, x.status, x.tag]);
  emit('spd', LD, (x) => [x.day, x.ch, String(x.sp)]);
  emit('hr', LD, (x) => [x.day, String(x.hour)]);
  emit('path', LD, (x) => [x.day, x.ch, x.path]);
  emit('gap', LD.filter((x) => x.gp < 4), (x) => [x.day, x.ch, String(x.gp), x.path[1]], (g) => [g.filter((x) => x.f_att && x.f_pay).length]);
  emit('grade', LD, (x) => [sow(x.day), x.ch, x.lv[0], x.lv[1]]);
  emit('fail', LD.filter((x) => x.x_fm), (x) => [sow(x.day), x.ch, x.x_fm, x.x_fo], (g) => [sum(g, 'fa')]);
  emit('plat', LD, (x) => [som(x.day), x.pth, x.os]);
  emit('coh', LD, (x) => [sow(x.day), x.ch], (g) => [0, 2, 6, 13, 29].map((d) => g.filter((x) => x.dp >= 0 && x.dp <= d).length));
  // tm: weekly medians, ALL combos
  for (const [k, grp] of group(LD, (x) => sow(x.day) + '|' + x.ch + '|' + x.slot)) { /* only ALL/ch aggregates below */ }
  const tmRows = (keyFn) => { for (const [k, grp] of group(LD, (x) => JSON.stringify(keyFn(x)))) { const ks = JSON.parse(k); const v = grp.filter((x) => x.tc >= 0).map((x) => x.tc); push('tm', ks, [...base(grp), grp.filter((x) => x.f_con).length ? sum(grp.filter((x) => x.f_con), 'calls') / grp.filter((x) => x.f_con).length : 0, v.length, med(v), v.length, med(v), 0, -1, 0, -1, 0, -1, 0, -1]); } };
  tmRows((x) => [sow(x.day), x.ch, String(x.slot)]);
  tmRows((x) => [sow(x.day), 'ALL', String(x.slot)]);
  tmRows((x) => [sow(x.day), x.ch, 'ALL']);
  tmRows((x) => [sow(x.day), 'ALL', 'ALL']);
  // agents (needs expected = per cell rate)
  const cell = new Map(); for (const [k, grp] of group(LD.filter((x) => x.mature), (x) => x.ch + '|' + x.slot)) cell.set(k, grp.filter((x) => x.p14).length / grp.length);
  emit('ag', LD, (x) => [sow(x.day), String(x.agId), x.agId ? AGN(x.agId) : ''], (g) => {
    const m = g.filter((x) => x.mature); let ex = 0, va = 0; for (const x of m) { const p = cell.get(x.ch + '|' + x.slot) || 0; ex += p; va += p * (1 - p); }
    const v = g.filter((x) => x.tc >= 0).map((x) => x.tc);
    return [sum(m, 'f_con'), sum(m, 'f_ans'), sum(m, 'f_bk'), sum(m, 'f_att'), sum(m, 'amt'), +ex.toFixed(3), +va.toFixed(3), 0, v.length, med(v)];
  });
  // month comparison (same-point)
  const MC = L.filter((x) => x.inSame);
  const mcRow = (grp) => { const e = grp.filter((x) => x.f_ent), tr = grp.filter((x) => x.f_att); const v = grp.filter((x) => x.f_con).map((x) => x.tc); return [...base(grp), sum(grp, 'f_pay'), sum(grp, 'amt'), sum(grp, 'f_pay'), sum(grp, 'f_con'), sum(grp, 'f_ans'), sum(grp, 'f_bk'), sum(grp, 'f_att'), tr.length, tr.filter((x) => x.f_pay).length, sum(grp, 'f_ent'), e.filter((x) => !x.f_pay).length, grp.filter((x) => x.f_pay && !x.f_att).length, grp.length - tr.length, med(v), new Set(grp.map((x) => x.agId)).size]; };
  for (const [k, grp] of group(MC, (x) => JSON.stringify([som(x.day), x.ch]))) push('mc', JSON.parse(k), mcRow(grp));
  for (const [k, grp] of group(MC, (x) => som(x.day))) push('mc', [k, 'ALL'], mcRow(grp));
  // interest
  const bits = (n, v) => { const o = []; for (let i = 0; i < n; i++) if (v & (1 << i)) o.push(i); return o; };
  const exp = (src, f, keyFn) => { const m = new Map(); for (const x of src) for (const b of f(x)) { const k = JSON.stringify(keyFn(x, b)); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } for (const [k, grp] of m) push(k.startsWith('["rj') ? 'rj' : 'x', JSON.parse(k).slice(1), base(grp)); };
  const gx = (g, src, f, keyFn) => { const m = new Map(); for (const x of src) for (const b of f(x)) { const k = JSON.stringify(keyFn(x, b)); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } for (const [k, grp] of m) push(g, JSON.parse(k), base(grp)); };
  gx('rj', LD, (x) => bits(4, x.rj), (x, b) => [sow(x.day), x.ch, String(b)]);
  gx('rl', LD.filter((x) => !['(بدون تواصل)', 'ما رد'].includes(x.status)), (x) => [x.rl], (x, b) => [sow(x.day), x.ch, String(b)]);
  gx('sj', LD, (x) => x.sj === 0 ? [-1] : bits(9, x.sj), (x, b) => [sow(x.day), x.ch, String(b)]);
  push('meta', [asOfDay + ' 20:34:54', '2026-08-01', D1], base(L));
  for (const [m, a, b] of [['2026-09', 2266, 3568], ['2026-10', 2020, 2643], ['2026-11', 1455, 2476]]) push('pkg', [m], [a, b, b - 400, 30, 105, 0.35, 0.1, 0.1, 0.45, 0.55, 0.65]);
  return { rows, leads: L, LD, asOfDay };
}
module.exports = { makeRows, sow, som, addD };
