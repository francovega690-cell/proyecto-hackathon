import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { PostModel } from "./post.model.js";
import { UserModel } from "./user.model.js";

// Lo que entrega un alumno para una tarea (post de tipo 'tarea').
export const SubmissionModel = sequelize.define(
  "Submission",
  {
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    // Extensión del archivo adjunto (pdf, docx, jpg…); vacío si no subió archivo.
    fileType: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    grade: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    underscored: true,
    indexes: [{ unique: true, fields: ["post_id", "student_id"] }],
  },
);

SubmissionModel.belongsTo(PostModel, { foreignKey: "postId", as: "post", onDelete: "CASCADE" });
PostModel.hasMany(SubmissionModel, { foreignKey: "postId", as: "submissions" });

SubmissionModel.belongsTo(UserModel, { foreignKey: "studentId", as: "student", onDelete: "CASCADE" });
UserModel.hasMany(SubmissionModel, { foreignKey: "studentId", as: "submissions" });
