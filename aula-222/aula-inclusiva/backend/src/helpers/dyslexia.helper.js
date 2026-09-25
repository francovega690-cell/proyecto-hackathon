// Adaptación de texto para dislexia, portada del prototipo "Lector Claro"
// (lector-claro.zip) al backend de Aula Inclusiva.
//
// La idea es la misma que la del prototipo: el texto que llega (pegado o
// extraído de un PDF/Word) se "pega" en este mismo formateador, que sin
// cambiar ninguna palabra:
//   - une renglones cortados y repara palabras partidas con guion,
//   - separa párrafos largos en una frase por renglón,
//   - corta las frases de más de 25 palabras en tramos,
//   - pasa números escritos en letras a cifras ("setenta y cinco por ciento
//     (75%)" -> "75%") y resalta números, fechas y plazos,
//   - detecta títulos y listas.
// El resultado es HTML (ya escapado) listo para mostrarse con la tipografía
// y el espaciado pensados para dislexia (ver AdaptedReader.jsx / .lc-reading
// en styles.css).

const esc = (t) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const BULLET = /^\s*(?:[•·▪◦●‣∙*–—-]|\d{1,2}[.)]|[a-zA-Z][)])\s+/;
const isCaps = (s) => /[A-ZÁÉÍÓÚÑ]{3}/.test(s) && s === s.toUpperCase();
const sentenceCase = (s) => {
  const l = s.toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
};
const words = (s) => (s.match(/[\p{L}\d]+/gu) || []).length;
const LONG = 25;

// "setenta y cinco por ciento (75%)" -> "75%"
const NW =
  "cero|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieci\\p{L}+|veinte|veinti\\p{L}+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|\\p{L}+cientos|\\p{L}+cientas|mil|millón|millones";
const NUMWORDS = new RegExp(`(?<!\\p{L})(?:${NW})(?:\\s+(?:${NW}|y|por))*\\s*\\((\\d[\\d.,]*\\s*%?)\\)`, "giu");
const MONTHS = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const UNITS = "años|año|meses|mes|días|día|horas|hora|minutos|semanas|semana|puntos|punto|pesos|cuotas|cuatrimestres|clases|horas cátedra";
const NUMRX = new RegExp(
  `(?<![\\p{L}\\d])(\\d+(?:[.,]\\d+)*(?:\\s*%)?(?:\\s+de\\s+(?:${MONTHS}))?(?:\\s+(?:${UNITS}))?|(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)\\s+\\d{1,2}(?:\\s+de\\s+(?:${MONTHS}))?)(?![\\p{L}\\d])`,
  "giu",
);

function splitSentences(p) {
  return p
    .split(/(?<=[.!?…]["»”)]?)\s+(?=[\p{Lu}¿¡"«(\d])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function inline(s) {
  return esc(s)
    .replace(NUMRX, '<span class="n">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<span class="k">$1</span>');
}

function renderSentence(s, st) {
  const n = words(s);
  if (n <= LONG) return `<span class="s">${inline(s)}</span>`;
  st.long++;
  const parts = s.split(/(?<=[,;:])\s+/);
  const chunks = [];
  parts.forEach((p) => {
    if (chunks.length && (words(p) < 4 || words(chunks[chunks.length - 1]) < 4)) chunks[chunks.length - 1] += " " + p;
    else chunks.push(p);
  });
  st.chunks += chunks.length;
  return `<span class="s long">${chunks.map((c) => `<span class="c">${inline(c)}</span>`).join(" ")}</span>`;
}

function renderPara(text, st, split = true) {
  let t = text.replace(NUMWORDS, (m, d) => {
    st.numw++;
    return d;
  });
  if (isCaps(t) && t.length > 20) {
    t = sentenceCase(t);
    st.caps++;
  }
  let sents = splitSentences(t);
  sents = sents.flatMap((s) => {
    if (words(s) <= LONG || !/;\s/.test(s)) return [s];
    const bits = s.split(/;\s+/).map((b) => b.charAt(0).toUpperCase() + b.slice(1));
    st.semi += bits.length - 1;
    return bits.map((b, i) => (i < bits.length - 1 ? b.replace(/[,\s]*$/, "") + "." : b));
  });
  sents.forEach((s) => {
    st.sents++;
    st.maxAfter = Math.max(st.maxAfter, words(s));
  });
  const groups = [];
  if (split) {
    let cur = [];
    sents.forEach((s) => {
      if (cur.length >= 3 || (cur.length && cur.join(" ").length + s.length > 380)) {
        groups.push(cur);
        cur = [];
      }
      cur.push(s);
    });
    if (cur.length) groups.push(cur);
    if (groups.length > 1) st.split += groups.length - 1;
  } else groups.push(sents);
  return groups.map((g) => `<p>${g.map((s) => renderSentence(s, st)).join(" ")}</p>`).join("");
}

const newStats = () => ({
  joined: 0, split: 0, caps: 0, hyph: 0, lists: 0, heads: 0, numw: 0, semi: 0,
  long: 0, chunks: 0, sents: 0, maxAfter: 0,
});

// Recibe texto plano (pegado o extraído de un archivo) y devuelve HTML ya
// reorganizado para dislexia + estadísticas de lo que se adaptó.
export function autoFormat(raw) {
  const st = newStats();
  let txt = raw
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "") // guion blando
    .replace(/[ \t]+/g, " ")
    .replace(/[ ]{2,}/g, " ");
  txt = txt.replace(/(\p{L})-\n(\p{Ll})/gu, (m, a, b) => {
    st.hyph++;
    return a + b;
  });
  const lines = txt.split("\n").map((l) => l.trim());
  const maxLen = Math.max(40, ...lines.map((l) => l.length));
  const blocks = [];
  let para = null;
  let list = null;
  const endPara = () => {
    if (para) {
      blocks.push({ t: "p", text: para.join(" ") });
      para = null;
    }
  };
  const endList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };
  lines.forEach((l, i) => {
    if (!l) {
      endPara();
      endList();
      return;
    }
    if (/^#{1,3}\s/.test(l)) {
      endPara();
      endList();
      blocks.push({ t: "h", text: l.replace(/^#+\s*/, "") });
      return;
    }
    if (BULLET.test(l)) {
      endPara();
      if (!list) {
        list = { t: /^\s*\d/.test(l) ? "ol" : "ul", items: [] };
        st.lists++;
      }
      list.items.push(l.replace(BULLET, ""));
      return;
    }
    const next = lines[i + 1] || "";
    const startsBlock = i === 0 || lines[i - 1] === "";
    const shortTitle = l.length < 70 && l.split(" ").length <= 10 && !/[.,;!?…]$/.test(l) && /^[\p{Lu}¿¡0-9]/u.test(l);
    if (next && (!para || isCaps(l)) && ((isCaps(l) && l.length < 90) || (shortTitle && startsBlock))) {
      endPara();
      endList();
      blocks.push({ t: "h", text: l.replace(/:$/, "") });
      return;
    }
    if (list && !para && /^[\p{Ll}(]/u.test(l)) {
      list.items[list.items.length - 1] += " " + l;
      return;
    }
    endList();
    if (!para) {
      para = [l];
      return;
    }
    const prev = para[para.length - 1];
    if (/[.!?…:]["»”)]*$/.test(prev) && prev.length < maxLen * 0.7) {
      endPara();
      para = [l];
    } else {
      para.push(l);
      st.joined++;
    }
  });
  endPara();
  endList();

  let html = "";
  blocks.forEach((b) => {
    if (b.t === "h") {
      let t = b.text;
      if (isCaps(t)) {
        t = sentenceCase(t);
        st.caps++;
      }
      st.heads++;
      html += `<h3>${inline(t)}</h3>`;
    } else if (b.t === "p") {
      html += renderPara(b.text, st);
    } else {
      html +=
        `<${b.t}>` +
        b.items.map((it) => `<li>${renderPara(it, st, false).replace(/^<p>|<\/p>$/g, "")}</li>`).join("") +
        `</${b.t}>`;
    }
  });
  return { html, stats: st };
}

// ── Extracción de texto desde el archivo que sube el profesor ──
export async function extractTextFromFile(buffer, ext) {
  if (ext === "pdf") {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default || mod;
    const data = await pdfParse(buffer);
    if (!data.text || !data.text.trim()) {
      throw new Error("scan");
    }
    return data.text;
  }
  if (ext === "docx") {
    const mod = await import("mammoth");
    const mammoth = mod.default || mod;
    const res = await mammoth.extractRawText({ buffer });
    return res.value;
  }
  throw new Error("tipo");
}
