import multer from "multer";

// PDF y Word (.docx y el viejo .doc): es lo que puede adjuntar el profesor.
export const ALLOWED_EXT = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

// Algunos navegadores/sistemas mandan los .docx como
// application/octet-stream, así que decidimos por la extensión del nombre.
export const fileExt = (originalname = "") => (originalname.split(".").pop() || "").toLowerCase();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_EXT[fileExt(file.originalname)]) return cb(null, true);
  cb(new Error("Solo se aceptan archivos PDF o Word (.doc / .docx)."));
};

// Lo que puede adjuntar el alumno en una entrega: PDF, Word o una foto.
export const SUBMISSION_EXT = {
  ...ALLOWED_EXT,
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const uploadSubmissionFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (SUBMISSION_EXT[fileExt(file.originalname)]) return cb(null, true);
    cb(new Error("Solo se aceptan archivos PDF, Word (.doc / .docx) o fotos (.jpg / .png)."));
  },
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
}).single("file");

// Envuelve un uploader de multer para devolver los errores como JSON.
export const withUpload = (uploader) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "El archivo supera los 15MB." : err.message;
      return res.status(400).json({ message: message || "No se pudo subir el archivo" });
    }
    next();
  });
};

// En memoria: el controlador guarda el archivo en la base de datos, no en
// disco (en producción el disco del servidor se borra en cada deploy).
export const uploadTaskFile = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
}).single("file");
