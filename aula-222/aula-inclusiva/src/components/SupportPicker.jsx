import { PROFILE_META } from './ui.jsx';
import { DYSLEXIA_LEVELS, DYSLEXIA_LEVEL_KEYS } from '../lib/lectorClaro.js';

const ORDER = ['dislexia', 'daltonismo', 'comprension'];

// Elegir uno o más apoyos (ej: daltonismo + dislexia). "Ninguno" apaga los demás.
// Si `level`/`onLevel` vienen, también muestra el nivel de dislexia.
export default function SupportPicker({ value, onChange, level, onLevel }) {
  const toggle = (p) => {
    if (p === 'ninguno') return onChange(value.includes('ninguno') ? [] : ['ninguno']);
    const rest = value.filter((x) => x !== 'ninguno');
    onChange(rest.includes(p) ? rest.filter((x) => x !== p) : ORDER.filter((x) => x === p || rest.includes(x)));
  };

  return (
    <div className="support-picks" role="group" aria-label="Tipos de apoyo">
      {[...ORDER, 'ninguno'].map((p) => (
        <label key={p} className="support-pick">
          <input type="checkbox" checked={value.includes(p)} onChange={() => toggle(p)} />
          <i className={`bi ${PROFILE_META[p].icon}`} aria-hidden="true" />
          <span><strong>{PROFILE_META[p].label}</strong><small>{PROFILE_META[p].desc}</small></span>
        </label>
      ))}
      {onLevel && value.includes('dislexia') && (
        <div>
          <span className="form-label d-block mb-1">Nivel de dislexia</span>
          <div className="lc-levels" role="radiogroup" aria-label="Nivel de dislexia">
            {DYSLEXIA_LEVEL_KEYS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={level === k} className="lc-level" onClick={() => onLevel(k)}>
                <i className={`bi ${DYSLEXIA_LEVELS[k].icon}`} aria-hidden="true" /> {DYSLEXIA_LEVELS[k].label}
              </button>
            ))}
          </div>
          {level && <p className="small text-muted-strong mt-1 mb-0">{DYSLEXIA_LEVELS[level].desc}</p>}
        </div>
      )}
    </div>
  );
}
