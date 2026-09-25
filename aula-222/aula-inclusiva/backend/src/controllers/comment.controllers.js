import { PostModel } from "../models/post.model.js";
import { CourseModel } from "../models/course.model.js";
import { UserModel } from "../models/user.model.js";
import { CommentModel } from "../models/comment.model.js";
import { commentFull } from "../helpers/serialize.helper.js";

export const createComment = async (req, res) => {
  try {
    const post = await PostModel.findByPk(req.params.id, {
      include: [{ model: CourseModel, as: "course", include: [{ model: UserModel, as: "members" }] }],
    });
    if (!post) return res.status(404).json({ message: "Publicación no encontrada" });

    const isTeacher = req.user.role === "profesor" && post.course.teacherId === req.user.id;
    const isMember = post.course.members.some((m) => m.id === req.user.id);
    if (!isTeacher && !isMember) {
      return res.status(403).json({ message: "No sos parte de esta materia" });
    }

    const { text, visibility } = req.body;
    let studentId = null;

    if (visibility === "private") {
      if (req.user.role === "alumno") {
        studentId = req.user.id;
      } else {
        studentId = req.body.studentId;
        if (!studentId) {
          return res.status(400).json({ message: "Falta indicar a qué alumno le respondés" });
        }
        const belongs = post.course.members.some((m) => m.id === Number(studentId));
        if (!belongs) return res.status(400).json({ message: "Ese alumno no es parte de la materia" });
      }
    }

    const comment = await CommentModel.create({
      postId: post.id,
      authorId: req.user.id,
      studentId,
      visibility,
      text,
    });

    return res.status(201).json({ comment: commentFull(comment) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
