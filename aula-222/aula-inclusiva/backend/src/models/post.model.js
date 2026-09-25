import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { CourseModel } from "./course.model.js";
import { UserModel } from "./user.model.js";

// Una publicación del profesor: aviso, marco teórico o tarea.
export const PostModel = sequelize.define(
  "Post",
  {
    type: {
      type: DataTypes.ENUM("aviso", "teoria", "tarea"),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    // Archivo adjunto real (solo tareas, solo PDF/Word, solo el profesor).
    fileUrl: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    fileType: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    // Contenido del archivo ya reorganizado para dislexia (HTML), calculado
    // una sola vez al subirlo. Es lo que se ve al tocar el botón "Adaptado".
    fileAdapted: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    // Contenido ya adaptado a cada perfil (comprensión / dislexia / daltonismo)
    adapted: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    adaptStatus: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
    },
  },
  {
    underscored: true,
  },
);

PostModel.belongsTo(CourseModel, { foreignKey: "courseId", as: "course", onDelete: "CASCADE" });
CourseModel.hasMany(PostModel, { foreignKey: "courseId", as: "posts" });

PostModel.belongsTo(UserModel, { foreignKey: "authorId", as: "author", onDelete: "CASCADE" });
UserModel.hasMany(PostModel, { foreignKey: "authorId", as: "authoredPosts" });
