// ─────────────────────────────────────────────────────────────
// Lector Claro, portado a la app: toda la lógica que reorganiza un texto
// para leerlo con dislexia (sin cambiar palabras) y las opciones de la vista
// "Ajustable". Lo usa DocViewer sobre el PDF/Word que sube el profesor.
// ─────────────────────────────────────────────────────────────

export const LC_THEMES = [
  { name: 'Crema', bg: '#FBF5E6', fg: '#2B2B2B' }, { name: 'Durazno', bg: '#FCE9D6', fg: '#2E2420' },
  { name: 'Menta', bg: '#E3F2E7', fg: '#1E2C24' }, { name: 'Celeste', bg: '#E2ECF7', fg: '#1B2533' },
  { name: 'Gris', bg: '#E9E9E6', fg: '#222222' }, { name: 'Noche', bg: '#1F2326', fg: '#E8E3D6' },
];

export const LC_FONTS = [
  { label: 'Lexend', value: '"Lexend", Verdana, sans-serif' },
  { label: 'OpenDyslexic', value: '"OpenDyslexicLocal", "OpenDyslexic", "OpenDyslexicUser", "Lexend", sans-serif' },
  { label: 'Atkinson Hyperlegible', value: '"Atkinson Hyperlegible", Verdana, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Arial / Helvetica', value: 'Arial, Helvetica, sans-serif' },
];

// Configuración recomendada de Lector Claro (= nivel moderado).
// rulerH: alto de la regla de lectura sobre el PDF, en px.
// pdfColors: pintar el PDF con el fondo y el color de letra elegidos.
export const LC_DEFAULTS = {
  font: '"Lexend", Verdana, sans-serif', size: 20, ls: 0.22, ws: 0.52, lh: 2.0, w: 65,
  bg: '#FBF5E6', fg: '#2B2B2B', hl: '#F4D35E', rulerColor: '#000000', rulerAlpha: 0.45,
  ruler: false, rulerH: 34, pdfColors: true, rate: 0.9, perLine: true, chunks: true, nums: true,
};
// hl: color para resaltar números, fechas y el bloque que se lee en voz alta.
// rulerColor / rulerAlpha: color e intensidad de la sombra de la regla.

// ─────────── Niveles de dislexia ───────────
// Cada nivel define cómo arranca la lectura (tipografía, espaciado, colores,
// regla) y cuánto se reorganiza el texto: `long` = desde cuántas palabras
// una frase se corta en tramos; `maxSents` = frases por párrafo.
export const DYSLEXIA_LEVELS = {
  leve: {
    label: 'Leve',
    icon: 'bi-reception-2',
    desc: 'Letra un poco más grande y algo más de espacio. El texto conserva casi su forma original.',
    preset: {
      ...LC_DEFAULTS, size: 18, ls: 0.08, ws: 0.2, lh: 1.7, w: 72,
      perLine: false, chunks: true, nums: true, ruler: false, rulerH: 30, rate: 1,
    },
    format: { long: 30, maxSents: 4 },
  },
  moderado: {
    label: 'Moderado',
    icon: 'bi-reception-3',
    desc: 'La configuración recomendada: Lexend, bastante espacio, una frase por renglón y frases largas en tramos.',
    preset: { ...LC_DEFAULTS },
    format: { long: 25, maxSents: 3 },
  },
  severo: {
    label: 'Severo',
    icon: 'bi-reception-4',
    desc: 'Letra grande, mucho espacio, renglones cortos, tramos muy cortos y la regla de lectura activada.',
    preset: {
      ...LC_DEFAULTS, size: 24, ls: 0.3, ws: 0.72, lh: 2.4, w: 48, bg: '#FCE9D6', fg: '#2E2420',
      perLine: true, chunks: true, nums: true, ruler: true, rulerH: 40, rate: 0.8,
    },
    format: { long: 15, maxSents: 2 },
  },
};
export const DYSLEXIA_LEVEL_KEYS = ['leve', 'moderado', 'severo'];
export const levelOf = (lvl) => DYSLEXIA_LEVELS[lvl] || DYSLEXIA_LEVELS.moderado;

// Ajustes del alumno: primero los guardados en su cuenta (readerPrefs), si
// no los de este navegador, y si no hay nada, los de su nivel.
const storageKey = (userId) => `lectorClaro:${userId}`;
export function loadLcSettings(userId, level, accountSettings) {
  if (accountSettings) return { ...levelOf(level).preset, ...accountSettings };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null');
    if (saved) return { ...levelOf(level).preset, ...saved };
  } catch { /* sin storage: valores del nivel */ }
  return { ...levelOf(level).preset };
}
export function saveLcSettings(userId, s) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(s)); } catch { /* ignorar */ }
}

// ---------- contraste WCAG ----------
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const contrastRatio = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// ---------- adaptación automática ----------
export const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BULLET = /^\s*(?:[•·▪◦●‣∙*–—-]|\d{1,2}[.)]|[a-zA-Z][)])\s+/;
const isCaps = (s) => /[A-ZÁÉÍÓÚÑ]{3}/.test(s) && s === s.toUpperCase();
const sentenceCase = (s) => { const l = s.toLowerCase(); return l.charAt(0).toUpperCase() + l.slice(1); };
const words = (s) => (s.match(/[\p{L}\d]+/gu) || []).length;
export const LONG = 25;
const DEFAULT_FORMAT = { long: LONG, maxSents: 3 };

// "setenta y cinco por ciento (75%)" -> "75%"
const NW = 'cero|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieci\\p{L}+|veinte|veinti\\p{L}+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|\\p{L}+cientos|\\p{L}+cientas|mil|millón|millones';
const NUMWORDS = new RegExp(`(?<!\\p{L})(?:${NW})(?:\\s+(?:${NW}|y|por))*\\s*\\((\\d[\\d.,]*\\s*%?)\\)`, 'giu');
const MONTHS = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const UNITS = 'años|año|meses|mes|días|día|horas|hora|minutos|semanas|semana|puntos|punto|pesos|cuotas|cuatrimestres|clases|horas cátedra';
const NUMRX = new RegExp(`(?<![\\p{L}\\d])(\\d+(?:[.,]\\d+)*(?:\\s*%)?(?:\\s+de\\s+(?:${MONTHS}))?(?:\\s+(?:${UNITS}))?|(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)\\s+\\d{1,2}(?:\\s+de\\s+(?:${MONTHS}))?)(?![\\p{L}\\d])`, 'giu');

function splitSentences(p) {
  return p.split(/(?<=[.!?…]["»”)]?)\s+(?=[\p{Lu}¿¡"«(\d])/u).map((s) => s.trim()).filter(Boolean);
}
function inline(s) {
  return esc(s).replace(NUMRX, '<span class="n">$1</span>').replace(/\*\*(.+?)\*\*/g, '<span class="k">$1</span>');
}
function renderSentence(s, st) {
  const n = words(s);
  if (n <= st.cfg.long) return `<span class="s">${inline(s)}</span>`;
  st.long++;
  // tramos: se corta en comas, punto y coma y dos puntos; los pedacitos muy cortos se pegan al anterior
  const parts = s.split(/(?<=[,;:])\s+/);
  const chunks = [];
  parts.forEach((p) => {
    if (chunks.length && (words(p) < 4 || words(chunks[chunks.length - 1]) < 4)) chunks[chunks.length - 1] += ' ' + p;
    else chunks.push(p);
  });
  st.chunks += chunks.length;
  return `<span class="s long">${chunks.map((c) => `<span class="c">${inline(c)}</span>`).join(' ')}</span>`;
}
function renderPara(text, st, split = true) {
  let t = text.replace(NUMWORDS, (m, d) => { st.numw++; return d; });
  if (isCaps(t) && t.length > 20) { t = sentenceCase(t); st.caps++; }
  let sents = splitSentences(t);
  // punto y coma en frases largas -> punto seguido
  sents = sents.flatMap((s) => {
    if (words(s) <= st.cfg.long || !/;\s/.test(s)) return [s];
    const bits = s.split(/;\s+/).map((b) => b.charAt(0).toUpperCase() + b.slice(1));
    st.semi += bits.length - 1;
    return bits.map((b, i) => (i < bits.length - 1 ? b.replace(/[,\s]*$/, '') + '.' : b));
  });
  sents.forEach((s) => { st.sents++; st.maxAfter = Math.max(st.maxAfter, words(s)); });
  const groups = [];
  if (split) {
    let cur = [];
    sents.forEach((s) => {
      if (cur.length >= st.cfg.maxSents || (cur.length && cur.join(' ').length + s.length > 380)) { groups.push(cur); cur = []; }
      cur.push(s);
    });
    if (cur.length) groups.push(cur);
    if (groups.length > 1) st.split += groups.length - 1;
  } else groups.push(sents);
  return groups.map((g) => `<p>${g.map((s) => renderSentence(s, st)).join(' ')}</p>`).join('');
}
const newStats = (format) => ({ cfg: { ...DEFAULT_FORMAT, ...format }, joined: 0, split: 0, caps: 0, hyph: 0, lists: 0, heads: 0, numw: 0, semi: 0, long: 0, chunks: 0, sents: 0, maxAfter: 0 });
const listItem = (text, st) => renderPara(text, st, false).replace(/^<p>|<\/p>$/g, '');

export function autoFormat(raw, format) {
  const st = newStats(format);
  let txt = raw.replace(/\r\n?/g, '\n').replace(/­/g, '').replace(/[ \t]+/g, ' ').replace(/[ ]{2,}/g, ' ');
  txt = txt.replace(/(\p{L})-\n(\p{Ll})/gu, (m, a, b) => { st.hyph++; return a + b; });
  const lines = txt.split('\n').map((l) => l.trim());
  const maxLen = Math.max(40, ...lines.map((l) => l.length));
  const blocks = [];
  let para = null, list = null;
  const endPara = () => { if (para) { blocks.push({ t: 'p', text: para.join(' ') }); para = null; } };
  const endList = () => { if (list) { blocks.push(list); list = null; } };
  lines.forEach((l, i) => {
    if (!l) { endPara(); endList(); return; }
    if (/^#{1,3}\s/.test(l)) { endPara(); endList(); blocks.push({ t: 'h', text: l.replace(/^#+\s*/, '') }); return; }
    if (BULLET.test(l)) {
      endPara();
      if (!list) { list = { t: /^\s*\d/.test(l) ? 'ol' : 'ul', items: [] }; st.lists++; }
      list.items.push(l.replace(BULLET, ''));
      return;
    }
    const next = lines[i + 1] || '', startsBlock = i === 0 || lines[i - 1] === '';
    const shortTitle = l.length < 70 && l.split(' ').length <= 10 && !/[.,;!?…]$/.test(l) && /^[\p{Lu}¿¡0-9]/u.test(l);
    if (next && (!para || isCaps(l)) && ((isCaps(l) && l.length < 90) || (shortTitle && startsBlock))) {
      endPara(); endList(); blocks.push({ t: 'h', text: l.replace(/:$/, '') }); return;
    }
    if (list && !para && /^[\p{Ll}(]/u.test(l)) { list.items[list.items.length - 1] += ' ' + l; return; }
    endList();
    if (!para) { para = [l]; return; }
    const prev = para[para.length - 1];
    if (/[.!?…:]["»”)]*$/.test(prev) && prev.length < maxLen * 0.7) { endPara(); para = [l]; }
    else { para.push(l); st.joined++; }
  });
  endPara(); endList();
  let html = '';
  blocks.forEach((b) => {
    if (b.t === 'h') {
      let t = b.text;
      if (isCaps(t)) { t = sentenceCase(t); st.caps++; }
      st.heads++;
      html += `<h3>${inline(t)}</h3>`;
    } else if (b.t === 'p') html += renderPara(b.text, st);
    else html += `<${b.t}>` + b.items.map((it) => `<li>${listItem(it, st)}</li>`).join('') + `</${b.t}>`;
  });
  return { html, st };
}

// métricas del texto original, para mostrar el antes y el después
export function measureRaw(raw) {
  const flat = raw.replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2').replace(/\s+/g, ' ');
  const sents = splitSentences(flat);
  const blocks = raw.split(/\n\s*\n+/).filter((b) => b.trim()).length;
  return { maxBefore: Math.max(0, ...sents.map(words)), blocksBefore: blocks };
}

// Tarjetas del resumen "qué hizo la adaptación".
export function reportCards(st, before, blocksAfter) {
  const cards = [];
  if (before) cards.push({ from: before.blocksBefore, big: blocksAfter, txt: 'bloques de lectura (antes → ahora)' });
  if (before && before.maxBefore > st.cfg.long) cards.push({ big: before.maxBefore, txt: `palabras en la frase más larga. Se muestra en ${st.chunks ? 'tramos cortos' : 'partes'}`, warn: true });
  if (st.joined + st.hyph) cards.push({ big: st.joined + st.hyph, txt: `cortes de renglón reparados${st.hyph ? ` (${st.hyph} palabras con guion)` : ''}` });
  if (st.split + st.semi) cards.push({ big: st.split + st.semi, txt: 'párrafos o frases divididos' });
  if (st.numw) cards.push({ big: st.numw, txt: 'números escritos en letras pasados a cifras' });
  if (st.caps) cards.push({ big: st.caps, txt: 'textos en MAYÚSCULAS pasados a minúsculas' });
  if (st.lists + st.heads) cards.push({ big: st.lists + st.heads, txt: 'títulos y listas detectados' });
  return cards.slice(0, 6);
}

// ---------- lectura de archivos ----------
// Texto de un PDF ya abierto con pdf.js, respetando renglones y párrafos.
export async function pdfToText(pdf, onProgress) {
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const tc = await (await pdf.getPage(i)).getTextContent();
    const lines = [];
    let cur = null;
    tc.items.forEach((it) => {
      if (!it.str && !it.hasEOL) return;
      const y = Math.round(it.transform[5]), h = Math.abs(it.transform[3]) || it.height || 10;
      if (!cur || Math.abs(cur.y - y) > h * 0.5) { cur = { y, text: '' }; lines.push(cur); }
      cur.text += it.str;
      if (it.hasEOL) cur = null;
    });
    const clean = lines.map((l) => ({ y: l.y, text: l.text.replace(/\s+/g, ' ').trim() })).filter((l) => l.text);
    const gaps = clean.slice(1).map((l, k) => Math.abs(clean[k].y - l.y)).sort((a, b) => a - b);
    const typical = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 14;
    clean.forEach((l, k) => { if (k > 0 && Math.abs(clean[k - 1].y - l.y) > typical * 1.45) out.push(''); out.push(l.text); });
    out.push('');
  }
  const text = out.join('\n');
  if (!text.trim()) throw new Error('scan');
  return text;
}

// HTML de mammoth sin scripts, estilos ni atributos on*.
export function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove());
  tpl.content.querySelectorAll('*').forEach((n) => [...n.attributes].forEach((a) => {
    if (/^on/i.test(a.name) || a.name === 'style' || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
  }));
  return tpl;
}

// Adapta el HTML de un Word (.docx) conservando títulos y listas.
export function docxAdapt(tpl, format) {
  const st = newStats(format);
  let html = '', rawForMeasure = '';
  [...tpl.content.children].forEach((el) => {
    const tag = el.tagName.toLowerCase(), text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text && !el.querySelector('img')) return;
    if (/^h[1-6]$/.test(tag)) {
      let t = text;
      if (isCaps(t)) { t = sentenceCase(t); st.caps++; }
      st.heads++;
      html += `<h3>${inline(t)}</h3>`;
      rawForMeasure += '\n\n' + text;
    } else if (tag === 'ul' || tag === 'ol') {
      st.lists++;
      html += `<${tag}>` + [...el.querySelectorAll(':scope > li')].map((li) => `<li>${listItem(li.textContent.replace(/\s+/g, ' ').trim(), st)}</li>`).join('') + `</${tag}>`;
      rawForMeasure += '\n\n' + text;
    } else if (tag === 'p') {
      html += renderPara(text, st);
      rawForMeasure += '\n\n' + text;
    } else html += el.outerHTML;
  });
  return { html, st, before: measureRaw(rawForMeasure) };
}

// pdf.js y mammoth se cargan recién cuando alguien abre un archivo.
let pdfjsPromise;
export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.js?url'),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
  }
  return pdfjsPromise;
}
export const loadMammoth = () => import('mammoth/mammoth.browser.js').then((m) => m.default || m);
