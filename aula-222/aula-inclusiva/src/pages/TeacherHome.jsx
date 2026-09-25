import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { Modal, COURSE_COLORS, COURSE_ICONS } from '../components/ui.jsx';

export default function TeacherHome() {
  const { myCourses, createCourse, loadCourses, coursesLoading } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: 0, icon: 0 });
  const [justCreated, setJustCreated] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError('');
    try {
      const course = await createCourse(form);
      setForm({ name: '', description: '', color: 0, icon: 0 });
      setOpen(false);
      setJustCreated(course);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tus materias</h1>
          <p>Creá una materia virtual y compartí el código con tus alumnos.</p>
        </div>
        <button className="btn btn-primary text-white" onClick={() => setOpen(true)}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> Nueva materia
        </button>
      </div>

      {justCreated && (
        <div className="auth-alert ok" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <span>
            <strong>{justCreated.name}</strong> se creó. Código para tus alumnos: <strong>{justCreated.code}</strong>
            <button type="button" className="btn btn-sm btn-link" onClick={() => setJustCreated(null)}>Cerrar</button>
          </span>
        </div>
      )}

      {coursesLoading && myCourses.length === 0 ? (
        <p className="text-muted-strong">Cargando tus materias…</p>
      ) : myCourses.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-easel2" aria-hidden="true" />
          <p className="mb-1"><strong>Todavía no creaste ninguna materia.</strong></p>
          <p className="mb-3">Creá la primera para empezar a compartir avisos, marcos teóricos y tareas.</p>
          <button className="btn btn-primary text-white" onClick={() => setOpen(true)}>Crear materia</button>
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
                <p>{c.description || 'Sin descripción'}</p>
                <span className="course-code">Código: {c.code}</span>
                <div className="small text-muted-strong mt-2">
                  <i className="bi bi-people" aria-hidden="true" /> {c.members.length} alumno{c.members.length === 1 ? '' : 's'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Nueva materia" onClose={() => setOpen(false)}>
          {error && (
            <div className="auth-alert" role="alert">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
            </div>
          )}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="cname">Nombre de la materia</label>
              <input id="cname" className="form-control" required autoFocus value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Biología 2°A" />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="cdesc">Descripción (opcional)</label>
              <textarea id="cdesc" className="form-control" rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mb-3">
              <span className="form-label d-block">Color</span>
              <div className="d-flex gap-2">
                {COURSE_COLORS.map((col, idx) => (
                  <button key={col} type="button" aria-label={`Color ${idx + 1}`} aria-pressed={form.color === idx}
                    onClick={() => setForm({ ...form, color: idx })}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: col, border: form.color === idx ? '3px solid var(--ink)' : '1px solid var(--line)',
                    }} />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <span className="form-label d-block">Ícono</span>
              <div className="d-flex gap-2 flex-wrap">
                {COURSE_ICONS.map((ic, idx) => (
                  <button key={ic} type="button" aria-label={`Ícono ${idx + 1}`} aria-pressed={form.icon === idx}
                    className="btn btn-outline-secondary"
                    style={form.icon === idx ? { borderColor: 'var(--ink)', background: 'var(--ink)', color: '#fff' } : undefined}
                    onClick={() => setForm({ ...form, icon: idx })}>
                    <i className={`bi ${ic}`} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary text-white w-100">Crear materia</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
