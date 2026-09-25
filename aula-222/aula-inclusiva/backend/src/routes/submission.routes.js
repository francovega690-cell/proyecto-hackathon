import { Router } from "express";
import { getSubmissionFile, gradeSubmission, submitTask } from "../controllers/submission.controllers.js";
import { uploadSubmissionFile, withUpload } from "../middlewares/upload.middleware.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { gradeValidation, submitTaskValidation } from "../middlewares/validations/submission.validation.js";

export const submissionRouter = Router();

// Acepta JSON (solo texto) o multipart/form-data con el archivo en "file".
submissionRouter.post(
  "/posts/:id/submissions",
  authMiddleware,
  requireRole("alumno"),
  withUpload(uploadSubmissionFile),
  submitTaskValidation,
  validate,
  submitTask,
);
submissionRouter.get("/submissions/:id/file", authMiddleware, getSubmissionFile);
submissionRouter.put("/submissions/:id/grade", authMiddleware, requireRole("profesor"), gradeValidation, validate, gradeSubmission);
