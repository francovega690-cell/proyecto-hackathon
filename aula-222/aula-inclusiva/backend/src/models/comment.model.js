import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { PostModel } from "./post.model.js";
import { UserModel } from "./user.model.js";

// Comentario sobre una publicación: público (todo el curso lo ve) o
// privado (una conversación entre un alumno puntual y el profesor).
// Cuando visibility = 'private', studentId marca de qué alumno es el hilo.
export const CommentModel = sequelize.define(
  "Comment",
  {
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    visibility: {
      type: DataTypes.ENUM("public", "private"),
      allowNull: false,
      defaultValue: "public",
    },
  },
  {
    underscored: true,
  },
);

CommentModel.belongsTo(PostModel, { foreignKey: "postId", as: "post", onDelete: "CASCADE" });
PostModel.hasMany(CommentModel, { foreignKey: "postId", as: "comments" });

CommentModel.belongsTo(UserModel, { foreignKey: "authorId", as: "author", onDelete: "CASCADE" });
UserModel.hasMany(CommentModel, { foreignKey: "authorId", as: "authoredComments" });

// Solo se usa en comentarios privados: a qué alumno pertenece el hilo.
CommentModel.belongsTo(UserModel, { foreignKey: "studentId", as: "student", onDelete: "CASCADE" });
