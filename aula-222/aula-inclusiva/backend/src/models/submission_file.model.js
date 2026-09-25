import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { SubmissionModel } from "./submission.model.js";

// El archivo (PDF, Word o foto) que adjunta el alumno en su entrega. Igual
// que los archivos del profesor, se guarda en la base de datos y no en el
// disco, así sobrevive a los redeploys.
export const SubmissionFileModel = sequelize.define(
  "SubmissionFile",
  {
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.BLOB("long"),
      allowNull: false,
    },
  },
  {
    underscored: true,
    indexes: [{ unique: true, fields: ["submission_id"] }],
  },
);

SubmissionFileModel.belongsTo(SubmissionModel, { foreignKey: "submissionId", as: "submission", onDelete: "CASCADE" });
SubmissionModel.hasOne(SubmissionFileModel, { foreignKey: "submissionId", as: "file" });
