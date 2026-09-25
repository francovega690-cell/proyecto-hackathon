import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { Avatar, hasSupport } from './ui.jsx';
import SimulatorMenu from './ColorBlindSimulator.jsx';

export default function Navbar() {
  const { user, logout } = useStore();
  const nav = useNavigate();
  const isDaltonicStudent = hasSupport(user, 'daltonismo');

  return (
    <header className="app-navbar">
      <div className="container d-flex align-items-center justify-content-between gap-3">
        <Link to="/" className="brand-link">
          <i className="bi bi-mortarboard-fill" aria-hidden="true" /> Aula Inclusiva
        </Link>

        <div className="d-flex align-items-center gap-2 position-relative">
          <SimulatorMenu canRetakeTest={isDaltonicStudent} />

          <div className="user-chip">
            <Avatar name={user.name} size={32} />
            <span className="d-none d-sm-block">
              <strong>{user.name}</strong>
              <small>{user.role === 'teacher' ? 'Profesor' : 'Alumno'}</small>
            </span>
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={async () => { await logout(); nav('/login'); }}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Salir
          </button>
        </div>
      </div>
    </header>
  );
}
