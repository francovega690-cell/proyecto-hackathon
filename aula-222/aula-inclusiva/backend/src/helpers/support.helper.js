// Tipos de apoyo de un alumno. Puede tener más de uno a la vez (por ejemplo
// daltonismo + dislexia); "ninguno" excluye a los demás.
export const SUPPORT_TYPES = ["dislexia", "daltonismo", "comprension", "ninguno"];
export const DYSLEXIA_LEVELS = ["leve", "moderado", "severo"];

export const normalizeSupports = (list = []) => {
  const clean = [...new Set((Array.isArray(list) ? list : [list]).filter((s) => SUPPORT_TYPES.includes(s)))];
  if (!clean.length || clean.includes("ninguno")) return ["ninguno"];
  return clean;
};

// Lista de apoyos guardada del usuario (columna nueva `supports`, o la vieja
// `supportType` para cuentas creadas antes).
export const supportsOf = (u) => {
  if (u.supports) return normalizeSupports(u.supports.split(","));
  return u.supportType ? [u.supportType] : [];
};
