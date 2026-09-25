import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './lib/api.js';

// ─────────────────────────────────────────────────────────────
// Cliente de la API real (backend/ en la raíz del proyecto) con un caché
// local en memoria. La sesión vive en una cookie httpOnly, por eso al
// arrancar la app siempre se pregunta "¿quién soy?" a /auth/profile.
//
// Las páginas (Login, Register, TeacherHome, StudentHome, CoursePage, …)
// siguen usando exactamente la misma forma de datos que usaban con el
// backend de demostración en localStorage (db.users/courses/posts/…), así
// que el cambio de backend no les pidió tocar nada de su lógica visual.
// ─────────────────────────────────────────────────────────────

const roleToApi = (role) => (role === 'teacher' ? 'profesor' : 'alumno');
const roleFromApi = (role) => (role === 'profesor' ? 'teacher' : 'student');

const mapUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: roleFromApi(u.role),
  profile: u.profile,
  profiles: u.profiles?.length ? u.profiles : u.profile ? [u.profile] : [],
  readerPrefs: u.readerPrefs || null,
  cvdType: u.cvdType,
  dyslexiaLevel: u.dyslexiaLevel || null,
  testDone: u.testDone,
  prefs: { filterOn: u.filterOn !== false },
});

const mapPerson = (p) => ({ id: p.id, name: p.name, email: p.email, role: roleFromApi(p.role) });

const mapCourse = (c) => ({
  id: c.id,
  name: c.name,
  description: c.description || '',
  teacherId: c.teacherId,
  teacherName: c.teacherName,
  code: c.code,
  color: c.color,
  icon: c.icon,
  members: c.members || [],
  createdAt: c.createdAt,
});

const upsertById = (list, item) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const copy = list.slice();
  copy[i] = item;
  return copy;
};

const emptyDb = { users: [], courses: [], posts: [], submissions: [], privateComments: [] };

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [db, setDb] = useState(emptyDb);
  const [authReady, setAuthReady] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [courseDetailError, setCourseDetailError] = useState('');
  const [feed, setFeed] = useState([]);

  const setUser = useCallback((apiUser) => {
    const u = apiUser ? mapUser(apiUser) : null;
    setUserState(u);
    if (u) setDb((d) => ({ ...d, users: upsertById(d.users, { id: u.id, name: u.name, email: u.email, role: u.role }) }));
  }, []);

  // Al abrir la app (o refrescar la página) preguntamos quién está logueado,
  // ya que la sesión no vive en localStorage sino en una cookie del backend.
  useEffect(() => {
    let alive = true;
    api
      .get('/auth/profile')
      .then((data) => { if (alive) setUser(data.user); })
      .catch(() => { if (alive) setUser(null); })
      .finally(() => { if (alive) setAuthReady(true); });
    return () => { alive = false; };
  }, [setUser]);

  const myCourses = useMemo(() => db.courses, [db.courses]);

  // ── Autenticación ──
  const register = useCallback(async ({ firstName, lastName, email, password, role, profiles = [], dyslexiaLevel }) => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 4) {
      return { ok: false, error: 'Completá todos los campos. La contraseña necesita al menos 4 caracteres.' };
    }
    if (role === 'student' && profiles.length === 0) {
      return { ok: false, error: 'Elegí qué tipo de apoyo necesitás.' };
    }
    try {
      const data = await api.post('/auth/register', {
        firstName, lastName, email, password,
        role: roleToApi(role),
        profiles: role === 'student' ? profiles : undefined,
        dyslexiaLevel: role === 'student' && profiles.includes('dislexia') ? dyslexiaLevel : undefined,
      });
      setUser(data.user);
      return { ok: true, user: mapUser(data.user) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [setUser]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      setUser(data.user);
      return { ok: true, user: mapUser(data.user) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* no bloqueamos el logout por esto */ }
    setUserState(null);
    setDb(emptyDb);
    setFeed([]);
  }, []);

  const updateUser = useCallback(async (patch) => {
    const body = {};
    if ('cvdType' in patch) body.cvdType = patch.cvdType;
    if ('testDone' in patch) body.testDone = patch.testDone;
    if ('dyslexiaLevel' in patch) body.dyslexiaLevel = patch.dyslexiaLevel;
    if ('profiles' in patch) body.profiles = patch.profiles;
    if ('readerPrefs' in patch) body.readerPrefs = patch.readerPrefs;
    if (patch.prefs && 'filterOn' in patch.prefs) body.filterOn = patch.prefs.filterOn;
    try {
      const data = await api.put('/auth/me', body);
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      console.warn('No se pudo guardar la preferencia:', err.message);
      return { ok: false, error: err.message };
    }
  }, [setUser]);

  // ── Materias ──
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const data = await api.get('/courses/mine');
      setDb((d) => ({ ...d, courses: data.courses.map(mapCourse) }));
    } catch (err) {
      console.warn('No se pudieron cargar las materias:', err.message);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const createCourse = useCallback(async ({ name, description, color, icon }) => {
    const data = await api.post('/courses', { name, description, color, icon });
    const course = mapCourse(data.course);
    setDb((d) => ({ ...d, courses: upsertById(d.courses, course) }));
    return course;
  }, []);

  const joinCourse = useCallback(async (code) => {
    try {
      const data = await api.post('/courses/join', { code });
      const course = mapCourse(data.course);
      setDb((d) => ({ ...d, courses: upsertById(d.courses, course) }));
      return { ok: true, course };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, []);

  // `silent`: refresco en segundo plano (cada tantos segundos mientras la
  // materia está abierta) para que aparezcan solas las publicaciones nuevas,
  // sin mostrar "Cargando…" ni pisar la pantalla si falla una vez.
  const loadCourseDetail = useCallback(async (courseId, { silent = false } = {}) => {
    if (!silent) {
      setCourseDetailLoading(true);
      setCourseDetailError('');
    }
    try {
      const data = await api.get(`/courses/${courseId}`);
      const course = mapCourse(data.course);
      const people = data.people.map(mapPerson);
      setDb((d) => ({
        users: people.reduce((acc, p) => upsertById(acc, p), d.users),
        courses: upsertById(d.courses, course),
        // Las publicaciones optimistas (temp_…) que todavía se están subiendo
        // no vienen del servidor: las conservamos para no hacerlas parpadear.
        posts: [
          ...d.posts.filter((p) => p.courseId !== courseId || String(p.id).startsWith('temp_')),
          ...data.posts,
        ],
        submissions: [
          ...d.submissions.filter((s) => !data.posts.some((p) => p.id === s.postId)),
          ...data.submissions,
        ],
        privateComments: [
          ...d.privateComments.filter((c) => !data.posts.some((p) => p.id === c.postId)),
          ...data.privateComments,
        ],
      }));
    } catch (err) {
      if (!silent) setCourseDetailError(err.message || 'No pudimos cargar esta materia.');
    } finally {
      if (!silent) setCourseDetailLoading(false);
    }
  }, []);

  // Novedades de todas mis materias (últimas publicaciones).
  const loadFeed = useCallback(async () => {
    try {
      const data = await api.get('/feed');
      setFeed(data.feed);
    } catch (err) {
      console.warn('No se pudieron cargar las novedades:', err.message);
    }
  }, []);

  // ── Publicaciones (avisos, tareas, marco teórico) ──
  // Si viene `file` (un PDF/Word adjunto a una tarea), se manda como
  // multipart/form-data para que el backend lo guarde y lo adapte para
  // dislexia; si no, va como JSON, igual que antes.
  const createPost = useCallback(async ({ courseId, file, ...data }) => {
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId, courseId, ...data,
      fileName: file?.name || '', fileUrl: '', fileType: '', fileAdapted: '',
      createdAt: Date.now(), authorId: user.id, publicComments: [], adapted: null, adaptStatus: 'pending',
    };
    setDb((d) => ({ ...d, posts: [optimistic, ...d.posts] }));
    try {
      let res;
      if (file) {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') formData.append(k, v); });
        formData.append('file', file);
        res = await api.postForm(`/courses/${courseId}/posts`, formData);
      } else {
        res = await api.post(`/courses/${courseId}/posts`, data);
      }
      setDb((d) => ({ ...d, posts: d.posts.map((p) => (p.id === tempId ? res.post : p)) }));
      return res.post;
    } catch (err) {
      setDb((d) => ({ ...d, posts: d.posts.filter((p) => p.id !== tempId) }));
      throw err;
    }
  }, [user]);

  const deletePost = useCallback(async (postId) => {
    await api.del(`/posts/${postId}`);
    setDb((d) => ({ ...d, posts: d.posts.filter((p) => p.id !== postId) }));
    setFeed((f) => f.filter((p) => p.id !== postId));
  }, []);

  const addPublicComment = useCallback(async (postId, text) => {
    const { comment } = await api.post(`/posts/${postId}/comments`, { text, visibility: 'public' });
    setDb((d) => ({
      ...d,
      posts: d.posts.map((p) => (p.id === postId ? { ...p, publicComments: [...p.publicComments, comment] } : p)),
    }));
  }, []);

  const addPrivateComment = useCallback(async ({ postId, studentId, text }) => {
    const { comment } = await api.post(`/posts/${postId}/comments`, { text, visibility: 'private', studentId });
    setDb((d) => ({ ...d, privateComments: [...d.privateComments, comment] }));
  }, []);

  // ── Entregas y calificaciones ──
  // Con `file` (PDF, Word o foto) la entrega va como multipart/form-data y
  // el archivo se guarda de verdad en el servidor.
  const submitTask = useCallback(async ({ postId, text, file }) => {
    let res;
    if (file) {
      const formData = new FormData();
      formData.append('text', text || '');
      formData.append('file', file);
      res = await api.postForm(`/posts/${postId}/submissions`, formData);
    } else {
      res = await api.post(`/posts/${postId}/submissions`, { text });
    }
    const { submission } = res;
    setDb((d) => ({ ...d, submissions: upsertById(d.submissions, submission) }));
    return submission;
  }, []);

  const gradeSubmission = useCallback(async (subId, { grade, feedback }) => {
    const { submission } = await api.put(`/submissions/${subId}/grade`, { grade, feedback });
    setDb((d) => ({ ...d, submissions: upsertById(d.submissions, submission) }));
  }, []);

  const value = {
    db, user, myCourses, authReady,
    coursesLoading, courseDetailLoading, courseDetailError,
    register, login, logout, updateUser,
    loadCourses, createCourse, joinCourse, loadCourseDetail,
    feed, loadFeed,
    createPost, deletePost, addPublicComment,
    submitTask, gradeSubmission, addPrivateComment,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
