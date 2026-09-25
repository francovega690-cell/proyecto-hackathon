import { body } from "express-validator";

export const submitTaskValidation = [
  // El texto es opcional si adjunta un archivo (eso se revisa en el controlador).
  body("text").optional({ nullable: true }).isString().trim(),
];

export const gradeValidation = [
  body("grade").isInt({ min: 1, max: 10 }).withMessage("La nota debe ser un número entre 1 y 10"),
  body("feedback").optional({ nullable: true, checkFalsy: true }).isString(),
];
