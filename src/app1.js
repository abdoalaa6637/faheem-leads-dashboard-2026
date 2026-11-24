/* Faheem leads dashboard - part 1: helpers, data, filters, charts. All numbers are computed here from the sheet rows. */
(function () {
'use strict';
const NM = 25;
const $ = (id) => document.getElementById(id);
const fmt = (n) => (n == null || !isFinite(n)) ? '—' : Math.round(n).toLocaleString('en-US');
const pct = (x, d) => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(d == null ? 1 : d) + '%';
const dv = (a, b) => b ? a / b : null;
const kf = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K' : String(Math.round(n));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hrs = (m) => m == null || m < 0 ? '—' : m < 60 ? Math.round(m) + ' د' : m < 1440 ? (m / 60).toFixed(1) + ' س' : (m / 1440).toFixed(1) + ' يوم';

// ---------- dates (UTC, ISO strings) ----------
const iso = (d) => d.toISOString().slice(0, 10);
const pd = (s) => new Date(s + 'T00:00:00Z');
const addD = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const addM = (s, n) => { const d = pd(s); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return iso(d); };
const sow = (s) => { const d = pd(s); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return iso(d); };   // week starts Sunday
const som = (s) => s.slice(0, 8) + '01';
const dm = (s) => +s.slice(8) + '/' + +s.slice(5, 7);
const MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monName = (s) => MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4);

// ---------- labels ----------
const CHL = { Snapchat: 'Snapchat', TikTok: 'TikTok', Google: 'Google', 'Google Max': 'Google Max', Facebook: 'Facebook (Meta)', Influencer: 'Influencers', iOS: 'iOS (تطبيق)', Android: 'Android (تطبيق)', Organic: 'Organic / مباشر', WhatsApp: 'WhatsApp (جديد)', Other: 'أخرى' };
const chl = (c) => CHL[c] || c;
const EST = { iOS: 1, Android: 1 };
const SPB = ['أقل من 5 دقايق', '5 – 15 دقيقة', '15 – 60 دقيقة', '1 – 3 ساعات', '3 – 12 ساعة', '12 – 24 ساعة', 'أكتر من يوم', 'ما اتواصلش معاه'];
const GPB = ['أقل من ساعتين', 'ساعتين – يوم', '1 – 3 أيام', 'أكتر من 3 أيام'];
const SLOT = ['12ص – 6ص', '6ص – 12ض', '12ض – 5م', '5م – 9م', '9م – 12ص'];
const RJL = ['تم الدخول بالغلط', 'تجربة المنصة من باب الفضول', 'السعر', 'أخرى'];
const RLL = ['ما اتسجّلش', 'الأم', 'الطالب نفسه', 'الأب', 'أخرى', 'الأخ', 'الأخت', 'غير معروف'];
const SJL = ['الإنجليزي', 'الرياضيات', 'أخرى', 'القدرات', 'المتابعة', 'التحصيلي', 'الكيمياء', 'الفيزياء', 'مادة بالإنجليزي'];
const LVN = { 1: 'مهتم', 2: 'متردد', 3: 'مش مهتم', 4: 'مش مناسب', 5: 'لسه ما اتعرفش' };
const LV2 = { 'مهتم بالاشتراك في الباقات': 1, 'مازال بيفكر': 2, 'رد ولكن طلب اعادة التواصل في وقت لاحق': 2, 'متابعة واتس اب': 2, 'مكالمة خدمة': 2, 'رد': 2, 'غير مهتم او رافض': 3, 'غير محتاج حاليا': 3, 'معلم سجل بالخطأ كطالب': 4, 'طالب جمعية او جهة': 4, 'الرقم خطأ او غير صحيح': 4 };
const lvOf = (st) => LV2[st] || 5;
const PATHC = { c: { n: 'ما اتواصلش معاه', r: 'اتواصل ومارد', a: 'رد' }, t: { n: 'من غير تجريبية', t: 'حضر التجريبية', x: 'حضر بعد الدفع', u: 'حجز والطالب ما حضرش', s: 'حجز والمدرّس ما حضرش', h: 'حجز وما اتعملتش' }, p: { n: 'ما دخلش الدفع', p: 'دفع', f: 'دخل الدفع وما كمّلش' } };
const pathLbl = (p) => (PATHC.c[p[0]] || p[0]) + ' ← ' + (PATHC.t[p[1]] || p[1]) + ' ← ' + (PATHC.p[p[2]] || p[2]);

// ---------- glossary (wording from references/metrics-glossary.md) ----------
const GL = {
  leads: ['الليدز', 'طلاب سعوديين نشطين سجّلوا في الفترة', 'كل طالب سعودي نشط وبدون كفيل، حسب تاريخ تسجيله. التاريخ في الداشبورد كلها هو تاريخ التسجيل، مش تاريخ الدفع ولا وقت فتح الداشبورد.'],
  paid: ['دفعوا', 'ليدز عندهم دفعة ناجحة على الأقل', 'الليدز اللي ليهم دفعة ناجحة غير مستردة لحد آخر تحديث، حتى لو الدفع حصل بعد الفترة. كل ما الليد يكبر، الرقم هيزيد.'],
  revenue: ['الإيراد (ريال)', 'إيراد ليدز الفترة، بتاريخ التسجيل', 'مجموع كل الدفعات الناجحة غير المستردة للطلاب اللي سجّلوا في الفترة، بأي تاريخ دفع، وبيشمل تجديداتهم. مش هو الفلوس اللي دخلت في الفترة، فمش لازم يطابق داشبورد الإعلانات اللي بتحسب بتاريخ الدفع.'],
  aov: ['متوسط العملية (ريال)', 'الإيراد ÷ الدافعين', 'المتوسط بيتشدّ لفوق بسبب طلبات كبيرة قليلة. هنا بنقسم الإيراد على عدد الدافعين.'],
  conv: ['التحويل الكلي', 'دفعوا ÷ الليدز', 'ليدز الأسابيع الأخيرة لسه ما خدتش وقتها في الدفع، فتحويلها بيبان أقل وهو بيزيد بعدين. للمقارنة العادلة استخدم تحويل 14 يوم.'],
  conv14: ['تحويل 14 يوم', 'دفع خلال 14 يوم من التسجيل', 'بيتحسب لليدز اللي عدّى عليها 14 يوم بس، عشان نقارن ليدز قديمة بليدز أحدث بإنصاف. مختلف عن «التحويل الكلي».'],
  answered: ['نسبة الرد', 'ردّوا على السيلز ÷ الليدز', 'الطالب «رد» لو فيه تواصل واحد على الأقل بحالة: رد، أو طلب إعادة تواصل، أو متابعة واتساب، أو مكالمة خدمة.'],
  contacted: ['اتواصل معاهم', 'ليدز ليهم أي تواصل مسجّل', 'أي ريمارك من السيلز على الطالب، سواء رد أو لأ.'],
  booked: ['حجزوا تجريبية', 'حجزوا ÷ الليدز', 'التجريبية = حجز معلّم كتجريبي في الحجوزات، أو ليه سطر تجريبي في سجل الحصص. التعريفين مجموعين.'],
  attended: ['حضروا التجريبية', 'حضروا ÷ اللي حجزوا', '«حضر» = الطالب والمدرّس دخلوا الحصة قبل أول دفع. اللي حضر بعد ما دفع بيتحسب «من غير تجريبية».'],
  entered: ['دخلوا صفحة الدفع', 'ليدز ليهم محاولة دفع', 'أي محاولة، ناجحة أو فاشلة أو معلّقة.'],
  rpl: ['إيراد لكل ليد', 'الإيراد ÷ الليدز', 'بيتأثر بتأخر الدفع زي التحويل بالظبط، فقارنه بين فترات عمرها متساوي.'],
  c1h: ['تواصل خلال ساعة', 'من اللي اتواصل معاهم: أول تواصل في أقل من ساعة', 'المقام هو الليدز اللي اتواصل معاهم فعلًا، مش كل الليدز. بيتحسب بفلتر التاريخ والقناة بس.'],
  expected: ['المتوقع', 'تحويل متوقع حسب قناة ووقت تسجيل ليدز السيلز', 'لكل ليد بنحسب التحويل المعتاد لنفس القناة ونفس فترة التسجيل، ونجمعها لكل سيلز. ما بيحسبش الصف الدراسي ولا جودة الليد.'],
  badge: ['التقييم', 'فوق / في / تحت المتوقع', 'بتتحدد لما الفرق يعدّي حدود الصدفة. السيلز اللي عنده أقل من 100 ليد ناضج بيظهر «عيّنة صغيرة» وما بيتقيّمش.'],
  fplot: ['Funnel plot', 'النقطة برّه الخطوط = فرق حقيقي', 'المحور الأفقي عدد الليدز الناضجة، والرأسي الفرق عن المتوقع. الخطوط المتقطعة حدود الصدفة. كل ما الليدز أقل، الحدود أوسع.'],
  waiting: ['ليدز مستنية من غير تواصل', 'بلا أي تواصل بعد أكتر من 3 ساعات', 'ده الرقم اللي ينفع يتعالج النهارده. بيشمل ليدز قديمة من أسابيع.'],
  fc: ['وسيط أول تواصل', 'من التسجيل لأول تواصل من السيلز', 'محسوب للي اتواصل معاهم بس. على مستوى السيلز هو متوسط مرجّح لوسيط كل أسبوع (تقريبي)، وعلى مستوى الفريق وسيط أسبوعي دقيق.'],
  speed: ['سرعة أول تواصل', 'الليدز مقسّمة حسب وقت أول تواصل', 'الشرائح: أقل من 5 دقايق، لحد 15، لحد 60، لحد 3 ساعات، لحد 12، لحد يوم، أكتر من يوم، وما اتواصلش معاه.'],
  slot: ['وقت التسجيل في اليوم', '5 فترات في اليوم', 'من 12 بالليل لـ6 الصبح، لـ12 الضهر، لـ5 العصر، لـ9 بالليل، لـ12.'],
  heat: ['Heatmap اليوم والساعة', 'الأغمق = أكتر', 'الأسبوع من الأحد. الخلايا الرمادي عندها ليدز قليلة جدًا ومش بتتحسب نسبتها.'],
  gap: ['بُعد ميعاد الحصة', 'الوقت بين حجز التجريبية وميعادها', '«ما حضرش» الطالب ما دخلش والمدرّس دخل. «ما اتعملتش» محدش دخل.'],
  laststatus: ['آخر حالة سجّلها السيلز', 'آخر ريمارك لكل طالب', 'حالة B2C لو موجودة وإلا حالة التواصل. «بدون تواصل» لو مفيش ريمارك.'],
  path: ['المسار', 'كل طالب ماشي في فرع واحد بس', 'سجّل ← (رد / ما ردّش / ما اتواصلش) ← (حضر التجريبية / حجز وما حضرش / من غير تجريبية) ← (دفع / دخل الدفع وما كمّلش / ما دخلش).'],
  cohort: ['منحنى الكوهورت', 'الدفع التراكمي بعد 1/3/7/14/30 يوم', 'كل صف أسبوع تسجيل. بنعرض بس الخانات اللي عدّى عليها وقت كفاية، فالأسبوع الأخير مش بيبان أضعف من الحقيقة.'],
  fail: ['دخلوا الدفع وما كمّلوش', 'محاولة فاشلة أو معلّقة ومفيش ناجحة', 'غالبيتهم تقسيط معلّق أو انتهت مهلته. الأرقام دي قائمة متابعة، مش خسارة نهائية.'],
  channel: ['القناة', 'أول مصدر اتسجّل للطالب', 'من أول utm_source. من غير UTM: لو سجّل من التطبيق iOS أو Android، ولو جاي من حملة واتساب فهو WhatsApp، وغير كده Organic. كل ليد في قناة واحدة.'],
  appest: ['iOS و Android', 'تقدير من جهاز التطبيق', 'مش إعلانات متنسّبة. الطالب اللي ما عندوش UTM وفتح من التطبيق بيتحسب حسب نظام جهازه.'],
  samep: ['المقارنة بنفس الفترة', 'كل شهر من أوله لنفس اليوم والساعة', 'بنحسب الدفع والتواصل والحجز اللي حصل قبل نفس النقطة من الشهر بس. رقم الإيراد هنا ممكن يختلف عن رقم الصفحة الرئيسية لنفس الشهر القديم، وده مقصود.'],
  grade: ['الصف الدراسي', 'من الصف المسجّل للطالب', 'صفوف Grade مجمّعة تحت «مدارس عالمية».'],
  pkg: ['الباقات', 'نفس الأيام من كل شهر', 'متوسط الطلب، متوسط الساعات في الطلب، وسعر الساعة. لو سعر الساعة ثابت ومتوسط الطلب نازل يبقى الطلاب بيشتروا باقات أصغر مش بياخدوا خصم أكبر.'],
  ilevel: ['مستوى الاهتمام', 'آخر حالة سجّلها السيلز، متجمّعة في مستويات', 'مهتم = «مهتم بالاشتراك في الباقات». متردد = مازال بيفكر، أو رد وطلب إعادة تواصل، أو متابعة واتساب، أو مكالمة خدمة، أو «رد». مش مهتم = غير مهتم أو غير محتاج حاليًا. مش مناسب = رقم غلط، أو معلّم سجّل بالغلط، أو جمعية. لسه ما اتعرفش = ما ردّش أو سكّر أو ما اتواصلش معاه أصلًا.'],
  iconv: ['تحويل كل مستوى', 'دفعوا ÷ ليدز المستوى', 'بيوضّح هل تقييم السيلز للاهتمام بيطابق الدفع فعلًا. ليدز الفترة الأخيرة لسه ما خدتش وقتها، فالتحويل بيزيد بعدين. والحالة هي آخر حالة، فممكن تكون اتكتبت بعد الدفع.'],
  rej: ['سبب الرفض', 'سبب آخر ريمارك للطالب', 'الطالب ممكن يتسجّل له أكتر من سبب، فمجموع الأسباب ممكن يعدّي عدد الطلاب. بيتحسب من آخر ريمارك بس، مش من أي ريمارك قديم.'],
  role: ['مين اللي رد', 'آخر دور اتسجّل لمن رد على السيلز', 'بيشمل الليدز اللي ردّت فقط (يعني من غير «ما رد» ومن غير «ما اتواصلش معاه»). «ما اتسجّلش» يعني السيلز ما كتبش مين اللي رد.'],
  subj: ['المواد وقت التسجيل', 'أول مواد اختارها الطالب في التسجيل', 'أول اختيار مواد مش فاضي من أي نوع طلب. الطالب ممكن يختار أكتر من مادة، فالمجموع بيعدّي عدد الطلاب. «ما اختارش مادة» = مفيش اختيار مسجّل.'],
  partial: ['فترة جزئية', 'آخر يوم أو أسبوع أو شهر ممكن يكون ناقص', 'الفترة الأخيرة لسه شغالة، فأرقامها هتزيد. المقارنات بنفس الفترة بتتعامل مع ده تلقائيًا.'],
};
const inf = (k) => GL[k] ? '<span class="info" tabindex="0" data-tip="' + esc(GL[k][2]) + '">i</span>' : '';
const gname = (k) => GL[k][0];
const gline = (k) => GL[k][1];

// ---------- data ----------
let P = null; const T = {};
const EMPTY = { n: 0, k: [[], [], [], []], m: [] };
const grp = (g) => T[g] || EMPTY;
function load(p) {
  P = p;
  for (const g of Object.keys(p.groups)) {
    const x = p.groups[g]; const n = x.n;
    const k = x.kd.map((c) => { if (!c) return new Array(n).fill(''); const o = new Array(n); for (let i = 0; i < n; i++) o[i] = c.d[c.v[i]]; return o; });
    const m = new Array(NM);
    for (let j = 0; j < NM; j++) m[j] = new Float64Array(n);
    x.mi.forEach((idx, a) => { const col = x.m[a], dst = m[idx - 1]; for (let i = 0; i < n; i++) dst[i] = col[i] == null ? 0 : col[i]; });
    T[g] = { n, k, m };
  }
}
const DAYG = { core: 1, spd: 1, hr: 1, path: 1, gap: 1 };
const WEEKG = { grade: 1, fail: 1, coh: 1, tm: 1, ag: 1, rj: 1, rl: 1, sj: 1 };
const CHPOS = { core: 1, spd: 1, path: 1, gap: 1, grade: 1, fail: 1, coh: 1, rj: 1, rl: 1, sj: 1 };

// ---------- state ----------
const PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Previous Month', 'Month to Date', 'Last 3 Months', 'Quarter to Date', 'Last 6 Months', 'Last 12 Months', 'Year to Date', 'Lifetime', 'Custom'];
const S = { page: 'ov', preset: 'Lifetime', from: '', to: '', ch: new Set(), st: new Set(), tg: new Set(), grain: 'day', metric: 'rev', agMin: 100, agQ: '', agSort: 'p14', agDir: -1, agPage: 1, skew: 'conv' };
let MIN = '', MAX = '';
function range() {
  const m = MAX; let f = MIN, t = MAX;
  switch (S.preset) {
    case 'Today': f = t = m; break;
    case 'Yesterday': f = t = addD(m, -1); break;
    case 'Last 7 Days': f = addD(m, -6); break;
    case 'Last 30 Days': f = addD(m, -29); break;
    case 'Previous Month': { const a = addM(som(m), -1); f = a; t = addD(som(m), -1); break; }
    case 'Month to Date': f = som(m); break;
    case 'Last 3 Months': f = addD(addM(m, -3), 1); break;
    case 'Quarter to Date': f = addM(m.slice(0, 5) + String(Math.floor((+m.slice(5, 7) - 1) / 3) * 3 + 1).padStart(2, '0') + '-01', 0); break;
    case 'Last 6 Months': f = addD(addM(m, -6), 1); break;
    case 'Last 12 Months': f = addD(addM(m, -12), 1); break;
    case 'Year to Date': f = m.slice(0, 4) + '-01-01'; break;
    case 'Custom': f = S.from || MIN; t = S.to || MAX; break;
  }
  if (f < MIN) f = MIN; if (t > MAX) t = MAX; if (t < f) t = f;
  return [f, t];
}
// row selection on a group with the shared filters. opt: {date, ch, st, tg}
function sel(g, opt) {
  const x = grp(g), ix = [], [f, t] = range();
  const wf = sow(f), mf = som(f);
  const one = S.ch.size === 1 ? [...S.ch][0] : null;
  for (let i = 0; i < x.n; i++) {
    const d = x.k[0][i];
    if (opt.date) {
      if (DAYG[g]) { if (d < f || d > t) continue; }
      else if (WEEKG[g]) { if (d < wf || d > t) continue; }
      else if (g === 'plat') { if (d < mf || d > t) continue; }
    }
    if (opt.ch && S.ch.size && CHPOS[g] && !S.ch.has(x.k[1][i])) continue;
    if (opt.st && S.st.size && g === 'core' && !S.st.has(x.k[2][i])) continue;
    if (opt.tg && S.tg.size && g === 'core' && !S.tg.has(x.k[3][i])) continue;
    ix.push(i);
  }
  return ix;
}
function sum(g, ix) { const x = grp(g), a = new Float64Array(NM); for (let j = 0; j < NM; j++) { const c = x.m[j]; if (!c) continue; let s = 0; for (let q = 0; q < ix.length; q++) s += c[ix[q]]; a[j] = s; } return a; }
// group-by one key column -> Map key -> sums
function by(g, ix, keyFn) { const x = grp(g), mp = new Map(); for (const i of ix) { const k = keyFn(x, i); let a = mp.get(k); if (!a) { a = new Float64Array(NM); mp.set(k, a); } for (let j = 0; j < NM; j++) a[j] += x.m[j][i]; } return mp; }
const FILT = { core: 'التاريخ، القناة، الحالة، التاج' };

// ---------- charts ----------
const nice = (v) => { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; };
function barSvg(labels, vals, ft, color, notes, W) {
  W = W || 520; const H = 260, L = 46, R = 10, T0 = 16, B = 44, pw = W - L - R, ph = H - T0 - B, n = vals.length;
  if (!n) return '<div class="note">مفيش داتا للفلاتر دي.</div>';
  const mx = nice(Math.max.apply(null, vals.map((v) => v || 0)) * 1.12), st = pw / n; let o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="svgc">';
  for (let i = 0; i <= 4; i++) { const y = T0 + ph - ph * i / 4; o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + ft(mx * i / 4) + '</text>'; }
  vals.forEach((v, i) => {
    const x = W - R - (i + 1) * st + st * .18, bw = st * .64, h = (v || 0) / mx * ph;
    o += '<rect x="' + x.toFixed(1) + '" y="' + (T0 + ph - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="' + color + '"><title>' + esc(labels[i]) + ': ' + ft(v || 0) + '</title></rect>';
    o += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (T0 + ph - h - 5).toFixed(1) + '" text-anchor="middle" class="vt">' + ft(v || 0) + '</text>';
    o += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 24) + '" text-anchor="middle" class="ax">' + esc(labels[i]) + '</text>';
    if (notes) o += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" class="ax2">' + esc(notes[i]) + '</text>';
  });
  return o + '</svg>';
}
function trendSvg(pts, metric, grain) {
  if (!pts.length) return '<div class="note">مفيش داتا للفلاتر دي.</div>';
  const W = 920, H = 300, L = 46, R = 58, T0 = 14, B = 30, pw = W - L - R, ph = H - T0 - B, n = pts.length, st = pw / n;
  const val = (p) => metric === 'rev' ? p.rev : metric === 'paid' ? p.paid : (p.leads ? p.paid / p.leads : 0);
  const col = metric === 'rev' ? '#7c3aed' : metric === 'paid' ? '#FF6A00' : '#059669';
  const ft = (v) => metric === 'rev' ? kf(v) : metric === 'paid' ? fmt(v) : (v * 100).toFixed(1) + '%';
  const mxL = nice(Math.max.apply(null, pts.map((p) => p.leads)) * 1.05), mxR = nice(Math.max.apply(null, pts.map(val)) * 1.1) || 1;
  let o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="svgc">';
  for (let i = 0; i <= 4; i++) { const y = T0 + ph - ph * i / 4; o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (W - R + 6) + '" y="' + (y + 4) + '" class="ax" fill="' + col + '">' + ft(mxR * i / 4) + '</text><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax bl">' + kf(mxL * i / 4) + '</text>'; }
  const xs = (i) => W - R - (i + 0.5) * st;
  pts.forEach((p, i) => { const h = p.leads / mxL * ph; o += '<rect x="' + (xs(i) - st * .32).toFixed(1) + '" y="' + (T0 + ph - h).toFixed(1) + '" width="' + (st * .64).toFixed(1) + '" height="' + h.toFixed(1) + '" class="bar"/>'; });
  o += '<polyline fill="none" stroke="' + col + '" stroke-width="2.4" points="' + pts.map((p, i) => xs(i).toFixed(1) + ',' + (T0 + ph - val(p) / mxR * ph).toFixed(1)).join(' ') + '"/>';
  if (n <= 200) pts.forEach((p, i) => { o += '<rect x="' + (xs(i) - st / 2).toFixed(1) + '" y="' + T0 + '" width="' + st.toFixed(1) + '" height="' + ph + '" fill="transparent"><title>' + esc((grain === 'month' ? monName(p.k) : p.k) + ' · ليدز ' + fmt(p.leads) + ' · دفعوا ' + fmt(p.paid) + ' (' + pct(dv(p.paid, p.leads)) + ') · إيراد ' + fmt(p.rev)) + '</title></rect>'; });
  const every = Math.max(1, Math.ceil(n / 10));
  pts.forEach((p, i) => { if (i % every === 0) o += '<text x="' + xs(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" class="ax">' + (grain === 'month' ? MON[+p.k.slice(5, 7) - 1] : dm(p.k)) + '</text>'; });
  return o + '</svg>';
}
function fplotSvg(pts, vbar, xmax) {
  const W = 640, H = 370, L = 52, R = 14, T0 = 14, B = 40, pw = W - L - R, ph = H - T0 - B;
  if (!pts.length) return '<div class="note">مفيش سيلز بحد أدنى الليدز ده.</div>';
  const lim = (z, n) => z * Math.sqrt(vbar / n) * 100;
  let ym = 2; for (const p of pts) ym = Math.max(ym, Math.abs(p.y)); ym = Math.min(Math.max(ym, lim(3.09, Math.max(30, xmax / 8))), 12); ym = Math.ceil(ym);
  const X = (n) => L + n / xmax * pw, Y = (v) => T0 + ph / 2 - Math.max(-ym, Math.min(ym, v)) / ym * ph / 2;
  let o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="svgc">';
  for (let v = -ym; v <= ym; v += Math.max(1, Math.round(ym / 3))) o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="gl"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="ax">' + (v > 0 ? '+' : '') + v + '</text>';
  o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#555" stroke-width="1.2"/>';
  for (const [z, cls] of [[1.96, 'cl95'], [3.09, 'cl99']]) for (const sg of [1, -1]) { const q = []; for (let n = Math.max(20, xmax / 60); n <= xmax; n += xmax / 60) q.push(X(n).toFixed(1) + ',' + Y(sg * lim(z, n)).toFixed(1)); o += '<polyline points="' + q.join(' ') + '" class="' + cls + '"/>'; }
  for (let i = 0; i <= 4; i++) o += '<text x="' + (L + pw * i / 4) + '" y="' + (H - 22) + '" text-anchor="middle" class="ax">' + fmt(xmax * i / 4) + '</text>';
  for (const p of pts) { const c = p.z > 1.96 ? '#FF6A00' : p.z < -1.96 ? '#D93B30' : '#9aa3ad'; o += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (Math.abs(p.z) > 1.96 ? 4.4 : 3.2) + '" fill="' + c + '" fill-opacity="' + (Math.abs(p.z) > 1.96 ? .95 : .55) + '" stroke="#fff" stroke-width=".8"><title>' + esc(p.name + ' · ليدز ' + fmt(p.x) + ' · دفعوا ' + fmt(p.p14) + ' (المتوقع ' + p.exp.toFixed(1) + ') · الفرق ' + (p.y > 0 ? '+' : '') + p.y.toFixed(1) + ' نقطة') + '</title></circle>'; }
  o += '<text x="' + (L + pw / 2) + '" y="' + (H - 4) + '" text-anchor="middle" class="axt">عدد الليدز (ناضجة 14 يوم)</text><text transform="translate(12,' + (T0 + ph / 2) + ') rotate(-90)" text-anchor="middle" class="axt">الفرق عن المتوقع (نقطة مئوية)</text>';
  return o + '</svg>';
}

window.__F = { NM, $, fmt, pct, dv, kf, esc, hrs, iso, pd, addD, addM, sow, som, dm, MON, monName, CHL, chl, EST, SPB, GPB, SLOT, RJL, RLL, SJL, LVN, lvOf, pathLbl, GL, inf, gname, gline, load, T, grp, S, PRESETS, range, sel, sum, by, barSvg, trendSvg, fplotSvg, nice,
  setMinMax: (a, b) => { MIN = a; MAX = b; }, getP: () => P, minmax: () => [MIN, MAX] };
})();
