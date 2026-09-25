import { Router } from "express";
import { createPost, deletePost, getFeed, getPostFile } from "../controllers/post.controllers.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createPostValidation } from "../middlewares/validations/post.validation.js";
import { uploadTaskFile } from "../middlewares/upload.middleware.js";

export const postRouter = Router();

// uploadTaskFile solo actúa si la request viene como multipart/form-data
// (cuando el profesor adjunta un PDF/Word); si viene como JSON normal, la
// deja pasar sin tocar req.body.
const handleUpload = (req, res, next) => {
  uploadTaskFile(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "El archivo supera los 15MB." : err.message;
      return res.status(400).json({ message: message || "No se pudo subir el archivo" });
    }
    next();
  });
};

postRouter.get("/feed", authMiddleware, getFeed);

postRouter.post(
  "/courses/:id/posts",
  authMiddleware,
  requireRole("profesor"),
  handleUpload,
  createPostValidation,
  validate,
  createPost,
);

postRouter.get("/posts/:id/file", authMiddleware, getPostFile);
postRouter.delete("/posts/:id", authMiddleware, requireRole("profesor"), deletePost);
