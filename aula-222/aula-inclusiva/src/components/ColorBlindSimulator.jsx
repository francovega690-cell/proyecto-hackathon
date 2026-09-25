import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ALL_CVD_TYPES, CVD_FIX_MATRIX, CVD_INFO, CVD_SIM_GROUPS, CVD_SIM_LABEL, CVD_SIM_MATRIX,
  cvdFilterId, cvdFixFilterId, toFeMatrix,
} from '../lib/cvd.js';
import { setCvdSim, useCvdSim } from '../lib/cvdSim.js';

// Simulador de daltonismo para toda la app (inspirado en coblind.com).
// Aplica un filtro SVG (feColorMatrix) sobre <html>, así se simula todo lo
// que hay en pantalla: textos, botones, imágenes, PDFs, láminas…
// Vive en la barra superior (Navbar); el estado está en lib/cvdSim.js
// (compartido con el resultado del test).

const SAMPLE = ['#d62728', '#ff7f0e', '#e0a11c', '#2ca02c', '#17becf', '#0072b2', '#9467bd', '#e377c2'];

// Definiciones SVG de los filtros: simulación (para el simulador) y
// corrección (para los PDF que ve el alumno con daltonismo). Se montan
// siempre, aunque no haya sesión, porque el simulador puede quedar prendido.
export function CvdFilterDefs() {
  return createPortal(
    <svg className="cvd-sim-defs" aria-hidden="true" focusable="false">
      <defs>
        {ALL_CVD_TYPES.map((t) => (
          <filter key={t} id={cvdFilterId(t)} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={toFeMatrix(CVD_SIM_MATRIX[t])} />
          </filter>
        ))}
        {Object.entries(CVD_FIX_MATRIX).map(([t, m]) => (
          <filter key={`fix-${t}`} id={cvdFixFilterId(t)} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={toFeMatrix(m)} />
          </filter>
        ))}
      </defs>
    </svg>,
    document.body,
  );
}

export default function SimulatorMenu({ canRetakeTest = false }) {
  const { on, type } = useCvdSim();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const nav = useNavigate();

  // Atajo: Alt+Shift+D prende/apaga el simulador. Esc cierra el panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setCvdSim((s) => ({ ...s, on: !s.on }));
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const pick = (t) => setCvdSim({ on: true, type: t });

  return (
    <div className="cvd-sim" ref={wrapRef}>
      <button
        type="button"
        className={`btn btn-sm cvd-sim-btn ${on ? 'on' : 'btn-outline-secondary'}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <i className={`bi ${on ? 'bi-eye-fill' : 'bi-eye'}`} aria-hidden="true" />{' '}
        <span className="d-none d-md-inline">{on ? `Simulando: ${CVD_SIM_LABEL[type]}` : 'Simulación'}</span>
        <span className="d-md-none">{on ? CVD_SIM_LABEL[type] : 'Simular'}</span>
      </button>

      {open && (
        <div className="cvd-sim-panel" role="dialog" aria-label="Simulador de daltonismo">
          <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
            <div>
              <p className="fw-bold mb-0"><i className="bi bi-eye" aria-hidden="true" /> Simulador de daltonismo</p>
              <small className="text-muted-strong">Mirá la app como la ve cada tipo de daltonismo.</small>
            </div>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setOpen(false)} />
          </div>

          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="cvdSimSwitch"
              checked={on}
              onChange={() => setCvdSim((s) => ({ ...s, on: !s.on }))}
            />
            <label className="form-check-label" htmlFor="cvdSimSwitch">
              {on ? 'Simulación activada' : 'Simulación desactivada'}
            </label>
          </div>

          <div role="radiogroup" aria-label="Tipo de daltonismo">
            {CVD_SIM_GROUPS.map((g) => (
              <div key={g.label} className="cvd-sim-group">
                <p className="cvd-sim-group-label">{g.label}</p>
                <div className="cvd-sim-options">
                  {g.types.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={on && type === t}
                      className={`cvd-sim-option ${on && type === t ? 'active' : ''}`}
                      onClick={() => pick(t)}
                      title={CVD_INFO[t].desc}
                    >
                      {CVD_SIM_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="cvd-sim-sample" aria-hidden="true">
            {SAMPLE.map((c) => <span key={c} style={{ background: c }} />)}
          </div>
          <p className="small text-muted-strong mb-0">
            {on ? CVD_INFO[type].desc : 'Elegí un tipo para activar la simulación.'}
            <br />
            <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> activa o desactiva.
          </p>
          {canRetakeTest && (
            <button type="button" className="btn btn-sm btn-link p-0 mt-2" onClick={() => { setOpen(false); nav('/test-daltonismo'); }}>
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Repetir mi test de color
            </button>
          )}
        </div>
      )}
    </div>
  );
}
