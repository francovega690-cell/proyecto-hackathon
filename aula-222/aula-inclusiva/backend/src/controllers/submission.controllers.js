import { PostModel } from "../models/post.model.js";
import { CourseModel } from "../models/course.model.js";
import { UserModel } from "../models/user.model.js";
import { SubmissionModel } from "../models/submission.model.js";
import { SubmissionFileModel } from "../models/submission_file.model.js";
import { sequelize } from "../config/database.js";
import { SUBMISSION_EXT, fileExt } from "../middlewares/upload.middleware.js";
import { submissionFull } from "../helpers/serialize.helper.js";

// El alumno entrega (o actualiza su entrega de) una tarea.
export const submitTask = async (req, res) => {
  try {
    const post = await PostModel.findByPk(req.params.id, {
      include: [{ model: CourseModel, as: "course", include: [{ model: UserModel, as: "members" }] }],
    });
    if (!post || post.type !== "tarea") return res.status(404).json({ message: "Tarea no encontrada" });

    const isMember = post.course.members.some((m) => m.id === req.user.id);
    if (!isMember) return res.status(403).json({ message: "No sos parte de esta materia" });

    const text = (req.body.text || "").trim();
    const upload = req.file; // multer lo deja en memoria si vino un archivo

    // findOrCreate + update en vez de upsert(): más predecible entre motores
    // de base de datos que un ON DUPLICATE KEY con MySQL vía Sequelize.
    let submission = await SubmissionModel.findOne({ where: { postId: post.id, studentId: req.user.id } });
    if (!text && !upload && !submission?.fileType) {
      return res.status(400).json({ message: "Escribí tu desarrollo o adjuntá un archivo antes de entregar." });
    }

    await sequelize.transaction(async (t) => {
      // Si no sube un archivo nuevo, se conserva el que ya había entregado.
      const fileFields = upload ? { fileName: upload.originalname, fileType: fileExt(upload.originalname) } : {};
      if (submission) {
        await submission.update({ text, ...fileFields, submittedAt: new Date() }, { transaction: t });
      } else {
        submission = await SubmissionModel.create(
          { postId: post.id, studentId: req.user.id, text, ...fileFields, submittedAt: new Date() },
          { transaction: t },
        );
      }
      if (upload) {
        await SubmissionFileModel.destroy({ where: { submissionId: submission.id }, transaction: t });
        await SubmissionFileModel.create(
          {
            submissionId: submission.id,
            name: upload.originalname,
            mimeType: SUBMISSION_EXT[fileExt(upload.originalname)],
            size: upload.size,
            data: upload.buffer,
          },
          { transaction: t },
        );
      }
    });

    return res.json({ submission: submissionFull(submission) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Devuelve el archivo de una entrega: lo ve el alumno que la hizo y el
// profesor de la materia. ?download=1 fuerza la descarga.
export const getSubmissionFile = async (req, res) => {
  try {
    const submission = await SubmissionModel.findByPk(req.params.id, {
      attributes: ["id", "studentId", "postId"],
      include: [{ model: PostModel, as: "post", attributes: ["id"], include: [{ model: CourseModel, as: "course", attributes: ["teacherId"] }] }],
    });
    if (!submission) return res.status(404).json({ message: "Entrega no encontrada" });
    const allowed = submission.studentId === req.user.id || submission.post?.course?.teacherId === req.user.id;
    if (!allowed) return res.status(403).json({ message: "No tenés acceso a este archivo" });

    const file = await SubmissionFileModel.findOne({ where: { submissionId: submission.id } });
    if (!file) return res.status(404).json({ message: "Esta entrega no tiene archivo" });

    const inline = /^(application\/pdf|image\/)/.test(file.mimeType) && !req.query.download;
    const asciiName = file.name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    res.setHeader("Cache-Control", "private, no-cache");
    return res.end(file.data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// El profesor califica una entrega (y opcionalmente deja un comentario privado).
export const gradeSubmission = async (req, res) => {
  try {
    const submission = await SubmissionModel.findByPk(req.params.id, {
      include: [{ model: PostModel, as: "post", include: [{ model: CourseModel, as: "course" }] }],
    });
    if (!submission) return res.status(404).json({ message: "Entrega no encontrada" });
    if (submission.post.course.teacherId !== req.user.id) {
      return res.status(403).json({ message: "Solo el profesor de la materia puede calificar" });
    }

    const { grade, feedback } = req.body;
    await submission.update({ grade, feedback: feedback || "" });

    return res.json({ submission: submissionFull(submission) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
