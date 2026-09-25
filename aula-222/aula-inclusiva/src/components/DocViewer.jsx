import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store.jsx';
import { FILE_BASE } from '../lib/api.js';
import { CVD_BASE, CVD_INFO, CVD_SIM_MATRIX, cvdDocFilter } from '../lib/cvd.js';
import { hasSupport } from './ui.jsx';
import {
  DYSLEXIA_LEVELS, DYSLEXIA_LEVEL_KEYS, LC_FONTS, LC_THEMES, autoFormat, contrastRatio, docxAdapt, levelOf,
  loadLcSettings, loadMammoth, loadPdfjs, measureRaw, pdfToText, reportCards, sanitizeHtml, saveLcSettings,
} from '../lib/lectorClaro.js';

// ─────────────────────────────────────────────────────────────
// Visor del PDF/Word que sube el profesor, dentro de la página (no en otra
// pestaña), para poder adaptarlo a cada alumno:
//   · alumno con daltonismo → las páginas se ven con los colores
//     corregidos para su tipo (o en grises con brillo regulable).
//   · alumno con dislexia (o problemas de comprensión) → el documento se
//     abre normal y con "Adaptar para disléxico" pasa al Lector Claro según
//     su nivel (leve / moderado / severo): fuente, espaciado, fondo, color
//     de letra, regla de lectura, voz alta…
//   · profesor y alumnos sin adaptación → el documento tal cual.
// Solo el alumno ve la versión adaptada a su perfil.
// ─────────────────────────────────────────────────────────────

// Quién puede usar "Adaptar para disléxico" y con qué texto de botón.
export function readerAdaptLabel(user) {
  if (hasSupport(user, 'dislexia')) return 'Adaptar para disléxico';
  if (hasSupport(user, 'comprension')) return 'Adaptar para leer mejor';
  return '';
}

class UserError extends Error {}

export default function DocViewer({ post, onClose, adapt = false }) {
  const { user } = useStore();
  const canAdapt = Boolean(readerAdaptLabel(user));
  const [adapting, setAdapting] = useState(adapt && canAdapt);
  // Daltonismo y dislexia pueden ir juntos: la corrección de color se aplica
  // también dentro del lector adaptado.
  const colorMode = hasSupport(user, 'daltonismo') && Boolean(CVD_BASE[user.cvdType]);
  // ¿El PDF tiene colores? Si es blanco y negro no hay nada que corregir.
  const [docHasColor, setDocHasColor] = useState(null);
  const onPageColor = useCallback((colorful) => setDocHasColor((prev) => prev === true || colorful), []);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [colorFix, setColorFix] = useState(true);
  const [brightness, setBrightness] = useState(0.85);
  const scrollRef = useRef(null);
  const downloadUrl = post.fileUrl ? `${FILE_BASE}${post.fileUrl}${post.fileUrl.startsWith('/api/') ? '?download=1' : ''}` : '';

  // Descarga el archivo con la sesión del usuario y lo abre acá mismo.
  useEffect(() => {
    let alive = true;
    let opened = null;
    (async () => {
      try {
        const kind = post.fileType === 'pdf' ? 'pdf' : post.fileType === 'docx' ? 'docx'
          : /^(jpe?g|png)$/.test(post.fileType) ? 'image' : 'other';
        if (kind === 'other') { setDoc({ kind }); return; }
        const res = await fetch(`${FILE_BASE}${post.fileUrl}`, { credentials: 'include' });
        if (!res.ok) throw new UserError(res.status === 403 ? 'No tenés acceso a este archivo.' : 'No se pudo descargar el archivo.');
        if (kind === 'image') {
          const url = URL.createObjectURL(await res.blob());
          opened = { destroy: () => URL.revokeObjectURL(url) };
          if (alive) setDoc({ kind, url });
          return;
        }
        const buf = await res.arrayBuffer();
        if (kind === 'pdf') {
          const pdfjs = await loadPdfjs();
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
          opened = pdf;
          if (alive) setDoc({ kind, pdf });
        } else {
          const mammoth = await loadMammoth();
          const r = await mammoth.convertToHtml({ arrayBuffer: buf });
          const tpl = sanitizeHtml(r.value);
          const div = document.createElement('div');
          div.appendChild(tpl.content.cloneNode(true));
          if (alive) setDoc({ kind, tpl, html: div.innerHTML });
        }
      } catch (err) {
        console.warn('No se pudo abrir el archivo:', err);
        if (alive) setError(err instanceof UserError ? err.message : 'No se pudo abrir el archivo. Puede estar dañado o protegido con contraseña.');
      }
    })();
    return () => {
      alive = false;
      if (opened) opened.destroy();
    };
  }, [post.fileUrl, post.fileType]);

  // Pantalla completa: se bloquea el scroll de atrás y Esc cierra.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const isMono = colorMode && CVD_BASE[user.cvdType] === 'acromatopsia';
  const docFilter = colorMode && colorFix ? cvdDocFilter(user.cvdType, { brightness }) : 'none';
  const viewable = doc && (doc.kind === 'pdf' || doc.kind === 'docx');
  const showLector = adapting && viewable;

  const nativeView = (extra = {}) => doc && (
    doc.kind === 'pdf' ? (
      <PdfPages pdf={doc.pdf} zoom={zoom} filter={extra.filter || docFilter} scrollRef={scrollRef} onPageColor={colorMode ? onPageColor : undefined} />
    ) : doc.kind === 'image' ? (
      <img className="dv-image" src={doc.url} alt={post.fileName} style={{ filter: extra.filter || docFilter }} />
    ) : doc.kind === 'docx' ? (
      <div className="dv-docx" style={{ filter: extra.filter || docFilter }} dangerouslySetInnerHTML={{ __html: doc.html }} />
    ) : (
      <div className="dv-message">
        <i className="bi bi-file-earmark-word" aria-hidden="true" />
        <p>Los Word viejos (.doc) no se pueden mostrar en la página. Descargalo para abrirlo.</p>
      </div>
    )
  );

  return createPortal(
    <div className="dv-overlay" role="dialog" aria-modal="true" aria-label={post.fileName}>
      <header className="dv-head">
        <div className="dv-title">
          <i className={`bi ${post.fileType === 'pdf' ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark-word-fill'}`} aria-hidden="true" />
          <div className="min-w-0">
            <strong className="dv-name">{post.fileName}</strong>
            <small className="d-block text-muted-strong">
              {showLector && (
                <><i className="bi bi-eyeglasses" aria-hidden="true" /> Adaptado para vos
                  {hasSupport(user, 'dislexia') && ` · dislexia, nivel ${levelOf(user.dyslexiaLevel).label.toLowerCase()}`}
                  {colorMode && ` · colores para ${CVD_INFO[user.cvdType].short.toLowerCase()}`}</>
              )}
              {!showLector && colorMode && <><i className="bi bi-palette" aria-hidden="true" /> {isMono ? 'Escala de grises con brillo regulable' : `Colores corregidos para ${CVD_INFO[user.cvdType].short}`}</>}
              {!showLector && !colorMode && post.title}
            </small>
          </div>
        </div>
        <div className="dv-tools">
          {colorMode && viewable && (
            <div className="seg" role="group" aria-label="Colores del documento">
              <button type="button" aria-pressed={colorFix} onClick={() => setColorFix(true)}>
                <i className="bi bi-stars" aria-hidden="true" /> Adaptado
              </button>
              <button type="button" aria-pressed={!colorFix} onClick={() => setColorFix(false)}>Original</button>
            </div>
          )}
          {isMono && colorFix && (
            <label className="dv-bright">
              <i className="bi bi-brightness-low" aria-hidden="true" /> Brillo
              <input type="range" min="0.5" max="1" step="0.05" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
            </label>
          )}
          {doc?.kind === 'pdf' && !showLector && <ZoomControls zoom={zoom} setZoom={setZoom} />}
          {canAdapt && viewable && (
            adapting ? (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAdapting(false)}>
                <i className="bi bi-file-earmark" aria-hidden="true" /> Ver sin adaptar
              </button>
            ) : (
              <button type="button" className="btn btn-sm dyslexia-btn" onClick={() => setAdapting(true)}>
                <i className="bi bi-eyeglasses" aria-hidden="true" /> {readerAdaptLabel(user)}
              </button>
            )
          )}
          {downloadUrl && (
            <a className="btn btn-sm btn-outline-secondary" href={downloadUrl}>
              <i className="bi bi-download" aria-hidden="true" /> <span className="d-none d-sm-inline">Descargar</span>
            </a>
          )}
          <button type="button" className="btn btn-sm btn-primary text-white" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" /> Cerrar
          </button>
        </div>
      </header>

      {colorMode && !isMono && !showLector && doc?.kind === 'pdf' && docHasColor === false && (
        <div className="dv-bw-note" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            Este PDF está en blanco y negro: no tiene colores que corregir, por eso se ve igual en <strong>Adaptado</strong> y <strong>Original</strong>.
            {canAdapt && <> Para cambiar el fondo, la letra o usar la regla, tocá <strong>{readerAdaptLabel(user)}</strong>.</>}
          </span>
        </div>
      )}

      <div className="dv-body" ref={scrollRef}>
        {error ? (
          <div className="dv-message" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : !doc ? (
          <div className="dv-message"><i className="bi bi-arrow-repeat spin" aria-hidden="true" /><p>Abriendo {post.fileName}…</p></div>
        ) : showLector ? (
          <LectorClaro
            doc={doc}
            nativeView={nativeView}
            zoomControls={doc.kind === 'pdf' && <ZoomControls zoom={zoom} setZoom={setZoom} />}
            cvdFilter={docFilter}
          />
        ) : (
          nativeView()
        )}
      </div>
    </div>,
    document.body,
  );
}

function ZoomControls({ zoom, setZoom }) {
  return (
    <div className="seg" role="group" aria-label="Zoom">
      <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Alejar"><i className="bi bi-zoom-out" aria-hidden="true" /></button>
      <button type="button" onClick={() => setZoom(1)} aria-label="Ajustar al ancho">{Math.round(zoom * 100)}%</button>
      <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Acercar"><i className="bi bi-zoom-in" aria-hidden="true" /></button>
    </div>
  );
}

// ─────────── PDF nativo (pdf.js dibujando cada página en un canvas) ───────────
function PdfPages({ pdf, zoom, filter, scrollRef, onPageColor }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [aspect, setAspect] = useState(1.414);

  useEffect(() => {
    const el = wrapRef.current;
    // Se mide ya (el observer no avisa si la pestaña está en segundo plano).
    setWidth(Math.floor(el.clientWidth));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    pdf.getPage(1).then((p) => {
      const v = p.getViewport({ scale: 1 });
      if (alive) setAspect(v.height / v.width);
    });
    return () => { alive = false; };
  }, [pdf]);

  const pageWidth = Math.round(Math.min(width, 920) * zoom);
  return (
    <div ref={wrapRef} className="dv-pages">
      {pageWidth > 0 && Array.from({ length: pdf.numPages }, (_, i) => (
        <PdfPage key={i} pdf={pdf} num={i + 1} total={pdf.numPages} width={pageWidth} aspect={aspect} filter={filter} scrollRef={scrollRef}
          onPageColor={i < 3 ? onPageColor : undefined} />
      ))}
    </div>
  );
}

// Revisa una muestra de píxeles: si casi todos son grises, la página es blanco y negro.
function canvasHasColor(canvas) {
  try {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let colored = 0, total = 0;
    for (let i = 0; i < data.length; i += 4 * 37) {
      total++;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 40) colored++;
    }
    return colored / Math.max(total, 1) > 0.002;
  } catch {
    return true;
  }
}

function PdfPage({ pdf, num, total, width, aspect, filter, scrollRef, onPageColor }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(aspect);

  // Solo se dibujan las páginas que están cerca de la pantalla.
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { root: scrollRef.current, rootMargin: '800px 0px' },
    );
    io.observe(holderRef.current);
    return () => io.disconnect();
  }, [scrollRef]);

  useEffect(() => {
    if (!visible || !width) return undefined;
    let task = null;
    let cancelled = false;
    pdf.getPage(num).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (width / base.width) * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      setRatio(base.height / base.width);
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      task.promise.then(() => { if (!cancelled && onPageColor) onPageColor(canvasHasColor(canvas)); })
        .catch(() => { /* cancelado por zoom o cierre */ });
    });
    return () => {
      cancelled = true;
      if (task) task.cancel();
    };
  }, [visible, width, pdf, num, onPageColor]);

  return (
    <figure className="dv-page" ref={holderRef} style={{ width, height: Math.round(width * ratio), filter }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} aria-label={`Página ${num} de ${total}`} role="img" />
      <figcaption className="dv-page-num">{num} / {total}</figcaption>
    </figure>
  );
}

// ─────────── Regla de lectura ───────────
// Sigue al cursor (o al dedo) y sombrea todo lo que está arriba y abajo del
// renglón, dejando a la vista solo la franja que se está leyendo.
function useReadingRuler(enabled) {
  const [top, setTop] = useState(null);
  const hostRef = useRef(null);
  const move = useCallback((e) => {
    if (!enabled || !hostRef.current) return;
    setTop(e.clientY - hostRef.current.getBoundingClientRect().top);
  }, [enabled]);
  useEffect(() => { if (!enabled) setTop(null); }, [enabled]);
  const handlers = enabled ? { onPointerMove: move, onPointerDown: move, onPointerLeave: () => setTop(null) } : {};
  return { hostRef, top: enabled ? top : null, handlers };
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

// ─────────── Lector Claro con niveles de dislexia ───────────
// `cvdFilter`: corrección de color del alumno si además tiene daltonismo
// (se suma sobre el PDF con sus colores).
function LectorClaro({ doc, nativeView, zoomControls, cvdFilter }) {
  const { user, updateUser } = useStore();
  const isDyslexic = hasSupport(user, 'dislexia');
  const cvdType = hasSupport(user, 'daltonismo') && CVD_BASE[user.cvdType] ? user.cvdType : null;
  const level = isDyslexic ? (user.dyslexiaLevel || 'moderado') : 'moderado';
  const [source, setSource] = useState(null); // { raw } del PDF o { raw, tpl } del Word
  const [adaptError, setAdaptError] = useState('');
  const [status, setStatus] = useState('Preparando el documento…');
  const [view, setView] = useState('texto');
  const [S, setS] = useState(() => loadLcSettings(user.id, level, user.readerPrefs?.settings));
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(null);
  const readingRef = useRef(null);
  const ruler = useReadingRuler(S.ruler && view !== 'orig');

  // Las preferencias viven en la cuenta del alumno (así sus paletas y ajustes
  // lo siguen a cualquier computadora) y además en este navegador.
  const prefsRef = useRef(user.readerPrefs || {});
  useEffect(() => { prefsRef.current = user.readerPrefs || {}; }, [user.readerPrefs]);
  const savePrefs = useCallback((patch) => {
    prefsRef.current = { ...prefsRef.current, ...patch };
    return updateUser({ readerPrefs: prefsRef.current });
  }, [updateUser]);

  useEffect(() => {
    saveLcSettings(user.id, S);
    const t = setTimeout(() => savePrefs({ settings: S }), 1200);
    return () => clearTimeout(t);
  }, [user.id, S, savePrefs]);

  // Texto del archivo, para reorganizarlo.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (doc.kind === 'pdf') {
          const raw = await pdfToText(doc.pdf, (i, n) => alive && setStatus(`Leyendo página ${i} de ${n}…`));
          if (alive) setSource({ raw });
        } else {
          const raw = [...doc.tpl.content.children].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
          if (alive) setSource({ raw, tpl: doc.tpl });
        }
        if (alive) setStatus('');
      } catch (err) {
        if (!alive) return;
        setView('pdf');
        setAdaptError(err.message === 'scan'
          ? 'Este PDF no tiene texto seleccionable (parece un escaneo), así que no se puede reorganizar. Igual podés usar la regla, el fondo y el color de letra sobre el PDF.'
          : 'No se pudo reorganizar el texto de este archivo. Igual podés usar la regla, el fondo y el color de letra sobre el PDF.');
        setStatus('');
      }
    })();
    return () => { alive = false; };
  }, [doc]);

  // La reorganización depende del nivel: en severo los tramos y párrafos son más cortos.
  const adapted = useMemo(() => {
    if (!source) return null;
    const format = levelOf(level).format;
    if (source.tpl) return docxAdapt(source.tpl, format);
    const { html, st } = autoFormat(source.raw, format);
    return { html, st, before: measureRaw(source.raw) };
  }, [source, level]);

  const changeLevel = (lvl) => {
    setS((s) => ({ ...levelOf(lvl).preset, rate: s.rate }));
    if (lvl !== user.dyslexiaLevel) updateUser({ dyslexiaLevel: lvl });
  };

  // ---------- voz alta ----------
  const stopSpeak = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speakingRef.current = false;
    setSpeaking(false);
    readingRef.current?.querySelectorAll('.speaking').forEach((n) => n.classList.remove('speaking'));
  }, []);
  useEffect(() => stopSpeak, [stopSpeak]);

  const startSpeak = () => {
    if (!('speechSynthesis' in window)) { setStatus('Tu navegador no permite leer en voz alta.'); return; }
    if (speakingRef.current) { stopSpeak(); return; }
    const items = view !== 'texto' || !readingRef.current
      ? (source?.raw || '').split(/\n\s*\n+/).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).map((text) => ({ text }))
      : [...readingRef.current.querySelectorAll('h3,p,li,td')].filter((n) => n.textContent.trim()).map((node) => ({ text: node.textContent, node }));
    if (!items.length) return;
    const voice = window.speechSynthesis.getVoices().find((v) => /^es/i.test(v.lang));
    speakingRef.current = true;
    setSpeaking(true);
    let i = 0;
    const next = () => {
      readingRef.current?.querySelectorAll('.speaking').forEach((n) => n.classList.remove('speaking'));
      if (!speakingRef.current || i >= items.length) { stopSpeak(); return; }
      const it = items[i++];
      if (it.node) {
        it.node.classList.add('speaking');
        it.node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const u = new SpeechSynthesisUtterance(it.text);
      u.lang = voice ? voice.lang : 'es-ES';
      if (voice) u.voice = voice;
      u.rate = S.rate;
      u.onend = next;
      u.onerror = () => stopSpeak();
      window.speechSynthesis.speak(u);
    };
    next();
  };

  const changeView = (v) => { stopSpeak(); setView(v); };
  const toggleRuler = () => setS((s) => ({ ...s, ruler: !s.ruler }));

  const [shR, shG, shB] = hexToRgb(S.rulerColor || '#000000').map((v) => Math.round(v * 255));
  const shade = `rgba(${shR}, ${shG}, ${shB}, ${S.rulerAlpha ?? 0.45})`;
  const pageVars = {
    '--r-font': S.font, '--r-size': `${S.size}px`, '--r-ls': `${S.ls}em`, '--r-ws': `${S.ws}em`,
    '--r-lh': S.lh, '--r-w': `${S.w}ch`, '--r-bg': S.bg, '--r-fg': S.fg, '--r-hl': S.hl || S.fg, '--r-shade': shade,
  };
  const readingCls = ['lc-reading', S.perLine && 'per-line', S.chunks && 'chunks', S.nums && 'nums'].filter(Boolean).join(' ');
  const blocksAfter = adapted ? (adapted.html.match(/<(h3|p|li)[\s>]/g) || []).length : 0;
  const cards = adapted ? reportCards(adapted.st, adapted.before, blocksAfter) : [];

  // Fondo y color de letra sobre el PDF: blanco → fondo elegido, negro →
  // color de letra. Si además tiene daltonismo, después se corrige el color.
  const [bgR, bgG, bgB] = hexToRgb(S.bg);
  const [fgR, fgG, fgB] = hexToRgb(S.fg);
  const pdfFilter = [S.pdfColors && 'url(#lc-pdf-colors)', cvdFilter && cvdFilter !== 'none' && cvdFilter].filter(Boolean).join(' ') || 'none';

  return (
    <div className="lc-layout">
      <svg className="cvd-sim-defs" aria-hidden="true" focusable="false">
        <filter id="lc-pdf-colors" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope={bgR - fgR} intercept={fgR} />
            <feFuncG type="linear" slope={bgG - fgG} intercept={fgG} />
            <feFuncB type="linear" slope={bgB - fgB} intercept={fgB} />
          </feComponentTransfer>
        </filter>
      </svg>

      <LectorPanel S={S} setS={setS} view={view} level={level} isDyslexic={isDyslexic} onLevel={changeLevel}
        cvdType={cvdType} palettes={user.readerPrefs?.palettes || []} onPalettes={(palettes) => savePrefs({ palettes })} />

      <div className="lc-main">
        {adaptError && <div className="lc-note" role="status"><i className="bi bi-info-circle" aria-hidden="true" /> {adaptError}</div>}

        <div className="lc-viewbar">
          <div className="seg" role="group" aria-label="Cómo ver el documento">
            <button type="button" aria-pressed={view === 'texto'} disabled={!adapted} onClick={() => changeView('texto')}>
              <i className="bi bi-stars" aria-hidden="true" /> Texto adaptado
            </button>
            <button type="button" aria-pressed={view === 'pdf'} onClick={() => changeView('pdf')}>
              <i className="bi bi-file-earmark-richtext" aria-hidden="true" /> {doc.kind === 'pdf' ? 'PDF' : 'Documento'} con mis colores
            </button>
            <button type="button" aria-pressed={view === 'orig'} onClick={() => changeView('orig')}>Original</button>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {view !== 'texto' && zoomControls}
            <button type="button" className={`btn btn-sm ruler-btn ${S.ruler ? 'on' : ''}`} aria-pressed={S.ruler}
              onClick={toggleRuler} disabled={view === 'orig'}>
              <i className="bi bi-distribute-vertical" aria-hidden="true" /> Regla de lectura: {S.ruler ? 'activada' : 'desactivada'}
            </button>
            <button type="button" className={`btn btn-sm ${speaking ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
              aria-pressed={speaking} onClick={startSpeak} disabled={!source}>
              <i className={`bi ${speaking ? 'bi-stop-fill' : 'bi-volume-up'}`} aria-hidden="true" /> {speaking ? 'Detener lectura' : 'Leer en voz alta'}
            </button>
          </div>
        </div>
        {status && <div className="lc-status" role="status">{status}</div>}
        {S.ruler && view !== 'orig' && (
          <div className="lc-status"><i className="bi bi-mouse" aria-hidden="true" /> Pasá el cursor (o el dedo) por el renglón que estás leyendo: se sombrea lo de arriba y lo de abajo.</div>
        )}
        {view === 'pdf' && cvdType && cvdFilter && cvdFilter !== 'none' && (
          <div className="lc-status"><i className="bi bi-palette" aria-hidden="true" /> También se corrigen los colores para tu {CVD_INFO[cvdType].short.toLowerCase()}.</div>
        )}

        {view === 'texto' && cards.length > 0 && (
          <div className="lc-report" aria-live="polite">
            {cards.map((c, idx) => (
              <div key={idx} className={`lc-stat ${c.warn ? 'warn' : ''}`}>
                <b>{c.from != null && <span className="from">{c.from}</span>}{c.big}</b>
                <span>{c.txt}</span>
              </div>
            ))}
          </div>
        )}

        {view === 'orig' && <div className="lc-orig">{nativeView({ filter: 'none' })}</div>}

        {view === 'pdf' && (
          <div className="lc-ruler-host" ref={ruler.hostRef} style={{ '--r-shade': shade }} {...ruler.handlers}>
            {ruler.top != null && <div className="lc-ruler lc-ruler-pdf" style={{ top: ruler.top, height: S.rulerH }} />}
            {nativeView({ filter: pdfFilter })}
          </div>
        )}

        {view === 'texto' && (
          !adapted ? (
            <div className="dv-message"><i className="bi bi-arrow-repeat spin" aria-hidden="true" /><p>{status || 'Adaptando…'}</p></div>
          ) : (
            <div className="lc-page lc-ruler-host" ref={ruler.hostRef} style={pageVars} {...ruler.handlers}>
              {ruler.top != null && <div className="lc-ruler" style={{ top: ruler.top }} />}
              <article ref={readingRef} className={readingCls} tabIndex={0} dangerouslySetInnerHTML={{ __html: adapted.html }} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Range({ id, label, value, min, max, step, fmt, onChange }) {
  return (
    <label htmlFor={id} className="lc-field">
      <span className="lc-row">{label} <span className="lc-val">{fmt(value)}</span></span>
      <input type="range" id={id} min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

function Toggle({ id, checked, onChange, title, hint }) {
  return (
    <label className="lc-toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{title}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

// Contraste tal como lo percibe el alumno con su tipo de daltonismo.
function simulateHex(hex, type) {
  const m = CVD_SIM_MATRIX[type];
  const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const out = [0, 1, 2].map((i) => Math.min(1, Math.max(0, m[i * 3] * r + m[i * 3 + 1] * g + m[i * 3 + 2] * b)));
  return '#' + out.map((v) => Math.round(toSrgb(v) * 255).toString(16).padStart(2, '0')).join('');
}

const PALETTE_KEYS = ['bg', 'fg', 'hl', 'rulerColor', 'rulerAlpha'];
const samePalette = (p, S) => p.bg.toLowerCase() === S.bg.toLowerCase() && p.fg.toLowerCase() === S.fg.toLowerCase()
  && (p.hl || '').toLowerCase() === (S.hl || '').toLowerCase();

// Panel de ajustes: nivel, regla, fuente, espaciado, colores/paletas y cómo se arma el texto.
function LectorPanel({ S, setS, view, level, isDyslexic, onLevel, cvdType, palettes, onPalettes }) {
  const [odStatus, setOdStatus] = useState('');
  const [paletteName, setPaletteName] = useState('');
  const [paletteMsg, setPaletteMsg] = useState('');
  const set = (k) => (v) => setS((s) => ({ ...s, [k]: v }));
  const r = contrastRatio(S.bg, S.fg);
  const pill = (x) => (x >= 7 ? { t: 'Muy bueno (AAA)', ok: true } : x >= 4.5 ? { t: 'Suficiente (AA)', ok: true } : { t: 'Bajo: difícil de leer', ok: false });
  const rCvd = cvdType ? contrastRatio(simulateHex(S.bg, cvdType), simulateHex(S.fg, cvdType)) : null;
  const onPdf = view !== 'texto';

  const loadOpenDyslexic = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const face = new FontFace('OpenDyslexicUser', await f.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      setOdStatus('Fuente cargada.');
      setS((s) => ({ ...s }));
    } catch {
      setOdStatus('No se pudo leer ese archivo de fuente. Probá con el .otf de OpenDyslexic Regular.');
    }
  };

  const savePalette = async () => {
    const name = paletteName.trim() || `Mi paleta ${palettes.length + 1}`;
    const p = { id: Date.now(), name: name.slice(0, 30) };
    PALETTE_KEYS.forEach((k) => { p[k] = S[k]; });
    const res = await onPalettes([...palettes.filter((x) => x.name !== p.name), p].slice(-12));
    setPaletteName('');
    setPaletteMsg(res?.ok === false ? 'No se pudo guardar la paleta. Probá de nuevo.' : `Guardada: ${p.name}`);
  };

  return (
    <aside className="lc-panel" aria-label="Ajustes de lectura">
      {isDyslexic && (
        <fieldset>
          <legend>Nivel de dislexia</legend>
          <div className="lc-levels" role="radiogroup" aria-label="Nivel de dislexia">
            {DYSLEXIA_LEVEL_KEYS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={level === k} className="lc-level" onClick={() => onLevel(k)}>
                <i className={`bi ${DYSLEXIA_LEVELS[k].icon}`} aria-hidden="true" /> {DYSLEXIA_LEVELS[k].label}
              </button>
            ))}
          </div>
          <p className="lc-hint">{DYSLEXIA_LEVELS[level].desc} Elegir un nivel vuelve a sus valores; después podés ajustar todo.</p>
        </fieldset>
      )}

      <fieldset>
        <legend>Regla de lectura</legend>
        <label className="lc-switch" htmlFor="lcRulerSwitch">
          <input type="checkbox" role="switch" id="lcRulerSwitch" checked={S.ruler} onChange={(e) => set('ruler')(e.target.checked)} />
          <span>{S.ruler ? 'Activada' : 'Desactivada'}<small>Sombrea arriba y abajo del renglón que está bajo el cursor.</small></span>
        </label>
        <Range id="lcRulerH" label="Alto de la regla en el PDF" value={S.rulerH} min={18} max={90} step={2} fmt={(v) => `${v} px`} onChange={set('rulerH')} />
        <div className="lc-custom">
          <label htmlFor="lcRulerColor">Color de la sombra <input type="color" id="lcRulerColor" value={S.rulerColor || '#000000'} onChange={(e) => set('rulerColor')(e.target.value)} /></label>
          <Range id="lcRulerAlpha" label="Intensidad" value={S.rulerAlpha ?? 0.45} min={0.15} max={0.85} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={set('rulerAlpha')} />
        </div>
      </fieldset>

      <fieldset disabled={onPdf}>
        <legend>Fuente</legend>
        {onPdf && <p className="lc-hint">La fuente y el espaciado se cambian en <strong>Texto adaptado</strong> (el PDF es una imagen de la hoja).</p>}
        <label htmlFor="lcFont" className="lc-field">Tipografía
          <select id="lcFont" className="form-select form-select-sm" value={S.font} onChange={(e) => set('font')(e.target.value)}>
            {LC_FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        {S.font.includes('OpenDyslexic') && (
          <div className="lc-hint">
            OpenDyslexic se usa si está instalada en tu equipo. Si no, bajala gratis en{' '}
            <a href="https://opendyslexic.org" target="_blank" rel="noopener noreferrer">opendyslexic.org</a> y cargá el archivo acá:
            <label className="btn btn-sm btn-outline-secondary mt-1 lc-file">
              Cargar OpenDyslexic (.otf/.ttf/.woff)
              <input type="file" accept=".otf,.ttf,.woff,.woff2" onChange={loadOpenDyslexic} />
            </label>
            {odStatus && <span className="d-block">{odStatus}</span>}
          </div>
        )}
        <Range id="lcSize" label="Tamaño" value={S.size} min={14} max={36} step={1} fmt={(v) => `${v} px`} onChange={set('size')} />
      </fieldset>

      <fieldset disabled={onPdf}>
        <legend>Espaciado</legend>
        <Range id="lcLs" label="Entre letras" value={S.ls} min={0} max={0.35} step={0.01} fmt={(v) => `${(+v).toFixed(2)} em`} onChange={set('ls')} />
        <Range id="lcWs" label="Entre palabras" value={S.ws} min={0} max={0.8} step={0.02} fmt={(v) => `${(+v).toFixed(2)} em`} onChange={set('ws')} />
        <Range id="lcLh" label="Interlineado" value={S.lh} min={1.2} max={2.8} step={0.05} fmt={(v) => (+v).toFixed(2)} onChange={set('lh')} />
        <Range id="lcW" label="Ancho de línea" value={S.w} min={40} max={90} step={1} fmt={(v) => `${v} caracteres`} onChange={set('w')} />
        <button type="button" className="btn btn-sm btn-outline-secondary"
          onClick={() => { const p = levelOf(level).preset; setS((s) => ({ ...s, size: p.size, ls: p.ls, ws: p.ws, lh: p.lh, w: p.w })); }}>
          Volver al espaciado de mi nivel
        </button>
      </fieldset>

      <fieldset>
        <legend>Colores y paletas</legend>
        <div className="lc-swatches" role="group" aria-label="Paletas sugeridas">
          {LC_THEMES.map((t) => {
            const active = t.bg.toLowerCase() === S.bg.toLowerCase() && t.fg.toLowerCase() === S.fg.toLowerCase();
            return (
              <button key={t.name} type="button" className="lc-sw" aria-pressed={active} style={{ background: t.bg, color: t.fg }}
                onClick={() => setS((s) => ({ ...s, bg: t.bg, fg: t.fg }))}>
                <span className="aa">Aa</span>{t.name}
              </button>
            );
          })}
        </div>

        <div className="lc-custom lc-custom-3">
          <label htmlFor="lcBg">Fondo <input type="color" id="lcBg" value={S.bg} onChange={(e) => set('bg')(e.target.value)} /></label>
          <label htmlFor="lcFg">Letra <input type="color" id="lcFg" value={S.fg} onChange={(e) => set('fg')(e.target.value)} /></label>
          <label htmlFor="lcHl">Resaltado <input type="color" id="lcHl" value={S.hl || '#F4D35E'} onChange={(e) => set('hl')(e.target.value)} /></label>
        </div>
        <div className="lc-preview" style={{ background: S.bg, color: S.fg }}>
          Así se ve tu texto, con <span style={{ background: `color-mix(in srgb, ${S.hl || S.fg} 45%, transparent)`, fontWeight: 700, borderRadius: 4, padding: '0 .2em' }}>15 de octubre</span> resaltado.
        </div>
        <div className="lc-contrast">
          Contraste <strong>{r.toFixed(1)} : 1</strong>
          <span className={`lc-pill ${pill(r).ok ? 'ok' : 'warn'}`}>{pill(r).t}</span>
        </div>
        {cvdType && (
          <div className="lc-contrast">
            Para tu {CVD_INFO[cvdType].short.toLowerCase()} <strong>{rCvd.toFixed(1)} : 1</strong>
            <span className={`lc-pill ${pill(rCvd).ok ? 'ok' : 'warn'}`}>{pill(rCvd).t}</span>
          </div>
        )}

        <div className="lc-mypal">
          <span className="lc-field">Mis paletas</span>
          {palettes.length === 0 && <p className="lc-hint">Todavía no guardaste ninguna. Elegí tus colores y guardalos con un nombre.</p>}
          {palettes.length > 0 && (
            <ul className="lc-mypal-list">
              {palettes.map((p) => (
                <li key={p.id}>
                  <button type="button" className="lc-mypal-item" aria-pressed={samePalette(p, S)} style={{ background: p.bg, color: p.fg }}
                    onClick={() => setS((s) => { const n = { ...s }; PALETTE_KEYS.forEach((k) => { if (p[k] != null) n[k] = p[k]; }); return n; })}>
                    <span className="lc-mypal-dot" style={{ background: p.hl || p.fg }} aria-hidden="true" /> {p.name}
                  </button>
                  <button type="button" className="lc-mypal-del" aria-label={`Borrar la paleta ${p.name}`}
                    onClick={() => onPalettes(palettes.filter((x) => x.id !== p.id))}>
                    <i className="bi bi-x" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" placeholder="Nombre (ej: Para leer de noche)" maxLength={30}
              value={paletteName} onChange={(e) => setPaletteName(e.target.value)} aria-label="Nombre de la paleta" />
            <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={savePalette}>
              <i className="bi bi-bookmark-plus" aria-hidden="true" /> Guardar
            </button>
          </div>
          {paletteMsg && <p className="lc-hint" role="status">{paletteMsg}</p>}
        </div>

        <Toggle id="lcPdfColors" checked={S.pdfColors} onChange={set('pdfColors')} title="Usar estos colores también en el PDF"
          hint="El blanco de la hoja pasa a tu fondo y el negro de la letra a tu color." />
        <p className="lc-hint">Conviene evitar blanco puro y negro puro: un fondo crema o pastel con letra gris oscuro reduce el deslumbramiento.</p>
      </fieldset>

      <fieldset>
        <legend>Cómo se arma el texto</legend>
        <Toggle id="lcPerLine" checked={S.perLine} onChange={set('perLine')} title="Una frase por renglón" hint="Cada frase empieza en un renglón nuevo." />
        <Toggle id="lcChunks" checked={S.chunks} onChange={set('chunks')} title="Cortar frases largas en tramos"
          hint={`Las frases de más de ${levelOf(level).format.long} palabras se muestran por partes.`} />
        <Toggle id="lcNums" checked={S.nums} onChange={set('nums')} title="Resaltar números, fechas y plazos" />
        <Range id="lcRate" label="Velocidad de la voz" value={S.rate} min={0.6} max={1.4} step={0.05} fmt={(v) => `${(+v).toFixed(2)}×`} onChange={set('rate')} />
      </fieldset>

      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setS({ ...levelOf(level).preset })}>
        Restablecer todo a mi nivel
      </button>
    </aside>
  );
}
