import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { CourseModel } from "./course.model.js";
import { UserModel } from "./user.model.js";

// Tabla intermedia: qué alumnos están unidos a qué materia.
export const CourseMemberModel = sequelize.define(
  "CourseMember",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
  },
  {
    underscored: true,
    timestamps: false,
    indexes: [{ unique: true, fields: ["course_id", "user_id"] }],
  },
);

CourseModel.belongsToMany(UserModel, {
  through: CourseMemberModel,
  foreignKey: "courseId",
  otherKey: "userId",
  as: "members",
});
UserModel.belongsToMany(CourseModel, {
  through: CourseMemberModel,
  foreignKey: "userId",
  otherKey: "courseId",
  as: "courses_joined",
});
