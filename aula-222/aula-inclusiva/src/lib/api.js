// Cliente HTTP muy fino para hablar con el backend de Aula Inclusiva.
// La sesión viaja en una cookie httpOnly (no en localStorage), por eso
// todas las llamadas van con `credentials: "include"`.

// En desarrollo apunta al backend local; en el build de producción, si no se
// define VITE_API_URL, usa "/api" del mismo dominio (el backend sirve el
// frontend ya compilado, ver backend/app.js).
const BASE = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3005/api" : "/api")
).replace(/\/$/, "");
// post.fileUrl ya viene como ruta absoluta del servidor (/api/posts/:id/file,
// o /uploads/… en archivos viejos), así que se le antepone solo el origen.
export const FILE_BASE = BASE.replace(/\/api\/?$/, "");

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    // Con FormData no seteamos Content-Type: el navegador arma el boundary solo.
    headers: body && !isFormData ? { "Content-Type": "application/json" } : undefined,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // respuesta vacía (por ejemplo un 204) — está bien, seguimos con data=null
  }

  if (!res.ok) {
    const message = data?.message || "Ocurrió un error. Intentá de nuevo.";
    const error = new Error(message);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  postForm: (path, formData) => request(path, { method: "POST", body: formData, isFormData: true }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
