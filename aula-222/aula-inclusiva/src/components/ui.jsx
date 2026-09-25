export const PROFILE_META = {
  comprension: { label: 'Problemas de comprensión', short: 'Comprensión', icon: 'bi-chat-square-text', desc: 'Textos más cortos, resúmenes y pasos claros.' },
  dislexia: { label: 'Dislexia', short: 'Dislexia', icon: 'bi-fonts', desc: 'Según tu nivel (leve, moderado o severo): tipografía legible, más espacio, regla de lectura y voz alta.' },
  daltonismo: { label: 'Daltonismo', short: 'Daltonismo', icon: 'bi-palette', desc: 'Test de color y una interfaz adaptada a tu tipo (protanopía, deuteranopía, tritanopía, acromatopsia y sus variantes anómalas).' },
  ninguno: { label: 'Ninguna por ahora', short: 'Sin adaptación', icon: 'bi-person-check', desc: 'Ves el contenido tal cual lo publica el profesor.' },
};

// Un alumno puede tener más de un apoyo (por ejemplo daltonismo + dislexia).
export const supportsOf = (user) => (user?.profiles?.length ? user.profiles : user?.profile ? [user.profile] : []);
export const hasSupport = (user, p) => user?.role === 'student' && supportsOf(user).includes(p);
export const supportsLabel = (user) =>
  supportsOf(user).map((p) => PROFILE_META[p]?.short).filter(Boolean).join(' + ');

// Colores seguros para daltonismo (paleta Okabe-Ito) + un ícono distinto por materia
export const COURSE_COLORS = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00'];
export const COURSE_ICONS = ['bi-flower1', 'bi-calculator', 'bi-globe-americas', 'bi-book', 'bi-lightbulb', 'bi-music-note-beamed'];

export const fmtDate = (t) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
export const fmtDateTime = (t) =>
  new Date(t).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDue = (s) =>
  s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha';

// ── Estado de una tarea para el alumno ──
// La tarea vence al terminar el día de entrega (23:59:59, hora local).
export const dueDeadline = (dueDate) => (dueDate ? new Date(`${dueDate}T23:59:59.999`).getTime() : null);
export const isLateAt = (dueDate, at) => {
  const deadline = dueDeadline(dueDate);
  return Boolean(deadline && at && at > deadline);
};

// 'done' entregada a tiempo · 'late' entregada fuera de término ·
// 'missing' vencida y sin entregar · 'pending' todavía está a tiempo.
export function taskStatus(dueDate, submittedAt, now = Date.now()) {
  if (submittedAt) return isLateAt(dueDate, submittedAt) ? 'late' : 'done';
  return isLateAt(dueDate, now) ? 'missing' : 'pending';
}

export const TASK_STATUS = {
  done: { label: 'Entregada', icon: 'bi-check-circle-fill' },
  late: { label: 'Entregada fuera de término', icon: 'bi-clock-history' },
  missing: { label: 'Sin entregar', icon: 'bi-exclamation-circle-fill' },
  pending: { label: 'Pendiente', icon: 'bi-hourglass-split' },
};

export function TaskStatus({ status, className = '' }) {
  const m = TASK_STATUS[status];
  return (
    <span className={`task-status st-${status} ${className}`}>
      <i className={`bi ${m.icon}`} aria-hidden="true" /> {m.label}
    </span>
  );
}

export function Avatar({ name, size = 36 }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function ProfileBadge({ profile }) {
  const m = PROFILE_META[profile];
  if (!m) return null;
  return (
    <span className="profile-badge">
      <i className={`bi ${m.icon}`} aria-hidden="true" /> {m.short}
    </span>
  );
}

export function Modal({ title, onClose, children, size }) {
  return (
    <>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5">{title}</h2>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export function ChoiceCard({ selected, onClick, icon, title, desc }) {
  return (
    <button type="button" role="radio" aria-checked={selected} className={`choice-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <i className={`bi ${icon} choice-icon`} aria-hidden="true" />
      <span className="choice-text">
        <strong>{title}</strong>
        {desc && <small>{desc}</small>}
      </span>
      <i className={`bi ${selected ? 'bi-check-circle-fill' : 'bi-circle'} choice-check`} aria-hidden="true" />
    </button>
  );
}
