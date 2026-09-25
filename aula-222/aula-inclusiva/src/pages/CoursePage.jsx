import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import {
  Modal, COURSE_COLORS, COURSE_ICONS, fmtDateTime, fmtDue, Avatar, TaskStatus, taskStatus, isLateAt, hasSupport,
} from '../components/ui.jsx';
import DocViewer, { readerAdaptLabel } from '../components/DocViewer.jsx';
import { FILE_BASE } from '../lib/api.js';
import { CVD_INFO } from '../lib/cvd.js';

const TYPE_META = {
  aviso: { label: 'Aviso', pill: 'pill-aviso', icon: 'bi-megaphone' },
  teoria: { label: 'Marco teórico', pill: 'pill-teoria', icon: 'bi-journal-text' },
  tarea: { label: 'Tarea', pill: 'pill-tarea', icon: 'bi-clipboard-check' },
};

export default function CoursePage() {
  // Los ids de la API son numéricos; el parámetro de la URL siempre llega
  // como string, así que lo convertimos una sola vez acá.
  const courseId = Number(useParams().courseId);
  const { db, user, createPost, loadCourseDetail, courseDetailLoading, courseDetailError } = useStore();
  const course = db.courses.find((c) => c.id === courseId);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => { loadCourseDetail(courseId); }, [courseId, loadCourseDetail]);

  // Mientras la materia está abierta, cada 20 segundos se piden las
  // novedades al servidor: si el profesor sube una tarea, a los alumnos les
  // aparece sola, sin recargar la página. Se pausa con la pestaña oculta.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadCourseDetail(courseId, { silent: true });
    };
    const timer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [courseId, loadCourseDetail]);

  const posts = useMemo(
    () => db.posts.filter((p) => p.courseId === courseId).sort((a, b) => b.createdAt - a.createdAt),
    [db.posts, courseId]
  );

  if (!course) {
    if (courseDetailLoading) {
      return <div className="page"><p className="text-muted-strong">Cargando materia…</p></div>;
    }
    return (
      <div className="page">
        <p>{courseDetailError || 'No encontramos esa materia.'}</p>
        <Link to="/inicio">Volver al inicio</Link>
      </div>
    );
  }

  const isTeacher = user.role === 'teacher';

  return (
    <div className="page">
      <div className="course-banner mb-3" style={{ background: COURSE_COLORS[course.color % COURSE_COLORS.length], borderRadius: 14 }}>
        <i className={`bi ${COURSE_ICONS[course.icon % COURSE_ICONS.length]} me-2`} style={{ fontSize: '1.6rem' }} aria-hidden="true" />
        <div>
          <div className="fw-bold" style={{ fontSize: '1.15rem' }}>{course.name}</div>
          <div className="small" style={{ opacity: 0.9 }}>
            {isTeacher ? `Código para tus alumnos: ${course.code}` : `Profesor/a: ${course.teacherName || '—'}`}
          </div>
        </div>
      </div>

      <div className="page-header">
        <p className="mb-0 text-muted-strong">
          {course.description || 'Avisos, marcos teóricos y tareas de la materia.'}
        </p>
        {isTeacher && (
          <button className="btn btn-primary text-white" onClick={() => setOpenNew(true)}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Nueva publicación
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox" aria-hidden="true" />
          <p className="mb-0">
            {isTeacher ? 'Todavía no publicaste nada en esta materia.' : 'Tu profesor todavía no publicó nada acá.'}
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} course={course} isTeacher={isTeacher} />)
      )}

      {openNew && <NewPostModal courseId={course.id} onClose={() => setOpenNew(false)} createPost={createPost} />}
    </div>
  );
}

const TASK_FILE_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_FILE_MB = 15;

function NewPostModal({ courseId, onClose, createPost }) {
  const [type, setType] = useState('aviso');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pickFile = (f) => {
    setFileError('');
    if (!f) return setFile(null);
    const okExt = /\.(pdf|docx?)$/i.test(f.name);
    if (!okExt) {
      setFile(null);
      setFileError('Solo se aceptan archivos PDF o Word (.doc / .docx).');
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      setFileError(`El archivo supera los ${MAX_FILE_MB}MB.`);
      return;
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setError('');
    setSaving(true);
    try {
      await createPost({
        courseId, type, title: title.trim(), body: body.trim(),
        dueDate: type === 'tarea' ? dueDate : '',
        file,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Nueva publicación" onClose={onClose}>
      {error && (
        <div className="auth-alert" role="alert">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
      <form onSubmit={submit}>
        <div className="mb-3">
          <span className="form-label d-block">Tipo de publicación</span>
          <div className="d-flex gap-2">
            {Object.entries(TYPE_META).map(([key, m]) => (
              <button key={key} type="button" className="btn btn-outline-secondary flex-fill"
                style={type === key ? { borderColor: 'var(--ink)', background: 'var(--ink)', color: '#fff' } : undefined}
                onClick={() => setType(key)}>
                <i className={`bi ${m.icon}`} aria-hidden="true" /> {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="ptitle">Título</label>
          <input id="ptitle" className="form-control" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="pbody">Contenido</label>
          <textarea id="pbody" className="form-control" rows={5} required value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Escribí el contenido tal como lo pensás explicar en clase. La IA lo va a adaptar para cada alumno." />
        </div>
        {type === 'tarea' && (
          <div className="mb-3">
            <label className="form-label" htmlFor="pdue">Fecha de entrega</label>
            <input id="pdue" type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        )}
        <div className="mb-4">
          <label className="form-label" htmlFor="pfile">
            Adjuntar {type === 'tarea' ? 'la tarea' : 'un archivo'} en PDF o Word (opcional)
          </label>
          <input id="pfile" type="file" className="form-control" accept={TASK_FILE_TYPES}
            onChange={(e) => pickFile(e.target.files?.[0] || null)} />
          <div className="form-text">
            Los alumnos lo abren dentro de la página. Los PDF y .docx se adaptan solos al perfil de cada
            alumno: Lector Claro para dislexia y comprensión, colores corregidos para daltonismo.
          </div>
          {file && <div className="post-attach mt-2"><i className="bi bi-paperclip" aria-hidden="true" /> {file.name}</div>}
          {fileError && <div className="small mt-1" style={{ color: 'var(--bad-fg)' }}>{fileError}</div>}
        </div>
        <button type="submit" className="btn btn-primary text-white w-100" disabled={saving}>
          <i className="bi bi-send" aria-hidden="true" /> {saving ? 'Publicando…' : 'Publicar'}
        </button>
      </form>
    </Modal>
  );
}

function PostCard({ post, course, isTeacher }) {
  const { db, user, deletePost } = useStore();
  const [deleting, setDeleting] = useState(false);
  const isTemp = String(post.id).startsWith('temp_');
  const remove = async () => {
    if (!window.confirm(`¿Borrar "${post.title}"? Se borran también las entregas y comentarios.`)) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
    } catch (err) {
      window.alert(err.message);
      setDeleting(false);
    }
  };
  const meta = TYPE_META[post.type];
  // null = cerrado · 'native' = el archivo tal cual · 'adapt' = adaptado (dislexia/comprensión)
  const [viewer, setViewer] = useState(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const adaptBtnLabel = !isTeacher && readerAdaptLabel(user);
  const mySub = !isTeacher && post.type === 'tarea'
    ? db.submissions.find((s) => s.postId === post.id && s.studentId === user.id)
    : null;
  // PDF y .docx se abren dentro de la página (DocViewer), adaptados al
  // perfil del alumno; los .doc viejos solo se pueden descargar.
  const canView = Boolean(post.fileUrl) && (post.fileType === 'pdf' || post.fileType === 'docx');
  const adaptLabel = !isTeacher && fileAdaptLabel(user);
  return (
    <article className="post-card">
      <div className="post-kicker">
        <span className={`post-type-pill ${meta.pill}`}>
          <i className={`bi ${meta.icon}`} aria-hidden="true" /> {meta.label}
        </span>
        <span>{fmtDateTime(post.createdAt)}</span>
        {post.type === 'tarea' && post.dueDate && <span className="post-due">· Entrega: {fmtDue(post.dueDate)}</span>}
        {post.type === 'tarea' && !isTeacher && !isTemp && (
          <TaskStatus status={taskStatus(post.dueDate, mySub?.submittedAt)} />
        )}
        {isTemp && <span>· Publicando…</span>}
        {isTeacher && !isTemp && (
          <button type="button" className="btn btn-sm btn-link text-muted-strong ms-auto p-0" onClick={remove}
            disabled={deleting} aria-label="Borrar publicación" title="Borrar publicación">
            <i className="bi bi-trash" aria-hidden="true" />
          </button>
        )}
      </div>
      <h3>{post.title}</h3>

      <PostContent post={post} isTeacher={isTeacher} />

      {post.fileName && (
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {canView && (
            <button type="button" className="file-link" onClick={() => setViewer('native')}>
              <i className={`bi ${post.fileType === 'pdf' ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark-word-fill'}`} aria-hidden="true" />
              <span className="file-adapt-name">{post.fileName}</span>
              <span className="small text-muted-strong"><i className="bi bi-eye" aria-hidden="true" /> Abrir</span>
              {adaptLabel && (
                <span className="file-adapt-badge"><i className="bi bi-stars" aria-hidden="true" /> {adaptLabel}</span>
              )}
            </button>
          )}
          {canView && adaptBtnLabel && (
            <button type="button" className="file-link dyslexia-btn" onClick={() => setViewer('adapt')}>
              <i className="bi bi-eyeglasses" aria-hidden="true" /> {adaptBtnLabel}
            </button>
          )}
          {!canView && (post.fileUrl ? (
            <a className="file-link" href={`${FILE_BASE}${post.fileUrl}`} download>
              <i className="bi bi-file-earmark-word-fill" aria-hidden="true" />
              <span className="file-adapt-name">{post.fileName}</span>
              <span className="small text-muted-strong"><i className="bi bi-download" aria-hidden="true" /> Descargar</span>
            </a>
          ) : (
            <div className="post-attach"><i className="bi bi-paperclip" aria-hidden="true" /> {post.fileName}</div>
          ))}
        </div>
      )}

      {viewer && <DocViewer post={post} adapt={viewer === 'adapt'} onClose={closeViewer} />}

      {post.type === 'tarea' && !isTeacher && <SubmissionBox post={post} />}
      {post.type === 'tarea' && isTeacher && <TeacherSubmissions post={post} course={course} />}

      <CommentsSection post={post} isTeacher={isTeacher} />
    </article>
  );
}

// Adaptación automática del archivo al abrirlo (solo la ve el alumno). La
// de dislexia/comprensión va aparte, con el botón "Adaptar para disléxico".
function fileAdaptLabel(user) {
  if (hasSupport(user, 'daltonismo') && user.cvdType && CVD_INFO[user.cvdType]) return `Colores para ${CVD_INFO[user.cvdType].short}`;
  return '';
}

function PostContent({ post, isTeacher }) {
  const { user } = useStore();

  if (isTeacher) {
    return <p className="post-body mb-0" style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p>;
  }

  if (post.adaptStatus === 'pending' || !post.adapted) {
    return (
      <div className="adapt-loading">
        <i className="bi bi-arrow-repeat spin" aria-hidden="true" />
        Adaptando este contenido a tu perfil con IA…
      </div>
    );
  }

  const a = post.adapted;
  const sourceLabel = a.source === 'n8n' ? 'Adaptado con IA (n8n)' : 'Adaptado automáticamente';

  const cvdTag = hasSupport(user, 'daltonismo') && user.cvdType && (
    <span className="adapt-tag ms-1">
      <i className="bi bi-palette" aria-hidden="true" /> {user.cvdType === 'acromatopsia' ? 'Escala de grises' : 'Paleta para tu daltonismo'}
    </span>
  );

  if (hasSupport(user, 'dislexia')) {
    const speak = () => {
      if (!('speechSynthesis' in window)) return;
      const text = a.dislexia.paragraphs.join('. ');
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-AR';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    };
    return (
      <div className={`dyslexia-mode lvl-${user.dyslexiaLevel || 'moderado'}`}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span><span className="adapt-tag"><i className="bi bi-stars" aria-hidden="true" /> {sourceLabel}</span>{cvdTag}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={speak}>
            <i className="bi bi-volume-up" aria-hidden="true" /> Escuchar
          </button>
        </div>
        {a.dislexia.paragraphs.map((p, idx) => <p key={idx}>{p}</p>)}
      </div>
    );
  }

  if (hasSupport(user, 'comprension')) {
    return (
      <div>
        <span className="adapt-tag"><i className="bi bi-stars" aria-hidden="true" /> {sourceLabel}</span>{cvdTag}
        <div className="comp-summary">{a.comprension.summary}</div>
        <ul className="comp-points">
          {a.comprension.points.map((pt, idx) => <li key={idx}>{pt}</li>)}
        </ul>
      </div>
    );
  }

  if (hasSupport(user, 'daltonismo')) {
    const tagLabel = user.cvdType === 'acromatopsia' ? 'Interfaz en escala de grises' : 'Paleta adaptada a tu tipo de daltonismo';
    return (
      <div>
        <span className="adapt-tag"><i className="bi bi-stars" aria-hidden="true" /> {tagLabel}</span>
        {a.daltonismo.paragraphs.map((p, idx) => <p key={idx} className="post-body">{p}</p>)}
      </div>
    );
  }

  return <p className="post-body mb-0" style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p>;
}

const SUBMISSION_FILE_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';
const SUBMISSION_FILE_RX = /\.(pdf|docx?|jpe?g|png)$/i;

// El archivo de una entrega: se abre en el visor de la página (PDF, Word o foto).
function SubmittedFile({ sub, title }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!sub.fileUrl) {
    return sub.fileName ? <span className="post-attach mt-0"><i className="bi bi-paperclip" aria-hidden="true" /> {sub.fileName}</span> : null;
  }
  const icon = sub.fileType === 'pdf' ? 'bi-file-earmark-pdf-fill' : /^(jpe?g|png)$/.test(sub.fileType) ? 'bi-file-earmark-image-fill' : 'bi-file-earmark-word-fill';
  return (
    <>
      <button type="button" className="file-link mt-0" onClick={() => setOpen(true)}>
        <i className={`bi ${icon}`} aria-hidden="true" />
        <span className="file-adapt-name">{sub.fileName}</span>
        <span className="small text-muted-strong"><i className="bi bi-eye" aria-hidden="true" /> Abrir</span>
      </button>
      {open && <DocViewer post={{ ...sub, title }} onClose={close} />}
    </>
  );
}

function SubmissionBox({ post }) {
  const { db, user, submitTask } = useStore();
  const existing = db.submissions.find((s) => s.postId === post.id && s.studentId === user.id);
  const [text, setText] = useState(existing?.text || '');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [fileKey, setFileKey] = useState(0); // para vaciar el <input type=file> después de entregar
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const status = taskStatus(post.dueDate, existing?.submittedAt);
  const pastDue = isLateAt(post.dueDate, Date.now());

  const pickFile = (f) => {
    setFileError('');
    if (!f) return setFile(null);
    if (!SUBMISSION_FILE_RX.test(f.name)) {
      setFile(null);
      setFileKey((k) => k + 1);
      return setFileError('Solo se aceptan PDF, Word (.doc / .docx) o fotos (.jpg / .png).');
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      setFileKey((k) => k + 1);
      return setFileError(`El archivo supera los ${MAX_FILE_MB}MB.`);
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file && !existing?.fileUrl) {
      setError('Escribí tu desarrollo o adjuntá un archivo.');
      return;
    }
    if (existing && status === 'done' && pastDue &&
      !window.confirm('La fecha de entrega ya pasó. Si actualizás tu entrega ahora, va a quedar como entregada fuera de término. ¿Querés actualizarla igual?')) return;
    setError('');
    setSaving(true);
    try {
      await submitTask({ postId: post.id, text: text.trim(), file });
      setFile(null);
      setFileKey((k) => k + 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      <h4 className="h6 mb-2">
        {existing ? 'Tu entrega' : 'Entregar esta tarea'}
        <TaskStatus status={status} className="ms-2" />
        {existing?.grade != null && <span className="grade-pill ms-2">Nota: {existing.grade}</span>}
        {existing && existing.grade == null && <span className="grade-pill pending ms-2">Sin calificar</span>}
      </h4>
      {status === 'missing' && (
        <div className="late-note" role="status">
          <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
          <span>
            No entregaste esta tarea a tiempo (venció el {fmtDue(post.dueDate)}). Todavía podés entregarla:
            va a quedar marcada como <strong>entregada fuera de término</strong>.
          </span>
        </div>
      )}
      {status === 'late' && (
        <div className="late-note warn" role="status">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>La entregaste el {fmtDateTime(existing.submittedAt)}, después de la fecha de entrega ({fmtDue(post.dueDate)}).</span>
        </div>
      )}
      {existing?.feedback && (
        <p className="small mb-2"><i className="bi bi-chat-left-text" aria-hidden="true" /> Comentario del profesor: {existing.feedback}</p>
      )}
      <form onSubmit={submit}>
        <textarea className="form-control mb-2" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Escribí tu desarrollo acá (o solo adjuntá tu archivo)..." />
        {existing?.fileUrl && (
          <div className="mb-2 d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted-strong">Archivo entregado:</span>
            <SubmittedFile sub={existing} title="Tu entrega" />
            {file && <span className="small text-muted-strong">(se va a reemplazar por el nuevo)</span>}
          </div>
        )}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <label className="visually-hidden" htmlFor={`subfile-${post.id}`}>Adjuntar archivo</label>
          <input key={fileKey} id={`subfile-${post.id}`} type="file" className="form-control" style={{ maxWidth: 300 }}
            accept={SUBMISSION_FILE_TYPES} onChange={(e) => pickFile(e.target.files?.[0] || null)} />
          <button type="submit" className="btn btn-primary text-white" disabled={saving}>
            <i className="bi bi-upload" aria-hidden="true" />{' '}
            {saving ? 'Enviando…' : existing ? 'Actualizar entrega' : pastDue ? 'Entregar fuera de término' : 'Entregar'}
          </button>
          {saved && <span className="small" style={{ color: 'var(--moss-dark)' }}>Guardado ✓</span>}
          {error && <span className="small" style={{ color: 'var(--bad-fg)' }}>{error}</span>}
        </div>
        <div className="form-text">PDF, Word o foto, hasta {MAX_FILE_MB}MB.</div>
        {fileError && <div className="small mt-1" style={{ color: 'var(--bad-fg)' }}>{fileError}</div>}
        {file && <div className="post-attach mt-2"><i className="bi bi-paperclip" aria-hidden="true" /> {file.name} · listo para entregar</div>}
      </form>
    </div>
  );
}

function TeacherSubmissions({ post, course }) {
  const { db, gradeSubmission } = useStore();
  const subs = db.submissions.filter((s) => s.postId === post.id);
  const [open, setOpen] = useState(false);
  const lateCount = subs.filter((s) => isLateAt(post.dueDate, s.submittedAt)).length;
  // Después de la fecha de entrega, quiénes todavía no entregaron.
  const missing = isLateAt(post.dueDate, Date.now())
    ? course.members
      .filter((id) => !subs.some((s) => s.studentId === id))
      .map((id) => db.users.find((u) => u.id === id))
      .filter(Boolean)
    : [];

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      {subs.length === 0 ? (
        <p className="small text-muted-strong mb-0">Todavía nadie entregó esta tarea.</p>
      ) : (
        <button type="button" className="btn btn-sm btn-link px-0" onClick={() => setOpen((o) => !o)}>
          <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" /> {subs.length} entrega{subs.length === 1 ? '' : 's'}
          {lateCount > 0 && ` · ${lateCount} fuera de término`}
        </button>
      )}
      {missing.length > 0 && (
        <div className="small mt-1">
          <span className="text-muted-strong">Sin entregar ({missing.length}):</span>
          <ul className="missing-list">{missing.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
        </div>
      )}
      {open && subs.map((s) => <GradeRow key={s.id} sub={s} post={post} gradeSubmission={gradeSubmission} />)}
    </div>
  );
}

function GradeRow({ sub, post, gradeSubmission }) {
  const { db } = useStore();
  const student = db.users.find((u) => u.id === sub.studentId);
  const [grade, setGrade] = useState(sub.grade ?? '');
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (grade === '') return;
    setError('');
    setSaving(true);
    try {
      await gradeSubmission(sub.id, { grade: Number(grade), feedback });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="submission-row">
      <div className="d-flex align-items-center gap-2 mb-1">
        <Avatar name={student?.name || '?'} size={28} />
        <strong>{student?.name}</strong>
        {isLateAt(post.dueDate, sub.submittedAt) && <TaskStatus status="late" />}
        <span className="small text-muted-strong ms-auto">{fmtDateTime(sub.submittedAt)}</span>
      </div>
      <p className="small mb-2" style={{ whiteSpace: 'pre-wrap' }}>{sub.text}</p>
      {sub.fileName && <div className="mb-2"><SubmittedFile sub={sub} title={`Entrega de ${student?.name || 'alumno'}`} /></div>}
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <input type="number" min={1} max={10} className="form-control" style={{ maxWidth: 90 }} value={grade}
          onChange={(e) => setGrade(e.target.value)} placeholder="Nota" aria-label="Nota" />
        <input className="form-control" style={{ maxWidth: 320 }} value={feedback} onChange={(e) => setFeedback(e.target.value)}
          placeholder="Comentario (opcional)" aria-label="Comentario privado" />
        <button type="button" className="btn btn-sm btn-primary text-white" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {error && <span className="small" style={{ color: 'var(--bad-fg)' }}>{error}</span>}
      </div>
    </div>
  );
}

function CommentsSection({ post, isTeacher }) {
  const { db, user, addPublicComment, addPrivateComment } = useStore();
  const [tab, setTab] = useState('public');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  // Para el profesor, los comentarios privados se agrupan por alumno.
  const studentsInThread = isTeacher
    ? [...new Set(db.privateComments.filter((c) => c.postId === post.id).map((c) => c.studentId))]
    : [user.id];

  // Si todavía no hay un alumno elegido (por ejemplo, recién cargó la
  // materia) y ya sabemos quién escribió, seleccionamos el primero.
  useEffect(() => {
    if (activeStudent === null && studentsInThread.length > 0) setActiveStudent(studentsInThread[0]);
  }, [activeStudent, studentsInThread]);

  const effectiveStudent = isTeacher ? activeStudent : user.id;

  const privateThread = db.privateComments
    .filter((c) => c.postId === post.id && c.studentId === effectiveStudent)
    .sort((a, b) => a.at - b.at);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    setSending(true);
    try {
      if (tab === 'public') await addPublicComment(post.id, text.trim());
      else await addPrivateComment({ postId: post.id, studentId: effectiveStudent, text: text.trim() });
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="comment-tabs">
        <button type="button" className={`comment-tab ${tab === 'public' ? 'active' : ''}`} onClick={() => setTab('public')}>
          <i className="bi bi-people" aria-hidden="true" /> Comentarios públicos ({post.publicComments.length})
        </button>
        <button type="button" className={`comment-tab ${tab === 'private' ? 'active' : ''}`} onClick={() => setTab('private')}>
          <i className="bi bi-lock" aria-hidden="true" /> Privado con el profesor
        </button>
      </div>

      {tab === 'public' && (
        <div>
          {post.publicComments.map((c) => <CommentItem key={c.id} c={c} />)}
          {post.publicComments.length === 0 && <p className="small text-muted-strong">Todavía no hay comentarios.</p>}
        </div>
      )}

      {tab === 'private' && (
        <div>
          {isTeacher && studentsInThread.length > 1 && (
            <select className="form-select form-select-sm mb-2" style={{ maxWidth: 220 }}
              value={activeStudent || ''} onChange={(e) => setActiveStudent(Number(e.target.value))}>
              {studentsInThread.map((sid) => {
                const st = db.users.find((u) => u.id === sid);
                return <option key={sid} value={sid}>{st?.name}</option>;
              })}
            </select>
          )}
          {isTeacher && studentsInThread.length === 0 && (
            <p className="small text-muted-strong">Ningún alumno escribió acá todavía.</p>
          )}
          {(!isTeacher || studentsInThread.length > 0) && privateThread.map((c) => <CommentItem key={c.id} c={c} />)}
          {!isTeacher && privateThread.length === 0 && (
            <p className="small text-muted-strong">Este espacio es solo entre vos y tu profesor/a.</p>
          )}
        </div>
      )}

      {(tab === 'public' || !isTeacher || effectiveStudent) && (
        <form onSubmit={send} className="d-flex gap-2 mt-2 align-items-center">
          <input className="form-control" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={tab === 'public' ? 'Escribir un comentario público...' : 'Escribir en privado...'} />
          <button type="submit" className="btn btn-outline-secondary" disabled={sending}>
            <i className="bi bi-send" aria-hidden="true" />
          </button>
          {error && <span className="small" style={{ color: 'var(--bad-fg)' }}>{error}</span>}
        </form>
      )}
    </div>
  );
}

function CommentItem({ c }) {
  const { db } = useStore();
  const author = db.users.find((u) => u.id === c.authorId);
  return (
    <div className="comment-item">
      <Avatar name={author?.name || '?'} size={28} />
      <div className="comment-bubble">
        <div className="comment-meta"><strong>{author?.name}</strong><span>{fmtDateTime(c.at)}</span></div>
        <div>{c.text}</div>
      </div>
    </div>
  );
}
