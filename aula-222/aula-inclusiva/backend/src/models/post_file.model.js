import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { PostModel } from "./post.model.js";

// El PDF/Word que adjunta el profesor, guardado dentro de la base de datos
// (no en el disco del servidor). Así sobrevive a los redeploys y reinicios
// de servicios como Render o Railway, donde el disco se borra en cada
// despliegue. Va en una tabla aparte para no cargar el binario cada vez que
// se listan las publicaciones de una materia.
export const PostFileModel = sequelize.define(
  "PostFile",
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
    indexes: [{ unique: true, fields: ["post_id"] }],
  },
);

PostFileModel.belongsTo(PostModel, { foreignKey: "postId", as: "post", onDelete: "CASCADE" });
PostModel.hasOne(PostFileModel, { foreignKey: "postId", as: "file" });
