import { UserModel } from "../models/user.model.js";
import { generateToken } from "../helpers/jwt.helper.js";
import { hashPassword, comparePassword } from "../helpers/bcrypt.helper.js";
import { publicUser } from "../helpers/serialize.helper.js";
import { normalizeSupports, supportsOf } from "../helpers/support.helper.js";

// Si el frontend y el backend están desplegados en dominios distintos
// (ej: Vercel + Render), la cookie tiene que ser SameSite=None + Secure para
// que el navegador la mande. Se activa con COOKIE_CROSS_SITE=true. Si el
// backend sirve también el frontend (mismo dominio), alcanza con "lax".
const CROSS_SITE = process.env.COOKIE_CROSS_SITE === "true";
const BASE_COOKIE = {
  httpOnly: true,
  sameSite: CROSS_SITE ? "none" : "lax",
  secure: CROSS_SITE || process.env.NODE_ENV === "production",
};
const COOKIE_OPTS = {
  ...BASE_COOKIE,
  maxAge: 1000 * 60 * 60 * 12, // 12h, igual al expiresIn del token
};

const setSessionCookie = (res, user) => {
  const token = generateToken({ id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email, role: user.role });
  res.cookie("token", token, COOKIE_OPTS);
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, profile, profiles, dyslexiaLevel } = req.body;
    const supports = role === "alumno" ? normalizeSupports(profiles || [profile]) : [];

    const exists = await UserModel.findOne({ where: { email: email.toLowerCase() } });
    if (exists) {
      return res.status(409).json({ message: "Ese correo ya tiene una cuenta. Probá iniciar sesión." });
    }

    const hashedPassword = await hashPassword(password);

    const user = await UserModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      supportType: role === "alumno" ? supports[0] : null,
      supports: role === "alumno" ? supports.join(",") : null,
      cvdType: null,
      dyslexiaLevel: supports.includes("dislexia") ? dyslexiaLevel : null,
      // Si eligió daltonismo, primero tiene que hacer el test de color.
      testDone: role === "alumno" ? !supports.includes("daltonismo") : true,
      filterOn: true,
    });

    setSessionCookie(res, user);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error al registrar usuario" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ message: "Correo o contraseña incorrectos." });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Correo o contraseña incorrectos." });
    }

    setSessionCookie(res, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const profile = async (req, res) => {
  const user = await UserModel.findByPk(req.user.id);
  if (!user) return res.status(401).json({ message: "No autenticado" });
  return res.json({ user: publicUser(user) });
};

export const updateMe = async (req, res) => {
  try {
    const { cvdType, testDone, filterOn, dyslexiaLevel, profiles, readerPrefs } = req.body;
    const current = await UserModel.findByPk(req.user.id);
    if (!current) return res.status(401).json({ message: "No autenticado" });
    const patch = {};
    if (cvdType !== undefined) patch.cvdType = cvdType;
    if (testDone !== undefined) patch.testDone = testDone;
    if (filterOn !== undefined) patch.filterOn = filterOn;
    if (dyslexiaLevel !== undefined) patch.dyslexiaLevel = dyslexiaLevel;
    if (readerPrefs !== undefined) patch.readerPrefs = readerPrefs;
    // Cambiar los apoyos (solo alumnos). Si suma daltonismo y todavía no hizo
    // el test, se lo pide; si suma dislexia sin nivel, arranca en moderado.
    if (profiles !== undefined && current.role === "alumno") {
      const supports = normalizeSupports(profiles);
      const before = supportsOf(current);
      patch.supports = supports.join(",");
      patch.supportType = supports[0];
      if (supports.includes("daltonismo") && !before.includes("daltonismo") && !current.cvdType) patch.testDone = false;
      if (supports.includes("dislexia") && !current.dyslexiaLevel && !patch.dyslexiaLevel) patch.dyslexiaLevel = "moderado";
    }

    await UserModel.update(patch, { where: { id: req.user.id } });
    const user = await UserModel.findByPk(req.user.id);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", BASE_COOKIE);
  return res.json({ message: "Sesión cerrada" });
};
