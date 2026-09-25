// Convierte instancias de Sequelize a los objetos "planos" que espera el
// frontend (mismas claves que usaba la versión de demostración en
// localStorage, para no tener que tocar los componentes de React).

import { supportsOf } from "./support.helper.js";

const ms = (date) => (date ? new Date(date).getTime() : null);

// El resto de la app (avatares, listas de alumnos, autores de posts/comentarios)
// sigue trabajando con un solo campo `name`, así que lo armamos acá a partir de
// firstName/lastName en vez de tocar cada componente que ya lo consume.
const fullName = (u) => `${u.firstName || ""} ${u.lastName || ""}`.trim();

export const publicUser = (u) => ({
  id: u.id,
  name: fullName(u),
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  role: u.role, // 'profesor' | 'alumno'
  profile: u.supportType || null, // el principal: 'comprension' | 'dislexia' | 'daltonismo' | 'ninguno'
  profiles: supportsOf(u), // todos los apoyos (puede tener daltonismo + dislexia)
  cvdType: u.cvdType || null,
  dyslexiaLevel: supportsOf(u).includes("dislexia") ? u.dyslexiaLevel || "moderado" : null,
  readerPrefs: u.readerPrefs || null,
  testDone: Boolean(u.testDone),
  filterOn: u.filterOn !== false,
});

export const courseSummary = (c) => ({
  id: c.id,
  name: c.name,
  description: c.description || "",
  code: c.code,
  color: c.color,
  icon: c.icon,
  teacherId: c.teacherId,
  teacherName: c.teacher ? fullName(c.teacher) : null,
  members: (c.members || []).map((m) => m.id),
  createdAt: ms(c.createdAt),
});

export const personLite = (u) => ({
  id: u.id,
  name: fullName(u),
  email: u.email,
  role: u.role,
});

export const postFull = (p) => ({
  id: p.id,
  courseId: p.courseId,
  type: p.type,
  title: p.title,
  body: p.body,
  dueDate: p.dueDate || "",
  fileName: p.fileName || "",
  fileUrl: p.fileUrl || "",
  fileType: p.fileType || "",
  fileAdapted: p.fileAdapted || "",
  createdAt: ms(p.createdAt),
  authorId: p.authorId,
  adapted: p.adapted || null,
  adaptStatus: p.adaptStatus,
  publicComments: (p.comments || [])
    .filter((c) => c.visibility === "public")
    .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
    .map(commentFull),
});

export function submissionFull(s) {
  return {
    id: s.id,
    postId: s.postId,
    studentId: s.studentId,
    text: s.text,
    fileName: s.fileName || "",
    fileType: s.fileType || "",
    fileUrl: s.fileType ? `/api/submissions/${s.id}/file` : "",
    submittedAt: ms(s.submittedAt),
    grade: s.grade === undefined ? null : s.grade,
    feedback: s.feedback || "",
  };
}

export function commentFull(c) {
  return {
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    studentId: c.studentId || null,
    visibility: c.visibility,
    text: c.text,
    at: ms(c.createdAt),
  };
}
