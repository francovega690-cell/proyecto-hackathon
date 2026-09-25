import { body } from "express-validator";

export const createPostValidation = [
  body("type").isIn(["aviso", "teoria", "tarea"]).withMessage("Tipo de publicación inválido"),
  body("title").trim().notEmpty().withMessage("El título no debe ser vacío"),
  body("body").trim().notEmpty().withMessage("El contenido no debe ser vacío"),
  body("dueDate").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("Fecha de entrega inválida"),
];
