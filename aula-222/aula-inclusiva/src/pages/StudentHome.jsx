import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.jsx';
import {
  Modal, COURSE_COLORS, COURSE_ICONS, PROFILE_META, fmtDateTime, fmtDue, TaskStatus, taskStatus,
  supportsOf, hasSupport,
} from '../components/ui.jsx';
import { levelOf } from '../lib/lectorClaro.js';
import SupportPicker from '../components/SupportPicker.jsx';

const FEED_TYPE = {
  aviso: { label: 'Aviso', icon: 'bi-megaphone' },
  teoria: { label: 'Marco teórico', icon: 'bi-journal-text' },
  tarea: { label: 'Tarea', icon: 'bi-clipboard-check' },
};

// Guardado por navegador (es solo para marcar "Nuevo"; si falla, no pasa nada).
const lastSeenKey = (userId) => `aula:lastSeen:${userId}`;
const readLastSeen = (userId) => {
  try {
    return Number(localStorage.getItem(lastSeenKey(userId))) || 0;
  } catch {
    return 0;
  }
};
const writeLastSeen = (userId) => {
  try {
    localStorage.setItem(lastSeenKey(userId), String(Date.now()));
  } catch {
    /* sin almacenamiento local: no marcamos "Nuevo" */
  }
};

export default function StudentHome() {
  const { user, myCourses, joinCourse, loadCourses, coursesLoading, feed, loadFeed, updateUser } = useStore();
  const [editSupports, setEditSupports] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // Novedades: se cargan al entrar y se refrescan solas cada 30 segundos
  // mientras la pestaña está visible, así lo que sube el profesor aparece sin
  // recargar la página.
  useEffect(() => {
    loadFeed();
    const refresh = () => {
      if (document.visibilityState === 'visible') loadFeed();
    };
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadFeed]);

  // "Nuevo" = publicado después de la última vez que el alumno abrió el inicio.
  const [lastSeen] = useState(() => readLastSeen(user.id));
  useEffect(() => () => writeLastSeen(user.id), [user.id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setJoining(true);
    const res = await joinCourse(code);
    setJoining(false);
    if (!res.ok) return setError(res.error);
    setOk(`Te uniste a ${res.course.name}.`);
    setCode('');
    setOpen(false);
    loadFeed();
  };

  const supportText = supportsOf(user)
    .map((p) => (p === 'dislexia' ? `Dislexia (nivel ${levelOf(user.dyslexiaLevel).label.toLowerCase()})` : PROFILE_META[p]?.short))
    .filter(Boolean)
    .join(' + ');
  // Tareas vencidas que el alumno todavía no entregó.
  const missingTasks = feed.filter((p) => p.type === 'tarea' && taskStatus(p.dueDate, p.submittedAt) === 'missing');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tus materias</h1>
          <p>
            <i className="bi bi-universal-access" aria-hidden="true" /> Contenido adaptado para: <strong>{supportText}</strong>
            {hasSupport(user, 'daltonismo') && !user.cvdType && ' · falta hacer el test de color'}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setEditSupports(true)}>
            <i className="bi bi-sliders" aria-hidden="true" /> Mis apoyos
          </button>
          <button className="btn btn-primary text-white" onClick={() => setOpen(true)}>
            <i className="bi bi-key" aria-hidden="true" /> Unirme con un código
          </button>
        </div>
      </div>

      {ok && (
        <div className="auth-alert ok" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <span>{ok} <button type="button" className="btn btn-sm btn-link" onClick={() => setOk('')}>Cerrar</button></span>
        </div>
      )}

      {missingTasks.length > 0 && (
        <div className="late-note" role="status">
          <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
          <div>
            <strong>
              Tenés {missingTasks.length} tarea{missingTasks.length === 1 ? '' : 's'} sin entregar.
            </strong>{' '}
            Todavía podés entregarlas: van a quedar como entregadas fuera de término.
            <ul className="mb-0 mt-1 ps-3">
              {missingTasks.map((p) => (
                <li key={p.id}>
                  <Link to={`/materia/${p.courseId}`} style={{ color: 'inherit' }}>{p.title}</Link>
                  {' '}· {p.courseName} · venció {fmtDue(p.dueDate)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {feed.length > 0 && (
        <section aria-labelledby="novedades-title">
          <h2 id="novedades-title" className="h5 mb-2">
            <i className="bi bi-bell" aria-hidden="true" /> Novedades
          </h2>
          <ul className="feed-list">
            {feed.slice(0, 8).map((p) => {
              const meta = FEED_TYPE[p.type] || FEED_TYPE.aviso;
              const isNew = p.createdAt > lastSeen;
              return (
                <li key={p.id}>
                  <Link to={`/materia/${p.courseId}`} className="feed-item">
                    <span className="feed-icon" style={{ background: COURSE_COLORS[p.courseColor % COURSE_COLORS.length] }}>
                      <i className={`bi ${meta.icon}`} aria-hidden="true" />
                    </span>
                    <span className="feed-main">
                      <span className="feed-title d-block">{p.title}</span>
                      <span className="feed-meta">
                        {isNew && <span className="feed-new">Nuevo</span>}
                        <span>{meta.label} · {p.courseName}</span>
                        <span>· {fmtDateTime(p.createdAt)}</span>
                        {p.type === 'tarea' && p.dueDate && <span className="post-due">· Entrega: {fmtDue(p.dueDate)}</span>}
                        {p.type === 'tarea' && <TaskStatus status={taskStatus(p.dueDate, p.submittedAt)} />}
                        {p.fileName && (
                          <span>
                            · <i className={`bi ${p.fileType === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-word'}`} aria-hidden="true" /> {p.fileName}
                          </span>
                        )}
                      </span>
                    </span>
                    <i className="bi bi-chevron-right text-muted-strong" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <h2 className="h5 mb-2">Materias</h2>
        </section>
      )}

      {coursesLoading && myCourses.length === 0 ? (
        <p className="text-muted-strong">Cargando tus materias…</p>
      ) : myCourses.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-backpack2" aria-hidden="true" />
          <p className="mb-1"><strong>Todavía no estás en ninguna materia.</strong></p>
          <p className="mb-3">Pedile el código a tu profesor y sumate con el botón de arriba.</p>
          <button className="btn btn-primary text-white" onClick={() => setOpen(true)}>Unirme con un código</button>
        </div>
      ) : (
        <div className="course-grid">
          {myCourses.map((c) => (
            <Link key={c.id} to={`/materia/${c.id}`} className="course-card">
              <div className="course-banner" style={{ background: COURSE_COLORS[c.color % COURSE_COLORS.length] }}>
                <i className={`bi ${COURSE_ICONS[c.icon % COURSE_ICONS.length]}`} aria-hidden="true" />
              </div>
              <div className="course-body">
                <h3>{c.name}</h3>
                <p>Profesor/a: {c.teacherName || '—'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {editSupports && <SupportsModal user={user} updateUser={updateUser} onClose={() => setEditSupports(false)} />}

      {open && (
        <Modal title="Unirme a una materia" onClose={() => setOpen(false)}>
          {error && (
            <div className="auth-alert" role="alert">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
            </div>
          )}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="code">Código de la materia</label>
              <input id="code" className="form-control text-uppercase" required autoFocus maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej: BIO2A7" />
              <div className="form-text">Te lo comparte tu profesor cuando crea la materia.</div>
            </div>
            <button type="submit" className="btn btn-primary text-white w-100" disabled={joining}>
              {joining ? 'Uniéndote…' : 'Unirme'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Cambiar los apoyos del alumno (por ejemplo sumar dislexia a su daltonismo).
// Si suma daltonismo y todavía no hizo el test, la app lo lleva al test.
function SupportsModal({ user, updateUser, onClose }) {
  const [profiles, setProfiles] = useState(supportsOf(user));
  const [level, setLevel] = useState(user.dyslexiaLevel || 'moderado');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (profiles.length === 0) return setError('Elegí al menos una opción.');
    setSaving(true);
    const res = await updateUser({ profiles, ...(profiles.includes('dislexia') ? { dyslexiaLevel: level } : {}) });
    setSaving(false);
    if (res?.ok === false) return setError(res.error);
    onClose();
  };

  return (
    <Modal title="Mis apoyos" onClose={onClose}>
      <p className="text-muted-strong small">
        Podés tener más de uno a la vez. Los archivos que suba tu profesor se adaptan a todos los que elijas.
      </p>
      {error && (
        <div className="auth-alert" role="alert">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
      <SupportPicker value={profiles} onChange={(v) => { setProfiles(v); setError(''); }} level={level} onLevel={setLevel} />
      {profiles.includes('daltonismo') && !user.cvdType && (
        <p className="small mt-2 mb-0"><i className="bi bi-info-circle" aria-hidden="true" /> Al guardar vas a hacer el test de color.</p>
      )}
      <button type="button" className="btn btn-primary text-white w-100 mt-3" onClick={save} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </Modal>
  );
}
