import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';

export default function Login() {
  const { login } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    nav('/', { replace: true });
  };

  const fillDemo = (mail) => { setEmail(mail); setPassword('1234'); setError(''); };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <i className="bi bi-mortarboard-fill" aria-hidden="true" /> Aula Inclusiva
        </div>
        <h1 className="h4 mb-1">Iniciar sesión</h1>
        <p className="text-muted-strong mb-4">Entrá con tu correo y contraseña.</p>

        {error && (
          <div className="auth-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" className="form-control" autoComplete="username" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <div className="input-group">
              <input id="password" type={showPw ? 'text' : 'password'} className="form-control" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-100 text-white" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-4 mb-0">
          ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
        </p>

        <hr className="divider" />
        <p className="small text-muted-strong mb-2">Probar la demo con un usuario de ejemplo:</p>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fillDemo('profe@demo.com')}>Profesora</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fillDemo('mateo@demo.com')}>Alumno · daltonismo</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fillDemo('sofia@demo.com')}>Alumna · dislexia</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fillDemo('lucas@demo.com')}>Alumno · comprensión</button>
        </div>
      </div>
    </div>
  );
}
