import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Un único modelo de usuario para los dos roles de la app (profesor/alumno).
// Los campos de perfil de accesibilidad (supportType, cvdType, testDone,
// filterOn) solo se usan cuando role = 'alumno'.
export const UserModel = sequelize.define(
  "User",
  {
    firstName: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("profesor", "alumno"),
      allowNull: false,
    },
    // Tipo de apoyo elegido al registrarse (solo alumnos)
    supportType: {
      type: DataTypes.ENUM("comprension", "dislexia", "daltonismo", "ninguno"),
      allowNull: true,
    },
    // Resultado del test de daltonismo (solo cuando supportType = 'daltonismo')
    cvdType: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    // Todos los apoyos del alumno separados por coma (ej: "dislexia,daltonismo").
    // supportType queda como el principal, para compatibilidad.
    supports: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    // Preferencias del lector (ajustes y paletas propias del alumno), para que
    // lo que personaliza lo acompañe en cualquier computadora.
    readerPrefs: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Nivel de dislexia (solo cuando supportType = 'dislexia'): define cuánto
    // se adapta el material (tamaño, espaciado, tramos, regla de lectura…).
    dyslexiaLevel: {
      type: DataTypes.ENUM("leve", "moderado", "severo"),
      allowNull: true,
    },
    testDone: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    filterOn: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    underscored: true,
  },
);
