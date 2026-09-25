import { Router } from "express";
import { createCourse, getCourseDetail, getMyCourses, joinCourse } from "../controllers/course.controllers.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCourseValidation, joinCourseValidation } from "../middlewares/validations/course.validation.js";

export const courseRouter = Router();

courseRouter.get("/courses/mine", authMiddleware, getMyCourses);
courseRouter.post("/courses", authMiddleware, requireRole("profesor"), createCourseValidation, validate, createCourse);
courseRouter.post("/courses/join", authMiddleware, requireRole("alumno"), joinCourseValidation, validate, joinCourse);
courseRouter.get("/courses/:id", authMiddleware, getCourseDetail);
