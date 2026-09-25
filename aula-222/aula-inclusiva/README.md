# Aula Inclusiva

Plataforma educativa con login/registro, roles (profesor / alumno), materias,
publicaciones (avisos, marco teórico, tareas), entregas y calificación,
comentarios públicos/privados, test de daltonismo y una interfaz que se
adapta al perfil de cada alumno (comprensión, dislexia o daltonismo).

Dos partes:
- **`frontend/`** *(carpeta raíz de este repo)*: React + Vite + Bootstrap.
- **`backend/`**: API REST en Node + Express + Sequelize (MySQL), con
  autenticación por JWT en cookie httpOnly y contraseñas con bcrypt — misma
  arquitectura que un CRUD de referencia (auth + validaciones con
  express-validator + capas controller/model/route), adaptada al dominio de
  esta app.

## 1. Levantar el backend

Necesitás Node.js 18+ y un servidor **MySQL** corriendo (local o en Docker).

```bash
cd backend
npm install
cp .env.example .env
```

Completá `.env` con los datos de tu MySQL (`DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_HOST`, `DB_DIALECT=mysql`) y una clave cualquiera en
`JWT_SECRET`. Después creá la base (vacía, Sequelize crea las tablas solo):

```sql
CREATE DATABASE aula_inclusiva;
```

Cargá los datos de prueba (recrea las tablas y agrega usuarios/materias de
ejemplo):

```bash
npm run seed
```

Y arrancá el servidor:

```bash
npm run dev
```

Por defecto queda escuchando en `http://localhost:3005`.

## 2. Levantar el frontend

En otra terminal, desde la raíz del proyecto:

```bash
npm install
cp .env.example .env   # ya apunta a http://localhost:3005/api, ajustalo si cambiaste el puerto
npm run dev
```

Abrí la URL que te muestra la terminal (normalmente `http://localhost:5173`).

## Usuarios de prueba

Los crea `npm run seed` (contraseña `1234` para todos):

| Rol                                | Correo             |
|-------------------------------------|--------------------|
| Profesora                           | profe@demo.com     |
| Alumno · deuteranopía                | mateo@demo.com     |
| Alumna · dislexia moderada          | sofia@demo.com     |
| Alumno · problemas de comprensión   | lucas@demo.com     |
| Alumna · acromatopsia                | ana@demo.com       |
| Alumno · deuteranopía + dislexia severa | tomas@demo.com   |

También podés registrar una cuenta nueva desde `/registro` (elegís rol y,
si sos alumno, el tipo de apoyo que necesitás; si elegís "daltonismo" te
lleva directo al test de color).

Códigos de materia ya creados: `BIO2A7` (Biología 2°A) y `MAT1B4`
(Matemática 1°B).

## Qué incluye

- **Login y registro** con selección de rol (profesor/alumno) y, para
  alumnos, tipo de apoyo (comprensión, dislexia, daltonismo). Contraseñas
  hasheadas con bcrypt, sesión con JWT en cookie httpOnly.
- **Test de daltonismo** con láminas pseudoisocromáticas generadas por
  código (estilo Ishihara), que clasifica entre los 4 tipos: deuteranopía,
  protanopía, tritanopía o acromatopsia (para esta última, además de las
  láminas se hacen dos preguntas de confirmación sobre visión en escala de
  grises y sensibilidad a la luz).
- **Interfaz que cambia según el resultado**: cada tipo tiene su propia
  paleta de colores (variables CSS que se redefinen sobre `<html>`), pensada
  para no depender del par de colores que ese tipo confunde: deuteranopía y
  protanopía pasan el acento a azul/ámbar, tritanopía a rosado/verde, y
  acromatopsia pasa toda la app a escala de grises con buen contraste y el
  brillo bajado (para la fotosensibilidad).
- **Simulador de daltonismo en la barra superior** (botón "Simulación"):
  muestra toda la app como la ve cada tipo de daltonismo. Atajo
  <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>. Al alumno con daltonismo
  además le deja repetir su test de color.
- **Materias**: el profesor crea una materia y comparte un código de 6
  caracteres; el alumno se une con ese código.
- **Publicaciones**: avisos, marco teórico y tareas (con fecha de entrega y
  nombre de archivo adjunto).
- **PDF y Word dentro de la página, adaptados a cada alumno**: el
  profesor adjunta un PDF o Word (.docx) y se abre en un visor propio de la
  app (pdf.js / mammoth), sin abrir otra pestaña. Solo el alumno ve la
  versión adaptada a su perfil:
  - **Daltonismo**: las páginas se ven con los colores corregidos para su
    tipo ("daltonización": lo que su tipo no distingue se pasa a los colores
    que sí ve). Acromatopsia: escala de grises con más contraste y brillo
    regulable. Puede comparar con el original.
  - **Dislexia (3 niveles: leve, moderado, severo) y comprensión**: al lado
    del archivo aparece el botón **"Adaptar para disléxico"**. Abre el
    documento en la página con el **Lector Claro** y su panel siempre a la
    vista:
    - **Nivel de dislexia** (se elige al registrarse y se puede cambiar
      desde el panel): cada nivel trae su tamaño de letra, espaciado,
      colores y regla, y cambia cuánto se reorganiza el texto (en severo las
      frases se cortan desde 15 palabras y los párrafos son de 2 frases; en
      leve, desde 30 palabras y hasta 4 frases).
    - **Regla de lectura** con botón de activar/desactivar: sombrea todo lo
      de arriba y de abajo del renglón que está bajo el cursor (o el dedo),
      tanto en el texto adaptado como sobre el PDF, con alto regulable.
    - Fuente (incluida OpenDyslexic), tamaño, espacio entre letras, entre
      palabras, interlineado y ancho de línea.
    - Fondo y color de letra (con medidor de contraste), que también se
      aplican sobre el PDF original.
    - Vistas: Texto adaptado / PDF con mis colores / Original. Una frase por
      renglón, frases largas en tramos, números resaltados, resumen de
      cambios y lectura en voz alta con velocidad regulable.
  - Profesor y alumnos sin adaptación: el documento original.
- **Varios apoyos a la vez**: un alumno puede tener, por ejemplo,
  daltonismo **y** dislexia. Se eligen al registrarse (opción múltiple) o
  después desde **"Mis apoyos"** en su inicio. Con los dos, la interfaz usa
  la paleta de su tipo de daltonismo y en el lector adaptado el PDF se ve con
  sus colores **y** con la corrección de daltonismo encima.
- **Paletas propias para dislexia**: en el lector, el alumno elige fondo,
  color de letra, color de resaltado (números, fechas y lo que se lee en voz
  alta) y color e intensidad de la sombra de la regla, con vista previa y
  medidor de contraste (también "para tu daltonismo" si lo tiene). Puede
  **guardar sus paletas con nombre**; se guardan en su cuenta junto con sus
  ajustes, así lo acompañan en cualquier computadora.
- **Entregas con archivo**: el alumno adjunta su trabajo en PDF, Word o foto
  (hasta 15MB); se guarda en la base (tabla `submission_files`). Puede
  entregar solo el archivo, solo texto o ambos. El profesor abre el archivo
  dentro de la página. Solo lo ven el alumno que lo entregó y el profesor.
- **Entregas fuera de término**: la tarea vence al terminar el día de
  entrega. Si el alumno no entregó, la ve como **Sin entregar** (en la tarea y
  en su inicio), pero puede entregarla igual: queda como **Entregada fuera
  de término**. El profesor ve cuántas entregas llegaron tarde y quiénes
  todavía no entregaron.
- **Adaptación automática del contenido**, calculada en el backend al
  publicar, según el perfil del alumno (resumen y puntos clave / texto con
  tipografía legible y lectura en voz alta / colores corregidos). Por
  defecto usa una heurística local; si configurás `N8N_WEBHOOK_URL` en
  `backend/.env`, el servidor le manda el contenido a tu workflow de n8n y
  usa lo que te devuelva.
- **Entregas y calificación**: el alumno entrega texto/archivo, el profesor
  califica (1 a 10) y puede dejar un comentario.
- **Comentarios públicos y privados** por publicación (el privado es un
  hilo entre cada alumno y el profesor).

## Conectar tu automatización de n8n

1. En `backend/.env`, completá `N8N_WEBHOOK_URL`.
2. El webhook recibe un POST con `{ title, body, type, courseName, profiles }`
   y tiene que devolver:

```json
{
  "adapted": {
    "comprension": { "summary": "...", "points": ["...", "..."] },
    "dislexia": { "paragraphs": ["...", "..."] },
    "daltonismo": { "paragraphs": ["...", "..."], "note": "..." }
  }
}
```

Si el webhook falla o no está configurado, el backend usa una adaptación
local automática (no rompe nada).

## Estructura

```
src/                  frontend (React + Vite + Bootstrap)
  lib/                cvd.js (paletas por tipo), plates.js (láminas del test), api.js (cliente HTTP)
  components/         Navbar, láminas del test, piezas de UI reutilizables
  pages/              Login, Register, TestDaltonismo, TeacherHome, StudentHome, CoursePage
  store.jsx           cliente de la API + caché local (reemplaza el viejo localStorage)

backend/
  app.js              arma Express, monta las rutas, sirve /uploads y sincroniza la DB
  src/config/         conexión a MySQL (Sequelize)
  src/models/         User, Course, CourseMember, Post, Submission, Comment
  src/controllers/    lógica de cada endpoint
  src/routes/         define las rutas y qué middlewares usa cada una
  src/middlewares/    auth (JWT + cookie), subida de archivos (multer), validaciones (express-validator)
  src/helpers/        bcrypt, JWT, generador de código de materia, adaptación de contenido, lectura de PDF/Word para dislexia
  src/seed.js         carga los datos de prueba
  uploads/            solo archivos viejos (los nuevos se guardan en la base de datos)
```

Si ya tenías el backend instalado de antes, corré de nuevo `npm install` ahí adentro: se agregaron `multer` (subida de archivos), `pdf-parse` y `mammoth` (lectura de PDF/Word).

## Desplegar (dejar la página online)

Lo más simple es **un solo servicio**: el backend sirve también el frontend
ya compilado, así la página y la API quedan en el mismo dominio y la sesión
(cookie) funciona sin configuración extra.

1. Creá una base **MySQL** en la nube (Railway, Aiven, Clever Cloud, etc.).
2. Creá un *Web Service* de Node (Render, Railway…) apuntando a este repo, con:
   - **Build command:** `npm run build:deploy`
   - **Start command:** `npm start`
3. Cargá las variables de entorno (ver `backend/.env.example`):
   `JWT_SECRET` (una clave larga cualquiera), `DATABASE_URL` (o las `DB_*`
   sueltas), `DB_SSL=true` si tu MySQL lo pide, y **no** pongas
   `DB_RESET=true` (borra todo en cada arranque).
4. La primera vez, si querés los datos de prueba, corré `npm run seed`
   dentro de `backend/` apuntando a esa base (también borra todo).

Las tablas se crean solas al arrancar. **Los PDF/Word que suben los
profesores se guardan dentro de la base de datos** (tabla `post_files`), no
en el disco del servidor: en Render/Railway el disco se borra en cada deploy,
así que si se guardaran ahí los archivos desaparecerían.

### Frontend y backend separados (ej: Vercel + Render)

- En el frontend: `VITE_API_URL=https://tu-backend.onrender.com/api` antes del build.
- En el backend: `CLIENT_ORIGIN=https://tu-front.vercel.app` y
  `COOKIE_CROSS_SITE=true` (la cookie pasa a `SameSite=None; Secure`, hace falta HTTPS).
- Ojo: Safari y algunos navegadores bloquean cookies entre dominios distintos;
  por eso se recomienda la opción de un solo servicio.

## Cómo funciona el aula

- El profesor crea la materia y comparte el código; los alumnos se unen con él.
- En **Nueva publicación** el profesor puede adjuntar un PDF o Word (.doc/.docx,
  hasta 15MB) a una tarea, aviso o marco teórico.
- Todos los alumnos de la materia lo **abren dentro de la página**
  (`GET /api/posts/:id/file`, solo para miembros de la materia; con
  `?download=1` se descarga), cada uno con la adaptación de su perfil.
- En el inicio del alumno aparece **Novedades** con lo último de todas sus
  materias (marcado "Nuevo" desde su última visita). Tanto las novedades como
  la página de la materia se actualizan solas cada 20–30 segundos mientras la
  pestaña está abierta, sin recargar.
- El profesor puede borrar una publicación (se borran también sus entregas y comentarios).
