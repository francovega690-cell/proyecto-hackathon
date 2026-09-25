import { body } from "express-validator";

export const createCommentValidation = [
  body("text").trim().notEmpty().withMessage("Escribí un comentario"),
  body("visibility").isIn(["public", "private"]).withMessage("Visibilidad inválida"),
  body("studentId").optional({ nullable: true }).isInt(),
];
