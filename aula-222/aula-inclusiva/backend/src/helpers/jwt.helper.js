import jwt from "jsonwebtoken";

// Generar token JWT
export const generateToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
  } catch (error) {
    throw new Error("Error generando el token: " + error.message);
  }
};

// Verificar token JWT
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
