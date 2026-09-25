import { Router } from "express";
import { login, logout, profile, register, updateMe } from "../controllers/auth.controllers.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginValidation, registerValidation, updateMeValidation } from "../middlewares/validations/auth.validation.js";

export const authRouter = Router();

authRouter.post("/auth/register", registerValidation, validate, register);
authRouter.post("/auth/login", loginValidation, validate, login);
authRouter.post("/auth/logout", logout);
authRouter.get("/auth/profile", authMiddleware, profile);
authRouter.put("/auth/me", authMiddleware, updateMeValidation, validate, updateMe);
