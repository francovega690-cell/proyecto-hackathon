import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { PLATES, evaluate, precheck, CONFIRM_QUESTIONS } from '../lib/plates.js';
import { CVD_BASE, CVD_INFO, CVD_SIM_GROUPS, CVD_SIM_LABEL } from '../lib/cvd.js';
import { setCvdSim, useCvdSim } from '../lib/cvdSim.js';
import PlateCanvas from '../components/PlateCanvas.jsx';

const RESULT_COLOR = {
  deuteranopia: '#0d5f8a',
  protanopia: '#b3790a',
  tritanopia: '#b6295f',
  acromatopsia: '#2b2b2b',
  normal: '#2f6f5e',
  inconclusivo: '#6b6459',
};

const RESULT_ICON = {
  deuteranopia: 'bi-palette',
  protanopia: 'bi-palette',
  tritanopia: 'bi-palette',
  acromatopsia: 'bi-brightness-low',
  normal: 'bi-check-lg',
  inconclusivo: 'bi-question-lg',
};

const SIM_SAMPLE = ['#d62728', '#ff7f0e', '#e0a11c', '#2ca02c', '#17becf', '#0072b2', '#9467bd', '#e377c2'];

// Al final del test: el alumno puede ver la app simulada con cada tipo
// de daltonismo y, si quiere, quedarse con uno más preciso que el que
// detectó el test (por ejemplo, la variante "anómala" de su tipo).
function SimulationPicker({ detected, chosen, onChoose }) {
  const sim = useCvdSim();
  const detectedBase = CVD_BASE[detected];
  const groups = [...CVD_SIM_GROUPS].sort(
    (a, b) => Number(b.types.includes(detectedBase)) - Number(a.types.includes(detectedBase)),
  );

  return (
    <div className="sim-picker text-start mt-4">
      <h2 className="h6 mb-1"><i className="bi bi-eye" aria-hidden="true" /> Probá la simulación de cada tipo</h2>
      <p className="small text-muted-strong mb-3">
        Tocá un tipo y toda la pantalla se va a ver como la ve alguien con ese daltonismo.
        Si al activarlo <strong>casi no notás diferencia</strong>, es muy probable que ese sea tu tipo.
      </p>

      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id="testSimSwitch"
          checked={sim.on}
          onChange={() => setCvdSim((s) => ({ ...s, on: !s.on }))}
        />
        <label className="form-check-label" htmlFor="testSimSwitch">
          {sim.on ? `Simulando ${CVD_SIM_LABEL[sim.type]}` : 'Simulación desactivada'}
        </label>
      </div>

      {groups.map((g) => {
        const isDetected = g.types.includes(detectedBase);
        return (
          <div key={g.label} className={`sim-group ${isDetected ? 'detected' : ''}`}>
            <p className="cvd-sim-group-label">
              {g.label}
              {isDetected && (
                <span className="sim-detected-tag"><i className="bi bi-star-fill" aria-hidden="true" /> Según tu test</span>
              )}
            </p>
            <div className="cvd-sim-options">
              {g.types.map((t) => {
                const active = sim.on && sim.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`cvd-sim-option ${active ? 'active' : ''}`}
                    onClick={() => setCvdSim({ on: true, type: t })}
                    title={CVD_INFO[t].desc}
                  >
                    {chosen === t && <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />}
                    {CVD_SIM_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="sim-sample" aria-hidden="true">
        {SIM_SAMPLE.map((c) => <span key={c} style={{ background: c }} />)}
      </div>

      {sim.on && (
        <div className="sim-current">
          <p className="small mb-2">{CVD_INFO[sim.type].desc}</p>
          {chosen === sim.type ? (
            <p className="small fw-bold mb-0">
              <i className="bi bi-check-circle-fill" aria-hidden="true" /> Este es el tipo que se va a guardar como tuyo.
            </p>
          ) : (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChoose(sim.type)}>
              <i className="bi bi-person-check" aria-hidden="true" /> Este es mi tipo: guardar {CVD_SIM_LABEL[sim.type]}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestDaltonismo() {
  const { updateUser } = useStore();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('plates'); // 'plates' | 'confirm' | 'result'
  const [confirm, setConfirm] = useState({});
  const [result, setResult] = useState(null);
  // Tipo que se guarda: arranca con el del test, pero el alumno puede
  // cambiarlo desde la simulación.
  const [chosenType, setChosenType] = useState(null);

  const plate = PLATES[i];
  const totalSteps = PLATES.length + 1;
  const progress = Math.round(((phase === 'plates' ? i : PLATES.length + (phase === 'confirm' ? 0.5 : 1)) / totalSteps) * 100);

  const choosePlate = (tag) => {
    const next = { ...answers, [plate.id]: tag };
    setAnswers(next);
    if (i + 1 < PLATES.length) {
      setI(i + 1);
      return;
    }
    const pre = precheck(next);
    if (pre.suspectAcromatopsia) {
      setPhase('confirm');
    } else {
      setResult(evaluate(next, null));
      setPhase('result');
    }
  };

  const answerConfirm = (id, value) => {
    const next = { ...confirm, [id]: value };
    setConfirm(next);
    if (next.grayscale !== undefined && next.light !== undefined) {
      setResult(evaluate(answers, next));
      setPhase('result');
    }
  };

  const finalType = chosenType || result?.type;
  const info = result ? CVD_INFO[finalType] : null;
  const changedByUser = Boolean(chosenType && result && chosenType !== result.type);

  const finish = async (applyTheme) => {
    await updateUser({ cvdType: finalType, testDone: true, prefs: { filterOn: applyTheme } });
    nav('/inicio', { replace: true });
  };

  const retry = () => {
    setI(0); setAnswers({}); setConfirm({}); setResult(null); setChosenType(null); setPhase('plates');
  };

  return (
    <div className="test-shell">
      <div className="d-flex align-items-center gap-2 mb-3 text-muted-strong">
        <i className="bi bi-eye" aria-hidden="true" />
        <span>Test de percepción del color</span>
      </div>

      {(phase === 'plates' || phase === 'confirm') && (
        <div className="test-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress}%` }} />
        </div>
      )}

      {phase === 'plates' && (
        <>
          <p className="text-muted-strong mb-3">Lámina {i + 1} de {PLATES.length}</p>

          <div className="plate-wrap">
            <PlateCanvas plate={plate} />
            <h2 className="h6 mt-3 mb-0">¿Qué número ves en el círculo?</h2>
          </div>

          <div className="plate-options">
            {plate.options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`plate-option ${opt.tag === 'none' ? 'none-option' : ''}`}
                onClick={() => choosePlate(opt.tag)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'confirm' && (
        <div className="plate-wrap text-start">
          <p className="text-muted-strong mb-3">
            Dos preguntas más para confirmar el resultado.
          </p>
          {CONFIRM_QUESTIONS.map((q) => (
            <div key={q.id} className="confirm-q">
              <p>{q.text}</p>
              <div className="btn-group-yn">
                <button
                  type="button"
                  className={`btn ${confirm[q.id] === true ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                  onClick={() => answerConfirm(q.id, true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`btn ${confirm[q.id] === false ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                  onClick={() => answerConfirm(q.id, false)}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === 'result' && (
        <div className="plate-wrap text-center">
          <div className="result-badge" style={{ background: RESULT_COLOR[CVD_BASE[finalType] || finalType] }}>
            <i className={`bi ${RESULT_ICON[CVD_BASE[finalType] || finalType]}`} aria-hidden="true" />
          </div>
          <h1 className="h4 mb-1">{info.label}</h1>
          <p className="text-muted-strong mb-1">{info.desc}</p>
          {changedByUser ? (
            <p className="small text-muted-strong">
              Elegido por vos (el test había detectado: {CVD_INFO[result.type].short}).{' '}
              <button type="button" className="btn btn-sm btn-link p-0 align-baseline" onClick={() => setChosenType(null)}>
                Volver al del test
              </button>
            </p>
          ) : result.confidence && result.type !== 'inconclusivo' && (
            <p className="small text-muted-strong">
              Confianza del resultado: <strong>{result.confidence}</strong> · {result.normalCount} de {PLATES.length} láminas leídas como esperado
            </p>
          )}

          <SimulationPicker detected={result.type} chosen={finalType} onChoose={setChosenType} />

          {finalType === 'inconclusivo' ? (
            <button className="btn btn-primary text-white mt-3" onClick={retry}>Repetir el test</button>
          ) : finalType === 'normal' ? (
            <button className="btn btn-primary text-white mt-3" onClick={() => finish(false)}>Continuar a Aula Inclusiva</button>
          ) : (
            <>
              <p className="mt-3 mb-2">
                {finalType === 'acromatopsia'
                  ? 'Podemos adaptar la interfaz a escala de grises con buen contraste, y bajar un poco el brillo para que no te encandile.'
                  : 'Podemos cambiar los colores de toda la interfaz por una paleta pensada para tu tipo de daltonismo.'}
              </p>
              <div className="d-flex flex-column gap-2 align-items-stretch">
                <button className="btn btn-primary text-white" onClick={() => finish(true)}>
                  <i className="bi bi-magic" aria-hidden="true" /> Adaptar la interfaz y continuar
                </button>
                <button className="btn btn-outline-secondary" onClick={() => finish(false)}>
                  Continuar con los colores originales (puedo activarlo después)
                </button>
              </div>
            </>
          )}

          <button type="button" className="btn btn-sm btn-link mt-3" onClick={retry}>
            Repetir el test de nuevo
          </button>

          <p className="small text-muted-strong mt-3 mb-0">
            Esta prueba se basa en el principio de las láminas pseudoisocromáticas de Ishihara y es orientativa, no un diagnóstico médico.
          </p>
        </div>
      )}
    </div>
  );
}
