import { body } from "express-validator";

export const createCourseValidation = [
  body("name").trim().notEmpty().withMessage("El nombre de la materia no debe ser vacío"),
  body("description").optional({ nullable: true }).isString(),
  body("color").optional().isInt({ min: 0 }),
  body("icon").optional().isInt({ min: 0 }),
];

export const joinCourseValidation = [
  body("code").trim().notEmpty().withMessage("Ingresá el código de la materia"),
];
