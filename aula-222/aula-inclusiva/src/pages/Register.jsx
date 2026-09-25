import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { ChoiceCard } from '../components/ui.jsx';
import { PROFILE_META } from '../components/ui.jsx';
import SupportPicker from '../components/SupportPicker.jsx';
import { DYSLEXIA_LEVELS, DYSLEXIA_LEVEL_KEYS } from '../lib/lectorClaro.js';

const STEPS = { ROLE: 0, PROFILE: 1, LEVEL: 2, DATA: 3 };

export default function Register() {
  const { register } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(STEPS.ROLE);
  const [role, setRole] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [level, setLevel] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pickRole = (r) => { setRole(r); setError(''); setStep(r === 'teacher' ? STEPS.DATA : STEPS.PROFILE); };
  const hasDyslexia = profiles.includes('dislexia');
  const hasCvd = profiles.includes('daltonismo');
  const confirmProfiles = () => {
    if (profiles.length === 0) return setError('Elegí al menos una opción.');
    setError('');
    setStep(hasDyslexia ? STEPS.LEVEL : STEPS.DATA);
  };
  const pickLevel = (l) => { setLevel(l); setError(''); setStep(STEPS.DATA); };

  const back = () => {
    setError('');
    if (step === STEPS.DATA) setStep(role === 'teacher' ? STEPS.ROLE : hasDyslexia ? STEPS.LEVEL : STEPS.PROFILE);
    else if (step === STEPS.LEVEL) setStep(STEPS.PROFILE);
    else setStep(STEPS.ROLE);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await register({ ...form, role, profiles: role === 'student' ? profiles : [], dyslexiaLevel: level || undefined });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    if (role === 'student' && hasCvd) nav('/test-daltonismo', { replace: true });
    else nav('/', { replace: true });
  };

  return (
    <div className="auth-shell">
      <div className={`auth-card ${step === STEPS.DATA ? '' : 'auth-wide'}`}>
        <div className="auth-brand">
          <i className="bi bi-mortarboard-fill" aria-hidden="true" /> Aula Inclusiva
        </div>

        {step === STEPS.ROLE && (
          <>
            <h1 className="h4 mb-1">Crear cuenta</h1>
            <p className="text-muted-strong mb-4">Primero contanos qué rol vas a tener.</p>
            <div className="choice-grid" role="radiogroup" aria-label="Elegí tu rol">
              <ChoiceCard icon="bi-easel2" title="Soy profesor" desc="Voy a crear materias y subir trabajos." onClick={() => pickRole('teacher')} selected={role === 'teacher'} />
              <ChoiceCard icon="bi-backpack2" title="Soy alumno" desc="Voy a unirme a materias con un código." onClick={() => pickRole('student')} selected={role === 'student'} />
            </div>
            <p className="text-center mt-4 mb-0">
              ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
            </p>
          </>
        )}

        {step === STEPS.PROFILE && (
          <>
            <button type="button" className="btn btn-sm btn-link px-0 mb-2" onClick={back}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Volver
            </button>
            <h1 className="h4 mb-1">¿Qué tipo de apoyo necesitás?</h1>
            <p className="text-muted-strong mb-4">
              Podés elegir <strong>más de uno</strong> (por ejemplo daltonismo y dislexia). Vamos a adaptar cada
              material que suba tu profesor según esto. Lo podés cambiar después desde "Mis apoyos".
            </p>
            {error && (
              <div className="auth-alert" role="alert">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
              </div>
            )}
            <SupportPicker value={profiles} onChange={(v) => { setProfiles(v); setError(''); }} />
            <button type="button" className="btn btn-primary text-white w-100 mt-3" onClick={confirmProfiles}>
              Continuar
            </button>
          </>
        )}

        {step === STEPS.LEVEL && (
          <>
            <button type="button" className="btn btn-sm btn-link px-0 mb-2" onClick={back}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Volver
            </button>
            <h1 className="h4 mb-1">¿Qué nivel de dislexia tenés?</h1>
            <p className="text-muted-strong mb-4">
              Con esto decidimos cuánto adaptar cada archivo: tamaño de letra, espacios, frases cortadas en tramos
              y regla de lectura. Si no estás seguro, elegí <strong>Moderado</strong>; lo podés cambiar cuando lees.
            </p>
            <div className="choice-grid" role="radiogroup" aria-label="Elegí tu nivel de dislexia">
              {DYSLEXIA_LEVEL_KEYS.map((k) => (
                <ChoiceCard key={k} icon={DYSLEXIA_LEVELS[k].icon} title={DYSLEXIA_LEVELS[k].label} desc={DYSLEXIA_LEVELS[k].desc}
                  onClick={() => pickLevel(k)} selected={level === k} />
              ))}
            </div>
          </>
        )}

        {step === STEPS.DATA && (
          <>
            <button type="button" className="btn btn-sm btn-link px-0 mb-2" onClick={back}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Volver
            </button>
            <h1 className="h4 mb-1">Tus datos</h1>
            <p className="text-muted-strong mb-4">
              {role === 'teacher'
                ? 'Cuenta de profesor.'
                : `Cuenta de alumno · ${profiles.map((p) => (p === 'dislexia' && level
                  ? `${PROFILE_META[p].short} ${DYSLEXIA_LEVELS[level].label.toLowerCase()}`
                  : PROFILE_META[p]?.short)).join(' + ')}`}
            </p>
            {error && (
              <div className="auth-alert" role="alert">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
              </div>
            )}
            <form onSubmit={onSubmit} noValidate>
              <div className="row g-2 mb-3">
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="firstName">Nombre</label>
                  <input id="firstName" className="form-control" required value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="lastName">Apellido</label>
                  <input id="lastName" className="form-control" required value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" className="form-control" autoComplete="username" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <input id="password" type="password" className="form-control" autoComplete="new-password" required minLength={4} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <div className="form-text">Al menos 4 caracteres.</div>
              </div>
              <button type="submit" className="btn btn-primary w-100 text-white" disabled={loading}>
                {loading ? 'Creando cuenta…' : role === 'student' && hasCvd ? 'Crear cuenta y hacer el test' : 'Crear cuenta'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
