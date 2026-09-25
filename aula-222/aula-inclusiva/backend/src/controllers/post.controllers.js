import { CourseModel } from "../models/course.model.js";
import { PostModel } from "../models/post.model.js";
import { PostFileModel } from "../models/post_file.model.js";
import { UserModel } from "../models/user.model.js";
import { SubmissionModel } from "../models/submission.model.js";
import { sequelize } from "../config/database.js";
import { adaptContent } from "../helpers/adapt.helper.js";
import { autoFormat, extractTextFromFile } from "../helpers/dyslexia.helper.js";
import { postFull } from "../helpers/serialize.helper.js";
import { ALLOWED_EXT, fileExt } from "../middlewares/upload.middleware.js";

// Autoriza: el profesor dueño de la materia o un alumno unido a ella.
const canAccessCourse = async (courseId, user) => {
  const course = await CourseModel.findByPk(courseId, {
    include: [{ model: UserModel, as: "members", attributes: ["id"], through: { attributes: [] } }],
  });
  if (!course) return false;
  if (user.role === "profesor") return course.teacherId === user.id;
  return course.members.some((m) => m.id === user.id);
};

export const createPost = async (req, res) => {
  const uploadedFile = req.file; // multer lo deja en memoria (buffer) si vino uno
  try {
    const course = await CourseModel.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: "Materia no encontrada" });
    if (course.teacherId !== req.user.id) {
      return res.status(403).json({ message: "Solo el profesor de la materia puede publicar acá" });
    }

    const { type, title, body, dueDate } = req.body;

    let fileName = null;
    let fileType = null;
    let fileAdapted = null;

    if (uploadedFile) {
      fileType = fileExt(uploadedFile.originalname);
      fileName = uploadedFile.originalname;
      // La versión reorganizada para dislexia es un extra: si el archivo no
      // tiene texto legible (un escaneo, o un .doc viejo), igual se publica
      // y los alumnos lo pueden abrir/descargar tal cual.
      if (fileType === "pdf" || fileType === "docx") {
        try {
          const rawText = await extractTextFromFile(uploadedFile.buffer, fileType);
          fileAdapted = autoFormat(rawText).html;
        } catch (err) {
          console.log(`No se pudo adaptar ${fileName}:`, err.message);
        }
      }
    }

    const post = await sequelize.transaction(async (t) => {
      const created = await PostModel.create(
        {
          courseId: course.id,
          authorId: req.user.id,
          type,
          title,
          body,
          dueDate: type === "tarea" && dueDate ? dueDate : null,
          fileName,
          fileType,
          fileAdapted,
          adaptStatus: "pending",
        },
        { transaction: t },
      );
      if (uploadedFile) {
        await PostFileModel.create(
          {
            postId: created.id,
            name: fileName,
            mimeType: ALLOWED_EXT[fileType],
            size: uploadedFile.size,
            data: uploadedFile.buffer,
          },
          { transaction: t },
        );
        await created.update({ fileUrl: `/api/posts/${created.id}/file` }, { transaction: t });
      }
      return created;
    });

    // Adaptamos el contenido antes de responder: así el alumno recibe la
    // publicación ya lista para su perfil (comprensión / dislexia / daltonismo).
    const adapted = await adaptContent({ title, body, type, courseName: course.name });
    await post.update({ adapted, adaptStatus: "ready" });
    post.comments = [];

    return res.status(201).json({ post: postFull(post) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Devuelve el PDF/Word original. Los PDF se abren en el navegador; los Word
// se descargan.
export const getPostFile = async (req, res) => {
  try {
    const post = await PostModel.findByPk(req.params.id, { attributes: ["id", "courseId"] });
    if (!post) return res.status(404).json({ message: "Publicación no encontrada" });
    if (!(await canAccessCourse(post.courseId, req.user))) {
      return res.status(403).json({ message: "No tenés acceso a este archivo" });
    }

    const file = await PostFileModel.findOne({ where: { postId: post.id } });
    if (!file) return res.status(404).json({ message: "Esta publicación no tiene archivo" });

    // ?download=1 fuerza la descarga (botón "Descargar" del visor); si no,
    // los PDF van inline porque el visor los dibuja dentro de la página.
    const disposition = file.mimeType === "application/pdf" && !req.query.download ? "inline" : "attachment";
    const asciiName = file.name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.end(file.data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await PostModel.findByPk(req.params.id, {
      include: [{ model: CourseModel, as: "course", attributes: ["teacherId"] }],
    });
    if (!post) return res.status(404).json({ message: "Publicación no encontrada" });
    if (post.course.teacherId !== req.user.id) {
      return res.status(403).json({ message: "Solo el profesor de la materia puede borrar esto" });
    }
    await post.destroy();
    return res.json({ ok: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Novedades: las últimas publicaciones de todas las materias del usuario,
// para que el alumno vea lo nuevo apenas entra (sin abrir materia por materia).
export const getFeed = async (req, res) => {
  try {
    let courseIds;
    if (req.user.role === "profesor") {
      const courses = await CourseModel.findAll({ where: { teacherId: req.user.id }, attributes: ["id"] });
      courseIds = courses.map((c) => c.id);
    } else {
      const me = await UserModel.findByPk(req.user.id, {
        include: [{ model: CourseModel, as: "courses_joined", attributes: ["id"], through: { attributes: [] } }],
      });
      courseIds = (me?.courses_joined || []).map((c) => c.id);
    }

    if (courseIds.length === 0) return res.json({ feed: [] });

    const posts = await PostModel.findAll({
      where: { courseId: courseIds },
      attributes: ["id", "courseId", "type", "title", "dueDate", "fileName", "fileType", "createdAt"],
      include: [{ model: CourseModel, as: "course", attributes: ["name", "color", "icon"] }],
      order: [["createdAt", "DESC"]],
      limit: 30,
    });

    // Para el alumno: cuándo entregó cada tarea (si la entregó), así el
    // inicio puede marcar las que están sin entregar o fuera de término.
    const taskIds = posts.filter((p) => p.type === "tarea").map((p) => p.id);
    const mySubs = req.user.role === "alumno" && taskIds.length
      ? await SubmissionModel.findAll({ where: { postId: taskIds, studentId: req.user.id }, attributes: ["postId", "submittedAt"] })
      : [];
    const submittedAt = new Map(mySubs.map((s) => [s.postId, new Date(s.submittedAt).getTime()]));

    return res.json({
      feed: posts.map((p) => ({
        id: p.id,
        courseId: p.courseId,
        courseName: p.course?.name || "",
        courseColor: p.course?.color || 0,
        courseIcon: p.course?.icon || 0,
        type: p.type,
        title: p.title,
        dueDate: p.dueDate || "",
        fileName: p.fileName || "",
        fileType: p.fileType || "",
        createdAt: new Date(p.createdAt).getTime(),
        submittedAt: submittedAt.get(p.id) || null,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
