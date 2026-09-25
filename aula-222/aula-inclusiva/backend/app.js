import "dotenv/config";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { startDB } from "./src/config/database.js";
import { authRouter } from "./src/routes/auth.routes.js";
import { courseRouter } from "./src/routes/course.routes.js";
import { postRouter } from "./src/routes/post.routes.js";
import { submissionRouter } from "./src/routes/submission.routes.js";
import { commentRouter } from "./src/routes/comment.routes.js";

// Registra todos los modelos y sus asociaciones antes de sincronizar la DB.
import "./src/models/user.model.js";
import "./src/models/course.model.js";
import "./src/models/course_member.model.js";
import "./src/models/post.model.js";
import "./src/models/post_file.model.js";
import "./src/models/submission.model.js";
import "./src/models/submission_file.model.js";
import "./src/models/comment.model.js";

const app = express();
const PORT = process.env.PORT || 3005;

// Detrás del proxy HTTPS de Render/Railway/etc.
app.set("trust proxy", 1);

// CLIENT_ORIGIN acepta varios orígenes separados por coma
// (ej: "https://mi-aula.vercel.app,http://localhost:5173").
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Archivos viejos que quedaron en disco de versiones anteriores. Los nuevos
// se guardan en la base de datos y se sirven desde /api/posts/:id/file.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api", authRouter);
app.use("/api", courseRouter);
app.use("/api", postRouter);
app.use("/api", submissionRouter);
app.use("/api", commentRouter);

app.use("/api", (req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

// Si existe el build del frontend (npm run build en la raíz → dist/), este
// mismo servidor lo sirve: frontend y API quedan en el mismo dominio, que es
// la forma más simple de desplegar (una sola app, sin problemas de cookies).
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));
  // Cualquier otra ruta (/inicio, /materia/3, …) la resuelve React Router.
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

try {
  await startDB();
  app.listen(PORT, () => {
    console.log(`Servidor de Aula Inclusiva corriendo en el puerto ${PORT}`);
  });
} catch (error) {
  console.error("No se pudo conectar a la db:", error);
  process.exit(1);
}
