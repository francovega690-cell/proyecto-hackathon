import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { UserModel } from "./user.model.js";

export const CourseModel = sequelize.define(
  "Course",
  {
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    color: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    icon: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    underscored: true,
  },
);

// Un profesor tiene muchas materias
CourseModel.belongsTo(UserModel, {
  foreignKey: "teacherId",
  as: "teacher",
  onDelete: "CASCADE",
});
UserModel.hasMany(CourseModel, { foreignKey: "teacherId", as: "courses" });
