// Genera el código de 6 caracteres que el profesor comparte con sus alumnos
// para unirse a una materia. Evita caracteres ambiguos (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateCourseCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
