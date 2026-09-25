import { body } from "express-validator";
import { DYSLEXIA_LEVELS, SUPPORT_TYPES } from "../../helpers/support.helper.js";

const chosenSupports = (req) => req.body.profiles || (req.body.profile ? [req.body.profile] : []);

export const registerValidation = [
  body("firstName").trim().notEmpty().withMessage("El nombre no debe ser vacío"),
  body("lastName").trim().notEmpty().withMessage("El apellido no debe ser vacío"),
  body("email").trim().notEmpty().withMessage("El email no debe ser vacío").isEmail().withMessage("El email debe ser válido"),
  body("password").isLength({ min: 4 }).withMessage("La contraseña necesita al menos 4 caracteres"),
  body("role").isIn(["profesor", "alumno"]).withMessage("El rol debe ser 'profesor' o 'alumno'"),
  // Un alumno puede elegir uno o más apoyos (profiles); `profile` suelto sigue sirviendo.
  body("profiles").optional().isArray({ min: 1 }).withMessage("Elegí qué tipo de apoyo necesitás"),
  body("profiles.*").optional().isIn(SUPPORT_TYPES).withMessage("Tipo de apoyo inválido"),
  body("profile").optional().isIn(SUPPORT_TYPES).withMessage("Tipo de apoyo inválido"),
  body("role").custom((role, { req }) => {
    if (role === "alumno" && chosenSupports(req).length === 0) throw new Error("Elegí qué tipo de apoyo necesitás");
    return true;
  }),
  body("dyslexiaLevel").custom((lvl, { req }) => {
    if (req.body.role === "alumno" && chosenSupports(req).includes("dislexia") && !DYSLEXIA_LEVELS.includes(lvl)) {
      throw new Error("Elegí el nivel de dislexia (leve, moderado o severo)");
    }
    return true;
  }),
];

export const loginValidation = [
  body("email").trim().notEmpty().withMessage("El email no debe ser vacío"),
  body("password").notEmpty().withMessage("La contraseña no debe ser vacía"),
];

export const updateMeValidation = [
  body("cvdType").optional({ nullable: true }).isString(),
  body("testDone").optional().isBoolean(),
  body("filterOn").optional().isBoolean(),
  body("dyslexiaLevel").optional().isIn(DYSLEXIA_LEVELS).withMessage("Nivel de dislexia inválido"),
  body("profiles").optional().isArray({ min: 1 }).withMessage("Elegí al menos un tipo de apoyo"),
  body("profiles.*").optional().isIn(SUPPORT_TYPES).withMessage("Tipo de apoyo inválido"),
  body("readerPrefs")
    .optional({ nullable: true })
    .custom((v) => {
      if (typeof v !== "object" || Array.isArray(v)) throw new Error("Preferencias inválidas");
      if (JSON.stringify(v).length > 20000) throw new Error("Las preferencias son demasiado grandes");
      return true;
    }),
];
