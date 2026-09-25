import { verifyToken } from "../helpers/jwt.helper.js";

export const authMiddleware = (req, res, next) => {
  const token = req.cookies["token"];

  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, name, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Sesión inválida o vencida" });
  }
};

// Restringe una ruta a uno o más roles ('profesor' | 'alumno').
// Se usa después de authMiddleware: requireRole('profesor')
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "No tenés permiso para esto" });
  }
  next();
};
