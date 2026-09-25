import { Router } from "express";
import { createComment } from "../controllers/comment.controllers.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCommentValidation } from "../middlewares/validations/comment.validation.js";

export const commentRouter = Router();

commentRouter.post("/posts/:id/comments", authMiddleware, createCommentValidation, validate, createComment);
