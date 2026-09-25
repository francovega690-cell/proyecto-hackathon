import { CourseModel } from "../models/course.model.js";
import { UserModel } from "../models/user.model.js";
import { PostModel } from "../models/post.model.js";
import { SubmissionModel } from "../models/submission.model.js";
import { CommentModel } from "../models/comment.model.js";
import { generateCourseCode } from "../helpers/code.helper.js";
import {
  courseSummary,
  personLite,
  postFull,
  submissionFull,
  commentFull,
} from "../helpers/serialize.helper.js";

const courseInclude = [
  { model: UserModel, as: "teacher", attributes: ["id", "firstName", "lastName", "email", "role"] },
  { model: UserModel, as: "members", attributes: ["id"], through: { attributes: [] } },
];

// Materias del usuario logueado: las que dicta (profesor) o a las que se unió (alumno).
export const getMyCourses = async (req, res) => {
  try {
    const where = req.user.role === "profesor" ? { teacherId: req.user.id } : undefined;

    // Para alumno traemos todas y filtramos por membresía abajo (Sequelize no
    // deja filtrar directo por un belongsToMany en el where del modelo base).
    let courses = await CourseModel.findAll({ where, include: courseInclude, order: [["createdAt", "DESC"]] });

    if (req.user.role === "alumno") {
      courses = courses.filter((c) => c.members.some((m) => m.id === req.user.id));
    }

    return res.json({ courses: courses.map(courseSummary) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { name, description, color = 0, icon = 0 } = req.body;

    let code = generateCourseCode();
    while (await CourseModel.findOne({ where: { code } })) code = generateCourseCode();

    const course = await CourseModel.create({
      name,
      description: description || "",
      code,
      color,
      icon,
      teacherId: req.user.id,
    });

    const full = await CourseModel.findByPk(course.id, { include: courseInclude });
    return res.status(201).json({ course: courseSummary(full) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const joinCourse = async (req, res) => {
  try {
    const { code } = req.body;
    const course = await CourseModel.findOne({
      where: { code: code.trim().toUpperCase() },
      include: courseInclude,
    });

    if (!course) {
      return res.status(404).json({ message: "No encontramos ninguna materia con ese código. Revisalo con tu profesor." });
    }
    if (course.members.some((m) => m.id === req.user.id)) {
      return res.status(409).json({ message: "Ya estás dentro de esa materia." });
    }

    await course.addMember(req.user.id);

    const full = await CourseModel.findByPk(course.id, { include: courseInclude });
    return res.json({ course: courseSummary(full) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Autoriza: el usuario tiene que ser el profesor dueño de la materia o un
// alumno que se unió a ella.
const assertAccess = (course, user) => {
  if (user.role === "profesor") return course.teacherId === user.id;
  return course.members.some((m) => m.id === user.id);
};

export const getCourseDetail = async (req, res) => {
  try {
    const course = await CourseModel.findByPk(req.params.id, { include: courseInclude });
    if (!course) return res.status(404).json({ message: "Materia no encontrada" });
    if (!assertAccess(course, req.user)) {
      return res.status(403).json({ message: "No tenés acceso a esta materia" });
    }

    const isTeacher = req.user.role === "profesor";

    const posts = await PostModel.findAll({
      where: { courseId: course.id },
      include: [{ model: CommentModel, as: "comments" }],
      order: [["createdAt", "DESC"]],
    });

    const postIds = posts.map((p) => p.id);

    // Si la materia todavía no tiene publicaciones, ni siquiera consultamos
    // (un IN vacío es innecesario y en algunos motores da error de sintaxis).
    const submissions = postIds.length
      ? await SubmissionModel.findAll({
          where: { postId: postIds, ...(isTeacher ? {} : { studentId: req.user.id }) },
        })
      : [];

    const allPrivateComments = postIds.length
      ? await CommentModel.findAll({
          where: { postId: postIds, visibility: "private", ...(isTeacher ? {} : { studentId: req.user.id }) },
          order: [["createdAt", "ASC"]],
        })
      : [];

    // Gente para poder mostrar nombres: el profesor + todos los alumnos de la
    // materia. Los "members" del include solo traen el id, así que buscamos
    // sus datos completos aparte.
    const memberIds = course.members.map((m) => m.id);
    const fullMembers = memberIds.length
      ? await UserModel.findAll({ where: { id: memberIds }, attributes: ["id", "firstName", "lastName", "email", "role"] })
      : [];

    return res.json({
      course: courseSummary(course),
      people: [personLite(course.teacher), ...fullMembers.map(personLite)],
      posts: posts.map(postFull),
      submissions: submissions.map(submissionFull),
      privateComments: allPrivateComments.map(commentFull),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
